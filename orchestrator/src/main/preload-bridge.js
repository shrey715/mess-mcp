const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script for Applets (the "Bridge")
 * Provides standardized API for inter-applet communication
 */

// Store for active MessagePorts
const activePorts = new Map();
const messageHandlers = [];
const broadcastHandlers = [];

// Listen for MessagePort pipe creation from main process
ipcRenderer.on('bridge:pipeCreated', (event, { pipeId, targetAppletId }) => {
    const [port] = event.ports;

    activePorts.set(pipeId, {
        port,
        targetAppletId
    });

    // Set up message listener on the port
    port.onmessage = (msgEvent) => {
        const message = msgEvent.data;
        messageHandlers.forEach(handler => handler(message, targetAppletId));
    };

    port.start();
    console.log(`[Bridge] Pipe ${pipeId} connected to ${targetAppletId}`);
});

// Listen for direct messages from main process
ipcRenderer.on('bridge:message', (event, message) => {
    messageHandlers.forEach(handler => handler(message, 'main'));
});

// Listen for broadcast messages
ipcRenderer.on('bridge:broadcast', (event, message) => {
    broadcastHandlers.forEach(handler => handler(message));
});

/**
 * Expose the Bridge API to the applet
 */
contextBridge.exposeInMainWorld('bridge', {
    /**
     * Request a direct communication pipe to another applet
     * @param {string} targetAppletId - The ID of the applet to connect to
     * @returns {Promise<{success: boolean, pipeId?: string, error?: string}>}
     */
    requestPipe: async (targetAppletId) => {
        // Get current applet ID from partition
        const result = await ipcRenderer.invoke('ipc:createPipe', 'self', targetAppletId);
        return result;
    },

    /**
     * Send a message through a specific pipe
     * @param {string} pipeId - The pipe ID
     * @param {Object} data - The data to send
     */
    sendViaPipe: (pipeId, data) => {
        const pipeData = activePorts.get(pipeId);
        if (!pipeData) {
            console.error(`[Bridge] Pipe ${pipeId} not found`);
            return { success: false, error: 'Pipe not found' };
        }

        const message = {
            timestamp: Date.now(),
            payload: data
        };

        pipeData.port.postMessage(message);
        return { success: true };
    },

    /**
     * Send a message to a specific applet via main process
     * Use this for one-off messages, use pipes for continuous communication
     * @param {string} targetId - Target applet ID
     * @param {Object} data - Data to send
     */
    send: async (targetId, data) => {
        const message = {
            sender: 'self',
            timestamp: Date.now(),
            type: data.type || 'MESSAGE',
            payload: data.payload || data
        };

        // Route through main process
        return ipcRenderer.invoke('ipc:sendToApplet', targetId, message);
    },

    /**
     * Register a handler for incoming messages
     * @param {Function} callback - Handler function (message, senderId) => void
     */
    onReceive: (callback) => {
        messageHandlers.push(callback);

        // Return unsubscribe function
        return () => {
            const index = messageHandlers.indexOf(callback);
            if (index > -1) {
                messageHandlers.splice(index, 1);
            }
        };
    },

    /**
     * Register a handler for broadcast messages
     * @param {Function} callback - Handler function (message) => void
     */
    onBroadcast: (callback) => {
        broadcastHandlers.push(callback);

        return () => {
            const index = broadcastHandlers.indexOf(callback);
            if (index > -1) {
                broadcastHandlers.splice(index, 1);
            }
        };
    },

    /**
     * Request a shared memory buffer for large data transfers
     * @param {number} size - Buffer size in bytes
     * @returns {Promise<{success: boolean, bufferId?: string, error?: string}>}
     */
    allocateBuffer: async (size) => {
        return ipcRenderer.invoke('memory:allocate', size);
    },

    /**
     * Release a shared memory buffer
     * @param {string} bufferId - The buffer ID to release
     */
    releaseBuffer: async (bufferId) => {
        return ipcRenderer.invoke('memory:release', bufferId);
    },

    /**
     * Get list of active pipes
     */
    getActivePipes: () => {
        return Array.from(activePorts.entries()).map(([pipeId, data]) => ({
            pipeId,
            targetAppletId: data.targetAppletId
        }));
    },

    /**
     * Close a specific pipe
     * @param {string} pipeId - The pipe ID to close
     */
    closePipe: (pipeId) => {
        const pipeData = activePorts.get(pipeId);
        if (pipeData) {
            pipeData.port.close();
            activePorts.delete(pipeId);
        }
    }
});

/**
 * Also expose some utility functions
 */
contextBridge.exposeInMainWorld('bridgeUtils', {
    /**
     * Create a typed array view for SharedArrayBuffer operations
     * @param {SharedArrayBuffer} buffer - The buffer
     * @param {string} type - 'int32' | 'float64' | 'uint8'
     */
    createView: (buffer, type = 'uint8') => {
        switch (type) {
            case 'int32':
                return new Int32Array(buffer);
            case 'float64':
                return new Float64Array(buffer);
            case 'uint8':
            default:
                return new Uint8Array(buffer);
        }
    },

    /**
     * Standard message types for the event schema
     */
    MessageTypes: {
        CALENDAR_EVENT: 'CALENDAR_EVENT',
        DOC_SHARE: 'DOC_SHARE',
        NOTIFICATION: 'NOTIFICATION',
        SYNC_REQUEST: 'SYNC_REQUEST',
        SYNC_RESPONSE: 'SYNC_RESPONSE',
        CUSTOM: 'CUSTOM'
    }
});
