/**
 * OAuth Authentication Module with PKCE
 * Handles Google and Microsoft OAuth flows with refresh token storage
 * 
 * Client IDs can be configured in two ways:
 * 1. Hardcode below (for permanent setup)
 * 2. Use the Setup Wizard in the calendar UI (saves to localStorage)
 */

// Load Client IDs from localStorage or use hardcoded values
const getClientId = (provider) => {
    const fromStorage = localStorage.getItem(`${provider}_client_id`);
    if (fromStorage) return fromStorage;

    // Hardcoded fallback (add your IDs here for permanent config)
    const hardcoded = {
        google: '',  // YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
        microsoft: '' // YOUR_MICROSOFT_CLIENT_ID
    };
    return hardcoded[provider] || '';
};

const OAUTH_CONFIG = {
    google: {
        get clientId() { return getClientId('google'); },
        redirectUri: 'http://localhost:3456/calendar/callback.html',
        scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly',
        authEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token'
    },
    microsoft: {
        get clientId() { return getClientId('microsoft'); },
        redirectUri: 'http://localhost:3456/calendar/callback.html',
        scope: 'Calendars.Read offline_access openid profile',
        authEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
    }
};

class AuthManager {
    constructor() {
        this.tokens = {
            google: null,
            microsoft: null
        };
        this.loadTokens();
    }

    async loadTokens() {
        try {
            const googleToken = await storage.getToken('google');
            const microsoftToken = await storage.getToken('microsoft');
            this.tokens.google = googleToken;
            this.tokens.microsoft = microsoftToken;
            console.log('Loaded tokens:', {
                google: !!googleToken,
                microsoft: !!microsoftToken
            });
        } catch (error) {
            console.error('Failed to load tokens:', error);
        }
    }

    isConnected(provider) {
        return !!this.tokens[provider];
    }

    isConfigured(provider) {
        const clientId = OAUTH_CONFIG[provider]?.clientId;
        return clientId && clientId.length > 0;
    }

    // Generate PKCE code verifier and challenge
    async generatePKCE() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const verifier = btoa(String.fromCharCode(...array))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');

        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
        const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');

        return { verifier, challenge };
    }

    // Generate random state for CSRF protection
    generateState() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return btoa(String.fromCharCode(...array))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    // Start OAuth flow for a provider
    async login(provider) {
        if (!this.isConfigured(provider)) {
            throw new Error(`${provider} OAuth not configured. Please add your Client ID in auth.js`);
        }

        const config = OAUTH_CONFIG[provider];
        const { verifier, challenge } = await this.generatePKCE();
        const state = this.generateState();

        // Store verifier and state for callback
        localStorage.setItem(`oauth_verifier_${provider}`, verifier);
        localStorage.setItem(`oauth_state_${provider}`, state);
        localStorage.setItem('oauth_provider', provider);

        // Build auth URL
        const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            response_type: 'code',
            scope: config.scope,
            state: state,
            code_challenge: challenge,
            code_challenge_method: 'S256',
            access_type: 'offline',
            prompt: 'consent'
        });

        // Open popup for OAuth
        const width = 500;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
            `${config.authEndpoint}?${params.toString()}`,
            'OAuth Login',
            `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
        );

        if (!popup) {
            throw new Error('Popup blocked. Please allow popups for this site.');
        }

        // Listen for callback
        return new Promise((resolve, reject) => {
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed);
                    window.removeEventListener('message', messageHandler);
                    // Check if we got the token
                    setTimeout(async () => {
                        await this.loadTokens();
                        if (this.tokens[provider]) {
                            resolve(true);
                        } else {
                            reject(new Error('OAuth cancelled or failed'));
                        }
                    }, 500);
                }
            }, 500);

            const messageHandler = async (event) => {
                // Verify origin
                if (event.origin !== window.location.origin) return;

                if (event.data.type === 'oauth_callback') {
                    clearInterval(checkClosed);
                    window.removeEventListener('message', messageHandler);
                    popup.close();

                    if (event.data.error) {
                        reject(new Error(event.data.error_description || event.data.error));
                        return;
                    }

                    try {
                        await this.exchangeCodeForToken(provider, event.data.code);
                        resolve(true);
                    } catch (error) {
                        reject(error);
                    }
                }
            };

            window.addEventListener('message', messageHandler);
        });
    }

    // Exchange authorization code for tokens
    async exchangeCodeForToken(provider, code) {
        const config = OAUTH_CONFIG[provider];
        const verifier = localStorage.getItem(`oauth_verifier_${provider}`);

        if (!verifier) {
            throw new Error('Missing PKCE verifier');
        }

        const body = new URLSearchParams({
            client_id: config.clientId,
            code: code,
            code_verifier: verifier,
            grant_type: 'authorization_code',
            redirect_uri: config.redirectUri
        });

        console.log('Exchanging code for token...');

        const response = await fetch(config.tokenEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString()
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Token exchange failed:', error);
            throw new Error(`Token exchange failed: ${response.status}`);
        }

        const tokenData = await response.json();
        tokenData.savedAt = Date.now();

        this.tokens[provider] = tokenData;
        await storage.saveToken(provider, tokenData);

        // Clean up
        localStorage.removeItem(`oauth_verifier_${provider}`);
        localStorage.removeItem(`oauth_state_${provider}`);
        localStorage.removeItem('oauth_provider');

        console.log(`${provider} OAuth successful!`);
        return tokenData;
    }

    // Refresh access token using refresh token
    async refreshToken(provider) {
        const config = OAUTH_CONFIG[provider];
        const currentToken = this.tokens[provider];

        if (!currentToken?.refresh_token) {
            throw new Error('No refresh token available');
        }

        console.log(`Refreshing ${provider} token...`);

        const body = new URLSearchParams({
            client_id: config.clientId,
            refresh_token: currentToken.refresh_token,
            grant_type: 'refresh_token'
        });

        const response = await fetch(config.tokenEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString()
        });

        if (!response.ok) {
            console.error('Token refresh failed');
            await this.logout(provider);
            throw new Error('Token refresh failed - please login again');
        }

        const newTokenData = await response.json();
        newTokenData.savedAt = Date.now();

        // Keep the refresh token if not returned
        if (!newTokenData.refresh_token) {
            newTokenData.refresh_token = currentToken.refresh_token;
        }

        this.tokens[provider] = newTokenData;
        await storage.saveToken(provider, newTokenData);

        console.log(`${provider} token refreshed successfully`);
        return newTokenData;
    }

    // Get access token (auto-refresh if needed)
    async getAccessToken(provider) {
        const token = this.tokens[provider];
        if (!token) return null;

        // Check if token is expired (with 5 min buffer)
        const expiresAt = (token.savedAt || 0) + ((token.expires_in || 3600) * 1000);
        const bufferMs = 5 * 60 * 1000;

        if (Date.now() > expiresAt - bufferMs) {
            try {
                await this.refreshToken(provider);
            } catch (error) {
                console.error('Auto-refresh failed:', error);
                return null;
            }
        }

        return this.tokens[provider]?.access_token;
    }

    // Logout from a provider
    async logout(provider) {
        this.tokens[provider] = null;
        await storage.deleteToken(provider);
        await storage.clearEventsBySource(provider);
        console.log(`Logged out from ${provider}`);
    }
}

// Global instance
const auth = new AuthManager();
