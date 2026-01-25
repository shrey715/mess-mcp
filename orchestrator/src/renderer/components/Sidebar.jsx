import React, { useState } from 'react';
import * as LucideIcons from 'lucide-react';

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

    const renderIcon = (iconName, isActive) => {
        const Icon = LucideIcons[iconName];
        if (Icon) {
            return <Icon
                size={24}
                strokeWidth={isActive ? 2 : 1.5}
                className={`transition-all duration-300 ease-snappy ${isActive ? 'scale-100' : 'scale-90'}`}
            />;
        }
        return <span className={`text-2xl transition-all duration-300 ease-snappy ${isActive ? 'scale-100' : 'scale-90'}`}>{iconName || '📦'}</span>;
    };

    return (
        <>
            <aside
                className={`
          ${collapsed ? 'w-0 opacity-0' : 'w-[72px]'} 
          bg-shell-sidebar border-r border-white/5
          flex flex-col items-center py-4 gap-4
          transition-all duration-300 ease-snappy
          z-20
        `}
            >
                {/* Applet Icons */}
                <div className="flex-1 flex flex-col items-center gap-3 w-full overflow-y-auto overflow-x-hidden no-scrollbar">
                    {applets.map((applet, index) => (
                        <div key={applet.id} className="relative group flex justify-center w-full px-3">
                            {/* Active Indicator (Dot) */}
                            <div
                                className={`
                                    absolute -left-[1px] top-1/2 -translate-y-1/2 
                                    w-1 h-6 bg-accent rounded-r-sm
                                    transition-all duration-300 ease-snappy
                                    ${activeAppletId === applet.id ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'}
                                `}
                            />

                            <button
                                onClick={() => onSwitchApplet(applet.id)}
                                onContextMenu={(e) => handleContextMenu(e, applet)}
                                className={`
                relative w-12 h-12 flex items-center justify-center
                transition-all duration-200 ease-snappy
                hover:scale-105 active:scale-95
                ${activeAppletId === applet.id
                                        ? 'bg-accent text-white shadow-lg shadow-accent/20 rounded-xl'
                                        : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-100 rounded-xl'
                                    }
                ${applet.state === 'hibernated' ? 'opacity-40 grayscale' : ''}
                border border-transparent
                ${activeAppletId === applet.id ? 'border-accent/50' : 'hover:border-white/5'}
              `}
                                data-tooltip={`${applet.manifest?.name || applet.id} (Ctrl+${index + 1})`}
                            >
                                {/* Applet Icon */}
                                {renderIcon(applet.manifest?.icon, activeAppletId === applet.id)}

                                {/* Hibernation Indicator */}
                                {applet.state === 'hibernated' && (
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-shell-sidebar rounded-full flex items-center justify-center border border-white/10">
                                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                                    </div>
                                )}

                                {/* Notification Badge */}
                                {applet.manifest?.hasNotification && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center border-2 border-shell-sidebar text-[9px] font-bold text-white">
                                        !
                                    </div>
                                )}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Add Applet Button */}
                <button
                    onClick={onAddApplet}
                    className="
            w-12 h-12 rounded-xl bg-transparent 
            flex items-center justify-center
            text-zinc-600 hover:text-white hover:bg-white/5
            transition-all duration-200 ease-snappy border border-zinc-800 hover:border-white/10
            active:scale-95
          "
                    title="Add Applet"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
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
                        className="fixed z-50 bg-zinc-900 border border-white/10 rounded-lg shadow-2xl py-1 w-48 animate-in fade-in zoom-in-95 duration-100 ease-out origin-top-left"
                        style={{ top: contextMenu.y, left: contextMenu.x + 10 }}
                    >
                        <div className="px-2 py-1.5 border-b border-white/5 mb-1 bg-white/5 rounded-t-lg mx-[-1px] mt-[-1px]">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 pl-2">
                                {contextMenu.applet.manifest?.name || 'Applet'}
                            </span>
                        </div>

                        <button
                            onClick={() => {
                                onSwitchApplet(contextMenu.applet.id);
                                closeContextMenu();
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-accent hover:text-white flex items-center gap-2 transition-colors group"
                        >
                            <LucideIcons.ExternalLink size={14} className="text-zinc-500 group-hover:text-white transition-colors" />
                            <span>Open</span>
                        </button>

                        {contextMenu.applet.state === 'active' ? (
                            <button
                                onClick={() => {
                                    onHibernateApplet(contextMenu.applet.id);
                                    closeContextMenu();
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-accent hover:text-white flex items-center gap-2 transition-colors group"
                            >
                                <LucideIcons.Moon size={14} className="text-zinc-500 group-hover:text-white transition-colors" />
                                <span>Hibernate</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    onSwitchApplet(contextMenu.applet.id);
                                    closeContextMenu();
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-accent hover:text-white flex items-center gap-2 transition-colors group"
                            >
                                <LucideIcons.Sun size={14} className="text-zinc-500 group-hover:text-white transition-colors" />
                                <span>Wake Up</span>
                            </button>
                        )}

                        <div className="h-px bg-white/5 my-1 mx-2" />

                        <button
                            onClick={() => {
                                onRemoveApplet(contextMenu.applet.id);
                                closeContextMenu();
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500 hover:text-white flex items-center gap-2 transition-colors group"
                        >
                            <LucideIcons.Trash2 size={14} className="text-red-400 group-hover:text-white transition-colors" />
                            <span>Remove</span>
                        </button>
                    </div>
                </>
            )}
        </>
    );
}

export default Sidebar;
