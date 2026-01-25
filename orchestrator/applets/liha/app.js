/**
 * Main LIHA Application Logic
 */

class LIHAApp {
    constructor() {
        this.assignments = [];
        this.selectedId = null;
        this.moodleConfig = {
            baseUrl: 'http://localhost:8085/webservice/mcp/server.php',
            token: 'e03e23c6e7c7b5b8364e878846e9250b'
        };
        this.init();
    }

    async init() {
        await lihaStorage.initPromise;
        this.assignments = await lihaStorage.getAssignments();
        this.render();
        this.setupListeners();
        this.updateSyncTime();
    }

    setupListeners() {
        document.getElementById('btn-sync').addEventListener('click', () => this.syncMoodle());
    }

    async syncMoodle() {
        const btn = document.getElementById('btn-sync');
        btn.innerText = '⌛ Syncing...';
        btn.disabled = true;

        try {
            // Note: In real applet, this would call our @onlyapps/moodle-mcp client
            // For now, we simulate the fetch or use a bridge tool call
            console.log('Syncing assignments from Moodle...');

            // Simulation of fetched data based on Moodle state
            // In final, this will be a real API call via the orchestrator's tool access
            const newAssignments = await this.fetchMoodleAssignments();

            await lihaStorage.saveAssignments(newAssignments);
            this.assignments = newAssignments;
            await lihaStorage.updateLastSync();

            // Sync to calendar
            for (const a of newAssignments) {
                await lihaBridge.syncToCalendar(a, "DSM"); // Hardcoded course for demo
            }

            this.updateSyncTime();
            this.render();
            alert('Moodle Sync Complete! Assignments added to calendar.');
        } catch (error) {
            console.error('Sync failed:', error);
            alert('Failed to sync Moodle. Check console.');
        } finally {
            btn.innerText = '🔄 Sync Moodle';
            btn.disabled = false;
        }
    }

    async fetchMoodleAssignments() {
        // Mocking the behavior of our moodle_mcp client for now 
        // because we can't run the TS client inside the browser 
        // without bundling or an API proxy.
        // In the OnlyApps orchestrator, the 'moodle_mcp' would be an MCP Tool.
        return [
            {
                id: 1,
                name: 'Number Systems Quiz',
                course: 6,
                duedate: Math.floor(Date.now() / 1000) + 86400, // Tomorrow
                intro: 'Quiz covering binary, octal, hex and radix conversions.'
            },
            {
                id: 2,
                name: 'Combinational Logic Mini-Project',
                course: 6,
                duedate: Math.floor(Date.now() / 1000) + 259200, // 3 days
                intro: 'Design a 4-bit adder-subtractor circuit.'
            }
        ];
    }

    async selectAssignment(id) {
        this.selectedId = id;
        const assignment = this.assignments.find(a => a.id === id);
        this.render();

        // Get suggestion
        const suggestion = await lihaStorage.getSuggestion(id);
        if (suggestion) {
            this.renderSuggestion(suggestion.suggestions);
        } else {
            this.fetchSuggestion(assignment);
        }
    }

    async fetchSuggestion(assignment) {
        const section = document.getElementById('roadmap-steps');
        section.innerHTML = '<div class="loading-state">Analyzing lectures via GraphRAG...</div>';

        // Simulation of GraphRAG output based on our backend Python scripts
        setTimeout(async () => {
            let suggestions = [];

            if (assignment.name.includes('Number Systems')) {
                suggestions = [
                    {
                        title: 'Study Number system representations',
                        desc: 'Understand how digits carry value in different bases (radix).',
                        source: 'DSM - Lecture 1 (Pages 4-7)'
                    },
                    {
                        title: 'Master Binary/Octal/Hex conversions',
                        desc: 'Focus on the shortcut method for 2^n bases.',
                        source: 'DSM - Lecture 1 (Pages 8-11)'
                    }
                ];
            } else {
                suggestions = [
                    {
                        title: 'Combinational Logic basics',
                        desc: 'Review basic gates (AND, OR, NOT, XOR) and truth tables.',
                        source: 'DSM - Lecture 2 (Pages 1-5)'
                    }
                ];
            }

            await lihaStorage.saveSuggestion(assignment.id, suggestions);
            this.renderSuggestion(suggestions);
        }, 1500);
    }

    async updateSyncTime() {
        const lastSync = await lihaStorage.getLastSync();
        if (lastSync) {
            const date = new Date(lastSync);
            document.getElementById('sync-info').innerText = `Last synced: ${date.toLocaleTimeString()}`;
        }
    }

    render() {
        // Render assignment list
        const list = document.getElementById('assignment-list');
        document.getElementById('assign-count').innerText = this.assignments.length;

        if (this.assignments.length === 0) {
            list.innerHTML = '<div class="loading-state">No assignments found. Sync with Moodle!</div>';
        } else {
            list.innerHTML = this.assignments.map(a => `
                <div class="assignment-card ${this.selectedId === a.id ? 'active' : ''}" onclick="app.selectAssignment(${a.id})">
                    <div class="card-title">${a.name}</div>
                    <div class="card-meta">
                        <span class="course-code">DSM</span>
                        <span class="deadline ${this.isUrgent(a.duedate) ? 'urgent' : ''}">
                            ${this.formatDate(a.duedate)}
                        </span>
                    </div>
                </div>
            `).join('');
        }

        // Toggle views
        if (this.selectedId) {
            document.getElementById('welcome-view').classList.add('hidden');
            document.getElementById('suggestion-view').classList.remove('hidden');

            const a = this.assignments.find(a => a.id === this.selectedId);
            document.getElementById('selected-title').innerText = a.name;
            document.getElementById('selected-date').innerText = this.formatDate(a.duedate);
        }
    }

    renderSuggestion(suggestions) {
        const steps = document.getElementById('roadmap-steps');
        steps.innerHTML = suggestions.map((s, idx) => `
            <div class="roadmap-step">
                <div class="step-number">${idx + 1}</div>
                <div class="step-content">
                    <h4>${s.title}</h4>
                    <p>${s.desc}</p>
                    <div class="step-source">🔗 Source: ${s.source}</div>
                </div>
            </div>
        `).join('');
    }

    isUrgent(timestamp) {
        const diff = timestamp * 1000 - Date.now();
        return diff < 86400000; // < 24 hours
    }

    formatDate(timestamp) {
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}

const app = new LIHAApp();
window.app = app;
