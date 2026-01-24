import React from 'react';

function EmptyState({ onAddApplet }) {
    return (
        <div className="h-full flex flex-col items-center justify-center text-center px-8">
            <div className="relative mb-6">
                {/* Floating icons animation */}
                <div className="absolute -top-4 -left-8 text-3xl animate-bounce" style={{ animationDelay: '0s' }}>📧</div>
                <div className="absolute -top-2 right-0 text-3xl animate-bounce" style={{ animationDelay: '0.2s' }}>📅</div>
                <div className="absolute bottom-0 -left-4 text-3xl animate-bounce" style={{ animationDelay: '0.4s' }}>💬</div>

                {/* Main icon */}
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-accent/20 to-purple-500/20 border border-accent/30 flex items-center justify-center">
                    <svg className="w-12 h-12 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                </div>
            </div>

            <h2 className="text-xl font-semibold text-white mb-2">
                Welcome to Orchestrator
            </h2>

            <p className="text-zinc-400 max-w-md mb-6">
                Combine all your favorite web apps into one powerful workspace.
                Add Gmail, Slack, Calendar, and more – all running simultaneously
                with instant switching.
            </p>

            <button
                onClick={onAddApplet}
                className="
          px-6 py-3 rounded-xl font-medium
          bg-gradient-to-r from-accent to-purple-500
          hover:from-accent-hover hover:to-purple-400
          text-white shadow-lg shadow-accent/25
          transition-all duration-200 hover:shadow-xl hover:shadow-accent/30
          hover:-translate-y-0.5
          flex items-center gap-2
        "
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Your First Applet
            </button>

            {/* Feature highlights */}
            <div className="grid grid-cols-3 gap-6 mt-12 max-w-lg">
                <div className="text-center">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-2">
                        <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <p className="text-xs text-zinc-500">Zero-copy IPC</p>
                </div>

                <div className="text-center">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-2">
                        <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                    </div>
                    <p className="text-xs text-zinc-500">Smart Hibernate</p>
                </div>

                <div className="text-center">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-2">
                        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <p className="text-xs text-zinc-500">Global Hotkeys</p>
                </div>
            </div>
        </div>
    );
}

export default EmptyState;
