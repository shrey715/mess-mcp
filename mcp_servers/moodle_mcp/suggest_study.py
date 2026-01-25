#!/usr/bin/env python3
"""
LIHA GraphRAG Study Suggester

Input: Assignment text
Process:
  1. Embed assignment text
  2. Query ChromaDB for semantically similar lecture chunks
  3. Query Neo4j for associated concepts and course relationships
  4. Synthesize a study suggestion roadmap

Usage: python3 suggest_study.py "assignment text"
"""

import sys
import json
import os
from sentence_transformers import SentenceTransformer
import chromadb
from neo4j import GraphDatabase

# Config
DB_PATH = os.path.join(os.path.dirname(__file__), "chroma_db")
COLLECTION_NAME = "liha_courses"
NEO4J_URI = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "liha_graph_2026"

class StudySuggester:
    def __init__(self):
        self.model = SentenceTransformer("all-MiniLM-L6-v2")
        self.chroma = chromadb.PersistentClient(path=DB_PATH)
        self.collection = self.chroma.get_or_create_collection(name=COLLECTION_NAME)
        self.neo4j = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

    def suggest(self, assignment_text: str, n_results: int = 3):
        # 1. Embed assignment
        query_embedding = self.model.encode([assignment_text])[0].tolist()

        # 2. Semantic Search in ChromaDB
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            include=["documents", "metadatas", "distances"]
        )

        suggestions = []
        
        # 3. Enhance with Knowledge Graph info from Neo4j
        with self.neo4j.session() as session:
            for i in range(len(results["ids"][0])):
                doc = results["documents"][0][i]
                meta = results["metadatas"][0][i]
                dist = results["distances"][0][i]
                
                # Query Neo4j for concepts covered in this chunk
                chunk_id = results["ids"][0][i]
                graph_query = """
                MATCH (ch:Chunk {id: $chunk_id})-[:COVERS]->(c:Concept)
                RETURN c.name as concept
                """
                graph_results = session.run(graph_query, {"chunk_id": chunk_id})
                concepts = [r["concept"] for r in graph_results]

                # Format suggestion
                suggestions.append({
                    "id": chunk_id,
                    "title": f"Study {', '.join(concepts[:2])}" if concepts else "Relevant Lecture Content",
                    "desc": doc[:200] + "...",
                    "source": f"{meta.get('courseName')} - {meta.get('source')} (Page {meta.get('chunkIndex') + 1})",
                    "concepts": concepts,
                    "relevance": round((1 - dist) * 100, 1)
                })

        return suggestions

    def close(self):
        self.neo4j.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No assignment text provided"}))
        sys.exit(1)

    try:
        suggester = StudySuggester()
        results = suggester.suggest(sys.argv[1])
        print(json.dumps(results, indent=2))
        suggester.close()
    except Exception as e:
        print(json.dumps({"error": str(e)}))
