#!/usr/bin/env python3
"""
Moodle PDF Processing Pipeline for LIHA Knowledge Graph

Extracts text from PDFs and chunks for embeddings.
Usage: python3 process_pdfs.py <pdf_path> [course_id] [course_name]
"""

import sys
import json
import os
import fitz  # PyMuPDF


def extract_text(pdf_path: str) -> dict:
    """Extract text and metadata from PDF file."""
    doc = fitz.open(pdf_path)
    
    text_parts = []
    for page in doc:
        text_parts.append(page.get_text())
    
    full_text = "\n\n".join(text_parts)
    metadata = doc.metadata or {}
    
    result = {
        "filename": os.path.basename(pdf_path),
        "pages": len(doc),
        "text": full_text,
        "wordCount": len(full_text.split()),
        "metadata": {
            "title": metadata.get("title"),
            "author": metadata.get("author"),
            "subject": metadata.get("subject"),
        }
    }
    
    doc.close()
    return result


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list:
    """Split text into overlapping chunks for embedding."""
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        
        # Try to find sentence boundary
        if end < len(text):
            search_text = text[start:end]
            for sep in ['. ', '! ', '? ', '\n\n', '\n']:
                last_sep = search_text.rfind(sep)
                if last_sep > chunk_size // 2:
                    end = start + last_sep + len(sep)
                    break
        
        chunk = text[start:end].strip()
        if len(chunk) >= 50:
            chunks.append({
                "index": len(chunks),
                "content": chunk,
                "charCount": len(chunk),
                "wordCount": len(chunk.split())
            })
        
        start = end - overlap
        if start >= len(text) - 50:
            break
    
    return chunks


def process_pdf(pdf_path: str, course_info: dict = None) -> dict:
    """Full pipeline: extract → chunk → JSON output."""
    extracted = extract_text(pdf_path)
    chunks = chunk_text(extracted["text"])
    
    for chunk in chunks:
        chunk["source"] = extracted["filename"]
        chunk["totalChunks"] = len(chunks)
        if course_info:
            chunk["courseId"] = course_info.get("courseId")
            chunk["courseName"] = course_info.get("courseName")
    
    return {
        "source": {
            "filename": extracted["filename"],
            "pages": extracted["pages"],
            "wordCount": extracted["wordCount"],
            "metadata": extracted["metadata"]
        },
        "chunks": chunks,
        "stats": {
            "totalChunks": len(chunks),
            "avgChunkSize": sum(c["charCount"] for c in chunks) // max(1, len(chunks)),
            "avgWordsPerChunk": sum(c["wordCount"] for c in chunks) // max(1, len(chunks))
        }
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: process_pdfs.py <pdf_path> [course_id] [course_name]"}))
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    course_info = {}
    
    if len(sys.argv) >= 3:
        course_info["courseId"] = int(sys.argv[2])
    if len(sys.argv) >= 4:
        course_info["courseName"] = sys.argv[3]
    
    try:
        result = process_pdf(pdf_path, course_info)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
