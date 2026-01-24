#!/usr/bin/env python3
"""
Embedding Generator for LIHA Knowledge Graph

Generates embeddings for PDF chunks using sentence-transformers (local, free).
Can switch to OpenAI API if preferred.

Usage: python3 generate_embeddings.py <chunks_json> [output_file]
       Or pipe: python3 process_pdfs.py input.pdf | python3 generate_embeddings.py
"""

import sys
import json
import os
from typing import List

# Try to import sentence-transformers (local embeddings)
try:
    from sentence_transformers import SentenceTransformer
    EMBEDDING_MODEL = "all-MiniLM-L6-v2"  # 384 dimensions, fast
    model = None
    
    def get_model():
        global model
        if model is None:
            print("Loading embedding model...", file=sys.stderr)
            model = SentenceTransformer(EMBEDDING_MODEL)
            print(f"Loaded {EMBEDDING_MODEL}", file=sys.stderr)
        return model
    
    def generate_embeddings(texts: List[str]) -> List[List[float]]:
        """Generate embeddings using local model."""
        m = get_model()
        embeddings = m.encode(texts, show_progress_bar=False)
        return embeddings.tolist()
    
    EMBEDDING_SOURCE = "local"
    
except ImportError:
    # Fallback to OpenAI if sentence-transformers not installed
    try:
        import openai
        
        def generate_embeddings(texts: List[str]) -> List[List[float]]:
            """Generate embeddings using OpenAI API."""
            response = openai.embeddings.create(
                model="text-embedding-3-small",
                input=texts
            )
            return [e.embedding for e in response.data]
        
        EMBEDDING_SOURCE = "openai"
        
    except ImportError:
        print("Error: Install sentence-transformers (pip install sentence-transformers)", file=sys.stderr)
        print("   Or: Install openai (pip install openai) and set OPENAI_API_KEY", file=sys.stderr)
        sys.exit(1)


def process_chunks(data: dict) -> dict:
    """Add embeddings to chunk data."""
    chunks = data.get("chunks", [])
    
    if not chunks:
        return data
    
    # Extract text content for embedding
    texts = [c["content"] for c in chunks]
    
    print(f"Generating embeddings for {len(texts)} chunks...", file=sys.stderr)
    embeddings = generate_embeddings(texts)
    
    # Add embeddings to chunks
    for chunk, embedding in zip(chunks, embeddings):
        chunk["embedding"] = embedding
    
    data["embeddingModel"] = EMBEDDING_MODEL if EMBEDDING_SOURCE == "local" else "text-embedding-3-small"
    data["embeddingDimensions"] = len(embeddings[0]) if embeddings else 0
    
    return data


if __name__ == "__main__":
    # Read input (from file or stdin)
    if len(sys.argv) >= 2 and os.path.exists(sys.argv[1]):
        with open(sys.argv[1], 'r') as f:
            data = json.load(f)
    else:
        data = json.load(sys.stdin)
    
    # Generate embeddings
    result = process_chunks(data)
    
    # Output
    if len(sys.argv) >= 3:
        with open(sys.argv[2], 'w') as f:
            json.dump(result, f, indent=2)
        print(f"Saved to {sys.argv[2]}", file=sys.stderr)
    else:
        print(json.dumps(result, indent=2))
