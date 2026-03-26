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

export const messageApi = {
    send: (payload, token) =>
        request('/messages', {
            method: 'POST',
            body: JSON.stringify(payload),
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
};
