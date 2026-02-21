import api from './api';

const userService = {
    getAll: async (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.search) params.append('search', filters.search);
        if (filters.role) params.append('role', filters.role);
        if (filters.is_active !== undefined) params.append('is_active', filters.is_active);

        const response = await api.get(`/users/?${params.toString()}`);
        const data = response.data;
        return Array.isArray(data) ? data : data.results ?? data;
    },


    updateRole: async (id, role) => {
        const response = await api.put(`/users/${id}/role/`, { role });
        return response.data;
    },

    toggleStatus: async (id) => {
        const response = await api.post(`/users/${id}/toggle_status/`);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/users/${id}/`);
        return response.data;
    },

    getStats: async () => {
        const response = await api.get('/users/stats/');
        return response.data;
    },

    unflagUser: async (id) => {
        const response = await api.post(`/users/${id}/unflag/`);
        return response.data;
    },
};

export default userService;
