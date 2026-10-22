import { request } from './apiClient';

export const adminApi = {
    getPendingVerifications: (token) =>
        request('/admin/pending-verifications', {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),

    getUsers: (params = {}, token) => {
        const query = new URLSearchParams(params).toString();
        return request(`/admin/users${query ? `?${query}` : ''}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
    },

    getReviews: (token) =>
        request('/admin/reviews', {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),

    getStats: (token) =>
        request('/admin/stats', {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),

    verifyProvider: (providerId, status, token, reason = null) =>
        request('/admin/verify-provider', {
            method: 'POST',
            body: { providerId, status, reason },
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),

    deleteUser: (userId, token, reason = null) =>
        request(`/admin/users/${userId}`, {
            method: 'DELETE',
            body: { reason },
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),

    deleteReview: (reviewId, type, token, reason = null) =>
        request(`/admin/reviews/${reviewId}?type=${type}&reason=${encodeURIComponent(reason || '')}`, {
            method: 'DELETE',
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),

    getComplaints: (token) =>
        request('/admin/complaints', {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),

    updateComplaint: (complaintId, data, token) =>
        request(`/admin/complaints/${complaintId}`, {
            method: 'PATCH',
            body: data,
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),

    getAllAppointments: (params = {}, token) => {
        const query = new URLSearchParams(params).toString();
        return request(`/admin/appointments${query ? `?${query}` : ''}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
    },

    getAppointmentById: (id, token) =>
        request(`/admin/appointments/${id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),

    updateAppointmentStatus: (id, status, note, token, reason = null) =>
        request(`/admin/appointments/${id}/status`, {
            method: 'PATCH',
            body: { status, note, reason },
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),

    getAuditLogs: (params = {}, token) => {
        const query = new URLSearchParams(params).toString();
        return request(`/admin/audit-logs${query ? `?${query}` : ''}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
    }
};
