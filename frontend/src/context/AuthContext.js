import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useCallback } from 'react';
const AuthContext = createContext(undefined);
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState('buyer');
    const [tokens, setTokensState] = useState(() => {
        const stored = localStorage.getItem('api_tokens');
        return stored ? JSON.parse(stored) : {};
    });
    const login = useCallback((newUser) => {
        setUser(newUser);
        setRole(newUser.role);
        localStorage.setItem('user', JSON.stringify(newUser));
    }, []);
    const logout = useCallback(() => {
        setUser(null);
        setTokensState({});
        localStorage.removeItem('user');
        localStorage.removeItem('api_tokens');
    }, []);
    const setTokens = useCallback((newTokens) => {
        setTokensState(newTokens);
        localStorage.setItem('api_tokens', JSON.stringify(newTokens));
    }, []);
    const value = {
        user,
        isAuthenticated: !!user,
        role,
        setRole: (newRole) => {
            setRole(newRole);
            if (user) {
                const updatedUser = { ...user, role: newRole };
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
            }
        },
        login,
        logout,
        tokens,
        setTokens,
    };
    return _jsx(AuthContext.Provider, { value: value, children: children });
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
