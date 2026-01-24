/**
 * IndexedDB Storage Module for Calendar Applet
 * Handles offline storage of events, tokens, and sync status
 */

const DB_NAME = 'UnifiedCalendarDB';
const DB_VERSION = 1;

class CalendarStorage {
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

                // Events store
                if (!db.objectStoreNames.contains('events')) {
                    const eventsStore = db.createObjectStore('events', { keyPath: 'id' });
                    eventsStore.createIndex('date', 'date', { unique: false });
                    eventsStore.createIndex('source', 'source', { unique: false });
                    eventsStore.createIndex('calendarId', 'calendarId', { unique: false });
                }

                // Tokens store (for OAuth refresh tokens)
                if (!db.objectStoreNames.contains('tokens')) {
                    db.createObjectStore('tokens', { keyPath: 'provider' });
                }

                // Sync status store
                if (!db.objectStoreNames.contains('sync')) {
                    db.createObjectStore('sync', { keyPath: 'provider' });
                }

                // Calendars store
                if (!db.objectStoreNames.contains('calendars')) {
                    const calendarsStore = db.createObjectStore('calendars', { keyPath: 'id' });
                    calendarsStore.createIndex('source', 'source', { unique: false });
                }
            };
        });
    }

    async ensureReady() {
        await this.initPromise;
    }

    // Events CRUD
    async saveEvent(event) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('events', 'readwrite');
            const store = tx.objectStore('events');
            const request = store.put(event);
            request.onsuccess = () => resolve(event);
            request.onerror = () => reject(request.error);
        });
    }

    async saveEvents(events) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('events', 'readwrite');
            const store = tx.objectStore('events');
            events.forEach(event => store.put(event));
            tx.oncomplete = () => resolve(events);
            tx.onerror = () => reject(tx.error);
        });
    }

    async getEventsByDateRange(startDate, endDate) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('events', 'readonly');
            const store = tx.objectStore('events');
            const request = store.getAll();
            request.onsuccess = () => {
                const events = request.result.filter(e => {
                    const eventDate = new Date(e.start);
                    return eventDate >= startDate && eventDate <= endDate;
                });
                resolve(events);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getAllEvents() {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('events', 'readonly');
            const store = tx.objectStore('events');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteEvent(eventId) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('events', 'readwrite');
            const store = tx.objectStore('events');
            const request = store.delete(eventId);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async clearEventsBySource(source) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('events', 'readwrite');
            const store = tx.objectStore('events');
            const index = store.index('source');
            const request = index.openCursor(IDBKeyRange.only(source));

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    store.delete(cursor.primaryKey);
                    cursor.continue();
                }
            };
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    // Token management
    async saveToken(provider, tokenData) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('tokens', 'readwrite');
            const store = tx.objectStore('tokens');
            const request = store.put({ provider, ...tokenData, savedAt: Date.now() });
            request.onsuccess = () => resolve(tokenData);
            request.onerror = () => reject(request.error);
        });
    }

    async getToken(provider) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('tokens', 'readonly');
            const store = tx.objectStore('tokens');
            const request = store.get(provider);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteToken(provider) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('tokens', 'readwrite');
            const store = tx.objectStore('tokens');
            const request = store.delete(provider);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Sync status
    async setSyncStatus(provider, status) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('sync', 'readwrite');
            const store = tx.objectStore('sync');
            const request = store.put({ provider, ...status, updatedAt: Date.now() });
            request.onsuccess = () => resolve(status);
            request.onerror = () => reject(request.error);
        });
    }

    async getSyncStatus(provider) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('sync', 'readonly');
            const store = tx.objectStore('sync');
            const request = store.get(provider);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Calendars
    async saveCalendar(calendar) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('calendars', 'readwrite');
            const store = tx.objectStore('calendars');
            const request = store.put(calendar);
            request.onsuccess = () => resolve(calendar);
            request.onerror = () => reject(request.error);
        });
    }

    async getCalendars() {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('calendars', 'readonly');
            const store = tx.objectStore('calendars');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

// Global instance
const storage = new CalendarStorage();
