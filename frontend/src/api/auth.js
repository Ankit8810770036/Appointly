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

export const authApi = {
    login: async (email, password, role) => {
        const data = await request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password, role }),
        });
        return {
            user: {
                id: data.id,
                name: data.name,
                email: data.email,
                phone: data.phone,
                location: data.location,
                role: data.role.toLowerCase(),
                providerProfile: data.providerProfile
            },
            token: data.token
        };
    },

    signup: async (payload) => {
        const data = await request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                name: payload.fullName,
                email: payload.email,
                password: payload.password,
                role: payload.role === 'provider' ? 'PROVIDER' : 'CLIENT',
                phone: payload.phone,
                location: payload.location,
                specialty: payload.specialty,
                bio: payload.bio
            }),
        });
        return {
            user: {
                id: data.id,
                name: data.name,
                email: data.email,
                phone: data.phone,
                location: data.location,
                role: data.role.toLowerCase(),
                providerProfile: data.providerProfile
            },
            token: data.token
        };
    },

    me: (token) =>
        request('/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
        }),

    updateMe: async (payload, token) => {
        const data = await request('/auth/me', {
            method: 'PUT',
            body: JSON.stringify(payload),
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
            body: JSON.stringify({ email }),
        });
    },

    resetPassword: async (email, otp, password) => {
        return request('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ email, otp, password }),
        });
    },
};
