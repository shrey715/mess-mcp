const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script for the Shell UI
 * Exposes safe APIs for window controls and applet management
 */
contextBridge.exposeInMainWorld('shell', {
    // Window controls
    window: {
        minimize: () => ipcRenderer.send('window:minimize'),
        maximize: () => ipcRenderer.send('window:maximize'),
        close: () => ipcRenderer.send('window:close')
    },

    // Applet management
    applet: {
        load: (manifest) => ipcRenderer.invoke('applet:load', manifest),
        switch: (appletId) => ipcRenderer.invoke('applet:switch', appletId),
        remove: (appletId) => ipcRenderer.invoke('applet:remove', appletId),
        list: () => ipcRenderer.invoke('applet:list'),
        hibernate: (appletId) => ipcRenderer.invoke('applet:hibernate', appletId),
        restore: (appletId) => ipcRenderer.invoke('applet:restore', appletId),

        // Listen for applet switch events (from global hotkeys)
        onSwitched: (callback) => {
            ipcRenderer.on('applet:switched', (event, appletId) => callback(appletId));
        },

        // Listen for applets restored (after startup restoration)
        onRestored: (callback) => {
            ipcRenderer.on('applets:restored', () => callback());
        }
    },

    // Cache operations
    cache: {
        get: (key) => ipcRenderer.invoke('cache:get', key),
        set: (key, value, ttl) => ipcRenderer.invoke('cache:set', key, value, ttl)
    },

    // Sidebar toggle listener
    onSidebarToggle: (callback) => {
        ipcRenderer.on('sidebar:toggle', () => callback());
    },

    // Views visibility control (for modal z-order)
    views: {
        hide: () => ipcRenderer.send('views:hide'),
        show: () => ipcRenderer.send('views:show')
    },

    // Store operations
    store: {
        clearApplets: () => ipcRenderer.invoke('store:clearApplets')
    }
});
