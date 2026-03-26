import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try {
            const stored = localStorage.getItem('abs_user') || sessionStorage.getItem('abs_user');
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });
    const [token, setToken] = useState(() => localStorage.getItem('abs_token') || sessionStorage.getItem('abs_token') || null);

    const login = useCallback((userData, authToken, persist = true) => {
        setUser(userData);
        setToken(authToken);

        const storage = persist ? localStorage : sessionStorage;
        const other = persist ? sessionStorage : localStorage;

        storage.setItem('abs_user', JSON.stringify(userData));
        storage.setItem('abs_token', authToken);

        other.removeItem('abs_user');
        other.removeItem('abs_token');
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('abs_user');
        localStorage.removeItem('abs_token');
        sessionStorage.removeItem('abs_user');
        sessionStorage.removeItem('abs_token');
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
