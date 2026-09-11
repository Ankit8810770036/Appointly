import { request } from './apiClient';

export const addressApi = {
    getAll: async (token) => {
        return request('/addresses', {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
    },

    create: async (data, token) => {
        return request('/addresses', {
            method: 'POST',
            body: data,
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
    },

    update: async (id, data, token) => {
        return request(`/addresses/${id}`, {
            method: 'PUT',
            body: data,
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
    },

    delete: async (id, token) => {
        return request(`/addresses/${id}`, {
            method: 'DELETE',
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
    },

    setDefault: async (id, token) => {
        return request(`/addresses/${id}`, {
            method: 'PUT',
            body: { isDefault: true },
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
    }
};
