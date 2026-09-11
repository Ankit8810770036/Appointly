import { request } from './apiClient';

export const authApi = {
    login: async (email, password, role) => {
        const data = await request('/auth/login', {
            method: 'POST',
            body: { email, password, role },
        });
        return {
            user: {
                id: data.id,
                name: data.name,
                email: data.email,
                phone: data.phone,
                location: data.location,
                streetAddress: data.streetAddress,
                city: data.city,
                state: data.state,
                zipCode: data.zipCode,
                latitude: data.latitude,
                longitude: data.longitude,
                role: data.role.toLowerCase(),
                providerProfile: data.providerProfile
            },
            token: data.accessToken || data.token,
            accessToken: data.accessToken || data.token,
            refreshToken: data.refreshToken
        };
    },

    signup: async (payload) => {
        const data = await request('/auth/register', {
            method: 'POST',
            body: {
                name: payload.fullName,
                email: payload.email,
                password: payload.password,
                role: payload.role === 'provider' ? 'PROVIDER' : 'CLIENT',
                phone: payload.phone,
                location: payload.location,
                streetAddress: payload.streetAddress,
                city: payload.city,
                state: payload.state,
                zipCode: payload.zipCode,
                country: payload.country,
                latitude: payload.latitude,
                longitude: payload.longitude,
                specialty: payload.specialty,
                bio: payload.bio
            },
        });
        return {
            user: {
                id: data.id,
                name: data.name,
                email: data.email,
                phone: data.phone,
                location: data.location,
                streetAddress: data.streetAddress,
                city: data.city,
                state: data.state,
                zipCode: data.zipCode,
                latitude: data.latitude,
                longitude: data.longitude,
                role: data.role.toLowerCase(),
                providerProfile: data.providerProfile
            },
            token: data.accessToken || data.token,
            accessToken: data.accessToken || data.token,
            refreshToken: data.refreshToken
        };
    },

    me: (token) =>
        request('/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
        }),

    updateMe: async (payload, token) => {
        const data = await request('/auth/me', {
            method: 'PUT',
            body: payload,
            headers: { Authorization: `Bearer ${token}` },
        });
        return {
            ...data,
            role: data.role.toLowerCase()
        };
    },

    forgotPassword: async (email) => {
        return request('/auth/forgot-password', {
            method: 'POST',
            body: { email },
        });
    },

    resetPassword: async (email, otp, password) => {
        return request('/auth/reset-password', {
            method: 'POST',
            body: { email, otp, password },
        });
    },

    requestOTP: async (type, token) => {
        return request('/auth/request-otp', {
            method: 'POST',
            body: { type },
            headers: { Authorization: `Bearer ${token}` },
        });
    },

    verifyOTP: async (type, otp, token) => {
        return request('/auth/verify-otp', {
            method: 'POST',
            body: { type, otp },
            headers: { Authorization: `Bearer ${token}` },
        });
    },

    googleLogin: async (credential, role) => {
        const data = await request('/auth/google', {
            method: 'POST',
            body: { credential, role },
        });
        return {
            user: {
                id: data.id,
                name: data.name,
                email: data.email,
                phone: data.phone,
                location: data.location,
                streetAddress: data.streetAddress,
                city: data.city,
                state: data.state,
                zipCode: data.zipCode,
                latitude: data.latitude,
                longitude: data.longitude,
                role: data.role.toLowerCase(),
                isNewUser: data.isNewUser,
                providerProfile: data.providerProfile
            },
            token: data.accessToken || data.token,
            accessToken: data.accessToken || data.token,
            refreshToken: data.refreshToken
        };
    },

    sendSignupOTP: async (identifier, type) => {
        return request('/auth/register/send-otp', {
            method: 'POST',
            body: { identifier, type },
        });
    },

    verifySignupOTP: async (identifier, type, otp) => {
        return request('/auth/register/verify-otp', {
            method: 'POST',
            body: { identifier, type, otp },
        });
    },
};
