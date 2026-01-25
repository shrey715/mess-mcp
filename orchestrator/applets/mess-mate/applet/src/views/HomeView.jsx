import React, { useState, useEffect } from 'react';
import { getDashboard } from '../api';
import { Clock, Star, Calendar, ArrowUpRight, TrendingUp, Users, ChevronDown, ChevronUp } from 'lucide-react';

const HomeView = ({ user, setActiveTab }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [menuExpanded, setMenuExpanded] = useState(false);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            const res = await getDashboard(user._id);
            setData(res);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${m} ${ampm}`;
    };

    if (loading) {
        return (
            <div className="flex flex-col h-[50vh] items-center justify-center text-gray-400 gap-3">
                <div className="w-10 h-10 border-4 border-[#0D1164]/20 border-t-[#0D1164] rounded-full animate-spin"></div>
                <span className="text-sm font-medium">Syncing dashboard...</span>
            </div>
        );
    }

    if (!data) {
        return <div className="p-10 text-center text-sm font-medium text-[#EA2264]">Failed to load dashboard.</div>;
    }

    const { nextMeal, todayRegistrations = [] } = data;
    const registeredMeals = todayRegistrations.filter(r => !r.cancelled_at).length;

    // Theme Colors
    const messColor = nextMeal.messColor ? `oklch(${nextMeal.messColor})` : 'var(--navy)';

    // Determine how many items to show
    // Filter out empty items ("ghost bullets")
    const validItems = (nextMeal.items || []).filter(item => {
        if (!item) return false;
        const str = typeof item === 'string' ? item : (item.item || item.name);
        return str && str.toString().trim().length > 0;
    });

    const MAX_ITEMS = 3;
    const showAllItems = menuExpanded || (validItems.length <= MAX_ITEMS);
    const displayedItems = showAllItems ? validItems : validItems.slice(0, MAX_ITEMS);
    const remainingItems = validItems.length - MAX_ITEMS;

    return (
        <div className="space-y-6">
            {/* Greeting */}
            <div>
                <h2 className="text-2xl font-extrabold text-[#0D1164] tracking-tight">
                    Hello, {user.name.split(' ')[0]} 👋
                </h2>
                <p className="text-gray-500 font-medium">Here's what's happening today.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content - Hero */}
                <div className="lg:col-span-2">
                    <div className="relative overflow-hidden bg-white border border-[#0D1164]/10 rounded-3xl shadow-lg group transition-all hover:shadow-xl h-full">
                        {/* Decorative Background Blurred Blob */}
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-sunset opacity-10 rounded-full blur-3xl"></div>

                        <div className="relative p-6 z-10 flex flex-col h-full justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF0F5] text-[#EA2264] text-[10px] uppercase font-bold tracking-wider mb-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#EA2264] animate-pulse"></span>
                                            Up Next
                                        </span>
                                        <h3 className="text-3xl font-extrabold text-[#0D1164] capitalize leading-none tracking-tight">
                                            {nextMeal.type}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 font-medium bg-gray-50 px-3 py-1 rounded-xl w-fit">
                                            <Clock size={14} className="text-[#640D5F]" />
                                            <span>
                                                {nextMeal.startTime && nextMeal.endTime
                                                    ? `${formatTime(nextMeal.startTime)} – ${formatTime(nextMeal.endTime)}`
                                                    : nextMeal.time}
                                            </span>
                                        </div>
                                    </div>

                                    <div className={`
                                        flex flex-col items-center justify-center w-14 h-14 rounded-2xl border shadow-sm
                                        ${nextMeal.isRegistered
                                            ? 'bg-green-50 border-green-100 text-green-600'
                                            : 'bg-red-50 border-red-100 text-red-500'}
                                    `}>
                                        {nextMeal.isRegistered ? (
                                            <Star className="fill-current" size={20} />
                                        ) : (
                                            <span className="text-xl font-bold">!</span>
                                        )}
                                        <span className="text-[9px] font-bold uppercase mt-0.5">
                                            {nextMeal.isRegistered ? 'Reg' : 'Not'}
                                        </span>
                                    </div>
                                </div>

                                {nextMeal.isRegistered && nextMeal.messName && (
                                    <div className="bg-[#F8F9FF] rounded-2xl p-4 mb-5 border border-[#0D1164]/5 transition-all duration-300">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-sm"
                                                    style={{ background: messColor }}
                                                >
                                                    {nextMeal.messName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-[#0D1164]">{nextMeal.messName}</p>
                                                    <div className="flex items-center gap-1 text-xs font-medium text-gray-500">
                                                        <Star size={10} className="fill-current text-[#F78D60]" strokeWidth={0} />
                                                        <span>{nextMeal.messRating?.toFixed(1) || '--'} Rating</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Menu Preview */}
                                        {nextMeal.items && nextMeal.items.length > 0 ? (
                                            <div className="space-y-2 pl-1">
                                                {displayedItems.map((item, i) => (
                                                    <div key={i} className="flex items-center gap-3 text-sm text-gray-600 font-medium animate-in fade-in slide-in-from-top-1 duration-200" style={{ animationDelay: `${i * 50}ms` }}>
                                                        <div className="w-1.5 h-1.5 rounded-full bg-[#EA2264]/40 shrink-0"></div>
                                                        <span className="leading-snug">{typeof item === 'string' ? item : (item.item || item.name)}</span>
                                                    </div>
                                                ))}

                                                {!showAllItems && remainingItems > 0 && (
                                                    <button
                                                        onClick={() => setMenuExpanded(true)}
                                                        className="text-xs font-bold text-[#EA2264] pl-4.5 pt-1 hover:underline decoration-2 underline-offset-2 w-full text-left flex items-center gap-1"
                                                    >
                                                        +{remainingItems} more items <ChevronDown size={12} />
                                                    </button>
                                                )}

                                                {menuExpanded && (
                                                    <button
                                                        onClick={() => setMenuExpanded(false)}
                                                        className="text-xs font-bold text-gray-400 pl-4.5 pt-2 hover:text-gray-600 w-full text-left flex items-center gap-1"
                                                    >
                                                        Show less <ChevronUp size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-sm italic text-gray-400 pl-1">Menu not available yet.</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex mt-auto">
                                <button
                                    onClick={() => setActiveTab('menu')}
                                    className="btn-sunset-primary w-full flex items-center justify-center gap-2"
                                >
                                    Full Menu <ArrowUpRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar - Stats & Schedule */}
                <div className="space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                            <div className="w-8 h-8 rounded-full bg-[#FFF0F5] flex items-center justify-center mb-2">
                                <Calendar size={16} className="text-[#EA2264]" />
                            </div>
                            <p className="text-xl font-extrabold text-[#0D1164] leading-none">{registeredMeals}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-1">Meals Today</p>
                        </div>

                        <button onClick={() => setActiveTab('analytics')} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:border-[#EA2264]/20 hover:bg-[#FFF0F5]/30 transition-all">
                            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center mb-2">
                                <TrendingUp size={16} className="text-green-600" />
                            </div>
                            <p className="text-sm font-bold text-[#0D1164]">Stats</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-1">View Data</p>
                        </button>

                        <button onClick={() => setActiveTab('groups')} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:border-[#EA2264]/20 hover:bg-[#FFF0F5]/30 transition-all">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mb-2">
                                <Users size={16} className="text-blue-600" />
                            </div>
                            <p className="text-sm font-bold text-[#0D1164]">Groups</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-1">Manage</p>
                        </button>
                    </div>

                    {/* Today's Schedule */}
                    {todayRegistrations.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-50 flex justify-between items-center bg-[#FAFAFA]">
                                <h3 className="text-sm font-bold text-gray-900">Today's Schedule</h3>
                                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider text-right">
                                    {todayRegistrations.length} Registrations
                                </span>
                            </div>
                            <div>
                                {todayRegistrations.map((reg, i) => (
                                    <div key={i} className="px-5 py-3.5 flex justify-between items-center hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#0D1164]/30"></div>
                                            <div>
                                                <p className="text-sm font-bold text-[#0D1164] capitalize leading-none mb-1">{reg.meal_type}</p>
                                                <p className="text-xs font-medium text-gray-500">{reg.meal_mess}</p>
                                            </div>
                                        </div>

                                        {reg.cancelled_at ? (
                                            <span className="px-2 py-1 rounded-lg bg-red-50 text-red-600 text-[10px] font-bold uppercase border border-red-100">
                                                Cancelled
                                            </span>
                                        ) : reg.availed_at ? (
                                            <span className="px-2 py-1 rounded-lg bg-green-50 text-green-600 text-[10px] font-bold uppercase border border-green-100 flex items-center gap-1">
                                                Availed
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-bold uppercase border border-blue-100">
                                                Upcoming
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="h-4"></div>
        </div>
    );
};

export default HomeView;
