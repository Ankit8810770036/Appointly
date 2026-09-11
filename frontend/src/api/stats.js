import { request } from './apiClient';

export const statsApi = {
    getPublicStats: () => request('/public/stats'),
    getSiteReviews: () => request('/public/site-reviews')
};

export const siteReviewApi = {
    create: (payload, token = null) => {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        return request('/site-reviews', {
            method: 'POST',
            body: payload,
            headers
        });
    }
};
