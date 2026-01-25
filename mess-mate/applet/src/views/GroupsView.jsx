import React, { useState, useEffect } from 'react';
import { createGroup, joinGroup, getMyGroup } from '../api';
import { Users, Copy, Check, Hash, Plus, ArrowRight, ShieldCheck } from 'lucide-react';

const GroupsView = ({ user }) => {
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [joinCode, setJoinCode] = useState('');
    const [createName, setCreateName] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadGroup();
    }, [user]);

    const loadGroup = async () => {
        try {
            const data = await getMyGroup(user._id);
            setGroup(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!createName) return;
        try {
            const newGroup = await createGroup(createName, user._id);
            setGroup(newGroup);
        } catch (e) { alert("Failed to create group"); }
    };

    const handleJoin = async () => {
        if (!joinCode) return;
        try {
            const newGroup = await joinGroup(joinCode, user._id);
            setGroup(newGroup);
        } catch (e) { alert("Failed to join group"); }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(group.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) return (
        <div className="flex flex-col h-[50vh] items-center justify-center text-gray-400 gap-3">
            <div className="w-10 h-10 border-4 border-[#0D1164]/20 border-t-[#0D1164] rounded-full animate-spin"></div>
            <span className="text-sm font-medium">Loading Circle...</span>
        </div>
    );

    if (!group) {
        return (
            <div className="space-y-6">
                <div className="text-center py-6">
                    <div className="w-16 h-16 bg-[#F3F4F6] rounded-full flex items-center justify-center mx-auto mb-4 text-[#0D1164]">
                        <Users size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-[#0D1164]">Join a Circle</h2>
                    <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto">
                        Sync mess attendance with your friends and never eat alone.
                    </p>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 space-y-8">
                    {/* Join Section */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-[#EA2264] uppercase tracking-wider">Have a code?</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={joinCode}
                                onChange={e => setJoinCode(e.target.value)}
                                placeholder="XYZ123"
                                className="input-clean flex-1 font-mono uppercase text-center tracking-widest text-lg"
                                maxLength={6}
                            />
                            <button
                                onClick={handleJoin}
                                disabled={!joinCode}
                                className="btn-sunset-primary px-6 disabled:opacity-50"
                            >
                                Join
                            </button>
                        </div>
                    </div>

                    <div className="relative flex items-center gap-4">
                        <div className="h-px bg-gray-100 flex-1"></div>
                        <span className="text-xs text-gray-400 font-bold bg-white px-2">OR</span>
                        <div className="h-px bg-gray-100 flex-1"></div>
                    </div>

                    {/* Create Section */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-[#0D1164] uppercase tracking-wider">Start a new circle</label>
                        <div className="flex flex-col gap-3">
                            <input
                                type="text"
                                placeholder="Group Name (e.g. The Stoners)"
                                value={createName}
                                onChange={e => setCreateName(e.target.value)}
                                className="input-clean w-full"
                            />
                            <button
                                onClick={handleCreate}
                                disabled={!createName}
                                className="btn-sunset-secondary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50"
                            >
                                <Plus size={18} /> Create New Circle
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Group Header */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <span className="inline-block px-2 py-1 rounded-md bg-[#F3F4F6] text-[#0D1164] text-[10px] font-bold uppercase tracking-wider mb-2">
                            Active Circle
                        </span>
                        <h2 className="text-2xl font-bold text-[#0D1164] tracking-tight leading-none">{group.name}</h2>
                    </div>
                    <div
                        onClick={copyCode}
                        className="flex flex-col items-center justify-center bg-[#FFF0F5] border border-[#EA2264]/20 rounded-xl p-3 cursor-pointer hover:bg-[#EA2264] hover:text-white transition-all group"
                    >
                        <span className="font-mono text-xl font-bold tracking-widest group-hover:text-white text-[#EA2264]">{group.code}</span>
                        <div className="flex items-center gap-1 text-[9px] font-bold uppercase mt-1 group-hover:text-white/80 text-[#EA2264]/70">
                            {copied ? <Check size={10} /> : <Copy size={10} />}
                            {copied ? 'Copied' : 'Copy Code'}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500 bg-[#F8F9FF] p-3 rounded-xl border border-[#0D1164]/5">
                    <ShieldCheck size={16} className="text-[#640D5F]" />
                    <p>Share this code with friends to add them.</p>
                </div>
            </div>

            {/* Members List */}
            <div>
                <div className="flex justify-between items-end mb-3 px-1">
                    <h3 className="text-sm font-bold text-[#0D1164] uppercase tracking-wide">Members</h3>
                    <span className="text-xs font-medium text-gray-400">{group.members.length} people</span>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                    {group.members.map((member) => (
                        <div key={member._id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 bg-gradient-sunset rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm border-2 border-white">
                                    {member.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-[#0D1164]">{member.name}</p>
                                    <p className="text-xs text-gray-400">{member.email.split('@')[0]}</p>
                                </div>
                            </div>

                            {/* Status Indicator (Mock for now, could be real stats later) */}
                            <div className="flex flex-col items-end">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-600 text-[9px] font-bold uppercase border border-green-100">
                                    <span className="w-1 h-1 rounded-full bg-green-500"></span> Online
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GroupsView;
