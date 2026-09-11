import { request } from './apiClient';

export const notificationApi = {
    getMy: (token) =>
        request('/notifications', {
            headers: { Authorization: `Bearer ${token}` },
        }),

    markAsRead: (id, token) =>
        request(`/notifications/${id}/read`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
        }),

    markAllAsRead: (token) =>
        request('/notifications/read-all', {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
        }),
};
