import * as LucideIcons from 'lucide-react';

function Header({ activeApplet, sidebarCollapsed, onToggleSidebar }) {
    const renderIcon = (iconName) => {
        const Icon = LucideIcons[iconName];
        if (Icon) return <Icon size={14} strokeWidth={1.5} />;
        return <span className="text-xs">{iconName || '🌍'}</span>;
    };

    return (
        <header className="h-10 bg-shell-bg border-b border-white/5 flex items-center px-4 drag-region z-10 select-none">
            {/* Window Controls (macOS style - desaturated) */}
            <div className="flex items-center gap-2 no-drag group opacity-80 hover:opacity-100 transition-opacity w-[70px]">
                <button
                    onClick={() => window.shell?.window.close()}
                    className="w-3 h-3 rounded-full bg-zinc-700/50 group-hover:bg-[#ff5f56] border border-transparent group-hover:border-[#e0443e] transition-colors"
                />
                <button
                    onClick={() => window.shell?.window.minimize()}
                    className="w-3 h-3 rounded-full bg-zinc-700/50 group-hover:bg-[#ffbd2e] border border-transparent group-hover:border-[#dea123] transition-colors"
                />
                <button
                    onClick={() => window.shell?.window.maximize()}
                    className="w-3 h-3 rounded-full bg-zinc-700/50 group-hover:bg-[#27c93f] border border-transparent group-hover:border-[#1aab29] transition-colors"
                />
            </div>

            {/* Browser Address Bar */}
            <div className="flex-1 flex items-center justify-center pointer-events-none no-drag">
                {activeApplet ? (
                    <div className="flex items-center gap-2 px-3 py-1 bg-surface border border-white/5 rounded-md shadow-sm min-w-[240px] max-w-[400px] justify-center group/url pointer-events-auto transition-all hover:border-white/10">
                        <span className="text-xs grayscale opacity-50 group-hover/url:grayscale-0 group-hover/url:opacity-100 transition-all">
                            {renderIcon(activeApplet.manifest?.icon)}
                        </span>
                        <span className="text-[11px] font-medium text-zinc-400 tracking-wide font-mono truncate max-w-[200px] group-hover/url:text-zinc-200 transition-colors">
                            {activeApplet.manifest?.url.replace(/^https?:\/\//, '')}
                        </span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-zinc-700">
                        <span className="text-[11px] font-bold tracking-[0.2em] uppercase">OnlyApps</span>
                    </div>
                )}
            </div>

            {/* Right Controls */}
            <div className="flex items-center justify-end no-drag w-[60px]">
                <button
                    onClick={onToggleSidebar}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/10 transition-all active:scale-95"
                    title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <svg
                        className={`w-4 h-4 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                </button>
            </div>
        </header>
    );
}

export default Header;
