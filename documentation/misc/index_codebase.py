#!/usr/bin/env python3
# index_codebase.py — RAG indexer with custom --include / --exclude flags
#
# Examples:
#   python index_codebase.py --repo ~/simples --rebuild \
#     --embed-model nomic-embed-text:latest \
#     --include py,js,ts,tsx,vue,css,scss,html,md,sql \
#     --exclude node_modules,dist,build,.venv,venv,rag-local,site-packages
#
#   # Just print the active config and exit:
#   python index_codebase.py --print-config \
#     --include py,vue,css,html --exclude node_modules,.venv

import os
import sys
import argparse
import sqlite3
import hashlib
import json
import time
from pathlib import Path

import numpy as np
import requests
import hnswlib
from tqdm import tqdm

RAG_DIR = Path("./rag_store")
SQLITE_PATH = RAG_DIR / "chunks.sqlite"
INDEX_PATH = RAG_DIR / "index.bin"
META_PATH = RAG_DIR / "meta.json"

# Match your running server host/port
OLLAMA_URL = "http://127.0.0.1:11434"
EMBED_MODEL_DEFAULT = "nomic-embed-text"

# ---------- File filters (defaults) ----------

DEFAULT_INCLUDE_EXTS = {
    ".py", ".ipynb", ".js", ".jsx", ".ts", ".tsx", ".vue",
    ".css", ".scss", ".html",
    ".go", ".rs", ".java", ".kt",
    ".c", ".h", ".cpp", ".cc", ".hpp", ".m", ".mm",
    ".cs", ".php", ".rb", ".swift", ".scala",
    ".sql", ".sh", ".bash", ".zsh", ".ps1",
    ".yml", ".yaml", ".toml", ".ini", ".cfg", ".json",
    ".md", ".txt"
}

DEFAULT_EXCLUDE_DIRS = {
    ".git", ".hg", ".svn", ".history",
    "node_modules", "dist", "build",
    "__pycache__", ".mypy_cache", ".pytest_cache", ".ruff_cache",
    ".idea", ".vscode", ".DS_Store",
    # venvs and packaging
    ".venv", "venv", "rag-local", ".venvs", "env", ".env", ".direnv",
    "site-packages", "__pypackages__"
}

LANG_BY_EXT = {
    ".py": "python", ".js": "javascript", ".ts": "typescript", ".tsx": "typescript",
    ".jsx": "javascript", ".go": "go", ".rs": "rust", ".java": "java", ".kt": "kotlin",
    ".c": "c", ".h": "c", ".cpp": "cpp", ".cc": "cpp", ".hpp": "cpp",
    ".m": "objective-c", ".mm": "objective-cpp", ".cs": "csharp", ".php": "php",
    ".rb": "ruby", ".swift": "swift", ".scala": "scala", ".sql": "sql",
    ".sh": "bash", ".bash": "bash", ".zsh": "bash", ".ps1": "powershell",
    ".yml": "yaml", ".yaml": "yaml", ".toml": "toml", ".ini": "ini",
    ".cfg": "ini", ".json": "json", ".md": "markdown", ".txt": "text", ".ipynb": "json",
    ".vue": "vue", ".css": "css", ".scss": "scss", ".html": "html"
}

# ---------- Helpers ----------

def sha256_text(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8", errors="ignore")).hexdigest()

def embed_text(text: str, model: str) -> np.ndarray:
    """Call Ollama embeddings endpoint and return a float32 numpy vector."""
    resp = requests.post(
        f"{OLLAMA_URL}/api/embeddings",
        json={"model": model, "prompt": text}
    )
    resp.raise_for_status()
    vec = resp.json()["embedding"]
    return np.array(vec, dtype=np.float32)

def init_db(conn: sqlite3.Connection):
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS chunks (
        id INTEGER PRIMARY KEY,
        path TEXT NOT NULL,
        lang TEXT,
        start_line INTEGER,
        end_line INTEGER,
        content TEXT NOT NULL,
        sha256 TEXT NOT NULL
    )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_path ON chunks(path)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_sha ON chunks(sha256)")
    conn.commit()

def chunk_by_lines(text: str, max_lines: int, overlap: int):
    """Return list of (start_line, end_line, chunk_text) with 1-based line numbers."""
    lines = text.splitlines()
    n = len(lines)
    if n == 0:
        return []
    chunks = []
    step = max_lines - overlap if max_lines > overlap else max_lines
    i = 0
    while i < n:
        start = i
        end = min(i + max_lines, n)
        chunk = "\n".join(lines[start:end])
        chunks.append((start + 1, end, chunk))
        if end == n:
            break
        i += step
    return chunks

def should_skip_dir(dirname: str, excludes: set) -> bool:
    return dirname in excludes

def iter_code_files(root: Path, include_exts: set, excludes: set):
    """Yield files under root whose extension is in include_exts, skipping excluded dirs."""
    for dirpath, dirnames, filenames in os.walk(root):
        # prune excluded dirs in-place
        dirnames[:] = [d for d in dirnames if not should_skip_dir(d, excludes)]
        for fname in filenames:
            p = Path(dirpath) / fname
            ext = p.suffix.lower()
            if ext in include_exts:
                # Skip huge files (> 1.5MB) to avoid accidental binaries/lockfiles
                try:
                    if p.stat().st_size > 1_500_000:
                        continue
                except Exception:
                    continue
                yield p

def init_or_load_hnsw(dim: int, rebuild: bool, ef_construction=200, M=16):
    index = hnswlib.Index(space='cosine', dim=dim)
    if rebuild or not INDEX_PATH.exists():
        index.init_index(max_elements=10_000, ef_construction=ef_construction, M=M)
        index.set_ef(64)
    else:
        index.load_index(str(INDEX_PATH))
        index.set_ef(64)
    return index

def maybe_resize(index: hnswlib.Index, needed_total: int):
    cur_cap = index.get_max_elements()
    if needed_total > cur_cap:
        new_cap = max(needed_total, int(cur_cap * 1.5))
        index.resize_index(new_cap)

# ---------- Main ----------

def main():
    ap = argparse.ArgumentParser(description="Index a local codebase into a tiny on-disk vector DB.")
    ap.add_argument("--repo", type=str, default=".", help="Path to the root of your code repository.")
    ap.add_argument("--embed-model", type=str, default=EMBED_MODEL_DEFAULT, help="Ollama embedding model name.")
    ap.add_argument("--max-lines", type=int, default=120, help="Chunk size in lines.")
    ap.add_argument("--overlap", type=int, default=20, help="Line overlap between chunks.")
    ap.add_argument("--rebuild", action="store_true", help="Wipe & rebuild the index store.")
    ap.add_argument("--include", type=str, default="", help="Comma-separated file extensions to include (overrides defaults).")
    ap.add_argument("--exclude", type=str, default="", help="Comma-separated directory names to exclude (added to defaults).")
    ap.add_argument("--print-config", action="store_true", help="Print active include/exclude sets and exit.")
    args = ap.parse_args()

    repo = Path(args.repo).resolve()
    if not repo.exists():
        print(f"[!] Repo path not found: {repo}", file=sys.stderr)
        sys.exit(1)

    # Includes: override if provided
    include_exts = set(DEFAULT_INCLUDE_EXTS)
    if args.include.strip():
        include_exts = {e if e.startswith(".") else "." + e for e in args.include.split(",")}

    # Excludes: add CLI extras to defaults
    active_excludes = set(DEFAULT_EXCLUDE_DIRS)
    if args.exclude.strip():
        extra = {d.strip() for d in args.exclude.split(",") if d.strip()}
        active_excludes |= extra

    # Show config
    print(f"[config] repo: {repo}")
    print(f"[config] embed_model: {args.embed_model}")
    print("[config] includes:", sorted(include_exts))
    print("[config] excludes:", sorted(active_excludes))

    if args.print_config:
        return

    RAG_DIR.mkdir(parents=True, exist_ok=True)

    if args.rebuild:
        if SQLITE_PATH.exists():
            SQLITE_PATH.unlink()
        if INDEX_PATH.exists():
            INDEX_PATH.unlink()
        if META_PATH.exists():
            META_PATH.unlink()

    # Probe embedding dimension once (authoritative)
    probe_vec = embed_text("dimension probe", args.embed_model)
    dim = int(probe_vec.shape[0])

    # Save meta
    meta = {"embed_model": args.embed_model, "dim": dim, "created_at": time.time()}
    META_PATH.write_text(json.dumps(meta, indent=2))

    # Init DB + HNSW
    conn = sqlite3.connect(str(SQLITE_PATH))
    init_db(conn)
    index = init_or_load_hnsw(dim=dim, rebuild=args.rebuild)

    # Current max id (keep HNSW ids aligned with SQLite row ids)
    cur = conn.cursor()
    cur.execute("SELECT MAX(id) FROM chunks")
    row = cur.fetchone()
    next_id = (row[0] or 0) + 1  # reserved if you ever append later

    files = list(iter_code_files(repo, include_exts, active_excludes))
    print(f"[+] Found {len(files)} code files to index")
    total_chunks = 0

    with tqdm(files, desc="Indexing", unit="file") as pbar:
        for path in pbar:
            try:
                text = path.read_text(encoding="utf-8", errors="replace")
            except Exception:
                continue

            ext = path.suffix.lower()
            lang = LANG_BY_EXT.get(ext, "text")
            chunks = chunk_by_lines(text, args.max_lines, args.overlap)
            if not chunks:
                continue

            for (start_line, end_line, chunk_text) in chunks:
                sha = sha256_text(f"{path}:{start_line}:{end_line}\n{chunk_text}")

                # Deduplicate by sha
                cur.execute("SELECT id FROM chunks WHERE sha256 = ?", (sha,))
                if cur.fetchone():
                    continue

                # Insert metadata row
                cur.execute(
                    "INSERT INTO chunks (path, lang, start_line, end_line, content, sha256) VALUES (?, ?, ?, ?, ?, ?)",
                    (str(path), lang, start_line, end_line, chunk_text, sha)
                )
                row_id = cur.lastrowid

                # Ensure HNSW capacity
                maybe_resize(index, row_id + 10)

                # Embed + add to index
                vec = embed_text(chunk_text, args.embed_model)
                index.add_items(vec.reshape(1, -1), np.array([row_id], dtype=np.int64))

                total_chunks += 1
                next_id = row_id + 1

            conn.commit()

    # Persist HNSW
    index.save_index(str(INDEX_PATH))
    conn.close()
    print(f"[✓] Done. Chunks added: {total_chunks}")
    print(f"    Store: {RAG_DIR}/ (sqlite + hnsw index)")
    print(f"    Embed model: {args.embed_model} (dim={dim})")

if __name__ == "__main__":
    main()
    