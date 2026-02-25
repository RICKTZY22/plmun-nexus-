import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Pull tokens straight from localStorage (avoids circular imports)
const getTokens = () => {
    const authData = localStorage.getItem('auth-storage');
    if (authData) {
        try {
            const { state } = JSON.parse(authData);
            return {
                access: state?.token,
                refresh: state?.refreshToken,
            };
        } catch (e) {
            // corrupted storage — treat as unauthenticated
        }
    }
    return { access: null, refresh: null };
};

// Lazily import authStore to avoid circular dependency issues at module init time
const getAuthStore = () => import('../store/authStore').then(m => m.default ?? m);

// Attach the bearer token to every outgoing request
api.interceptors.request.use(
    (config) => {
        const { access } = getTokens();
        if (access) {
            config.headers.Authorization = `Bearer ${access}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Handle 401s by trying to refresh the access token
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                }).catch(err => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const { refresh } = getTokens();

            if (refresh) {
                try {
                    const response = await axios.post(`${API_URL}/auth/token/refresh/`, {
                        refresh: refresh
                    });

                    const { access } = response.data;

                    // Sync the new token through zustand so in-memory state stays consistent
                    const store = await getAuthStore();
                    store.getState().setToken(access);

                    processQueue(null, access);
                    originalRequest.headers.Authorization = `Bearer ${access}`;

                    return api(originalRequest);
                } catch (refreshError) {
                    processQueue(refreshError, null);
                    // Trigger proper logout through the store (clears all state + listeners)
                    const store = await getAuthStore();
                    store.getState().logout();
                    window.location.href = '/login';
                    return Promise.reject(refreshError);
                } finally {
                    isRefreshing = false;
                }
            } else {
                const store = await getAuthStore();
                store.getState().logout();
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

export default api;
