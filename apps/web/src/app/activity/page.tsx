'use client';

import { useEffect, useState, useCallback } from 'react';
import { darkTheme, darkStyles, AnimatedCard, SearchInput, Pagination, TabGroup } from '../../components/admin/AdminUtils';
import useAuth from '../../hooks/useAuth';

const API_URL = '/api';

interface Activity {
    id: string;
    userId: string;
    action: string;
    details?: Record<string, unknown>;
    resourceType?: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    errorMessage?: string;
    durationMs?: number;
    createdAt: string;
}

const actionLabels: Record<string, { label: string; icon: string; color: string }> = {
    login: { label: '로그인', icon: '🔐', color: '#10B981' },
    logout: { label: '로그아웃', icon: '🚪', color: '#6B7280' },
    login_failed: { label: '로그인 실패', icon: '❌', color: '#EF4444' },
    query_execute: { label: '쿼리 실행', icon: '📊', color: '#3B82F6' },
    query_save: { label: '쿼리 저장', icon: '💾', color: '#8B5CF6' },
    report_view: { label: '리포트 조회', icon: '📈', color: '#F59E0B' },
    report_export: { label: '리포트 내보내기', icon: '📥', color: '#06B6D4' },
    settings_update: { label: '설정 변경', icon: '⚙️', color: '#EC4899' },
    password_change: { label: '비밀번호 변경', icon: '🔑', color: '#F97316' },
    profile_update: { label: '프로필 수정', icon: '👤', color: '#14B8A6' },
    api_key_create: { label: 'API 키 생성', icon: '🔗', color: '#8B5CF6' },
    api_key_revoke: { label: 'API 키 취소', icon: '🚫', color: '#EF4444' },
    connection_create: { label: '연결 생성', icon: '🔌', color: '#10B981' },
    connection_test: { label: '연결 테스트', icon: '🧪', color: '#3B82F6' }
};

export default function ActivityPage() {
    const { user, token, loading: authLoading, isAuthenticated } = useAuth();
    const [activities, setActivities] = useState<Activity[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [actionFilter, setActionFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const itemsPerPage = 20;

    const fetchActivities = useCallback(async () => {
        if (!user?.id || !token) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({
                limit: itemsPerPage.toString(),
                offset: ((currentPage - 1) * itemsPerPage).toString()
            });
            if (actionFilter !== 'all') params.append('action', actionFilter);

            const response = await fetch(`${API_URL}/users/${user.id}/activity?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setActivities(data.activities || []);
                setTotal(data.total || 0);
            }
        } catch (error) {
            console.error('Failed to fetch activities:', error);
        } finally {
            setLoading(false);
        }
    }, [user, token, currentPage, actionFilter]);

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            fetchActivities();
        }
    }, [fetchActivities, authLoading, isAuthenticated]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        
        if (diff < 60000) return '방금 전';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}일 전`;
        return date.toLocaleDateString('ko-KR');
    };

    const filteredActivities = activities.filter(a => {
        if (!searchTerm) return true;
        const actionInfo = actionLabels[a.action];
        return actionInfo?.label.includes(searchTerm) || 
               JSON.stringify(a.details).toLowerCase().includes(searchTerm.toLowerCase());
    });

    const totalPages = Math.ceil(total / itemsPerPage);

    if (authLoading || (loading && activities.length === 0)) {
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
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: darkTheme.textPrimary, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    📊 활동 이력
                </h1>
                <p style={{ color: darkTheme.textSecondary, marginTop: '4px' }}>모든 계정 활동 기록을 확인하세요</p>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {[
                    { label: '총 활동', value: total, color: darkTheme.accentBlue },
                    { label: '로그인', value: activities.filter(a => a.action === 'login').length, color: '#10B981' },
                    { label: '쿼리 실행', value: activities.filter(a => a.action === 'query_execute').length, color: '#3B82F6' },
                    { label: '실패', value: activities.filter(a => !a.success).length, color: '#EF4444' }
                ].map((stat, i) => (
                    <AnimatedCard key={stat.label} delay={i * 0.1}>
                        <div style={{ padding: '16px', textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
                            <div style={{ fontSize: '13px', color: darkTheme.textMuted, marginTop: '4px' }}>{stat.label}</div>
                        </div>
                    </AnimatedCard>
                ))}
            </div>

            {/* Main Card */}
            <AnimatedCard delay={0.4}>
                {/* Toolbar */}
                <div style={{ display: 'flex', gap: '12px', padding: '16px', borderBottom: `1px solid ${darkTheme.border}`, flexWrap: 'wrap', alignItems: 'center' }}>
                    <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="활동 검색..." onClear={() => setSearchTerm('')} />
                    <TabGroup
                        tabs={[
                            { id: 'all', label: '전체' },
                            { id: 'login', label: '로그인', icon: '🔐' },
                            { id: 'query_execute', label: '쿼리', icon: '📊' },
                            { id: 'report_view', label: '리포트', icon: '📈' }
                        ]}
                        activeTab={actionFilter}
                        onChange={setActionFilter}
                    />
                </div>

                {/* Activity List */}
                <div style={{ padding: '16px' }}>
                    {filteredActivities.length === 0 ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: darkTheme.textMuted }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                            <div style={{ fontSize: '16px' }}>활동 이력이 없습니다</div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {filteredActivities.map((activity, index) => {
                                const actionInfo = actionLabels[activity.action] || { label: activity.action, icon: '📌', color: darkTheme.textMuted };
                                return (
                                    <div
                                        key={activity.id}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '16px',
                                            padding: '16px', background: darkTheme.bgSecondary,
                                            borderRadius: '8px', transition: 'transform 0.2s, background 0.2s',
                                            animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`
                                        }}
                                    >
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '10px',
                                            background: `${actionInfo.color}20`, display: 'flex',
                                            alignItems: 'center', justifyContent: 'center', fontSize: '18px'
                                        }}>
                                            {actionInfo.icon}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontWeight: '500', color: darkTheme.textPrimary }}>{actionInfo.label}</span>
                                                {!activity.success && (
                                                    <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '11px', background: `${darkTheme.accentRed}20`, color: darkTheme.accentRed }}>
                                                        실패
                                                    </span>
                                                )}
                                            </div>
                                            {activity.details && (
                                                <div style={{ fontSize: '13px', color: darkTheme.textMuted, marginTop: '2px' }}>
                                                    {(activity.details.queryName as string) || (activity.details.reportName as string) || (Array.isArray(activity.details.changed) ? activity.details.changed.join(', ') : null) || JSON.stringify(activity.details)}
                                                </div>
                                            )}
                                            {activity.errorMessage && (
                                                <div style={{ fontSize: '12px', color: darkTheme.accentRed, marginTop: '2px' }}>
                                                    {activity.errorMessage}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '13px', color: darkTheme.textSecondary }}>{formatDate(activity.createdAt)}</div>
                                            {activity.ipAddress && (
                                                <div style={{ fontSize: '11px', color: darkTheme.textMuted, marginTop: '2px' }}>{activity.ipAddress}</div>
                                            )}
                                            {activity.durationMs && (
                                                <div style={{ fontSize: '11px', color: darkTheme.textMuted }}>{activity.durationMs}ms</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {totalPages > 1 && (
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={total} itemsPerPage={itemsPerPage} />
                )}
            </AnimatedCard>

            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
    );
}
