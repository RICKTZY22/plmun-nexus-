import api from './api';

const inventoryService = {
    getAll: async (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.search) params.append('search', filters.search);
        if (filters.category) params.append('category', filters.category);
        if (filters.status) params.append('status', filters.status);

        const response = await api.get(`/inventory/?${params.toString()}`);
        const data = response.data;
        return Array.isArray(data) ? data : data.results ?? data;
    },


    create: async (item) => {
        const hasFile = Object.values(item).some(v => v instanceof File);
        if (hasFile) {
            const formData = new FormData();
            Object.entries(item).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    formData.append(key, value);
                }
            });
            const response = await api.post('/inventory/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data;
        }
        const response = await api.post('/inventory/', item);
        return response.data;
    },

    update: async (id, data) => {
        const hasFile = Object.values(data).some(v => v instanceof File);
        if (hasFile) {
            const formData = new FormData();
            Object.entries(data).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    formData.append(key, value);
                }
            });
            const response = await api.put(`/inventory/${id}/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data;
        }
        const response = await api.put(`/inventory/${id}/`, data);
        return response.data;
    },


    delete: async (id) => {
        const response = await api.delete(`/inventory/${id}/`);
        return response.data;
    },

    getLowStock: async () => {
        const response = await api.get('/inventory/low_stock/');
        return response.data;
    },

    getOutOfStock: async () => {
        const response = await api.get('/inventory/out_of_stock/');
        return response.data;
    },

    getStats: async () => {
        const response = await api.get('/inventory/stats/');
        return response.data;
    },

};

export default inventoryService;
