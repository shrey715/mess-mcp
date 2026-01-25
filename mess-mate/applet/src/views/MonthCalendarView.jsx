import React, { useState, useEffect } from 'react';
import { getRegistrations, registerMeal, cancelRegistration, getMessInfo, getMonthlyRegistration } from '../api';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader, X, Check, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';

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
                    {/* Add padding for first day of month if needed - for simplicity using a dense grid */}
                    {days.map((date, idx) => {
                        const dayRegs = getDayRegs(date);
                        const isSelected = selectedDate && isSameDay(date, selectedDate);
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
                                        return (
                                            <div
                                                key={meal}
                                                className={`w-1.5 h-1.5 rounded-full ${reg ? 'bg-green-500' : 'bg-gray-100'}`}
                                            ></div>
                                        );
                                    })}
                                </div>

                                {dayRegs.length > 0 && (
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
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-[11px] font-bold text-gray-600">Registered</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-100"></div>
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
                    onClose={() => {
                        setShowModal(false);
                        loadData(); // Reload after potential changes
                    }}
                />
            )}
        </div>
    );
};

const RegistrationModal = ({ date, dayRegs, messInfo, defaultMess, onClose }) => {
    const [activeMeal, setActiveMeal] = useState('breakfast');
    const [loading, setLoading] = useState(false);

    const meals = ['breakfast', 'lunch', 'snacks', 'dinner'];

    const handleToggle = async (meal, isRegistered) => {
        setLoading(true);
        try {
            if (isRegistered) {
                await cancelRegistration(format(date, 'yyyy-MM-dd'), meal);
            } else {
                const targetMess = defaultMess || Object.keys(messInfo)[0] || 'kadamba-veg';
                await registerMeal(format(date, 'yyyy-MM-dd'), meal, targetMess);
            }
        } catch (e) {
            alert("Action failed: " + (e.response?.data?.error?.message || e.message));
        } finally {
            setLoading(false);
            // We don't close, user might want to toggle multiple
        }
    };

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
                            const reg = dayRegs.find(r => r.meal_type === meal);
                            const isReg = reg && !reg.cancelled_at;
                            const messName = reg ? (messInfo[reg.meal_mess]?.name || reg.meal_mess) : 'Not Registered';

                            return (
                                <div key={meal} className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${isReg ? 'bg-white border-green-100 shadow-sm' : 'bg-gray-50/50 border-gray-100'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isReg ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                            {isReg ? <Check size={20} strokeWidth={2.5} /> : <div className="w-2 h-2 rounded-full bg-gray-300"></div>}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-0.5">{meal}</p>
                                            <p className={`text-sm font-bold ${isReg ? 'text-[#0D1164]' : 'text-gray-400'}`}>
                                                {messName}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        disabled={loading}
                                        onClick={() => handleToggle(meal, isReg)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${isReg
                                            ? 'text-red-500 hover:bg-red-50'
                                            : 'bg-[#0D1164] text-white shadow-md shadow-[#0D1164]/20'
                                            }`}
                                    >
                                        {isReg ? 'Cancel' : 'Register'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    <p className="text-[10px] text-center text-gray-400 font-medium px-4">
                        <AlertCircle size={10} className="inline mr-1" />
                        Registrations for Class-A students close 48h before the meal time.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MonthCalendarView;
