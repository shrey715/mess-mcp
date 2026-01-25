import React, { useState, useEffect } from 'react';
import { getRegistrations, registerMeal, cancelRegistration, uncancelRegistration, getMessInfo, getMonthlyRegistration, getCapacities, getCancellationWindow, getMealTimings } from '../api';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, isBefore, parseISO, setHours, setMinutes } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader, X, Check, AlertCircle, Users, ArrowLeft } from 'lucide-react';

const MonthCalendarView = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [registrations, setRegistrations] = useState([]);
    const [messInfo, setMessInfo] = useState({});
    const [monthlyReg, setMonthlyReg] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        loadData();
    }, [currentMonth]);

    const loadData = async () => {
        setLoading(true);
        try {
            const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
            const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
            const month = currentMonth.getMonth() + 1;
            const year = currentMonth.getFullYear();

            const [regData, infoData, monthlyData] = await Promise.all([
                getRegistrations(start, end),
                getMessInfo(),
                getMonthlyRegistration(month, year).catch(() => ({ data: null }))
            ]);

            setRegistrations(regData.data || []);
            setMonthlyReg(monthlyData?.data?.registration || null);

            if (infoData?.data) {
                const infoMap = {};
                infoData.data.forEach(m => {
                    infoMap[m.id] = m;
                });
                setMessInfo(infoMap);
            }
        } catch (e) {
            console.error("Failed to load month data", e);
        } finally {
            setLoading(false);
        }
    };

    const days = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth)
    });

    const getDayRegs = (date) => {
        return registrations.filter(r => isSameDay(new Date(r.meal_date), date));
    };

    // Helper to check if registration is active (handles MMS keeping both timestamps)
    const isRegActive = (reg) => {
        if (!reg || !reg.registered_at) return false;
        if (!reg.cancelled_at) return true;
        return new Date(reg.registered_at) > new Date(reg.cancelled_at);
    };

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const handleDateClick = (date) => {
        setSelectedDate(date);
        setShowModal(true);
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-[#0D1164] tracking-tight">Planning</h2>
                    <p className="text-sm text-gray-500 font-medium">Monthly Registrations</p>
                </div>
                <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                    <button onClick={prevMonth} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-[#0D1164] transition-all">
                        <ChevronLeft size={18} />
                    </button>
                    <span className="text-sm font-bold text-[#0D1164] min-w-[100px] text-center">
                        {format(currentMonth, 'MMMM yyyy')}
                    </span>
                    <button onClick={nextMonth} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-[#0D1164] transition-all">
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col h-[40vh] items-center justify-center text-gray-400 gap-3">
                    <Loader className="animate-spin" size={32} />
                    <span className="text-sm font-medium">Loading calendar...</span>
                </div>
            ) : (
                <div className="grid grid-cols-7 gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest py-2">
                            {d}
                        </div>
                    ))}
                    {days.map((date, idx) => {
                        const dayRegs = getDayRegs(date);
                        const isTodayDate = isToday(date);

                        return (
                            <button
                                key={idx}
                                onClick={() => handleDateClick(date)}
                                className={`aspect-square rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all relative overflow-hidden ${isTodayDate
                                    ? 'border-[#EA2264] bg-[#FFF0F5] shadow-sm'
                                    : 'border-gray-50 bg-white hover:border-[#F78D60] shadow-xs'
                                    }`}
                                style={{ gridColumnStart: idx === 0 ? date.getDay() + 1 : 'auto' }}
                            >
                                <span className={`text-xs font-bold ${isTodayDate ? 'text-[#EA2264]' : 'text-[#0D1164]'}`}>
                                    {format(date, 'd')}
                                </span>

                                <div className="flex gap-0.5">
                                    {['breakfast', 'lunch', 'dinner'].map(meal => {
                                        const reg = dayRegs.find(r => r.meal_type === meal);
                                        const isActive = isRegActive(reg);
                                        const isCancelled = reg && !isActive;
                                        return (
                                            <div
                                                key={meal}
                                                className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : isCancelled ? 'bg-red-400' : 'bg-gray-200'
                                                    }`}
                                            ></div>
                                        );
                                    })}
                                </div>

                                {dayRegs.filter(r => isRegActive(r)).length > 0 && (
                                    <div className="absolute -right-2 -top-2 w-6 h-6 bg-green-50 rounded-full flex items-center justify-center">
                                        <div className="w-1 h-1 rounded-full bg-green-500 transform translate-x-[-2px] translate-y-[2px]"></div>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Quick Actions / Legend */}
            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-[#0D1164] uppercase tracking-wider opacity-60">Status Guide</h3>
                <div className="flex gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-[11px] font-bold text-gray-600">Registered</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-400"></div>
                        <span className="text-[11px] font-bold text-gray-600">Cancelled</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-200"></div>
                        <span className="text-[11px] font-bold text-gray-600">No Meal</span>
                    </div>
                </div>
            </div>

            {/* Registration Modal */}
            {showModal && selectedDate && (
                <RegistrationModal
                    date={selectedDate}
                    dayRegs={getDayRegs(selectedDate)}
                    messInfo={messInfo}
                    defaultMess={monthlyReg?.meal_mess}
                    onUpdate={loadData}
                    onClose={() => {
                        setShowModal(false);
                    }}
                />
            )}
        </div>
    );
};

// ==================== REGISTRATION MODAL ====================

const RegistrationModal = ({ date, dayRegs, messInfo, defaultMess, onUpdate, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [editingMeal, setEditingMeal] = useState(null); // null = meal list, else = mess selection
    const [selectedMess, setSelectedMess] = useState(defaultMess || '');
    const [capacities, setCapacities] = useState({});
    const [cancellationWindow, setCancellationWindow] = useState(172800); // Default 48h in seconds
    const [mealTimings, setMealTimings] = useState({});
    const [localRegs, setLocalRegs] = useState(dayRegs); // Local state for UI updates

    const meals = ['breakfast', 'lunch', 'snacks', 'dinner'];
    const dateStr = format(date, 'yyyy-MM-dd');

    // Helper: Check if registration is active (handles MMS keeping both timestamps)
    const isRegistrationActive = (reg) => {
        if (!reg || !reg.registered_at) return false;
        if (!reg.cancelled_at) return true;
        return new Date(reg.registered_at) > new Date(reg.cancelled_at);
    };

    useEffect(() => {
        // Fetch cancellation window once
        getCancellationWindow().then(res => {
            if (res?.data) setCancellationWindow(res.data);
        }).catch(() => { });

        // Fetch meal timings for this date
        getMealTimings(dateStr).then(res => {
            if (res?.data) setMealTimings(res.data);
        }).catch(() => { });
    }, [dateStr]);

    useEffect(() => {
        setLocalRegs(dayRegs);
    }, [dayRegs]);

    const handleStartRegister = async (meal) => {
        setEditingMeal(meal);
        setSelectedMess(defaultMess || Object.keys(messInfo)[0] || '');
        // Fetch capacities for this meal
        try {
            const capData = await getCapacities(meal, dateStr);
            console.log('Capacities response:', capData);
            if (capData?.data) {
                const capMap = {};
                // API returns { data: { category: [{ mess, available, capacity }, ...] } }
                // Flatten all categories into a single mess-keyed map
                Object.values(capData.data).forEach(categoryItems => {
                    if (Array.isArray(categoryItems)) {
                        categoryItems.forEach(c => {
                            capMap[c.mess] = { ...c, registered: (c.capacity || 0) - (c.available || 0) };
                        });
                    }
                });
                setCapacities(capMap);
            }
        } catch (e) {
            console.error("Failed to fetch capacities", e);
        }
    };

    const handleConfirmRegister = async () => {
        if (!selectedMess) {
            alert("Please select a mess");
            return;
        }
        setLoading(true);
        try {
            // Check if this meal has a cancelled registration that needs uncancelling
            const existingReg = localRegs.find(r => r.meal_type === editingMeal);
            const wasCancelled = existingReg && existingReg.cancelled_at &&
                (!existingReg.registered_at || new Date(existingReg.cancelled_at) > new Date(existingReg.registered_at));

            if (wasCancelled) {
                // Use uncancel endpoint for previously cancelled registration
                await uncancelRegistration(dateStr, editingMeal);
            } else {
                // Use regular register for new registration
                await registerMeal(dateStr, editingMeal, selectedMess);
            }

            // Update local state
            setLocalRegs(prev => [...prev.filter(r => r.meal_type !== editingMeal), {
                meal_type: editingMeal,
                meal_date: dateStr,
                meal_mess: selectedMess,
                registered_at: new Date().toISOString(),
                cancelled_at: null
            }]);
            setEditingMeal(null);
            onUpdate?.(); // Refresh parent calendar
        } catch (e) {
            alert("Registration failed: " + (e.response?.data?.error?.message || e.response?.data?.detail || e.message));
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (meal) => {
        setLoading(true);
        try {
            await cancelRegistration(dateStr, meal);
            // Update local state
            setLocalRegs(prev => prev.map(r =>
                r.meal_type === meal ? { ...r, cancelled_at: new Date().toISOString() } : r
            ));
            onUpdate?.(); // Refresh parent calendar
        } catch (e) {
            alert("Cancellation failed: " + (e.response?.data?.error?.message || e.response?.data?.detail || e.message));
        } finally {
            setLoading(false);
        }
    };

    const isMealCancelable = (meal) => {
        // Check if meal is in the past or within cancellation window
        const now = new Date();
        const mealDate = parseISO(dateStr);

        // Get meal start time from timings (approximate)
        const defaultTimes = {
            breakfast: { hour: 7, minute: 30 },
            lunch: { hour: 12, minute: 30 },
            snacks: { hour: 16, minute: 30 },
            dinner: { hour: 19, minute: 30 }
        };

        // Try to get actual timing from mealTimings
        let mealHour = defaultTimes[meal]?.hour || 12;
        let mealMinute = defaultTimes[meal]?.minute || 0;

        // mealTimings is keyed by mess, pick first available or use default
        const firstMessTimings = Object.values(mealTimings)[0] || [];
        const timing = firstMessTimings.find(t => t.meal === meal);
        if (timing?.start_time) {
            const [h, m] = timing.start_time.split(':');
            mealHour = parseInt(h);
            mealMinute = parseInt(m);
        }

        const mealDateTime = setMinutes(setHours(mealDate, mealHour), mealMinute);
        const cancelDeadline = new Date(mealDateTime.getTime() - (cancellationWindow * 1000));

        return isBefore(now, cancelDeadline);
    };

    const isMealInPast = (meal) => {
        const now = new Date();
        const mealDate = parseISO(dateStr);
        const defaultEndTimes = {
            breakfast: { hour: 9, minute: 30 },
            lunch: { hour: 14, minute: 30 },
            snacks: { hour: 17, minute: 30 },
            dinner: { hour: 21, minute: 30 }
        };

        const endHour = defaultEndTimes[meal]?.hour || 12;
        const endMinute = defaultEndTimes[meal]?.minute || 0;
        const mealEndTime = setMinutes(setHours(mealDate, endHour), endMinute);

        return isBefore(mealEndTime, now);
    };

    // Mess Selection Sub-View
    if (editingMeal) {
        const messList = Object.entries(messInfo).filter(([id, info]) => info.tags !== 0);

        return (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-[#FDFBF7] w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl border border-white/20 animate-in slide-in-from-bottom duration-500 max-h-[85vh] flex flex-col">
                    <div className="p-6 space-y-5 overflow-y-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setEditingMeal(null)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                                    <ArrowLeft size={16} />
                                </button>
                                <div>
                                    <h3 className="text-lg font-bold text-[#0D1164] capitalize">{editingMeal}</h3>
                                    <p className="text-xs text-gray-500 font-medium">{format(date, 'EEEE, d MMM yyyy')}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Mess Dropdown */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Mess</label>
                            <select
                                value={selectedMess}
                                onChange={(e) => setSelectedMess(e.target.value)}
                                className="w-full p-3 rounded-xl border border-gray-200 bg-white text-[#0D1164] font-bold focus:outline-none focus:ring-2 focus:ring-[#EA2264]/30"
                            >
                                <option value="">Choose a mess...</option>
                                {messList.map(([id, info]) => (
                                    <option key={id} value={id}>{info.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Capacities */}
                        {Object.keys(capacities).length > 0 && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                    <Users size={12} /> Capacity Info
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {messList.map(([id, info]) => {
                                        const cap = capacities[id];
                                        if (!cap) return null;
                                        const fillPercent = cap.capacity > 0 ? Math.round((cap.registered / cap.capacity) * 100) : 0;
                                        const isFull = fillPercent >= 100;
                                        const isSelected = selectedMess === id;

                                        return (
                                            <button
                                                key={id}
                                                onClick={() => !isFull && setSelectedMess(id)}
                                                disabled={isFull}
                                                className={`p-3 rounded-xl border text-left transition-all ${isSelected
                                                    ? 'border-[#EA2264] bg-[#FFF0F5] shadow-sm'
                                                    : isFull
                                                        ? 'border-red-100 bg-red-50/50 opacity-60'
                                                        : 'border-gray-100 bg-white hover:border-gray-200'
                                                    }`}
                                            >
                                                <p className="text-xs font-bold text-[#0D1164] truncate">{info.short_name || info.name}</p>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${isFull ? 'bg-red-500' : 'bg-green-500'}`}
                                                            style={{ width: `${Math.min(fillPercent, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className={`text-[10px] font-bold ${isFull ? 'text-red-500' : 'text-gray-500'}`}>
                                                        {cap.registered}/{cap.capacity}
                                                    </span>
                                                </div>
                                                {isFull && <p className="text-[9px] text-red-500 font-bold mt-1">FULL</p>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Confirm Button */}
                        <button
                            disabled={loading || !selectedMess}
                            onClick={handleConfirmRegister}
                            className="w-full py-3 rounded-xl bg-[#0D1164] text-white font-bold shadow-md shadow-[#0D1164]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-[#0D1164]/90"
                        >
                            {loading ? 'Processing...' : isRegistrationActive(localRegs.find(r => r.meal_type === editingMeal)) ? 'Update Registration' : 'Confirm Registration'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Main Meal List View
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#FDFBF7] w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl border border-white/20 animate-in slide-in-from-bottom duration-500">
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-[#0D1164]">{format(date, 'EEEE, d MMM')}</h3>
                            <p className="text-xs text-[#EA2264] font-bold uppercase tracking-wider">Configure Meals</p>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-3">
                        {meals.map(meal => {
                            const reg = localRegs.find(r => r.meal_type === meal);
                            const isReg = isRegistrationActive(reg);
                            const isCancelled = reg && !isReg;

                            let messName = 'Not Registered';
                            if (isReg) {
                                messName = messInfo[reg.meal_mess]?.name || reg.meal_mess;
                            } else if (isCancelled) {
                                messName = 'Cancelled';
                            }

                            const isPast = isMealInPast(meal);
                            const canCancel = isReg && isMealCancelable(meal) && !isPast;
                            const canUncancel = isCancelled && isMealCancelable(meal) && !isPast;

                            return (
                                <div key={meal} className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${isPast
                                    ? 'bg-gray-50 border-gray-100 opacity-60'
                                    : isReg
                                        ? 'bg-white border-green-100 shadow-sm'
                                        : isCancelled
                                            ? 'bg-red-50/30 border-red-100'
                                            : 'bg-gray-50/50 border-gray-100'
                                    }`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPast
                                            ? 'bg-gray-100 text-gray-400'
                                            : isReg
                                                ? 'bg-green-50 text-green-600'
                                                : isCancelled
                                                    ? 'bg-red-100 text-red-500'
                                                    : 'bg-gray-100 text-gray-400'
                                            }`}>
                                            {isReg ? <Check size={20} strokeWidth={2.5} /> : isCancelled ? <X size={20} strokeWidth={2.5} /> : <div className="w-2 h-2 rounded-full bg-gray-300"></div>}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-0.5">{meal}</p>
                                            <p className={`text-sm font-bold ${isReg ? 'text-[#0D1164]' : isCancelled ? 'text-red-500' : 'text-gray-400'}`}>
                                                {isPast && reg?.availed_at ? 'Availed' : messName}
                                            </p>
                                        </div>
                                    </div>

                                    {!isPast && (
                                        <div className="flex gap-2">
                                            {isReg ? (
                                                <>
                                                    <button
                                                        disabled={loading || !canCancel}
                                                        onClick={() => handleCancel(meal)}
                                                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${canCancel
                                                            ? 'text-red-500 hover:bg-red-50'
                                                            : 'text-gray-400 cursor-not-allowed'
                                                            }`}
                                                        title={!canCancel ? 'Cancellation window closed' : ''}
                                                    >
                                                        {canCancel ? 'Cancel' : 'Locked'}
                                                    </button>

                                                    {canCancel && (
                                                        <button
                                                            disabled={loading}
                                                            onClick={() => handleStartRegister(meal)}
                                                            className="px-3 py-2 rounded-xl text-xs font-bold bg-[#0D1164] text-white shadow-sm shadow-[#0D1164]/20 hover:bg-[#0D1164]/90"
                                                        >
                                                            Update
                                                        </button>
                                                    )}
                                                </>
                                            ) : isCancelled ? (
                                                <button
                                                    disabled={loading || !canUncancel}
                                                    onClick={() => uncancelRegistration(dateStr, meal).then(() => {
                                                        onUpdate?.();
                                                        // Update local state temporarily
                                                        setLocalRegs(prev => prev.map(r => r.meal_type === meal ? { ...r, cancelled_at: null } : r));
                                                    })}
                                                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0D1164] text-white shadow-md shadow-[#0D1164]/20 transition-all hover:bg-[#0D1164]/90"
                                                >
                                                    Uncancel
                                                </button>
                                            ) : (
                                                <button
                                                    disabled={loading}
                                                    onClick={() => handleStartRegister(meal)}
                                                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0D1164] text-white shadow-md shadow-[#0D1164]/20 transition-all hover:bg-[#0D1164]/90"
                                                >
                                                    Register
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {isPast && (
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Past</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <p className="text-[10px] text-center text-gray-400 font-medium px-4">
                        <AlertCircle size={10} className="inline mr-1" />
                        Cancellations close {Math.round(cancellationWindow / 3600)}h before the meal.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MonthCalendarView;
