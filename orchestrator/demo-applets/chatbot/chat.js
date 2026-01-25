// Chat UI Logic
const chatContainer = document.getElementById('chatContainer');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const clearButton = document.getElementById('clearButton');
const addMcpButton = document.getElementById('addMcpButton');
const statusText = document.getElementById('statusText');

let conversationHistory = [];
let isTyping = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendButton.addEventListener('click', sendMessage);
  clearButton.addEventListener('click', clearChat);
  addMcpButton.addEventListener('click', showAddMcpDialog);

  // Test bridge availability
  if (window.bridge) {
    console.log('Bridge API available');
    statusText.textContent = 'Connected to Orchestrator';
  } else {
    console.log('Bridge API not available - running standalone');
    statusText.textContent = 'Standalone Mode';
  }
});

function clearChat() {
  // Clear conversation history
  conversationHistory = [];
  
  // Clear chat container and show welcome message
  chatContainer.innerHTML = `
    <div class="welcome-message">
      <h2>Welcome to IIIT AI Assistant! 👋</h2>
      <p>I'm here to help you with everything IIIT-related. I have access to intranet policies, mess information, and Moodle data.</p>
      
      <div class="capabilities">
        <div class="capability-card">
          <h3>📚 Intranet</h3>
          <p>Academic policies, guidelines, and procedures</p>
        </div>
        <div class="capability-card">
          <h3>🍽️ Mess</h3>
          <p>Menu, timings, and mess management</p>
        </div>
        <div class="capability-card">
          <h3>📖 Moodle</h3>
          <p>Course info, assignments, and deadlines</p>
        </div>
      </div>
    </div>
  `;
  
  console.log('Chat history cleared');
}

async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message || isTyping) return;

  // Clear input
  messageInput.value = '';
  messageInput.focus();

  // Add user message to chat
  addMessage(message, 'user');

  // Add to history
  conversationHistory.push({
    role: 'user',
    content: message
  });

  // Show typing indicator
  isTyping = true;
  sendButton.disabled = true;
  const typingId = showTypingIndicator();

  try {
    // Send to backend
    const response = await fetch('http://localhost:3001/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        history: conversationHistory
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Remove typing indicator
    removeTypingIndicator(typingId);

    // Add assistant response
    addMessage(data.response, 'assistant', data.mcpCalls);

    // Update history
    conversationHistory.push({
      role: 'assistant',
      content: data.response
    });

    // Notify other applets if bridge is available
    if (window.bridge) {
      window.bridge.send('*', {
        type: 'CHAT_MESSAGE',
        payload: {
          userMessage: message,
          assistantResponse: data.response,
          mcpCalls: data.mcpCalls
        }
      });
    }

  } catch (error) {
    console.error('Error:', error);
    removeTypingIndicator(typingId);
    addMessage('Sorry, I encountered an error. Please make sure the backend server is running on port 3001.', 'assistant');
  } finally {
    isTyping = false;
    sendButton.disabled = false;
  }
}

function addMessage(content, role, mcpInfo = null) {
  // Remove welcome message if it exists
  const welcomeMessage = chatContainer.querySelector('.welcome-message');
  if (welcomeMessage) {
    welcomeMessage.remove();
  }

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = role === 'user' ? 'U' : '🤖';

  const messageContent = document.createElement('div');
  messageContent.className = 'message-content';

  // Add MCP info if available
  if (mcpInfo && mcpInfo.length > 0) {
    const mcpDiv = document.createElement('div');
    mcpDiv.className = 'mcp-info';
    mcpDiv.textContent = `📡 Used: ${mcpInfo.join(', ')}`;
    messageContent.appendChild(mcpDiv);
  }

  // Format content (basic markdown support)
  const formattedContent = formatMessage(content);
  const textDiv = document.createElement('div');
  textDiv.innerHTML = formattedContent;
  messageContent.appendChild(textDiv);

  messageDiv.appendChild(avatar);
  messageDiv.appendChild(messageContent);

  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function formatMessage(text) {
  // Basic markdown formatting
  let formatted = text
    // Code blocks
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Line breaks
    .replace(/\n/g, '<br>');

  return formatted;
}

function showTypingIndicator() {
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message assistant';
  typingDiv.id = `typing-${Date.now()}`;

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = '🤖';

  const messageContent = document.createElement('div');
  messageContent.className = 'message-content';

  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'typing-indicator';
  typingIndicator.innerHTML = '<span></span><span></span><span></span>';

  messageContent.appendChild(typingIndicator);
  typingDiv.appendChild(avatar);
  typingDiv.appendChild(messageContent);

  chatContainer.appendChild(typingDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  return typingDiv.id;
}

function removeTypingIndicator(id) {
  const typingDiv = document.getElementById(id);
  if (typingDiv) {
    typingDiv.remove();
  }
}

// Add MCP Dialog
function showAddMcpDialog() {
  const dialogHtml = `
    <div id="mcpDialog" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000;">
      <div style="background: #1a1a1a; padding: 2rem; border-radius: 1rem; max-width: 500px; width: 90%;">
        <h2 style="color: #fff; margin-bottom: 1.5rem;">Add Custom MCP Server</h2>
        
        <div style="margin-bottom: 1rem;">
          <label style="display: block; color: #a1a1aa; margin-bottom: 0.5rem; font-size: 0.875rem;">Server Name</label>
          <input type="text" id="mcpName" placeholder="my-custom-mcp" style="width: 100%; padding: 0.75rem; background: #27272a; border: 1px solid #3f3f46; border-radius: 0.5rem; color: #fff; font-size: 1rem;">
        </div>
        
        <div style="margin-bottom: 1rem;">
          <label style="display: block; color: #a1a1aa; margin-bottom: 0.5rem; font-size: 0.875rem;">Command</label>
          <input type="text" id="mcpCommand" placeholder="python3" value="python3" style="width: 100%; padding: 0.75rem; background: #27272a; border: 1px solid #3f3f46; border-radius: 0.5rem; color: #fff; font-size: 1rem;">
        </div>
        
        <div style="margin-bottom: 1.5rem;">
          <label style="display: block; color: #a1a1aa; margin-bottom: 0.5rem; font-size: 0.875rem;">File Path</label>
          <input type="text" id="mcpPath" placeholder="/path/to/your/mcp_server.py" style="width: 100%; padding: 0.75rem; background: #27272a; border: 1px solid #3f3f46; border-radius: 0.5rem; color: #fff; font-size: 1rem;">
        </div>
        
        <div style="display: flex; gap: 1rem;">
          <button onclick="addMcpServer()" style="flex: 1; padding: 0.75rem; background: #6366f1; color: #fff; border: none; border-radius: 0.5rem; font-weight: 600; cursor: pointer;">Add Server</button>
          <button onclick="closeAddMcpDialog()" style="flex: 1; padding: 0.75rem; background: transparent; color: #a1a1aa; border: 1px solid #3f3f46; border-radius: 0.5rem; font-weight: 600; cursor: pointer;">Cancel</button>
        </div>
        
        <div id="mcpError" style="margin-top: 1rem; color: #ef4444; font-size: 0.875rem; display: none;"></div>
        <div id="mcpSuccess" style="margin-top: 1rem; color: #10b981; font-size: 0.875rem; display: none;"></div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', dialogHtml);
}

window.closeAddMcpDialog = function() {
  const dialog = document.getElementById('mcpDialog');
  if (dialog) {
    dialog.remove();
  }
};

window.addMcpServer = async function() {
  const name = document.getElementById('mcpName').value.trim();
  const command = document.getElementById('mcpCommand').value.trim();
  const path = document.getElementById('mcpPath').value.trim();
  const errorDiv = document.getElementById('mcpError');
  const successDiv = document.getElementById('mcpSuccess');
  
  errorDiv.style.display = 'none';
  successDiv.style.display = 'none';
  
  if (!name || !command || !path) {
    errorDiv.textContent = 'Please fill in all fields';
    errorDiv.style.display = 'block';
    return;
  }
  
  try {
    const response = await fetch('http://localhost:3001/add-mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        command,
        args: [path]
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      successDiv.textContent = `✅ ${data.message} (${data.toolsLoaded} total tools)`;
      successDiv.style.display = 'block';
      setTimeout(() => {
        closeAddMcpDialog();
      }, 2000);
    } else {
      errorDiv.textContent = data.error;
      errorDiv.style.display = 'block';
    }
  } catch (error) {
    errorDiv.textContent = `Error: ${error.message}`;
    errorDiv.style.display = 'block';
  }
};
