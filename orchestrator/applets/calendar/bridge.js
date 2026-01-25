/**
 * IPC Bridge Integration for Calendar Applet
 * Listens for calendar events from other applets via the orchestrator's IPC system
 */

class CalendarBridge {
    constructor() {
        this.listeners = [];
        this.init();
    }

    init() {
        // Check if we're running inside the orchestrator with bridge API
        if (typeof window !== 'undefined' && window.bridge) {
            console.log('Calendar Bridge: Connected to orchestrator IPC');
            this.setupListeners();
        } else {
            console.log('Calendar Bridge: Running standalone (no IPC available)');
        }
    }

    setupListeners() {
        // Listen for direct messages
        window.bridge.onReceive(async (message, senderId) => {
            console.log('Calendar received message:', message, 'from:', senderId);
            await this.handleMessage(message, senderId);
        });

        // Listen for broadcasts
        window.bridge.onBroadcast(async (message) => {
            console.log('Calendar received broadcast:', message);
            await this.handleMessage(message, 'broadcast');
        });
    }

    async handleMessage(message, senderId) {
        // Handle calendar-specific message types
        switch (message.type) {
            case 'CALENDAR_EVENT':
                await this.addEvent(message.payload, senderId);
                break;

            case 'CALENDAR_EVENTS':
                // Batch add multiple events
                for (const event of message.payload.events) {
                    await this.addEvent(event, senderId);
                }
                break;

            case 'REMOVE_EVENT':
                await this.removeEvent(message.payload.eventId);
                break;

            case 'SYNC_REQUEST':
                await this.handleSyncRequest(senderId);
                break;

            default:
                console.log('Calendar: Unknown message type:', message.type);
        }
    }

    async addEvent(eventData, senderId) {
        // Normalize the incoming event
        const event = {
            id: eventData.id || `ipc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: eventData.title || 'Untitled Event',
            start: eventData.start || eventData.date || Date.now(),
            end: eventData.end || (eventData.start || Date.now()) + (eventData.duration || 60) * 60000,
            source: 'ipc',
            color: '#22c55e',
            description: eventData.description || '',
            location: eventData.location || '',
            allDay: eventData.allDay || false,
            addedBy: senderId,
            addedAt: Date.now()
        };

        // Handle string dates
        if (typeof event.start === 'string') {
            event.start = new Date(event.start).getTime();
        }
        if (typeof event.end === 'string') {
            event.end = new Date(event.end).getTime();
        }

        // Save to storage
        await storage.saveEvent(event);
        console.log('Calendar: Added IPC event:', event.title);

        // Notify UI listeners
        this.notifyListeners('eventAdded', event);

        // Show toast notification
        this.showNotification(`New event from ${senderId}: ${event.title}`);

        return event;
    }

    async removeEvent(eventId) {
        await storage.deleteEvent(eventId);
        this.notifyListeners('eventRemoved', { id: eventId });
    }

    async handleSyncRequest(senderId) {
        // Send back all our events
        const events = await storage.getAllEvents();

        if (window.bridge) {
            window.bridge.send(senderId, {
                type: 'SYNC_RESPONSE',
                payload: { events }
            });
        }
    }

    // Listener management for UI updates
    addListener(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    notifyListeners(eventType, data) {
        this.listeners.forEach(callback => {
            try {
                callback(eventType, data);
            } catch (error) {
                console.error('Listener error:', error);
            }
        });
    }

    showNotification(message) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'ipc-indicator';
        toast.innerHTML = `📅 ${message}`;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100px)';
            toast.style.transition = 'all 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Method to manually trigger a test event (for development)
    async addTestEvent() {
        const testEvent = {
            title: 'Test IPC Event',
            start: Date.now() + 3600000, // 1 hour from now
            duration: 30,
            description: 'This is a test event added via IPC'
        };
        return this.addEvent(testEvent, 'test');
    }

    /**
     * Fetch and sync assignment deadlines from Moodle MCP server
     * @param {number[]} courseIds - Optional array of course IDs to sync
     * @returns {Promise<{success: boolean, count: number, events: any[]}>}
     */
    async syncMoodleAssignments(courseIds = []) {
        const MCP_SERVER_URL = 'http://localhost:3001';
        
        try {
            console.log('Calendar: Syncing Moodle assignments...');
            
            const response = await fetch(`${MCP_SERVER_URL}/api/sync-to-calendar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ courseIds })
            });
            
            if (!response.ok) {
                throw new Error(`MCP server error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Add each event to calendar storage
            for (const event of data.events) {
                await this.addEvent({
                    ...event,
                    color: '#ef4444' // Red for assignment deadlines
                }, 'moodle-mcp');
            }
            
            console.log(`Calendar: Synced ${data.count} Moodle assignment(s)`);
            this.showNotification(`Synced ${data.count} assignment deadline(s) from Moodle`);
            
            return {
                success: true,
                count: data.count,
                events: data.events
            };
        } catch (error) {
            console.error('Failed to sync Moodle assignments:', error);
            this.showNotification(`Sync failed: ${error.message}`);
            return {
                success: false,
                count: 0,
                events: [],
                error: error.message
            };
        }
    }

    /**
     * Get pending calendar events from MCP server without adding them
     * @returns {Promise<{count: number, events: any[]}>}
     */
    async getMoodleCalendarEvents() {
        const MCP_SERVER_URL = 'http://localhost:3001';
        
        try {
            const response = await fetch(`${MCP_SERVER_URL}/api/calendar-events`);
            if (!response.ok) throw new Error(`MCP server error: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Failed to get Moodle calendar events:', error);
            return { count: 0, events: [] };
        }
    }
}

// Global instance
const calendarBridge = new CalendarBridge();
