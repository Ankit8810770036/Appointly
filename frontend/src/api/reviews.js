import { request } from './apiClient';

export const reviewApi = {
    create: (payload, token) =>
        request('/reviews', {
            method: 'POST',
            body: payload,
            headers: { Authorization: `Bearer ${token}` },
        }),

    getProviderReviews: (providerProfileId) =>
        request(`/reviews/provider/${providerProfileId}`),
};
