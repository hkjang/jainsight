'use client';

import { useEffect, useState, useCallback } from 'react';
import { exportToCSV, useAutoRefresh, darkTheme, darkStyles } from '../../../components/admin/AdminUtils';

const API_URL = '/api';

interface AuditLog {
    id: string; action: string; resourceType: string; resourceId?: string; resourceName?: string;
    performedBy: string; performerName?: string; ipAddress?: string; status: 'success' | 'failure' | 'warning';
    details?: Record<string, unknown>; timestamp: string;
}

const resourceIcons: Record<string, string> = { user: '👤', group: '👥', role: '🔐', permission: '🛡️', api_key: '🔑', query: '📝', policy: '📋', system: '⚙️' };
const actionColors: Record<string, string> = { create: '#10B981', update: '#3B82F6', delete: '#EF4444', login: '#8B5CF6', logout: '#6B7280', execute: '#F59E0B', block: '#EF4444', grant: '#10B981', revoke: '#EF4444' };

export default function AuditLogPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [stats, setStats] = useState({ total: 15420, today: 234, failures: 45, queryCount: 8920 });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [resourceFilter, setResourceFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | 'all'>('7d');
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    const fetchLogs = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/audit-logs?range=${dateRange}&limit=100`);
            if (response.ok) { const data = await response.json(); setLogs(data.logs || data); }
            else {
                const now = Date.now();
                setLogs([
                    { id: '1', action: 'login', resourceType: 'user', performedBy: 'admin@example.com', performerName: 'Admin', ipAddress: '192.168.1.1', status: 'success', timestamp: new Date(now - 300000).toISOString() },
                    { id: '2', action: 'create', resourceType: 'user', resourceName: 'newuser@example.com', performedBy: 'admin@example.com', performerName: 'Admin', status: 'success', timestamp: new Date(now - 1800000).toISOString() },
                    { id: '3', action: 'execute', resourceType: 'query', resourceName: 'SELECT * FROM orders', performedBy: 'analyst@example.com', performerName: 'Analyst', status: 'success', timestamp: new Date(now - 2700000).toISOString() },
                    { id: '4', action: 'block', resourceType: 'query', resourceName: 'DROP TABLE users', performedBy: 'hacker@example.com', status: 'failure', details: { reason: 'DDL blocked' }, timestamp: new Date(now - 3600000).toISOString() },
                ]);
            }
        } catch (error) { console.error('Failed to fetch audit logs:', error); }
        finally { setLoading(false); }
    }, [dateRange]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);
    useAutoRefresh(fetchLogs, 30000, autoRefresh);

    const filteredLogs = logs.filter(log => {
        const matchesSearch = log.action.includes(searchTerm.toLowerCase()) || log.performedBy.includes(searchTerm.toLowerCase()) || (log.resourceName?.includes(searchTerm.toLowerCase()) ?? false);
        return (resourceFilter === 'all' || log.resourceType === resourceFilter) && (statusFilter === 'all' || log.status === statusFilter) && matchesSearch;
    });

    const getTimeAgo = (ts: string) => { const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000); if (m < 1) return '방금 전'; if (m < 60) return `${m}분 전`; const h = Math.floor(m / 60); if (h < 24) return `${h}시간 전`; return `${Math.floor(h / 24)}일 전`; };

    if (loading) return <div style={{ ...darkStyles.container, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}><div style={{ color: darkTheme.textSecondary }}>로딩 중...</div></div>;

    return (
        <div style={darkStyles.container}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div><h1 style={{ fontSize: '28px', fontWeight: 'bold', color: darkTheme.textPrimary }}>📜 감사 로그</h1><p style={{ color: darkTheme.textSecondary, marginTop: '4px' }}>시스템 활동 및 보안 이벤트 기록</p></div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: darkTheme.textSecondary, cursor: 'pointer' }}><input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />자동 새로고침</label>
                    <button onClick={() => exportToCSV(filteredLogs, 'audit_logs')} style={darkStyles.button}>📥 내보내기</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {[{ label: '전체 로그', value: stats.total.toLocaleString(), icon: '📊', color: darkTheme.accentBlue }, { label: '오늘', value: stats.today, icon: '📅', color: darkTheme.accentGreen }, { label: '실패/경고', value: stats.failures, icon: '⚠️', color: darkTheme.accentRed }, { label: '쿼리 실행', value: stats.queryCount.toLocaleString(), icon: '📝', color: darkTheme.accentPurple }].map(stat => (
                    <div key={stat.label} style={{ ...darkStyles.card, padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: `${stat.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{stat.icon}</div>
                            <div><div style={{ fontSize: '24px', fontWeight: 'bold', color: stat.color }}>{stat.value}</div><div style={{ fontSize: '12px', color: darkTheme.textSecondary }}>{stat.label}</div></div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ ...darkStyles.card, marginBottom: '24px' }}>
                <div style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input type="text" placeholder="🔍 로그 검색..." style={{ ...darkStyles.input, minWidth: '200px' }} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <select style={darkStyles.input} value={resourceFilter} onChange={e => setResourceFilter(e.target.value)}><option value="all">모든 리소스</option>{Object.keys(resourceIcons).map(t => <option key={t} value={t}>{resourceIcons[t]} {t}</option>)}</select>
                    <select style={darkStyles.input} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">모든 상태</option><option value="success">성공</option><option value="failure">실패</option><option value="warning">경고</option></select>
                    <select style={darkStyles.input} value={dateRange} onChange={e => setDateRange(e.target.value as 'today' | '7d' | '30d' | 'all')}><option value="today">오늘</option><option value="7d">7일</option><option value="30d">30일</option><option value="all">전체</option></select>
                </div>
            </div>

            <div style={darkStyles.card}>
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${darkTheme.border}`, fontWeight: '600', color: darkTheme.textPrimary }}>📜 활동 타임라인 ({filteredLogs.length}건)</div>
                <div style={{ maxHeight: '600px', overflow: 'auto' }}>
                    {filteredLogs.map((log, i) => (
                        <div key={log.id} onClick={() => setSelectedLog(log)} style={{ padding: '16px 20px', borderBottom: `1px solid ${darkTheme.borderLight}`, display: 'flex', gap: '16px', cursor: 'pointer', background: i % 2 ? 'rgba(15,23,42,0.3)' : 'transparent' }} onMouseEnter={e => e.currentTarget.style.background = darkTheme.bgCardHover} onMouseLeave={e => e.currentTarget.style.background = i % 2 ? 'rgba(15,23,42,0.3)' : 'transparent'}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: log.status === 'failure' ? `${darkTheme.accentRed}20` : `${darkTheme.accentGreen}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>{resourceIcons[log.resourceType] || '📌'}</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', background: `${actionColors[log.action] || darkTheme.textMuted}20`, color: actionColors[log.action] || darkTheme.textMuted }}>{log.action.toUpperCase()}</span><span style={{ fontWeight: '500', color: darkTheme.textPrimary }}>{log.performerName || log.performedBy}</span></div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', background: log.status === 'failure' ? `${darkTheme.accentRed}20` : `${darkTheme.accentGreen}20`, color: log.status === 'failure' ? darkTheme.accentRed : darkTheme.accentGreen }}>{log.status === 'success' ? '성공' : '실패'}</span><span style={{ fontSize: '12px', color: darkTheme.textMuted }}>{getTimeAgo(log.timestamp)}</span></div>
                                </div>
                                <div style={{ fontSize: '14px', color: darkTheme.textSecondary }}>{log.resourceType} {log.resourceName && <code style={{ padding: '2px 6px', background: darkTheme.bgInput, borderRadius: '4px', fontSize: '12px', color: darkTheme.textPrimary }}>{log.resourceName}</code>}</div>
                                {log.ipAddress && <div style={{ fontSize: '12px', color: darkTheme.textMuted, marginTop: '4px' }}>IP: {log.ipAddress}</div>}
                            </div>
                        </div>
                    ))}
                    {filteredLogs.length === 0 && <div style={{ padding: '48px', textAlign: 'center', color: darkTheme.textMuted }}>검색 결과가 없습니다</div>}
                </div>
            </div>

            {selectedLog && (
                <div style={darkStyles.modalOverlay} onClick={() => setSelectedLog(null)}>
                    <div style={{ ...darkStyles.modal, maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}><h2 style={{ fontSize: '20px', fontWeight: 'bold', color: darkTheme.textPrimary }}>📋 로그 상세</h2><button onClick={() => setSelectedLog(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: darkTheme.textSecondary }}>✕</button></div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{ background: darkTheme.bgInput, padding: '12px', borderRadius: '8px' }}><div style={{ fontSize: '12px', color: darkTheme.textMuted }}>Action</div><div style={{ fontWeight: '500', color: darkTheme.textPrimary }}>{selectedLog.action.toUpperCase()}</div></div>
                            <div style={{ background: darkTheme.bgInput, padding: '12px', borderRadius: '8px' }}><div style={{ fontSize: '12px', color: darkTheme.textMuted }}>Status</div><div style={{ fontWeight: '500', color: selectedLog.status === 'failure' ? darkTheme.accentRed : darkTheme.accentGreen }}>{selectedLog.status.toUpperCase()}</div></div>
                            <div style={{ background: darkTheme.bgInput, padding: '12px', borderRadius: '8px' }}><div style={{ fontSize: '12px', color: darkTheme.textMuted }}>Performed By</div><div style={{ fontWeight: '500', color: darkTheme.textPrimary }}>{selectedLog.performerName || selectedLog.performedBy}</div></div>
                            <div style={{ background: darkTheme.bgInput, padding: '12px', borderRadius: '8px' }}><div style={{ fontSize: '12px', color: darkTheme.textMuted }}>Timestamp</div><div style={{ fontWeight: '500', color: darkTheme.textPrimary }}>{new Date(selectedLog.timestamp).toLocaleString('ko-KR')}</div></div>
                        </div>
                        {selectedLog.details && <pre style={{ background: darkTheme.bgPrimary, color: darkTheme.textPrimary, padding: '16px', borderRadius: '8px', fontSize: '12px', overflow: 'auto', marginTop: '16px' }}>{JSON.stringify(selectedLog.details, null, 2)}</pre>}
                        <button style={{ ...darkStyles.buttonSecondary, width: '100%', marginTop: '20px' }} onClick={() => setSelectedLog(null)}>닫기</button>
                    </div>
                </div>
            )}
        </div>
    );
}
