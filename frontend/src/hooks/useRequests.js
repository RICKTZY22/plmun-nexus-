import { useState, useCallback } from 'react';
import { requestService } from '../services';

// Shared stats calculation — used after every action that changes request data
const buildStats = (items) => ({
    total: items.length,
    pending: items.filter(r => r.status === 'PENDING').length,
    approved: items.filter(r => r.status === 'APPROVED').length,
    rejected: items.filter(r => r.status === 'REJECTED').length,
    completed: items.filter(r => r.status === 'COMPLETED').length,
    returned: items.filter(r => r.status === 'RETURNED').length,
    highPriority: items.filter(r => r.priority === 'HIGH').length,
});

const useRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [stats, setStats] = useState(buildStats([]));

    const clearError = useCallback(() => setError(null), []);

    // Re-fetch all requests from the server and recalculate stats
    const refreshAll = useCallback(async () => {
        const data = await requestService.getAll();
        const items = Array.isArray(data) ? data : data.results || [];
        setRequests(items);
        setStats(buildStats(items));
        return items;
    }, []);

    const fetchRequests = useCallback(async (filters = {}) => {
        setLoading(true);
        setError(null);
        try {
            const data = await requestService.getAll(filters);
            const items = Array.isArray(data) ? data : data.results || [];
            setRequests(items);
            setStats(buildStats(items));
        } catch (err) {
            console.error('Fetch requests error:', err);
            setError(err.response?.data?.detail || 'Failed to fetch requests');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchStats = useCallback(async () => {
        try {
            const data = await requestService.getStats();
            setStats(data);
        } catch (err) {
            console.error('Fetch stats error:', err);
        }
    }, []);

    const checkOverdue = useCallback(async () => {
        try {
            return await requestService.checkOverdue();
        } catch (err) {
            console.error('Check overdue error:', err);
            return null;
        }
    }, []);

    const createRequest = useCallback(async (request) => {
        setLoading(true);
        setError(null);
        try {
            const newRequest = await requestService.create(request);
            setRequests(prev => [newRequest, ...prev]);
            return { success: true, request: newRequest, message: 'Request submitted successfully' };
        } catch (err) {
            const errorMessage = err.response?.data?.detail ||
                JSON.stringify(err.response?.data) ||
                'Failed to create request';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    }, []);

    // Generic action handler: call endpoint, re-fetch, return result
    const handleAction = useCallback(async (action, successMsg, failMsg) => {
        setLoading(true);
        setError(null);
        try {
            await action();
            await refreshAll();
            return { success: true, message: successMsg };
        } catch (err) {
            const errorMessage = err.response?.data?.detail || err.response?.data?.error || failMsg;
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    }, [refreshAll]);

    const approveRequest = useCallback((id) =>
        handleAction(() => requestService.approve(id), 'Request approved successfully', 'Failed to approve request'),
        [handleAction]);

    const rejectRequest = useCallback((id, reason = '') =>
        handleAction(() => requestService.reject(id, reason), 'Request rejected', 'Failed to reject request'),
        [handleAction]);

    const completeRequest = useCallback((id) =>
        handleAction(() => requestService.complete(id), 'Request marked as completed', 'Failed to complete request'),
        [handleAction]);

    const returnRequest = useCallback((id) =>
        handleAction(() => requestService.returnItem(id), 'Item returned successfully', 'Failed to return item'),
        [handleAction]);

    const clearCompleted = useCallback(() =>
        handleAction(() => requestService.clearCompleted(), 'Completed requests cleared', 'Failed to clear requests'),
        [handleAction]);

    const cancelRequest = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        try {
            await requestService.cancel(id);
            setRequests(prev => prev.filter(req => req.id !== id));
            return { success: true, message: 'Request cancelled' };
        } catch (err) {
            const errorMessage = err.response?.data?.detail || 'Failed to cancel request';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    }, []);

    const getComments = useCallback(async (requestId) => {
        try {
            const data = await requestService.getComments(requestId);
            return Array.isArray(data) ? data : data.results || [];
        } catch (err) {
            console.error('Get comments error:', err);
            return [];
        }
    }, []);

    const addComment = useCallback(async (requestId, text) => {
        try {
            const comment = await requestService.addComment(requestId, text);
            return { success: true, comment };
        } catch (err) {
            const errorMessage = err.response?.data?.detail || 'Failed to add comment';
            return { success: false, error: errorMessage };
        }
    }, []);

    return {
        requests,
        loading,
        error,
        clearError,
        selectedRequest,
        setSelectedRequest,
        fetchRequests,
        fetchStats,
        createRequest,
        approveRequest,
        rejectRequest,
        completeRequest,
        cancelRequest,
        returnRequest,
        clearCompleted,
        checkOverdue,
        getComments,
        addComment,
        stats,
    };
};

export default useRequests;
