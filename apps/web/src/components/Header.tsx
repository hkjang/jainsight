'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import UserMenu from './UserMenu';
import useAuth from '../hooks/useAuth';

const API_URL = '/api';

// 페이지 경로별 브레드크럼 정보
const pathLabels: Record<string, { label: string; icon: string }> = {
    '/dashboard': { label: '대시보드', icon: '🏠' },
    '/profile': { label: '프로필', icon: '👤' },
    '/settings': { label: '설정', icon: '⚙️' },
    '/security': { label: '보안', icon: '🔒' },
    '/activity': { label: '활동', icon: '📋' },
    '/notifications': { label: '알림', icon: '🔔' },
    '/favorites': { label: '즐겨찾기', icon: '⭐' },
    '/editor': { label: 'SQL 에디터', icon: '📝' },
    '/connections': { label: '연결', icon: '🔌' },
    '/schemas': { label: '스키마', icon: '🗂️' },
    '/audit': { label: '감사 로그', icon: '📜' },
    '/admin': { label: '관리자', icon: '👑' },
};

export function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, token, isAuthenticated } = useAuth({ required: false });
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const currentPath = pathLabels[pathname || ''] || { label: '홈', icon: '🏠' };

    // 알림 개수 가져오기
    const fetchUnreadCount = useCallback(async () => {
        if (!user?.id || !token) return;
        try {
            const res = await fetch(`${API_URL}/users/${user.id}/notifications?limit=1`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUnreadCount(data.unreadCount || 0);
            }
        } catch { /* ignore */ }
    }, [user, token]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchUnreadCount();
            const interval = setInterval(fetchUnreadCount, 30000);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated, fetchUnreadCount]);

    // 키보드 단축키
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+K: 검색
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('header-search')?.focus();
            }
            // G+D: 대시보드
            if (e.key === 'd' && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT') {
                const target = document.activeElement as HTMLElement;
                if (target.getAttribute('data-last-key') === 'g') {
                    router.push('/dashboard');
                }
            }
            // 마지막 키 저장
            if (e.key === 'g') {
                (document.activeElement as HTMLElement)?.setAttribute('data-last-key', 'g');
                setTimeout(() => (document.activeElement as HTMLElement)?.removeAttribute('data-last-key'), 500);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [router]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    return (
        <header style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 20px', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(99, 102, 241, 0.1)', minHeight: '56px'
        }}>
            {/* 왼쪽: 브레드크럼 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '180px' }}>
                <a href="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: '13px', transition: 'color 0.2s' }}>홈</a>
                <span style={{ color: '#475569', fontSize: '12px' }}>/</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e2e8f0', fontSize: '13px', fontWeight: '500' }}>
                    <span>{currentPath.icon}</span>
                    {currentPath.label}
                </span>
            </div>

            {/* 중앙: 검색 */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', maxWidth: '400px', margin: '0 20px' }}>
                <form onSubmit={handleSearch} style={{ width: '100%', position: 'relative' }}>
                    <input
                        id="header-search"
                        type="text"
                        placeholder="검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        style={{
                            width: '100%', padding: '8px 14px', paddingLeft: '36px',
                            background: searchFocused ? 'rgba(30, 27, 75, 0.8)' : 'rgba(30, 27, 75, 0.5)',
                            border: searchFocused ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(99,102,241,0.15)',
                            borderRadius: '8px', color: '#e2e8f0', fontSize: '13px', outline: 'none', transition: 'all 0.2s'
                        }}
                    />
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '14px' }}>🔍</span>
                    {!searchFocused && (
                        <kbd style={{
                            position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                            padding: '2px 6px', background: 'rgba(99,102,241,0.1)', borderRadius: '4px',
                            fontSize: '10px', color: '#64748b', border: '1px solid rgba(99,102,241,0.15)'
                        }}>⌘K</kbd>
                    )}
                </form>
            </div>

            {/* 오른쪽: 아이콘 버튼들 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* 알림 */}
                <a href="/notifications" title="알림" style={{
                    position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(30, 27, 75, 0.5)',
                    textDecoration: 'none', transition: 'all 0.2s', border: '1px solid rgba(99,102,241,0.1)'
                }}>
                    <span style={{ fontSize: '16px' }}>🔔</span>
                    {unreadCount > 0 && (
                        <span style={{
                            position: 'absolute', top: '-3px', right: '-3px',
                            minWidth: '16px', height: '16px', padding: '0 4px',
                            background: '#ef4444', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold',
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </a>

                {/* 즐겨찾기 */}
                <a href="/favorites" title="즐겨찾기" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(30, 27, 75, 0.5)',
                    textDecoration: 'none', transition: 'all 0.2s', border: '1px solid rgba(99,102,241,0.1)'
                }}>
                    <span style={{ fontSize: '16px' }}>⭐</span>
                </a>

                {/* 새 쿼리 */}
                <a href="/editor" title="새 쿼리" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.2)',
                    textDecoration: 'none', transition: 'all 0.2s', border: '1px solid rgba(99,102,241,0.3)'
                }}>
                    <span style={{ fontSize: '16px' }}>➕</span>
                </a>

                {/* 구분선 */}
                <div style={{ width: '1px', height: '24px', background: 'rgba(99,102,241,0.15)', margin: '0 4px' }} />

                {/* 사용자 메뉴 */}
                <UserMenu />
            </div>
        </header>
    );
}

export default Header;
