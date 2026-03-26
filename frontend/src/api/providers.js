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

export const providerApi = {
    getAll: (search = '', specialty = '', location = '', date = '') =>
        request(`/providers?search=${search}&specialty=${specialty}&location=${location}&date=${date}`),
    getById: (id) => request(`/providers/${id}`),
    addService: (payload, token) => request('/providers/services', { method: 'POST', body: JSON.stringify(payload), headers: { Authorization: `Bearer ${token}` } }),
    deleteService: (id, token) => request(`/providers/services/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
    updateProfile: (payload, token) => request('/providers/profile', { method: 'PUT', body: JSON.stringify(payload), headers: { Authorization: `Bearer ${token}` } }),
    getEarnings: (token) => request('/providers/earnings', { headers: { Authorization: `Bearer ${token}` } }),
};
