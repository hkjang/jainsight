'use client';

import { useEffect, useState, useCallback } from 'react';
import { darkTheme, darkStyles, AnimatedCard, MiniChart } from '../../components/admin/AdminUtils';

const API_URL = '/api';

interface DashboardData {
    profile: {
        name: string;
        email: string;
        avatarUrl?: string;
        role: string;
    };
    stats: {
        queriesExecuted: number;
        reportsViewed: number;
        lastLoginAt?: string;
        accountAge: number;
    };
    recentActivity: {
        id: string;
        action: string;
        details?: Record<string, unknown>;
        createdAt: string;
    }[];
}

const actionLabels: Record<string, { label: string; icon: string }> = {
    login: { label: '로그인', icon: '🔐' },
    query_execute: { label: '쿼리 실행', icon: '📊' },
    report_view: { label: '리포트 조회', icon: '📈' },
    settings_update: { label: '설정 변경', icon: '⚙️' },
    profile_update: { label: '프로필 수정', icon: '👤' },
    api_key_create: { label: 'API 키 생성', icon: '🔗' }
};

const quickActions = [
    { label: '새 쿼리', icon: '➕', href: '/editor', color: '#3B82F6' },
    { label: '연결 관리', icon: '🔌', href: '/connections', color: '#10B981' },
    { label: '리포트', icon: '📊', href: '/admin/reports', color: '#8B5CF6' },
    { label: '설정', icon: '⚙️', href: '/settings', color: '#F59E0B' }
];

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activityChartData] = useState([5, 12, 8, 15, 10, 18, 14, 22, 16, 25, 20, 28]);

    const userId = 'current-user';

    const fetchDashboard = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/users/${userId}/dashboard`);
            if (response.ok) {
                const dashboardData = await response.json();
                setData(dashboardData);
            } else {
                // Mock data
                setData({
                    profile: {
                        name: '사용자',
                        email: 'user@example.com',
                        role: 'analyst'
                    },
                    stats: {
                        queriesExecuted: 127,
                        reportsViewed: 34,
                        lastLoginAt: new Date().toISOString(),
                        accountAge: 45
                    },
                    recentActivity: [
                        { id: '1', action: 'query_execute', details: { queryName: 'Sales Report' }, createdAt: new Date().toISOString() },
                        { id: '2', action: 'report_view', details: { reportName: 'Monthly Summary' }, createdAt: new Date(Date.now() - 3600000).toISOString() },
                        { id: '3', action: 'login', createdAt: new Date(Date.now() - 7200000).toISOString() }
                    ]
                });
            }
        } catch (error) {
            console.error('Failed to fetch dashboard:', error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

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
                <div style={{ textAlign: 'center', color: darkTheme.textSecondary }}>
                    <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
                    로딩 중...
                </div>
            </div>
        );
    }

    return (
        <div style={darkStyles.container}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: darkTheme.textPrimary }}>
                    👋 안녕하세요, {data?.profile.name}님!
                </h1>
                <p style={{ color: darkTheme.textSecondary, marginTop: '4px' }}>오늘도 좋은 하루 되세요</p>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <AnimatedCard delay={0.1}>
                    <div style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '32px', fontWeight: 'bold', color: darkTheme.accentBlue }}>{data?.stats.queriesExecuted}</div>
                                <div style={{ fontSize: '14px', color: darkTheme.textMuted, marginTop: '4px' }}>실행한 쿼리</div>
                            </div>
                            <span style={{ fontSize: '28px' }}>📊</span>
                        </div>
                        <MiniChart data={activityChartData} color={darkTheme.accentBlue} height={40} />
                    </div>
                </AnimatedCard>

                <AnimatedCard delay={0.2}>
                    <div style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '32px', fontWeight: 'bold', color: darkTheme.accentPurple }}>{data?.stats.reportsViewed}</div>
                                <div style={{ fontSize: '14px', color: darkTheme.textMuted, marginTop: '4px' }}>조회한 리포트</div>
                            </div>
                            <span style={{ fontSize: '28px' }}>📈</span>
                        </div>
                    </div>
                </AnimatedCard>

                <AnimatedCard delay={0.3}>
                    <div style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '32px', fontWeight: 'bold', color: darkTheme.accentGreen }}>{data?.stats.accountAge}</div>
                                <div style={{ fontSize: '14px', color: darkTheme.textMuted, marginTop: '4px' }}>사용 일수</div>
                            </div>
                            <span style={{ fontSize: '28px' }}>📅</span>
                        </div>
                    </div>
                </AnimatedCard>

                <AnimatedCard delay={0.4}>
                    <div style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: '500', color: darkTheme.textPrimary }}>마지막 로그인</div>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: darkTheme.textSecondary, marginTop: '4px' }}>
                                    {data?.stats.lastLoginAt ? formatTimeAgo(data.stats.lastLoginAt) : '-'}
                                </div>
                            </div>
                            <span style={{ fontSize: '28px' }}>🔐</span>
                        </div>
                    </div>
                </AnimatedCard>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
                {/* Quick Actions */}
                <AnimatedCard delay={0.5}>
                    <div style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', color: darkTheme.textPrimary, marginBottom: '20px' }}>⚡ 빠른 액션</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                            {quickActions.map((action) => (
                                <a
                                    key={action.label}
                                    href={action.href}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        padding: '16px', background: darkTheme.bgSecondary, borderRadius: '12px',
                                        textDecoration: 'none', transition: 'all 0.2s', cursor: 'pointer',
                                        border: `1px solid ${darkTheme.border}`
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = darkTheme.bgCardHover;
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = darkTheme.bgSecondary;
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '10px',
                                        background: `${action.color}20`, display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', fontSize: '20px'
                                    }}>
                                        {action.icon}
                                    </div>
                                    <span style={{ fontWeight: '500', color: darkTheme.textPrimary }}>{action.label}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                </AnimatedCard>

                {/* Recent Activity */}
                <AnimatedCard delay={0.6}>
                    <div style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '600', color: darkTheme.textPrimary }}>📋 최근 활동</h3>
                            <a href="/activity" style={{ fontSize: '13px', color: darkTheme.accentBlue, textDecoration: 'none' }}>전체 보기 →</a>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {data?.recentActivity.map((activity) => {
                                const actionInfo = actionLabels[activity.action] || { label: activity.action, icon: '📌' };
                                return (
                                    <div key={activity.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '18px' }}>{actionInfo.icon}</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '14px', color: darkTheme.textPrimary }}>{actionInfo.label}</div>
                                            <div style={{ fontSize: '12px', color: darkTheme.textMuted }}>{formatTimeAgo(activity.createdAt)}</div>
                                        </div>
                                    </div>
                                );
                            })}
                            {(!data?.recentActivity || data.recentActivity.length === 0) && (
                                <div style={{ textAlign: 'center', padding: '20px', color: darkTheme.textMuted }}>
                                    활동이 없습니다
                                </div>
                            )}
                        </div>
                    </div>
                </AnimatedCard>
            </div>

            {/* Profile Summary */}
            <AnimatedCard delay={0.7}>
                <div style={{ padding: '24px', marginTop: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{
                            width: '60px', height: '60px', borderRadius: '50%',
                            background: `linear-gradient(135deg, ${darkTheme.accentBlue}40, ${darkTheme.accentPurple}40)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '24px', fontWeight: 'bold', color: darkTheme.accentBlue,
                            border: `2px solid ${darkTheme.accentBlue}`
                        }}>
                            {data?.profile.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '18px', fontWeight: '600', color: darkTheme.textPrimary }}>{data?.profile.name}</div>
                            <div style={{ fontSize: '14px', color: darkTheme.textMuted }}>{data?.profile.email}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <a href="/profile" style={{ ...darkStyles.buttonSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                👤 프로필
                            </a>
                            <a href="/settings" style={{ ...darkStyles.buttonSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                ⚙️ 설정
                            </a>
                        </div>
                    </div>
                </div>
            </AnimatedCard>
        </div>
    );
}
