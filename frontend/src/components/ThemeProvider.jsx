import { useEffect } from 'react';
import useUIStore from '../store/uiStore';
import useAuthStore from '../store/authStore';

/**
 * ThemeProvider component that applies the theme class to the document
 * and listens for system preference changes when in 'system' mode.
 * Also loads per-user UI settings on mount if user is already logged in.
 */
const ThemeProvider = ({ children }) => {
    const { theme, getEffectiveTheme, loadUserSettings } = useUIStore();
    const user = useAuthStore((state) => state.user);

    // Load per-user settings on mount (handles page refresh scenario)
    useEffect(() => {
        if (user?.id) {
            loadUserSettings(user.id);
        }
    }, [user?.id, loadUserSettings]);

    useEffect(() => {
        const applyTheme = () => {
            const effectiveTheme = getEffectiveTheme();
            const root = document.documentElement;

            if (effectiveTheme === 'dark') {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        };

        // Apply theme immediately
        applyTheme();

        // Listen for system preference changes when in 'system' mode
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = () => {
            if (theme === 'system') {
                applyTheme();
            }
        };

        mediaQuery.addEventListener('change', handleChange);

        return () => {
            mediaQuery.removeEventListener('change', handleChange);
        };
    }, [theme, getEffectiveTheme]);

    return children;
};

export default ThemeProvider;

