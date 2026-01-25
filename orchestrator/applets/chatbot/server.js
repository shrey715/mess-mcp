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
    args: ['tsx', '/home/abhishekg/Documents/OnlyApps/mcp_servers/moodle_mcp/src/server.ts'],
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

// System prompt with IIIT context
const SYSTEM_PROMPT = `You are an AI assistant for IIIT Hyderabad students. You MUST use the available tools to answer questions about:
- Academic policies, exams, quizzes, grading (use search_intranet)
- Mess menus and timings (use get_mess_info)  
- Course assignments and deadlines (use search_moodle)

IMPORTANT: When a student asks about exams, quizzes, deadlines, policies, or any IIIT-specific information, you MUST call the appropriate tool first. Do NOT try to answer without using tools.

Process:
1. Identify which tool to use based on the question
2. Call the tool with a relevant search query
3. Use the retrieved information to provide a helpful answer
4. If the first tool doesn't help, try another tool

Be friendly, accurate, and always use tools for IIIT-specific questions.`;

// Available MCP tools (function declarations for Gemini)
// These are dynamically generated from MCP servers
let availableTools = [];

// Tool metadata mapping (internal use only)
const toolMetadata = new Map();

// Get tools from all connected MCP servers
async function loadMCPTools() {
  const tools = [];
  
  for (const [serverName, client] of Object.entries(mcpClients)) {
    if (!client) continue;
    
    try {
      let result;
      
      if (client.type === 'http') {
        // HTTP: Make JSON-RPC call to list tools
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
            method: 'tools/list',
            params: {},
            id: 1
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
        
        console.log(`[${serverName}] Raw HTTP response:`, JSON.stringify(data, null, 2));
        result = data.result || data; // Handle different response formats
      } else {
        // Stdio: Use SDK method
        result = await client.listTools();
      }
      
      // Check if result has tools array
      if (!result || !result.tools) {
        console.log(`No tools found for ${serverName}. Result structure:`, JSON.stringify(result, null, 2));
        continue;
      }
      
      // Convert MCP tool schema to Gemini function declaration format
      for (const tool of result.tools) {
        const toolName = `${serverName}_${tool.name}`;
        
        // Store metadata separately
        toolMetadata.set(toolName, {
          server: serverName,
          originalName: tool.name
        });
        
        // Create clean Gemini function declaration (no custom properties)
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

// Execute MCP tool calls using MCP SDK
async function executeMCPTool(toolName, args) {
  console.log(`Executing MCP tool: ${toolName}`, args);

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
        return { result: textContent, source: serverName };
      }
    }

    return result;

  } catch (error) {
    console.error(`Error executing ${toolName}:`, error);
    return { error: error.message };
  }
}

// Main chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('Received message:', message);

    // Load available tools from MCP servers
    if (availableTools.length === 0) {
      await loadMCPTools();
    }

    // Initialize model with function calling
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools: availableTools.length > 0 ? [{ functionDeclarations: availableTools }] : [],
      systemInstruction: SYSTEM_PROMPT,
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

    // Send message
    let result = await chat.sendMessage(message);
    let response = result.response;
    const mcpCalls = [];

    // Helper function to extract function calls from response
    const getFunctionCalls = (response) => {
      // Check if functionCalls property exists (SDK might provide this)
      if (response.functionCalls && response.functionCalls.length > 0) {
        return response.functionCalls;
      }
      
      // Otherwise, extract from candidates.content.parts
      const parts = response.candidates?.[0]?.content?.parts || [];
      return parts
        .filter(part => part.functionCall)
        .map(part => part.functionCall);
    };

    let functionCalls = getFunctionCalls(response);
    console.log('Initial response candidates:', response.candidates?.[0]?.content?.parts?.length || 0);
    console.log('Initial response has function calls:', functionCalls.length);
    if (functionCalls.length > 0) {
      console.log('Function calls detected:', functionCalls.map(fc => fc.name).join(', '));
    }

    // Handle function calls
    const maxIterations = 5; // Prevent infinite loops
    let iterations = 0;
    
    while (functionCalls.length > 0 && iterations < maxIterations) {
      const functionCall = functionCalls[0];
      console.log(`[Iteration ${iterations + 1}] Function call requested:`, functionCall.name, functionCall.args);

      mcpCalls.push(functionCall.name);

      // Execute the function
      const functionResult = await executeMCPTool(functionCall.name, functionCall.args);
      console.log(`[Iteration ${iterations + 1}] Function result (truncated):`, JSON.stringify(functionResult).substring(0, 200));
      console.log(`[Iteration ${iterations + 1}] Full function result:`, JSON.stringify(functionResult, null, 2));

      // Send function response back to model
      result = await chat.sendMessage([{
        functionResponse: {
          name: functionCall.name,
          response: functionResult
        }
      }]);

      response = result.response;
      functionCalls = getFunctionCalls(response);
      console.log(`[Iteration ${iterations + 1}] New response has function calls:`, functionCalls.length);
      iterations++;
    }
    
    console.log('Function calling loop ended. Total MCP calls:', mcpCalls.length);

    // Get final text response
    let finalResponse;
    try {
      finalResponse = response.text();
    } catch (error) {
      // If there's no text (still has function calls), provide a fallback
      console.error('Error getting text response:', error);
      const remainingCalls = getFunctionCalls(response);
      if (remainingCalls.length > 0) {
        finalResponse = 'I tried to fetch that information, but encountered an issue processing the results. Please try rephrasing your question.';
      } else {
        finalResponse = 'I apologize, but I encountered an error processing your request.';
      }
    }
    
    // If response is empty, provide a helpful message
    if (!finalResponse || finalResponse.trim() === '') {
      finalResponse = 'I searched for that information but couldn\'t generate a proper response. Could you try rephrasing your question?';
    }

    res.json({
      response: finalResponse,
      mcpCalls: mcpCalls.length > 0 ? mcpCalls : null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({
      error: 'Failed to process message',
      details: error.message
    });
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
    timestamp: new Date().toISOString()
  });
});

// Endpoint to reload tools from MCP servers
app.post('/reload-tools', async (req, res) => {
  try {
    await loadMCPTools();
    res.json({
      success: true,
      toolsLoaded: availableTools.length,
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
    const { name, command, args, env } = req.body;
    
    if (!name || !command) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name and command are required' 
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
    mcpConfigs[name] = {
      command,
      args: args || [],
      type: 'stdio',
      env: env || {}
    };
    
    // Initialize the client
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
    
    // Reload tools
    await loadMCPTools();
    
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
      console.log(`\n✅ Loaded ${availableTools.length} tools from MCP servers`);
      availableTools.forEach(t => {
        const meta = toolMetadata.get(t.name);
        console.log(`   - ${t.name} (${meta?.server})`);
      });
    } catch (error) {
      console.error('Error loading MCP tools:', error.message);
    }
  }, 2000); // Wait 2 seconds for MCP clients to initialize
});
