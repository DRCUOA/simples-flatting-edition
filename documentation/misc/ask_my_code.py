#!/usr/bin/env python3
# ask_my_code.py — two-stage funnel + bidirectional handshake:
#   A) retrieve relevant code snippets locally and condense to a task-specific summary txt
#   B) ingest Cursor's reply txt (plan + unified diffs), save artifacts, and optionally apply the patch
#
# Notes:
# - Keeps the manual loop: you decide what to paste to Cursor and when to bring the reply back.
# - Summary filename is task-specific: rag_store/summary_<slug>_<YYYYMMDD-HHMMSS>.txt
# - Cursor reply ingestion via --reply <file>, optional --apply to run `git apply -p0`

import argparse
import json
import re
import sqlite3
import subprocess
from datetime import datetime
from pathlib import Path

import numpy as np
import requests
import hnswlib
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.syntax import Syntax
from rich.rule import Rule
from rich.markdown import Markdown

# --- Configuration ---

# Paths for the RAG store
RAG_DIR = Path("./rag_store")
SQLITE_PATH = RAG_DIR / "chunks.sqlite"
INDEX_PATH = RAG_DIR / "index.bin"
META_PATH = RAG_DIR / "meta.json"

# Ollama server
OLLAMA_URL = "http://localhost:11434"

# Defaults
DEFAULT_GEN_MODEL = "qwen2.5-coder:7b-instruct-q4_K_M"
DEFAULT_EMBED_MODEL = None  # read from meta.json
DEFAULT_K = 8

# Initialize Rich Console
console = Console()

# --- Ollama helpers ---

def embed_text(text: str, model: str) -> np.ndarray:
    """Call Ollama embeddings endpoint."""
    try:
        resp = requests.post(
            f"{OLLAMA_URL}/api/embeddings",
            json={"model": model, "prompt": text}
        )
        resp.raise_for_status()
        vec = resp.json()["embedding"]
        return np.array(vec, dtype=np.float32)
    except requests.exceptions.RequestException as e:
        console.print(Panel(f"[bold red]Ollama Connection Error[/]\nCould not connect to {OLLAMA_URL}.\nPlease ensure the Ollama server is running.\n\n[dim]Details: {e}[/dim]", border_style="red"))
        raise SystemExit(1)


def chat_ollama(model: str, system: str, user: str, num_ctx=4096, temperature=0.2):
    """Call Ollama generate endpoint with system+user prompt."""
    prompt = f"{system}\n\n{user}"
    payload = {
        "model": model,
        "prompt": prompt,
        "options": {"num_ctx": num_ctx, "temperature": temperature},
        "stream": False
    }
    try:
        resp = requests.post(f"{OLLAMA_URL}/api/generate", json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data["response"]
    except requests.exceptions.RequestException as e:
        console.print(Panel(f"[bold red]Ollama Connection Error[/]\nCould not connect to {OLLAMA_URL} for generation.\nPlease ensure the Ollama server is running.\n\n[dim]Details: {e}[/dim]", border_style="red"))
        raise SystemExit(1)

# --- DB + index helpers ---

def load_meta():
    meta = json.loads(META_PATH.read_text())
    return meta.get("embed_model"), meta.get("dim")

def load_index(dim: int):
    index = hnswlib.Index(space='cosine', dim=dim)
    index.load_index(str(INDEX_PATH))
    index.set_ef(64)
    return index

def fetch_chunks(conn: sqlite3.Connection, ids):
    q = f"SELECT id, path, lang, start_line, end_line, content FROM chunks WHERE id IN ({','.join('?'*len(ids))})"
    cur = conn.cursor()
    cur.execute(q, tuple(int(i) for i in ids))
    rows = cur.fetchall()
    by_id = {row[0]: row for row in rows}
    return [by_id[i] for i in ids if i in by_id]

def trim_context(snippets, max_chars=12000):
    out = []
    total = 0
    for snip in snippets:
        if total + len(snip) > max_chars:
            break
        out.append(snip)
        total += len(snip)
    return "\n\n".join(out)

def make_snippet(path, lang, start, end, code):
    header = f"# Path: {path}  (lines {start}-{end})"
    fence_lang = lang if lang else ""
    return f"{header}\n```{fence_lang}\n{code}\n```"

# --- Utility helpers ---

def _slugify(text: str, max_len: int = 60) -> str:
    """Make a filesystem-friendly, human-readable slug."""
    s = re.sub(r"[^a-zA-Z0-9]+", "-", text.lower()).strip("-")
    s = re.sub(r"-{2,}", "-", s).strip("-")  # collapse repeats
    return s[:max_len].strip("-")

def _now_stamp() -> str:
    return datetime.now().strftime("%Y%m%d-%H%M%S")

def _read_text(path: Path) -> str:
    return Path(path).read_text(encoding="utf-8", errors="replace")

def _extract_block(text: str, start_marker: str, end_marker: str) -> str | None:
    """Extract text between two markers; returns None if not found."""
    start = text.find(start_marker)
    if start == -1:
        return None
    start += len(start_marker)
    end = text.find(end_marker, start)
    if end == -1:
        return None
    return text[start:end].strip()

def _extract_diffs(text: str) -> str | None:
    """
    Extract unified diffs from Cursor reply.
    Priority:
      1) Between '===== DIFFS START =====' and '===== DIFFS END ====='
      2) From first 'diff --git ' to end
      3) From first line starting with '--- ' followed by '+++ ' (classic unified diff) to end
    """
    # 1) Explicit markers
    block = _extract_block(text, "===== DIFFS START =====", "===== DIFFS END =====")
    if block:
        return block.strip()

    # 2) git-style multi-file diffs
    m = re.search(r"(?m)^diff --git .*$", text)
    if m:
        return text[m.start():].strip()

    # 3) plain unified diff starting with --- / +++
    m2 = re.search(r"(?m)^--- [^\n]*\n\+\+\+ [^\n]*\n", text)
    if m2:
        return text[m2.start():].strip()

    return None

def _extract_plan(text: str) -> str | None:
    return _extract_block(text, "===== PLAN START =====", "===== PLAN END =====")

def _ensure_rag_dir():
    RAG_DIR.mkdir(parents=True, exist_ok=True)

def _git_apply_patch(patch_text: str, strip: int = 0) -> tuple[bool, str]:
    """Apply a unified diff using git apply. Returns (ok, stderr_out)."""
    try:
        proc = subprocess.run(
            ["git", "apply", f"-p{strip}"],
            input=patch_text.encode("utf-8"),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        ok = proc.returncode == 0
        err = proc.stderr.decode("utf-8", errors="replace")
        return ok, err
    except FileNotFoundError:
        return False, "git not found on PATH. Install git or apply the patch manually."

# --- Main flows ---

def run_generation(args):
    """A) Retrieve & condense code context; write task-specific summary file."""
    # Validation and setup
    with console.status("[cyan]Initializing and validating index...", spinner="dots"):
        if not all([SQLITE_PATH.exists(), INDEX_PATH.exists(), META_PATH.exists()]):
            console.print(Panel(
                "[bold red]Error: Index Not Found[/]\n\n[yellow]The RAG store is missing or incomplete. Please run the indexing script first:[/yellow]\n\n  [bold]python index_codebase.py --rebuild[/]",
                border_style="red",
                title="Validation Failed",
                title_align="left"
            ))
            return None

        _ensure_rag_dir()
        embed_model, dim = load_meta()
        if not embed_model:
            embed_model = DEFAULT_EMBED_MODEL

        index = load_index(dim)
        conn = sqlite3.connect(str(SQLITE_PATH))

    # Display Parameters
    param_table = Table.grid(padding=(0, 2))
    param_table.add_column(style="cyan")
    param_table.add_column()
    param_table.add_row("Question", f"[bright_white]'{args.question}'")
    param_table.add_row("Embed Model", f"[dim]{embed_model}[/dim]")
    param_table.add_row("Generator Model", f"[dim]{args.gen_model}[/dim]")
    param_table.add_row("Top K", f"[dim]{args.k}[/dim]")
    console.print(Panel(param_table, title="[bold]Query Parameters[/]", border_style="blue", expand=False))

    # Embed Question & Retrieve Chunks
    with console.status(f"[cyan]Embedding question using [bold]{embed_model}[/]...", spinner="dots"):
        qvec = embed_text(args.question, embed_model).reshape(1, -1)

    with console.status(f"[cyan]Searching for top {args.k} relevant code chunks...", spinner="dots"):
        labels, _ = index.knn_query(qvec, k=max(args.k * 3, args.k))
        ids = list(map(int, labels[0].tolist()))
        rows = fetch_chunks(conn, ids)

        # Prefer diversity across files
        seen_paths = set()
        ranked = []
        for rid in ids:
            row = next((r for r in rows if r[0] == rid), None)
            if not row:
                continue
            _, path, _, _, _, _ = row
            if path not in seen_paths:
                ranked.append(row)
                seen_paths.add(path)
            if len(ranked) >= args.k:
                break

    # Display Retrieved Context
    context_table = Table(title="Most Relevant Code Snippets", show_header=True, header_style="bold magenta")
    context_table.add_column("File Path", style="green", no_wrap=True)
    context_table.add_column("Lines", style="yellow")
    context_table.add_column("Code Snippet (Syntax Highlighted)")

    snippets = []
    for (_id, path, lang, start, end, content) in ranked:
        snippets.append(make_snippet(path, lang, start, end, content))

        # Create a syntax-highlighted preview for the table
        short_content = "\n".join(content.splitlines()[:7])  # show first 7 lines
        if len(content.splitlines()) > 7:
            short_content += "\n..."
        code_view = Syntax(short_content, lang or "python", theme="monokai", line_numbers=False, word_wrap=True)
        context_table.add_row(path, f"{start}-{end}", code_view)

    console.print(context_table)
    context = trim_context(snippets, max_chars=args.max_context_chars)

    # Generate Summary
    system = (
        "You are a local assistant. Your ONLY task is to compress and rephrase the following code snippets "
        "into a faithful, concise summary that preserves all important technical details needed to answer the question. "
        "Do not try to solve the problem. Do not explain. Only summarize relevant information clearly."
    )
    user = f"Question: {args.question}\n\nCode context:\n{context}"

    with console.status(f"[cyan]Condensing context with [bold]{args.gen_model}[/]...", spinner="bouncingBar"):
        summary = chat_ollama(
            model=args.gen_model,
            system=system,
            user=user,
            num_ctx=args.num_ctx,
            temperature=args.temperature
        )

    # Save task-specific summary
    task_slug = (args.task or _slugify(args.question)).strip()
    ts = _now_stamp()
    summary_path = RAG_DIR / f"summary_{task_slug}_{ts}.txt"
    summary_path.write_text(summary, encoding="utf-8")

    # Display summary
    summary_markdown = Markdown(summary)
    console.print(Panel(
        summary_markdown,
        title="[bold green]Condensed Summary[/]",
        border_style="green",
        title_align="left"
    ))

    console.print(Panel.fit(
        f"[bold bright_green]✔ Success![/] Summary saved to [bold underline]{summary_path}[/]\n"
        f"[dim]Tip: paste this file's contents into Cursor with your task brief.[/dim]",
        border_style="green"
    ))

    return summary_path

def run_ingest_reply(args):
    """B) Ingest Cursor's reply file; extract plan and diffs; save artifacts; optionally apply patch."""
    _ensure_rag_dir()

    reply_path = Path(args.reply)
    if not reply_path.exists():
        console.print(Panel(f"[bold red]Reply file not found:[/] {reply_path}", border_style="red"))
        raise SystemExit(1)

    text = _read_text(reply_path)

    # Decide slug
    if args.task:
        task_slug = _slugify(args.task)
    else:
        # derive from filename (drop extension)
        task_slug = _slugify(reply_path.stem)

    ts = _now_stamp()

    # Extract plan
    plan = _extract_plan(text)
    plan_path = None
    if plan:
        plan_path = RAG_DIR / f"plan_{task_slug}_{ts}.txt"
        plan_path.write_text(plan + "\n", encoding="utf-8")

    # Extract diffs
    diffs = _extract_diffs(text)
    if not diffs:
        console.print(Panel(
            "[bold yellow]No unified diffs found in reply.[/]\n\n"
            "Expected either:\n"
            "  • A block between '===== DIFFS START =====' and '===== DIFFS END =====', or\n"
            "  • Lines beginning with 'diff --git ...', or\n"
            "  • A classic unified diff starting with '---' / '+++'.\n",
            border_style="yellow"
        ))
        if plan_path:
            console.print(f"[green]Plan saved to:[/] {plan_path}")
        return None

    patch_path = RAG_DIR / f"patch_{task_slug}_{ts}.patch"
    patch_path.write_text(diffs + "\n", encoding="utf-8")

    # Show where artifacts were saved
    info = f"[bright_white]Artifacts saved:[/]\n"
    if plan:
        info += f"  • Plan:  [underline]{plan_path}[/]\n"
    info += f"  • Patch: [underline]{patch_path}[/]\n"
    console.print(Panel(info, title="[bold green]Reply Ingested[/]", border_style="green"))

    # Optionally apply patch
    if args.apply:
        console.print(Panel("Applying patch with [bold]git apply -p0[/]...", border_style="blue"))
        ok, err = _git_apply_patch(diffs, strip=0)
        if ok:
            console.print(Panel("[bold bright_green]✔ Patch applied successfully.[/]", border_style="green"))
        else:
            console.print(Panel(
                "[bold red]Patch apply failed.[/]\n\n"
                f"[dim]{err}[/dim]\n\n"
                "You can try:\n"
                "  • Inspecting and adjusting the patch, or\n"
                "  • Applying with a different strip level, e.g., `git apply -p1 patchfile`.\n",
                border_style="red"
            ))

    return patch_path

# --- CLI ---

def main():
    ap = argparse.ArgumentParser(
        description=(
            "Local RAG helper:\n"
            "  A) Generate a task-specific summary txt from your codebase for Cursor.\n"
            "  B) Ingest Cursor's reply txt (plan + diffs), save artifacts, and optionally apply the patch."
        ),
        formatter_class=argparse.RawTextHelpFormatter
    )

    # Positional question is optional now (reply-only mode allowed)
    ap.add_argument("question", nargs="?", type=str,
                    help="Your natural-language question about the codebase (required for generation mode).")

    # Generation options
    ap.add_argument("-k", "--k", type=int, default=DEFAULT_K, help=f"Top-K chunks to retrieve (default: {DEFAULT_K}).")
    ap.add_argument("-g", "--gen-model", type=str, default=DEFAULT_GEN_MODEL, help="Local Ollama summarizer model.")
    ap.add_argument("-c", "--num-ctx", type=int, default=4096, help="Context window for summarizer model.")
    ap.add_argument("-t", "--temperature", type=float, default=0.2, help="Sampling temperature.")
    ap.add_argument("-m", "--max-context-chars", type=int, default=12000, help="Cap total code context length.")
    ap.add_argument("--task", type=str, default=None,
                    help="Task slug for filenames (e.g., 'navbar-align'). If omitted, derived from question/reply name.")

    # Reply ingestion options
    ap.add_argument("--reply", type=str, default=None,
                    help="Path to Cursor's reply txt to ingest (extracts plan + diffs).")
    ap.add_argument("--apply", action="store_true",
                    help="After extracting diffs from --reply, attempt to apply them via `git apply -p0`.")

    args = ap.parse_args()

    console.print(Rule("[bold magenta]Ask My Code[/]", style="magenta"))

    did_anything = False

    # A) Generation mode (if question provided)
    if args.question:
        run_generation(args)
        did_anything = True

    # B) Ingest reply mode (if --reply provided)
    if args.reply:
        run_ingest_reply(args)
        did_anything = True

    if not did_anything:
        console.print(Panel(
            "[bold yellow]Nothing to do.[/]\n\n"
            "Provide a question to generate a summary, e.g.:\n"
            "  [bold]python ask_my_code.py 'Fix the NavBar horizontal alignment across breakpoints.' --k 40 --task navbar-align[/]\n\n"
            "Or ingest a Cursor reply, e.g.:\n"
            "  [bold]python ask_my_code.py --reply rag_store/from_cursor_navbar.txt --task navbar-align --apply[/]",
            border_style="yellow"
        ))

if __name__ == "__main__":
    main()
