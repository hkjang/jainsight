'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { darkTheme, darkStyles, AnimatedCard, MiniChart, ProgressRing } from '../../components/admin/AdminUtils';
import useAuth from '../../hooks/useAuth';

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
    { label: '저장된 쿼리', icon: '📊', href: '/saved-queries', color: '#6366F1' },
    { label: '연결 관리', icon: '🔌', href: '/connections', color: '#10B981' },
    { label: '스키마', icon: '🗂️', href: '/schemas', color: '#F59E0B' },
];

export default function DashboardPage() {
    const { user, token, loading: authLoading, isAuthenticated, authFetch } = useAuth();
    const router = useRouter();
    const [data, setData] = useState<DashboardData | null>(null);
    const [profileCompletion, setProfileCompletion] = useState<ProfileCompletion | null>(null);
    const [notifications, setNotifications] = useState<NotificationSummary | null>(null);
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [loading, setLoading] = useState(true);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [activityChartData] = useState([5, 12, 8, 15, 10, 18, 14, 22, 16, 25, 20, 28]);
    const [systemStats, setSystemStats] = useState<{ connections: number; queries: number; failed: number } | null>(null);

    const fetchAll = useCallback(async () => {
        if (!user?.id || !token) return;
        
        try {
            const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
            const [dashRes, completeRes, notifRes, favRes, sysRes, auditRes] = await Promise.all([
                fetch(`${API_URL}/users/${user.id}/dashboard`, { headers }).catch(() => null),
                fetch(`${API_URL}/users/${user.id}/profile-completion`, { headers }).catch(() => null),
                fetch(`${API_URL}/users/${user.id}/notifications?limit=1`, { headers }).catch(() => null),
                fetch(`${API_URL}/users/${user.id}/favorites?limit=5`, { headers }).catch(() => null),
                fetch(`${API_URL}/dashboard/stats`, { headers }).catch(() => null),
                fetch(`${API_URL}/audit?limit=5`, { headers }).catch(() => null)
            ]);

            let recentActivity: DashboardData['recentActivity'] = [];
            
            if (dashRes?.ok) {
                const dashData = await dashRes.json();
                setData(dashData);
                recentActivity = dashData.recentActivity || [];
            } else {
                // 폴백: 사용자 정보가 없으면 기본값 사용
                setData({
                    profile: { name: user.name, email: user.email, role: user.role },
                    stats: { queriesExecuted: 0, reportsViewed: 0, accountAge: 0 },
                    recentActivity: []
                });
            }

            // Audit 로그에서 최근 활동 가져오기 (폴백 또는 보충)
            if (auditRes?.ok) {
                const auditData = await auditRes.json();
                if (Array.isArray(auditData) && auditData.length > 0) {
                    const auditActivities = auditData.slice(0, 5).map((log: any) => ({
                        id: log.id,
                        action: 'query_execute',
                        details: { query: log.query?.substring(0, 50), connection: log.connectionName },
                        createdAt: log.executedAt
                    }));
                    // 기존 활동이 없으면 Audit 로그 사용
                    if (recentActivity.length === 0) {
                        recentActivity = auditActivities;
                        setData(prev => prev ? { ...prev, recentActivity: auditActivities } : prev);
                    }
                }
            }

            if (completeRes?.ok) {
                const c = await completeRes.json();
                setProfileCompletion(c);
                if (c.percentage < 50) setShowOnboarding(true);
            }

            if (notifRes?.ok) {
                const n = await notifRes.json();
                setNotifications({ unreadCount: n.unreadCount || 0 });
            }

            if (favRes?.ok) setFavorites(await favRes.json());

            if (sysRes?.ok) {
                const s = await sysRes.json();
                setSystemStats({ connections: s.connectionsCount || 0, queries: s.queriesCount || 0, failed: s.failedQueriesCount || 0 });
            }
        } catch (error) { console.error('Failed to fetch:', error); }
        finally { setLoading(false); }
    }, [user, token]);

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            fetchAll();
        }
    }, [fetchAll, authLoading, isAuthenticated]);

    const formatTimeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        if (diff < 60000) return '방금 전';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
        return `${Math.floor(diff / 86400000)}일 전`;
    };

    if (authLoading || loading) {
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

            {/* Welcome Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: darkTheme.textPrimary, marginBottom: '4px' }}>
                    👋 안녕하세요, {data?.profile.name || user?.name}님!
                </h1>
                <p style={{ color: darkTheme.textSecondary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📅 {new Date().toLocaleDateString('ko-KR', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                    <span style={{ color: darkTheme.textMuted }}>•</span>
                    <span>오늘도 좋은 하루 되세요</span>
                </p>
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
                                <a href="/audit" style={{ fontSize: '12px', color: darkTheme.accentBlue, textDecoration: 'none' }}>더보기</a>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {data?.recentActivity && data.recentActivity.length > 0 ? (
                                    data.recentActivity.slice(0, 4).map((activity) => {
                                        const info = actionLabels[activity.action] || { label: activity.action, icon: '📌' };
                                        return (
                                            <div key={activity.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '16px' }}>{info.icon}</span>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '13px', color: darkTheme.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {info.label}
                                                        {activity.details?.connection && <span style={{ color: darkTheme.textMuted }}> • {String(activity.details.connection)}</span>}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: darkTheme.textMuted }}>{formatTimeAgo(activity.createdAt)}</div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                                        <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.6 }}>📭</div>
                                        <div style={{ fontSize: '13px', color: darkTheme.textMuted, marginBottom: '12px' }}>
                                            아직 활동 기록이 없습니다
                                        </div>
                                        <a href="/editor" style={{
                                            display: 'inline-block',
                                            padding: '8px 16px',
                                            background: `${darkTheme.accentBlue}20`,
                                            color: darkTheme.accentBlue,
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            textDecoration: 'none',
                                            fontWeight: '500'
                                        }}>
                                            🚀 첫 쿼리 실행하기
                                        </a>
                                    </div>
                                )}
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
                                    {favorites.slice(0, 3).map((fav) => {
                                        const typeConfig: Record<string, { icon: string; color: string; href: string }> = {
                                            query: { icon: '📊', color: '#3B82F6', href: `/editor?id=${fav.itemId}` },
                                            connection: { icon: '🔌', color: '#10B981', href: `/connections` },
                                            report: { icon: '📈', color: '#8B5CF6', href: `/admin/reports` },
                                            dashboard: { icon: '📋', color: '#F59E0B', href: `/dashboard` },
                                        };
                                        const config = typeConfig[fav.itemType] || { icon: '⭐', color: '#6366f1', href: '#' };
                                        return (
                                            <a 
                                                key={fav.id} 
                                                href={config.href}
                                                style={{ 
                                                    display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', 
                                                    background: darkTheme.bgSecondary, borderRadius: '8px', textDecoration: 'none',
                                                    transition: 'all 0.2s', border: '1px solid transparent'
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = darkTheme.bgCardHover; e.currentTarget.style.borderColor = `${config.color}40`; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = darkTheme.bgSecondary; e.currentTarget.style.borderColor = 'transparent'; }}
                                            >
                                                <span style={{ fontSize: '18px' }}>{fav.icon || config.icon}</span>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '13px', color: darkTheme.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {fav.name || fav.itemId}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: darkTheme.textMuted }}>
                                                        {fav.itemType === 'query' ? '쿼리' : fav.itemType === 'connection' ? '연결' : fav.itemType === 'report' ? '리포트' : '대시보드'}
                                                    </div>
                                                </div>
                                                <span style={{ fontSize: '14px', color: darkTheme.textMuted }}>→</span>
                                            </a>
                                        );
                                    })}
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
