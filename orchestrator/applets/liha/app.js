/**
 * LIHA - Lord I Hate Assignments
 * Main Application Logic
 */

class LIHAApp {
    constructor() {
        this.assignments = [];
        this.courses = [];
        this.selectedId = null;
        this.settings = lihaStorage.getSettings();

        // UI references
        this.els = {
            settingsModal: document.getElementById('settings-modal'),
            modalMoodleUrl: document.getElementById('setting-moodle-url'),
            modalToken: document.getElementById('setting-token'),
            modalMcpUrl: document.getElementById('setting-mcp-url'),
            statusDot: document.getElementById('status-dot'),
            statusText: document.getElementById('status-text')
        };

        this.init();
    }

    async init() {
        await lihaStorage.initPromise;
        this.assignments = await lihaStorage.getAssignments();

        this.setupListeners();
        this.updateSyncTime();
        this.checkConnection();
        this.render();
    }

    setupListeners() {
        // Main buttons
        document.getElementById('btn-sync').addEventListener('click', () => this.syncMoodle());

        // Settings Modal
        document.getElementById('btn-settings').addEventListener('click', () => this.openSettings());
        document.getElementById('btn-close-settings').addEventListener('click', () => this.closeSettings());
        document.getElementById('btn-save-settings').addEventListener('click', () => this.saveSettings());
    }

    openSettings() {
        this.settings = lihaStorage.getSettings();
        this.els.modalMoodleUrl.value = this.settings.moodleUrl;
        this.els.modalToken.value = this.settings.token;
        this.els.modalMcpUrl.value = this.settings.mcpUrl;
        this.els.settingsModal.classList.remove('hidden');
    }

    closeSettings() {
        this.els.settingsModal.classList.add('hidden');
    }

    saveSettings() {
        const newSettings = {
            moodleUrl: this.els.modalMoodleUrl.value.replace(/\/$/, ''),
            token: this.els.modalToken.value,
            mcpUrl: this.els.modalMcpUrl.value.replace(/\/$/, '')
        };
        lihaStorage.saveSettings(newSettings);
        this.settings = newSettings;
        this.closeSettings();
        this.showNotification('Settings saved!', 'success');
        this.checkConnection();
    }

    async checkConnection() {
        try {
            // Simple ping to see if Moodle is reachable (requires CORS or proxy usually, but we try)
            // Or trigger a lightweight fetch
            this.setConnectionStatus('checking');
            // Check roles via MCP as a proxy check
            try {
                const response = await fetch(`${this.settings.mcpUrl}/roles`);
                if (response.ok) {
                    this.setConnectionStatus('online');
                } else {
                    this.setConnectionStatus('offline');
                }
            } catch (e) {
                // If MCP fails, assume offline or direct connect needed
                this.setConnectionStatus('offline');
            }
        } catch (e) {
            this.setConnectionStatus('offline');
        }
    }

    setConnectionStatus(status) {
        const dot = this.els.statusDot;
        const text = this.els.statusText;

        dot.className = 'status-dot';
        if (status === 'online') {
            dot.classList.add('online');
            text.textContent = 'Connected';
        } else if (status === 'checking') {
            dot.style.backgroundColor = 'yellow';
            text.textContent = 'Checking...';
        } else {
            dot.classList.add('offline');
            text.textContent = 'Disconnected';
        }
    }

    async syncMoodle() {
        const btn = document.getElementById('btn-sync');
        const originalText = btn.innerHTML;
        btn.innerHTML = '⏳ Syncing...';
        btn.disabled = true;

        try {
            let courses, assignments;

            // 1. Try MCP first
            try {
                console.log('Attempting MCP sync...');
                courses = await this.fetchFromMCP('/api/courses');
                const courseIds = courses.map(c => c.id);
                assignments = await this.fetchFromMCP('/api/assignments', { courseIds });
            } catch (mcpError) {
                console.warn('MCP failed, trying direct Moodle API...', mcpError);
                // 2. Fallback to Direct Moodle API
                courses = await this.fetchCoursesDirectly();
                const courseIds = courses.map(c => c.id);
                assignments = await this.fetchAssignmentsDirectly(courseIds);
            }

            // Process data
            const now = Math.floor(Date.now() / 1000);
            const pending = assignments
                .filter(a => a.duedate > now)
                .map(a => ({
                    id: a.id,
                    name: a.name,
                    course: a.cmid || a.course,
                    courseName: a.courseName || a.courseShortname || 'Course',
                    duedate: a.duedate,
                    intro: a.intro || ''
                }));

            // Save
            await lihaStorage.saveAssignments(pending);
            this.assignments = pending;
            await lihaStorage.updateLastSync();

            // Notify
            this.showNotification(`Synced ${pending.length} assignments`, 'success');
            this.setConnectionStatus('online');
            this.render();
            this.updateSyncTime();

            // Sync to Calendar Bridge
            for (const a of pending) {
                if (window.lihaBridge) window.lihaBridge.syncToCalendar(a, a.courseName);
            }

        } catch (error) {
            console.error(error);
            this.showNotification(`Sync Failed: ${error.message}`, 'error');
            this.setConnectionStatus('offline');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    // ... API Helpers ...
    async fetchFromMCP(endpoint, body = null) {
        const options = body ? {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        } : {};
        const res = await fetch(`${this.settings.mcpUrl}${endpoint}`, options);
        if (!res.ok) throw new Error(`MCP Error ${res.status}`);
        return res.json();
    }

    async fetchCoursesDirectly() {
        const { moodleUrl, token } = this.settings;
        const url = `${moodleUrl}/webservice/rest/server.php`;

        // Get Site Info for User ID
        const infoParams = new URLSearchParams({
            wstoken: token,
            wsfunction: 'core_webservice_get_site_info',
            moodlewsrestformat: 'json'
        });
        const infoRes = await fetch(`${url}?${infoParams}`);
        const info = await infoRes.json();
        if (info.exception) throw new Error(info.message);

        // Get Courses
        const coursesParams = new URLSearchParams({
            wstoken: token,
            wsfunction: 'core_enrol_get_users_courses',
            moodlewsrestformat: 'json',
            userid: info.userid
        });
        const coursesRes = await fetch(`${url}?${coursesParams}`);
        const courses = await coursesRes.json();
        if (courses.exception) throw new Error(courses.message);

        return courses;
    }

    async fetchAssignmentsDirectly(courseIds) {
        const { moodleUrl, token } = this.settings;
        const url = `${moodleUrl}/webservice/rest/server.php`;

        const params = new URLSearchParams({
            wstoken: token,
            wsfunction: 'mod_assign_get_assignments',
            moodlewsrestformat: 'json'
        });
        courseIds.forEach((id, i) => params.append(`courseids[${i}]`, id));

        const res = await fetch(`${url}?${params}`);
        const data = await res.json();
        if (data.exception) throw new Error(data.message);

        const assignments = [];
        for (const course of (data.courses || [])) {
            for (const assign of (course.assignments || [])) {
                assignments.push({
                    ...assign,
                    courseName: course.shortname || course.fullname
                });
            }
        }
        return assignments;
    }

    // UI Rendering
    render() {
        const list = document.getElementById('assignment-list');
        document.getElementById('assign-count').textContent = this.assignments.length;

        if (this.assignments.length === 0) {
            list.innerHTML = '<div class="empty-message" style="text-align:center; opacity:0.6; margin-top:2rem;">🎉 No pending assignments!</div>';
            return;
        }

        list.innerHTML = this.assignments.map(a => `
            <div class="assignment-card ${this.selectedId === a.id ? 'active' : ''}" 
                 onclick="app.selectAssignment(${a.id})">
                <div class="card-title">${this.escapeHtml(a.name)}</div>
                <div class="card-meta">
                    <span class="course-code">${this.escapeHtml(a.courseName)}</span>
                    <span class="deadline ${this.isUrgent(a.duedate) ? 'urgent' : ''}">
                        ${this.formatDate(a.duedate)}
                    </span>
                </div>
            </div>
        `).join('');

        this.renderDetailView();
    }

    renderDetailView() {
        const welcome = document.getElementById('welcome-view');
        const detail = document.getElementById('suggestion-view');

        if (!this.selectedId) {
            welcome.classList.remove('hidden');
            detail.classList.add('hidden');
            return;
        }

        welcome.classList.add('hidden');
        detail.classList.remove('hidden');

        const item = this.assignments.find(a => a.id === this.selectedId);
        if (item) {
            document.getElementById('selected-title').textContent = item.name;
            document.getElementById('selected-date').textContent = this.formatDate(item.duedate);
            document.getElementById('selected-course').textContent = item.courseName;
        }
    }

    async selectAssignment(id) {
        this.selectedId = id;
        this.render();

        // Fetch/Load suggestions
        const suggestion = await lihaStorage.getSuggestion(id);
        if (suggestion) {
            this.renderSuggestion(suggestion.suggestions);
        } else {
            this.fetchSuggestion(this.assignments.find(a => a.id === id));
        }
    }

    async fetchSuggestion(assignment) {
        const steps = document.getElementById('roadmap-steps');
        steps.innerHTML = '<div class="loading-state">🔍 Analyzing course materials...</div>';

        try {
            // Try MCP GraphRAG
            const res = await fetch(`${this.settings.mcpUrl}/api/graphrag`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: `How do I solve: ${assignment.name}` })
            });

            if (res.ok) {
                const data = await res.json();
                const suggestions = data.suggestions || [];
                await lihaStorage.saveSuggestion(assignment.id, suggestions);
                this.renderSuggestion(suggestions);
                return;
            }
        } catch (e) {
            console.log('GraphRAG unavailable');
        }

        // Fallback simulation
        setTimeout(async () => {
            const suggestions = [{
                title: 'Review Lecture Slides',
                desc: `Check the modules related to ${assignment.name}`,
                source: 'Week 3 Materials'
            }];
            await lihaStorage.saveSuggestion(assignment.id, suggestions);
            this.renderSuggestion(suggestions);
        }, 1200);
    }

    renderSuggestion(suggestions) {
        const steps = document.getElementById('roadmap-steps');
        if (!suggestions || !suggestions.length) {
            steps.innerHTML = '<div>No specific suggestions found.</div>';
            return;
        }
        steps.innerHTML = suggestions.map((s, i) => `
            <div class="roadmap-step">
                <div class="step-number">${i + 1}</div>
                <div class="step-content">
                    <h4>${this.escapeHtml(s.title)}</h4>
                    <p>${this.escapeHtml(s.desc)}</p>
                    <div class="step-source">📚 ${this.escapeHtml(s.source || 'General')}</div>
                </div>
            </div>
        `).join('');
    }

    // Utils
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    isUrgent(ts) {
        return (ts * 1000 - Date.now()) < 86400000;
    }

    formatDate(ts) {
        const date = new Date(ts * 1000);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    updateSyncTime() {
        lihaStorage.getLastSync().then(ts => {
            if (ts) document.getElementById('sync-info').innerText = `Synced: ${new Date(parseInt(ts)).toLocaleTimeString()}`;
        });
    }

    showNotification(msg, type) {
        const note = document.createElement('div');
        note.className = `notification ${type}`;
        note.style.position = 'fixed';
        note.style.bottom = '20px';
        note.style.right = '20px';
        note.style.background = type === 'success' ? '#10b981' : '#ef4444';
        note.style.color = 'white';
        note.style.padding = '10px 20px';
        note.style.borderRadius = '8px';
        note.style.boxShadow = '0 4px 6px rgba(0,0,0,0.2)';
        note.innerText = msg;
        document.body.appendChild(note);
        setTimeout(() => note.remove(), 3000);
    }
}

const app = new LIHAApp();
window.app = app;
