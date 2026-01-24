# Ferdium-like Orchestrator

A high-performance applet orchestrator built with Electron, React, and Tailwind CSS. This application allows you to manage multiple web apps in a single window with efficient inter-process communication and memory management.

## Features

- 🚀 **High Performance IPC** - MessagePort for direct applet-to-applet communication
- 💾 **Zero-Copy Data Transfer** - SharedArrayBuffer support for large data
- 💤 **Smart Hibernation** - Auto-hibernate idle applets to save memory
- ⌨️ **Global Hotkeys** - Ctrl+1-9 for instant applet switching
- 🎨 **Modern UI** - Beautiful dark theme with smooth animations
- 📦 **Centralized Cache** - Shared caching to reduce network requests

## Architecture

```
┌──────────────────────────────────────────────────┐
│                   Main Process                    │
│  ┌─────────────┐ ┌───────────┐ ┌─────────────┐  │
│  │ ViewManager │ │ IPCRouter │ │ CacheStore  │  │
│  └─────────────┘ └───────────┘ └─────────────┘  │
│         │              │              │          │
│         └──────────────┼──────────────┘          │
│                        │                          │
│  ┌─────────────────────┼─────────────────────┐  │
│  │          MessageChannel Fabric            │  │
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
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
cd ferdium-orchestrator
npm install
```

### Development

```bash
npm run dev
```

This will start both the Vite dev server (for React hot reload) and Electron.

### Build

```bash
npm run build
```

## Project Structure

```
src/
├── main/                    # Electron Main Process
│   ├── main.js             # Entry point
│   ├── ViewManager.js      # WebContentsView lifecycle
│   ├── IPCRouter.js        # MessagePort & SharedArrayBuffer
│   ├── CacheStore.js       # Centralized caching
│   ├── preload-shell.js    # Shell preload script
│   └── preload-bridge.js   # Applet bridge API
├── renderer/               # React Renderer
│   ├── App.jsx             # Main app component
│   ├── index.css           # Global styles
│   └── components/
│       ├── Header.jsx      # Title bar & controls
│       ├── Sidebar.jsx     # Applet switcher
│       ├── AddAppletModal.jsx
│       └── EmptyState.jsx
└── applets/
    └── manifests.json      # Default applet configs
```

## Bridge API (for Applets)

Applets have access to `window.bridge` for inter-applet communication:

```javascript
// Request a direct pipe to another applet
const result = await window.bridge.requestPipe('calendar-applet');

// Send data through the pipe (bypasses main process)
window.bridge.sendViaPipe(result.pipeId, { type: 'SYNC', data: {...} });

// Listen for incoming messages
window.bridge.onReceive((message, senderId) => {
  console.log('Received from', senderId, message);
});

// Allocate shared memory for large data
const buffer = await window.bridge.allocateBuffer(1024 * 1024); // 1MB
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+1-9` | Switch to applet 1-9 |
| `Ctrl+B` | Toggle sidebar |

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT
