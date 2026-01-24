import React, { useState } from 'react';

function AddAppletModal({ defaultApplets, loadedAppletIds, onLoad, onClose, loading }) {
    const [customUrl, setCustomUrl] = useState('');
    const [customName, setCustomName] = useState('');
    const [activeTab, setActiveTab] = useState('gallery');

    const handleLoadCustom = () => {
        console.log('handleLoadCustom called, customUrl:', customUrl);
        if (!customUrl) return;

        const manifest = {
            id: customName.toLowerCase().replace(/\s+/g, '-') || `custom-${Date.now()}`,
            name: customName || 'Custom App',
            url: customUrl.startsWith('http') ? customUrl : `https://${customUrl}`,
            icon: '🌐',
            color: '#6366f1',
            permissions: ['ipc']
        };

        console.log('Calling onLoad with manifest:', manifest);
        onLoad(manifest);
    };

    const handleGalleryClick = (applet) => {
        console.log('Gallery item clicked:', applet);
        onLoad(applet);
    };

    const availableApplets = defaultApplets.filter(a => !loadedAppletIds.includes(a.id));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-shell-sidebar border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-fadeIn overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700">
                    <h2 className="text-lg font-semibold text-white">Add Applet</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-shell-hover transition-colors text-zinc-400 hover:text-white"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-zinc-700">
                    <button
                        onClick={() => setActiveTab('gallery')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'gallery'
                            ? 'text-accent border-b-2 border-accent'
                            : 'text-zinc-400 hover:text-white'
                            }`}
                    >
                        Popular Services
                    </button>
                    <button
                        onClick={() => setActiveTab('custom')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'custom'
                            ? 'text-accent border-b-2 border-accent'
                            : 'text-zinc-400 hover:text-white'
                            }`}
                    >
                        Custom URL
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 max-h-80 overflow-y-auto">
                    {activeTab === 'gallery' ? (
                        <div className="grid grid-cols-2 gap-3">
                            {availableApplets.length > 0 ? (
                                availableApplets.map(applet => (
                                    <button
                                        key={applet.id}
                                        onClick={() => handleGalleryClick(applet)}
                                        disabled={loading}
                                        className="
                      flex items-center gap-3 p-3 rounded-xl
                      bg-zinc-800/50 border border-zinc-700
                      hover:border-accent hover:bg-shell-hover
                      transition-all duration-150
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                                    >
                                        <span
                                            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                                            style={{ backgroundColor: applet.color + '20' }}
                                        >
                                            {applet.icon}
                                        </span>
                                        <span className="text-sm font-medium text-zinc-200 text-left">
                                            {applet.name}
                                        </span>
                                    </button>
                                ))
                            ) : (
                                <div className="col-span-2 text-center py-8 text-zinc-500">
                                    All popular services are already added!
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    Name (optional)
                                </label>
                                <input
                                    type="text"
                                    value={customName}
                                    onChange={(e) => setCustomName(e.target.value)}
                                    placeholder="My Custom App"
                                    className="
                    w-full px-4 py-2.5 rounded-lg
                    bg-zinc-800 border border-zinc-700
                    text-white placeholder-zinc-500
                    focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent
                    transition-colors
                  "
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    URL
                                </label>
                                <input
                                    type="text"
                                    value={customUrl}
                                    onChange={(e) => setCustomUrl(e.target.value)}
                                    placeholder="https://example.com"
                                    className="
                    w-full px-4 py-2.5 rounded-lg
                    bg-zinc-800 border border-zinc-700
                    text-white placeholder-zinc-500
                    focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent
                    transition-colors
                  "
                                />
                            </div>

                            <button
                                onClick={handleLoadCustom}
                                disabled={!customUrl || loading}
                                className="
                  w-full py-3 rounded-lg font-medium
                  bg-accent hover:bg-accent-hover
                  text-white
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors
                "
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Loading...
                                    </span>
                                ) : (
                                    'Add Applet'
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Tip */}
                <div className="px-6 py-3 bg-zinc-800/50 border-t border-zinc-700">
                    <p className="text-xs text-zinc-500 text-center">
                        💡 Tip: Use <kbd className="px-1.5 py-0.5 bg-zinc-700 rounded text-zinc-300">Ctrl+1-9</kbd> to quickly switch between applets
                    </p>
                </div>
            </div>
        </div>
    );
}

export default AddAppletModal;
