import React from 'react';
import { useApp } from '../context/AppContext';
import { LogOut, User, Bell, Shield, Moon, ChevronRight, HelpCircle, FileText } from 'lucide-react';

const SettingsView = () => {
    const { user, logout } = useApp();

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[#0D1164] tracking-tight">Settings</h2>

            {/* Profile Card */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-sunset rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-md border-4 border-white">
                    {user.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-[#0D1164] truncate">{user.name}</h3>
                    <p className="text-sm text-gray-400 truncate">{user.email}</p>
                </div>
                <button className="text-[#EA2264] font-bold text-xs uppercase tracking-wider hover:bg-[#FFF0F5] px-3 py-1.5 rounded-lg transition-colors">
                    Edit
                </button>
            </div>

            {/* Menu Groups */}
            <div className="space-y-4">
                <SettingsGroup title="Preferences">
                    <SettingsItem icon={Bell} label="Notifications" value="On" />
                    <SettingsItem icon={Moon} label="Dark Mode" value="Off" />
                </SettingsGroup>

                <SettingsGroup title="Account">
                    <SettingsItem icon={User} label="Personal Details" />
                    <SettingsItem icon={Shield} label="Security" />
                </SettingsGroup>

                <SettingsGroup title="Support">
                    <SettingsItem icon={HelpCircle} label="Help & FAQ" />
                    <SettingsItem icon={FileText} label="Terms of Service" />
                </SettingsGroup>
            </div>

            {/* Logout Button */}
            <button
                onClick={logout}
                className="w-full bg-[#FFF0F5] text-[#EA2264] font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-[#FFE4ED] transition-colors"
            >
                <LogOut size={18} /> Sign Out
            </button>

            <p className="text-center text-[10px] text-gray-300 font-mono uppercase pb-4">
                Mess-Mate v2.0 • Sunset Edition
            </p>
        </div>
    );
};

const SettingsGroup = ({ title, children }) => (
    <div className="space-y-2">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">{title}</h4>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
            {children}
        </div>
    </div>
);

const SettingsItem = ({ icon: Icon, label, value }) => (
    <button className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
        <div className="flex items-center gap-3.5">
            <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] flex items-center justify-center text-[#640D5F] group-hover:bg-[#FFF0F5] group-hover:text-[#EA2264] transition-colors">
                <Icon size={16} />
            </div>
            <span className="text-sm font-semibold text-[#0D1164]">{label}</span>
        </div>
        <div className="flex items-center gap-2">
            {value && <span className="text-xs font-bold text-gray-400">{value}</span>}
            <ChevronRight size={16} className="text-gray-300" />
        </div>
    </button>
);

export default SettingsView;
