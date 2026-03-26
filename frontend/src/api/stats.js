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

export const statsApi = {
    getPublicStats: () => request('/public/stats'),
    getSiteReviews: () => request('/public/site-reviews')
};

export const siteReviewApi = {
    create: (payload, token = null) => {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        return request('/site-reviews', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers
        });
    }
};
