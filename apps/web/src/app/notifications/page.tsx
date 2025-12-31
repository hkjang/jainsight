'use client';

import { useEffect, useState, useCallback } from 'react';
import { darkTheme, darkStyles, AnimatedCard, TabGroup, Pagination } from '../../components/admin/AdminUtils';
import useAuth from '../../hooks/useAuth';

const API_URL = '/api';

interface Notification {
    id: string;
    title: string;
    message?: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'system';
    link?: string;
    icon?: string;
    isRead: boolean;
    category?: string;
    createdAt: string;
}

const typeStyles: Record<string, { bg: string; color: string; icon: string }> = {
    info: { bg: '#3B82F620', color: '#3B82F6', icon: 'ℹ️' },
    success: { bg: '#10B98120', color: '#10B981', icon: '✅' },
    warning: { bg: '#F59E0B20', color: '#F59E0B', icon: '⚠️' },
    error: { bg: '#EF444420', color: '#EF4444', icon: '❌' },
    system: { bg: '#8B5CF620', color: '#8B5CF6', icon: '⚙️' }
};

export default function NotificationsPage() {
    const { user, token, loading: authLoading, isAuthenticated } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [notification, setNotificationToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const itemsPerPage = 15;

    const fetchNotifications = useCallback(async () => {
        if (!user?.id || !token) return;
        try {
            const params = new URLSearchParams();
            if (filter === 'unread') params.append('unreadOnly', 'true');
            const response = await fetch(`${API_URL}/users/${user.id}/notifications?${params}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.ok) {
                const data = await response.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (error) { console.error('Failed to fetch notifications:', error); }
        finally { setLoading(false); }
    }, [user, token, filter]);

    useEffect(() => {
        if (!authLoading && isAuthenticated) fetchNotifications();
    }, [fetchNotifications, authLoading, isAuthenticated]);

    const handleMarkRead = async (id: string) => {
        if (!user?.id || !token) return;
        try {
            await fetch(`${API_URL}/users/${user.id}/notifications/${id}/read`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
            fetchNotifications();
        } catch { /* ignore */ }
    };

    const handleMarkAllRead = async () => {
        if (!user?.id || !token) return;
        try {
            await fetch(`${API_URL}/users/${user.id}/notifications/read-all`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
            showToast('모든 알림을 읽음 처리했습니다.', 'success');
            fetchNotifications();
        } catch { showToast('처리 실패', 'error'); }
    };

    const handleDelete = async (id: string) => {
        if (!user?.id || !token) return;
        try {
            await fetch(`${API_URL}/users/${user.id}/notifications/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            fetchNotifications();
        } catch { /* ignore */ }
    };

    const showToast = (message: string, type: 'success' | 'error') => {
        setNotificationToast({ message, type });
        setTimeout(() => setNotificationToast(null), 3000);
    };

    const formatTimeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        if (diff < 60000) return '방금 전';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
        return `${Math.floor(diff / 86400000)}일 전`;
    };

    const filteredNotifications = notifications.filter(n => filter === 'all' || (filter === 'unread' && !n.isRead));
    const paginatedNotifications = filteredNotifications.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);

    if (authLoading || loading) {
        return (
            <div style={{ ...darkStyles.container, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <div style={{ textAlign: 'center', color: darkTheme.textSecondary }}>⏳ 로딩 중...</div>
            </div>
        );
    }

    return (
        <div style={darkStyles.container}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: darkTheme.textPrimary, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        🔔 알림 센터
                        {unreadCount > 0 && (
                            <span style={{ fontSize: '14px', padding: '4px 10px', borderRadius: '9999px', background: darkTheme.accentRed, color: 'white' }}>
                                {unreadCount}
                            </span>
                        )}
                    </h1>
                    <p style={{ color: darkTheme.textSecondary, marginTop: '4px' }}>시스템 알림 및 메시지</p>
                </div>
                {unreadCount > 0 && (
                    <button style={darkStyles.buttonSecondary} onClick={handleMarkAllRead}>✓ 모두 읽음</button>
                )}
            </div>

            <div style={{ marginBottom: '24px' }}>
                <TabGroup
                    tabs={[
                        { id: 'all', label: `전체 (${notifications.length})` },
                        { id: 'unread', label: `읽지 않음 (${unreadCount})` }
                    ]}
                    activeTab={filter}
                    onChange={setFilter}
                />
            </div>

            <AnimatedCard delay={0.1}>
                <div style={{ padding: '16px' }}>
                    {paginatedNotifications.length === 0 ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: darkTheme.textMuted }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                            <div style={{ fontSize: '16px' }}>알림이 없습니다</div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {paginatedNotifications.map((n, i) => {
                                const style = typeStyles[n.type] || typeStyles.info;
                                return (
                                    <div
                                        key={n.id}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '16px',
                                            padding: '16px', background: n.isRead ? darkTheme.bgSecondary : `${darkTheme.accentBlue}08`,
                                            borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
                                            borderLeft: n.isRead ? 'none' : `3px solid ${darkTheme.accentBlue}`,
                                            animation: `fadeIn 0.3s ease-out ${i * 0.05}s both`
                                        }}
                                        onClick={() => !n.isRead && handleMarkRead(n.id)}
                                    >
                                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: style.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                                            {n.icon || style.icon}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontWeight: n.isRead ? '400' : '600', color: darkTheme.textPrimary }}>{n.title}</span>
                                                {!n.isRead && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: darkTheme.accentBlue }}></span>}
                                            </div>
                                            {n.message && <div style={{ fontSize: '13px', color: darkTheme.textMuted, marginTop: '2px' }}>{n.message}</div>}
                                        </div>
                                        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ fontSize: '13px', color: darkTheme.textSecondary }}>{formatTimeAgo(n.createdAt)}</span>
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }} style={{ background: 'none', border: 'none', color: darkTheme.textMuted, cursor: 'pointer', fontSize: '16px' }}>×</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filteredNotifications.length} itemsPerPage={itemsPerPage} />}
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
