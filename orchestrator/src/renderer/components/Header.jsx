import React from 'react';

function Header({ activeApplet, sidebarCollapsed, onToggleSidebar }) {
    return (
        <header className="h-10 bg-shell-sidebar border-b border-zinc-800 flex items-center px-2 drag-region">
            {/* Window Controls (macOS style, but works on all platforms) */}
            <div className="flex items-center gap-2 no-drag">
                <button
                    onClick={() => window.shell?.window.close()}
                    className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
                    title="Close"
                />
                <button
                    onClick={() => window.shell?.window.minimize()}
                    className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors"
                    title="Minimize"
                />
                <button
                    onClick={() => window.shell?.window.maximize()}
                    className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors"
                    title="Maximize"
                />
            </div>

            {/* Sidebar Toggle */}
            <button
                onClick={onToggleSidebar}
                className="ml-4 p-1.5 rounded hover:bg-shell-hover transition-colors no-drag"
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
                <svg
                    className={`w-4 h-4 text-zinc-400 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
            </button>

            {/* Active Applet Info */}
            <div className="flex-1 flex items-center justify-center">
                {activeApplet && (
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-lg">{activeApplet.manifest?.icon || '📦'}</span>
                        <span className="text-zinc-300 font-medium">
                            {activeApplet.manifest?.name || activeApplet.id}
                        </span>
                        {activeApplet.state === 'hibernated' && (
                            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                                Hibernated
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Status Indicators */}
            <div className="flex items-center gap-3 no-drag">
                {/* Memory Usage Indicator */}
                {activeApplet?.memoryUsage > 0 && (
                    <div className="text-xs text-zinc-500">
                        {Math.round(activeApplet.memoryUsage / 1024)} MB
                    </div>
                )}

                {/* Connection Status */}
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-zinc-500">Connected</span>
                </div>
            </div>
        </header>
    );
}

export default Header;
