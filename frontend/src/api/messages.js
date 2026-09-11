import { request } from './apiClient';

export const messageApi = {
    send: (payload, token) =>
        request('/messages', {
            method: 'POST',
            body: payload,
            headers: { Authorization: `Bearer ${token}` },
        }),

    getConversations: (token) =>
        request('/messages/conversations', {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getChatHistory: (otherUserId, token) =>
        request(`/messages/with/${otherUserId}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    markAsRead: (otherUserId, token) =>
        request(`/messages/read/${otherUserId}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
        }),
};
