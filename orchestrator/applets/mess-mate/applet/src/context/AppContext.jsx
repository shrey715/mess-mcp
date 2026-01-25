import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
    const [notifications, setNotifications] = useState([]);
    const [theme, setTheme] = useState('dark');

    const login = (userData) => {
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('user');
        setUser(null);
    };

    const addNotification = (msg) => {
        const newNotif = { id: Date.now(), msg, read: false };
        setNotifications(prev => [newNotif, ...prev]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
        }, 5000);
    };

    return (
        <AppContext.Provider value={{ user, login, logout, notifications, addNotification, theme }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => useContext(AppContext);
