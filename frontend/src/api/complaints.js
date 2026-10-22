import { request } from './apiClient';

export const complaintApi = {
    create: (data, token) =>
        request('/complaints', {
            method: 'POST',
            body: data,
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),

    getMy: (token) =>
        request('/complaints/my', {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
};
