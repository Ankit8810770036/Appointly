import { request } from './apiClient';

export const favoriteApi = {
    getMy: (token) => request('/favorites', { headers: { Authorization: `Bearer ${token}` } }),
    toggle: (providerProfileId, token) => request('/favorites/toggle', {
        method: 'POST',
        body: { providerProfileId },
        headers: { Authorization: `Bearer ${token}` }
    })
};
