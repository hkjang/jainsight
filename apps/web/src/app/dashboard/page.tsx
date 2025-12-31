'use client';

import { useEffect, useState, useCallback } from 'react';
import { darkTheme, darkStyles, AnimatedCard, MiniChart, ProgressRing } from '../../components/admin/AdminUtils';

const API_URL = '/api';

interface DashboardData {
    profile: { name: string; email: string; avatarUrl?: string; role: string; };
    stats: { queriesExecuted: number; reportsViewed: number; lastLoginAt?: string; accountAge: number; };
    recentActivity: { id: string; action: string; details?: Record<string, unknown>; createdAt: string; }[];
}

interface ProfileCompletion { percentage: number; missing: string[]; completed: string[]; }
interface NotificationSummary { unreadCount: number; }
interface Favorite { id: string; itemType: string; itemId: string; name?: string; icon?: string; }

const actionLabels: Record<string, { label: string; icon: string }> = {
    login: { label: '로그인', icon: '🔐' }, query_execute: { label: '쿼리 실행', icon: '📊' },
    report_view: { label: '리포트 조회', icon: '📈' }, settings_update: { label: '설정 변경', icon: '⚙️' },
    profile_update: { label: '프로필 수정', icon: '👤' }, api_key_create: { label: 'API 키 생성', icon: '🔗' }
};

const quickActions = [
    { label: '새 쿼리', icon: '➕', href: '/editor', color: '#3B82F6' },
    { label: '연결 관리', icon: '🔌', href: '/connections', color: '#10B981' },
    { label: '리포트', icon: '📊', href: '/admin/reports', color: '#8B5CF6' },
    { label: '설정', icon: '⚙️', href: '/settings', color: '#F59E0B' },
    { label: '즐겨찾기', icon: '⭐', href: '/favorites', color: '#EC4899' },
    { label: '알림', icon: '🔔', href: '/notifications', color: '#06B6D4' }
];

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [profileCompletion, setProfileCompletion] = useState<ProfileCompletion | null>(null);
    const [notifications, setNotifications] = useState<NotificationSummary | null>(null);
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [loading, setLoading] = useState(true);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [activityChartData] = useState([5, 12, 8, 15, 10, 18, 14, 22, 16, 25, 20, 28]);
    const [systemStats, setSystemStats] = useState<{ connections: number; queries: number; failed: number } | null>(null);
    const userId = 'current-user';

    const fetchAll = useCallback(async () => {
        const token = localStorage.getItem('token');
        try {
            const [dashRes, completeRes, notifRes, favRes, sysRes] = await Promise.all([
                fetch(`${API_URL}/users/${userId}/dashboard`).catch(() => null),
                fetch(`${API_URL}/users/${userId}/profile-completion`).catch(() => null),
                fetch(`${API_URL}/users/${userId}/notifications?limit=1`).catch(() => null),
                fetch(`${API_URL}/users/${userId}/favorites?limit=5`).catch(() => null),
                token ? fetch(`${API_URL}/dashboard/stats`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null) : null
            ]);

            if (dashRes?.ok) setData(await dashRes.json());
            else setData({ profile: { name: '사용자', email: 'user@example.com', role: 'analyst' }, stats: { queriesExecuted: 127, reportsViewed: 34, lastLoginAt: new Date().toISOString(), accountAge: 45 }, recentActivity: [{ id: '1', action: 'query_execute', details: { queryName: 'Sales Report' }, createdAt: new Date().toISOString() }] });

            if (completeRes?.ok) { const c = await completeRes.json(); setProfileCompletion(c); if (c.percentage < 50) setShowOnboarding(true); }
            else { setProfileCompletion({ percentage: 67, missing: ['프로필 사진', '자기소개'], completed: ['이름', '이메일', '직책', '설정 저장'] }); }

            if (notifRes?.ok) { const n = await notifRes.json(); setNotifications({ unreadCount: n.unreadCount || 0 }); }
            else setNotifications({ unreadCount: 3 });

            if (favRes?.ok) setFavorites(await favRes.json());
            else setFavorites([{ id: '1', itemType: 'query', itemId: 'q1', name: 'Sales Report' }]);

            if (sysRes?.ok) { const s = await sysRes.json(); setSystemStats({ connections: s.connectionsCount || 0, queries: s.queriesCount || 0, failed: s.failedQueriesCount || 0 }); }
            else setSystemStats({ connections: 5, queries: 127, failed: 3 });
        } catch (error) { console.error('Failed to fetch:', error); }
        finally { setLoading(false); }
    }, [userId]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const formatTimeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        if (diff < 60000) return '방금 전';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
        return `${Math.floor(diff / 86400000)}일 전`;
    };

    if (loading) {
        return (
            <div style={{ ...darkStyles.container, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <div style={{ textAlign: 'center', color: darkTheme.textSecondary }}>⏳ 로딩 중...</div>
            </div>
        );
    }

    return (
        <div style={darkStyles.container}>
            {/* Onboarding Banner */}
            {showOnboarding && profileCompletion && profileCompletion.percentage < 80 && (
                <AnimatedCard delay={0}>
                    <div style={{ padding: '20px', background: `linear-gradient(135deg, ${darkTheme.accentBlue}15, ${darkTheme.accentPurple}15)`, borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <ProgressRing progress={profileCompletion.percentage} size={60} color={darkTheme.accentBlue} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600', color: darkTheme.textPrimary, marginBottom: '4px' }}>🎯 프로필을 완성하세요!</div>
                            <div style={{ fontSize: '13px', color: darkTheme.textMuted }}>
                                완성까지 남은 항목: {profileCompletion.missing.join(', ')}
                            </div>
                        </div>
                        <a href="/profile" style={{ ...darkStyles.button, textDecoration: 'none' }}>완성하기</a>
                        <button onClick={() => setShowOnboarding(false)} style={{ background: 'none', border: 'none', color: darkTheme.textMuted, cursor: 'pointer', fontSize: '18px' }}>×</button>
                    </div>
                </AnimatedCard>
            )}

            {/* Header with Notification Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: darkTheme.textPrimary }}>👋 안녕하세요, {data?.profile.name}님!</h1>
                    <p style={{ color: darkTheme.textSecondary, marginTop: '4px' }}>오늘도 좋은 하루 되세요</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <a href="/notifications" style={{ position: 'relative', padding: '10px', background: darkTheme.bgSecondary, borderRadius: '10px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '20px' }}>🔔</span>
                        {notifications && notifications.unreadCount > 0 && (
                            <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '20px', height: '20px', background: darkTheme.accentRed, borderRadius: '50%', fontSize: '11px', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {notifications.unreadCount > 9 ? '9+' : notifications.unreadCount}
                            </span>
                        )}
                    </a>
                    <a href="/favorites" style={{ padding: '10px', background: darkTheme.bgSecondary, borderRadius: '10px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '20px' }}>⭐</span>
                    </a>
                </div>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <AnimatedCard delay={0.1}>
                    <div style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '28px', fontWeight: 'bold', color: darkTheme.accentBlue }}>{data?.stats.queriesExecuted}</div>
                                <div style={{ fontSize: '13px', color: darkTheme.textMuted, marginTop: '4px' }}>실행한 쿼리</div>
                            </div>
                            <span style={{ fontSize: '24px' }}>📊</span>
                        </div>
                        <MiniChart data={activityChartData} color={darkTheme.accentBlue} height={35} />
                    </div>
                </AnimatedCard>
                <AnimatedCard delay={0.15}>
                    <div style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '28px', fontWeight: 'bold', color: darkTheme.accentPurple }}>{data?.stats.reportsViewed}</div>
                                <div style={{ fontSize: '13px', color: darkTheme.textMuted, marginTop: '4px' }}>조회한 리포트</div>
                            </div>
                            <span style={{ fontSize: '24px' }}>📈</span>
                        </div>
                    </div>
                </AnimatedCard>
                <AnimatedCard delay={0.2}>
                    <div style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '28px', fontWeight: 'bold', color: darkTheme.accentGreen }}>{data?.stats.accountAge}</div>
                                <div style={{ fontSize: '13px', color: darkTheme.textMuted, marginTop: '4px' }}>사용 일수</div>
                            </div>
                            <span style={{ fontSize: '24px' }}>📅</span>
                        </div>
                    </div>
                </AnimatedCard>
                <AnimatedCard delay={0.25}>
                    <div style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: '500', color: darkTheme.textPrimary }}>프로필 완성도</div>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: (profileCompletion?.percentage || 0) >= 80 ? darkTheme.accentGreen : darkTheme.accentYellow, marginTop: '4px' }}>{profileCompletion?.percentage || 0}%</div>
                            </div>
                            <ProgressRing progress={profileCompletion?.percentage || 0} size={40} color={(profileCompletion?.percentage || 0) >= 80 ? darkTheme.accentGreen : darkTheme.accentYellow} />
                        </div>
                    </div>
                </AnimatedCard>
            </div>

            {/* System Stats */}
            {systemStats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    <AnimatedCard delay={0.3}>
                        <a href="/connections" style={{ display: 'block', padding: '20px', textDecoration: 'none' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>{systemStats.connections}</div>
                                    <div style={{ fontSize: '13px', color: darkTheme.textMuted }}>DB 연결</div>
                                </div>
                                <span style={{ fontSize: '24px' }}>🔗</span>
                            </div>
                        </a>
                    </AnimatedCard>
                    <AnimatedCard delay={0.35}>
                        <a href="/audit" style={{ display: 'block', padding: '20px', textDecoration: 'none' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>{systemStats.queries}</div>
                                    <div style={{ fontSize: '13px', color: darkTheme.textMuted }}>실행된 쿼리</div>
                                </div>
                                <span style={{ fontSize: '24px' }}>📊</span>
                            </div>
                        </a>
                    </AnimatedCard>
                    <AnimatedCard delay={0.4}>
                        <a href="/editor" style={{ display: 'block', padding: '20px', textDecoration: 'none' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: darkTheme.accentGreen }}>{Math.round(((systemStats.queries - systemStats.failed) / (systemStats.queries || 1)) * 100)}%</div>
                                    <div style={{ fontSize: '13px', color: darkTheme.textMuted }}>성공률</div>
                                </div>
                                <span style={{ fontSize: '24px' }}>✅</span>
                            </div>
                        </a>
                    </AnimatedCard>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
                {/* Quick Actions */}
                <AnimatedCard delay={0.3}>
                    <div style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', color: darkTheme.textPrimary, marginBottom: '20px' }}>⚡ 빠른 액션</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                            {quickActions.map((action) => (
                                <a key={action.label} href={action.href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px', background: darkTheme.bgSecondary, borderRadius: '12px', textDecoration: 'none', transition: 'all 0.2s', border: `1px solid ${darkTheme.border}` }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = darkTheme.bgCardHover; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = darkTheme.bgSecondary; e.currentTarget.style.transform = 'translateY(0)'; }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${action.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{action.icon}</div>
                                    <span style={{ fontSize: '13px', fontWeight: '500', color: darkTheme.textPrimary }}>{action.label}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                </AnimatedCard>

                {/* Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Recent Activity */}
                    <AnimatedCard delay={0.4}>
                        <div style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: '600', color: darkTheme.textPrimary }}>📋 최근 활동</h3>
                                <a href="/activity" style={{ fontSize: '12px', color: darkTheme.accentBlue, textDecoration: 'none' }}>더보기</a>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {data?.recentActivity.slice(0, 4).map((activity) => {
                                    const info = actionLabels[activity.action] || { label: activity.action, icon: '📌' };
                                    return (
                                        <div key={activity.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '16px' }}>{info.icon}</span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '13px', color: darkTheme.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{info.label}</div>
                                                <div style={{ fontSize: '11px', color: darkTheme.textMuted }}>{formatTimeAgo(activity.createdAt)}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </AnimatedCard>

                    {/* Favorites */}
                    {favorites.length > 0 && (
                        <AnimatedCard delay={0.5}>
                            <div style={{ padding: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: darkTheme.textPrimary }}>⭐ 즐겨찾기</h3>
                                    <a href="/favorites" style={{ fontSize: '12px', color: darkTheme.accentBlue, textDecoration: 'none' }}>더보기</a>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {favorites.slice(0, 3).map((fav) => (
                                        <div key={fav.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', background: darkTheme.bgSecondary, borderRadius: '8px' }}>
                                            <span style={{ fontSize: '16px' }}>{fav.icon || (fav.itemType === 'query' ? '📊' : '📈')}</span>
                                            <span style={{ fontSize: '13px', color: darkTheme.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fav.name || fav.itemId}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </AnimatedCard>
                    )}
                </div>
            </div>

            {/* Profile Summary */}
            <AnimatedCard delay={0.6}>
                <div style={{ padding: '20px', marginTop: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: `linear-gradient(135deg, ${darkTheme.accentBlue}40, ${darkTheme.accentPurple}40)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', color: darkTheme.accentBlue, border: `2px solid ${darkTheme.accentBlue}` }}>
                            {data?.profile.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '16px', fontWeight: '600', color: darkTheme.textPrimary }}>{data?.profile.name}</div>
                            <div style={{ fontSize: '13px', color: darkTheme.textMuted }}>{data?.profile.email}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <a href="/profile" style={{ ...darkStyles.buttonSecondary, textDecoration: 'none', fontSize: '13px', padding: '8px 12px' }}>프로필</a>
                            <a href="/security" style={{ ...darkStyles.buttonSecondary, textDecoration: 'none', fontSize: '13px', padding: '8px 12px' }}>보안</a>
                        </div>
                    </div>
                </div>
            </AnimatedCard>
        </div>
    );
}
