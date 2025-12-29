'use client';

import { useEffect, useState, useCallback } from 'react';
import { exportToCSV, exportToJSON, useAutoRefresh, StatsCard } from '../../../components/admin/AdminUtils';

const API_URL = '/api';

interface UserActivity {
    userId: string;
    userName: string;
    queryCount: number;
    lastActive: string;
    activeHours: number;
}

interface GroupUsage {
    name: string;
    type: string;
    members: number;
    queries: number;
    avgRisk: number;
}

interface PermissionIssue {
    userId: string;
    userName: string;
    unusedRoles: number;
    lastActive: string;
    recommendation: string;
}

interface QueryTrend {
    date: string;
    total: number;
    blocked: number;
    warned: number;
}

interface RiskEvent {
    id: string;
    type: 'blocked' | 'warned' | 'high_risk';
    query: string;
    user: string;
    riskScore: number;
    timestamp: string;
}

export default function ReportsAdminPage() {
    const [loading, setLoading] = useState(true);
    const [activeReport, setActiveReport] = useState<'overview' | 'permissions' | 'activity' | 'risk'>('overview');
    const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('7d');
    const [autoRefresh, setAutoRefresh] = useState(false);

    // Report data
    const [overviewStats, setOverviewStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        totalQueries: 0,
        blockedQueries: 0,
        avgRiskScore: 0,
        apiCalls: 0
    });
    const [queryTrends, setQueryTrends] = useState<QueryTrend[]>([]);
    const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
    const [groupUsages, setGroupUsages] = useState<GroupUsage[]>([]);
    const [permissionIssues, setPermissionIssues] = useState<PermissionIssue[]>([]);
    const [riskEvents, setRiskEvents] = useState<RiskEvent[]>([]);

    const fetchReportData = useCallback(async () => {
        try {
            // In a real app, fetch from API with dateRange
            // Mock data for now
            const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
            
            setOverviewStats({
                totalUsers: 85,
                activeUsers: 62,
                totalQueries: 15420 + Math.floor(Math.random() * 100),
                blockedQueries: 234,
                avgRiskScore: 32,
                apiCalls: 128500
            });

            const trends: QueryTrend[] = [];
            const now = new Date();
            for (let i = Math.min(days, 14) - 1; i >= 0; i--) {
                const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                trends.push({
                    date: `${date.getMonth() + 1}/${date.getDate()}`,
                    total: 800 + Math.floor(Math.random() * 400),
                    blocked: 10 + Math.floor(Math.random() * 20),
                    warned: 20 + Math.floor(Math.random() * 30)
                });
            }
            setQueryTrends(trends);

            setUserActivities([
                { userId: '1', userName: 'admin@example.com', queryCount: 1520, lastActive: '10분 전', activeHours: 8.5 },
                { userId: '2', userName: 'analyst@example.com', queryCount: 1120, lastActive: '2시간 전', activeHours: 6.2 },
                { userId: '3', userName: 'developer@example.com', queryCount: 890, lastActive: '30분 전', activeHours: 7.8 },
                { userId: '4', userName: 'manager@example.com', queryCount: 450, lastActive: '1일 전', activeHours: 3.1 },
                { userId: '5', userName: 'intern@example.com', queryCount: 120, lastActive: '3시간 전', activeHours: 4.5 },
            ]);

            setGroupUsages([
                { name: '개발팀', type: 'organization', members: 25, queries: 5420, avgRisk: 28 },
                { name: '데이터분석팀', type: 'project', members: 12, queries: 8920, avgRisk: 35 },
                { name: '운영팀', type: 'organization', members: 15, queries: 2150, avgRisk: 22 },
                { name: 'AI 프로젝트', type: 'project', members: 8, queries: 1850, avgRisk: 45 },
                { name: 'DB 관리자', type: 'task', members: 3, queries: 920, avgRisk: 65 },
            ]);

            setPermissionIssues([
                { userId: '1', userName: 'user1@example.com', unusedRoles: 3, lastActive: '30일 전', recommendation: '미사용 역할 제거 권장' },
                { userId: '2', userName: 'user2@example.com', unusedRoles: 5, lastActive: '60일 전', recommendation: '계정 비활성화 검토' },
                { userId: '3', userName: 'contractor@example.com', unusedRoles: 2, lastActive: '14일 전', recommendation: 'Admin 역할 검토 필요' },
            ]);

            setRiskEvents([
                { id: '1', type: 'blocked', query: 'DROP TABLE users', user: 'unknown', riskScore: 100, timestamp: new Date().toISOString() },
                { id: '2', type: 'high_risk', query: 'DELETE FROM orders WHERE 1=1', user: 'developer@example.com', riskScore: 95, timestamp: new Date(Date.now() - 3600000).toISOString() },
                { id: '3', type: 'warned', query: 'UPDATE users SET role = "admin"', user: 'analyst@example.com', riskScore: 75, timestamp: new Date(Date.now() - 7200000).toISOString() },
            ]);

        } catch (error) {
            console.error('Failed to fetch report data:', error);
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        fetchReportData();
    }, [fetchReportData]);

    useAutoRefresh(fetchReportData, 30000, autoRefresh);

    const handleExport = (format: 'csv' | 'json') => {
        const data = {
            generatedAt: new Date().toISOString(),
            dateRange,
            overview: overviewStats,
            queryTrends,
            userActivities,
            groupUsages,
            permissionIssues,
            riskEvents
        };
        
        if (format === 'json') {
            exportToJSON(data, 'admin_report');
        } else {
            // Export current view as CSV
            if (activeReport === 'activity') {
                exportToCSV(userActivities, 'user_activities');
            } else if (activeReport === 'permissions') {
                exportToCSV(permissionIssues, 'permission_issues');
            } else if (activeReport === 'risk') {
                exportToCSV(riskEvents as unknown as Record<string, unknown>[], 'risk_events');
            }
        }
    };

    const containerStyle: React.CSSProperties = { padding: '24px', maxWidth: '1600px', margin: '0 auto' };
    const cardStyle: React.CSSProperties = { background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' };
    const tabStyle = (active: boolean): React.CSSProperties => ({
        padding: '12px 24px',
        fontSize: '14px',
        fontWeight: active ? '600' : '400',
        color: active ? '#3B82F6' : '#6B7280',
        background: active ? 'white' : 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid #3B82F6' : '2px solid transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    });

    const reports = [
        { id: 'overview', name: '개요', icon: '📊' },
        { id: 'activity', name: '활동 분석', icon: '📈' },
        { id: 'permissions', name: '권한 분석', icon: '🔐' },
        { id: 'risk', name: '위험 분석', icon: '⚠️' }
    ] as const;

    if (loading) {
        return (
            <div style={{ ...containerStyle, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', marginBottom: '16px', animation: 'spin 1s linear infinite' }}>⏳</div>
                    <div style={{ fontSize: '16px', color: '#6B7280' }}>리포트 데이터 로딩 중...</div>
                </div>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1F2937' }}>📊 운영 리포트</h1>
                    <p style={{ color: '#6B7280', marginTop: '4px' }}>시스템 사용 현황 및 보안 분석</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#6B7280', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={e => setAutoRefresh(e.target.checked)}
                            style={{ accentColor: '#3B82F6' }}
                        />
                        자동 새로고침
                    </label>
                    <select
                        style={{ padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
                        value={dateRange}
                        onChange={e => setDateRange(e.target.value as typeof dateRange)}
                    >
                        <option value="7d">최근 7일</option>
                        <option value="30d">최근 30일</option>
                        <option value="90d">최근 90일</option>
                    </select>
                    <div style={{ position: 'relative' }}>
                        <button
                            style={{
                                padding: '8px 16px',
                                background: '#3B82F6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                            onClick={() => handleExport('json')}
                        >
                            📥 내보내기
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <StatsCard icon="👥" label="전체 사용자" value={overviewStats.totalUsers} color="#3B82F6" />
                <StatsCard icon="✅" label="활성 사용자" value={overviewStats.activeUsers} color="#10B981" trend={{ value: 5, isUp: true }} />
                <StatsCard icon="📝" label="총 쿼리" value={overviewStats.totalQueries.toLocaleString()} color="#8B5CF6" />
                <StatsCard icon="🚫" label="차단된 쿼리" value={overviewStats.blockedQueries} color="#EF4444" />
                <StatsCard icon="📈" label="평균 위험도" value={`${overviewStats.avgRiskScore}%`} color="#F59E0B" />
                <StatsCard icon="🔗" label="API 호출" value={`${(overviewStats.apiCalls / 1000).toFixed(1)}K`} color="#06B6D4" />
            </div>

            {/* Tabs */}
            <div style={{ ...cardStyle, marginBottom: '24px' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB' }}>
                    {reports.map(report => (
                        <button
                            key={report.id}
                            style={tabStyle(activeReport === report.id)}
                            onClick={() => setActiveReport(report.id)}
                        >
                            <span>{report.icon}</span>
                            <span>{report.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Overview Tab */}
            {activeReport === 'overview' && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                    {/* Query Trend Chart */}
                    <div style={cardStyle}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', fontWeight: '600' }}>
                            📈 쿼리 추이
                        </div>
                        <div style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-end', height: '200px', gap: '8px' }}>
                                {queryTrends.map((d, i) => {
                                    const maxTotal = Math.max(...queryTrends.map(t => t.total));
                                    return (
                                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <div style={{
                                                width: '100%',
                                                height: `${(d.total / maxTotal) * 160}px`,
                                                background: 'linear-gradient(180deg, #3B82F6, #60A5FA)',
                                                borderRadius: '4px 4px 0 0',
                                                position: 'relative'
                                            }}>
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: 0,
                                                    left: 0,
                                                    right: 0,
                                                    height: `${(d.blocked / d.total) * 100}%`,
                                                    background: '#EF4444',
                                                    borderRadius: '0 0 0 0'
                                                }} />
                                            </div>
                                            <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '8px' }}>{d.date}</div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                                    <div style={{ width: '12px', height: '12px', background: '#3B82F6', borderRadius: '2px' }} />
                                    전체 쿼리
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                                    <div style={{ width: '12px', height: '12px', background: '#EF4444', borderRadius: '2px' }} />
                                    차단됨
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Group Usage */}
                    <div style={cardStyle}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', fontWeight: '600' }}>
                            👥 그룹별 사용량
                        </div>
                        <div style={{ maxHeight: '260px', overflow: 'auto' }}>
                            {groupUsages.map((group, i) => (
                                <div key={i} style={{ padding: '12px 20px', borderBottom: '1px solid #E5E7EB' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <span style={{ fontWeight: '500' }}>{group.name}</span>
                                        <span style={{ fontSize: '12px', color: '#6B7280' }}>
                                            👥 {group.members} · 📝 {group.queries.toLocaleString()}
                                        </span>
                                    </div>
                                    <div style={{ height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${Math.min((group.queries / 10000) * 100, 100)}%`,
                                            background: group.avgRisk > 50 ? 'linear-gradient(90deg, #F59E0B, #EF4444)' : 'linear-gradient(90deg, #3B82F6, #8B5CF6)',
                                            borderRadius: '3px'
                                        }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Activity Tab */}
            {activeReport === 'activity' && (
                <div style={cardStyle}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '600' }}>👤 사용자 활동 순위</span>
                        <button onClick={() => exportToCSV(userActivities, 'user_activities')} style={{ padding: '6px 12px', background: '#F3F4F6', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                            📥 CSV 내보내기
                        </button>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#F9FAFB' }}>
                                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>순위</th>
                                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>사용자</th>
                                <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>쿼리 수</th>
                                <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>활동 시간</th>
                                <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>마지막 활동</th>
                            </tr>
                        </thead>
                        <tbody>
                            {userActivities.map((user, i) => (
                                <tr key={user.userId} style={{ borderBottom: '1px solid #E5E7EB' }}>
                                    <td style={{ padding: '16px 20px' }}>
                                        <span style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '50%',
                                            background: i < 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][i] : '#E5E7EB',
                                            color: i < 3 ? 'white' : '#6B7280',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '12px',
                                            fontWeight: '600'
                                        }}>
                                            {i + 1}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 20px', fontWeight: '500' }}>{user.userName}</td>
                                    <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: '600', color: '#3B82F6' }}>{user.queryCount.toLocaleString()}</td>
                                    <td style={{ padding: '16px 20px', textAlign: 'right', color: '#6B7280' }}>{user.activeHours}h</td>
                                    <td style={{ padding: '16px 20px', textAlign: 'right', fontSize: '13px', color: '#9CA3AF' }}>{user.lastActive}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Permissions Tab */}
            {activeReport === 'permissions' && (
                <div style={cardStyle}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span style={{ fontWeight: '600' }}>🔒 과다 권한 사용자</span>
                            <span style={{ fontSize: '12px', color: '#6B7280', marginLeft: '12px' }}>{permissionIssues.length}건의 문제 감지</span>
                        </div>
                        <button onClick={() => exportToCSV(permissionIssues, 'permission_issues')} style={{ padding: '6px 12px', background: '#F3F4F6', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                            📥 CSV 내보내기
                        </button>
                    </div>
                    {permissionIssues.map(issue => (
                        <div key={issue.userId} style={{ padding: '20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    background: '#FEE2E2',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '20px'
                                }}>👤</div>
                                <div>
                                    <div style={{ fontWeight: '500' }}>{issue.userName}</div>
                                    <div style={{ fontSize: '12px', color: '#6B7280' }}>마지막 활동: {issue.lastActive}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{
                                    padding: '6px 12px',
                                    background: '#FEE2E2',
                                    color: '#DC2626',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontWeight: '500'
                                }}>
                                    {issue.unusedRoles}개 미사용 역할
                                </div>
                                <div style={{ fontSize: '13px', color: '#6B7280', maxWidth: '200px' }}>{issue.recommendation}</div>
                                <button style={{ padding: '8px 16px', background: '#3B82F6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
                                    권한 검토
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Risk Tab */}
            {activeReport === 'risk' && (
                <div style={cardStyle}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '600' }}>⚠️ 최근 위험 이벤트</span>
                        <button onClick={() => exportToCSV(riskEvents as unknown as Record<string, unknown>[], 'risk_events')} style={{ padding: '6px 12px', background: '#F3F4F6', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                            📥 CSV 내보내기
                        </button>
                    </div>
                    {riskEvents.map(event => (
                        <div key={event.id} style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{
                                        padding: '4px 10px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        background: event.type === 'blocked' ? '#FEE2E2' : event.type === 'high_risk' ? '#FEF3C7' : '#DBEAFE',
                                        color: event.type === 'blocked' ? '#DC2626' : event.type === 'high_risk' ? '#D97706' : '#2563EB'
                                    }}>
                                        {event.type === 'blocked' ? '차단됨' : event.type === 'high_risk' ? '고위험' : '경고'}
                                    </span>
                                    <span style={{ fontSize: '13px', color: '#6B7280' }}>by {event.user}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{
                                        padding: '4px 10px',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        background: event.riskScore >= 80 ? '#FEE2E2' : '#FEF3C7',
                                        color: event.riskScore >= 80 ? '#DC2626' : '#D97706'
                                    }}>
                                        위험도 {event.riskScore}
                                    </span>
                                    <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                                        {new Date(event.timestamp).toLocaleString('ko-KR')}
                                    </span>
                                </div>
                            </div>
                            <code style={{
                                display: 'block',
                                padding: '10px 12px',
                                background: '#F3F4F6',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontFamily: 'monospace',
                                color: '#DC2626'
                            }}>
                                {event.query}
                            </code>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
