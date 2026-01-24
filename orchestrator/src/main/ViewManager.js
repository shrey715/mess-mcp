const { BrowserView } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * ViewManager - Manages BrowserView instances for applets
 * Handles loading, switching, hibernation, and lifecycle of applet views
 */
class ViewManager {
    constructor(mainWindow) {
        this.mainWindow = mainWindow;
        this.views = new Map(); // Map<appletId, { view, manifest, state }>
        this.activeAppletId = null;
        this.sidebarWidth = 64;
        this.headerHeight = 40;

        // Listen for window resize to update view bounds
        this.mainWindow.on('resize', () => this.updateActiveBounds());
    }

    /**
     * Load a new applet from its manifest
     * @param {Object} manifest - The applet manifest { id, url, icon, permissions }
     * @param {boolean} autoSwitch - Whether to automatically switch to the new applet
     */
    async loadApplet(manifest, autoSwitch = true) {
        if (this.views.has(manifest.id)) {
            console.log(`Applet ${manifest.id} already loaded`);
            return { success: false, error: 'Applet already loaded' };
        }

        const view = new BrowserView({
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload-bridge.js'),
                partition: `persist:applet-${manifest.id}`,
                sandbox: true
            }
        });

        // Store applet info
        this.views.set(manifest.id, {
            view,
            manifest,
            state: 'active',
            hibernationScreenshot: null,
            lastFocused: Date.now(),
            memoryUsage: 0
        });

        // Add view to window
        this.mainWindow.addBrowserView(view);

        // Initially set bounds to 0 (hidden)
        view.setBounds({ x: 0, y: 0, width: 0, height: 0 });

        // Load the URL
        try {
            await view.webContents.loadURL(manifest.url);
            console.log(`Applet ${manifest.id} loaded successfully`);

            // Start memory monitoring
            this.startMemoryMonitoring(manifest.id);

            // Auto-switch to the new applet if requested
            if (autoSwitch) {
                this.switchTo(manifest.id);
            }

            return { success: true, id: manifest.id };
        } catch (error) {
            console.error(`Failed to load applet ${manifest.id}:`, error);
            this.removeApplet(manifest.id);
            return { success: false, error: error.message };
        }
    }

    /**
     * Switch to a specific applet - hide others, show the target
     */
    switchTo(appletId) {
        const appletData = this.views.get(appletId);
        if (!appletData) {
            return { success: false, error: 'Applet not found' };
        }

        // Check if hibernated - restore first
        if (appletData.state === 'hibernated') {
            this.restoreApplet(appletId);
            return { success: true, id: appletId, restoring: true };
        }

        // Hide all other views
        for (const [id, data] of this.views) {
            if (id !== appletId && data.state === 'active' && data.view) {
                data.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
            }
        }

        // Show the target view
        this.activeAppletId = appletId;
        appletData.lastFocused = Date.now();
        this.updateActiveBounds();

        return { success: true, id: appletId };
    }

    /**
     * Update bounds of the active applet view
     */
    updateActiveBounds() {
        if (!this.activeAppletId) return;

        const appletData = this.views.get(this.activeAppletId);
        if (!appletData || appletData.state !== 'active' || !appletData.view) return;

        const [width, height] = this.mainWindow.getContentSize();
        appletData.view.setBounds({
            x: this.sidebarWidth,
            y: this.headerHeight,
            width: Math.max(0, width - this.sidebarWidth),
            height: Math.max(0, height - this.headerHeight)
        });
    }

    /**
     * Remove an applet completely
     */
    removeApplet(appletId) {
        const appletData = this.views.get(appletId);
        if (!appletData) {
            return { success: false, error: 'Applet not found' };
        }

        if (appletData.view) {
            this.mainWindow.removeBrowserView(appletData.view);
            appletData.view.webContents.close();
        }

        this.views.delete(appletId);

        // If this was the active applet, switch to another
        if (this.activeAppletId === appletId) {
            const remaining = Array.from(this.views.keys());
            if (remaining.length > 0) {
                this.switchTo(remaining[0]);
            } else {
                this.activeAppletId = null;
            }
        }

        return { success: true };
    }

    /**
     * Hibernate an applet - capture screenshot, destroy process
     */
    async hibernateApplet(appletId) {
        const appletData = this.views.get(appletId);
        if (!appletData || appletData.state !== 'active') {
            return { success: false, error: 'Applet not found or not active' };
        }

        try {
            // Capture screenshot
            const screenshot = await appletData.view.webContents.capturePage();
            const screenshotPath = path.join(
                require('electron').app.getPath('userData'),
                'hibernation',
                `${appletId}.png`
            );

            // Ensure directory exists
            fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
            fs.writeFileSync(screenshotPath, screenshot.toPNG());

            appletData.hibernationScreenshot = screenshotPath;
            appletData.state = 'hibernated';

            // Destroy the view
            this.mainWindow.removeBrowserView(appletData.view);
            appletData.view.webContents.close();
            appletData.view = null;

            console.log(`Applet ${appletId} hibernated`);
            return { success: true, screenshotPath };
        } catch (error) {
            console.error(`Failed to hibernate applet ${appletId}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Restore a hibernated applet
     */
    async restoreApplet(appletId) {
        const appletData = this.views.get(appletId);
        if (!appletData || appletData.state !== 'hibernated') {
            return { success: false, error: 'Applet not found or not hibernated' };
        }

        // Recreate the view
        const view = new BrowserView({
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload-bridge.js'),
                partition: `persist:applet-${appletId}`,
                sandbox: true
            }
        });

        this.mainWindow.addBrowserView(view);
        appletData.view = view;
        appletData.state = 'active';

        try {
            await view.webContents.loadURL(appletData.manifest.url);

            // Clean up screenshot
            if (appletData.hibernationScreenshot) {
                try {
                    fs.unlinkSync(appletData.hibernationScreenshot);
                } catch (e) {
                    // File might not exist
                }
                appletData.hibernationScreenshot = null;
            }

            this.startMemoryMonitoring(appletId);
            console.log(`Applet ${appletId} restored`);
            return { success: true };
        } catch (error) {
            console.error(`Failed to restore applet ${appletId}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Start memory monitoring for an applet
     */
    startMemoryMonitoring(appletId) {
        const MEMORY_THRESHOLD = 500 * 1024 * 1024; // 500MB
        const IDLE_THRESHOLD = 20 * 60 * 1000; // 20 minutes

        const checkMemory = async () => {
            const appletData = this.views.get(appletId);
            if (!appletData || appletData.state !== 'active' || !appletData.view) return;

            try {
                const processMemory = await appletData.view.webContents.getProcessMemoryInfo();
                appletData.memoryUsage = processMemory.private;

                const isIdle = Date.now() - appletData.lastFocused > IDLE_THRESHOLD;
                const isMemoryHigh = appletData.memoryUsage > MEMORY_THRESHOLD / 1024;

                if (isIdle && isMemoryHigh && appletId !== this.activeAppletId) {
                    console.log(`Auto-hibernating applet ${appletId} due to high memory and idle state`);
                    this.hibernateApplet(appletId);
                } else {
                    // Schedule next check
                    setTimeout(checkMemory, 60000); // Check every minute
                }
            } catch (error) {
                // View might have been destroyed
            }
        };

        setTimeout(checkMemory, 60000);
    }

    /**
     * List all loaded applets
     */
    listApplets() {
        const applets = [];
        for (const [id, data] of this.views) {
            applets.push({
                id,
                manifest: data.manifest,
                state: data.state,
                isActive: id === this.activeAppletId,
                memoryUsage: data.memoryUsage,
                hibernationScreenshot: data.hibernationScreenshot
            });
        }
        return applets;
    }

    /**
     * Set sidebar width and update bounds
     */
    setSidebarWidth(width) {
        this.sidebarWidth = width;
        this.updateActiveBounds();
    }

    /**
     * Hide all views (used when showing modals)
     */
    hideAllViews() {
        for (const [id, data] of this.views) {
            if (data.state === 'active' && data.view) {
                data.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
            }
        }
    }

    /**
     * Show the active view again (used when hiding modals)
     */
    showActiveView() {
        this.updateActiveBounds();
    }
}

module.exports = ViewManager;
