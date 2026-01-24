const { MessageChannelMain } = require('electron');

/**
 * IPCRouter - Manages inter-applet communication
 * Implements Hub and Spoke model with MessagePort for direct A2A communication
 * and SharedArrayBuffer for large data transfers
 */
class IPCRouter {
    constructor(viewManager) {
        this.viewManager = viewManager;
        this.pipes = new Map(); // Map<pipeId, { port1, port2, applet1, applet2 }>
        this.sharedBuffers = new Map(); // Map<bufferId, SharedArrayBuffer>
        this.bufferCounter = 0;
    }

    /**
     * Create a direct MessagePort pipe between two applets
     * This bypasses the main process for subsequent messages
     */
    createPipe(fromAppletId, toAppletId) {
        const fromApplet = this.viewManager.views.get(fromAppletId);
        const toApplet = this.viewManager.views.get(toAppletId);

        if (!fromApplet || !toApplet) {
            return { success: false, error: 'One or both applets not found' };
        }

        if (fromApplet.state !== 'active' || toApplet.state !== 'active') {
            return { success: false, error: 'One or both applets are not active' };
        }

        const pipeId = `pipe-${fromAppletId}-${toAppletId}-${Date.now()}`;
        const { port1, port2 } = new MessageChannelMain();

        // Send ports to respective applets
        fromApplet.view.webContents.postMessage('bridge:pipeCreated', {
            pipeId,
            targetAppletId: toAppletId
        }, [port1]);

        toApplet.view.webContents.postMessage('bridge:pipeCreated', {
            pipeId,
            targetAppletId: fromAppletId
        }, [port2]);

        this.pipes.set(pipeId, {
            port1,
            port2,
            applet1: fromAppletId,
            applet2: toAppletId
        });

        console.log(`Pipe created between ${fromAppletId} and ${toAppletId}`);
        return { success: true, pipeId };
    }

    /**
     * Close a pipe between two applets
     */
    closePipe(pipeId) {
        const pipe = this.pipes.get(pipeId);
        if (!pipe) {
            return { success: false, error: 'Pipe not found' };
        }

        pipe.port1.close();
        pipe.port2.close();
        this.pipes.delete(pipeId);

        return { success: true };
    }

    /**
     * Allocate a SharedArrayBuffer for zero-copy large data transfer
     * Returns a buffer ID that applets can use to access the buffer
     */
    allocateSharedBuffer(size) {
        try {
            // Note: SharedArrayBuffer requires cross-origin isolation headers
            // For hackathon, we simulate with a regular buffer approach
            const bufferId = `buffer-${++this.bufferCounter}`;
            const buffer = new SharedArrayBuffer(size);

            this.sharedBuffers.set(bufferId, {
                buffer,
                size,
                createdAt: Date.now(),
                accessors: []
            });

            console.log(`Allocated SharedArrayBuffer ${bufferId} of size ${size}`);
            return { success: true, bufferId, size };
        } catch (error) {
            console.error('Failed to allocate SharedArrayBuffer:', error);

            // Fallback: Use ArrayBuffer if SharedArrayBuffer not available
            const bufferId = `fallback-buffer-${++this.bufferCounter}`;
            const buffer = new ArrayBuffer(size);

            this.sharedBuffers.set(bufferId, {
                buffer,
                size,
                createdAt: Date.now(),
                accessors: [],
                isFallback: true
            });

            return { success: true, bufferId, size, isFallback: true };
        }
    }

    /**
     * Get access to a shared buffer
     */
    getSharedBuffer(bufferId, appletId) {
        const bufferData = this.sharedBuffers.get(bufferId);
        if (!bufferData) {
            return { success: false, error: 'Buffer not found' };
        }

        bufferData.accessors.push(appletId);
        return { success: true, buffer: bufferData.buffer };
    }

    /**
     * Release a shared buffer
     */
    releaseSharedBuffer(bufferId) {
        if (!this.sharedBuffers.has(bufferId)) {
            return { success: false, error: 'Buffer not found' };
        }

        this.sharedBuffers.delete(bufferId);
        console.log(`Released SharedArrayBuffer ${bufferId}`);
        return { success: true };
    }

    /**
     * Broadcast a message to all applets
     */
    broadcast(message, excludeAppletId = null) {
        for (const [id, data] of this.viewManager.views) {
            if (id !== excludeAppletId && data.state === 'active') {
                data.view.webContents.send('bridge:broadcast', message);
            }
        }
    }

    /**
     * Send a message to a specific applet
     */
    sendToApplet(targetAppletId, message) {
        const applet = this.viewManager.views.get(targetAppletId);
        if (!applet || applet.state !== 'active') {
            return { success: false, error: 'Target applet not found or not active' };
        }

        applet.view.webContents.send('bridge:message', message);
        return { success: true };
    }

    /**
     * Get stats about current IPC state
     */
    getStats() {
        return {
            activePipes: this.pipes.size,
            activeBuffers: this.sharedBuffers.size,
            totalBufferSize: Array.from(this.sharedBuffers.values())
                .reduce((sum, b) => sum + b.size, 0)
        };
    }
}

module.exports = IPCRouter;
