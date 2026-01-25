import axios from 'axios';

const api = axios.create({
    baseURL: '/api'
});

// Interceptor to add Auth Key to every request
api.interceptors.request.use((config) => {
    const user = localStorage.getItem('user');
    if (user) {
        const parsedUser = JSON.parse(user);
        if (parsedUser.authKey) {
            config.headers.Authorization = parsedUser.authKey;
        }
    }
    return config;
});

// ==================== MESS INFO ====================

export const getMessInfo = async () => {
    const res = await api.get('/mess/info');
    return res.data;
};

export const getMenus = async (date) => {
    const res = await api.get('/menus', { params: { on: date } });
    return res.data;
};

export const getRates = async (meal, date) => {
    const res = await api.get('/mess/rates', { params: { meal, on: date } });
    return res.data;
};

export const getCapacities = async (meal, date) => {
    const res = await api.get('/mess/capacities', { params: { meal, on: date } });
    return res.data;
};

// ==================== RATINGS ====================

export const getRatings = async (meal, mess = null) => {
    const params = { meal };
    if (mess) params.mess = mess;
    const res = await api.get('/ratings', { params });
    return res.data;
};

// ==================== REGISTRATIONS ====================

export const getRegistrations = async (fromDate, toDate) => {
    const res = await api.get('/registrations', { params: { from: fromDate, to: toDate } });
    return res.data;
};

export const getRegistration = async (meal, date) => {
    const res = await api.get('/registration', { params: { meal, date } });
    return res.data;
};

export const registerMeal = async (mealDate, mealType, mealMess, guests = 0) => {
    const res = await api.post('/registrations', {
        meal_date: mealDate,
        meal_type: mealType,
        meal_mess: mealMess,
        guests
    });
    return res.data;
};

export const cancelRegistration = async (mealDate, mealType) => {
    const res = await api.post('/registrations/cancel', {
        meal_date: mealDate,
        meal_type: mealType
    });
    return res.data;
};

export const uncancelRegistration = async (mealDate, mealType) => {
    const res = await api.post('/registrations/uncancel', {
        meal_date: mealDate,
        meal_type: mealType
    });
    return res.data;
};

// ==================== MONTHLY ====================

export const getMonthlyRegistration = async (month, year) => {
    const res = await api.get('/registrations/monthly', { params: { month, year } });
    return res.data;
};

export const createMonthlyRegistration = async (month, year, mess) => {
    const res = await api.post('/registrations/monthly', { month, year, mess });
    return res.data;
};

export const getCancellationsCount = async (meal, month, year) => {
    const res = await api.get('/registrations/cancellations', { params: { meal, month, year } });
    return res.data;
};

// ==================== BILLING ====================

export const getBill = async (month, year) => {
    const res = await api.get('/registrations/bill', { params: { month, year } });
    return res.data;
};

export const getAllBills = async () => {
    const res = await api.get('/bills');
    return res.data;
};

// ==================== FEEDBACK ====================

export const submitFeedback = async (mealDate, mealType, rating, remarks) => {
    const res = await api.post('/registrations/feedback', {
        meal_date: mealDate,
        meal_type: mealType,
        rating,
        remarks
    });
    return res.data;
};

// ==================== EXTRAS ====================

export const getExtras = async (meal, date) => {
    const res = await api.get('/extras', { params: { meal, date } });
    return res.data;
};

export const getExtraRegistrations = async (meal, date) => {
    const res = await api.get('/registrations/extras', { params: { meal, date } });
    return res.data;
};

export const registerExtra = async (extraId, mealDate, mealType, mealMess) => {
    const res = await api.post('/registrations/extras', {
        extra: extraId,
        meal_date: mealDate,
        meal_type: mealType,
        meal_mess: mealMess
    });
    return res.data;
};

// ==================== CONFIG ====================

export const getMealTimings = async (date) => {
    const res = await api.get('/config/meal-timings', { params: { on: date } });
    return res.data;
};

export const getRegistrationWindow = async () => {
    const res = await api.get('/config/registration-window');
    return res.data;
};

export const getCancellationWindow = async () => {
    const res = await api.get('/config/cancellation-window');
    return res.data;
};

export const getMaxCancellations = async (meal) => {
    const res = await api.get('/config/max-cancellations', { params: { meal } });
    return res.data;
};

// ==================== PREFERENCES ====================

export const getPreferences = async () => {
    const res = await api.get('/preferences');
    return res.data;
};

export const updatePreferences = async (prefs) => {
    const res = await api.put('/preferences', prefs);
    return res.data;
};

// ==================== GROUPS (Local) ====================

export const createGroup = async (name, userId) => {
    const res = await api.post('/groups/create', { name, userId });
    return res.data;
};

export const joinGroup = async (code, userId) => {
    const res = await api.post('/groups/join', { code, userId });
    return res.data;
};

export const getMyGroup = async (userId) => {
    const res = await api.get(`/groups/${userId}`);
    return res.data;
};

// ==================== AUTH (Local) ====================

export const login = async (authKey) => {
    const res = await api.post('/auth/login', { authKey });
    return res.data;
};

export const getDashboard = async (userId) => {
    const res = await api.get('/dashboard', { params: { userId } });
    return res.data;
};

// ==================== SETTINGS (Local) ====================

export const getSettings = async (userId) => {
    const res = await api.get(`/settings/${userId}`);
    return res.data;
};

export const saveSettings = async (userId, enabled, preferences) => {
    const res = await api.post('/settings', {
        userId,
        autoRegEnabled: enabled,
        preferences
    });
    return res.data;
};
