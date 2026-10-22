import { request } from './apiClient';

export const appointmentApi = {
    getMy: (token) => request('/appointments', { headers: { Authorization: `Bearer ${token}` } }),
    create: (payload, token) => request('/appointments', { method: 'POST', body: payload, headers: { Authorization: `Bearer ${token}` } }),
    updateStatus: (id, status, token, options = {}) => request(`/appointments/${id}/status`, {
        method: 'PATCH',
        body: { status, ...options },
        headers: { Authorization: `Bearer ${token}` }
    }),
    getProviderSlots: (providerId) => request(`/appointments/provider/${providerId}/slots`),
    holdSlot: (payload, token) => request('/appointments/hold-slot', { method: 'POST', body: payload, headers: { Authorization: `Bearer ${token}` } }),
    releaseSlot: (payload, token) => request('/appointments/release-slot', { method: 'POST', body: payload, headers: { Authorization: `Bearer ${token}` } }),
    getProviderHolds: (providerId, date, token) => request(`/appointments/provider/${providerId}/holds${date ? `?date=${date}` : ''}`, token ? { headers: { Authorization: `Bearer ${token}` } } : {})
};


