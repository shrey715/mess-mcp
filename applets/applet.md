# Applet Development Guide

This guide explains how to build applets that integrate with the Ferdium-like Orchestrator using the provided `window.bridge` API.

## Architecture Overview

The Orchestrator uses a "Hub and Spoke" model. The Main Process acts as the router for discovery, while heavy data and frequent messages use direct pipes (`MessagePort`) between applets for maximum performance.

## The Bridge API (`window.bridge`)

Every applet is injected with a `window.bridge` object. This is your interface to the shell and other applets.

### 1. Messaging (Small Data)

Used for events, status updates, or small JSON payloads.

#### Sending a message
```javascript
// Sends a message to a specific applet via the Main process router
await window.bridge.send('target-applet-id', {
  type: 'CUSTOM_EVENT',
  payload: { key: 'value' }
});
```

#### Receiving messages
```javascript
// Listen for messages from ANY applet or the main process
const unsubscribe = window.bridge.onReceive((message, senderId) => {
  console.log(`Received ${message.type} from ${senderId}`, message.payload);
});

// To stop listening later
unsubscribe();
```

---

### 2. High-Performance Pipes (`MessagePort`)

For frequent communication (e.g., syncing cursors, real-time data), you should request a direct "Pipe". This bypasses the Main process entirely after setup.

#### Setting up a Pipe
```javascript
// 1. Request a pipe to another applet
const result = await window.bridge.requestPipe('receiver-demo');

if (result.success) {
  // 2. Send data directly through the high-speed port
  window.bridge.sendViaPipe(result.pipeId, { 
    realtimeData: [1, 2, 3] 
  });
}
```

---

### 3. Shared Memory (`SharedArrayBuffer`)

For massive data transfers (large JSON files, document buffers), use the Shared Memory API to avoid any serialization overhead.

#### Allocating and Using Buffer
```javascript
// 1. Allocate a 1MB buffer
const { bufferId, size } = await window.bridge.allocateBuffer(1024 * 1024);

// 2. Access it using TypedArrays (via bridgeUtils)
const view = window.bridgeUtils.createView(buffer, 'uint8');
view[0] = 255; // Write data

// 3. Send the bufferId to another applet
window.bridge.send('target-id', { type: 'BUFFER_READY', payload: { bufferId } });
```

---

## Standard Event Schema

We recommend following this schema for consistency:

```typescript
{
  sender: string;       // ID of the sending applet
  timestamp: number;     // Unix timestamp (ms)
  type: string;         // Event type (e.g., 'CALENDAR_EVENT')
  payload: any;         // The actual data
}
```

Pre-defined types in `window.bridgeUtils.MessageTypes`:
- `CALENDAR_EVENT`
- `DOC_SHARE`
- `NOTIFICATION`
- `SYNC_REQUEST` / `SYNC_RESPONSE`

## Deployment

To test your applet:
1. Host your applet on a local server (e.g., `http://localhost:3000`).
2. In the Orchestrator, click **Add Applet**.
3. Go to **Custom URL** and enter your server URL.
4. The Orchestrator will automatically inject the Bridge API.