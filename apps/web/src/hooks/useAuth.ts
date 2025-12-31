'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    loading: boolean;
    error: string | null;
}

export function useAuth(options: { required?: boolean } = { required: true }) {
    const [state, setState] = useState<AuthState>({
        user: null,
        token: null,
        loading: true,
        error: null
    });
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            setState({ user: null, token: null, loading: false, error: 'No token' });
            if (options.required) {
                router.push('/login');
            }
            return;
        }

        try {
            // JWT 디코딩 (페이로드만)
            const payload = JSON.parse(atob(token.split('.')[1]));
            
            // 토큰 만료 체크
            if (payload.exp && payload.exp * 1000 < Date.now()) {
                localStorage.removeItem('token');
                setState({ user: null, token: null, loading: false, error: 'Token expired' });
                if (options.required) router.push('/login');
                return;
            }

            const user: User = {
                id: payload.sub || payload.userId || payload.id || 'unknown',
                email: payload.email || '',
                name: payload.username || payload.name || 'User',
                role: payload.role || 'user'
            };

            setState({ user, token, loading: false, error: null });
        } catch (e) {
            console.error('Failed to parse token:', e);
            localStorage.removeItem('token');
            setState({ user: null, token: null, loading: false, error: 'Invalid token' });
            if (options.required) router.push('/login');
        }
    }, [router, options.required]);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        setState({ user: null, token: null, loading: false, error: null });
        router.push('/login');
    }, [router]);

    const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No auth token');

        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        const response = await fetch(url, { ...options, headers });
        
        if (response.status === 401) {
            localStorage.removeItem('token');
            router.push('/login');
            throw new Error('Unauthorized');
        }

        return response;
    }, [router]);

    return {
        ...state,
        isAuthenticated: !!state.user,
        logout,
        authFetch
    };
}

export default useAuth;
