class LihaStorage {
    constructor() {
        this.initPromise = this.init();
    }

    async init() {
        // Initialize if needed
    }

    async getAssignments() {
        const data = localStorage.getItem('liha_assignments');
        return data ? JSON.parse(data) : [];
    }

    async saveAssignments(assignments) {
        localStorage.setItem('liha_assignments', JSON.stringify(assignments));
    }

    async getSuggestion(id) {
        const data = localStorage.getItem(`liha_suggestion_${id}`);
        return data ? JSON.parse(data) : null;
    }

    async saveSuggestion(id, suggestions) {
        localStorage.setItem(`liha_suggestion_${id}`, JSON.stringify({
            timestamp: Date.now(),
            suggestions
        }));
    }

    async updateLastSync() {
        localStorage.setItem('liha_last_sync', Date.now());
    }

    async getLastSync() {
        return localStorage.getItem('liha_last_sync');
    }

    // Settings
    getSettings() {
        const defaults = {
            moodleUrl: 'http://10.42.0.159:8085', // Default to current IP
            token: '6e46f93f5f12b5bf476e7f2b8e7d6ba3',
            mcpUrl: 'http://localhost:3001'
        };
        const stored = localStorage.getItem('liha_settings');
        return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
    }

    saveSettings(settings) {
        localStorage.setItem('liha_settings', JSON.stringify(settings));
    }
}

const lihaStorage = new LihaStorage();
