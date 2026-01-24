const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path = require('path');
const ViewManager = require('./ViewManager');
const IPCRouter = require('./IPCRouter');
const CacheStore = require('./CacheStore');
const Store = require('electron-store');

const store = new Store();

let mainWindow = null;
let viewManager = null;
let ipcRouter = null;
let cacheStore = null;
let appletsRestored = false; // Flag to prevent duplicate restores on HMR

const isDev = process.env.NODE_ENV !== 'production' || !app.isPackaged;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        frame: false,
        titleBarStyle: 'hidden',
        backgroundColor: '#0f0f0f',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload-shell.js')
        }
    });

    // Load the Shell UI
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
        mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
    }

    // Initialize managers
    viewManager = new ViewManager(mainWindow);
    ipcRouter = new IPCRouter(viewManager);
    cacheStore = new CacheStore();

    setupIPC();
    registerGlobalHotkeys();

    // Wait for the renderer to be ready before restoring applets
    mainWindow.webContents.on('did-finish-load', () => {
        restoreApplets();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
        viewManager = null;
    });
}

function setupIPC() {
    // Window controls
    ipcMain.on('window:minimize', () => mainWindow?.minimize());
    ipcMain.on('window:maximize', () => {
        if (mainWindow?.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow?.maximize();
        }
    });
    ipcMain.on('window:close', () => mainWindow?.close());

    ipcMain.handle('applet:load', async (event, manifest) => {
        const result = await viewManager.loadApplet(manifest);
        if (result.success) {
            saveApplets();
        }
        return result;
    });

    ipcMain.handle('applet:switch', async (event, appletId) => {
        return viewManager.switchTo(appletId);
    });

    ipcMain.handle('applet:remove', async (event, appletId) => {
        const result = await viewManager.removeApplet(appletId);
        if (result.success) {
            saveApplets();
        }
        return result;
    });

    ipcMain.handle('applet:list', async () => {
        return viewManager.listApplets();
    });

    ipcMain.handle('applet:hibernate', async (event, appletId) => {
        return viewManager.hibernateApplet(appletId);
    });

    ipcMain.handle('applet:restore', async (event, appletId) => {
        return viewManager.restoreApplet(appletId);
    });

    // Cache operations
    ipcMain.handle('cache:get', async (event, key) => {
        return cacheStore.get(key);
    });

    ipcMain.handle('cache:set', async (event, key, value, ttl) => {
        return cacheStore.set(key, value, ttl);
    });

    // MessagePort pipe creation for A2A communication
    ipcMain.handle('ipc:createPipe', async (event, fromAppletId, toAppletId) => {
        return ipcRouter.createPipe(fromAppletId, toAppletId);
    });

    // Send message to a specific applet
    ipcMain.handle('ipc:sendToApplet', async (event, targetAppletId, message) => {
        return ipcRouter.sendToApplet(targetAppletId, message);
    });

    // SharedArrayBuffer allocation
    ipcMain.handle('memory:allocate', async (event, size) => {
        return ipcRouter.allocateSharedBuffer(size);
    });

    ipcMain.handle('memory:release', async (event, bufferId) => {
        return ipcRouter.releaseSharedBuffer(bufferId);
    });

    // Clear all saved applets (for debugging/reset)
    ipcMain.handle('store:clearApplets', async () => {
        store.delete('applets');
        console.log('Cleared all saved applets from store');
        return { success: true };
    });

    // Hide/show all views (for modal z-order fix)
    ipcMain.on('views:hide', () => {
        viewManager.hideAllViews();
    });

    ipcMain.on('views:show', () => {
        viewManager.showActiveView();
    });
}

function registerGlobalHotkeys() {
    // Register Ctrl/Cmd + 1-9 for quick switching
    for (let i = 1; i <= 9; i++) {
        globalShortcut.register(`CommandOrControl+${i}`, () => {
            const applets = viewManager?.listApplets() || [];
            if (applets[i - 1]) {
                viewManager.switchTo(applets[i - 1].id);
                mainWindow?.webContents.send('applet:switched', applets[i - 1].id);
            }
        });
    }

    // Quick toggle sidebar
    globalShortcut.register('CommandOrControl+B', () => {
        mainWindow?.webContents.send('sidebar:toggle');
    });
}

app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
    globalShortcut.unregisterAll();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

function saveApplets() {
    const applets = viewManager.listApplets().map(a => a.manifest);
    store.set('applets', applets);
    console.log(`Saved ${applets.length} applets to store:`, applets.map(a => a.id));
}

async function restoreApplets() {
    // Prevent duplicate restores (HMR triggers did-finish-load multiple times)
    if (appletsRestored) {
        console.log('Applets already restored, skipping...');
        return;
    }
    appletsRestored = true;

    const savedApplets = store.get('applets', []);
    console.log(`Restoring ${savedApplets.length} applets from store:`, savedApplets.map(a => a.id));

    if (savedApplets.length === 0) {
        console.log('No saved applets to restore');
        return;
    }

    // Load each applet sequentially with a small delay to avoid race conditions
    for (let i = 0; i < savedApplets.length; i++) {
        const manifest = savedApplets[i];
        try {
            console.log(`Restoring applet ${i + 1}/${savedApplets.length}: ${manifest.id}`);
            const result = await viewManager.loadApplet(manifest, false);
            if (!result.success) {
                console.error(`Failed to restore applet ${manifest.id}:`, result.error);
            }
            // Small delay between loads to avoid overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error(`Error restoring applet ${manifest.id}:`, error);
        }
    }

    // Switch to the first applet after all are loaded
    const loadedApplets = viewManager.listApplets();
    if (loadedApplets.length > 0) {
        viewManager.switchTo(loadedApplets[0].id);
        mainWindow?.webContents.send('applet:switched', loadedApplets[0].id);
        console.log(`Switched to first applet: ${loadedApplets[0].id}`);
    }

    // Notify renderer that restoration is complete so it can refresh the UI
    mainWindow?.webContents.send('applets:restored');
    console.log('Applet restoration complete, notified renderer');
}
