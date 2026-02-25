import { useState, useEffect, useCallback, useRef } from 'react';
import notificationService from '../services/notificationService';

const POLL_INTERVAL = 10000; // 10 seconds — near-real-time

const useNotifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const intervalRef = useRef(null);

    const fetchNotifications = useCallback(async () => {
        try {
            setLoading(true);
            const data = await notificationService.getAll();
            const list = Array.isArray(data) ? data : data.results || [];
            setNotifications(list);
            setUnreadCount(list.filter(n => !n.isRead).length);
        } catch (err) {
            // silently fail — error state handled by UI
        } finally {
            setLoading(false);
        }
    }, []);

    // Lightweight poll that only updates state if something changed
    const pollNotifications = useCallback(async () => {
        try {
            const data = await notificationService.getAll();
            const list = Array.isArray(data) ? data : data.results || [];
            setNotifications(prev => {
                // Only update if the count or content actually changed
                if (prev.length !== list.length || JSON.stringify(prev.map(n => n.id)) !== JSON.stringify(list.map(n => n.id))) {
                    return list;
                }
                // Check for read status changes
                const hasReadChanges = prev.some((n, i) => list[i] && n.isRead !== list[i].isRead);
                return hasReadChanges ? list : prev;
            });
            setUnreadCount(list.filter(n => !n.isRead).length);
        } catch (err) {
            // silently fail on polling
        }
    }, []);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const count = await notificationService.getUnreadCount();
            setUnreadCount(count);
        } catch (err) {
            // silently fail on polling
        }
    }, []);

    const markAsRead = useCallback(async (id) => {
        try {
            await notificationService.markAsRead(id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            // silently fail
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (err) {
            // silently fail
        }
    }, []);

    const deleteNotification = useCallback(async (id) => {
        try {
            await notificationService.deleteOne(id);
            setNotifications(prev => {
                const updated = prev.filter(n => n.id !== id);
                setUnreadCount(updated.filter(n => !n.isRead).length);
                return updated;
            });
        } catch (err) {
            // silently fail
        }
    }, []);

    const clearAll = useCallback(async () => {
        try {
            await notificationService.clearAll();
            setNotifications([]);
            setUnreadCount(0);
        } catch (err) {
            // silently fail
        }
    }, []);

    // Initial fetch + polling — only when authenticated (BUG-03)
    useEffect(() => {
        // Check if user has a valid auth token before polling
        const hasToken = () => {
            try {
                const stored = localStorage.getItem('auth-storage');
                const parsed = stored ? JSON.parse(stored) : null;
                return Boolean(parsed?.state?.accessToken);
            } catch { return false; }
        };

        if (!hasToken()) return;

        fetchNotifications();
        intervalRef.current = setInterval(() => {
            if (hasToken()) pollNotifications();
            else clearInterval(intervalRef.current);
        }, POLL_INTERVAL);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchNotifications, pollNotifications]);

    return {
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
    };
};

export default useNotifications;
