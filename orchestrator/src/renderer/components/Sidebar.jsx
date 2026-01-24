import React, { useState } from 'react';

function Sidebar({
    applets,
    activeAppletId,
    collapsed,
    onSwitchApplet,
    onRemoveApplet,
    onHibernateApplet,
    onAddApplet
}) {
    const [contextMenu, setContextMenu] = useState(null);

    const handleContextMenu = (e, applet) => {
        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            applet
        });
    };

    const closeContextMenu = () => setContextMenu(null);

    return (
        <>
            <aside
                className={`
          ${collapsed ? 'w-0 opacity-0' : 'w-16'} 
          bg-shell-sidebar border-r border-zinc-800 
          flex flex-col items-center py-3 gap-2
          transition-all duration-200 ease-out overflow-hidden
        `}
            >
                {/* Applet Icons */}
                <div className="flex-1 flex flex-col items-center gap-2 overflow-y-auto">
                    {applets.map((applet, index) => (
                        <div key={applet.id} className="relative group">
                            <button
                                onClick={() => onSwitchApplet(applet.id)}
                                onContextMenu={(e) => handleContextMenu(e, applet)}
                                className={`
                relative w-11 h-11 rounded-xl flex items-center justify-center
                transition-all duration-150 ease-out tooltip
                ${activeAppletId === applet.id
                                        ? 'bg-shell-active ring-2 ring-accent shadow-lg shadow-accent/20'
                                        : 'bg-zinc-800/50 hover:bg-shell-hover'
                                    }
                ${applet.state === 'hibernated' ? 'opacity-60' : ''}
              `}
                                data-tooltip={`${applet.manifest?.name || applet.id} (Ctrl+${index + 1})`}
                                style={{
                                    '--applet-color': applet.manifest?.color || '#6366f1'
                                }}
                            >
                                {/* Applet Icon */}
                                <span className="text-xl">
                                    {applet.manifest?.icon || '📦'}
                                </span>

                                {/* Active Indicator */}
                                {activeAppletId === applet.id && (
                                    <div
                                        className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-accent"
                                    />
                                )}

                                {/* Hibernation Indicator */}
                                {applet.state === 'hibernated' && (
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-shell-sidebar">
                                        <span className="absolute inset-0 flex items-center justify-center text-[6px]">💤</span>
                                    </div>
                                )}

                                {/* Notification Badge (placeholder) */}
                                {applet.manifest?.hasNotification && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                        <span className="text-[10px] font-bold text-white">3</span>
                                    </div>
                                )}
                            </button>

                            {/* Remove button - appears on hover */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveApplet(applet.id);
                                }}
                                className="
                                absolute -top-1 -right-1 w-4 h-4 
                                bg-red-500 hover:bg-red-400 
                                rounded-full flex items-center justify-center
                                opacity-0 group-hover:opacity-100
                                transition-opacity duration-150
                                text-white text-xs font-bold
                                shadow-lg
                            "
                                title="Remove applet"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>

                {/* Add Applet Button */}
                <button
                    onClick={onAddApplet}
                    className="
            w-11 h-11 rounded-xl bg-zinc-800/30 
            flex items-center justify-center
            text-zinc-500 hover:text-zinc-300 hover:bg-shell-hover
            transition-all duration-150 border border-dashed border-zinc-700
            hover:border-accent hover:text-accent
          "
                    title="Add Applet"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </aside>

            {/* Context Menu */}
            {contextMenu && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={closeContextMenu}
                    />
                    <div
                        className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[160px] animate-fadeIn"
                        style={{ left: contextMenu.x, top: contextMenu.y }}
                    >
                        <button
                            onClick={() => {
                                onSwitchApplet(contextMenu.applet.id);
                                closeContextMenu();
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-shell-hover flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Open
                        </button>

                        {contextMenu.applet.state === 'active' ? (
                            <button
                                onClick={() => {
                                    onHibernateApplet(contextMenu.applet.id);
                                    closeContextMenu();
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-shell-hover flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                                Hibernate
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    onSwitchApplet(contextMenu.applet.id);
                                    closeContextMenu();
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-shell-hover flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                                </svg>
                                Wake Up
                            </button>
                        )}

                        <div className="h-px bg-zinc-700 my-1" />

                        <button
                            onClick={() => {
                                onRemoveApplet(contextMenu.applet.id);
                                closeContextMenu();
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Remove
                        </button>
                    </div>
                </>
            )}
        </>
    );
}

export default Sidebar;
