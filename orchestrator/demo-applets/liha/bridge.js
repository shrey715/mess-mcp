/**
 * IPC Bridge for LIHA Applet
 * Syncs assignments to the Calendar applet
 */

class LIHABridge {
    constructor() {
        this.init();
    }

    init() {
        if (typeof window !== 'undefined' && window.bridge) {
            console.log('LIHA Bridge: Connected to orchestrator');
        }
    }

    /**
     * Send assignment to Calendar applet
     */
    async syncToCalendar(assignment, courseName) {
        if (!window.bridge) return;

        const event = {
            id: `moodle-assign-${assignment.id}`,
            title: `${courseName}: ${assignment.name}`,
            start: assignment.duedate * 1000,
            duration: 60, // 1 hour for deadline
            description: assignment.intro || 'Moodle Assignment Deadline',
            location: 'Moodle LMS',
            courseId: assignment.course
        };

        window.bridge.broadcast({
            type: 'CALENDAR_EVENT',
            payload: event
        });

        console.log(`LIHA: Synced ${assignment.name} to calendar`);
    }

    /**
     * Request a study suggestion via MCP
     * This calls the backend Python scripts
     */
    async getStudySuggestion(assignmentId, text) {
        // In a real Electron app, this would use a bridge call to fire a tool execution
        // For the demo, we'll simulate a tool call or fetch from a local API
        return null;
    }
}

const lihaBridge = new LIHABridge();
