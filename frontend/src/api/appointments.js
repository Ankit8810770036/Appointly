import { request } from './apiClient';

export const appointmentApi = {
    getMy: (token) => request('/appointments', { headers: { Authorization: `Bearer ${token}` } }),
    create: (payload, token) => request('/appointments', { method: 'POST', body: payload, headers: { Authorization: `Bearer ${token}` } }),
    updateStatus: (id, status, token) => request(`/appointments/${id}/status`, { method: 'PATCH', body: { status }, headers: { Authorization: `Bearer ${token}` } }),
    getProviderSlots: (providerId) => request(`/appointments/provider/${providerId}/slots`)
};

