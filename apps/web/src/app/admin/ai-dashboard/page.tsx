'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface DashboardStats {
    providers: {
        total: number;
        active: number;
        statuses: { providerId: string; providerName: string; isAlive: boolean; latencyMs?: number }[];
    };
    models: {
        total: number;
        active: number;
        byPurpose: { purpose: string; count: number }[];
    };
    today: {
        totalRequests: number;
        successRate: number;
        avgLatencyMs: number;
        blockedCount: number;
        totalInputTokens: number;
        totalOutputTokens: number;
    };
    trends: { date: string; requests: number; successRate: number; avgLatency: number; tokens: number }[];
}

const API_BASE = '/api';

export default function AiDashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    useEffect(() => {
        fetchDashboard();
        let interval: NodeJS.Timeout | null = null;
        if (autoRefresh) {
            interval = setInterval(fetchDashboard, 30000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [autoRefresh]);

    const fetchDashboard = async () => {
        try {
            const res = await fetch(`${API_BASE}/admin/ai-monitor/dashboard`);
            if (!res.ok) throw new Error('Failed to fetch');
            setStats(await res.json());
            setLastUpdated(new Date());
            setError(null);
        } catch (err) {
            setError('대시보드 데이터를 불러올 수 없습니다.');
        } finally {
            setLoading(false);
        }
    };

    // Calculate derived stats
    const derivedStats = useMemo(() => {
        if (!stats) return null;
        
        const totalTrendRequests = stats.trends.reduce((a, b) => a + b.requests, 0);
        const avgTrendSuccessRate = stats.trends.length > 0 
            ? stats.trends.reduce((a, b) => a + b.successRate, 0) / stats.trends.length 
            : 0;
        const totalTrendTokens = stats.trends.reduce((a, b) => a + b.tokens, 0);
        const maxTrendRequests = Math.max(...stats.trends.map(t => t.requests || 1));
        
        return { totalTrendRequests, avgTrendSuccessRate, totalTrendTokens, maxTrendRequests };
    }, [stats]);

    const buttonStyle = {
        padding: '10px 20px',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 500,
        transition: 'all 0.2s ease',
    };

    const StatCard = ({ title, value, subtitle, color, icon, trend }: { 
        title: string; 
        value: string | number; 
        subtitle?: string; 
        color: string; 
        icon: string;
        trend?: { direction: 'up' | 'down'; value: string };
    }) => (
        <div style={{
            padding: '18px',
            background: 'rgba(20, 20, 35, 0.6)',
            borderRadius: '14px',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            transition: 'all 0.2s ease',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>{title}</span>
                <span style={{ fontSize: '20px' }}>{icon}</span>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, color, marginBottom: '4px' }}>{value}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {subtitle && <span style={{ fontSize: '12px', color: '#6b7280' }}>{subtitle}</span>}
                {trend && (
                    <span style={{ 
                        fontSize: '11px', 
                        color: trend.direction === 'up' ? '#10b981' : '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                    }}>
                        {trend.direction === 'up' ? '↑' : '↓'} {trend.value}
                    </span>
                )}
            </div>
        </div>
    );

    const QuickActionCard = ({ icon, title, description, href }: { 
        icon: string; title: string; description: string; href: string 
    }) => (
        <Link href={href} style={{ textDecoration: 'none' }}>
            <div style={{
                padding: '16px',
                background: 'rgba(99, 102, 241, 0.1)',
                borderRadius: '12px',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
            }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{title}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>{description}</div>
            </div>
        </Link>
    );

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    margin: '0 auto 16px',
                    border: '3px solid rgba(99, 102, 241, 0.3)',
                    borderTopColor: '#6366f1',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                }} />
                로딩 중...
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div style={{ textAlign: 'center', padding: '60px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                <div style={{ color: '#ef4444', fontSize: '16px', marginBottom: '16px' }}>{error || '데이터를 불러올 수 없습니다.'}</div>
                <button onClick={fetchDashboard} style={{ ...buttonStyle, background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc' }}>
                    다시 시도
                </button>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ 
                        fontSize: '28px', 
                        fontWeight: 700, 
                        background: 'linear-gradient(90deg, #6366f1, #a855f7)', 
                        WebkitBackgroundClip: 'text', 
                        WebkitTextFillColor: 'transparent', 
                        marginBottom: '8px' 
                    }}>
                        AI 모니터링 대시보드
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: '14px' }}>AI 서비스 상태와 성능을 실시간으로 모니터링합니다.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {lastUpdated && (
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>
                            마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}
                        </span>
                    )}
                    <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        fontSize: '13px',
                        color: autoRefresh ? '#10b981' : '#6b7280',
                        cursor: 'pointer',
                        padding: '8px 12px',
                        background: 'rgba(30, 30, 50, 0.8)',
                        borderRadius: '8px',
                    }}>
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            style={{ accentColor: '#6366f1' }}
                        />
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {autoRefresh && (
                                <span style={{ 
                                    width: '8px', 
                                    height: '8px', 
                                    borderRadius: '50%', 
                                    background: '#10b981',
                                    animation: 'pulse 2s infinite',
                                }} />
                            )}
                            자동 갱신
                        </span>
                        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
                    </label>
                    <button 
                        onClick={fetchDashboard} 
                        style={{ ...buttonStyle, background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', padding: '8px 16px' }}
                    >
                        🔄 새로고침
                    </button>
                </div>
            </div>

            {/* Provider Status */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>Provider 상태</h2>
                    <Link href="/admin/ai-providers" style={{ fontSize: '12px', color: '#a5b4fc', textDecoration: 'none' }}>
                        전체 보기 →
                    </Link>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                    {stats.providers.statuses.map((status) => (
                        <div key={status.providerId} style={{
                            padding: '14px 16px',
                            background: status.isAlive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                            borderRadius: '12px',
                            border: `1px solid ${status.isAlive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                            transition: 'all 0.2s ease',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                <div style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    background: status.isAlive ? '#10b981' : '#ef4444',
                                    boxShadow: status.isAlive ? '0 0 10px #10b981' : '0 0 10px #ef4444',
                                    animation: status.isAlive ? 'glow 2s infinite' : 'none',
                                }} />
                                <span style={{ fontSize: '14px', fontWeight: 500, color: '#fff' }}>{status.providerName}</span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                {status.isAlive ? (
                                    <span style={{ color: '#10b981' }}>● 온라인 • {status.latencyMs}ms</span>
                                ) : (
                                    <span style={{ color: '#ef4444' }}>● 오프라인</span>
                                )}
                            </div>
                        </div>
                    ))}
                    {stats.providers.statuses.length === 0 && (
                        <div style={{ padding: '20px', color: '#6b7280', fontSize: '14px', gridColumn: '1 / -1' }}>
                            등록된 Provider가 없습니다.
                            <Link href="/admin/ai-providers" style={{ color: '#a5b4fc', marginLeft: '8px' }}>
                                Provider 추가 →
                            </Link>
                        </div>
                    )}
                </div>
                <style>{`@keyframes glow { 0%, 100% { box-shadow: 0 0 8px #10b981; } 50% { box-shadow: 0 0 16px #10b981; } }`}</style>
            </div>

            {/* Today's Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                <StatCard 
                    title="오늘 요청" 
                    value={stats.today.totalRequests.toLocaleString()} 
                    icon="📊" 
                    color="#fff"
                />
                <StatCard 
                    title="성공률" 
                    value={`${stats.today.successRate.toFixed(1)}%`} 
                    icon="✅" 
                    color={stats.today.successRate >= 90 ? '#10b981' : stats.today.successRate >= 70 ? '#f59e0b' : '#ef4444'}
                    subtitle={stats.today.successRate >= 90 ? '정상' : '주의 필요'}
                />
                <StatCard 
                    title="평균 응답시간" 
                    value={`${stats.today.avgLatencyMs.toFixed(0)}ms`} 
                    icon="⚡" 
                    color={stats.today.avgLatencyMs < 1000 ? '#10b981' : stats.today.avgLatencyMs < 3000 ? '#f59e0b' : '#ef4444'}
                    subtitle={stats.today.avgLatencyMs < 1000 ? '빠름' : stats.today.avgLatencyMs < 3000 ? '보통' : '느림'}
                />
                <StatCard 
                    title="차단됨" 
                    value={stats.today.blockedCount} 
                    icon="🛡️" 
                    color={stats.today.blockedCount > 0 ? '#ef4444' : '#6b7280'}
                />
                <StatCard 
                    title="Input Tokens" 
                    value={stats.today.totalInputTokens.toLocaleString()} 
                    icon="📥" 
                    color="#6366f1"
                />
                <StatCard 
                    title="Output Tokens" 
                    value={stats.today.totalOutputTokens.toLocaleString()} 
                    icon="📤" 
                    color="#a855f7"
                />
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>
                {/* Trend Chart */}
                <div style={{ padding: '20px', background: 'rgba(20, 20, 35, 0.6)', borderRadius: '14px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>7일 요청 추이</h2>
                        <Link href="/admin/ai-audit" style={{ fontSize: '12px', color: '#a5b4fc', textDecoration: 'none' }}>
                            상세 로그 →
                        </Link>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '140px', padding: '0 8px' }}>
                        {stats.trends.map((trend, idx) => {
                            const height = derivedStats 
                                ? Math.max(12, (trend.requests / derivedStats.maxTrendRequests) * 120)
                                : 12;
                            return (
                                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ fontSize: '10px', color: '#a5b4fc', fontWeight: 500 }}>
                                        {trend.requests}
                                    </div>
                                    <div 
                                        style={{
                                            width: '100%',
                                            height: `${height}px`,
                                            background: 'linear-gradient(180deg, #6366f1, #8b5cf6)',
                                            borderRadius: '4px 4px 0 0',
                                            transition: 'height 0.3s ease',
                                            position: 'relative',
                                        }}
                                        title={`${trend.date}: ${trend.requests}건, ${trend.successRate.toFixed(1)}% 성공`}
                                    />
                                    <div style={{ fontSize: '10px', color: '#6b7280' }}>{trend.date.slice(5)}</div>
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '16px', borderTop: '1px solid rgba(99, 102, 241, 0.2)', paddingTop: '14px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>총 요청</div>
                            <div style={{ fontSize: '15px', color: '#fff', fontWeight: 600 }}>{derivedStats?.totalTrendRequests.toLocaleString()}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>평균 성공률</div>
                            <div style={{ fontSize: '15px', color: '#10b981', fontWeight: 600 }}>{derivedStats?.avgTrendSuccessRate.toFixed(1)}%</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>총 토큰</div>
                            <div style={{ fontSize: '15px', color: '#a855f7', fontWeight: 600 }}>{derivedStats?.totalTrendTokens.toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                {/* Models Overview */}
                <div style={{ padding: '20px', background: 'rgba(20, 20, 35, 0.6)', borderRadius: '14px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>모델 현황</h2>
                        <Link href="/admin/ai-models" style={{ fontSize: '12px', color: '#a5b4fc', textDecoration: 'none' }}>
                            관리 →
                        </Link>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>전체</div>
                            <div style={{ fontSize: '26px', color: '#fff', fontWeight: 700 }}>{stats.models.total}</div>
                        </div>
                        <div style={{ 
                            width: '1px', 
                            height: '40px', 
                            background: 'rgba(99, 102, 241, 0.3)',
                        }} />
                        <div>
                            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>활성</div>
                            <div style={{ fontSize: '26px', color: '#10b981', fontWeight: 700 }}>{stats.models.active}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {stats.models.byPurpose.map((p) => {
                            const colors: Record<string, string> = { sql: '#10b981', explain: '#6366f1', general: '#f59e0b' };
                            const labels: Record<string, string> = { sql: 'SQL 생성', explain: '설명', general: '일반' };
                            return (
                                <div key={p.purpose} style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px',
                                    padding: '10px 12px', 
                                    background: 'rgba(99, 102, 241, 0.08)', 
                                    borderRadius: '8px',
                                }}>
                                    <div style={{ 
                                        width: '8px', 
                                        height: '8px', 
                                        borderRadius: '50%', 
                                        background: colors[p.purpose] || '#6b7280',
                                    }} />
                                    <span style={{ fontSize: '13px', color: '#e0e0e0', flex: 1 }}>
                                        {labels[p.purpose] || p.purpose.toUpperCase()}
                                    </span>
                                    <span style={{ fontSize: '14px', color: '#fff', fontWeight: 600 }}>{p.count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '14px' }}>빠른 작업</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                    <QuickActionCard 
                        icon="🔌" 
                        title="Provider 추가" 
                        description="새 AI 서비스 연결"
                        href="/admin/ai-providers"
                    />
                    <QuickActionCard 
                        icon="🤖" 
                        title="Model 설정" 
                        description="모델 파라미터 조정"
                        href="/admin/ai-models"
                    />
                    <QuickActionCard 
                        icon="📝" 
                        title="Prompt 관리" 
                        description="프롬프트 템플릿 편집"
                        href="/admin/prompts"
                    />
                    <QuickActionCard 
                        icon="📜" 
                        title="감사 로그" 
                        description="AI 사용 이력 조회"
                        href="/admin/ai-audit"
                    />
                </div>
            </div>

            {/* Health Summary */}
            <div style={{ 
                padding: '16px 20px', 
                background: stats.providers.statuses.every(s => s.isAlive) && stats.today.successRate >= 90
                    ? 'rgba(16, 185, 129, 0.1)'
                    : 'rgba(245, 158, 11, 0.1)',
                borderRadius: '12px',
                border: `1px solid ${stats.providers.statuses.every(s => s.isAlive) && stats.today.successRate >= 90
                    ? 'rgba(16, 185, 129, 0.3)'
                    : 'rgba(245, 158, 11, 0.3)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
            }}>
                <span style={{ fontSize: '24px' }}>
                    {stats.providers.statuses.every(s => s.isAlive) && stats.today.successRate >= 90 ? '✅' : '⚠️'}
                </span>
                <div>
                    <div style={{ 
                        fontSize: '14px', 
                        fontWeight: 600, 
                        color: stats.providers.statuses.every(s => s.isAlive) && stats.today.successRate >= 90
                            ? '#10b981'
                            : '#f59e0b',
                        marginBottom: '2px',
                    }}>
                        {stats.providers.statuses.every(s => s.isAlive) && stats.today.successRate >= 90
                            ? '모든 시스템이 정상 작동 중입니다'
                            : '일부 시스템에 주의가 필요합니다'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        Provider {stats.providers.statuses.filter(s => s.isAlive).length}/{stats.providers.statuses.length} 온라인 • 
                        오늘 성공률 {stats.today.successRate.toFixed(1)}%
                    </div>
                </div>
            </div>
        </div>
    );
}
