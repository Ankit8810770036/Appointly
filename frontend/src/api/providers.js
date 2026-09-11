import { request } from './apiClient';

export const providerApi = {
    getAll: (search = '', specialty = '', location = '', date = '', name = '', maxPrice = '', lat = '', lng = '', radius = '') => {
        const queryObj = {};
        if (search) queryObj.search = search;
        if (specialty) queryObj.specialty = specialty;
        if (location) queryObj.location = location;
        if (date) queryObj.date = date;
        if (name) queryObj.name = name;
        if (maxPrice) queryObj.maxPrice = maxPrice;
        if (lat) queryObj.lat = lat;
        if (lng) queryObj.lng = lng;
        if (radius) queryObj.radius = radius;
        const queryStr = new URLSearchParams(queryObj).toString();
        return request(`/providers${queryStr ? `?${queryStr}` : ''}`);
    },
    getById: (id, token) => request(`/providers/${id}`, token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    addService: (payload, token) => request('/providers/services', { method: 'POST', body: payload, headers: { Authorization: `Bearer ${token}` } }),
    deleteService: (id, token) => request(`/providers/services/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
    updateProfile: (payload, token) => request('/providers/profile', { method: 'PUT', body: payload, headers: { Authorization: `Bearer ${token}` } }),
    getEarnings: (token) => request('/providers/earnings', { headers: { Authorization: `Bearer ${token}` } }),
    uploadVerification: async (file, token) => {
        const formData = new FormData();
        formData.append('verificationDocument', file);
        return request('/providers/verify', {
            method: 'POST',
            body: formData,
            headers: { Authorization: `Bearer ${token}` },
        });
    },
};
