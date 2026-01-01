'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';

interface Connection {
    id: string;
    name: string;
    type: string;
    host: string;
    database: string;
    visibility?: 'private' | 'team' | 'group' | 'public';
    sharedWithGroups?: string[];
    createdBy?: string;
    isOwner?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

interface Group {
    id: string;
    name: string;
    type: string;
    memberCount?: number;
}

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

const dbIcons: Record<string, { icon: string; color: string }> = {
    postgresql: { icon: '🐘', color: '#336791' },
    postgres: { icon: '🐘', color: '#336791' },
    mysql: { icon: '🐬', color: '#00758f' },
    mssql: { icon: '🔷', color: '#CC2927' },
    oracle: { icon: '🔶', color: '#F80000' },
    mariadb: { icon: '🦭', color: '#003545' },
    sqlite: { icon: '📁', color: '#003B57' },
    mongodb: { icon: '🍃', color: '#47A248' },
    redis: { icon: '🔑', color: '#DC382D' },
};

type SortField = 'name' | 'type' | 'visibility' | 'createdAt';
type SortOrder = 'asc' | 'desc';
type VisibilityFilter = 'all' | 'private' | 'group' | 'public';
type ViewMode = 'table' | 'card';

export default function ConnectionsSharingPage() {
    const [connections, setConnections] = useState<Connection[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    
    // 검색 및 필터
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all');
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    
    // 자동 새로고침
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState(30);
    const [refreshCountdown, setRefreshCountdown] = useState(30);
    
    // 복사 피드백
    const [copiedId, setCopiedId] = useState<string | null>(null);
    
    // 탭
    const [activeTab, setActiveTab] = useState<'overview' | 'groups' | 'matrix'>('overview');
    
    // 새로운 기능
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [connectionHealth, setConnectionHealth] = useState<Record<string, 'online' | 'offline' | 'checking'>>({});
    
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const fetchData = useCallback(async () => {
        const token = localStorage.getItem('token');
        try {
            const [connRes, groupRes] = await Promise.all([
                fetch('/api/connections', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/groups', { headers: { 'Authorization': `Bearer ${token}` } }),
            ]);
            if (connRes.ok) setConnections(await connRes.json());
            if (groupRes.ok) setGroups(await groupRes.json());
            setLastUpdated(new Date());
        } catch (e) {
            console.error('Failed to fetch data', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);
    
    // 자동 새로고침
    useEffect(() => {
        if (autoRefresh) {
            setRefreshCountdown(refreshInterval);
            intervalRef.current = setInterval(() => {
                fetchData();
                setRefreshCountdown(refreshInterval);
            }, refreshInterval * 1000);
            
            countdownRef.current = setInterval(() => {
                setRefreshCountdown(prev => Math.max(0, prev - 1));
            }, 1000);
        }
        
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, [autoRefresh, refreshInterval, fetchData]);
    
    // 데이터베이스 타입 목록
    const dbTypes = useMemo(() => {
        const types = new Set(connections.map(c => c.type.toLowerCase()));
        return Array.from(types).sort();
    }, [connections]);
    
    // 필터링 및 정렬된 연결
    const filteredConnections = useMemo(() => {
        let result = [...connections];
        
        // 검색
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(c => 
                c.name.toLowerCase().includes(query) ||
                c.host.toLowerCase().includes(query) ||
                c.database.toLowerCase().includes(query) ||
                c.type.toLowerCase().includes(query)
            );
        }
        
        // 타입 필터
        if (typeFilter !== 'all') {
            result = result.filter(c => c.type.toLowerCase() === typeFilter);
        }
        
        // 가시성 필터
        if (visibilityFilter !== 'all') {
            result = result.filter(c => {
                const vis = c.visibility || 'private';
                return vis === visibilityFilter;
            });
        }
        
        // 정렬
        result.sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'type':
                    comparison = a.type.localeCompare(b.type);
                    break;
                case 'visibility':
                    comparison = (a.visibility || 'private').localeCompare(b.visibility || 'private');
                    break;
                case 'createdAt':
                    comparison = (a.createdAt || '').localeCompare(b.createdAt || '');
                    break;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });
        
        return result;
    }, [connections, searchQuery, typeFilter, visibilityFilter, sortField, sortOrder]);

    // 페이지네이션
    const totalPages = Math.ceil(filteredConnections.length / itemsPerPage);
    const paginatedConnections = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredConnections.slice(start, start + itemsPerPage);
    }, [filteredConnections, currentPage, itemsPerPage]);
    
    // 페이지 변경 시 선택 초기화
    useEffect(() => {
        setSelectedIds(new Set());
    }, [currentPage]);

    const stats = useMemo(() => {
        const privateConns = connections.filter(c => c.visibility === 'private' || !c.visibility);
        const groupConns = connections.filter(c => c.visibility === 'group');
        const publicConns = connections.filter(c => c.visibility === 'public');
        
        const groupsWithConnections = new Set<string>();
        groupConns.forEach(c => c.sharedWithGroups?.forEach(g => groupsWithConnections.add(g)));
        
        // DB 타입별 분포
        const typeDistribution: Record<string, number> = {};
        connections.forEach(c => {
            const type = c.type.toLowerCase();
            typeDistribution[type] = (typeDistribution[type] || 0) + 1;
        });
        
        return { 
            total: connections.length, 
            private: privateConns.length, 
            group: groupConns.length, 
            public: publicConns.length,
            groupsWithConnections: groupsWithConnections.size,
            typeDistribution,
        };
    }, [connections]);

    const getGroupName = (groupId: string) => groups.find(g => g.id === groupId)?.name || groupId.slice(0, 8);
    
    const copyToClipboard = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };
    
    // 토스트 알림
    const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    }, []);
    
    // 벌크 선택
    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };
    
    const selectAll = () => {
        if (selectedIds.size === paginatedConnections.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(paginatedConnections.map(c => c.id)));
        }
    };
    
    // 연결 상태 확인
    const checkConnectionHealth = async (connId: string) => {
        setConnectionHealth(prev => ({ ...prev, [connId]: 'checking' }));
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/connections/${connId}/test`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setConnectionHealth(prev => ({ ...prev, [connId]: res.ok ? 'online' : 'offline' }));
            showToast(res.ok ? '연결 성공!' : '연결 실패', res.ok ? 'success' : 'error');
        } catch {
            setConnectionHealth(prev => ({ ...prev, [connId]: 'offline' }));
            showToast('연결 테스트 실패', 'error');
        }
    };
    
    // 키보드 단축키
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            
            switch (e.key.toLowerCase()) {
                case 'r':
                    e.preventDefault();
                    fetchData();
                    showToast('새로고침 완료', 'success');
                    break;
                case 'e':
                    e.preventDefault();
                    exportToCSV();
                    showToast('CSV 내보내기 완료', 'success');
                    break;
                case '/':
                    e.preventDefault();
                    searchInputRef.current?.focus();
                    break;
                case '1':
                    setActiveTab('overview');
                    break;
                case '2':
                    setActiveTab('groups');
                    break;
                case '3':
                    setActiveTab('matrix');
                    break;
                case 'escape':
                    setSelectedIds(new Set());
                    setSearchQuery('');
                    break;
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [fetchData, showToast]);
    
    const exportToCSV = () => {
        const headers = ['이름', '타입', '호스트', '데이터베이스', '가시성', '공유 그룹'];
        const rows = filteredConnections.map(c => [
            c.name,
            c.type,
            c.host,
            c.database,
            c.visibility || 'private',
            c.sharedWithGroups?.map(g => getGroupName(g)).join(', ') || ''
        ]);
        
        const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `connections_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    };
    
    const getVisibilityBadge = (visibility?: string) => {
        const config = {
            private: { label: '비공개', color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.15)' },
            group: { label: '그룹', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
            public: { label: '공개', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
        };
        const c = config[visibility as keyof typeof config] || config.private;
        return (
            <span style={{
                padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                background: c.bg, color: c.color, border: `1px solid ${c.color}30`
            }}>
                {c.label}
            </span>
        );
    };

    if (loading) {
        return (
            <div style={{ padding: '32px', background: '#0f0a1f', minHeight: '100vh' }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                    <div style={{
                        width: '48px', height: '48px', border: '3px solid rgba(99, 102, 241, 0.2)',
                        borderTopColor: '#6366f1', borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                    }} />
                    <p style={{ color: '#94a3b8', marginTop: '16px' }}>데이터를 불러오는 중...</p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '32px', background: '#0f0a1f', minHeight: '100vh' }}>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
                @keyframes slideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
                @keyframes slideInRight { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
                @keyframes slideOut { from { opacity: 1; } to { opacity: 0; transform: translateX(100%); } }
                .card-hover { transition: all 0.2s ease; }
                .card-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3); }
                .btn-hover { transition: all 0.15s ease; }
                .btn-hover:hover { filter: brightness(1.1); transform: scale(1.02); }
                .stat-card { animation: fadeIn 0.3s ease forwards; }
                .connection-row { animation: slideIn 0.3s ease forwards; }
                .tab-btn { transition: all 0.2s ease; border: none; cursor: pointer; }
                .tab-btn:hover { background: rgba(99, 102, 241, 0.15); }
                .tab-btn.active { background: rgba(99, 102, 241, 0.2); color: #a5b4fc; }
                .toast { animation: slideInRight 0.3s ease; }
                .checkbox { appearance: none; width: 18px; height: 18px; border: 2px solid #4b5563; border-radius: 4px; cursor: pointer; transition: all 0.2s; }
                .checkbox:checked { background: #6366f1; border-color: #6366f1; }
                .checkbox:checked::after { content: '✓'; color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; }
            `}</style>
            
            {/* 토스트 알림 */}
            <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {toasts.map(toast => (
                    <div key={toast.id} className="toast" style={{
                        padding: '12px 20px', borderRadius: '8px',
                        background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 
                                   toast.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(99, 102, 241, 0.95)',
                        color: 'white', fontSize: '13px', fontWeight: 500,
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
                        display: 'flex', alignItems: 'center', gap: '8px'
                    }}>
                        {toast.type === 'success' && '✓'}
                        {toast.type === 'error' && '✕'}
                        {toast.type === 'info' && 'ℹ'}
                        {toast.message}
                    </div>
                ))}
            </div>
            
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '28px' }}>🔌</span>
                            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>연결 공유 현황</h1>
                            {autoRefresh && (
                                <span style={{
                                    padding: '4px 10px', borderRadius: '12px', fontSize: '11px',
                                    background: 'rgba(16, 185, 129, 0.15)', color: '#10b981',
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    animation: 'pulse 2s infinite'
                                }}>
                                    ● 실시간 ({refreshCountdown}s)
                                </span>
                            )}
                        </div>
                        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
                            모든 데이터베이스 연결의 공유 상태를 한눈에 확인하세요
                            {lastUpdated && (
                                <span style={{ marginLeft: '12px', fontSize: '12px', color: '#475569' }}>
                                    마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}
                                </span>
                            )}
                        </p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {/* 자동 새로고침 토글 */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '8px 14px', borderRadius: '8px',
                            background: 'rgba(30, 27, 75, 0.5)', border: '1px solid rgba(99, 102, 241, 0.2)'
                        }}>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>자동 새로고침</span>
                            <button
                                onClick={() => setAutoRefresh(!autoRefresh)}
                                style={{
                                    width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer',
                                    background: autoRefresh ? '#10b981' : 'rgba(100, 116, 139, 0.3)',
                                    position: 'relative', transition: 'background 0.2s'
                                }}
                            >
                                <span style={{
                                    position: 'absolute', top: '2px',
                                    left: autoRefresh ? '20px' : '2px',
                                    width: '18px', height: '18px', borderRadius: '50%',
                                    background: 'white', transition: 'left 0.2s'
                                }} />
                            </button>
                            {autoRefresh && (
                                <select
                                    value={refreshInterval}
                                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                                    style={{
                                        background: 'transparent', border: 'none', color: '#10b981',
                                        fontSize: '11px', cursor: 'pointer', outline: 'none'
                                    }}
                                >
                                    <option value={10}>10초</option>
                                    <option value={30}>30초</option>
                                    <option value={60}>1분</option>
                                </select>
                            )}
                        </div>
                        
                        {/* 수동 새로고침 */}
                        <button
                            onClick={() => fetchData()}
                            className="btn-hover"
                            style={{
                                padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc',
                                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px'
                            }}
                        >
                            🔄 새로고침
                        </button>
                        
                        {/* 내보내기 */}
                        <button
                            onClick={exportToCSV}
                            className="btn-hover"
                            style={{
                                padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                background: 'rgba(16, 185, 129, 0.15)', color: '#34d399',
                                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px'
                            }}
                        >
                            📥 CSV 내보내기
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                    {[
                        { label: '전체 연결', value: stats.total, icon: '📊', color: '#6366f1', trend: '+3' },
                        { label: '비공개', value: stats.private, icon: '🔒', color: '#a78bfa' },
                        { label: '그룹 공유', value: stats.group, icon: '👥', color: '#10b981' },
                        { label: '전체 공개', value: stats.public, icon: '🌐', color: '#f59e0b', alert: stats.public > 5 },
                        { label: '연결된 그룹', value: stats.groupsWithConnections, icon: '🏢', color: '#ec4899' },
                    ].map((stat, idx) => (
                        <div key={stat.label} className="card-hover stat-card" style={{
                            padding: '20px',
                            background: `linear-gradient(135deg, ${stat.color}15, ${stat.color}08)`,
                            borderRadius: '12px',
                            border: `1px solid ${stat.color}30`,
                            cursor: 'pointer',
                            animationDelay: `${idx * 0.05}s`,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ fontSize: '12px', color: '#94a3b8' }}>{stat.icon} {stat.label}</div>
                                {stat.alert && <span style={{ fontSize: '10px', color: '#f59e0b' }}>⚠️</span>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
                                <span style={{ fontSize: '32px', fontWeight: 700, color: stat.color }}>{stat.value}</span>
                                {stat.trend && (
                                    <span style={{ fontSize: '11px', color: '#10b981' }}>↑ {stat.trend}</span>
                                )}
                            </div>
                            {/* 미니 진행바 */}
                            <div style={{
                                marginTop: '10px', height: '4px', borderRadius: '2px',
                                background: 'rgba(255, 255, 255, 0.1)'
                            }}>
                                <div style={{
                                    height: '100%', borderRadius: '2px',
                                    background: stat.color,
                                    width: stats.total > 0 ? `${(stat.value / stats.total) * 100}%` : '0%',
                                    transition: 'width 0.5s ease'
                                }} />
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* DB 타입 분포 */}
                {Object.keys(stats.typeDistribution).length > 0 && (
                    <div style={{
                        marginBottom: '24px', padding: '16px 20px', borderRadius: '12px',
                        background: 'rgba(30, 27, 75, 0.5)', border: '1px solid rgba(99, 102, 241, 0.2)'
                    }}>
                        <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>📊 데이터베이스 타입 분포</div>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                            {Object.entries(stats.typeDistribution).map(([type, count]) => (
                                <div key={type} style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '6px 12px', borderRadius: '8px',
                                    background: `${dbIcons[type]?.color || '#6366f1'}20`,
                                    border: `1px solid ${dbIcons[type]?.color || '#6366f1'}30`
                                }}>
                                    <span>{dbIcons[type]?.icon || '🗄️'}</span>
                                    <span style={{ fontSize: '12px', color: '#e2e8f0', textTransform: 'capitalize' }}>{type}</span>
                                    <span style={{
                                        padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                                        background: `${dbIcons[type]?.color || '#6366f1'}40`,
                                        color: dbIcons[type]?.color || '#a5b4fc'
                                    }}>
                                        {count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* 탭 네비게이션 */}
                <div style={{
                    marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'rgba(30, 27, 75, 0.5)', borderRadius: '12px', padding: '6px',
                    border: '1px solid rgba(99, 102, 241, 0.2)'
                }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        {[
                            { id: 'overview' as const, label: '📋 개요', shortcut: '1' },
                            { id: 'groups' as const, label: '🏢 그룹별', shortcut: '2' },
                            { id: 'matrix' as const, label: '🔐 매트릭스', shortcut: '3' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                                style={{
                                    padding: '10px 20px', borderRadius: '8px',
                                    background: activeTab === tab.id ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                                    color: activeTab === tab.id ? '#a5b4fc' : '#94a3b8',
                                    fontSize: '13px', fontWeight: 500,
                                    display: 'flex', alignItems: 'center', gap: '8px'
                                }}
                            >
                                {tab.label}
                                <kbd style={{
                                    padding: '2px 5px', borderRadius: '3px', fontSize: '9px',
                                    background: 'rgba(100, 116, 139, 0.2)', color: '#64748b'
                                }}>{tab.shortcut}</kbd>
                            </button>
                        ))}
                    </div>
                    
                    {/* 뷰 모드 토글 & 선택 정보 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {selectedIds.size > 0 && (
                            <div style={{
                                padding: '6px 12px', borderRadius: '6px',
                                background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc',
                                fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px'
                            }}>
                                <span>{selectedIds.size}개 선택됨</span>
                                <button
                                    onClick={() => setSelectedIds(new Set())}
                                    style={{
                                        background: 'none', border: 'none', color: '#64748b',
                                        cursor: 'pointer', fontSize: '12px', padding: '0 4px'
                                    }}
                                >✕</button>
                            </div>
                        )}
                        
                        <div style={{
                            display: 'flex', borderRadius: '6px', overflow: 'hidden',
                            border: '1px solid rgba(100, 116, 139, 0.3)'
                        }}>
                            <button
                                onClick={() => setViewMode('table')}
                                style={{
                                    padding: '8px 12px', border: 'none', cursor: 'pointer',
                                    background: viewMode === 'table' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                                    color: viewMode === 'table' ? '#a5b4fc' : '#64748b',
                                    fontSize: '14px'
                                }}
                            >☰</button>
                            <button
                                onClick={() => setViewMode('card')}
                                style={{
                                    padding: '8px 12px', border: 'none', cursor: 'pointer',
                                    background: viewMode === 'card' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                                    color: viewMode === 'card' ? '#a5b4fc' : '#64748b',
                                    fontSize: '14px'
                                }}
                            >⊞</button>
                        </div>
                    </div>
                </div>
                
                {/* 검색 및 필터 */}
                <div style={{
                    marginBottom: '20px', padding: '16px 20px', borderRadius: '12px',
                    background: 'rgba(30, 27, 75, 0.5)', border: '1px solid rgba(99, 102, 241, 0.2)',
                    display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center'
                }}>
                    {/* 검색 */}
                    <div style={{ position: 'relative', flex: '1 1 250px' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>🔍</span>
                        <input
                            type="text"
                            placeholder="이름, 호스트, 데이터베이스 검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%', padding: '10px 12px 10px 38px', borderRadius: '8px',
                                background: 'rgba(15, 10, 31, 0.5)', border: '1px solid rgba(100, 116, 139, 0.3)',
                                color: '#e2e8f0', fontSize: '13px', outline: 'none'
                            }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                style={{
                                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '14px'
                                }}
                            >✕</button>
                        )}
                    </div>
                    
                    {/* 타입 필터 */}
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        style={{
                            padding: '10px 14px', borderRadius: '8px',
                            background: 'rgba(15, 10, 31, 0.5)', border: '1px solid rgba(100, 116, 139, 0.3)',
                            color: '#e2e8f0', fontSize: '13px', cursor: 'pointer', outline: 'none'
                        }}
                    >
                        <option value="all">모든 타입</option>
                        {dbTypes.map(type => (
                            <option key={type} value={type}>{dbIcons[type]?.icon || '🗄️'} {type}</option>
                        ))}
                    </select>
                    
                    {/* 가시성 필터 */}
                    <select
                        value={visibilityFilter}
                        onChange={(e) => setVisibilityFilter(e.target.value as VisibilityFilter)}
                        style={{
                            padding: '10px 14px', borderRadius: '8px',
                            background: 'rgba(15, 10, 31, 0.5)', border: '1px solid rgba(100, 116, 139, 0.3)',
                            color: '#e2e8f0', fontSize: '13px', cursor: 'pointer', outline: 'none'
                        }}
                    >
                        <option value="all">모든 가시성</option>
                        <option value="private">🔒 비공개</option>
                        <option value="group">👥 그룹 공유</option>
                        <option value="public">🌐 전체 공개</option>
                    </select>
                    
                    {/* 정렬 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <select
                            value={sortField}
                            onChange={(e) => setSortField(e.target.value as SortField)}
                            style={{
                                padding: '10px 14px', borderRadius: '8px 0 0 8px',
                                background: 'rgba(15, 10, 31, 0.5)', border: '1px solid rgba(100, 116, 139, 0.3)',
                                borderRight: 'none', color: '#e2e8f0', fontSize: '13px', cursor: 'pointer', outline: 'none'
                            }}
                        >
                            <option value="name">이름순</option>
                            <option value="type">타입순</option>
                            <option value="visibility">가시성순</option>
                            <option value="createdAt">생성일순</option>
                        </select>
                        <button
                            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                            style={{
                                padding: '10px 14px', borderRadius: '0 8px 8px 0',
                                background: 'rgba(15, 10, 31, 0.5)', border: '1px solid rgba(100, 116, 139, 0.3)',
                                color: '#e2e8f0', cursor: 'pointer', fontSize: '14px'
                            }}
                        >
                            {sortOrder === 'asc' ? '↑' : '↓'}
                        </button>
                    </div>
                    
                    {/* 결과 카운트 */}
                    <span style={{ fontSize: '12px', color: '#64748b', marginLeft: 'auto' }}>
                        {filteredConnections.length}개 결과
                    </span>
                </div>
                
                {/* 탭 콘텐츠 */}
                {activeTab === 'overview' && (
                    <>
                        {/* 연결 테이블 */}
                        <div style={{ 
                            background: 'rgba(30, 27, 75, 0.5)', borderRadius: '16px', 
                            border: '1px solid rgba(99, 102, 241, 0.2)', overflow: 'hidden', marginBottom: '20px'
                        }}>
                            <div style={{ 
                                padding: '16px 20px', borderBottom: '1px solid rgba(99, 102, 241, 0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                            }}>
                                <h3 style={{ color: '#e2e8f0', fontSize: '15px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    🔌 전체 연결 목록
                                </h3>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>
                                    {filteredConnections.length}개 연결
                                </span>
                            </div>
                            
                            {filteredConnections.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>🔍</span>
                                    <p style={{ color: '#64748b', margin: 0 }}>
                                        {searchQuery || typeFilter !== 'all' || visibilityFilter !== 'all' 
                                            ? '검색 결과가 없습니다' 
                                            : '등록된 연결이 없습니다'}
                                    </p>
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(99, 102, 241, 0.08)' }}>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>연결 정보</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>호스트 / 데이터베이스</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>가시성</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>공유 그룹</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>작업</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredConnections.map((conn, idx) => (
                                                <tr 
                                                    key={conn.id} 
                                                    className="connection-row"
                                                    style={{ 
                                                        borderBottom: '1px solid rgba(100, 116, 139, 0.1)',
                                                        animationDelay: `${idx * 0.03}s`,
                                                        transition: 'background 0.15s'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <td style={{ padding: '14px 16px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <div style={{
                                                                width: '36px', height: '36px', borderRadius: '8px',
                                                                background: `${dbIcons[conn.type.toLowerCase()]?.color || '#6366f1'}20`,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontSize: '18px'
                                                            }}>
                                                                {dbIcons[conn.type.toLowerCase()]?.icon || '🗄️'}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '13px' }}>{conn.name}</div>
                                                                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'capitalize' }}>{conn.type}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '14px 16px' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span style={{ fontSize: '11px', color: '#64748b' }}>🖥️</span>
                                                                <span style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>{conn.host}</span>
                                                                <button
                                                                    onClick={() => copyToClipboard(conn.host, `host-${conn.id}`)}
                                                                    style={{
                                                                        background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                                                                        color: copiedId === `host-${conn.id}` ? '#10b981' : '#64748b',
                                                                        fontSize: '10px'
                                                                    }}
                                                                    title="호스트 복사"
                                                                >
                                                                    {copiedId === `host-${conn.id}` ? '✓' : '📋'}
                                                                </button>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span style={{ fontSize: '11px', color: '#64748b' }}>📂</span>
                                                                <span style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>{conn.database}</span>
                                                                <button
                                                                    onClick={() => copyToClipboard(conn.database, `db-${conn.id}`)}
                                                                    style={{
                                                                        background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                                                                        color: copiedId === `db-${conn.id}` ? '#10b981' : '#64748b',
                                                                        fontSize: '10px'
                                                                    }}
                                                                    title="데이터베이스 복사"
                                                                >
                                                                    {copiedId === `db-${conn.id}` ? '✓' : '📋'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                        {getVisibilityBadge(conn.visibility)}
                                                    </td>
                                                    <td style={{ padding: '14px 16px' }}>
                                                        {conn.visibility === 'group' && conn.sharedWithGroups?.length ? (
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                                {conn.sharedWithGroups.slice(0, 2).map(gid => (
                                                                    <span key={gid} style={{
                                                                        padding: '3px 8px', borderRadius: '4px', fontSize: '10px',
                                                                        background: 'rgba(16, 185, 129, 0.15)', color: '#34d399',
                                                                    }}>
                                                                        {getGroupName(gid)}
                                                                    </span>
                                                                ))}
                                                                {conn.sharedWithGroups.length > 2 && (
                                                                    <span style={{ fontSize: '10px', color: '#64748b' }}>
                                                                        +{conn.sharedWithGroups.length - 2}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span style={{ fontSize: '11px', color: '#475569' }}>-</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                                                            <Link
                                                                href={`/connections/${conn.id}`}
                                                                className="btn-hover"
                                                                style={{
                                                                    padding: '6px 10px', borderRadius: '6px', fontSize: '11px',
                                                                    background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc',
                                                                    textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px'
                                                                }}
                                                            >
                                                                👁️ 보기
                                                            </Link>
                                                            <Link
                                                                href={`/connections/${conn.id}/edit`}
                                                                className="btn-hover"
                                                                style={{
                                                                    padding: '6px 10px', borderRadius: '6px', fontSize: '11px',
                                                                    background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24',
                                                                    textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px'
                                                                }}
                                                            >
                                                                ✏️ 편집
                                                            </Link>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        
                        {/* 가시성별 요약 */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            {/* 그룹 공유 연결 */}
                            <div className="card-hover" style={{ background: 'rgba(30, 27, 75, 0.5)', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '20px' }}>
                                <h3 style={{ color: '#10b981', fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    👥 그룹 공유 연결 ({stats.group})
                                </h3>
                                {connections.filter(c => c.visibility === 'group').length === 0 ? (
                                    <p style={{ color: '#64748b', fontSize: '13px' }}>그룹 공유된 연결이 없습니다</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                                        {connections.filter(c => c.visibility === 'group').map(conn => (
                                            <div key={conn.id} className="card-hover" style={{
                                                padding: '14px 16px', borderRadius: '10px',
                                                background: 'rgba(16, 185, 129, 0.08)',
                                                border: '1px solid rgba(16, 185, 129, 0.15)',
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                                    <span style={{ fontSize: '18px' }}>{dbIcons[conn.type.toLowerCase()]?.icon || '🗄️'}</span>
                                                    <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '14px' }}>{conn.name}</span>
                                                    <span style={{ fontSize: '11px', color: '#64748b' }}>{conn.type}</span>
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                    {conn.sharedWithGroups?.map(gid => (
                                                        <span key={gid} style={{
                                                            padding: '4px 10px', borderRadius: '6px', fontSize: '11px',
                                                            background: 'rgba(16, 185, 129, 0.2)', color: '#34d399',
                                                        }}>
                                                            {getGroupName(gid)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 전체 공개 연결 */}
                            <div className="card-hover" style={{ background: 'rgba(30, 27, 75, 0.5)', borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '20px' }}>
                                <h3 style={{ color: '#f59e0b', fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    🌐 전체 공개 연결 ({stats.public})
                                    {stats.public > 0 && (
                                        <span style={{ fontSize: '10px', background: 'rgba(245, 158, 11, 0.2)', padding: '2px 6px', borderRadius: '4px' }}>
                                            ⚠️ 주의
                                        </span>
                                    )}
                                </h3>
                                {connections.filter(c => c.visibility === 'public').length === 0 ? (
                                    <p style={{ color: '#64748b', fontSize: '13px' }}>전체 공개된 연결이 없습니다</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                                        {connections.filter(c => c.visibility === 'public').map(conn => (
                                            <div key={conn.id} className="card-hover" style={{
                                                padding: '14px 16px', borderRadius: '10px',
                                                background: 'rgba(245, 158, 11, 0.08)',
                                                border: '1px solid rgba(245, 158, 11, 0.15)',
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{ fontSize: '18px' }}>{dbIcons[conn.type.toLowerCase()]?.icon || '🗄️'}</span>
                                                    <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '14px' }}>{conn.name}</span>
                                                    <span style={{ fontSize: '11px', color: '#64748b' }}>{conn.type}</span>
                                                    <span style={{ marginLeft: 'auto', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>
                                                        모든 사용자 접근 가능
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
                
                {activeTab === 'groups' && (
                    <div style={{ background: 'rgba(30, 27, 75, 0.5)', borderRadius: '16px', border: '1px solid rgba(139, 92, 246, 0.2)', padding: '20px' }}>
                        <h3 style={{ color: '#a78bfa', fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            🏢 그룹별 연결 현황
                        </h3>
                        {groups.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center' }}>
                                <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>🏢</span>
                                <p style={{ color: '#64748b', margin: 0 }}>등록된 그룹이 없습니다</p>
                                <Link href="/admin/groups" style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                    marginTop: '12px', padding: '8px 16px', borderRadius: '8px',
                                    background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa',
                                    textDecoration: 'none', fontSize: '13px'
                                }}>
                                    ➕ 그룹 생성하기
                                </Link>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                                {groups.map((group, idx) => {
                                    const groupConnections = connections.filter(c => 
                                        c.visibility === 'group' && c.sharedWithGroups?.includes(group.id)
                                    );
                                    const publicConnections = connections.filter(c => c.visibility === 'public');
                                    const totalAccessible = groupConnections.length + publicConnections.length;
                                    
                                    return (
                                        <div 
                                            key={group.id} 
                                            className="card-hover connection-row"
                                            style={{
                                                padding: '20px', borderRadius: '12px',
                                                background: 'rgba(139, 92, 246, 0.08)',
                                                border: '1px solid rgba(139, 92, 246, 0.15)',
                                                animationDelay: `${idx * 0.05}s`
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{
                                                        width: '40px', height: '40px', borderRadius: '10px',
                                                        background: 'rgba(139, 92, 246, 0.2)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '20px'
                                                    }}>
                                                        {group.type === 'organization' ? '🏢' : group.type === 'project' ? '📁' : '📋'}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '14px' }}>{group.name}</div>
                                                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'capitalize' }}>{group.type}</div>
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{
                                                        padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                                                        background: totalAccessible > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                                                        color: totalAccessible > 0 ? '#34d399' : '#94a3b8',
                                                    }}>
                                                        {totalAccessible}개
                                                    </div>
                                                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>접근 가능</div>
                                                </div>
                                            </div>
                                            
                                            {/* 접근 가능 연결 미리보기 */}
                                            {totalAccessible > 0 ? (
                                                <div>
                                                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>접근 가능 연결:</div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                        {[...groupConnections, ...publicConnections].slice(0, 4).map(conn => (
                                                            <span key={conn.id} style={{
                                                                padding: '4px 10px', borderRadius: '6px', fontSize: '10px',
                                                                background: conn.visibility === 'public' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                                                                color: conn.visibility === 'public' ? '#fbbf24' : '#a5b4fc',
                                                                display: 'flex', alignItems: 'center', gap: '4px',
                                                            }}>
                                                                {dbIcons[conn.type.toLowerCase()]?.icon || '🗄️'} {conn.name}
                                                                {conn.visibility === 'public' && <span style={{ opacity: 0.7 }}>🌐</span>}
                                                            </span>
                                                        ))}
                                                        {totalAccessible > 4 && (
                                                            <span style={{ padding: '4px 8px', fontSize: '10px', color: '#64748b' }}>
                                                                +{totalAccessible - 4} 더
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ 
                                                    padding: '12px', borderRadius: '8px', 
                                                    background: 'rgba(100, 116, 139, 0.1)',
                                                    textAlign: 'center'
                                                }}>
                                                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                                                        이 그룹에 공유된 연결이 없습니다
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'matrix' && (
                    <div style={{ background: 'rgba(30, 27, 75, 0.5)', borderRadius: '16px', border: '1px solid rgba(236, 72, 153, 0.2)', padding: '20px' }}>
                        <h3 style={{ color: '#ec4899', fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            🔐 접근 매트릭스
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 400 }}>그룹 × 연결 접근 권한</span>
                        </h3>
                        
                        {groups.length === 0 || connections.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center' }}>
                                <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>🔐</span>
                                <p style={{ color: '#64748b', margin: 0 }}>
                                    {groups.length === 0 ? '그룹이 없습니다' : '연결이 없습니다'}
                                </p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(236, 72, 153, 0.08)' }}>
                                            <th style={{ 
                                                padding: '12px 16px', textAlign: 'left', fontSize: '11px', 
                                                color: '#94a3b8', fontWeight: 600, 
                                                position: 'sticky', left: 0, background: 'rgba(30, 27, 75, 0.95)',
                                                borderRight: '1px solid rgba(100, 116, 139, 0.2)'
                                            }}>
                                                그룹
                                            </th>
                                            {connections.slice(0, 8).map(conn => (
                                                <th key={conn.id} style={{ 
                                                    padding: '12px 8px', textAlign: 'center', fontSize: '10px', 
                                                    color: '#94a3b8', fontWeight: 500, maxWidth: '100px'
                                                }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                        <span style={{ fontSize: '14px' }}>{dbIcons[conn.type.toLowerCase()]?.icon || '🗄️'}</span>
                                                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }}>
                                                            {conn.name}
                                                        </span>
                                                    </div>
                                                </th>
                                            ))}
                                            {connections.length > 8 && (
                                                <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '10px', color: '#64748b' }}>
                                                    +{connections.length - 8} 더
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groups.map((group, idx) => (
                                            <tr 
                                                key={group.id}
                                                style={{ 
                                                    borderBottom: '1px solid rgba(100, 116, 139, 0.1)',
                                                    transition: 'background 0.15s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(236, 72, 153, 0.05)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <td style={{ 
                                                    padding: '12px 16px', fontSize: '12px', color: '#e2e8f0',
                                                    position: 'sticky', left: 0, background: 'rgba(30, 27, 75, 0.95)',
                                                    borderRight: '1px solid rgba(100, 116, 139, 0.2)'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span>{group.type === 'organization' ? '🏢' : group.type === 'project' ? '📁' : '📋'}</span>
                                                        <span>{group.name}</span>
                                                    </div>
                                                </td>
                                                {connections.slice(0, 8).map(conn => {
                                                    const hasAccess = conn.visibility === 'public' || 
                                                        (conn.visibility === 'group' && conn.sharedWithGroups?.includes(group.id));
                                                    const isPublic = conn.visibility === 'public';
                                                    
                                                    return (
                                                        <td key={conn.id} style={{ padding: '12px 8px', textAlign: 'center' }}>
                                                            {hasAccess ? (
                                                                <span style={{
                                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                                    width: '28px', height: '28px', borderRadius: '6px',
                                                                    background: isPublic ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                                                    color: isPublic ? '#fbbf24' : '#34d399',
                                                                    fontSize: '12px'
                                                                }}>
                                                                    {isPublic ? '🌐' : '✓'}
                                                                </span>
                                                            ) : (
                                                                <span style={{
                                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                                    width: '28px', height: '28px', borderRadius: '6px',
                                                                    background: 'rgba(100, 116, 139, 0.1)',
                                                                    color: '#475569',
                                                                    fontSize: '12px'
                                                                }}>
                                                                    ✕
                                                                </span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                {connections.length > 8 && <td />}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                
                                {/* 범례 */}
                                <div style={{ marginTop: '16px', display: 'flex', gap: '20px', justifyContent: 'flex-end' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8' }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                            width: '20px', height: '20px', borderRadius: '4px',
                                            background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontSize: '10px'
                                        }}>✓</span>
                                        그룹 공유
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8' }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                            width: '20px', height: '20px', borderRadius: '4px',
                                            background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', fontSize: '10px'
                                        }}>🌐</span>
                                        전체 공개
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8' }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                            width: '20px', height: '20px', borderRadius: '4px',
                                            background: 'rgba(100, 116, 139, 0.1)', color: '#475569', fontSize: '10px'
                                        }}>✕</span>
                                        접근 불가
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Quick Actions */}
                <div style={{ marginTop: '28px', padding: '20px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.08))', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <h4 style={{ color: '#e2e8f0', fontSize: '14px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                ⚡ 빠른 작업
                            </h4>
                            <p style={{ color: '#64748b', fontSize: '12px', margin: '4px 0 0 0' }}>연결 및 그룹 관리 바로가기</p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <Link href="/connections/create" className="btn-hover" style={{
                                padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', color: 'white',
                                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px',
                                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)'
                            }}>
                                ➕ 새 연결
                            </Link>
                            <Link href="/admin/groups" className="btn-hover" style={{
                                padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                                background: 'rgba(16, 185, 129, 0.15)', color: '#34d399',
                                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                            }}>
                                👥 그룹 관리
                            </Link>
                            <Link href="/connections" className="btn-hover" style={{
                                padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                                background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc',
                                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                            }}>
                                🔌 연결 목록
                            </Link>
                            <Link href="/admin/security" className="btn-hover" style={{
                                padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                                background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6',
                                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px',
                                border: '1px solid rgba(236, 72, 153, 0.3)',
                            }}>
                                🔐 보안 설정
                            </Link>
                        </div>
                    </div>
                </div>
                
                {/* 키보드 단축키 안내 */}
                <div style={{ 
                    marginTop: '16px', padding: '12px 16px', borderRadius: '8px',
                    background: 'rgba(30, 27, 75, 0.3)', border: '1px solid rgba(100, 116, 139, 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px'
                }}>
                    {[
                        { key: 'R', action: '새로고침' },
                        { key: 'E', action: 'CSV 내보내기' },
                        { key: '/', action: '검색' },
                    ].map(shortcut => (
                        <div key={shortcut.key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <kbd style={{
                                padding: '2px 6px', borderRadius: '4px', fontSize: '10px',
                                background: 'rgba(100, 116, 139, 0.2)', color: '#94a3b8',
                                border: '1px solid rgba(100, 116, 139, 0.3)'
                            }}>
                                {shortcut.key}
                            </kbd>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>{shortcut.action}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
