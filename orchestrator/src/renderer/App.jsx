import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import AddAppletModal from './components/AddAppletModal';
import EmptyState from './components/EmptyState';

// Default applet manifests for quick start
const defaultApplets = [
    // IPC Demo applets
    {
        id: 'unified-calendar',
        name: '📅 Unified Calendar',
        url: 'http://localhost:3456/calendar/index.html',
        icon: '📅',
        color: '#8b5cf6',
        permissions: ['ipc']
    },
    {
        id: 'sender-demo',
        name: '📤 IPC Sender Demo',
        url: 'http://localhost:3456/sender.html',
        icon: '📤',
        color: '#6366f1',
        permissions: ['ipc']
    },
    {
        id: 'receiver-demo',
        name: '📥 IPC Receiver Demo',
        url: 'http://localhost:3456/receiver.html',
        icon: '📥',
        color: '#22c55e',
        permissions: ['ipc']
    },
    // Regular applets
    {
        id: 'google-calendar',
        name: 'Google Calendar',
        url: 'https://calendar.google.com',
        icon: '📅',
        color: '#4285f4',
        permissions: ['ipc', 'notifications']
    },
    {
        id: 'gmail',
        name: 'Gmail',
        url: 'https://mail.google.com',
        icon: '📧',
        color: '#ea4335',
        permissions: ['ipc', 'notifications']
    },
    {
        id: 'slack',
        name: 'Slack',
        url: 'https://app.slack.com',
        icon: '💬',
        color: '#4a154b',
        permissions: ['ipc', 'notifications']
    },
    {
        id: 'notion',
        name: 'Notion',
        url: 'https://notion.so',
        icon: '📝',
        color: '#000000',
        permissions: ['ipc']
    },
    {
        "id": "github",
        "name": "GitHub",
        "url": "https://github.com",
        "icon": "🐙",
        "color": "#24292e",
        "permissions": ["ipc"]
    },
    {
        "id": "liha",
        "name": "LIHA",
        "url": "http://localhost:3456/liha/index.html",
        "icon": "📚",
        "color": "#8b5cf6",
        "permissions": ["ipc", "notifications"]
    },
    {
        "id": "local-calendar",
        "name": "Unified Calendar",
        "url": "http://localhost:3456/calendar/index.html",
        "icon": "📅",
        "color": "#22c55e",
        "permissions": ["ipc", "notifications"]
    }
];


function App() {
    const [applets, setApplets] = useState([]);
    const [activeAppletId, setActiveAppletId] = useState(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [loading, setLoading] = useState(false);

    // Fetch current applets on mount
    useEffect(() => {
        fetchApplets();

        // Listen for applet switch from global hotkeys
        window.shell?.applet.onSwitched((appletId) => {
            setActiveAppletId(appletId);
        });

        // Listen for applets restored (after startup restoration)
        window.shell?.applet.onRestored(() => {
            console.log('Applets restored event received, refreshing list...');
            fetchApplets();
        });

        // Listen for sidebar toggle
        window.shell?.onSidebarToggle(() => {
            setSidebarCollapsed(prev => !prev);
        });
    }, []);

    const fetchApplets = async () => {
        try {
            const list = await window.shell?.applet.list();
            if (list) {
                setApplets(list);
                if (list.length > 0 && !activeAppletId) {
                    setActiveAppletId(list[0].id);
                }
            }
        } catch (error) {
            console.error('Failed to fetch applets:', error);
        }
    };

    const handleLoadApplet = async (manifest) => {
        setLoading(true);
        try {
            const result = await window.shell?.applet.load(manifest);
            if (result?.success) {
                await fetchApplets();
                setActiveAppletId(manifest.id);
                setShowAddModal(false);
                window.shell?.views.show();
            } else {
                console.error('Failed to load applet:', result?.error);
            }
        } catch (error) {
            console.error('Error loading applet:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSwitchApplet = useCallback(async (appletId) => {
        try {
            const result = await window.shell?.applet.switch(appletId);
            if (result?.success) {
                setActiveAppletId(appletId);
            }
        } catch (error) {
            console.error('Error switching applet:', error);
        }
    }, []);

    const handleRemoveApplet = async (appletId) => {
        try {
            const result = await window.shell?.applet.remove(appletId);
            if (result?.success) {
                await fetchApplets();
                if (activeAppletId === appletId) {
                    const remaining = applets.filter(a => a.id !== appletId);
                    setActiveAppletId(remaining[0]?.id || null);
                }
            }
        } catch (error) {
            console.error('Error removing applet:', error);
        }
    };

    const handleHibernateApplet = async (appletId) => {
        try {
            await window.shell?.applet.hibernate(appletId);
            await fetchApplets();
        } catch (error) {
            console.error('Error hibernating applet:', error);
        }
    };

    const activeApplet = applets.find(a => a.id === activeAppletId);

    // Modal handlers that hide/show BrowserViews to fix z-order
    const openModal = () => {
        window.shell?.views.hide();
        setShowAddModal(true);
    };

    const closeModal = () => {
        setShowAddModal(false);
        window.shell?.views.show();
    };

    return (
        <div className="h-full flex flex-col bg-shell-bg">
            {/* Header / Title Bar */}
            <Header
                activeApplet={activeApplet}
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={() => setSidebarCollapsed(prev => !prev)}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <Sidebar
                    applets={applets}
                    activeAppletId={activeAppletId}
                    collapsed={sidebarCollapsed}
                    onSwitchApplet={handleSwitchApplet}
                    onRemoveApplet={handleRemoveApplet}
                    onHibernateApplet={handleHibernateApplet}
                    onAddApplet={openModal}
                />

                {/* Applet View Area (WebContentsView is rendered by Electron, this is just the container) */}
                <div className="flex-1 relative">
                    {applets.length === 0 && (
                        <EmptyState onAddApplet={openModal} />
                    )}

                    {/* This area is where Electron renders the WebContentsView */}
                    {/* The views are positioned absolutely by ViewManager */}
                </div>
            </div>

            {/* Add Applet Modal */}
            {showAddModal && (
                <AddAppletModal
                    defaultApplets={defaultApplets}
                    loadedAppletIds={applets.map(a => a.id)}
                    onLoad={handleLoadApplet}
                    onClose={closeModal}
                    loading={loading}
                />
            )}
        </div>
    );
}

export default App;
