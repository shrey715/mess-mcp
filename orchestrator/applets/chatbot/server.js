/**
 * IIIT AI Assistant Backend
 * Connects Gemini API with MCP servers (Intranet, Mess, Moodle)
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve frontend files

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE');

// MCP Clients
const mcpClients = {
  intranet: null,
  mess: null,
  moodle: null
};

// Session IDs for HTTP MCP clients
const mcpSessions = {
  mess: null
};

// MCP Server configurations
const mcpConfigs = {
  intranet: {
    url: 'http://localhost:8001/mcp',
    type: 'http'
  },
  mess: {
    url: 'http://localhost:8000/mcp',
    type: 'http'
  },
  moodle: {
    command: 'npx',
    args: ['tsx', '/home/kinomorph/Github/OnlyApps/mcp_servers/moodle_mcp/src/server.ts'],
    type: 'stdio',
    env: {
      MOODLE_URL: process.env.MOODLE_URL || 'http://localhost:8085',
      MOODLE_TOKEN: process.env.MOODLE_TOKEN || '6e46f93f5f12b5bf476e7f2b8e7d6ba3'
    }
  }
};

// Initialize MCP clients
async function initializeMCPClients() {
  console.log('Initializing MCP clients...');

  for (const [name, config] of Object.entries(mcpConfigs)) {
    try {
      if (config.type === 'stdio') {
        // Create stdio transport
        const transport = new StdioClientTransport({
          command: config.command,
          args: config.args,
          env: { ...process.env, ...config.env }
        });

        // Create and connect client
        const client = new Client({
          name: `${name}-client`,
          version: '1.0.0'
        }, {
          capabilities: {}
        });

        await client.connect(transport);
        mcpClients[name] = client;
        console.log(`✅ ${name} MCP client connected (stdio)`);

      } else if (config.type === 'http') {
        // For HTTP, initialize session with SSE handling
        try {
          // First, create a new session by calling initialize without a session ID
          const initResponse = await fetch(config.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json, text/event-stream'
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'initialize',
              params: {
                protocolVersion: '2024-11-05',
                capabilities: {},
                clientInfo: {
                  name: 'chatbot-client',
                  version: '1.0.0'
                }
              },
              id: 1
            })
          });

          // Extract session ID from response
          let sessionId = initResponse.headers.get('mcp-session-id') ||
            initResponse.headers.get('x-mcp-session-id');

          // Check if response is SSE or JSON and extract session from body if needed
          const contentType = initResponse.headers.get('content-type');
          if (contentType && contentType.includes('text/event-stream')) {
            const text = await initResponse.text();
            console.log(`[${name}] SSE initialization response:`, text.substring(0, 200));

            // Try to parse SSE for session info
            try {
              const data = parseSSEResponse(text);
              if (data.result && data.result.sessionId) {
                sessionId = data.result.sessionId;
              }
            } catch (e) {
              // Ignore parsing errors
            }
          } else {
            const initData = await initResponse.json();
            console.log(`[${name}] JSON initialization response:`, initData);
            if (initData.result && initData.result.sessionId) {
              sessionId = initData.result.sessionId;
            }
          }

          // If still no session ID, generate one
          if (!sessionId) {
            sessionId = Math.random().toString(36).substring(2, 15);
            console.log(`[${name}] Generated fallback session ID: ${sessionId}`);
          }

          mcpSessions[name] = sessionId;
          mcpClients[name] = { type: 'http', url: config.url };
          console.log(`✅ ${name} MCP server available (HTTP, session: ${sessionId})`);
        } catch (error) {
          console.log(`⚠️  ${name} MCP HTTP initialization failed:`, error.message);
        }
      }

    } catch (error) {
      console.log(`❌ ${name} MCP client failed to connect:`, error.message);
    }
  }
}

// Initialize on startup
initializeMCPClients().catch(console.error);

// Helper function to parse SSE responses
function parseSSEResponse(sseText) {
  const lines = sseText.trim().split('\n');
  let jsonData = '';

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      jsonData += line.substring(6);
    }
  }

  try {
    return JSON.parse(jsonData);
  } catch (e) {
    console.error('Failed to parse SSE data:', jsonData);
    throw e;
  }
}

// Available MCP tools and resources
let availableTools = [];
let availableResources = [];

// Tool metadata mapping (internal use only)
const toolMetadata = new Map();

// Get tools from all connected MCP servers
async function loadMCPTools() {
  const tools = [];

  // Custom tool for reading resources
  tools.push({
    name: "read_resource",
    description: "Read data from an MCP resource URI (e.g., mess://menus/today)",
    parameters: {
      type: "object",
      properties: {
        uri: {
          type: "string",
          description: "The full URI of the resource to read"
        }
      },
      required: ["uri"]
    }
  });

  for (const [serverName, client] of Object.entries(mcpClients)) {
    if (!client) continue;

    try {
      let result;

      if (client.type === 'http') {
        const headers = {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream'
        };

        if (mcpSessions[serverName]) {
          headers['mcp-session-id'] = mcpSessions[serverName];
        }

        const response = await fetch(client.url, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'tools/list',
            params: {},
            id: 1
          })
        });

        const contentType = response.headers.get('content-type');
        let data;
        if (contentType && contentType.includes('text/event-stream')) {
          const sseText = await response.text();
          data = parseSSEResponse(sseText);
        } else {
          data = await response.json();
        }

        result = data.result || data;
      } else {
        result = await client.listTools();
      }

      if (!result || !result.tools) {
        console.log(`No tools found for ${serverName}. Result structure:`, JSON.stringify(result, null, 2));
        continue;
      }

      for (const tool of result.tools) {
        const toolName = `${serverName}_${tool.name}`;

        toolMetadata.set(toolName, {
          server: serverName,
          originalName: tool.name
        });

        tools.push({
          name: toolName,
          description: tool.description || `${tool.name} from ${serverName} server`,
          parameters: tool.inputSchema || {
            type: 'object',
            properties: {},
            required: []
          }
        });
      }

      console.log(`Loaded ${result.tools.length} tools from ${serverName}`);
    } catch (error) {
      console.error(`Error loading tools from ${serverName}:`, error.message);
    }
  }

  availableTools = tools;
  return tools;
}

// Get resources from all connected MCP servers
async function loadMCPResources() {
  const resources = [];

  for (const [serverName, client] of Object.entries(mcpClients)) {
    if (!client) continue;

    try {
      let result;

      if (client.type === 'http') {
        const headers = {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream'
        };

        if (mcpSessions[serverName]) {
          headers['mcp-session-id'] = mcpSessions[serverName];
        }

        const response = await fetch(client.url, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'resources/list',
            params: {},
            id: 2
          })
        });

        const contentType = response.headers.get('content-type');
        let data;
        if (contentType && contentType.includes('text/event-stream')) {
          const sseText = await response.text();
          data = parseSSEResponse(sseText);
        } else {
          data = await response.json();
        }

        result = data.result || data;
      } else {
        // SDK might not have listResources exposed directly on Client class easily in all versions,
        // but let's try assuming standard MCP SDK
        if (client.listResources) {
          result = await client.listResources();
        } else {
          // Fallback request
          result = await client.request({ method: 'resources/list' });
        }
      }

      if (!result || !result.resources) continue;

      for (const resource of result.resources) {
        resources.push({
          ...resource,
          server: serverName
        });
      }

    } catch (error) {
      console.log(`Note: Could not load resources from ${serverName}: ${error.message}`);
    }
  }

  availableResources = resources;
  console.log(`Loaded ${resources.length} resources from servers`);
  return resources;
}

// Execute MCP tool calls using MCP SDK
async function executeMCPTool(toolName, args) {
  console.log(`Executing MCP tool: ${toolName}`, args);

  // Handle special read_resource tool
  if (toolName === 'read_resource') {
    const { uri } = args;
    // Find which server handles this URI
    // Heuristic: Check if any known resource starts with the URI or matches a template
    // Simpler: iterate all clients and try reading

    for (const [serverName, client] of Object.entries(mcpClients)) {
      if (!client) continue;

      try {
        let result;
        if (client.type === 'http') {
          const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream'
          };
          if (mcpSessions[serverName]) headers['mcp-session-id'] = mcpSessions[serverName];

          const response = await fetch(client.url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'resources/read',
              params: { uri },
              id: Date.now()
            })
          });

          const contentType = response.headers.get('content-type');
          let data;
          if (contentType && contentType.includes('text/event-stream')) {
            const sseText = await response.text();
            data = parseSSEResponse(sseText);
          } else {
            data = await response.json();
          }

          if (data.error) continue; // Try next server
          result = data.result;

        } else {
          try {
            result = await client.readResource({ uri });
          } catch (e) { continue; }
        }

        if (result && result.contents) {
          return { content: result.contents };
        }

      } catch (e) {
        // Continue to next server
      }
    }
    return { error: `Resource not found: ${uri}` };
  }

  try {
    // Get metadata for this tool
    const metadata = toolMetadata.get(toolName);
    if (!metadata) {
      return { error: `Unknown tool: ${toolName}` };
    }

    const serverName = metadata.server;
    const mcpToolName = metadata.originalName;
    const client = mcpClients[serverName];

    if (!client) {
      return {
        error: `${serverName} MCP client is not available.`,
        mock: true
      };
    }

    let result;

    if (client.type === 'http') {
      // HTTP: Make JSON-RPC call
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      };

      // Add session ID if available
      if (mcpSessions[serverName]) {
        headers['mcp-session-id'] = mcpSessions[serverName];
      }

      const response = await fetch(client.url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: mcpToolName,
            arguments: args
          },
          id: Date.now()
        })
      });

      // Handle SSE or JSON response
      const contentType = response.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('text/event-stream')) {
        const sseText = await response.text();
        data = parseSSEResponse(sseText);
      } else {
        data = await response.json();
      }

      result = data.result;
    } else {
      // Stdio: Use SDK method
      result = await client.callTool({
        name: mcpToolName,
        arguments: args
      });
    }

    console.log(`Tool result from ${serverName}:`, JSON.stringify(result).substring(0, 200));

    // Extract content from MCP response
    if (result.content && Array.isArray(result.content)) {
      const textContent = result.content
        .filter(c => c.type === 'text')
        .map(c => c.text)
        .join('\n');

      try {
        // Try to parse as JSON
        return JSON.parse(textContent);
      } catch {
        // Return as is if not JSON
        if (textContent) return { result: textContent, source: serverName };
        return result; // Fallback
      }
    }

    return result;

  } catch (error) {
    console.error(`Error executing ${toolName}:`, error);
    return { error: error.message };
  }
}

// Helper to construct dynamic system prompt
function getSystemPrompt() {
  let resourceList = availableResources.map(r => `- ${r.uri}: ${r.name} (${r.mimeType || 'text/plain'})`).join('\n');
  if (availableResources.length > 0) {
    resourceList = `\nAVAILABLE RESOURCES (Use read_resource to access):\n${resourceList}\n`;
  } else {
    resourceList = "";
  }

  return SYSTEM_PROMPT.replace('{{RESOURCES}}', resourceList);
}

// System prompt with IIIT context
const SYSTEM_PROMPT = `You are an AI assistant for IIIT Hyderabad students.

{{RESOURCES}}

You MUST use the available tools to answer questions about:
- Academic policies, exams, quizzes, grading (use search_intranet)
- Mess menus and timings (use read_resource with 'mess://...' URIs or get_mess_info)
- Course assignments and deadlines (use search_moodle)

IMPORTANT: When a student asks about exams, quizzes, deadlines, policies, or any IIIT-specific information, you MUST call the appropriate tool first. Do NOT try to answer without using tools.

Process:
1. Identify which tool or resource to use based on the question
   - For mess menus, look for 'mess://menus/...' resources
   - For generic info, use 'mess://info'
2. Call the tool with a relevant search query
3. Use the retrieved information to provide a helpful answer
4. If the first tool doesn't help, try another tool

Be friendly, accurate, and always use tools for IIIT-specific questions.`;

// Alias for usage below
const _getSystemPrompt = getSystemPrompt;

// Main chat endpoint (SSE)
app.post('/chat', async (req, res) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { message, history = [] } = req.body;

    if (!message) {
      send({ type: 'error', error: 'Message is required' });
      res.end();
      return;
    }

    console.log('Received message:', message);

    // Load available tools from MCP servers
    if (availableTools.length === 0) {
      send({ type: 'thinking', detail: 'Loading tools...' });
      await loadMCPTools();
      await loadMCPResources();
    }

    // Initialize model
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools: availableTools.length > 0 ? [{ functionDeclarations: availableTools }] : [],
      systemInstruction: getSystemPrompt(),
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
      ],
      toolConfig: {
        functionCallingConfig: {
          mode: 'AUTO'
        }
      }
    });

    // Build conversation history
    let chatHistory = history.slice(-10).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Ensure first message is always 'user' (Gemini requirement)
    while (chatHistory.length > 0 && chatHistory[0].role === 'model') {
      chatHistory.shift();
    }

    const chat = model.startChat({
      history: chatHistory
    });

    let currentMessage = message;
    const maxIterations = 5;
    let iterations = 0;

    // Main loop for tool use
    while (iterations < maxIterations) {
      let functionCall = null;
      let fullText = '';

      const result = await chat.sendMessageStream(currentMessage);

      // Process stream
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          send({ type: 'content', text: chunkText });
          fullText += chunkText;
        }

        // Check for function calls in the chunk (they usually come at the end)
        // Note: SDK handles aggregation, but we need to check the finalized chunk
      }

      const response = await result.response;
      const calls = response.functionCalls();

      if (calls && calls.length > 0) {
        functionCall = calls[0]; // Handle one at a time for simplicity
        const toolName = functionCall.name;
        const toolArgs = functionCall.args;

        console.log(`Tool call: ${toolName}`, toolArgs);

        // Notify frontend
        send({
          type: 'tool_call',
          name: toolName,
          args: toolArgs
        });

        // Custom detailing for read_resource
        if (toolName === 'read_resource') {
          send({ type: 'thinking', detail: `Reading ${toolArgs.uri}...` });
        } else {
          send({ type: 'thinking', detail: `Asking ${toolName}...` });
        }

        // Execute tool
        const toolResult = await executeMCPTool(toolName, toolArgs);

        send({
          type: 'tool_result',
          name: toolName,
          result: toolResult
        });

        // Feed back to model
        currentMessage = [{
          functionResponse: {
            name: toolName,
            response: toolResult
          }
        }];

        iterations++;
      } else {
        // No function call, we are done
        break;
      }
    }

    send({ type: 'done' });

  } catch (error) {
    console.error('Error in chat endpoint:', error);
    send({ type: 'error', error: error.message });
  } finally {
    res.end();
  }
});

// Health check
app.get('/health', async (req, res) => {
  const mcpStatus = {};

  for (const [name, client] of Object.entries(mcpClients)) {
    const toolCount = Array.from(toolMetadata.values()).filter(m => m.server === name).length;
    mcpStatus[name] = {
      connected: !!client,
      type: client?.type || 'stdio',
      toolsAvailable: toolCount
    };
  }

  res.json({
    status: 'ok',
    mcpClients: mcpStatus,
    totalTools: availableTools.length,
    totalResources: availableResources.length,
    timestamp: new Date().toISOString()
  });
});

// Endpoint to reload tools from MCP servers
app.post('/reload-tools', async (req, res) => {
  try {
    await loadMCPTools();
    await loadMCPResources();
    res.json({
      success: true,
      toolsLoaded: availableTools.length,
      resourcesLoaded: availableResources.length,
      tools: availableTools.map(t => ({
        name: t.name,
        server: toolMetadata.get(t.name)?.server
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint to add custom MCP server
app.post('/add-mcp', async (req, res) => {
  try {
    const { name, type = 'stdio', command, args, url, env } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }

    if (type === 'stdio' && !command) {
      return res.status(400).json({
        success: false,
        error: 'Command is required for stdio type'
      });
    }

    if (type === 'http' && !url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required for http type'
      });
    }

    // Check if already exists
    if (mcpClients[name]) {
      return res.status(400).json({
        success: false,
        error: `MCP server "${name}" already exists`
      });
    }

    // Add to configs
    const config = {
      type,
      env: env || {}
    };

    if (type === 'stdio') {
      config.command = command;
      config.args = args || [];
    } else {
      config.url = url;
    }

    mcpConfigs[name] = config;

    // Initialize the client
    if (type === 'stdio') {
      const transport = new StdioClientTransport({
        command,
        args: args || [],
        env: { ...process.env, ...(env || {}) }
      });

      const client = new Client({
        name: `${name}-client`,
        version: '1.0.0'
      }, {
        capabilities: {}
      });

      await client.connect(transport);
      mcpClients[name] = client;
    } else {
      // HTTP/SSE Logic similar to initializeMCPClients
      try {
        const initResponse = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              clientInfo: {
                name: `${name}-client`,
                version: '1.0.0'
              }
            },
            id: 1
          })
        });

        let sessionId = initResponse.headers.get('mcp-session-id') ||
          initResponse.headers.get('x-mcp-session-id');

        const contentType = initResponse.headers.get('content-type');
        if (contentType && contentType.includes('text/event-stream')) {
          const text = await initResponse.text();
          const data = parseSSEResponse(text);
          if (data.result && data.result.sessionId) sessionId = data.result.sessionId;
        } else {
          const initData = await initResponse.json();
          if (initData.result && initData.result.sessionId) sessionId = initData.result.sessionId;
        }

        if (!sessionId) {
          sessionId = Math.random().toString(36).substring(2, 15);
        }

        mcpSessions[name] = sessionId;
        mcpClients[name] = { type: 'http', url: url };

      } catch (err) {
        delete mcpConfigs[name]; // specific cleanup
        throw new Error(`Failed to connect to HTTP MCP: ${err.message}`);
      }
    }

    // Reload tools
    await loadMCPTools();
    await loadMCPResources();

    res.json({
      success: true,
      message: `MCP server "${name}" added successfully`,
      toolsLoaded: availableTools.length
    });
  } catch (error) {
    console.error('Error adding MCP:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint to remove MCP server
app.post('/remove-mcp', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !mcpConfigs[name]) {
      return res.status(404).json({ success: false, error: 'MCP server not found' });
    }

    const client = mcpClients[name];
    if (client) {
      // Best effort to close if it has a close method
      if (typeof client.close === 'function') {
        try { await client.close(); } catch (e) { console.error('Error closing client:', e); }
      }
    }

    delete mcpClients[name];
    delete mcpConfigs[name];
    delete mcpSessions[name];

    // Remove tools associated with this server
    availableTools = [];
    toolMetadata.clear();
    await loadMCPTools(); // Reload remaining
    await loadMCPResources();

    res.json({
      success: true,
      message: `MCP server "${name}" removed successfully`
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint to list all MCP servers
app.get('/list-mcps', (req, res) => {
  const mcpList = Object.entries(mcpConfigs).map(([name, config]) => ({
    name,
    type: config.type,
    connected: !!mcpClients[name],
    toolCount: Array.from(toolMetadata.values()).filter(m => m.server === name).length
  }));

  res.json({ mcps: mcpList });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🤖 IIIT AI Assistant Backend running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log('\n⚠️  Remember to set GEMINI_API_KEY environment variable');

  // Load tools after server starts
  setTimeout(async () => {
    try {
      await loadMCPTools();
      await loadMCPResources();
      console.log(`\n✅ Loaded ${availableTools.length} tools`);
      console.log(`✅ Loaded ${availableResources.length} resources`);
    } catch (error) {
      console.error('Error loading MCP tools/resources:', error.message);
    }
  }, 2000); // Wait 2 seconds for MCP clients to initialize
});
