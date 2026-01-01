'use client';

import { useEffect, useState, useCallback } from 'react';
import { darkTheme, darkStyles, AnimatedCard, TabGroup } from '../../components/admin/AdminUtils';
import useAuth from '../../hooks/useAuth';

const API_URL = '/api';

interface Favorite {
    id: string;
    itemType: 'query' | 'report' | 'connection' | 'dashboard' | 'api';
    itemId: string;
    name?: string;
    description?: string;
    icon?: string;
    createdAt: string;
}

const typeInfo: Record<string, { label: string; icon: string; href: (id: string) => string }> = {
    query: { label: '쿼리', icon: '📊', href: (id) => `/editor?id=${id}` },
    report: { label: '리포트', icon: '📈', href: (id) => `/admin/reports/${id}` },
    connection: { label: '연결', icon: '🔌', href: (id) => `/connections/${id}` },
    dashboard: { label: '대시보드', icon: '📋', href: (id) => `/dashboard?id=${id}` },
    api: { label: 'API Gateway', icon: '🌐', href: (id) => `/api-builder?id=${id}` }
};

export default function FavoritesPage() {
    const { user, token, loading: authLoading, isAuthenticated } = useAuth();
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const fetchFavorites = useCallback(async () => {
        if (!user?.id || !token) return;
        try {
            const params = filter !== 'all' ? `?type=${filter}` : '';
            const response = await fetch(`${API_URL}/users/${user.id}/favorites${params}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.ok) setFavorites(await response.json());
        } catch (error) { console.error('Failed to fetch favorites:', error); }
        finally { setLoading(false); }
    }, [user, token, filter]);

    useEffect(() => {
        if (!authLoading && isAuthenticated) fetchFavorites();
    }, [fetchFavorites, authLoading, isAuthenticated]);

    const handleRemove = async (itemType: string, itemId: string) => {
        if (!user?.id || !token || !confirm('즐겨찾기에서 제거하시겠습니까?')) return;
        try {
            await fetch(`${API_URL}/users/${user.id}/favorites/${itemType}/${itemId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            showNotification('즐겨찾기에서 제거되었습니다.', 'success');
            fetchFavorites();
        } catch { showNotification('제거 실패', 'error'); }
    };

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('ko-KR');

    const filteredFavorites = filter === 'all' ? favorites : favorites.filter(f => f.itemType === filter);

    if (authLoading || loading) {
        return (
            <div style={{ ...darkStyles.container, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <div style={{ textAlign: 'center', color: darkTheme.textSecondary }}>⏳ 로딩 중...</div>
            </div>
        );
    }

    return (
        <div style={darkStyles.container}>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: darkTheme.textPrimary, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    ⭐ 즐겨찾기
                </h1>
                <p style={{ color: darkTheme.textSecondary, marginTop: '4px' }}>자주 사용하는 쿼리, 리포트, 연결</p>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                {Object.entries(typeInfo).map(([type, info], i) => {
                    const count = favorites.filter(f => f.itemType === type).length;
                    return (
                        <AnimatedCard key={type} delay={i * 0.1}>
                            <div style={{ padding: '16px', textAlign: 'center', cursor: 'pointer' }} onClick={() => setFilter(type)}>
                                <span style={{ fontSize: '24px' }}>{info.icon}</span>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: darkTheme.textPrimary, marginTop: '4px' }}>{count}</div>
                                <div style={{ fontSize: '13px', color: darkTheme.textMuted }}>{info.label}</div>
                            </div>
                        </AnimatedCard>
                    );
                })}
            </div>

            <div style={{ marginBottom: '24px' }}>
                <TabGroup
                    tabs={[
                        { id: 'all', label: '전체' },
                        { id: 'query', label: '쿼리', icon: '📊' },
                        { id: 'report', label: '리포트', icon: '📈' },
                        { id: 'connection', label: '연결', icon: '🔌' },
                        { id: 'api', label: 'API Gateway', icon: '🌐' }
                    ]}
                    activeTab={filter}
                    onChange={setFilter}
                />
            </div>

            <AnimatedCard delay={0.4}>
                <div style={{ padding: '16px' }}>
                    {filteredFavorites.length === 0 ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: darkTheme.textMuted }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⭐</div>
                            <div style={{ fontSize: '16px' }}>즐겨찾기가 없습니다</div>
                            <p style={{ marginTop: '8px', fontSize: '14px' }}>쿼리, 리포트, 연결을 즐겨찾기에 추가하세요</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                            {filteredFavorites.map((fav, i) => {
                                const info = typeInfo[fav.itemType];
                                return (
                                    <div
                                        key={fav.id}
                                        style={{
                                            padding: '16px', background: darkTheme.bgSecondary, borderRadius: '12px',
                                            display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer',
                                            transition: 'transform 0.2s', animation: `fadeIn 0.3s ease-out ${i * 0.05}s both`
                                        }}
                                    >
                                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${darkTheme.accentBlue}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                                            {fav.icon || info.icon}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <a href={info.href(fav.itemId)} style={{ display: 'block', fontWeight: '500', color: darkTheme.textPrimary, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {fav.name || fav.itemId}
                                            </a>
                                            {fav.description && <div style={{ fontSize: '13px', color: darkTheme.textMuted, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fav.description}</div>}
                                            <div style={{ fontSize: '12px', color: darkTheme.textMuted, marginTop: '4px' }}>{info.label} • {formatDate(fav.createdAt)}</div>
                                        </div>
                                        <button onClick={() => handleRemove(fav.itemType, fav.itemId)} style={{ background: 'none', border: 'none', color: darkTheme.textMuted, cursor: 'pointer', fontSize: '18px', padding: '8px' }}>×</button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </AnimatedCard>

            {notification && (
                <div style={{ position: 'fixed', bottom: '24px', right: '24px', padding: '16px 24px', background: notification.type === 'success' ? darkTheme.accentGreen : darkTheme.accentRed, color: 'white', borderRadius: '12px', zIndex: 1000, fontWeight: '500' }}>
                    {notification.type === 'success' ? '✅' : '❌'} {notification.message}
                </div>
            )}
            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
    );
}
