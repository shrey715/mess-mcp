import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Utensils, Users, Settings, Home, BarChart2, ShoppingCart, LogOut, ChevronRight } from 'lucide-react';
import Dashboard from './views/Dashboard';
import GroupsView from './views/GroupsView';
import SettingsView from './views/SettingsView';
import HomeView from './views/HomeView';
import LoginView from './views/LoginView';
import AnalyticsView from './views/AnalyticsView';
import MonthCalendarView from './views/MonthCalendarView';
import { Calendar } from 'lucide-react';

function AppContent() {
  const { user, login, logout } = useApp();
  const [activeTab, setActiveTab] = useState('home');

  if (!user) {
    return <LoginView setUser={login} />;
  }

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans flex flex-col w-full max-w-md md:max-w-2xl lg:max-w-5xl mx-auto shadow-2xl overflow-hidden relative sm:border-x sm:border-gray-200 transition-all duration-300">

      {/* Header - Minimal & Clean */}
      <header className="h-16 px-6 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-sunset rounded-xl flex items-center justify-center shadow-md shadow-[#EA2264]/20">
            <span className="text-white font-bold text-lg">M</span>
          </div>
          <div>
            <h1 className="font-bold text-lg text-[#0D1164] tracking-tight leading-none">Mess Mate</h1>
            <p className="text-[10px] uppercase font-bold text-[#EA2264] tracking-wider mt-0.5 opacity-80">Sunset Edition</p>
          </div>
        </div>

        {/* User Settings Button */}
        <button
          onClick={() => setActiveTab('settings')}
          className="flex items-center gap-2 pl-1 pr-1 py-1 rounded-full hover:bg-gray-50 transition-colors group"
        >
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-[#0D1164]">{user.name.split(' ')[0]}</p>
            <p className="text-[9px] text-gray-400 font-medium">View Profile</p>
          </div>
          <div className="w-9 h-9 bg-[#FFF0F5] border border-[#EA2264]/20 rounded-full flex items-center justify-center text-[#EA2264] font-bold text-xs shadow-sm group-hover:shadow-md transition-all">
            {getInitials(user.name)}
          </div>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-28 px-4 md:px-8 pt-6 scrollbar-hide">
        {activeTab === 'home' && <HomeView user={user} setActiveTab={setActiveTab} />}
        {activeTab === 'menu' && <Dashboard />}
        {activeTab === 'calendar' && <MonthCalendarView />}
        {activeTab === 'analytics' && <AnalyticsView />}
        {activeTab === 'groups' && <GroupsView user={user} />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Floating Bottom Nav - "Island" Style */}
      <div className="fixed bottom-6 left-0 right-0 z-40 px-6 pointer-events-none flex justify-center">
        <nav className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgba(13,10,100,0.1)] border border-white/50 p-2 flex justify-between items-center ring-1 ring-gray-100 pointer-events-auto w-full max-w-md">
          <NavBtn icon={Home} label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <NavBtn icon={Utensils} label="Menu" active={activeTab === 'menu'} onClick={() => setActiveTab('menu')} />
          <NavBtn icon={Calendar} label="Plan" active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
          <NavBtn icon={BarChart2} label="Stats" active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} />
          <NavBtn icon={Users} label="Social" active={activeTab === 'groups'} onClick={() => setActiveTab('groups')} />
        </nav>
      </div>
    </div>
  );
}

function NavBtn({ icon: Icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative w-12 h-12 flex flex-col items-center justify-center rounded-xl transition-all duration-300 ${active
        ? 'text-[#EA2264] bg-[#FFF0F5] shadow-sm transform scale-105'
        : 'text-gray-400 hover:text-[#0D1164] hover:bg-gray-50'
        }`}
    >
      <Icon size={22} strokeWidth={active ? 2.5 : 2} />
      {active && (
        <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#EA2264]"></span>
      )}
    </button>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
