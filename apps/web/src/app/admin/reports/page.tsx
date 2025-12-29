'use client';

import { useEffect, useState } from 'react';

interface ReportData {
    overProvisionedUsers: { id: string; name: string; unusedRoles: number; lastActive: string }[];
    topQueries: { query: string; executionCount: number; avgDuration: number }[];
    groupUsage: { name: string; members: number; queries: number }[];
    riskEvents: { date: string; count: number; type: string }[];
}

export default function ReportsAdminPage() {
    const [loading, setLoading] = useState(true);
    const [activeReport, setActiveReport] = useState<string>('overview');
    const [dateRange, setDateRange] = useState('7d');
    const [data, setData] = useState<ReportData>({
        overProvisionedUsers: [],
        topQueries: [],
        groupUsage: [],
        riskEvents: []
    });

    useEffect(() => {
        setTimeout(() => {
            setData({
                overProvisionedUsers: [
                    { id: '1', name: 'user1@example.com', unusedRoles: 3, lastActive: '30일 전' },
                    { id: '2', name: 'user2@example.com', unusedRoles: 2, lastActive: '14일 전' },
                    { id: '3', name: 'user3@example.com', unusedRoles: 5, lastActive: '60일 전' },
                ],
                topQueries: [
                    { query: 'SELECT * FROM orders WHERE status = ?', executionCount: 1520, avgDuration: 45 },
                    { query: 'SELECT user_id, SUM(amount) FROM transactions GROUP BY user_id', executionCount: 892, avgDuration: 120 },
                    { query: 'SELECT * FROM products WHERE category = ?', executionCount: 756, avgDuration: 32 },
                    { query: 'INSERT INTO audit_logs VALUES (?)', executionCount: 650, avgDuration: 15 },
                ],
                groupUsage: [
                    { name: '개발팀', members: 15, queries: 4520 },
                    { name: '데이터분석팀', members: 8, queries: 8920 },
                    { name: '운영팀', members: 10, queries: 2150 },
                ],
                riskEvents: [
                    { date: '12/23', count: 12, type: 'blocked' },
                    { date: '12/24', count: 8, type: 'blocked' },
                    { date: '12/25', count: 15, type: 'blocked' },
                    { date: '12/26', count: 5, type: 'blocked' },
                    { date: '12/27', count: 10, type: 'blocked' },
                    { date: '12/28', count: 7, type: 'blocked' },
                    { date: '12/29', count: 3, type: 'blocked' },
                ]
            });
            setLoading(false);
        }, 500);
    }, [dateRange]);

    const containerStyle: React.CSSProperties = {
        padding: '24px',
        maxWidth: '1400px',
        margin: '0 auto'
    };

    const cardStyle: React.CSSProperties = {
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
    };

    const reports = [
        { id: 'overview', name: '개요', icon: '📊' },
        { id: 'permissions', name: '권한 분석', icon: '🔐' },
        { id: 'activity', name: '활동 분석', icon: '📈' },
        { id: 'risk', name: '위험 분석', icon: '⚠️' },
    ];

    if (loading) {
        return (
            <div style={{ ...containerStyle, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <div style={{ fontSize: '18px', color: '#6B7280' }}>로딩 중...</div>
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1F2937' }}>📊 운영 리포트</h1>
                    <p style={{ color: '#6B7280', marginTop: '4px' }}>사용자, 권한, 쿼리 운영 현황 분석</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <select
                        style={{
                            padding: '8px 12px',
                            border: '1px solid #D1D5DB',
                            borderRadius: '8px',
                            fontSize: '14px',
                            cursor: 'pointer'
                        }}
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                    >
                        <option value="7d">최근 7일</option>
                        <option value="30d">최근 30일</option>
                        <option value="90d">최근 90일</option>
                    </select>
                    <button style={{
                        padding: '8px 16px',
                        background: '#3B82F6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        cursor: 'pointer'
                    }}>
                        📥 내보내기
                    </button>
                </div>
            </div>

            {/* Report Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                {reports.map(report => (
                    <button
                        key={report.id}
                        onClick={() => setActiveReport(report.id)}
                        style={{
                            padding: '12px 20px',
                            background: activeReport === report.id ? '#3B82F6' : 'white',
                            color: activeReport === report.id ? 'white' : '#374151',
                            border: activeReport === report.id ? 'none' : '1px solid #E5E7EB',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        {report.icon} {report.name}
                    </button>
                ))}
            </div>

            {/* Overview Dashboard */}
            {activeReport === 'overview' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                    {/* Over-provisioned Users */}
                    <div style={cardStyle}>
                        <div style={{ padding: '16px', borderBottom: '1px solid #E5E7EB', fontWeight: '600' }}>
                            🔒 과다 권한 사용자
                        </div>
                        {data.overProvisionedUsers.map(user => (
                            <div key={user.id} style={{
                                padding: '16px',
                                borderBottom: '1px solid #E5E7EB',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontWeight: '500' }}>{user.name}</div>
                                    <div style={{ fontSize: '12px', color: '#6B7280' }}>마지막 활동: {user.lastActive}</div>
                                </div>
                                <span style={{
                                    padding: '4px 8px',
                                    background: '#FEE2E2',
                                    color: '#DC2626',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: '500'
                                }}>
                                    {user.unusedRoles}개 미사용 Role
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Group Usage */}
                    <div style={cardStyle}>
                        <div style={{ padding: '16px', borderBottom: '1px solid #E5E7EB', fontWeight: '600' }}>
                            👥 그룹별 사용량
                        </div>
                        {data.groupUsage.map((group, i) => (
                            <div key={i} style={{
                                padding: '16px',
                                borderBottom: '1px solid #E5E7EB'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: '500' }}>{group.name}</span>
                                    <span style={{ fontSize: '14px', color: '#6B7280' }}>
                                        👥 {group.members} · 📝 {group.queries.toLocaleString()}
                                    </span>
                                </div>
                                <div style={{
                                    height: '8px',
                                    background: '#E5E7EB',
                                    borderRadius: '4px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${Math.min((group.queries / 10000) * 100, 100)}%`,
                                        background: 'linear-gradient(90deg, #3B82F6, #8B5CF6)',
                                        borderRadius: '4px'
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Top Queries */}
                    <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
                        <div style={{ padding: '16px', borderBottom: '1px solid #E5E7EB', fontWeight: '600' }}>
                            🔝 Top 쿼리
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#F9FAFB' }}>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>쿼리</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>실행 횟수</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>평균 소요시간</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.topQueries.map((query, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #E5E7EB' }}>
                                        <td style={{ padding: '12px 16px' }}>
                                            <code style={{
                                                padding: '4px 8px',
                                                background: '#F3F4F6',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                fontFamily: 'monospace'
                                            }}>
                                                {query.query}
                                            </code>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '500' }}>
                                            {query.executionCount.toLocaleString()}
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', color: '#6B7280' }}>
                                            {query.avgDuration}ms
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Risk Events Chart */}
                    <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
                        <div style={{ padding: '16px', borderBottom: '1px solid #E5E7EB', fontWeight: '600' }}>
                            ⚠️ 차단된 요청 추이
                        </div>
                        <div style={{ padding: '24px', display: 'flex', alignItems: 'flex-end', gap: '8px', height: '200px' }}>
                            {data.riskEvents.map((event, i) => (
                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div style={{
                                        width: '100%',
                                        height: `${event.count * 8}px`,
                                        background: 'linear-gradient(180deg, #EF4444, #FCA5A5)',
                                        borderRadius: '4px 4px 0 0',
                                        minHeight: '10px'
                                    }} />
                                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px' }}>{event.date}</div>
                                    <div style={{ fontSize: '12px', fontWeight: '500' }}>{event.count}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeReport !== 'overview' && (
                <div style={{ ...cardStyle, padding: '48px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                        {reports.find(r => r.id === activeReport)?.icon}
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '500', color: '#1F2937', marginBottom: '8px' }}>
                        {reports.find(r => r.id === activeReport)?.name} 리포트
                    </div>
                    <div style={{ color: '#6B7280' }}>
                        상세 분석 리포트가 곧 제공됩니다
                    </div>
                </div>
            )}
        </div>
    );
}
