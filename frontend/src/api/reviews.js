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

export const reviewApi = {
    create: (payload, token) =>
        request('/reviews', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { Authorization: `Bearer ${token}` },
        }),

    getProviderReviews: (providerProfileId) =>
        request(`/reviews/provider/${providerProfileId}`),
};
