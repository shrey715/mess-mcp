/**
 * IndexedDB Storage for LIHA Applet
 * Tracks assignments and study suggestions
 */

const DB_NAME = 'LIHA_Storage';
const DB_VERSION = 1;

class LIHAStorage {
    constructor() {
        this.db = null;
        this.initPromise = this.init();
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('assignments')) {
                    db.createObjectStore('assignments', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('suggestions')) {
                    db.createObjectStore('suggestions', { keyPath: 'assignmentId' });
                }
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'key' });
                }
            };
        });
    }

    async ensureReady() {
        await this.initPromise;
    }

    async saveAssignments(assignments) {
        await this.ensureReady();
        const tx = this.db.transaction('assignments', 'readwrite');
        const store = tx.objectStore('assignments');
        assignments.forEach(a => store.put(a));
        return new Promise((resolve) => {
            tx.oncomplete = () => resolve();
        });
    }

    async getAssignments() {
        await this.ensureReady();
        return new Promise((resolve) => {
            const tx = this.db.transaction('assignments', 'readonly');
            tx.objectStore('assignments').getAll().onsuccess = (e) => resolve(e.target.result);
        });
    }

    async saveSuggestion(assignmentId, suggestions) {
        await this.ensureReady();
        const tx = this.db.transaction('suggestions', 'readwrite');
        tx.objectStore('suggestions').put({ assignmentId, suggestions, createdAt: Date.now() });
        return new Promise(resolve => { tx.oncomplete = () => resolve(); });
    }

    async getSuggestion(assignmentId) {
        await this.ensureReady();
        return new Promise((resolve) => {
            const tx = this.db.transaction('suggestions', 'readonly');
            tx.objectStore('suggestions').get(assignmentId).onsuccess = (e) => resolve(e.target.result);
        });
    }

    async updateLastSync() {
        await this.ensureReady();
        const tx = this.db.transaction('metadata', 'readwrite');
        tx.objectStore('metadata').put({ key: 'lastSync', value: Date.now() });
    }

    async getLastSync() {
        await this.ensureReady();
        return new Promise((resolve) => {
            const tx = this.db.transaction('metadata', 'readonly');
            tx.objectStore('metadata').get('lastSync').onsuccess = (e) => resolve(e.target.result?.value);
        });
    }
}

const lihaStorage = new LIHAStorage();
