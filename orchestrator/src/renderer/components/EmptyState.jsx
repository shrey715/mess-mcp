import React from 'react';
import * as LucideIcons from 'lucide-react';

function EmptyState({ onAddApplet }) {
    return (
        <div className="h-full flex flex-col items-center justify-center text-center px-8">
            <div className="relative mb-6">
                {/* Floating icons animation */}
                <div className="absolute -top-4 -left-8 text-accent/30 animate-bounce" style={{ animationDelay: '0s' }}>
                    <LucideIcons.Mail size={32} />
                </div>
                <div className="absolute -top-2 right-0 text-purple-500/30 animate-bounce" style={{ animationDelay: '0.2s' }}>
                    <LucideIcons.Calendar size={32} />
                </div>
                <div className="absolute bottom-0 -left-4 text-blue-500/30 animate-bounce" style={{ animationDelay: '0.4s' }}>
                    <LucideIcons.MessageSquare size={32} />
                </div>

                {/* Main icon */}
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-accent/20 to-purple-500/20 border border-accent/30 flex items-center justify-center shadow-lg shadow-accent/10">
                    <LucideIcons.LayoutGrid size={48} className="text-accent" />
                </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
                Welcome to OnlyApps
            </h2>

            <p className="text-zinc-400 max-w-md mb-8 leading-relaxed">
                Combine all your favorite web apps into one powerful workspace.
                Add custom services or choose from the gallery.
            </p>

            <button
                onClick={onAddApplet}
                className="
          px-6 py-3 rounded-xl font-medium
          bg-gradient-to-r from-accent to-purple-600
          hover:from-accent-hover hover:to-purple-500
          text-white shadow-lg shadow-accent/25
          transition-all duration-200 hover:shadow-xl hover:shadow-accent/30
          hover:-translate-y-0.5 active:scale-95
          flex items-center gap-2
        "
            >
                <LucideIcons.Plus size={20} strokeWidth={2.5} />
                Add Your First Applet
            </button>

            {/* Feature highlights */}
            <div className="grid grid-cols-3 gap-6 mt-12 max-w-lg w-full">
                <div className="text-center group">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-2 group-hover:bg-emerald-500/20 transition-colors">
                        <LucideIcons.Zap size={20} className="text-emerald-400" />
                    </div>
                    <p className="text-xs font-medium text-zinc-500 group-hover:text-zinc-300 transition-colors">Zero-copy IPC</p>
                </div>

                <div className="text-center group">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-2 group-hover:bg-amber-500/20 transition-colors">
                        <LucideIcons.Moon size={20} className="text-amber-400" />
                    </div>
                    <p className="text-xs font-medium text-zinc-500 group-hover:text-zinc-300 transition-colors">Smart Hibernate</p>
                </div>

                <div className="text-center group">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-2 group-hover:bg-blue-500/20 transition-colors">
                        <LucideIcons.Command size={20} className="text-blue-400" />
                    </div>
                    <p className="text-xs font-medium text-zinc-500 group-hover:text-zinc-300 transition-colors">Global Hotkeys</p>
                </div>
            </div>
        </div>
    );
}

export default EmptyState;
