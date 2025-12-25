# Ask My Code — User Guide

A plain‑English guide for the *bidirectional* workflow between your **local RAG** script (`ask_my_code.py`) and **Cursor**. No plugins. Two text files in/out. Minimal fuss.

---

## What this tool does

- **Generates a task‑specific summary** of the most relevant code snippets for a question you ask.
- You **paste that summary** (with your own task brief) into **Cursor**.
- When Cursor replies, you **feed its reply file back** to the script. It will:
  - Save the **plan** (if present).
  - Save the **unified diffs** as a `.patch` file.
  - Optionally **apply** the patch using `git apply`.

Everything runs **locally**. Your code never leaves your machine unless you paste it somewhere.

python ask_my_code.py "How can I partition user data, keep in mind this is financial app so account by default refers to a bank account, not necessarily a user account, to ensure users can only access their own information, enhancing security and privacy?" --k 40 --task user_data_partitioning


---

## Prerequisites

- Python 3.9+
- `git` installed (for applying patches)
- **Ollama** running locally (for embeddings and summarization)
  - Start it: `ollama serve` (or ensure the background service is running)
- Your codebase is **indexed** (one‑time or when code changes a lot):
  ```bash
  python index_codebase.py --rebuild
  ```
  This creates/updates:
  - `rag_store/chunks.sqlite`
  - `rag_store/index.bin`
  - `rag_store/meta.json`

> If you see **“Index Not Found”**, (re)run the indexing command above.

---

## Quick start (the two‑file handshake)

### 1) Generate a task‑specific summary for Cursor
Ask a clear question and give the task a short slug. The script writes a **summary_…txt** file you can copy/paste into Cursor with your task brief.

```bash
python ask_my_code.py "Fix the NavBar horizontal alignment across breakpoints." \
  --k 40 \
  --task navbar-align
```

**What you get**
- `rag_store/summary_navbar-align_YYYYMMDD-HHMMSS.txt`

Open that file, copy its contents, and paste it into Cursor along with your manual brief (objective/constraints/acceptance).

> Tip: keep your brief short and explicit; ask for *unified diffs*, plus a short plan with file paths and line ranges.

---

### 2) Ingest Cursor’s reply (plan + patch)
Save Cursor’s entire reply to a text file (name it anything), then run:

```bash
python ask_my_code.py \
  --reply rag_store/from_cursor_navbar.txt \
  --task navbar-align
```

**What you get**
- `rag_store/plan_navbar-align_YYYYMMDD-HHMMSS.txt` (if the reply contained a plan block)
- `rag_store/patch_navbar-align_YYYYMMDD-HHMMSS.patch` (if the reply contained unified diffs)

If you want the script to **apply the patch** automatically:

```bash
python ask_my_code.py \
  --reply rag_store/from_cursor_navbar.txt \
  --task navbar-align \
  --apply
```

> Applying uses `git apply -p0`. Make sure you run this at the **repo root**.

---

## File naming and where things go

- **Summaries you paste into Cursor**
  - `rag_store/summary_<slug>_<timestamp>.txt`
- **Reply artifacts from Cursor**
  - `rag_store/plan_<slug>_<timestamp>.txt` (optional)
  - `rag_store/patch_<slug>_<timestamp>.patch`

The `<slug>` is taken from `--task` or auto‑derived from your question/reply filename.

---

## Flags you may care about

- `--task <slug>` — sets the filename slug (e.g., `navbar-align`).
- `--k <N>` — how many diverse code chunks to retrieve (default 8; try 20–40 for larger repos).
- `--gen-model` — local summarizer model for Ollama (default: `qwen2.5-coder:7b-instruct-q4_K_M`).
- `--num-ctx` — context window for the local summarizer (default 4096).
- `--temperature` — sampling temperature (default 0.2).
- `--max-context-chars` — maximum characters of code context stuffed into the summary (default 12000).
- `--reply <path>` — path to Cursor’s reply text file to ingest.
- `--apply` — after ingesting diffs, attempt to run `git apply -p0`.

---

## What should I paste into Cursor? (reply format that plays nice)

Paste your brief, **then** the summary file’s content. Ask Cursor to respond with this structure:

```txt
===== PLAN START =====
<bullet list of files + line ranges + purpose>
===== PLAN END =====

===== DIFFS START =====
<unified diffs only>
===== DIFFS END =====
```

The script will happily ingest `diff --git …` style outputs too, but the markers above make parsing fool‑proof.

---

## Examples

**Generate a summary (auto‑slug)**

```bash
python ask_my_code.py "Implement user scoping across accounts and transactions." --k 24
```
→ `rag_store/summary-implement-user-scoping-across-accounts-and-transactions_YYYYMMDD-HHMMSS.txt`

**Generate a summary (explicit slug)**

```bash
python ask_my_code.py "Fix nav focus ring in dark mode." --k 16 --task nav-dark-focus
```
→ `rag_store/summary_nav-dark-focus_YYYYMMDD-HHMMSS.txt`

**Ingest reply & apply patch**

```bash
python ask_my_code.py --reply rag_store/from_cursor_navbar.txt --task navbar-align --apply
```

**Ingest reply but don’t apply**

```bash
python ask_my_code.py --reply ~/Downloads/cursor_reply.txt --task navbar-align
```

---

## Troubleshooting

- **“Index Not Found”**  
  Run: `python index_codebase.py --rebuild`

- **“Ollama Connection Error”**  
  Start Ollama: `ollama serve` (or ensure the service is running)  
  Confirm endpoint: `curl http://localhost:11434/api/tags`

- **“No unified diffs found in reply.”**  
  Ensure Cursor’s reply contains either:
  - A block between `===== DIFFS START =====` and `===== DIFFS END =====`, **or**
  - Lines beginning with `diff --git ...`, **or**
  - A classic unified diff starting with `---` / `+++`.

- **Patch apply failed**  
  - You might be at the wrong directory; run from the repo root.  
  - Try a different **strip level**:  
    ```bash
    git apply -p1 rag_store/patch_navbar-align_YYYYMMDD-HHMMSS.patch
    ```
  - Check whitespace issues:  
    ```bash
    git apply --whitespace=fix -p0 rag_store/patch_....patch
    ```
  - Worst case, open the patch and apply changes manually.

---

## Safety notes

- The script runs locally and does not upload your code.  
- You decide what to paste into Cursor.  
- Review patches before applying; commit in small steps.

---

## Mental model (TL;DR)

1. **Generate** a focused summary → paste into Cursor with your brief.  
2. **Ingest** Cursor’s reply → get a plan + a patch → optionally apply.  
3. **Test** your app → **commit** → repeat for the next task.

That’s the loop.
