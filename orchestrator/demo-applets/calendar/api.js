/**
 * Calendar API Service Layer
 * Handles fetching events from Google Calendar and Microsoft Graph APIs
 */

class CalendarAPI {
    constructor() {
        this.baseUrls = {
            google: 'https://www.googleapis.com/calendar/v3',
            microsoft: 'https://graph.microsoft.com/v1.0'
        };
    }

    // Fetch events from Google Calendar
    async fetchGoogleEvents(timeMin, timeMax) {
        if (!auth.isConnected('google')) {
            console.log('Not connected to Google');
            return [];
        }

        try {
            const accessToken = await auth.getAccessToken('google');
            if (!accessToken) {
                console.log('No Google access token available');
                return [];
            }

            const params = new URLSearchParams({
                timeMin: timeMin.toISOString(),
                timeMax: timeMax.toISOString(),
                singleEvents: 'true',
                orderBy: 'startTime',
                maxResults: '100'
            });

            console.log('Fetching Google Calendar events...');
            const response = await fetch(
                `${this.baseUrls.google}/calendars/primary/events?${params}`,
                {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                }
            );

            if (!response.ok) {
                const error = await response.text();
                console.error('Google API error:', response.status, error);
                throw new Error(`Google API error: ${response.status}`);
            }

            const data = await response.json();
            console.log(`Fetched ${data.items?.length || 0} Google events`);

            const events = this.normalizeGoogleEvents(data.items || []);

            // Save to IndexedDB for offline access
            await storage.saveEvents(events);
            await storage.setSyncStatus('google', { lastSync: Date.now(), success: true });

            return events;
        } catch (error) {
            console.error('Google Calendar fetch failed:', error);
            await storage.setSyncStatus('google', { lastSync: Date.now(), success: false, error: error.message });

            // Return cached events
            const cached = await storage.getAllEvents();
            return cached.filter(e => e.source === 'google');
        }
    }

    // Normalize Google Calendar event format
    normalizeGoogleEvents(items) {
        return items.map(item => ({
            id: `google-${item.id}`,
            title: item.summary || 'Untitled',
            start: new Date(item.start.dateTime || item.start.date).getTime(),
            end: new Date(item.end.dateTime || item.end.date).getTime(),
            source: 'google',
            color: '#4285f4',
            description: item.description || '',
            location: item.location || '',
            allDay: !item.start.dateTime
        }));
    }

    // Fetch events from Microsoft Calendar
    async fetchMicrosoftEvents(timeMin, timeMax) {
        if (!auth.isConnected('microsoft')) {
            console.log('Not connected to Microsoft');
            return [];
        }

        try {
            const accessToken = await auth.getAccessToken('microsoft');
            if (!accessToken) {
                console.log('No Microsoft access token available');
                return [];
            }

            const params = new URLSearchParams({
                startDateTime: timeMin.toISOString(),
                endDateTime: timeMax.toISOString(),
                $orderby: 'start/dateTime',
                $top: '100'
            });

            console.log('Fetching Microsoft Calendar events...');
            const response = await fetch(
                `${this.baseUrls.microsoft}/me/calendarview?${params}`,
                {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                }
            );

            if (!response.ok) {
                const error = await response.text();
                console.error('Microsoft API error:', response.status, error);
                throw new Error(`Microsoft API error: ${response.status}`);
            }

            const data = await response.json();
            console.log(`Fetched ${data.value?.length || 0} Microsoft events`);

            const events = this.normalizeMicrosoftEvents(data.value || []);

            // Save to IndexedDB for offline access
            await storage.saveEvents(events);
            await storage.setSyncStatus('microsoft', { lastSync: Date.now(), success: true });

            return events;
        } catch (error) {
            console.error('Microsoft Calendar fetch failed:', error);
            await storage.setSyncStatus('microsoft', { lastSync: Date.now(), success: false, error: error.message });

            // Return cached events
            const cached = await storage.getAllEvents();
            return cached.filter(e => e.source === 'microsoft');
        }
    }

    // Normalize Microsoft Calendar event format
    normalizeMicrosoftEvents(items) {
        return items.map(item => ({
            id: `ms-${item.id}`,
            title: item.subject || 'Untitled',
            start: new Date(item.start.dateTime + 'Z').getTime(),
            end: new Date(item.end.dateTime + 'Z').getTime(),
            source: 'microsoft',
            color: '#00a4ef',
            description: item.bodyPreview || '',
            location: item.location?.displayName || '',
            allDay: item.isAllDay
        }));
    }

    // Fetch all events from all connected sources
    async fetchAllEvents(timeMin, timeMax) {
        const allEvents = [];

        // Fetch in parallel
        const promises = [];

        if (auth.isConnected('google')) {
            promises.push(
                this.fetchGoogleEvents(timeMin, timeMax)
                    .then(events => allEvents.push(...events))
                    .catch(err => console.error('Google fetch failed:', err))
            );
        }

        if (auth.isConnected('microsoft')) {
            promises.push(
                this.fetchMicrosoftEvents(timeMin, timeMax)
                    .then(events => allEvents.push(...events))
                    .catch(err => console.error('Microsoft fetch failed:', err))
            );
        }

        await Promise.all(promises);

        // Also get IPC events from storage
        const cachedEvents = await storage.getAllEvents();
        const ipcEvents = cachedEvents.filter(e => e.source === 'ipc');
        allEvents.push(...ipcEvents);

        return allEvents;
    }

    // Get cached events (for offline mode)
    async getCachedEvents() {
        return storage.getAllEvents();
    }
}

// Global instance
const calendarAPI = new CalendarAPI();
