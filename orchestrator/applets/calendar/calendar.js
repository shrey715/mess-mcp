/**
 * Main Calendar Application
 * Renders the calendar UI and coordinates all modules
 */

class CalendarApp {
    constructor() {
        this.currentDate = new Date();
        this.viewMode = 'month';
        this.events = [];
        this.isOnline = navigator.onLine;
        this.selectedEvent = null;
        this.showSetupWizard = false;
        this.setupProvider = 'google';

        this.init();
    }

    async init() {
        await storage.initPromise;
        this.events = await storage.getAllEvents();
        this.render();
        this.setupListeners();
        await this.refreshEvents();

        calendarBridge.addListener((type, data) => {
            if (type === 'eventAdded' || type === 'eventRemoved') {
                this.loadEvents();
            }
        });
    }

    setupListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.render();
            this.refreshEvents();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.render();
        });
    }

    async loadEvents() {
        this.events = await storage.getAllEvents();
        this.render();
    }

    async refreshEvents() {
        if (!this.isOnline) return;

        const startOfMonth = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const endOfMonth = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);

        const timeMin = new Date(startOfMonth);
        timeMin.setDate(timeMin.getDate() - 7);
        const timeMax = new Date(endOfMonth);
        timeMax.setDate(timeMax.getDate() + 7);

        try {
            this.events = await calendarAPI.fetchAllEvents(timeMin, timeMax);
            this.render();
        } catch (error) {
            console.error('Failed to refresh events:', error);
        }
    }

    previousMonth() {
        this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
        this.refreshEvents();
    }

    nextMonth() {
        this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
        this.refreshEvents();
    }

    goToToday() {
        this.currentDate = new Date();
        this.refreshEvents();
    }

    // Event detail modal
    showEventDetail(eventId) {
        this.selectedEvent = this.events.find(e => e.id === eventId);
        this.render();
    }

    closeEventDetail() {
        this.selectedEvent = null;
        this.render();
    }

    // Setup wizard
    openSetupWizard(provider = 'google') {
        this.showSetupWizard = true;
        this.setupProvider = provider;
        this.render();
    }

    closeSetupWizard() {
        this.showSetupWizard = false;
        this.render();
    }

    async connectGoogle() {
        if (!auth.isConfigured('google')) {
            this.openSetupWizard('google');
            return;
        }
        try {
            await auth.login('google');
            await this.refreshEvents();
            this.render();
        } catch (error) {
            console.error('Google login failed:', error);
            alert('Google login failed: ' + error.message);
        }
    }

    async connectMicrosoft() {
        if (!auth.isConfigured('microsoft')) {
            this.openSetupWizard('microsoft');
            return;
        }
        try {
            await auth.login('microsoft');
            await this.refreshEvents();
            this.render();
        } catch (error) {
            console.error('Microsoft login failed:', error);
            alert('Microsoft login failed: ' + error.message);
        }
    }

    async disconnectGoogle() {
        await auth.logout('google');
        await this.loadEvents();
    }

    async disconnectMicrosoft() {
        await auth.logout('microsoft');
        await this.loadEvents();
    }

    getEventsForDate(date) {
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
        const dayEnd = dayStart + 86400000;
        return this.events.filter(event => event.start >= dayStart && event.start < dayEnd);
    }

    render() {
        const app = document.getElementById('app');
        app.innerHTML = this.renderApp();
        this.attachEventHandlers();
    }

    renderApp() {
        const monthName = this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        return `
            <header class="header">
                <div class="header-left">
                    <h1>📅 Unified Calendar</h1>
                    <div class="nav-buttons">
                        <button class="nav-btn" id="btn-today">Today</button>
                        <button class="nav-btn" id="btn-prev">◀</button>
                        <button class="nav-btn" id="btn-next">▶</button>
                    </div>
                    <div class="current-date">${monthName}</div>
                </div>
                <div class="header-right">
                    <button class="auth-btn moodle" id="btn-moodle" title="Sync assignment deadlines from Moodle">
                        📚 Sync Moodle
                    </button>
                    <button class="auth-btn google ${auth.isConnected('google') ? 'connected' : ''}" id="btn-google">
                        ${auth.isConnected('google') ? '✓ Google' : '🔗 Google'}
                    </button>
                    <button class="auth-btn microsoft ${auth.isConnected('microsoft') ? 'connected' : ''}" id="btn-microsoft">
                        ${auth.isConnected('microsoft') ? '✓ Microsoft' : '🔗 Microsoft'}
                    </button>
                </div>
            </header>
            
            <main class="main">
                ${this.renderSidebar()}
                ${this.renderCalendarGrid()}
            </main>
            
            <footer class="status-bar">
                <div>
                    <span class="status-dot ${this.isOnline ? 'online' : 'offline'}"></span>
                    ${this.isOnline ? 'Online' : 'Offline (cached events)'}
                </div>
                <div>${this.events.length} events</div>
            </footer>
            
            ${this.selectedEvent ? this.renderEventModal() : ''}
            ${this.showSetupWizard ? this.renderSetupWizard() : ''}
        `;
    }

    renderEventModal() {
        const event = this.selectedEvent;
        const startDate = new Date(event.start);
        const endDate = new Date(event.end);

        const sourceLabel = {
            'google': 'Google Calendar',
            'microsoft': 'Microsoft Outlook',
            'ipc': 'IPC Event'
        }[event.source] || event.source;

        return `
            <div class="modal-overlay" id="event-modal-overlay">
                <div class="modal event-modal">
                    <h2>
                        ${event.title}
                        <span class="event-source-badge ${event.source}">${sourceLabel}</span>
                    </h2>
                    
                    <div class="event-detail-row">
                        <span class="event-detail-icon">🕐</span>
                        <div class="event-detail-content">
                            <div class="event-detail-label">Date & Time</div>
                            <div class="event-detail-value">
                                ${startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                <br>
                                ${startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - 
                                ${endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                    
                    ${event.location ? `
                    <div class="event-detail-row">
                        <span class="event-detail-icon">📍</span>
                        <div class="event-detail-content">
                            <div class="event-detail-label">Location</div>
                            <div class="event-detail-value">${event.location}</div>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${event.description ? `
                    <div class="event-detail-row">
                        <span class="event-detail-icon">📝</span>
                        <div class="event-detail-content">
                            <div class="event-detail-label">Description</div>
                            <div class="event-detail-value">${event.description}</div>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${event.source === 'ipc' && event.addedBy ? `
                    <div class="event-detail-row">
                        <span class="event-detail-icon">🔗</span>
                        <div class="event-detail-content">
                            <div class="event-detail-label">Added By</div>
                            <div class="event-detail-value">${event.addedBy}</div>
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="modal-buttons">
                        <button class="modal-btn secondary" id="btn-close-event">Close</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderSetupWizard() {
        const isGoogle = this.setupProvider === 'google';

        return `
            <div class="modal-overlay" id="setup-modal-overlay">
                <div class="modal setup-wizard">
                    <h2>🔧 Setup ${isGoogle ? 'Google' : 'Microsoft'} Calendar</h2>
                    
                    <div class="setup-provider-tabs">
                        <button class="setup-provider-tab google ${isGoogle ? 'active' : ''}" id="setup-tab-google">
                            Google
                        </button>
                        <button class="setup-provider-tab microsoft ${!isGoogle ? 'active' : ''}" id="setup-tab-microsoft">
                            Microsoft
                        </button>
                    </div>
                    
                    ${isGoogle ? this.renderGoogleSetup() : this.renderMicrosoftSetup()}
                    
                    <div class="modal-buttons">
                        <button class="modal-btn secondary" id="btn-close-setup">Cancel</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderGoogleSetup() {
        return `
            <div class="setup-step">
                <div class="setup-step-header">
                    <div class="setup-step-number">1</div>
                    <div class="setup-step-title">Create a Google Cloud Project</div>
                </div>
                <div class="setup-step-content">
                    Go to <a href="https://console.cloud.google.com/projectcreate" target="_blank">Google Cloud Console</a> and create a new project
                </div>
            </div>
            
            <div class="setup-step">
                <div class="setup-step-header">
                    <div class="setup-step-number">2</div>
                    <div class="setup-step-title">Enable Google Calendar API</div>
                </div>
                <div class="setup-step-content">
                    Go to <a href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com" target="_blank">Calendar API</a> and click Enable
                </div>
            </div>
            
            <div class="setup-step">
                <div class="setup-step-header">
                    <div class="setup-step-number">3</div>
                    <div class="setup-step-title">Create OAuth Credentials</div>
                </div>
                <div class="setup-step-content">
                    <a href="https://console.cloud.google.com/apis/credentials/oauthclient" target="_blank">Create OAuth Client</a> (Web application type)
                    <br><br>
                    Add redirect URI: <code>http://localhost:3456/calendar/callback.html</code>
                </div>
            </div>
            
            <div class="setup-step">
                <div class="setup-step-header">
                    <div class="setup-step-number">4</div>
                    <div class="setup-step-title">Add Client ID</div>
                </div>
                <div class="setup-step-content">
                    Copy your Client ID and paste it below:
                    <input type="text" class="setup-input" id="google-client-id" placeholder="xxxx.apps.googleusercontent.com">
                    <button class="nav-btn" style="margin-top: 8px;" id="btn-save-google">Save & Connect</button>
                </div>
            </div>
        `;
    }

    renderMicrosoftSetup() {
        return `
            <div class="setup-step">
                <div class="setup-step-header">
                    <div class="setup-step-number">1</div>
                    <div class="setup-step-title">Register an Azure AD App</div>
                </div>
                <div class="setup-step-content">
                    Go to <a href="https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" target="_blank">Azure Portal</a> → New registration
                </div>
            </div>
            
            <div class="setup-step">
                <div class="setup-step-header">
                    <div class="setup-step-number">2</div>
                    <div class="setup-step-title">Configure Redirect URI</div>
                </div>
                <div class="setup-step-content">
                    Under Authentication, add:<br>
                    <code>http://localhost:3456/calendar/callback.html</code>
                </div>
            </div>
            
            <div class="setup-step">
                <div class="setup-step-header">
                    <div class="setup-step-number">3</div>
                    <div class="setup-step-title">Add Client ID</div>
                </div>
                <div class="setup-step-content">
                    Copy your Application (client) ID and paste below:
                    <input type="text" class="setup-input" id="microsoft-client-id" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx">
                    <button class="nav-btn" style="margin-top: 8px;" id="btn-save-microsoft">Save & Connect</button>
                </div>
            </div>
        `;
    }

    renderSidebar() {
        const miniCalendarDays = this.getMiniCalendarDays();

        return `
            <aside class="sidebar">
                <div class="mini-calendar">
                    <div class="mini-calendar-header">
                        <strong>${this.currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</strong>
                    </div>
                    <div class="mini-calendar-grid">
                        <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
                        ${miniCalendarDays.map(day => `
                            <div class="mini-calendar-day ${day.isToday ? 'today' : ''} ${day.isOtherMonth ? 'other-month' : ''}">
                                ${day.date.getDate()}
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="calendars-list">
                    <h3>Calendars</h3>
                    <div class="calendar-item">
                        <span class="calendar-dot google"></span>
                        <span>Google</span>
                        <span style="margin-left: auto; font-size: 11px; color: var(--text-secondary)">
                            ${this.events.filter(e => e.source === 'google').length}
                        </span>
                    </div>
                    <div class="calendar-item">
                        <span class="calendar-dot microsoft"></span>
                        <span>Microsoft</span>
                        <span style="margin-left: auto; font-size: 11px; color: var(--text-secondary)">
                            ${this.events.filter(e => e.source === 'microsoft').length}
                        </span>
                    </div>
                    <div class="calendar-item">
                        <span class="calendar-dot ipc"></span>
                        <span>IPC Events</span>
                        <span style="margin-left: auto; font-size: 11px; color: var(--text-secondary)">
                            ${this.events.filter(e => e.source === 'ipc').length}
                        </span>
                    </div>
                </div>
                
                <button class="nav-btn" style="width: 100%;" id="btn-add-test">
                    ➕ Test IPC Event
                </button>
            </aside>
        `;
    }

    getMiniCalendarDays() {
        const days = [];
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startPadding = firstDay.getDay();
        const today = new Date();

        for (let i = startPadding - 1; i >= 0; i--) {
            const date = new Date(year, month, -i);
            days.push({ date, isOtherMonth: true, isToday: this.isSameDay(date, today) });
        }

        for (let i = 1; i <= lastDay.getDate(); i++) {
            const date = new Date(year, month, i);
            days.push({ date, isOtherMonth: false, isToday: this.isSameDay(date, today) });
        }

        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            const date = new Date(year, month + 1, i);
            days.push({ date, isOtherMonth: true, isToday: this.isSameDay(date, today) });
        }

        return days;
    }

    renderCalendarGrid() {
        const days = this.getCalendarDays();
        const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        return `
            <div class="calendar-container">
                <div class="calendar-header">
                    ${weekDays.map(day => `<div class="calendar-header-cell">${day}</div>`).join('')}
                </div>
                <div class="calendar-grid">
                    ${days.map(day => this.renderCalendarCell(day)).join('')}
                </div>
            </div>
        `;
    }

    getCalendarDays() {
        const days = [];
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startPadding = firstDay.getDay();
        const today = new Date();

        for (let i = startPadding - 1; i >= 0; i--) {
            const date = new Date(year, month, -i);
            days.push({
                date,
                isOtherMonth: true,
                isToday: this.isSameDay(date, today),
                events: this.getEventsForDate(date)
            });
        }

        for (let i = 1; i <= lastDay.getDate(); i++) {
            const date = new Date(year, month, i);
            days.push({
                date,
                isOtherMonth: false,
                isToday: this.isSameDay(date, today),
                events: this.getEventsForDate(date)
            });
        }

        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            const date = new Date(year, month + 1, i);
            days.push({
                date,
                isOtherMonth: true,
                isToday: this.isSameDay(date, today),
                events: this.getEventsForDate(date)
            });
        }

        return days;
    }

    renderCalendarCell(day) {
        const dateNum = day.date.getDate();
        const eventsHtml = day.events.slice(0, 3).map(event => `
            <div class="event ${event.source}" data-event-id="${event.id}">
                ${this.formatTime(event.start)} ${event.title}
            </div>
        `).join('');

        const moreEvents = day.events.length > 3
            ? `<div class="event" style="font-size: 10px; color: var(--text-secondary)">+${day.events.length - 3} more</div>`
            : '';

        return `
            <div class="calendar-cell ${day.isOtherMonth ? 'other-month' : ''} ${day.isToday ? 'today' : ''}">
                <div class="cell-date ${day.isToday ? 'today' : ''}">${dateNum}</div>
                ${eventsHtml}
                ${moreEvents}
            </div>
        `;
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }

    isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getFullYear() === date2.getFullYear();
    }

    attachEventHandlers() {
        // Navigation
        document.getElementById('btn-today')?.addEventListener('click', () => this.goToToday());
        document.getElementById('btn-prev')?.addEventListener('click', () => this.previousMonth());
        document.getElementById('btn-next')?.addEventListener('click', () => this.nextMonth());

        // Auth buttons
        document.getElementById('btn-google')?.addEventListener('click', () => {
            auth.isConnected('google') ? this.disconnectGoogle() : this.connectGoogle();
        });

        document.getElementById('btn-microsoft')?.addEventListener('click', () => {
            auth.isConnected('microsoft') ? this.disconnectMicrosoft() : this.connectMicrosoft();
        });

        // Moodle sync button
        document.getElementById('btn-moodle')?.addEventListener('click', async () => {
            const btn = document.getElementById('btn-moodle');
            btn.textContent = '⏳ Syncing...';
            btn.disabled = true;
            
            try {
                const result = await calendarBridge.syncMoodleAssignments();
                if (result.success) {
                    await this.loadEvents();
                    btn.textContent = `✅ ${result.count} synced`;
                    setTimeout(() => {
                        btn.textContent = '📚 Sync Moodle';
                        btn.disabled = false;
                    }, 2000);
                } else {
                    btn.textContent = '❌ Failed';
                    setTimeout(() => {
                        btn.textContent = '📚 Sync Moodle';
                        btn.disabled = false;
                    }, 2000);
                }
            } catch (error) {
                console.error('Moodle sync failed:', error);
                btn.textContent = '📚 Sync Moodle';
                btn.disabled = false;
            }
        });

        // Test IPC
        document.getElementById('btn-add-test')?.addEventListener('click', async () => {
            await calendarBridge.addTestEvent();
            await this.loadEvents();
        });

        // Event click handlers
        document.querySelectorAll('.event[data-event-id]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showEventDetail(el.dataset.eventId);
            });
        });

        // Modal close handlers
        document.getElementById('event-modal-overlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'event-modal-overlay') this.closeEventDetail();
        });
        document.getElementById('btn-close-event')?.addEventListener('click', () => this.closeEventDetail());

        document.getElementById('setup-modal-overlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'setup-modal-overlay') this.closeSetupWizard();
        });
        document.getElementById('btn-close-setup')?.addEventListener('click', () => this.closeSetupWizard());

        // Setup wizard tabs
        document.getElementById('setup-tab-google')?.addEventListener('click', () => {
            this.setupProvider = 'google';
            this.render();
        });
        document.getElementById('setup-tab-microsoft')?.addEventListener('click', () => {
            this.setupProvider = 'microsoft';
            this.render();
        });

        // Save credentials (note: in real app this would need backend support)
        document.getElementById('btn-save-google')?.addEventListener('click', () => {
            const clientId = document.getElementById('google-client-id').value.trim();
            if (clientId) {
                localStorage.setItem('google_client_id', clientId);
                alert('Client ID saved! Reload the calendar applet to apply.\n\nNote: For this to work permanently, add the Client ID to auth.js');
                this.closeSetupWizard();
            }
        });

        document.getElementById('btn-save-microsoft')?.addEventListener('click', () => {
            const clientId = document.getElementById('microsoft-client-id').value.trim();
            if (clientId) {
                localStorage.setItem('microsoft_client_id', clientId);
                alert('Client ID saved! Reload the calendar applet to apply.\n\nNote: For this to work permanently, add the Client ID to auth.js');
                this.closeSetupWizard();
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.calendarApp = new CalendarApp();
});
