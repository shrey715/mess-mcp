# Testing the Moodle MCP Endpoint

## ❌ Don't Do This
**Visiting the endpoint in a browser**: `http://localhost:8080/webservice/mcp/server.php`

This will give you an error because browsers don't send authentication headers.

## ✅ Do This Instead

### Option 1: Using curl (Command Line)

```bash
# List available tools
curl -X POST "http://localhost:8080/webservice/mcp/server.php" \
  -H "Authorization: Bearer onlyapps_test_token_123456" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}'

# Get all courses
curl -X POST "http://localhost:8080/webservice/mcp/server.php" \
  -H "Authorization: Bearer onlyapps_test_token_123456" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"core_course_get_courses","arguments":{}},"id":2}'
```

### Option 2: Using Postman/Insomnia

1. **Method**: POST
2. **URL**: `http://localhost:8080/webservice/mcp/server.php`
3. **Headers**:
   - `Authorization`: `Bearer onlyapps_test_token_123456`
   - `Content-Type`: `application/json`
4. **Body** (raw JSON):
   ```json
   {
     "jsonrpc": "2.0",
     "method": "tools/list",
     "params": {},
     "id": 1
   }
   ```

### Option 3: Using JavaScript (for OnlyApps)

```javascript
const response = await fetch('http://localhost:8080/webservice/mcp/server.php', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer onlyapps_test_token_123456',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/list',
    params: {},
    id: 1
  })
});

const data = await response.json();
console.log(data);
```

## Accessing the Moodle UI

To use the standard Moodle interface:

1. **Visit**: `http://localhost:8080` (not the `/webservice/mcp/server.php` endpoint)
2. **Login**: 
   - Username: `admin`
   - Password: `Admin123!`

You can then manage courses, create assignments, etc. through the web interface.

## Summary

- **Moodle UI**: `http://localhost:8080` ← Use this in browser
- **MCP API**: `http://localhost:8080/webservice/mcp/server.php` ← Use this with curl/code (requires auth header)
