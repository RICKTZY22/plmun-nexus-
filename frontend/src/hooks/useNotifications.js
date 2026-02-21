import { useState, useEffect, useCallback, useRef } from 'react';
import notificationService from '../services/notificationService';

const POLL_INTERVAL = 30000; // 30 seconds

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
            console.error('Failed to fetch notifications:', err);
        } finally {
            setLoading(false);
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
            console.error('Failed to mark notification as read:', err);
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to mark all notifications as read:', err);
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
            console.error('Failed to delete notification:', err);
        }
    }, []);

    const clearAll = useCallback(async () => {
        try {
            await notificationService.clearAll();
            setNotifications([]);
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to clear notifications:', err);
        }
    }, []);

    // Initial fetch + polling
    useEffect(() => {
        fetchNotifications();
        intervalRef.current = setInterval(fetchUnreadCount, POLL_INTERVAL);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchNotifications, fetchUnreadCount]);

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
