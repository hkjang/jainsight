'use client';

import { useState, useRef, useEffect } from 'react';
import useAuth from '../hooks/useAuth';

const menuItems = [
    { label: '대시보드', href: '/dashboard', icon: '🏠' },
    { label: '프로필', href: '/profile', icon: '👤' },
    { label: '설정', href: '/settings', icon: '⚙️' },
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

    // ESC로 닫기
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        if (open) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [open]);

    if (loading) {
        return <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(99,102,241,0.2)', animation: 'pulse 1.5s infinite' }} />;
    }

    if (!isAuthenticated) {
        return (
            <a href="/login" style={{
                padding: '10px 20px', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                borderRadius: '10px', color: 'white', textDecoration: 'none', fontSize: '14px', fontWeight: '500',
                display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
            }}>
                🔐 로그인
            </a>
        );
    }

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                aria-haspopup="menu"
                style={{
                    position: 'relative', width: '42px', height: '42px', borderRadius: '50%',
                    border: open ? '2px solid rgba(99,102,241,0.8)' : '2px solid rgba(99,102,241,0.3)',
                    cursor: 'pointer', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white',
                    fontWeight: 'bold', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s', boxShadow: open ? '0 0 0 3px rgba(99,102,241,0.2)' : 'none'
                }}
            >
                {user?.name?.[0]?.toUpperCase() || '?'}
            </button>

            {open && (
                <div 
                    role="menu"
                    style={{
                        position: 'absolute', right: 0, top: '52px', width: '240px',
                        background: 'rgba(20, 17, 50, 0.98)', backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(99,102,241,0.3)', borderRadius: '16px',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.5)', overflow: 'hidden', zIndex: 1000,
                        animation: 'slideDown 0.2s ease-out'
                    }}
                >
                    {/* User Info */}
                    <div style={{ padding: '16px', borderBottom: '1px solid rgba(99,102,241,0.15)', background: 'rgba(99,102,241,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '44px', height: '44px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '18px', fontWeight: 'bold', color: 'white'
                            }}>
                                {user?.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: '600', color: '#e2e8f0', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
                            </div>
                        </div>
                    </div>

                    {/* Menu Items */}
                    <div style={{ padding: '8px 0' }}>
                        {menuItems.map((item) => (
                            <a
                                key={item.href}
                                href={item.href}
                                role="menuitem"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                                    color: '#e2e8f0', textDecoration: 'none', fontSize: '14px', transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.15)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                                <span>{item.label}</span>
                            </a>
                        ))}
                    </div>

                    {/* Logout */}
                    <div style={{ padding: '8px', borderTop: '1px solid rgba(99,102,241,0.15)' }}>
                        <button
                            onClick={logout}
                            style={{
                                width: '100%', padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '14px', fontWeight: '500',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                        >
                            🚪 로그아웃
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
            `}</style>
        </div>
    );
}

export default UserMenu;
