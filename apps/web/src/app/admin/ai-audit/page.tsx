'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

interface AuditLog {
    id: string;
    userInput?: string;
    generatedSql?: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    success: boolean;
    errorMessage?: string;
    wasBlocked: boolean;
    blockReason?: string;
    userId?: string;
    connectionId?: string;
    provider?: { name: string };
    model?: { name: string };
    createdAt: string;
}

const API_BASE = 'http://localhost:3333/api';

export default function AiAuditPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [filters, setFilters] = useState({
        success: '',
        startDate: '',
        endDate: '',
        provider: '',
        minLatency: '',
        maxLatency: '',
    });
    const [exporting, setExporting] = useState(false);

    const limit = 20;

    useEffect(() => {
        fetchLogs();
    }, [page, filters]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (selectedLog) {
                if (e.key === 'Escape') {
                    setSelectedLog(null);
                }
                return;
            }

            if (e.key === 'ArrowDown' || e.key === 'j') {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, logs.length - 1));
            } else if (e.key === 'ArrowUp' || e.key === 'k') {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
                e.preventDefault();
                setSelectedLog(logs[selectedIndex]);
            } else if (e.key === 'ArrowRight' || e.key === 'l') {
                if ((page + 1) * limit < total) {
                    setPage(p => p + 1);
                    setSelectedIndex(0);
                }
            } else if (e.key === 'ArrowLeft' || e.key === 'h') {
                if (page > 0) {
                    setPage(p => p - 1);
                    setSelectedIndex(0);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [logs, selectedIndex, selectedLog, page, total]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                limit: String(limit),
                offset: String(page * limit),
            });
            if (filters.success) params.append('success', filters.success);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);

            const res = await fetch(`${API_BASE}/admin/ai-monitor/audit?${params}`);
            const data = await res.json();
            setLogs(data.logs || []);
            setTotal(data.total || 0);
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    // Statistics
    const stats = useMemo(() => {
        const successCount = logs.filter(l => l.success).length;
        const failCount = logs.filter(l => !l.success && !l.wasBlocked).length;
        const blockedCount = logs.filter(l => l.wasBlocked).length;
        const avgLatency = logs.length > 0 
            ? logs.reduce((a, b) => a + b.latencyMs, 0) / logs.length 
            : 0;
        const totalTokens = logs.reduce((a, b) => a + b.inputTokens + b.outputTokens, 0);
        
        return { successCount, failCount, blockedCount, avgLatency, totalTokens };
    }, [logs]);

    const handleExport = async (format: 'csv' | 'json') => {
        setExporting(true);
        try {
            const params = new URLSearchParams({
                limit: '1000',
                offset: '0',
            });
            if (filters.success) params.append('success', filters.success);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);

            const res = await fetch(`${API_BASE}/admin/ai-monitor/audit?${params}`);
            const data = await res.json();
            const allLogs = data.logs || [];

            let content: string;
            let filename: string;
            let mimeType: string;

            if (format === 'json') {
                content = JSON.stringify(allLogs, null, 2);
                filename = `ai-audit-export-${new Date().toISOString().slice(0, 10)}.json`;
                mimeType = 'application/json';
            } else {
                const headers = ['시간', '상태', '모델', '입력', 'Tokens', 'Latency', '오류'];
                const rows = allLogs.map((log: AuditLog) => [
                    new Date(log.createdAt).toLocaleString('ko-KR'),
                    log.wasBlocked ? '차단' : log.success ? '성공' : '실패',
                    log.model?.name || '-',
                    (log.userInput || '-').replace(/"/g, '""'),
                    log.inputTokens + log.outputTokens,
                    log.latencyMs,
                    (log.errorMessage || log.blockReason || '-').replace(/"/g, '""'),
                ]);
                content = [headers.join(','), ...rows.map((r: (string | number)[]) => r.map((c: string | number) => `"${c}"`).join(','))].join('\n');
                filename = `ai-audit-export-${new Date().toISOString().slice(0, 10)}.csv`;
                mimeType = 'text/csv';
            }

            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        } finally {
            setExporting(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('ko-KR');
    };

    const clearFilters = () => {
        setFilters({ success: '', startDate: '', endDate: '', provider: '', minLatency: '', maxLatency: '' });
        setPage(0);
    };

    const inputStyle = {
        padding: '8px 12px',
        background: 'rgba(30, 30, 50, 0.8)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: '8px',
        color: '#e0e0e0',
        fontSize: '13px',
        outline: 'none',
        transition: 'all 0.2s ease',
    };

    const buttonStyle = {
        padding: '8px 16px',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 500,
        transition: 'all 0.2s ease',
    };

    const MiniStatCard = ({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) => (
        <div style={{
            padding: '12px 16px',
            background: 'rgba(20, 20, 35, 0.6)',
            borderRadius: '10px',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
        }}>
            <span style={{ fontSize: '20px' }}>{icon}</span>
            <div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>{label}</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color }}>{value}</div>
            </div>
        </div>
    );

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ 
                        fontSize: '28px', 
                        fontWeight: 700, 
                        background: 'linear-gradient(90deg, #6366f1, #a855f7)', 
                        WebkitBackgroundClip: 'text', 
                        WebkitTextFillColor: 'transparent', 
                        marginBottom: '8px' 
                    }}>
                        AI 감사 로그
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: '14px' }}>AI SQL 생성 요청 이력을 조회합니다.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => handleExport('csv')}
                        disabled={exporting}
                        style={{ ...buttonStyle, background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}
                    >
                        📥 CSV
                    </button>
                    <button
                        onClick={() => handleExport('json')}
                        disabled={exporting}
                        style={{ ...buttonStyle, background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc' }}
                    >
                        📥 JSON
                    </button>
                </div>
            </div>

            {/* Mini Stats (Current Page) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                <MiniStatCard icon="✅" label="성공" value={stats.successCount} color="#10b981" />
                <MiniStatCard icon="❌" label="실패" value={stats.failCount} color="#ef4444" />
                <MiniStatCard icon="🛡️" label="차단" value={stats.blockedCount} color="#f59e0b" />
                <MiniStatCard icon="⚡" label="평균 응답" value={`${stats.avgLatency.toFixed(0)}ms`} color="#6366f1" />
                <MiniStatCard icon="🔢" label="토큰" value={stats.totalTokens.toLocaleString()} color="#a855f7" />
            </div>

            {/* Filters */}
            <div style={{ 
                display: 'flex', 
                gap: '10px', 
                marginBottom: '16px', 
                flexWrap: 'wrap',
                padding: '16px',
                background: 'rgba(20, 20, 35, 0.4)',
                borderRadius: '12px',
                border: '1px solid rgba(99, 102, 241, 0.15)',
            }}>
                <select 
                    value={filters.success} 
                    onChange={(e) => setFilters({ ...filters, success: e.target.value })} 
                    style={inputStyle}
                >
                    <option value="">모든 상태</option>
                    <option value="true">성공</option>
                    <option value="false">실패</option>
                </select>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>기간:</span>
                    <input 
                        type="date" 
                        value={filters.startDate} 
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} 
                        style={inputStyle} 
                    />
                    <span style={{ color: '#6b7280' }}>~</span>
                    <input 
                        type="date" 
                        value={filters.endDate} 
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} 
                        style={inputStyle} 
                    />
                </div>
                <button 
                    onClick={() => { setPage(0); fetchLogs(); }} 
                    style={{ ...buttonStyle, background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc' }}
                >
                    🔍 검색
                </button>
                <button 
                    onClick={clearFilters} 
                    style={{ ...buttonStyle, background: 'rgba(107, 114, 128, 0.2)', color: '#9ca3af' }}
                >
                    초기화
                </button>
                <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <kbd style={{ padding: '2px 6px', background: 'rgba(99, 102, 241, 0.2)', borderRadius: '4px', fontSize: '10px' }}>↑↓</kbd>
                    탐색
                    <kbd style={{ padding: '2px 6px', background: 'rgba(99, 102, 241, 0.2)', borderRadius: '4px', fontSize: '10px' }}>Enter</kbd>
                    상세
                    <kbd style={{ padding: '2px 6px', background: 'rgba(99, 102, 241, 0.2)', borderRadius: '4px', fontSize: '10px' }}>←→</kbd>
                    페이지
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                    <div style={{ 
                        width: '40px', height: '40px', margin: '0 auto 16px',
                        border: '3px solid rgba(99, 102, 241, 0.3)', borderTopColor: '#6366f1',
                        borderRadius: '50%', animation: 'spin 1s linear infinite',
                    }} />
                    로딩 중...
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            ) : logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(20, 20, 35, 0.6)', borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📜</div>
                    <div style={{ color: '#6b7280' }}>감사 로그가 없습니다.</div>
                </div>
            ) : (
                <>
                    <div style={{ background: 'rgba(20, 20, 35, 0.6)', borderRadius: '14px', border: '1px solid rgba(99, 102, 241, 0.2)', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: 500, width: '40px' }}>#</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>시간</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>상태</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>모델</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>입력</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Tokens</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Latency</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>액션</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log, idx) => (
                                    <tr 
                                        key={log.id} 
                                        style={{ 
                                            borderTop: '1px solid rgba(99, 102, 241, 0.1)',
                                            background: selectedIndex === idx ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                            cursor: 'pointer',
                                            transition: 'background 0.15s ease',
                                        }}
                                        onClick={() => setSelectedLog(log)}
                                        onMouseEnter={() => setSelectedIndex(idx)}
                                    >
                                        <td style={{ padding: '12px 16px', fontSize: '12px', color: '#6b7280' }}>
                                            {page * limit + idx + 1}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#a0a0a0' }}>{formatDate(log.createdAt)}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            {log.wasBlocked ? (
                                                <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '11px', background: 'rgba(245, 158, 11, 0.2)', color: '#fcd34d', fontWeight: 500 }}>🛡️ 차단</span>
                                            ) : log.success ? (
                                                <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '11px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', fontWeight: 500 }}>✓ 성공</span>
                                            ) : (
                                                <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '11px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontWeight: 500 }}>✗ 실패</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#e0e0e0' }}>{log.model?.name || '-'}</td>
                                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#a0a0a0', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {log.userInput || '-'}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#a5b4fc', textAlign: 'right' }}>
                                            {(log.inputTokens + log.outputTokens).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'right' }}>
                                            <span style={{ 
                                                color: log.latencyMs < 1000 ? '#10b981' : log.latencyMs < 3000 ? '#f59e0b' : '#ef4444'
                                            }}>
                                                {log.latencyMs}ms
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }} 
                                                style={{ ...buttonStyle, background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', padding: '4px 10px', fontSize: '11px' }}
                                            >
                                                상세
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                            총 <span style={{ color: '#a5b4fc', fontWeight: 600 }}>{total.toLocaleString()}</span>건 중 {page * limit + 1}-{Math.min((page + 1) * limit, total)}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button 
                                onClick={() => setPage(0)} 
                                disabled={page === 0} 
                                style={{ ...buttonStyle, background: page === 0 ? 'rgba(107, 114, 128, 0.1)' : 'rgba(99, 102, 241, 0.2)', color: page === 0 ? '#4b5563' : '#a5b4fc', padding: '6px 10px' }}
                            >
                                ⟪
                            </button>
                            <button 
                                onClick={() => setPage(p => Math.max(0, p - 1))} 
                                disabled={page === 0} 
                                style={{ ...buttonStyle, background: page === 0 ? 'rgba(107, 114, 128, 0.1)' : 'rgba(99, 102, 241, 0.2)', color: page === 0 ? '#4b5563' : '#a5b4fc' }}
                            >
                                ← 이전
                            </button>
                            <span style={{ padding: '0 12px', fontSize: '13px', color: '#a5b4fc' }}>
                                {page + 1} / {Math.ceil(total / limit) || 1}
                            </span>
                            <button 
                                onClick={() => setPage(p => p + 1)} 
                                disabled={(page + 1) * limit >= total} 
                                style={{ ...buttonStyle, background: (page + 1) * limit >= total ? 'rgba(107, 114, 128, 0.1)' : 'rgba(99, 102, 241, 0.2)', color: (page + 1) * limit >= total ? '#4b5563' : '#a5b4fc' }}
                            >
                                다음 →
                            </button>
                            <button 
                                onClick={() => setPage(Math.ceil(total / limit) - 1)} 
                                disabled={(page + 1) * limit >= total} 
                                style={{ ...buttonStyle, background: (page + 1) * limit >= total ? 'rgba(107, 114, 128, 0.1)' : 'rgba(99, 102, 241, 0.2)', color: (page + 1) * limit >= total ? '#4b5563' : '#a5b4fc', padding: '6px 10px' }}
                            >
                                ⟫
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Detail Modal */}
            {selectedLog && (
                <div 
                    style={{ 
                        position: 'fixed', 
                        inset: 0, 
                        background: 'rgba(0, 0, 0, 0.7)', 
                        backdropFilter: 'blur(4px)',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        zIndex: 1000 
                    }}
                    onClick={(e) => e.target === e.currentTarget && setSelectedLog(null)}
                >
                    <div style={{ 
                        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', 
                        borderRadius: '20px', 
                        border: '1px solid rgba(99, 102, 241, 0.3)', 
                        padding: '28px', 
                        width: '700px', 
                        maxHeight: '90vh', 
                        overflow: 'auto' 
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#fff' }}>로그 상세</h2>
                                {selectedLog.wasBlocked ? (
                                    <span style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '12px', background: 'rgba(245, 158, 11, 0.2)', color: '#fcd34d' }}>🛡️ 차단됨</span>
                                ) : selectedLog.success ? (
                                    <span style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '12px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>✓ 성공</span>
                                ) : (
                                    <span style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '12px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>✗ 실패</span>
                                )}
                            </div>
                            <button onClick={() => setSelectedLog(null)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '24px', lineHeight: 1 }}>×</button>
                        </div>

                        <div style={{ display: 'grid', gap: '16px' }}>
                            {/* Meta info */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                                <div style={{ padding: '12px', background: 'rgba(10, 10, 20, 0.5)', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>시간</div>
                                    <div style={{ fontSize: '13px', color: '#e0e0e0' }}>{formatDate(selectedLog.createdAt)}</div>
                                </div>
                                <div style={{ padding: '12px', background: 'rgba(10, 10, 20, 0.5)', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Provider / Model</div>
                                    <div style={{ fontSize: '13px', color: '#e0e0e0' }}>
                                        {selectedLog.provider?.name || '-'} / {selectedLog.model?.name || '-'}
                                    </div>
                                </div>
                                <div style={{ padding: '12px', background: 'rgba(10, 10, 20, 0.5)', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Tokens</div>
                                    <div style={{ fontSize: '13px', color: '#a5b4fc' }}>
                                        {selectedLog.inputTokens} → {selectedLog.outputTokens} (총 {selectedLog.inputTokens + selectedLog.outputTokens})
                                    </div>
                                </div>
                                <div style={{ padding: '12px', background: 'rgba(10, 10, 20, 0.5)', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Latency</div>
                                    <div style={{ fontSize: '13px', color: selectedLog.latencyMs < 1000 ? '#10b981' : selectedLog.latencyMs < 3000 ? '#f59e0b' : '#ef4444' }}>
                                        {selectedLog.latencyMs}ms
                                    </div>
                                </div>
                            </div>

                            {selectedLog.userInput && (
                                <div>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>사용자 입력</div>
                                    <div style={{ padding: '14px', background: 'rgba(10, 10, 20, 0.5)', borderRadius: '8px', fontSize: '13px', color: '#e0e0e0' }}>{selectedLog.userInput}</div>
                                </div>
                            )}

                            {selectedLog.generatedSql && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '12px', color: '#6b7280' }}>생성된 SQL</span>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(selectedLog.generatedSql || '')}
                                            style={{ ...buttonStyle, padding: '4px 8px', fontSize: '11px', background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc' }}
                                        >
                                            📋 복사
                                        </button>
                                    </div>
                                    <pre style={{ 
                                        padding: '14px', 
                                        background: 'rgba(10, 10, 20, 0.5)', 
                                        borderRadius: '8px', 
                                        fontSize: '12px', 
                                        color: '#a5b4fc', 
                                        whiteSpace: 'pre-wrap', 
                                        margin: 0, 
                                        fontFamily: 'monospace',
                                        maxHeight: '200px',
                                        overflow: 'auto',
                                    }}>
                                        {selectedLog.generatedSql}
                                    </pre>
                                </div>
                            )}

                            {(selectedLog.errorMessage || selectedLog.blockReason) && (
                                <div>
                                    <div style={{ fontSize: '12px', color: '#ef4444', marginBottom: '6px' }}>오류/차단 사유</div>
                                    <div style={{ padding: '14px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', fontSize: '13px', color: '#fca5a5' }}>
                                        {selectedLog.blockReason || selectedLog.errorMessage}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <button onClick={() => setSelectedLog(null)} style={{ ...buttonStyle, background: 'rgba(107, 114, 128, 0.2)', color: '#9ca3af' }}>
                                닫기 (ESC)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
