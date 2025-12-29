'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface AuditLog {
    id: string;
    connectionId: string;
    connectionName: string;
    query: string;
    status: 'SUCCESS' | 'FAILURE';
    rowCount: number | null;
    durationMs: number;
    errorMessage: string | null;
    executedBy: string;
    executedAt: string;
}

// Relative time formatting
const getRelativeTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    return `${diffDays}일 전`;
};

export default function AuditPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'FAILURE'>('ALL');
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const router = useRouter();

    const fetchLogs = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                router.push('/login');
                return;
            }

            const res = await fetch('/api/audit', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.status === 401) {
                router.push('/login');
                return;
            }

            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setLogs(data);
                    setLastRefresh(new Date());
                }
            }
        } catch (e) {
            console.error('Failed to fetch audit logs', e);
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(fetchLogs, 5000);
        return () => clearInterval(interval);
    }, [autoRefresh, fetchLogs]);

    const handleCopyQuery = (id: string, query: string) => {
        navigator.clipboard.writeText(query);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesSearch = 
                log.query.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.executedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.connectionName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [logs, searchTerm, statusFilter]);

    const stats = useMemo(() => {
        const successCount = logs.filter(l => l.status === 'SUCCESS').length;
        const failureCount = logs.filter(l => l.status === 'FAILURE').length;
        const avgDuration = logs.length > 0 
            ? logs.reduce((acc, l) => acc + l.durationMs, 0) / logs.length 
            : 0;
        return { total: logs.length, successCount, failureCount, avgDuration };
    }, [logs]);

    if (loading) {
        return (
            <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
                {/* Skeleton Header */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ 
                        width: '200px', 
                        height: '32px', 
                        background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.2), rgba(99, 102, 241, 0.1))',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.5s infinite',
                        borderRadius: '8px',
                        marginBottom: '12px',
                    }} />
                </div>
                {/* Skeleton Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} style={{
                            height: '80px',
                            background: 'linear-gradient(90deg, rgba(30, 27, 75, 0.5), rgba(49, 46, 129, 0.3), rgba(30, 27, 75, 0.5))',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 1.5s infinite',
                            borderRadius: '12px',
                        }} />
                    ))}
                </div>
                {/* Skeleton Table */}
                <div style={{
                    background: 'rgba(30, 27, 75, 0.5)',
                    borderRadius: '16px',
                    padding: '20px',
                }}>
                    {[0, 1, 2, 3, 4].map(i => (
                        <div key={i} style={{
                            height: '56px',
                            background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.05))',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 1.5s infinite',
                            borderRadius: '8px',
                            marginBottom: i < 4 ? '8px' : 0,
                        }} />
                    ))}
                </div>
                <style>{`
                    @keyframes shimmer {
                        0% { background-position: 200% 0; }
                        100% { background-position: -200% 0; }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start', 
                marginBottom: '24px',
                animation: 'fadeSlideUp 0.5s ease-out forwards',
            }}>
                <div>
                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: 700,
                        background: 'linear-gradient(90deg, #e0e7ff, #c7d2fe)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '8px',
                    }}>
                        쿼리 감사 로그
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        실행된 모든 SQL 쿼리 기록
                        {lastRefresh && (
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                                마지막 업데이트: {lastRefresh.toLocaleTimeString('ko-KR')}
                            </span>
                        )}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        padding: '8px 14px',
                        background: autoRefresh ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.1)',
                        border: `1px solid ${autoRefresh ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.2)'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: autoRefresh ? '#10b981' : '#94a3b8',
                        transition: 'all 0.2s',
                    }}>
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            style={{ display: 'none' }}
                        />
                        <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: autoRefresh ? '#10b981' : '#64748b',
                            animation: autoRefresh ? 'pulse 2s infinite' : 'none',
                        }} />
                        자동 새로고침
                    </label>
                    <button
                        onClick={fetchLogs}
                        style={{
                            padding: '10px 16px',
                            background: 'rgba(99, 102, 241, 0.15)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            borderRadius: '10px',
                            color: '#a5b4fc',
                            cursor: 'pointer',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                        }}
                    >
                        🔄 새로고침
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                gap: '16px', 
                marginBottom: '24px',
                animation: 'fadeSlideUp 0.5s ease-out forwards',
                animationDelay: '0.1s',
                opacity: 0,
            }}>
                <div style={{
                    padding: '16px 20px',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1))',
                    borderRadius: '12px',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>전체 로그</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#e2e8f0' }}>{stats.total}</div>
                </div>
                <div style={{
                    padding: '16px 20px',
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1))',
                    borderRadius: '12px',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>성공</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>{stats.successCount}</div>
                </div>
                <div style={{
                    padding: '16px 20px',
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1))',
                    borderRadius: '12px',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>실패</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>{stats.failureCount}</div>
                </div>
                <div style={{
                    padding: '16px 20px',
                    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.1))',
                    borderRadius: '12px',
                    border: '1px solid rgba(251, 191, 36, 0.2)',
                }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>평균 시간</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#fbbf24' }}>{stats.avgDuration.toFixed(0)}ms</div>
                </div>
            </div>

            {/* Search & Filter */}
            <div style={{ 
                display: 'flex', 
                gap: '12px', 
                marginBottom: '20px', 
                flexWrap: 'wrap',
                animation: 'fadeSlideUp 0.5s ease-out forwards',
                animationDelay: '0.2s',
                opacity: 0,
            }}>
                <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>🔍</span>
                    <input
                        type="text"
                        placeholder="쿼리, 사용자, 연결 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 14px 12px 42px',
                            background: 'rgba(30, 27, 75, 0.6)',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            borderRadius: '10px',
                            color: '#e2e8f0',
                            fontSize: '14px',
                            outline: 'none',
                            transition: 'all 0.2s',
                        }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {(['ALL', 'SUCCESS', 'FAILURE'] as const).map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            style={{
                                padding: '10px 16px',
                                background: statusFilter === status 
                                    ? status === 'SUCCESS' ? 'linear-gradient(90deg, #10b981, #059669)'
                                    : status === 'FAILURE' ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                                    : 'linear-gradient(90deg, #6366f1, #8b5cf6)'
                                    : 'rgba(30, 27, 75, 0.6)',
                                border: statusFilter === status ? 'none' : '1px solid rgba(99, 102, 241, 0.2)',
                                borderRadius: '8px',
                                color: statusFilter === status ? '#fff' : '#94a3b8',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 500,
                                transition: 'all 0.2s',
                            }}
                        >
                            {status === 'ALL' ? '전체' : status === 'SUCCESS' ? '✓ 성공' : '✗ 실패'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div style={{
                background: 'rgba(30, 27, 75, 0.5)',
                borderRadius: '16px',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                overflow: 'hidden',
                animation: 'fadeSlideUp 0.5s ease-out forwards',
                animationDelay: '0.3s',
                opacity: 0,
            }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(99, 102, 241, 0.15)', background: 'rgba(15, 23, 42, 0.5)' }}>
                                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>시간</th>
                                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>사용자</th>
                                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>연결</th>
                                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>쿼리</th>
                                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>상태</th>
                                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>시간</th>
                                <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>액션</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.map((log, idx) => (
                                <tr 
                                    key={log.id}
                                    style={{ 
                                        borderBottom: '1px solid rgba(99, 102, 241, 0.05)',
                                        background: expandedRow === log.id ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                                        transition: 'background 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (expandedRow !== log.id) {
                                            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.03)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (expandedRow !== log.id) {
                                            e.currentTarget.style.background = 'transparent';
                                        }
                                    }}
                                >
                                    <td style={{ padding: '14px 20px', fontSize: '14px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                        <span title={new Date(log.executedAt).toLocaleString('ko-KR')}>
                                            {getRelativeTime(log.executedAt)}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 20px', fontSize: '14px', color: '#e2e8f0', fontWeight: 500 }}>
                                        {log.executedBy}
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <span style={{
                                            padding: '4px 10px',
                                            background: 'rgba(99, 102, 241, 0.15)',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            color: '#a5b4fc',
                                        }}>
                                            {log.connectionName}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <div 
                                            style={{ 
                                                fontSize: '13px', 
                                                color: '#94a3b8', 
                                                fontFamily: 'monospace', 
                                                maxWidth: '300px', 
                                                overflow: 'hidden', 
                                                textOverflow: 'ellipsis', 
                                                whiteSpace: expandedRow === log.id ? 'pre-wrap' : 'nowrap',
                                                cursor: 'pointer',
                                            }}
                                            onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                                            title="클릭하여 전체 보기"
                                        >
                                            {log.query}
                                        </div>
                                        {log.errorMessage && expandedRow === log.id && (
                                            <div style={{
                                                marginTop: '8px',
                                                padding: '8px 12px',
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                color: '#f87171',
                                            }}>
                                                ⚠️ {log.errorMessage}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: 500,
                                            background: log.status === 'SUCCESS' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                            color: log.status === 'SUCCESS' ? '#10b981' : '#ef4444',
                                        }}>
                                            {log.status === 'SUCCESS' ? '✓ 성공' : '✗ 실패'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 20px', fontSize: '14px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                        <span style={{
                                            padding: '3px 8px',
                                            background: log.durationMs > 1000 ? 'rgba(239, 68, 68, 0.1)' : log.durationMs > 500 ? 'rgba(251, 191, 36, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            color: log.durationMs > 1000 ? '#ef4444' : log.durationMs > 500 ? '#fbbf24' : '#10b981',
                                        }}>
                                            {log.durationMs}ms
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => handleCopyQuery(log.id, log.query)}
                                            style={{
                                                padding: '6px 12px',
                                                background: copiedId === log.id ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.1)',
                                                border: 'none',
                                                borderRadius: '6px',
                                                color: copiedId === log.id ? '#10b981' : '#a5b4fc',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            {copiedId === log.id ? '✓ 복사됨' : '📋 복사'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredLogs.length === 0 && (
                                <tr>
                                    <td colSpan={7} style={{ padding: '60px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📭</div>
                                        <div style={{ color: '#94a3b8', fontSize: '16px', marginBottom: '8px' }}>
                                            {searchTerm || statusFilter !== 'ALL' ? '검색 결과가 없습니다' : '로그가 없습니다'}
                                        </div>
                                        <div style={{ color: '#64748b', fontSize: '14px' }}>
                                            {searchTerm || statusFilter !== 'ALL' 
                                                ? '다른 검색어나 필터를 시도해보세요'
                                                : 'SQL 에디터에서 쿼리를 실행하면 여기에 기록됩니다'
                                            }
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Styles */}
            <style>{`
                @keyframes fadeSlideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                        transform: scale(1);
                    }
                    50% {
                        opacity: 0.5;
                        transform: scale(0.9);
                    }
                }
                
                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                
                input::placeholder {
                    color: #64748b;
                }
                
                input:focus {
                    border-color: rgba(99, 102, 241, 0.5) !important;
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
                }
                
                button:hover:not(:disabled) {
                    filter: brightness(1.1);
                }
            `}</style>
        </div>
    );
}
