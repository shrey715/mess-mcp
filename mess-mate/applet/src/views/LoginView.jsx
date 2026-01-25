import React, { useState } from 'react';
import { login } from '../api';
import { ArrowRight, SquareTerminal } from 'lucide-react';

const LoginView = ({ setUser }) => {
    const [authKey, setAuthKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const user = await login(authKey);
            setUser(user);
            localStorage.setItem('user', JSON.stringify(user));
        } catch (err) {
            setError(err.response?.data?.error || "Authentication failed. Please check your key.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-[#FDFBF7]">
            <div className="w-full max-w-sm">

                {/* Logo Section */}
                <div className="text-center mb-10">
                    <div className="mx-auto w-16 h-16 bg-gradient-sunset rounded-2xl flex items-center justify-center shadow-lg shadow-[#EA2264]/20 mb-5 relative group">
                        <div className="absolute inset-0 bg-white rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity"></div>
                        <span className="text-white text-3xl font-extrabold tracking-tighter">M</span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-[#0D1164] tracking-tight mb-2">Mess Mate</h1>
                    <p className="text-[#640D5F] font-bold text-xs uppercase tracking-widest bg-[#640D5F]/5 px-3 py-1.5 rounded-full inline-block">
                        Sunset Edition
                    </p>
                </div>

                {/* Login Card */}
                <div className="bg-white p-8 rounded-3xl shadow-[0_10px_40px_-10px_rgba(13,17,100,0.1)] border border-gray-100">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[#0D1164] uppercase tracking-wider ml-1">
                                Authentication Key
                            </label>
                            <input
                                type="text"
                                value={authKey}
                                onChange={(e) => setAuthKey(e.target.value)}
                                placeholder="Paste your key here..."
                                className="input-clean w-full"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-xs font-bold border border-red-100 flex items-center justify-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !authKey.trim()}
                            className="btn-sunset-primary w-full flex items-center justify-center gap-2 py-3.5 mt-2 disabled:opacity-70 disabled:shadow-none"
                        >
                            {loading ? (
                                <span className="animate-pulse">Verifying...</span>
                            ) : (
                                <>Sign In <ArrowRight size={18} strokeWidth={2.5} /></>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer Link */}
                <p className="text-xs text-center text-gray-400 mt-8">
                    Get your key from{' '}
                    <a
                        href="https://mess.iiit.ac.in"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-[#EA2264] hover:underline decoration-2 underline-offset-2"
                    >
                        mess.iiit.ac.in
                    </a>
                </p>
            </div>
        </div>
    );
};

export default LoginView;
