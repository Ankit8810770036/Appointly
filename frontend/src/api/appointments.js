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

export const appointmentApi = {
    getMy: (token) => request('/appointments', { headers: { Authorization: `Bearer ${token}` } }),
    create: (payload, token) => request('/appointments', { method: 'POST', body: JSON.stringify(payload), headers: { Authorization: `Bearer ${token}` } }),
    updateStatus: (id, status, token) => request(`/appointments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }), headers: { Authorization: `Bearer ${token}` } }),
    getProviderSlots: (providerId) => request(`/appointments/provider/${providerId}/slots`)
};
