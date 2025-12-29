'use client';

import { useEffect, useState, useCallback } from 'react';
import { exportToCSV, useAutoRefresh } from '../../../components/admin/AdminUtils';

const API_URL = '/api';

interface AuditLog {
    id: string;
    action: string;
    resourceType: 'user' | 'group' | 'role' | 'permission' | 'api_key' | 'query' | 'policy' | 'system';
    resourceId?: string;
    resourceName?: string;
    performedBy: string;
    performerName?: string;
    ipAddress?: string;
    userAgent?: string;
    status: 'success' | 'failure' | 'warning';
    details?: Record<string, unknown>;
    timestamp: string;
}

interface AuditStats {
    total: number;
    today: number;
    failures: number;
    byResource: Record<string, number>;
}

const resourceIcons: Record<string, string> = {
    user: '👤',
    group: '👥',
    role: '🔐',
    permission: '🛡️',
    api_key: '🔑',
    query: '📝',
    policy: '📋',
    system: '⚙️'
};

const actionColors: Record<string, string> = {
    create: '#10B981',
    update: '#3B82F6',
    delete: '#EF4444',
    login: '#8B5CF6',
    logout: '#6B7280',
    execute: '#F59E0B',
    block: '#EF4444',
    grant: '#10B981',
    revoke: '#EF4444'
};

export default function AuditLogPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [stats, setStats] = useState<AuditStats>({ total: 0, today: 0, failures: 0, byResource: {} });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [resourceFilter, setResourceFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | 'all'>('7d');
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    const fetchLogs = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/audit-logs?range=${dateRange}&limit=100`);
            if (response.ok) {
                const data = await response.json();
                setLogs(data.logs || data);
            } else {
                // Mock data
                const now = Date.now();
                setLogs([
                    { id: '1', action: 'login', resourceType: 'user', performedBy: 'admin@example.com', performerName: 'Admin', ipAddress: '192.168.1.1', status: 'success', timestamp: new Date(now - 1000 * 60 * 5).toISOString() },
                    { id: '2', action: 'create', resourceType: 'user', resourceId: 'u123', resourceName: 'newuser@example.com', performedBy: 'admin@example.com', performerName: 'Admin', status: 'success', timestamp: new Date(now - 1000 * 60 * 30).toISOString() },
                    { id: '3', action: 'execute', resourceType: 'query', resourceName: 'SELECT * FROM orders', performedBy: 'analyst@example.com', performerName: 'Analyst', status: 'success', timestamp: new Date(now - 1000 * 60 * 45).toISOString() },
                    { id: '4', action: 'block', resourceType: 'query', resourceName: 'DROP TABLE users', performedBy: 'hacker@example.com', status: 'failure', details: { reason: 'DDL blocked by policy' }, timestamp: new Date(now - 1000 * 60 * 60).toISOString() },
                    { id: '5', action: 'update', resourceType: 'role', resourceId: 'r456', resourceName: 'Developer', performedBy: 'admin@example.com', performerName: 'Admin', status: 'success', details: { added: ['query:execute'], removed: [] }, timestamp: new Date(now - 1000 * 60 * 120).toISOString() },
                    { id: '6', action: 'create', resourceType: 'api_key', resourceName: 'Production API Key', performedBy: 'developer@example.com', performerName: 'Developer', status: 'success', timestamp: new Date(now - 1000 * 60 * 180).toISOString() },
                    { id: '7', action: 'grant', resourceType: 'permission', resourceName: 'db:production:read', performedBy: 'admin@example.com', performerName: 'Admin', details: { targetUser: 'analyst@example.com' }, status: 'success', timestamp: new Date(now - 1000 * 60 * 240).toISOString() },
                    { id: '8', action: 'login', resourceType: 'user', performedBy: 'unknown@example.com', ipAddress: '10.0.0.55', status: 'failure', details: { reason: 'Invalid credentials' }, timestamp: new Date(now - 1000 * 60 * 300).toISOString() },
                    { id: '9', action: 'delete', resourceType: 'group', resourceId: 'g789', resourceName: 'Old Team', performedBy: 'admin@example.com', performerName: 'Admin', status: 'success', timestamp: new Date(now - 1000 * 60 * 360).toISOString() },
                    { id: '10', action: 'revoke', resourceType: 'api_key', resourceName: 'Expired Key', performedBy: 'system', status: 'success', details: { reason: 'Auto-revoked due to expiration' }, timestamp: new Date(now - 1000 * 60 * 420).toISOString() },
                ]);
            }
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        }
    }, [dateRange]);

    const fetchStats = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/audit-logs/stats`);
            if (response.ok) {
                setStats(await response.json());
            } else {
                setStats({
                    total: 15420,
                    today: 234,
                    failures: 45,
                    byResource: { user: 5420, query: 8920, role: 520, api_key: 350, group: 210 }
                });
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLogs();
        fetchStats();
    }, [fetchLogs, fetchStats]);

    useAutoRefresh(fetchLogs, 30000, autoRefresh);

    const filteredLogs = logs.filter(log => {
        const matchesSearch = 
            log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.performedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.resourceName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
        const matchesResource = resourceFilter === 'all' || log.resourceType === resourceFilter;
        const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
        return matchesSearch && matchesResource && matchesStatus;
    });

    const getTimeAgo = (timestamp: string) => {
        const diff = Date.now() - new Date(timestamp).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return '방금 전';
        if (minutes < 60) return `${minutes}분 전`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}시간 전`;
        const days = Math.floor(hours / 24);
        return `${days}일 전`;
    };

    const containerStyle: React.CSSProperties = { padding: '24px', maxWidth: '1600px', margin: '0 auto' };
    const cardStyle: React.CSSProperties = { background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' };
    const inputStyle: React.CSSProperties = { padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none' };
    const modalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
    const modalStyle: React.CSSProperties = { background: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '600px', maxHeight: '80vh', overflow: 'auto' };

    if (loading) {
        return <div style={{ ...containerStyle, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}><div style={{ fontSize: '18px', color: '#6B7280' }}>로딩 중...</div></div>;
    }

    return (
        <div style={containerStyle}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1F2937' }}>📜 감사 로그</h1>
                    <p style={{ color: '#6B7280', marginTop: '4px' }}>시스템 활동 및 보안 이벤트 기록</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#6B7280', cursor: 'pointer' }}>
                        <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} style={{ accentColor: '#3B82F6' }} />
                        자동 새로고침
                    </label>
                    <button
                        onClick={() => exportToCSV(filteredLogs, 'audit_logs')}
                        style={{ padding: '8px 16px', background: '#3B82F6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
                    >
                        📥 내보내기
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {[
                    { label: '전체 로그', value: stats.total.toLocaleString(), icon: '📊', color: '#3B82F6' },
                    { label: '오늘', value: stats.today, icon: '📅', color: '#10B981' },
                    { label: '실패/경고', value: stats.failures, icon: '⚠️', color: '#EF4444' },
                    { label: '쿼리 실행', value: stats.byResource.query?.toLocaleString() || '0', icon: '📝', color: '#8B5CF6' },
                ].map(stat => (
                    <div key={stat.label} style={{ ...cardStyle, padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{stat.icon}</div>
                            <div>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
                                <div style={{ fontSize: '12px', color: '#6B7280' }}>{stat.label}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ ...cardStyle, marginBottom: '24px' }}>
                <div style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        placeholder="🔍 로그 검색..."
                        style={{ ...inputStyle, minWidth: '200px' }}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <select style={{ ...inputStyle, cursor: 'pointer' }} value={resourceFilter} onChange={e => setResourceFilter(e.target.value)}>
                        <option value="all">모든 리소스</option>
                        {Object.keys(resourceIcons).map(type => (
                            <option key={type} value={type}>{resourceIcons[type]} {type}</option>
                        ))}
                    </select>
                    <select style={{ ...inputStyle, cursor: 'pointer' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="all">모든 상태</option>
                        <option value="success">성공</option>
                        <option value="failure">실패</option>
                        <option value="warning">경고</option>
                    </select>
                    <select style={{ ...inputStyle, cursor: 'pointer' }} value={dateRange} onChange={e => setDateRange(e.target.value as typeof dateRange)}>
                        <option value="today">오늘</option>
                        <option value="7d">최근 7일</option>
                        <option value="30d">최근 30일</option>
                        <option value="all">전체</option>
                    </select>
                </div>
            </div>

            {/* Timeline */}
            <div style={cardStyle}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', fontWeight: '600' }}>
                    📜 활동 타임라인 ({filteredLogs.length}건)
                </div>
                <div style={{ maxHeight: '600px', overflow: 'auto' }}>
                    {filteredLogs.map((log, index) => (
                        <div
                            key={log.id}
                            onClick={() => setSelectedLog(log)}
                            style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid #E5E7EB',
                                display: 'flex',
                                gap: '16px',
                                cursor: 'pointer',
                                transition: 'background 0.2s',
                                background: index % 2 === 0 ? 'white' : '#FAFAFA'
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#EEF2FF')}
                            onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? 'white' : '#FAFAFA')}
                        >
                            {/* Timeline Indicator */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '40px' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: log.status === 'failure' ? '#FEE2E2' : log.status === 'warning' ? '#FEF3C7' : '#D1FAE5',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '16px'
                                }}>
                                    {resourceIcons[log.resourceType]}
                                </div>
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            background: `${actionColors[log.action] || '#6B7280'}15`,
                                            color: actionColors[log.action] || '#6B7280'
                                        }}>
                                            {log.action.toUpperCase()}
                                        </span>
                                        <span style={{ fontWeight: '500' }}>{log.performerName || log.performedBy}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            fontSize: '10px',
                                            background: log.status === 'failure' ? '#FEE2E2' : log.status === 'warning' ? '#FEF3C7' : '#D1FAE5',
                                            color: log.status === 'failure' ? '#DC2626' : log.status === 'warning' ? '#D97706' : '#059669'
                                        }}>
                                            {log.status === 'success' ? '성공' : log.status === 'failure' ? '실패' : '경고'}
                                        </span>
                                        <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{getTimeAgo(log.timestamp)}</span>
                                    </div>
                                </div>
                                <div style={{ fontSize: '14px', color: '#374151' }}>
                                    {log.resourceType} {log.resourceName && <code style={{ padding: '2px 6px', background: '#F3F4F6', borderRadius: '4px', fontSize: '12px' }}>{log.resourceName}</code>}
                                </div>
                                {log.ipAddress && (
                                    <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
                                        IP: {log.ipAddress}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {filteredLogs.length === 0 && (
                        <div style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>
                            검색 결과가 없습니다
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Modal */}
            {selectedLog && (
                <div style={modalOverlayStyle} onClick={() => setSelectedLog(null)}>
                    <div style={modalStyle} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>📋 로그 상세</h2>
                            <button onClick={() => setSelectedLog(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ background: '#F9FAFB', padding: '12px', borderRadius: '8px' }}>
                                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Action</div>
                                <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ padding: '4px 8px', borderRadius: '4px', background: `${actionColors[selectedLog.action]}15`, color: actionColors[selectedLog.action] }}>
                                        {selectedLog.action.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <div style={{ background: '#F9FAFB', padding: '12px', borderRadius: '8px' }}>
                                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Status</div>
                                <div style={{ fontWeight: '500' }}>
                                    <span style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        background: selectedLog.status === 'failure' ? '#FEE2E2' : '#D1FAE5',
                                        color: selectedLog.status === 'failure' ? '#DC2626' : '#059669'
                                    }}>
                                        {selectedLog.status.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <div style={{ background: '#F9FAFB', padding: '12px', borderRadius: '8px' }}>
                                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Performed By</div>
                                <div style={{ fontWeight: '500' }}>{selectedLog.performerName || selectedLog.performedBy}</div>
                            </div>
                            <div style={{ background: '#F9FAFB', padding: '12px', borderRadius: '8px' }}>
                                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Timestamp</div>
                                <div style={{ fontWeight: '500' }}>{new Date(selectedLog.timestamp).toLocaleString('ko-KR')}</div>
                            </div>
                            <div style={{ background: '#F9FAFB', padding: '12px', borderRadius: '8px' }}>
                                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Resource Type</div>
                                <div style={{ fontWeight: '500' }}>{resourceIcons[selectedLog.resourceType]} {selectedLog.resourceType}</div>
                            </div>
                            <div style={{ background: '#F9FAFB', padding: '12px', borderRadius: '8px' }}>
                                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Resource</div>
                                <div style={{ fontWeight: '500' }}>{selectedLog.resourceName || selectedLog.resourceId || '-'}</div>
                            </div>
                            {selectedLog.ipAddress && (
                                <div style={{ background: '#F9FAFB', padding: '12px', borderRadius: '8px', gridColumn: 'span 2' }}>
                                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>IP Address</div>
                                    <div style={{ fontWeight: '500' }}>{selectedLog.ipAddress}</div>
                                </div>
                            )}
                        </div>

                        {selectedLog.details && (
                            <div style={{ marginTop: '20px' }}>
                                <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>상세 정보</div>
                                <pre style={{
                                    background: '#1F2937',
                                    color: '#E5E7EB',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    overflow: 'auto',
                                    fontFamily: 'monospace'
                                }}>
                                    {JSON.stringify(selectedLog.details, null, 2)}
                                </pre>
                            </div>
                        )}

                        <button
                            style={{
                                width: '100%',
                                marginTop: '20px',
                                padding: '12px',
                                background: '#F3F4F6',
                                color: '#374151',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                cursor: 'pointer'
                            }}
                            onClick={() => setSelectedLog(null)}
                        >
                            닫기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
