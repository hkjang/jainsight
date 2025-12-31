'use client';

import { useState, useRef, useEffect } from 'react';
import useAuth from '../hooks/useAuth';

const menuItems = [
    { label: '대시보드', href: '/dashboard', icon: '🏠' },
    { label: '프로필', href: '/profile', icon: '👤' },
    { label: '설정', href: '/settings', icon: '⚙️' },
    { label: '알림', href: '/notifications', icon: '🔔', badge: true },
    { label: '즐겨찾기', href: '/favorites', icon: '⭐' },
    { label: '보안', href: '/security', icon: '🔒' },
    { label: '활동', href: '/activity', icon: '📋' },
];

export function UserMenu() {
    const { user, loading, isAuthenticated, logout } = useAuth({ required: false });
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (loading) return <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(99,102,241,0.2)' }} />;
    if (!isAuthenticated) {
        return (
            <a href="/login" style={{ padding: '8px 16px', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: '8px', color: 'white', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}>
                로그인
            </a>
        );
    }

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                onClick={() => setOpen(!open)}
                style={{
                    width: '36px', height: '36px', borderRadius: '50%', border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: 'bold', fontSize: '14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
            >
                {user?.name?.[0]?.toUpperCase() || '?'}
            </button>

            {open && (
                <div style={{
                    position: 'absolute', right: 0, top: '44px', width: '220px',
                    background: 'rgba(30, 27, 75, 0.98)', border: '1px solid rgba(99,102,241,0.3)',
                    borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', overflow: 'hidden', zIndex: 1000
                }}>
                    {/* User Info */}
                    <div style={{ padding: '16px', borderBottom: '1px solid rgba(99,102,241,0.2)' }}>
                        <div style={{ fontWeight: '600', color: '#e2e8f0' }}>{user?.name}</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{user?.email}</div>
                    </div>

                    {/* Menu Items */}
                    <div style={{ padding: '8px 0' }}>
                        {menuItems.map((item) => (
                            <a
                                key={item.href}
                                href={item.href}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px',
                                    color: '#e2e8f0', textDecoration: 'none', fontSize: '14px', transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.15)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <span>{item.icon}</span>
                                <span style={{ flex: 1 }}>{item.label}</span>
                            </a>
                        ))}
                    </div>

                    {/* Logout */}
                    <div style={{ padding: '8px', borderTop: '1px solid rgba(99,102,241,0.2)' }}>
                        <button
                            onClick={logout}
                            style={{
                                width: '100%', padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '14px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                        >
                            🚪 로그아웃
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default UserMenu;
