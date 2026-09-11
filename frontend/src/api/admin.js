import { request } from './apiClient';

export const adminApi = {
    getPendingVerifications: (token) =>
        request('/admin/pending-verifications', {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),

    getUsers: (token) =>
        request('/admin/users', {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),

    getReviews: (token) =>
        request('/admin/reviews', {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),

    getStats: (token) =>
        request('/admin/stats', {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),

    verifyProvider: (providerId, status, token) =>
        request('/admin/verify-provider', {
            method: 'POST',
            body: { providerId, status },
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),

    deleteUser: (userId, token) =>
        request(`/admin/users/${userId}`, {
            method: 'DELETE',
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),

    deleteReview: (reviewId, type, token) =>
        request(`/admin/reviews/${reviewId}?type=${type}`, {
            method: 'DELETE',
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
};
