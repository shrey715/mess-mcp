// Elements
const chatContainer = document.getElementById('chatContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const clearChatBtn = document.getElementById('clearChatBtn');
const toggleMcpBtn = document.getElementById('toggleMcpBtn');
const mcpDrawer = document.getElementById('mcpDrawer');
const openAddMcpBtn = document.getElementById('addMcpBtn'); // In Drawer
const addMcpModal = document.getElementById('addMcpModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelMcpBtn = document.getElementById('cancelMcpBtn');
const saveMcpBtn = document.getElementById('saveMcpBtn');
const mcpList = document.getElementById('mcpList');

// Form Elements
const newMcpName = document.getElementById('newMcpName');
const newMcpType = document.getElementById('newMcpType');
const newMcpCommand = document.getElementById('newMcpCommand');
const newMcpArgs = document.getElementById('newMcpArgs');
const newMcpUrl = document.getElementById('newMcpUrl');
const stdioFields = document.getElementById('stdioFields');
const sseFields = document.getElementById('sseFields');
const modalError = document.getElementById('modalError');

// State
let conversationHistory = [];
let isTyping = false;
let mcpServers = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadMcpList();

  // Event Listeners
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendBtn.addEventListener('click', sendMessage);
  clearChatBtn.addEventListener('click', clearChat);
  toggleMcpBtn.addEventListener('click', () => mcpDrawer.classList.toggle('show'));
  openAddMcpBtn.addEventListener('click', openAddMcpModal);
  closeModalBtn.addEventListener('click', closeAddMcpModal);
  cancelMcpBtn.addEventListener('click', closeAddMcpModal);
  saveMcpBtn.addEventListener('click', saveMcpServer);

  newMcpType.addEventListener('change', () => {
    if (newMcpType.value === 'stdio') {
      stdioFields.style.display = 'block';
      sseFields.style.display = 'none';
    } else {
      stdioFields.style.display = 'none';
      sseFields.style.display = 'block';
    }
  });

  // Check Orchestrator Bridge
  if (window.bridge) {
    console.log('Bridge API available');
  }
});

// MCP Management
async function loadMcpList() {
  try {
    const response = await fetch('http://localhost:3001/list-mcps');
    const data = await response.json();
    mcpServers = data.mcps;
    renderMcpList();
  } catch (err) {
    console.error('Failed to load MCP list:', err);
  }
}

function renderMcpList() {
  mcpList.innerHTML = '';

  mcpServers.forEach(server => {
    const item = document.createElement('div');
    item.className = 'mcp-item';
    item.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <span class="mcp-status-dot ${server.connected ? 'connected' : 'disconnected'}"></span>
        <div>
          <div style="font-weight: 500; font-size: 0.875rem;">${server.name}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${server.type.toUpperCase()} • ${server.toolCount} tools</div>
        </div>
      </div>
      <button class="mcp-delete-btn" onclick="deleteMcpServer('${server.name}')" title="Remove Server">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    `;
    mcpList.appendChild(item);
  });
}

function openAddMcpModal() {
  addMcpModal.classList.add('show');
  modalError.style.display = 'none';
  newMcpName.value = '';
  newMcpCommand.value = '';
  newMcpArgs.value = '';
  newMcpUrl.value = '';
}

function closeAddMcpModal() {
  addMcpModal.classList.remove('show');
}

async function saveMcpServer() {
  const name = newMcpName.value.trim();
  const type = newMcpType.value;
  const command = newMcpCommand.value.trim();
  const args = newMcpArgs.value.trim();
  const url = newMcpUrl.value.trim();

  if (!name) return showError('Name is required');
  if (type === 'stdio' && !command) return showError('Command is required');
  if (type === 'sse' && !url) return showError('URL is required');

  saveMcpBtn.disabled = true;
  saveMcpBtn.textContent = 'Connecting...';

  try {
    const payload = {
      name,
      type: type === 'sse' ? 'http' : 'stdio',
    };

    if (type === 'stdio') {
      payload.command = command;
      payload.args = args ? args.split(' ') : [];
    } else {
      payload.url = url;
    }

    const response = await fetch('http://localhost:3001/add-mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.success) {
      closeAddMcpModal();
      loadMcpList();
    } else {
      showError(data.error);
    }
  } catch (err) {
    showError(err.message);
  } finally {
    saveMcpBtn.disabled = false;
    saveMcpBtn.textContent = 'Connect Server';
  }
}

async function deleteMcpServer(name) {
  if (!confirm(`Remove ${name} server?`)) return;

  try {
    const response = await fetch('http://localhost:3001/remove-mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });

    const data = await response.json();
    if (data.success) {
      loadMcpList();
    } else {
      alert(data.error);
    }
  } catch (err) {
    console.error('Error deleting MCP:', err);
  }
}

// Make delete global so onclick works
window.deleteMcpServer = deleteMcpServer;

function showError(msg) {
  modalError.textContent = msg;
  modalError.style.display = 'block';
}

// Chat Functions
function clearChat() {
  conversationHistory = [];
  chatContainer.innerHTML = `
    <div class="welcome-message">
      <h2>How can I help you today?</h2>
      <p>I can assist with IIIT policies, mess menus, Moodle assignments, and more.</p>
      
      <div class="capabilities">
        <div class="capability-card">
          <span class="capability-icon">📚</span>
          <h3>Intranet</h3>
          <p>Search academic policies & rules</p>
        </div>
        <div class="capability-card">
          <span class="capability-icon">🍽️</span>
          <h3>Mess</h3>
          <p>Check menus & manage registration</p>
        </div>
        <div class="capability-card">
          <span class="capability-icon">📝</span>
          <h3>Moodle</h3>
          <p>Track assignments & deadlines</p>
        </div>
      </div>
    </div>
  `;
}

async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message || isTyping) return;

  messageInput.value = '';
  addMessage(message, 'user');

  conversationHistory.push({ role: 'user', content: message });

  isTyping = true;
  sendBtn.disabled = true;

  // Create assistant message placeholder
  const assistantMsgId = `msg-${Date.now()}`;
  createAssistantMessage(assistantMsgId);
  updateStatus('Thinking...');

  try {
    const response = await fetch('http://localhost:3001/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history: conversationHistory
      })
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let assistantResponse = '';
    let mcpCalls = [];
    let currentToolDiv = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'thinking') {
              updateStatus(data.detail);
              // If thinking detail implies a new tool usage, maybe show a small indicator or log
              // For now, we update the status text
            } else if (data.type === 'tool_call') {
              currentToolDiv = addToolCallLog(assistantMsgId, data.name, data.args);
              mcpCalls.push(data.name);
            } else if (data.type === 'tool_result') {
              if (currentToolDiv) {
                updateToolResult(currentToolDiv, data.result);
                currentToolDiv = null;
              }
            } else if (data.type === 'content') {
              assistantResponse += data.text;
              appendToMessage(assistantMsgId, assistantResponse);
            } else if (data.type === 'done') {
              updateStatus('Connected');
            } else if (data.type === 'error') {
              appendToMessage(assistantMsgId, `\n\n**Error:** ${data.error}`);
            }
          } catch (e) {
            console.error('Error parsing SSE:', e, line);
          }
        }
      }
    }

    conversationHistory.push({ role: 'assistant', content: assistantResponse });

    if (window.bridge) {
      window.bridge.send('*', {
        type: 'CHAT_MESSAGE',
        payload: {
          userMessage: message,
          assistantResponse: assistantResponse,
          mcpCalls: mcpCalls
        }
      });
    }

  } catch (error) {
    console.error('Error:', error);
    appendToMessage(assistantMsgId, 'Sorry, I encountered an error. Please make sure the backend server is running on port 3001.');
  } finally {
    isTyping = false;
    sendBtn.disabled = false;
    updateStatus('Connected');
  }
}

function updateStatus(text) {
  const statusText = document.getElementById('statusText'); // Assume this exists in header
  if (statusText) statusText.textContent = text;
}

function createAssistantMessage(id) {
  const welcomeMessage = chatContainer.querySelector('.welcome-message');
  if (welcomeMessage) welcomeMessage.remove();

  const messageDiv = document.createElement('div');
  messageDiv.className = `message assistant`;
  messageDiv.id = id;

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>';

  const messageContent = document.createElement('div');
  messageContent.className = 'message-content';

  // Container for thinking/tools
  const toolsContainer = document.createElement('div');
  toolsContainer.className = 'tools-container';
  messageContent.appendChild(toolsContainer);

  const textDiv = document.createElement('div');
  textDiv.className = 'text-content';
  textDiv.innerHTML = '<span class="cursor"></span>'; // Blinking cursor initially
  messageContent.appendChild(textDiv);

  messageDiv.appendChild(avatar);
  messageDiv.appendChild(messageContent);

  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addToolCallLog(msgId, toolName, args) {
  const msgDiv = document.getElementById(msgId);
  const toolsContainer = msgDiv.querySelector('.tools-container');

  const details = document.createElement('details');
  details.className = 'thinking-step';
  details.open = true; // Open by default while running

  const summary = document.createElement('summary');
  summary.innerHTML = `Running <code>${toolName}</code>...`;

  const content = document.createElement('div');
  content.className = 'thinking-content';
  content.innerHTML = `<pre>${JSON.stringify(args, null, 2)}</pre>`;

  details.appendChild(summary);
  details.appendChild(content);
  toolsContainer.appendChild(details);

  return details;
}

function updateToolResult(detailsElement, result) {
  detailsElement.open = false; // Collapse when done
  const summary = detailsElement.querySelector('summary');
  summary.innerHTML = `✓ Used <code>${summary.querySelector('code').textContent}</code>`;
  summary.classList.add('completed');

  const content = detailsElement.querySelector('.thinking-content');
  // Append result if needed, or replace inputs
  // content.innerHTML += `<div class="result-label">Result:</div><pre>${JSON.stringify(result, null, 2)}</pre>`;
}

function appendToMessage(msgId, text) {
  const msgDiv = document.getElementById(msgId);
  const textDiv = msgDiv.querySelector('.text-content');

  // Remove cursor temporarily to update text
  const currentHTML = textDiv.innerHTML.replace('<span class="cursor"></span>', '');
  const newHTML = formatMessage(text); // Re-format entire text? Or append?
  // Re-formatting entire text is safer for markdown consistency but slower for huge text.
  // For now, let's re-format.

  textDiv.innerHTML = newHTML + '<span class="cursor"></span>';
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addMessage(content, role) {
  const welcomeMessage = chatContainer.querySelector('.welcome-message');
  if (welcomeMessage) welcomeMessage.remove();

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.innerHTML = role === 'user' ?
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' :
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>';

  const messageContent = document.createElement('div');
  messageContent.className = 'message-content';

  const textDiv = document.createElement('div');
  textDiv.className = 'text-content';
  textDiv.innerHTML = formatMessage(content);
  messageContent.appendChild(textDiv);

  messageDiv.appendChild(avatar);
  messageDiv.appendChild(messageContent);

  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function formatMessage(text) {
  if (!text) return '';

  // Basic markdown formatting
  return text
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
}
