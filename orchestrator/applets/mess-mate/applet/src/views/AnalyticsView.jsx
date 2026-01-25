import React from 'react';
import { BarChart2, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';

const AnalyticsView = () => {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[#0D1164] tracking-tight">Analytics</h2>

            {/* Savings Card */}
            <div className="bg-gradient-sunset p-6 rounded-3xl shadow-lg relative overflow-hidden text-white">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
                <div className="relative z-10">
                    <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-1">Total Savings</p>
                    <h3 className="text-4xl font-extrabold mb-1">₹1,240</h3>
                    <p className="text-white/70 text-xs font-medium">Saved this semester by skipping meals</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                <StatCard
                    icon={TrendingUp}
                    label="Meals Eaten"
                    value="42"
                    trend="+5%"
                    good={true}
                    color="text-green-600"
                    bg="bg-green-50"
                />
                <StatCard
                    icon={TrendingDown}
                    label="Skipped"
                    value="12"
                    trend="-2%"
                    good={false}
                    color="text-[#EA2264]"
                    bg="bg-[#FFF0F5]"
                />
            </div>

            {/* Chart Placeholder */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-[#0D1164]">Attendance</h3>
                    <select className="bg-gray-50 border border-gray-200 text-xs font-bold text-gray-600 rounded-lg px-2 py-1">
                        <option>This Week</option>
                        <option>This Month</option>
                    </select>
                </div>

                {/* Mock Chart Bars */}
                <div className="flex justify-between items-end h-40 gap-3 pb-2 px-1">
                    {[65, 40, 80, 55, 90, 70, 45].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                            <div
                                className="w-full bg-[#F3F4F6] rounded-t-lg relative overflow-hidden transition-all group-hover:bg-[#E0E7FF]"
                                style={{ height: '100%' }}
                            >
                                <div
                                    className="absolute bottom-0 left-0 right-0 bg-[#0D1164] rounded-t-lg transition-all duration-500 group-hover:bg-[#EA2264]"
                                    style={{ height: `${h}%` }}
                                ></div>
                            </div>
                            <span className="text-[10px] font-bold text-gray-400">
                                {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ icon: Icon, label, value, trend, good, color, bg }) => (
    <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
        <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center ${color} mb-3`}>
            <Icon size={20} />
        </div>
        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-0.5">{label}</p>
        <div className="flex items-baseline gap-2">
            <h4 className="text-2xl font-bold text-[#0D1164]">{value}</h4>
            <span className={`text-[10px] font-bold ${good ? 'text-green-500' : 'text-red-500'}`}>
                {trend}
            </span>
        </div>
    </div>
);

export default AnalyticsView;
