#!/usr/bin/env python3
"""
ChromaDB Vector Store for LIHA Knowledge Graph

Stores embedded chunks and enables semantic search.
Usage: 
  python3 vector_store.py store <embedded_json>
  python3 vector_store.py query "search text" [n_results]
  python3 vector_store.py list
"""

import sys
import json
import os
import chromadb
from chromadb.config import Settings

# Persistent storage path
DB_PATH = os.path.join(os.path.dirname(__file__), "chroma_db")
COLLECTION_NAME = "liha_courses"


def get_client():
    """Get ChromaDB client with persistent storage."""
    return chromadb.PersistentClient(path=DB_PATH)


def get_collection():
    """Get or create the LIHA collection."""
    client = get_client()
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"description": "LIHA course materials for GraphRAG"}
    )


def store_chunks(data: dict) -> dict:
    """Store embedded chunks in ChromaDB."""
    collection = get_collection()
    chunks = data.get("chunks", [])
    source = data.get("source", {})
    
    if not chunks:
        return {"error": "No chunks to store"}
    
    # Prepare data for ChromaDB
    ids = []
    embeddings = []
    documents = []
    metadatas = []
    
    for i, chunk in enumerate(chunks):
        if "embedding" not in chunk:
            continue
            
        chunk_id = f"{source.get('filename', 'unknown')}_{chunk.get('index', i)}"
        ids.append(chunk_id)
        embeddings.append(chunk["embedding"])
        documents.append(chunk["content"])
        metadatas.append({
            "source": chunk.get("source", source.get("filename", "")),
            "courseId": str(chunk.get("courseId", "")),
            "courseName": chunk.get("courseName", ""),
            "chunkIndex": chunk.get("index", i),
            "totalChunks": chunk.get("totalChunks", len(chunks)),
            "wordCount": chunk.get("wordCount", 0)
        })
    
    # Upsert (add or update)
    collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas
    )
    
    return {
        "stored": len(ids),
        "collection": COLLECTION_NAME,
        "source": source.get("filename", "unknown")
    }


def query_similar(query_text: str, n_results: int = 5) -> list:
    """Search for similar chunks using text query."""
    collection = get_collection()
    
    # ChromaDB will auto-embed the query if we have an embedding function
    # Since we don't, we need to embed manually
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer("all-MiniLM-L6-v2")
    query_embedding = model.encode([query_text])[0].tolist()
    
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        include=["documents", "metadatas", "distances"]
    )
    
    # Format results
    formatted = []
    for i in range(len(results["ids"][0])):
        formatted.append({
            "id": results["ids"][0][i],
            "content": results["documents"][0][i][:300] + "..." if len(results["documents"][0][i]) > 300 else results["documents"][0][i],
            "metadata": results["metadatas"][0][i],
            "distance": results["distances"][0][i]
        })
    
    return formatted


def list_documents():
    """List all stored documents."""
    collection = get_collection()
    count = collection.count()
    
    if count == 0:
        return {"count": 0, "documents": []}
    
    # Get sample
    results = collection.get(limit=10, include=["metadatas"])
    
    return {
        "count": count,
        "collection": COLLECTION_NAME,
        "sample": results["metadatas"][:5] if results["metadatas"] else []
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python3 vector_store.py store <embedded_json>")
        print("  python3 vector_store.py query 'search text' [n_results]")
        print("  python3 vector_store.py list")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "store":
        if len(sys.argv) < 3:
            # Read from stdin
            data = json.load(sys.stdin)
        else:
            with open(sys.argv[2], 'r') as f:
                data = json.load(f)
        result = store_chunks(data)
        print(json.dumps(result, indent=2))
        
    elif command == "query":
        if len(sys.argv) < 3:
            print("Usage: python3 vector_store.py query 'search text' [n_results]")
            sys.exit(1)
        query_text = sys.argv[2]
        n_results = int(sys.argv[3]) if len(sys.argv) > 3 else 5
        results = query_similar(query_text, n_results)
        print(json.dumps(results, indent=2))
        
    elif command == "list":
        result = list_documents()
        print(json.dumps(result, indent=2))
        
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
