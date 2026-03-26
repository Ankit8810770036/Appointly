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

export const favoriteApi = {
    getMy: (token) => request('/favorites', { headers: { Authorization: `Bearer ${token}` } }),
    toggle: (providerProfileId, token) => request('/favorites/toggle', {
        method: 'POST',
        body: JSON.stringify({ providerProfileId }),
        headers: { Authorization: `Bearer ${token}` }
    })
};
