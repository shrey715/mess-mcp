#!/usr/bin/env python3
"""
Knowledge Graph Builder for LIHA

Builds and maintains a Neo4j knowledge graph from Moodle data.
Uses MERGE operations for incremental updates - no full rebuilds needed.

Schema:
  (Course) -[:HAS_MATERIAL]-> (Material)
  (Course) -[:HAS_ASSIGNMENT]-> (Assignment)
  (Material) -[:CONTAINS_CHUNK]-> (Chunk)
  (Chunk) -[:COVERS]-> (Concept)
  (Concept) -[:PREREQUISITE_OF]-> (Concept)
  (Assignment) -[:REQUIRES]-> (Concept)

Usage:
  python3 knowledge_graph.py sync        # Sync from Moodle
  python3 knowledge_graph.py add_pdf <embedded_json>
  python3 knowledge_graph.py query "concept name"
  python3 knowledge_graph.py stats
"""

import sys
import json
import os
import re
from typing import List, Dict, Optional
from neo4j import GraphDatabase

# Neo4j connection settings
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "liha_graph_2026")


class KnowledgeGraph:
    """Neo4j Knowledge Graph with incremental updates."""
    
    def __init__(self, uri: str = NEO4J_URI, user: str = NEO4J_USER, password: str = NEO4J_PASSWORD):
        self.driver = None
        self.uri = uri
        self.user = user
        self.password = password
    
    def connect(self):
        """Connect to Neo4j."""
        try:
            self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
            self.driver.verify_connectivity()
            return True
        except Exception as e:
            print(f"Neo4j connection failed: {e}", file=sys.stderr)
            print("Start Neo4j: docker run -d -p 7687:7687 -p 7474:7474 -e NEO4J_AUTH=neo4j/liha_graph_2026 neo4j:5", file=sys.stderr)
            return False
    
    def close(self):
        if self.driver:
            self.driver.close()
    
    def _run(self, query: str, params: dict = None):
        """Execute a Cypher query."""
        with self.driver.session() as session:
            result = session.run(query, params or {})
            return [record.data() for record in result]
    
    # ============ COURSE OPERATIONS ============
    
    def add_course(self, course_id: int, shortname: str, fullname: str):
        """Add or update a course (MERGE = incremental)."""
        query = """
        MERGE (c:Course {id: $id})
        SET c.shortname = $shortname,
            c.fullname = $fullname,
            c.updatedAt = datetime()
        RETURN c
        """
        return self._run(query, {"id": course_id, "shortname": shortname, "fullname": fullname})
    
    # ============ MATERIAL OPERATIONS ============
    
    def add_material(self, course_id: int, filename: str, pages: int = 0, word_count: int = 0):
        """Add or update a material linked to course."""
        query = """
        MATCH (c:Course {id: $course_id})
        MERGE (m:Material {filename: $filename})
        SET m.pages = $pages,
            m.wordCount = $word_count,
            m.updatedAt = datetime()
        MERGE (c)-[:HAS_MATERIAL]->(m)
        RETURN m
        """
        return self._run(query, {
            "course_id": course_id,
            "filename": filename,
            "pages": pages,
            "word_count": word_count
        })
    
    # ============ CHUNK OPERATIONS ============
    
    def add_chunk(self, filename: str, chunk_index: int, content_preview: str, word_count: int):
        """Add a chunk linked to its material."""
        chunk_id = f"{filename}_{chunk_index}"
        query = """
        MATCH (m:Material {filename: $filename})
        MERGE (ch:Chunk {id: $chunk_id})
        SET ch.index = $chunk_index,
            ch.preview = $preview,
            ch.wordCount = $word_count
        MERGE (m)-[:CONTAINS_CHUNK]->(ch)
        RETURN ch
        """
        return self._run(query, {
            "filename": filename,
            "chunk_id": chunk_id,
            "chunk_index": chunk_index,
            "preview": content_preview[:200],
            "word_count": word_count
        })
    
    # ============ CONCEPT EXTRACTION ============
    
    def extract_concepts(self, text: str) -> List[str]:
        """Extract key concepts from text using pattern matching."""
        concepts = set()
        
        # Pattern-based extraction for educational content
        patterns = [
            r'\b(?:binary|octal|hexadecimal|decimal)\s+(?:number|system|digit)',
            r'\b(?:boolean)\s+(?:algebra|logic|expression)',
            r'\b(?:logic)\s+(?:gate|function|circuit)',
            r'\b(?:combinational|sequential)\s+circuit',
            r'\b(?:number)\s+(?:system|representation|conversion)',
            r'\b(?:bit|byte|MSB|LSB)\b',
            r'\b(?:radix|base)\b',
        ]
        
        text_lower = text.lower()
        for pattern in patterns:
            matches = re.findall(pattern, text_lower)
            concepts.update(matches)
        
        # Also extract capitalized terms that look like concepts
        cap_terms = re.findall(r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b', text)
        for term in cap_terms:
            if len(term) > 3 and term not in {'Lecture', 'Chapter', 'The', 'About'}:
                concepts.add(term.lower())
        
        return list(concepts)[:10]  # Limit to top 10
    
    def add_concept(self, name: str):
        """Add a concept node."""
        query = """
        MERGE (c:Concept {name: $name})
        RETURN c
        """
        return self._run(query, {"name": name.lower()})
    
    def link_chunk_to_concept(self, chunk_id: str, concept_name: str):
        """Link a chunk to concepts it covers."""
        query = """
        MATCH (ch:Chunk {id: $chunk_id})
        MERGE (c:Concept {name: $concept})
        MERGE (ch)-[:COVERS]->(c)
        RETURN ch, c
        """
        return self._run(query, {"chunk_id": chunk_id, "concept": concept_name.lower()})
    
    # ============ ASSIGNMENT OPERATIONS ============
    
    def add_assignment(self, course_id: int, assign_id: int, name: str, duedate: int):
        """Add or update an assignment."""
        query = """
        MATCH (c:Course {id: $course_id})
        MERGE (a:Assignment {id: $assign_id})
        SET a.name = $name,
            a.duedate = $duedate,
            a.updatedAt = datetime()
        MERGE (c)-[:HAS_ASSIGNMENT]->(a)
        RETURN a
        """
        return self._run(query, {
            "course_id": course_id,
            "assign_id": assign_id,
            "name": name,
            "duedate": duedate
        })
    
    # ============ QUERY OPERATIONS ============
    
    def get_stats(self) -> dict:
        """Get graph statistics."""
        query = """
        MATCH (c:Course) WITH count(c) as courses
        MATCH (m:Material) WITH courses, count(m) as materials
        MATCH (ch:Chunk) WITH courses, materials, count(ch) as chunks
        MATCH (co:Concept) WITH courses, materials, chunks, count(co) as concepts
        MATCH (a:Assignment) 
        RETURN courses, materials, chunks, concepts, count(a) as assignments
        """
        result = self._run(query)
        return result[0] if result else {}
    
    def find_related_concepts(self, concept_name: str) -> List[dict]:
        """Find chunks and materials related to a concept."""
        query = """
        MATCH (c:Concept {name: $name})<-[:COVERS]-(ch:Chunk)<-[:CONTAINS_CHUNK]-(m:Material)<-[:HAS_MATERIAL]-(co:Course)
        RETURN co.shortname as course, m.filename as material, ch.preview as chunk_preview
        LIMIT 5
        """
        return self._run(query, {"name": concept_name.lower()})
    
    # ============ BULK OPERATIONS ============
    
    def process_embedded_pdf(self, data: dict):
        """Process an embedded PDF JSON and add to graph."""
        source = data.get("source", {})
        chunks = data.get("chunks", [])
        
        filename = source.get("filename", "unknown")
        course_id = chunks[0].get("courseId", 0) if chunks else 0
        course_name = chunks[0].get("courseName", "") if chunks else ""
        
        # Add course if we have info
        if course_id and course_name:
            self.add_course(course_id, course_name, course_name)
        
        # Add material
        self.add_material(
            course_id or 0,
            filename,
            source.get("pages", 0),
            source.get("wordCount", 0)
        )
        
        # Add chunks and extract concepts
        concepts_found = set()
        for chunk in chunks:
            chunk_id = f"{filename}_{chunk.get('index', 0)}"
            self.add_chunk(
                filename,
                chunk.get("index", 0),
                chunk.get("content", "")[:200],
                chunk.get("wordCount", 0)
            )
            
            # Extract and link concepts
            concepts = self.extract_concepts(chunk.get("content", ""))
            for concept in concepts:
                self.add_concept(concept)
                self.link_chunk_to_concept(chunk_id, concept)
                concepts_found.add(concept)
        
        return {
            "material": filename,
            "chunks_added": len(chunks),
            "concepts_extracted": list(concepts_found)
        }


def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python3 knowledge_graph.py add_pdf <embedded_json>")
        print("  python3 knowledge_graph.py query <concept>")
        print("  python3 knowledge_graph.py stats")
        sys.exit(1)
    
    kg = KnowledgeGraph()
    if not kg.connect():
        sys.exit(1)
    
    try:
        command = sys.argv[1]
        
        if command == "add_pdf":
            if len(sys.argv) >= 3 and os.path.exists(sys.argv[2]):
                with open(sys.argv[2], 'r') as f:
                    data = json.load(f)
            else:
                data = json.load(sys.stdin)
            result = kg.process_embedded_pdf(data)
            print(json.dumps(result, indent=2))
            
        elif command == "query":
            if len(sys.argv) < 3:
                print("Usage: python3 knowledge_graph.py query <concept>")
                sys.exit(1)
            results = kg.find_related_concepts(sys.argv[2])
            print(json.dumps(results, indent=2))
            
        elif command == "stats":
            stats = kg.get_stats()
            print(json.dumps(stats, indent=2))
            
        else:
            print(f"Unknown command: {command}")
            sys.exit(1)
            
    finally:
        kg.close()


if __name__ == "__main__":
    main()
