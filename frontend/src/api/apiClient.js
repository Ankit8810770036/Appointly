const BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

const clearAuthAndRedirect = () => {
    localStorage.removeItem('abs_user');
    localStorage.removeItem('abs_token');
    localStorage.removeItem('abs_refreshToken');
    sessionStorage.removeItem('abs_user');
    sessionStorage.removeItem('abs_token');
    sessionStorage.removeItem('abs_refreshToken');

    if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?expired=true';
    }
};

/**
 * Shared request function for all API calls
 * Handles:
 * 1. Automatic JSON stringifying/parsing
 * 2. Error handling (non-OK responses)
 * 3. Token expiration (401) detection with seamless token refresh & request retry
 */
export async function request(endpoint, options = {}, isRetry = false) {
    const { headers = {}, body, ...restOptions } = options;

    const isFormData = body instanceof FormData;
    
    // Attach authorization token from storage if not already explicitly set
    const currentToken = localStorage.getItem('abs_token') || sessionStorage.getItem('abs_token');
    const finalHeaders = {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(currentToken && !headers.Authorization && !headers.authorization ? { Authorization: `Bearer ${currentToken}` } : {}),
        ...headers,
    };

    const res = await fetch(`${BASE}${endpoint}`, {
        ...restOptions,
        body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
        headers: finalHeaders,
    });

    // Parse JSON if response is not empty
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        const msg = (data.message || '').toLowerCase();
        const isExpired = res.status === 401 && (
            msg === 'jwt expired' || 
            msg === 'token expired' ||
            msg === 'not authorized, no token' ||
            msg.includes('jwt expired') ||
            msg.includes('token expired') ||
            msg.includes('expired')
        );

        if (isExpired && !isRetry && !endpoint.includes('/auth/refresh-token') && !endpoint.includes('/auth/login')) {
            const refreshToken = localStorage.getItem('abs_refreshToken') || sessionStorage.getItem('abs_refreshToken');
            
            if (refreshToken) {
                try {
                    const refreshRes = await fetch(`${BASE}/auth/refresh-token`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ refreshToken })
                    });
                    const refreshData = await refreshRes.json();

                    if (refreshRes.ok && (refreshData.token || refreshData.accessToken)) {
                        const newToken = refreshData.accessToken || refreshData.token;
                        const newRefreshToken = refreshData.refreshToken || refreshToken;

                        if (localStorage.getItem('abs_token')) {
                            localStorage.setItem('abs_token', newToken);
                            localStorage.setItem('abs_refreshToken', newRefreshToken);
                        } else {
                            sessionStorage.setItem('abs_token', newToken);
                            sessionStorage.setItem('abs_refreshToken', newRefreshToken);
                        }

                        // Retry original request with new access token
                        return request(endpoint, {
                            ...options,
                            headers: {
                                ...headers,
                                Authorization: `Bearer ${newToken}`
                            }
                        }, true);
                    }
                } catch (err) {
                    console.error('Failed to auto-refresh token:', err);
                }
            }

            console.warn('Session expired. Logging out...');
            clearAuthAndRedirect();
        } else if (res.status === 401 && endpoint.includes('/auth/refresh-token')) {
            clearAuthAndRedirect();
        }
        
        throw new Error(data.message || 'Request failed');
    }

    return data;
}
