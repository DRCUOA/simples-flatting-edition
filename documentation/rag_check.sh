#!/bin/bash
# === Local RAG Readiness Check ===

echo "=========================================="
echo "🔍 Local RAG Environment Diagnostic"
echo "=========================================="

# 1. System Info
echo
echo "=== SYSTEM INFO ==="
uname -a
sysctl -n machdep.cpu.brand_string 2>/dev/null || lscpu | grep "Model name"
sysctl -n hw.ncpu 2>/dev/null || nproc
echo "Free memory (MB): $(vm_stat | awk '/free/ {print $3*4/1024}')"
df -h / | awk 'NR==2{print "Disk space: "$4" free"}'

# 2. Python & Core Packages
echo
echo "=== PYTHON & PACKAGES ==="
python3 --version || echo "⚠️ Python3 missing"
echo
python3 - <<'EOF'
import importlib, platform
required = ["torch", "chromadb", "sentence_transformers", "llama_index"]
print("Python:", platform.python_version())
missing = []
for pkg in required:
    if importlib.util.find_spec(pkg) is None:
        missing.append(pkg)
print("✅ Installed:", [p for p in required if p not in missing])
if missing: print("⚠️ Missing:", missing)
EOF

# 3. Embedding Test
echo
echo "=== EMBEDDING ENGINE TEST ==="
python3 - <<'EOF'
try:
    from sentence_transformers import SentenceTransformer
    m = SentenceTransformer("all-MiniLM-L6-v2")
    emb = m.encode("test embedding")
    print("✅ Embedding OK, shape:", emb.shape)
except Exception as e:
    print("❌ Embedding failed:", e)
EOF

# 4. Vector Store Test (Chroma)
echo
echo "=== VECTOR STORE TEST ==="
python3 - <<'EOF'
try:
    import chromadb
    client = chromadb.Client()
    coll = client.create_collection("test")
    coll.add(ids=["1"], documents=["The quick brown fox"])
    res = coll.query(query_texts=["brown fox"], n_results=1)
    print("✅ Chroma OK:", res["ids"])
except Exception as e:
    print("❌ Chroma failed:", e)
EOF

# 5. Ollama / Llama.cpp availability
echo
echo "=== LOCAL MODEL TEST ==="
if command -v ollama >/dev/null 2>&1; then
    echo "Ollama found: $(ollama --version)"
    echo "Running short inference test..."
    ollama run llama3 "Hello world" | head -n 3
elif [ -f "./main" ]; then
    echo "llama.cpp binary detected, trying local test..."
    ./main -m ./models/llama-3.1-8b.Q4_K_M.gguf -p "test" | head -n 5
else
    echo "⚠️ No Ollama or llama.cpp binary found"
fi

# 6. GPU/Metal Check (for Apple Silicon)
echo
echo "=== HARDWARE ACCELERATION ==="
python3 - <<'EOF'
try:
    import torch
    if torch.backends.mps.is_available():
        print("✅ Apple MPS GPU available")
    elif torch.cuda.is_available():
        print("✅ CUDA GPU available")
    else:
        print("⚠️ CPU-only mode")
except Exception as e:
    print("⚠️ Torch not installed or failed:", e)
EOF

echo
echo "=========================================="
echo "RAG readiness test complete."
echo "Check results above for any ❌ or ⚠️ markers."
echo "=========================================="

