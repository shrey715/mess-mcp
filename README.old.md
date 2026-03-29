# OnlyApps 🚀

> A unified application platform for IIIT students that brings together multiple campus services into a single, efficient desktop application with powerful inter-process communication and AI-powered features.

**Team:** Rohit Jeswanth, Shreyas Deb, Vishak Kashyap K, Garimella Sai Abhishek  
**Event:** HackIIIT 2026

---

## 📋 Table of Contents

- [The Problem](#-the-problem)
- [Our Solution](#-our-solution)
- [Tech Stack](#-tech-stack)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Applets](#-applets)
- [MCP Servers](#-mcp-servers)
- [Project Structure](#-project-structure)

---

## 🎯 The Problem

Students at IIIT face several day-to-day challenges with existing campus infrastructure:

1. **Fragmented Services**: Multiple websites and platforms (Moodle, Intranet, Mess portal) require constant context-switching and separate logins
2. **Information Overload**: Critical information is scattered across outdated portals, making it difficult to find answers to simple questions
3. **Assignment Tracking Hell**: Moodle assignments stack up, and there's no easy way to track deadlines or plan study time based on available course materials
4. **Mess Management Chaos**: Finding friends for meals, managing mess registrations, and buy/sell transactions are all handled through cluttered WhatsApp groups
5. **Too Many Clicks**: Simple tasks require navigating through multiple pages and forms on dated interfaces

Students waste valuable time navigating these disconnected systems when they should be focusing on learning and building.

---

## 💡 Our Solution

**OnlyApps** is an Electron-based orchestrator that brings all IIIT campus services into one unified desktop application. Think of it as "all your campus apps in one window" - but smarter.

### The OnlyApps Approach:

1. **Unified Interface**: Single desktop app with sidebar navigation between different applets (mini-apps)
2. **Smart Communication Bus**: Custom IPC (Inter-Process Communication) architecture using MessagePorts and SharedArrayBuffer for zero-copy data transfer between applets
3. **AI-Powered Intelligence**: MCP (Model Context Protocol) servers that provide RAG (Retrieval-Augmented Generation) capabilities, grounding AI responses in actual campus data
4. **Memory Efficient**: Auto-hibernation of idle applets to keep performance snappy
5. **Extensible**: Easy-to-build applet system - if something takes too many clicks, there can be an applet for it

---

## 🛠 Tech Stack

### Frontend & Desktop
- **Electron** - Cross-platform desktop application framework
- **React** - UI component library for the orchestrator shell
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **WebContentsView** - Electron's efficient view management

### Backend & Services
- **Node.js/TypeScript** - MCP servers and backend services
- **Python** - PDF processing, vector embeddings, MCP servers
- **FastMCP** - Python MCP server framework
- **Express/Hono** - HTTP servers for MCP endpoints

### AI & Knowledge Base
- **Model Context Protocol (MCP)** - Anthropic's protocol for AI context
- **ChromaDB** - Vector database for embeddings
- **PyMuPDF** - PDF text extraction
- **OpenAI/Gemini APIs** - LLM integration

### Infrastructure
- **Docker & Docker Compose** - Moodle containerization
- **Moodle** - Custom plugin for MCP integration

### Applet-Specific Tech
- **Google Calendar API** - Calendar integration
- **FastAPI/uvicorn** - Python web servers

---

## ✨ Key Features

### 🎨 High-Performance Orchestrator
- **Zero-Copy IPC**: MessagePort-based direct communication between applets bypassing the main process
- **Smart Memory Management**: Automatic hibernation of inactive applets to conserve resources
- **Global Hotkeys**: Ctrl+1-9 for instant applet switching
- **Centralized Caching**: Shared cache store reduces redundant network requests
- **Modern UI**: Beautiful dark theme with smooth animations

### 🤖 AI-Powered Intelligence
- **RAG-Based Knowledge**: MCP servers ground AI responses in actual campus documents and data
- **Context-Aware Responses**: AI understands Moodle courses, assignments, intranet documents, and mess schedules
- **Multi-Source Grounding**: Combines data from Moodle, Intranet, and Mess systems

### 🔌 Three Core MCP Servers

1. **Moodle MCP** (Port 3001)
   - Fetch courses, assignments, and materials
   - PDF processing and chunking
   - Vector embeddings for course content

2. **Intranet MCP** (Port 8001)
   - Knowledge base from intranet documents
   - ChromaDB vector storage
   - Query campus policies, procedures, and information

3. **Mess MCP** (Port 8000)
   - Mess menu and registration data
   - Buy/sell marketplace API

### 📱 Feature-Rich Applets

1. **LIHA (Lord I Hate Assignments)**
   - Monitors Moodle for new assignments
   - Generates study roadmaps from course materials
   - Creates realistic timeframes based on assignment complexity
   - AI-powered assignment planning

2. **Mess Mate**
   - Find friends for meals
   - Simplified mess registration management
   - Built-in buy/sell marketplace (no more WhatsApp spam)
   - Real-time mess availability

3. **EVERBot (Intranet Knowledge Bot)**
   - AI chatbot trained on intranet documents
   - Answers questions about policies, procedures, syllabi
   - Natural language queries for campus information
   - Eliminates hunting through dated websites

4. **Calogg (Calendar Aggregator)**
   - Google Calendar integration
   - Auto-sync assignments from Moodle
   - Event reminders from all applets via the bus
   - Unified view of all campus events

### 🏗 Developer-Friendly
- **Easy Applet Creation**: Simple manifest-based applet system
- **Hot Reload**: Vite-powered development with instant updates
- **Bridge API**: Clean JavaScript API for applet developers
- **Documented**: Comprehensive applet development guide

---

## 🏛 Architecture

```
┌──────────────────────────────────────────────────┐
│              Electron Main Process                │
│  ┌─────────────┐ ┌───────────┐ ┌─────────────┐  │
│  │ ViewManager │ │ IPCRouter │ │ CacheStore  │  │
│  └─────────────┘ └───────────┘ └─────────────┘  │
│         │              │              │          │
│         └──────────────┼──────────────┘          │
│                        │                          │
│  ┌─────────────────────┼─────────────────────┐  │
│  │      MessageChannel Communication         │  │
│  └─────────────────────┼─────────────────────┘  │
└────────────────────────┼─────────────────────────┘
                         │
    ┌────────────────────┼────────────────────┐
    │                    │                    │
┌───▼───┐           ┌────▼────┐          ┌────▼────┐
│Shell  │           │Applet 1 │          │Applet 2 │
│(React)│           │(WebView)│◄────────►│(WebView)│
└───────┘           └─────────┘  Direct  └─────────┘
                                  Pipe

                         ▲
                         │
                    MCP Servers
              ┌──────────┼──────────┐
              │          │          │
         ┌────▼───┐ ┌────▼───┐ ┌───▼────┐
         │ Moodle │ │Intranet│ │  Mess  │
         │  MCP   │ │  MCP   │ │  MCP   │
         └────────┘ └────────┘ └────────┘
```

### Data Flow
1. **User Interaction** → Applet UI
2. **Applet Request** → Bridge API → IPCRouter
3. **MCP Query** → Appropriate MCP Server → Vector DB / External API
4. **Response** → Back through IPCRouter → Applet
5. **Cross-Applet** → Direct MessagePort pipe (zero-copy)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.8+
- **Docker** and Docker Compose
- **Git**

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/hackiiit-2026-flying-fish.git
   cd hackiiit-2026-flying-fish
   ```

2. **Run the automated setup**
   ```bash
   chmod +x start_all.sh
   ./start_all.sh
   ```

   This script will:
   - Start Moodle in Docker containers
   - Launch all three MCP servers (Mess, Intranet, Moodle)
   - Start the applets
   - Launch the Electron orchestrator

3. **Access the application**
   - The Electron app will open automatically
   - MCP servers run on ports 8000, 8001, and 3001
   - Logs are available in `*.log` files

### Manual Setup

If you prefer to start components individually:

#### 1. Start Moodle
```bash
cd moodle/docker
docker compose up -d
cd ../../
```

#### 2. Start MCP Servers

**Mess MCP (Port 8000)**
```bash
cd mcp_servers/mess_mcp
pip install -r requirements.txt
python3 mcp_server.py
```

**Intranet MCP (Port 8001)**
```bash
cd mcp_servers/intranet_mcp
pip install -r requirements.txt
python3 http_server.py
```

**Moodle MCP (Port 3001)**
```bash
cd mcp_servers/moodle_mcp
npm install
npm run start:http
```

#### 3. Start Applets

**Mess Mate**
```bash
cd orchestrator/applets/mess-mate/applet
npm install
npm run dev
```

#### 4. Start Orchestrator
```bash
cd orchestrator
npm install
npm run dev
```

### Configuration

- **Moodle**: Configure connection in `mcp_servers/moodle_mcp/tokens.json`
- **Google Calendar**: Add OAuth credentials for Calogg applet
- **Applets**: Edit `orchestrator/src/applets/manifests.json` to customize applets

---

## 📱 Applets

### LIHA (Lord I Hate Assignments)

**Purpose**: Never miss an assignment deadline again

**Features**:
- Auto-detects new Moodle assignments
- Analyzes course materials (lectures, PDFs)
- Generates personalized study roadmap
- Estimates realistic completion time
- AI-powered complexity analysis

**Tech**: React, Moodle MCP, Vector embeddings, LLM

---

### Mess Mate

**Purpose**: Streamline mess hall experience

**Features**:
- Real-time mess registration status
- Find friends for meals
- Buy/sell marketplace (integrated)
- Menu viewing
- Registration management

**Tech**: React, Vite, Tailwind, Mess MCP API

**Port**: 5174 (dev)

---

### EVERBot

**Purpose**: Your AI-powered campus information assistant

**Features**:
- Natural language queries about campus
- Answers from intranet knowledge base
- Course syllabi lookup
- Policy and procedure information
- Travel reimbursement help

**Tech**: React, Intranet MCP, ChromaDB, RAG

---

### Calogg (Calendar Aggregator)

**Purpose**: All your campus events in one calendar

**Features**:
- Google Calendar sync
- Auto-add Moodle deadlines
- Event aggregation from all applets
- Reminder notifications via IPC bus
- Lecture schedule integration

**Tech**: React, Google Calendar API, Bridge API

---

## 🔌 MCP Servers

### What is MCP?

Model Context Protocol (by Anthropic) standardizes how applications provide context to LLMs. Our MCP servers act as intelligent data sources that ground AI responses in actual campus data.

### Moodle MCP

**Port**: 3001  
**Language**: TypeScript/Node.js + Python

**Capabilities**:
- `getCourses()` - List all user courses
- `getAssignments(courseId)` - Fetch course assignments
- `getCourseMaterials(courseId)` - Download PDFs and materials
- PDF processing and text extraction
- Chunking for vector embeddings

**Files**:
- `src/server.ts` - Main MCP server
- `src/http-server.ts` - HTTP wrapper
- `process_pdfs.py` - PDF text extraction

---

### Intranet MCP

**Port**: 8001  
**Language**: Python

**Capabilities**:
- Vector search over intranet documents
- ChromaDB integration
- Semantic similarity queries
- Document retrieval

**Files**:
- `mcp_server.py` - MCP implementation
- `http_server.py` - HTTP endpoint
- `vector_db/` - ChromaDB storage

---

### Mess MCP

**Port**: 8000  
**Language**: Python (FastMCP)

**Capabilities**:
- Mess menu data
- Registration status
- Buy/sell marketplace API
- Availability queries

**Files**:
- `mcp_server.py` - FastMCP server

---

## 📂 Project Structure

```
hackiiit-2026-flying-fish/
├── orchestrator/              # Electron orchestrator app
│   ├── src/
│   │   ├── main/             # Electron main process
│   │   │   ├── main.js
│   │   │   ├── ViewManager.js
│   │   │   ├── IPCRouter.js
│   │   │   └── CacheStore.js
│   │   └── renderer/         # React UI
│   │       ├── App.jsx
│   │       └── components/
│   └── applets/              # Individual applets
│       ├── manifests.json
│       ├── calendar/         # Calogg
│       ├── chatbot/          # EVERBot
│       ├── liha/             # LIHA
│       └── mess-mate/        # Mess Mate
│
├── mcp_servers/              # MCP server implementations
│   ├── moodle_mcp/          # Moodle knowledge server
│   ├── intranet_mcp/        # Intranet knowledge server
│   └── mess_mcp/            # Mess data server
│
├── moodle/                   # Moodle setup
│   ├── docker/              # Docker compose config
│   └── plugin/              # Custom MCP webservice plugin
│
├── start_all.sh             # One-command startup script
└── README.md                # This file
```

---

## 🎓 Applet Development

Want to build your own applet? Check out [orchestrator/applet-development.md](orchestrator/applet-development.md) for a complete guide.

### Quick Example

1. Create your applet HTML/JS
2. Add to `manifests.json`:
```json
{
  "id": "my-applet",
  "name": "My Applet",
  "url": "http://localhost:3000",
  "icon": "⚡"
}
```
3. Use the Bridge API:
```javascript
// Request data from another applet
const result = await window.bridge.requestPipe('calendar-applet');
window.bridge.sendViaPipe(result.pipeId, { type: 'ADD_EVENT', data: {...} });
```

---

## 🤝 Contributing

This project was built for HackIIIT 2026. Contributions, issues, and feature requests are welcome!

---

## 📝 License

MIT

---

## 🙏 Acknowledgments

- IIIT Hyderabad for the infrastructure and inspiration
- Anthropic for the Model Context Protocol
- The open-source community for amazing tools

---

**Built with ❤️ by the OnlyApps Team**
