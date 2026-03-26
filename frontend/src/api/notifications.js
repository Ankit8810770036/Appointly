const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
    const { headers, ...restOptions } = options;
    const res = await fetch(`${BASE}${endpoint}`, {
        ...restOptions,
        headers: { 'Content-Type': 'application/json', ...headers },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
}

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
