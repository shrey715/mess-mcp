#!/usr/bin/env python3
"""
MCP Server for IIITH Intranet - Vector Search
Returns relevant document chunks from the knowledge base
"""

import asyncio
from mcp.server import Server, NotificationOptions
from mcp.server.models import InitializationOptions
import mcp.server.stdio
import mcp.types as types

import chromadb
from sentence_transformers import SentenceTransformer
from pathlib import Path

# ============================================================================
# CONFIGURATION
# ============================================================================

# Use absolute path relative to this script's location
VECTOR_DB_PATH = str(Path(__file__).parent / "vector_db")
COLLECTION_NAME = "intranet_docs"
EMBEDDING_MODEL = "intfloat/e5-base-v2"

# ============================================================================
# VECTOR SEARCH
# ============================================================================

class VectorSearch:
    def __init__(self):
        print("Loading embedding model...", flush=True)
        self.embedder = SentenceTransformer(EMBEDDING_MODEL)
        
        print("Connecting to vector database...", flush=True)
        self.client = chromadb.PersistentClient(path=VECTOR_DB_PATH)
        self.collection = self.client.get_collection(COLLECTION_NAME)
        
        print(f"✅ Ready! {self.collection.count()} chunks loaded", flush=True)
    
    def search(self, query: str, top_k: int = 5, context_window: int = 6):
        """Search and return relevant chunks with context"""
        query_embedding = self.embedder.encode([query])
        
        # Get top K most similar chunks
        results = self.collection.query(
            query_embeddings=query_embedding.tolist(),
            n_results=top_k
        )
        
        all_chunks = []
        seen_ids = set()
        
        # For each top match, get surrounding context
        for i in range(len(results['documents'][0])):
            match_metadata = results['metadatas'][0][i]
            match_id = results['ids'][0][i]
            relevance = round(1 - results['distances'][0][i], 3)
            
            # Get chunk index and source document
            chunk_index = match_metadata.get('chunk_index', 0)
            doc_id = match_metadata.get('doc_id', match_metadata.get('source', 'Unknown'))
            
            # Calculate range of chunks to fetch
            start_idx = max(0, chunk_index - context_window)
            end_idx = chunk_index + context_window + 1
            
            # Fetch chunks in context window from same document
            context_chunks = self.collection.get(
                where={
                    "$and": [
                        {"doc_id": {"$eq": doc_id}},
                        {"chunk_index": {"$gte": start_idx}},
                        {"chunk_index": {"$lt": end_idx}}
                    ]
                }
            )
            
            # Sort by chunk_index to maintain order
            indexed_chunks = list(zip(
                context_chunks['ids'],
                context_chunks['documents'],
                context_chunks['metadatas']
            ))
            indexed_chunks.sort(key=lambda x: x[2].get('chunk_index', 0))
            
            # Add chunks with context info
            for chunk_id, text, metadata in indexed_chunks:
                if chunk_id not in seen_ids:
                    seen_ids.add(chunk_id)
                    all_chunks.append({
                        'id': chunk_id,
                        'text': text,
                        'title': metadata.get('doc_title', 'Unknown'),
                        'source': metadata.get('doc_id', metadata.get('source', 'Unknown')),
                        'category': metadata.get('category', 'N/A'),
                        'chunk_index': metadata.get('chunk_index', 0),
                        'is_match': chunk_id == match_id,
                        'match_relevance': relevance if chunk_id == match_id else None,
                        'context_group': i + 1  # Which top-k match this belongs to
                    })
        
        return all_chunks

# Initialize
searcher = VectorSearch()

# ============================================================================
# MCP SERVER
# ============================================================================

server = Server("intranet-search")

@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    """Available tools"""
    return [
        types.Tool(
            name="search_intranet",
            description="Search IIITH intranet documents. Returns relevant text chunks from policies, handbooks, and announcements.",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "What to search for (e.g., 'attendance policy', 'hostel rules', 'exam deadlines')"
                    },
                    "top_k": {
                        "type": "integer",
                        "description": "Number of top matches to find (default: 5, max: 10)",
                        "default": 5,
                        "minimum": 1,
                        "maximum": 10
                    },
                    "context_window": {
                        "type": "integer",
                        "description": "Number of chunks before/after each match to include for context (default: 2)",
                        "default": 6,
                        "minimum": 0,
                        "maximum": 10
                    }
                },
                "required": ["query"]
            }
        ),
        types.Tool(
            name="get_categories",
            description="List all document categories in the knowledge base",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        )
    ]

@server.call_tool()
async def handle_call_tool(
    name: str, arguments: dict | None
) -> list[types.TextContent]:
    """Execute tool"""
    
    if name == "search_intranet":
        query = arguments.get("query", "")
        top_k = min(arguments.get("top_k", 5), 10)  # Cap at 10
        context_window = min(arguments.get("context_window", 2), 5)  # Cap at 5
        
        results = searcher.search(query, top_k=top_k, context_window=context_window)
        
        # Format with context grouping
        output = f"🔍 Found {top_k} top matches with ±{context_window} context chunks each\n"
        output += f"Query: \"{query}\"\n\n"
        
        current_group = 0
        for chunk in results:
            # New match group
            if chunk['context_group'] != current_group:
                current_group = chunk['context_group']
                output += f"\n{'='*70}\n"
                output += f"📍 MATCH #{current_group}"
                if chunk['is_match']:
                    output += f" | Relevance: {chunk['match_relevance']}"
                output += f"\n{'='*70}\n\n"
            
            # Mark the actual match
            prefix = "🎯 " if chunk['is_match'] else "   "
            
            output += f"{prefix}[{chunk['source']}] Chunk {chunk['chunk_index']}\n"
            output += f"{'-'*70}\n"
            output += f"{chunk['text']}\n\n"
        
        output += f"\n💡 Tip: 🎯 marks the exact matches. Surrounding chunks provide context.\n"
        
        return [types.TextContent(type="text", text=output)]
    
    elif name == "get_categories":
        all_data = searcher.collection.get()
        
        categories = {}
        for metadata in all_data['metadatas']:
            cat = metadata.get('category', 'Uncategorized')
            categories[cat] = categories.get(cat, 0) + 1
        
        output = "📚 Knowledge Base Categories:\n\n"
        for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
            output += f"- {cat}: {count} chunks\n"
        
        output += f"\nTotal: {searcher.collection.count()} chunks"
        
        return [types.TextContent(type="text", text=output)]
    
    else:
        raise ValueError(f"Unknown tool: {name}")

async def main():
    """Run server"""
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="intranet-search",
                server_version="1.0.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                )
            )
        )

if __name__ == "__main__":
    asyncio.run(main())
