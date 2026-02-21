import { create } from 'zustand';

/**
 * UI Store with per-user theme persistence.
 * Theme/appearance settings are keyed by user ID in localStorage
 * so each account has its own preferences.
 * Default theme for new accounts: 'light'
 */

const GLOBAL_KEY = 'ui-storage';

// Helper: get per-user storage key
const getUserKey = (userId) => userId ? `ui-prefs-${userId}` : null;

// Helper: load user prefs from localStorage
const loadUserPrefs = (userId) => {
    const key = getUserKey(userId);
    if (!key) return null;
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : null;
    } catch (e) {
        return null;
    }
};

// Helper: save user prefs to localStorage
const saveUserPrefs = (userId, prefs) => {
    const key = getUserKey(userId);
    if (!key) return;
    try {
        localStorage.setItem(key, JSON.stringify(prefs));
    } catch (e) {
        // Storage full or unavailable
    }
};

const useUIStore = create(
    (set, get) => ({
        // sidebar
        sidebarCollapsed: false,
        toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
        setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

        // theme (persisted per user)
        theme: 'light',
        _currentUserId: null,

        setTheme: (theme) => {
            const userId = get()._currentUserId;
            set({ theme });
            if (userId) {
                const prefs = loadUserPrefs(userId) || {};
                saveUserPrefs(userId, { ...prefs, theme });
            }
        },

        toggleTheme: () => {
            const newTheme = get().theme === 'light' ? 'dark' : 'light';
            get().setTheme(newTheme);
        },

        // background effect (per user)
        backgroundEffect: 'none',
        setBackgroundEffect: (effect) => {
            const userId = get()._currentUserId;
            set({ backgroundEffect: effect });
            if (userId) {
                const prefs = loadUserPrefs(userId) || {};
                saveUserPrefs(userId, { ...prefs, backgroundEffect: effect });
            }
        },

        // display prefs (per user)
        viewMode: 'table',       // 'table' or 'card'
        itemsPerPage: 10,        // 10, 25, 50
        showImages: true,
        setViewMode: (mode) => {
            const userId = get()._currentUserId;
            set({ viewMode: mode });
            if (userId) {
                const prefs = loadUserPrefs(userId) || {};
                saveUserPrefs(userId, { ...prefs, viewMode: mode });
            }
        },
        setItemsPerPage: (count) => {
            const userId = get()._currentUserId;
            set({ itemsPerPage: count });
            if (userId) {
                const prefs = loadUserPrefs(userId) || {};
                saveUserPrefs(userId, { ...prefs, itemsPerPage: count });
            }
        },
        setShowImages: (show) => {
            const userId = get()._currentUserId;
            set({ showImages: show });
            if (userId) {
                const prefs = loadUserPrefs(userId) || {};
                saveUserPrefs(userId, { ...prefs, showImages: show });
            }
        },

        getEffectiveTheme: () => {
            const { theme } = get();
            if (theme === 'system') {
                return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            return theme;
        },

        // Restore prefs when the user logs in
        loadUserSettings: (userId) => {
            const prefs = loadUserPrefs(userId);
            set({
                _currentUserId: userId,
                theme: prefs?.theme || 'light',
                backgroundEffect: prefs?.backgroundEffect || 'none',
                sidebarCollapsed: prefs?.sidebarCollapsed ?? false,
                viewMode: prefs?.viewMode || 'table',
                itemsPerPage: prefs?.itemsPerPage || 10,
                showImages: prefs?.showImages ?? true,
            });
        },

        // Call this when user logs out to reset to defaults
        resetToDefaults: () => {
            set({
                _currentUserId: null,
                theme: 'light',
                backgroundEffect: 'none',
                sidebarCollapsed: false,
                viewMode: 'table',
                itemsPerPage: 10,
                showImages: true,
            });
        },
    })
);

export default useUIStore;
