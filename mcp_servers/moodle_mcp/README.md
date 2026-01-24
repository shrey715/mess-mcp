# Moodle MCP for LIHA

Unified Moodle API client and PDF processor for LIHA Knowledge Graph.

## Features

- **Moodle Client**: Fetch courses, assignments, materials via MCP
- **PDF Processor**: Extract text and chunk for embeddings (Python/PyMuPDF)

## Installation

```bash
npm install
pip3 install pymupdf
```

## Usage

### TypeScript Client
```typescript
import { MoodleMCPClient } from '@onlyapps/moodle-mcp';

const client = new MoodleMCPClient({
  baseUrl: 'http://10.42.0.159:8085/webservice/mcp/server.php',
  token: 'e03e23c6e7c7b5b8364e878846e9250b'
});

const courses = await client.getCourses();
const pdfs = await client.getCoursePDFs(courseId);
```

### Python PDF Processor
```bash
python3 process_pdfs.py lecture.pdf 6 "DSM"
```

## Output

JSON with source info + chunked text ready for embedding:
```json
{
  "source": { "filename": "...", "pages": 12, "wordCount": 722 },
  "chunks": [{ "content": "...", "wordCount": 150 }],
  "stats": { "totalChunks": 6 }
}
```

## Next Steps

- Generate embeddings (OpenAI/local)
- Store in vector DB
- Build LIHA query interface
