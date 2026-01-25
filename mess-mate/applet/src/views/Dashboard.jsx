import React, { useEffect, useState } from 'react';
import { getMenus, getMessInfo, getMealTimings, getRatings, getRegistrations, registerMeal, cancelRegistration } from '../api';
import MenuCard from '../components/MenuCard';
import { format } from 'date-fns';
import { Loader, Sun, Moon, Coffee, Utensils } from 'lucide-react';

const Dashboard = () => {
    const [menus, setMenus] = useState(null);
    const [messInfo, setMessInfo] = useState({});
    const [timings, setTimings] = useState({});
    const [ratings, setRatings] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedMeal, setSelectedMeal] = useState(getCurrentMeal());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [registrations, setRegistrations] = useState([]);

    // Calendar Generation (Current date to next 6 days)
    const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d;
    });

    useEffect(() => {
        loadAllData();
    }, [selectedDate]);

    useEffect(() => {
        if (selectedMeal) {
            loadRatings(selectedMeal);
        }
    }, [selectedMeal]);

    const loadAllData = async () => {
        setLoading(true);
        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const [menuData, infoData, timingData, regData] = await Promise.all([
                getMenus(dateStr),
                getMessInfo(),
                getMealTimings(dateStr),
                getRegistrations(dateStr, dateStr)
            ]);

            setMenus(menuData);

            if (regData?.data) {
                setRegistrations(regData.data);
            }

            if (infoData?.data) {
                const infoMap = {};
                infoData.data.forEach(m => {
                    infoMap[m.id] = m;
                });
                setMessInfo(infoMap);
            }

            if (timingData?.data) {
                setTimings(timingData.data);
            }
        } catch (e) {
            console.error("Failed to load data", e);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (messId, mealType) => {
        if (!window.confirm(`Confirm registration for ${mealType} at ${messInfo[messId]?.name}?`)) return;
        try {
            await registerMeal(format(selectedDate, 'yyyy-MM-dd'), mealType, messId);
            loadAllData();
            alert("Registered successfully!");
        } catch (e) {
            alert("Registration failed: " + (e.response?.data?.detail || e.message));
        }
    };

    const handleCancel = async (mealType) => {
        if (!window.confirm(`Cancel registration for ${mealType}?`)) return;
        try {
            await cancelRegistration(format(selectedDate, 'yyyy-MM-dd'), mealType);
            loadAllData();
            alert("Registration cancelled.");
        } catch (e) {
            alert("Cancellation failed: " + (e.response?.data?.detail || e.message));
        }
    };

    const loadRatings = async (meal) => {
        try {
            const data = await getRatings(meal);
            if (data?.data) {
                setRatings(data.data);
            }
        } catch (e) {
            console.log("Ratings not available");
        }
    };

    function getCurrentMeal() {
        const hour = new Date().getHours();
        if (hour < 10) return 'breakfast';
        if (hour < 14) return 'lunch';
        if (hour < 18) return 'snacks';
        return 'dinner';
    }

    function formatTime(timeStr) {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${m} ${ampm}`;
    }

    const mealIcons = {
        breakfast: Sun,
        lunch: Utensils,
        snacks: Coffee,
        dinner: Moon
    };

    if (loading) {
        return (
            <div className="flex flex-col h-[60vh] items-center justify-center text-gray-400 gap-3">
                <div className="w-10 h-10 border-4 border-[#0D1164]/20 border-t-[#0D1164] rounded-full animate-spin"></div>
                <span className="text-sm font-medium">Fetching menus...</span>
            </div>
        );
    }

    const todayDay = format(selectedDate, 'EEEE').toLowerCase();

    // Process Menu Items
    const processedMenus = menus?.data?.map(m => {
        const dayMenu = m.days?.[todayDay] || {};
        const info = messInfo[m.mess] || {};
        const messTimings = timings[m.mess] || [];
        const mealTiming = messTimings.find(t => t.meal === selectedMeal);
        const mealRating = ratings[m.mess];

        // Check registration
        const isRegistered = registrations.some(r =>
            r.meal_mess === m.mess &&
            r.meal_type === selectedMeal &&
            !r.cancelled_at
        );

        return {
            messId: m.mess,
            messName: info.name || m.mess,
            shortName: info.short_name || m.mess,
            color: info.color,
            overallRating: info.rating,
            mealRating: mealRating?.rating,
            ratingCount: mealRating?.count || 0,
            items: dayMenu[selectedMeal] || [],
            startTime: mealTiming?.start_time,
            endTime: mealTiming?.end_time,
            tags: info.tags,
            isRegistered
        };
    }).filter(m => m.tags !== 0) || [];

    return (
        <div className="space-y-6">
            {/* Header with Date Selection */}
            <div>
                <h2 className="text-2xl font-bold text-[#0D1164] tracking-tight">Today's Menu</h2>
                <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-gray-500 mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#EA2264]"></span>
                    {format(selectedDate, 'EEEE, MMMM do')}
                </div>

                {/* Date Picker */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
                    {dates.map((date) => {
                        const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                        return (
                            <button
                                key={date.toString()}
                                onClick={() => setSelectedDate(date)}
                                className={`flex flex-col items-center justify-center min-w-[50px] py-2 rounded-xl border transition-all ${isSelected
                                    ? 'bg-[#0D1164] text-white border-[#0D1164] shadow-md'
                                    : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'
                                    }`}
                            >
                                <span className="text-[10px] uppercase font-bold">{format(date, 'EEE')}</span>
                                <span className={`text-sm font-bold ${isSelected ? 'text-[#F78D60]' : 'text-gray-900'}`}>
                                    {format(date, 'd')}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Meal Tabs */}
            <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 flex justify-between gap-1 overflow-x-auto scrollbar-hide">
                {['breakfast', 'lunch', 'snacks', 'dinner'].map((meal) => {
                    const Icon = mealIcons[meal];
                    const isActive = selectedMeal === meal;
                    return (
                        <button
                            key={meal}
                            onClick={() => setSelectedMeal(meal)}
                            className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-3 min-w-[70px] flex-1 rounded-xl transition-all duration-200 snap-start ${isActive
                                ? 'bg-[#0D1164] text-white shadow-md transform scale-[1.02]'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <Icon size={16} strokeWidth={2.5} className={isActive ? 'text-[#F78D60]' : ''} />
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wide truncate">{meal}</span>
                        </button>
                    );
                })}
            </div>

            {/* Menu List */}
            <div className="space-y-4">
                {processedMenus.map((m) => (
                    <MenuCard
                        key={m.messId}
                        messId={m.messId}
                        messName={m.messName}
                        shortName={m.shortName}
                        color={m.color}
                        mealType={selectedMeal}
                        menu={m.items}
                        overallRating={m.overallRating}
                        mealRating={m.mealRating}
                        ratingCount={m.ratingCount}
                        startTime={m.startTime}
                        endTime={m.endTime}
                        formatTime={formatTime}
                        isRegistered={m.isRegistered}
                        onRegister={() => handleRegister(m.messId, selectedMeal)}
                        onCancel={() => handleCancel(selectedMeal)}
                    />
                ))}

                {processedMenus.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-dashed border-gray-200 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <Utensils className="text-gray-300" size={24} />
                        </div>
                        <h3 className="font-bold text-gray-900 mb-1">No Menus Found</h3>
                        <p className="text-gray-500 text-sm max-w-[200px]">
                            It seems there are no menus available for {selectedMeal} on {format(selectedDate, 'MMM do')}.
                        </p>
                    </div>
                )}
            </div>

            <div className="h-4"></div>
        </div>
    );
};

export default Dashboard;
