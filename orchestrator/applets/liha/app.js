/**
 * LIHA - Lord I Hate Assignments
 * Main Application Logic with MCP HTTP Server integration and role switching
 */

class LIHAApp {
    constructor() {
        this.assignments = [];
        this.courses = [];
        this.selectedId = null;
        this.currentRole = null;
        this.availableRoles = [];

        // MCP HTTP Server config
        this.mcpServerUrl = 'http://localhost:3001';
        this.moodleUrl = 'http://localhost:8085';

        this.init();
    }

    async init() {
        await lihaStorage.initPromise;
        this.assignments = await lihaStorage.getAssignments();

        // Load roles from MCP server
        await this.loadRoles();

        this.render();
        this.setupListeners();
        this.updateSyncTime();
        this.updateFooter();
    }

    updateFooter() {
        const moodleInfo = document.getElementById('moodle-info');
        if (moodleInfo) {
            moodleInfo.textContent = `Moodle: ${this.moodleUrl}`;
        }
    }

    async loadRoles() {
        try {
            const response = await fetch(`${this.mcpServerUrl}/roles`);
            if (response.ok) {
                const data = await response.json();
                this.availableRoles = data.roles;
                this.currentRole = data.currentRole;
                this.renderRoleSwitcher();
            }
        } catch (error) {
            console.log('MCP server not available, using direct Moodle API');
            // Fallback mode - hide role switcher
            const switcher = document.getElementById('role-switcher');
            if (switcher) switcher.style.display = 'none';
        }
    }

    renderRoleSwitcher() {
        const container = document.getElementById('role-switcher');
        if (!container || this.availableRoles.length === 0) return;

        const currentRoleData = this.availableRoles.find(r => r.id === this.currentRole);

        container.innerHTML = `
            <select id="role-select" class="role-select">
                ${this.availableRoles.map(role => `
                    <option value="${role.id}" ${role.id === this.currentRole ? 'selected' : ''}>
                        ${role.name}
                    </option>
                `).join('')}
            </select>
            <span class="role-label">Role</span>
        `;

        document.getElementById('role-select').addEventListener('change', (e) => {
            this.switchRole(e.target.value);
        });
    }

    async switchRole(roleId) {
        try {
            const response = await fetch(`${this.mcpServerUrl}/switch-role`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: roleId })
            });

            if (response.ok) {
                const data = await response.json();
                this.currentRole = data.role;
                this.showNotification(`Switched to ${data.name}`, 'success');

                // Clear cached data and re-sync
                this.assignments = [];
                await lihaStorage.saveAssignments([]);
                this.render();
            }
        } catch (error) {
            this.showNotification('Failed to switch role', 'error');
        }
    }

    setupListeners() {
        document.getElementById('btn-sync').addEventListener('click', () => this.syncMoodle());
    }

    async syncMoodle() {
        const btn = document.getElementById('btn-sync');
        const statusText = document.getElementById('status-text');
        btn.innerHTML = '⏳ Syncing...';
        btn.disabled = true;
        statusText.textContent = 'Syncing...';

        try {
            let courses, assignments;

            // Try MCP server first, fallback to direct API
            try {
                courses = await this.fetchFromMCP('/api/courses');
                const courseIds = courses.map(c => c.id);
                assignments = await this.fetchFromMCP('/api/assignments', { courseIds });
            } catch (mcpError) {
                console.log('MCP server unavailable, using direct Moodle API');
                courses = await this.fetchCoursesDirectly();
                const courseIds = courses.map(c => c.id);
                assignments = await this.fetchAssignmentsDirectly(courseIds);
            }

            this.courses = courses;

            // Filter to pending assignments only
            const now = Math.floor(Date.now() / 1000);
            const pendingAssignments = assignments
                .filter(a => a.duedate > now)
                .map(a => ({
                    id: a.id,
                    name: a.name,
                    course: a.cmid || a.course,
                    courseName: a.courseName || a.courseShortname || 'Course',
                    duedate: a.duedate,
                    intro: a.intro || ''
                }));

            await lihaStorage.saveAssignments(pendingAssignments);
            this.assignments = pendingAssignments;
            await lihaStorage.updateLastSync();

            // Sync to calendar
            for (const a of pendingAssignments) {
                await lihaBridge.syncToCalendar(a, a.courseName);
            }

            this.updateSyncTime();
            this.render();
            statusText.textContent = 'Connected';

            if (pendingAssignments.length > 0) {
                this.showNotification(`Synced ${pendingAssignments.length} assignment(s)!`, 'success');
            } else {
                this.showNotification('No pending assignments found.', 'info');
            }
        } catch (error) {
            console.error('Sync failed:', error);
            statusText.textContent = 'Error';
            this.showNotification(`Sync failed: ${error.message}`, 'error');
        } finally {
            btn.innerHTML = '🔄 Sync Moodle';
            btn.disabled = false;
        }
    }

    async fetchFromMCP(endpoint, body = null) {
        const options = body ? {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        } : {};

        const response = await fetch(`${this.mcpServerUrl}${endpoint}`, options);
        if (!response.ok) throw new Error(`MCP Error: ${response.status}`);
        return response.json();
    }

    async fetchCoursesDirectly() {
        const url = `${this.moodleUrl}/webservice/rest/server.php`;
        const token = '6e46f93f5f12b5bf476e7f2b8e7d6ba3'; // Default admin token

        // Get site info to get user id
        const siteInfoParams = new URLSearchParams({
            wstoken: token,
            wsfunction: 'core_webservice_get_site_info',
            moodlewsrestformat: 'json'
        });

        const siteResponse = await fetch(`${url}?${siteInfoParams}`);
        const siteInfo = await siteResponse.json();

        if (siteInfo.exception) throw new Error(siteInfo.message);

        const coursesParams = new URLSearchParams({
            wstoken: token,
            wsfunction: 'core_enrol_get_users_courses',
            moodlewsrestformat: 'json',
            userid: siteInfo.userid
        });

        const response = await fetch(`${url}?${coursesParams}`);
        const data = await response.json();

        if (data.exception) throw new Error(data.message);
        return data;
    }

    async fetchAssignmentsDirectly(courseIds) {
        const url = `${this.moodleUrl}/webservice/rest/server.php`;
        const token = '6e46f93f5f12b5bf476e7f2b8e7d6ba3';

        const params = new URLSearchParams({
            wstoken: token,
            wsfunction: 'mod_assign_get_assignments',
            moodlewsrestformat: 'json'
        });

        courseIds.forEach((id, idx) => {
            params.append(`courseids[${idx}]`, id);
        });

        const response = await fetch(`${url}?${params}`);
        const data = await response.json();

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

    showNotification(message, type = 'info') {
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">×</button>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
    }

    async selectAssignment(id) {
        this.selectedId = id;
        const assignment = this.assignments.find(a => a.id === id);
        this.render();

        const suggestion = await lihaStorage.getSuggestion(id);
        if (suggestion) {
            this.renderSuggestion(suggestion.suggestions);
        } else {
            this.fetchSuggestion(assignment);
        }
    }

    async fetchSuggestion(assignment) {
        const section = document.getElementById('roadmap-steps');
        section.innerHTML = '<div class="loading-state">🔍 Analyzing lectures via GraphRAG...</div>';

        try {
            // Try to call MCP server's graphrag endpoint
            const response = await fetch(`${this.mcpServerUrl}/api/graphrag`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: assignment.name })
            });

            if (response.ok) {
                const data = await response.json();
                await lihaStorage.saveSuggestion(assignment.id, data.suggestions || []);
                this.renderSuggestion(data.suggestions || []);
                return;
            }
        } catch (error) {
            console.log('GraphRAG not available, using placeholder');
        }

        // Fallback suggestions
        setTimeout(async () => {
            const suggestions = [{
                title: 'Review relevant lecture materials',
                desc: `Study the concepts related to "${assignment.name}"`,
                source: `${assignment.courseName || 'Course'} - Uploaded Lectures`
            }];
            await lihaStorage.saveSuggestion(assignment.id, suggestions);
            this.renderSuggestion(suggestions);
        }, 1000);
    }

    async updateSyncTime() {
        const lastSync = await lihaStorage.getLastSync();
        const syncInfo = document.getElementById('sync-info');
        if (lastSync && syncInfo) {
            const date = new Date(lastSync);
            syncInfo.textContent = `Last synced: ${date.toLocaleString()}`;
        }
    }

    render() {
        const list = document.getElementById('assignment-list');
        const countBadge = document.getElementById('assign-count');

        countBadge.textContent = this.assignments.length;

        if (this.assignments.length === 0) {
            list.innerHTML = '<div class="empty-message">No assignments found.<br>Click "Sync Moodle" to fetch.</div>';
        } else {
            list.innerHTML = this.assignments.map(a => `
                <div class="assignment-card ${this.selectedId === a.id ? 'active' : ''}" 
                     onclick="app.selectAssignment(${a.id})">
                    <div class="card-title">${this.escapeHtml(a.name)}</div>
                    <div class="card-meta">
                        <span class="course-code">${this.escapeHtml(a.courseName || 'Course')}</span>
                        <span class="deadline ${this.isUrgent(a.duedate) ? 'urgent' : ''}">
                            ${this.formatDate(a.duedate)}
                        </span>
                    </div>
                </div>
            `).join('');
        }

        const welcomeView = document.getElementById('welcome-view');
        const suggestionView = document.getElementById('suggestion-view');

        if (this.selectedId) {
            welcomeView.classList.add('hidden');
            suggestionView.classList.remove('hidden');

            const a = this.assignments.find(a => a.id === this.selectedId);
            if (a) {
                document.getElementById('selected-title').textContent = a.name;
                document.getElementById('selected-date').textContent = this.formatDate(a.duedate);
                document.getElementById('selected-course').textContent = a.courseName || 'Course';
            }
        } else {
            welcomeView.classList.remove('hidden');
            suggestionView.classList.add('hidden');
        }
    }

    renderSuggestion(suggestions) {
        const steps = document.getElementById('roadmap-steps');
        if (!suggestions || suggestions.length === 0) {
            steps.innerHTML = '<div class="empty-message">No suggestions available yet.</div>';
            return;
        }

        steps.innerHTML = suggestions.map((s, idx) => `
            <div class="roadmap-step">
                <div class="step-number">${idx + 1}</div>
                <div class="step-content">
                    <h4>${this.escapeHtml(s.title)}</h4>
                    <p>${this.escapeHtml(s.desc)}</p>
                    <div class="step-source">📖 ${this.escapeHtml(s.source)}</div>
                </div>
            </div>
        `).join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    isUrgent(timestamp) {
        const diff = timestamp * 1000 - Date.now();
        return diff < 86400000;
    }

    formatDate(timestamp) {
        const date = new Date(timestamp * 1000);
        const now = new Date();
        const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays < 7) return `${diffDays} days`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}

const app = new LIHAApp();
window.app = app;
