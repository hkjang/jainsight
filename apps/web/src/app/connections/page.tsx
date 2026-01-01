'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FavoriteIcon } from '../../components/FavoriteButton';

interface Connection {
    id: string;
    name: string;
    type: string;
    host: string;
    port: number;
    database: string;
    createdAt: string;
    lastUsedAt?: string;
    visibility?: 'private' | 'team' | 'group' | 'public';
    createdBy?: string;
    isOwner?: boolean;
    sharedWithGroups?: string[];
}

interface ConnectionStatus {
    [id: string]: 'online' | 'offline' | 'testing' | 'unknown';
}

const dbIcons: Record<string, { icon: string; color: string; gradient: string }> = {
    postgresql: { icon: '🐘', color: '#336791', gradient: 'linear-gradient(135deg, #336791, #4A90A4)' },
    mysql: { icon: '🐬', color: '#00758f', gradient: 'linear-gradient(135deg, #00758f, #f29111)' },
    mssql: { icon: '🔷', color: '#CC2927', gradient: 'linear-gradient(135deg, #CC2927, #5C2D91)' },
    oracle: { icon: '🔶', color: '#F80000', gradient: 'linear-gradient(135deg, #F80000, #FF6B6B)' },
    mariadb: { icon: '🦭', color: '#003545', gradient: 'linear-gradient(135deg, #003545, #00728C)' },
    sqlite: { icon: '📁', color: '#003B57', gradient: 'linear-gradient(135deg, #003B57, #0F5298)' },
};

const DB_TYPES = ['postgresql', 'mysql', 'mssql', 'oracle', 'mariadb', 'sqlite'];

export default function ConnectionsPage() {
    const [connections, setConnections] = useState<Connection[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({});
    const [refreshing, setRefreshing] = useState(false);
    const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
    const [editForm, setEditForm] = useState({ name: '', host: '', port: 0, database: '', username: '', password: '', visibility: 'private' as 'private' | 'team' | 'group' | 'public', sharedWithGroups: [] as string[] });
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);
    const [groups, setGroups] = useState<{id: string; name: string}[]>([]);
    const router = useRouter();

    const fetchConnections = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        try {
            const res = await fetch('/api/connections', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setConnections(data);
                // Initialize all as unknown status
                const initialStatus: ConnectionStatus = {};
                data.forEach((c: Connection) => { initialStatus[c.id] = 'unknown'; });
                setConnectionStatus(initialStatus);
            }
        } catch {
            setConnections([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [router]);

    useEffect(() => {
        fetchConnections();
        // Fetch groups for visibility editing
        const fetchGroups = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            try {
                const res = await fetch('/api/groups', { headers: { 'Authorization': `Bearer ${token}` } });
                if (res.ok) setGroups(await res.json());
            } catch { /* ignore */ }
        };
        fetchGroups();
    }, [fetchConnections]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement) return;
            
            if (e.key === 'r' || e.key === 'R') {
                handleRefresh();
            } else if (e.key === 'n' || e.key === 'N') {
                router.push('/connections/create');
            } else if (e.key === '/') {
                e.preventDefault();
                document.getElementById('search-input')?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [router]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchConnections();
    };

    const handleTestAll = async () => {
        for (const conn of connections) {
            handleTestConnection(conn.id);
            await new Promise(r => setTimeout(r, 300));
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        const token = localStorage.getItem('token');
        try {
            await fetch(`/api/connections/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setConnections(prev => prev.filter(c => c.id !== id));
        } catch (e) {
            console.error('Delete failed', e);
        }
    };

    const handleTestConnection = async (id: string) => {
        setConnectionStatus(prev => ({ ...prev, [id]: 'testing' }));
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/connections/${id}/test`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setConnectionStatus(prev => ({ ...prev, [id]: res.ok ? 'online' : 'offline' }));
        } catch {
            setConnectionStatus(prev => ({ ...prev, [id]: 'offline' }));
        }
    };

    const handleDuplicate = async (conn: Connection) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/connections', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: `${conn.name} (복사본)`,
                    type: conn.type,
                    host: conn.host,
                    port: conn.port,
                    database: conn.database,
                })
            });
            if (res.ok) {
                fetchConnections();
            }
        } catch (e) {
            console.error('Duplicate failed', e);
        }
    };

    const handleEdit = (conn: Connection) => {
        setEditingConnection(conn);
        setEditForm({
            name: conn.name,
            host: conn.host,
            port: conn.port,
            database: conn.database,
            username: '',
            password: '',
            visibility: conn.visibility || 'private',
            sharedWithGroups: conn.sharedWithGroups || [],
        });
        setShowPassword(false);
    };

    const handleUpdate = async () => {
        if (!editingConnection) return;
        const token = localStorage.getItem('token');
        setSaving(true);
        try {
            const res = await fetch(`/api/connections/${editingConnection.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: editForm.name,
                    host: editForm.host,
                    port: editForm.port,
                    database: editForm.database,
                    visibility: editForm.visibility,
                    sharedWithGroups: editForm.visibility === 'group' ? editForm.sharedWithGroups : [],
                    ...(editForm.username && { username: editForm.username }),
                    ...(editForm.password && { password: editForm.password }),
                })
            });
            if (res.ok) {
                setEditingConnection(null);
                fetchConnections();
            } else {
                alert('연결 수정에 실패했습니다');
            }
        } catch (e) {
            console.error('Update failed', e);
            alert('연결 수정 중 오류가 발생했습니다');
        } finally {
            setSaving(false);
        }
    };

    const filteredConnections = useMemo(() => {
        return connections.filter(conn => {
            const matchesSearch = conn.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                conn.host.toLowerCase().includes(searchTerm.toLowerCase()) ||
                conn.database.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = !selectedType || conn.type.toLowerCase() === selectedType;
            return matchesSearch && matchesType;
        });
    }, [connections, searchTerm, selectedType]);

    // Group by type for stats
    const stats = useMemo(() => {
        const byType: Record<string, number> = {};
        connections.forEach(c => {
            const type = c.type.toLowerCase();
            byType[type] = (byType[type] || 0) + 1;
        });
        const online = Object.values(connectionStatus).filter(s => s === 'online').length;
        const offline = Object.values(connectionStatus).filter(s => s === 'offline').length;
        return { total: connections.length, byType, online, offline };
    }, [connections, connectionStatus]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return '#10b981';
            case 'offline': return '#ef4444';
            case 'testing': return '#f59e0b';
            default: return '#6b7280';
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
                {/* Header Skeleton */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <div>
                        <div style={{ width: '200px', height: '32px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px', marginBottom: '8px', animation: 'pulse 2s infinite' }} />
                        <div style={{ width: '300px', height: '16px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '4px', animation: 'pulse 2s infinite' }} />
                    </div>
                    <div style={{ width: '120px', height: '40px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '10px', animation: 'pulse 2s infinite' }} />
                </div>
                {/* Stats Skeleton */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} style={{ height: '80px', background: 'rgba(30, 27, 75, 0.5)', borderRadius: '12px', animation: 'pulse 2s infinite' }} />
                    ))}
                </div>
                {/* Cards Skeleton */}
                <div style={{ display: 'grid', gap: '16px' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{ height: '88px', background: 'rgba(30, 27, 75, 0.5)', borderRadius: '12px', animation: 'pulse 2s infinite' }} />
                    ))}
                </div>
                <style>{`
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: 700,
                        background: 'linear-gradient(90deg, #e0e7ff, #c7d2fe)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '6px',
                    }}>
                        데이터베이스 연결
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                        등록된 데이터베이스 연결을 관리합니다
                        <span style={{ marginLeft: '12px', fontSize: '12px', color: '#64748b' }}>
                            단축키: R 새로고침 · N 새 연결 · / 검색
                        </span>
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={handleTestAll}
                        disabled={connections.length === 0}
                        style={{
                            padding: '10px 16px',
                            background: 'rgba(251, 191, 36, 0.15)',
                            border: '1px solid rgba(251, 191, 36, 0.3)',
                            borderRadius: '10px',
                            color: '#fbbf24',
                            cursor: connections.length === 0 ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                        }}
                    >
                        🔌 전체 테스트
                    </button>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        style={{
                            padding: '10px 16px',
                            background: 'rgba(99, 102, 241, 0.15)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            borderRadius: '10px',
                            color: '#a5b4fc',
                            cursor: refreshing ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                        }}
                    >
                        <span style={{ display: 'inline-block', animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>🔄</span>
                        새로고침
                    </button>
                    <Link href="/connections/create" style={{
                        padding: '10px 20px',
                        background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                        borderRadius: '10px',
                        color: '#fff',
                        textDecoration: 'none',
                        fontSize: '14px',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                        transition: 'all 0.2s',
                    }}>
                        <span>+</span> 연결 추가
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            {connections.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    <div style={{
                        padding: '16px 20px',
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1))',
                        borderRadius: '12px',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                    }}>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>전체 연결</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#e2e8f0' }}>{stats.total}</div>
                    </div>
                    <div style={{
                        padding: '16px 20px',
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1))',
                        borderRadius: '12px',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                    }}>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>온라인</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>{stats.online}</div>
                    </div>
                    <div style={{
                        padding: '16px 20px',
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1))',
                        borderRadius: '12px',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                    }}>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>오프라인</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>{stats.offline}</div>
                    </div>
                    <div style={{
                        padding: '16px 20px',
                        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.1))',
                        borderRadius: '12px',
                        border: '1px solid rgba(251, 191, 36, 0.2)',
                    }}>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>타입 수</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#fbbf24' }}>{Object.keys(stats.byType).length}</div>
                    </div>
                </div>
            )}

            {/* Search & Filter */}
            {connections.length > 0 && (
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
                        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>🔍</span>
                        <input
                            id="search-input"
                            type="text"
                            placeholder="연결 검색... (이름, 호스트, DB)"
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
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => setSelectedType(null)}
                            style={{
                                padding: '10px 16px',
                                background: selectedType === null ? 'linear-gradient(90deg, #6366f1, #8b5cf6)' : 'rgba(30, 27, 75, 0.6)',
                                border: selectedType === null ? 'none' : '1px solid rgba(99, 102, 241, 0.2)',
                                borderRadius: '8px',
                                color: selectedType === null ? '#fff' : '#94a3b8',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 500,
                                transition: 'all 0.2s',
                            }}
                        >
                            전체
                        </button>
                        {DB_TYPES.filter(type => stats.byType[type]).map(type => (
                            <button
                                key={type}
                                onClick={() => setSelectedType(type === selectedType ? null : type)}
                                style={{
                                    padding: '10px 16px',
                                    background: selectedType === type ? dbIcons[type]?.gradient || 'linear-gradient(90deg, #6366f1, #8b5cf6)' : 'rgba(30, 27, 75, 0.6)',
                                    border: selectedType === type ? 'none' : '1px solid rgba(99, 102, 241, 0.2)',
                                    borderRadius: '8px',
                                    color: '#e2e8f0',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {dbIcons[type]?.icon || '🗄️'} {type.toUpperCase()}
                                <span style={{
                                    padding: '2px 6px',
                                    background: 'rgba(0,0,0,0.2)',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                }}>
                                    {stats.byType[type] || 0}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Content */}
            {connections.length === 0 ? (
                <div style={{
                    padding: '80px 40px',
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.6), rgba(49, 46, 129, 0.3))',
                    borderRadius: '20px',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                }}>
                    <div style={{ fontSize: '64px', marginBottom: '20px', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>🔗</div>
                    <h2 style={{ fontSize: '20px', color: '#e2e8f0', marginBottom: '8px' }}>연결이 아직 없습니다</h2>
                    <p style={{ color: '#94a3b8', marginBottom: '24px', lineHeight: 1.6 }}>
                        데이터베이스 연결을 추가하여 SQL 에디터를 사용해보세요.<br />
                        PostgreSQL, MySQL, MariaDB, Oracle, MSSQL 등을 지원합니다.
                    </p>
                    <Link href="/connections/create" style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '14px 28px',
                        background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                        borderRadius: '12px',
                        color: '#fff',
                        textDecoration: 'none',
                        fontSize: '15px',
                        fontWeight: 600,
                        boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
                        transition: 'all 0.3s',
                    }}>
                        <span style={{ fontSize: '18px' }}>✨</span>
                        첫 연결 추가하기
                    </Link>
                </div>
            ) : filteredConnections.length === 0 ? (
                <div style={{
                    padding: '60px',
                    textAlign: 'center',
                    background: 'rgba(30, 27, 75, 0.5)',
                    borderRadius: '16px',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                    <div style={{ color: '#94a3b8' }}>검색 결과가 없습니다</div>
                    <button
                        onClick={() => { setSearchTerm(''); setSelectedType(null); }}
                        style={{
                            marginTop: '16px',
                            padding: '10px 20px',
                            background: 'rgba(99, 102, 241, 0.15)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            borderRadius: '8px',
                            color: '#a5b4fc',
                            cursor: 'pointer',
                            fontSize: '14px',
                        }}
                    >
                        필터 초기화
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                    {filteredConnections.map((conn, idx) => {
                        const dbInfo = dbIcons[conn.type.toLowerCase()] || { icon: '🗄️', color: '#6366f1', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)' };
                        const status = connectionStatus[conn.id] || 'unknown';
                        
                        return (
                            <div
                                key={conn.id}
                                style={{
                                    padding: '20px',
                                    background: 'rgba(30, 27, 75, 0.5)',
                                    borderRadius: '14px',
                                    border: '1px solid rgba(99, 102, 241, 0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    animation: 'fadeSlideUp 0.4s ease-out forwards',
                                    animationDelay: `${idx * 0.05}s`,
                                    opacity: 0,
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(30, 27, 75, 0.7)';
                                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(30, 27, 75, 0.5)';
                                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.2)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                {/* Status Indicator */}
                                <div style={{
                                    position: 'absolute',
                                    top: '12px',
                                    right: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}>
                                    <div style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: getStatusColor(status),
                                        boxShadow: `0 0 8px ${getStatusColor(status)}`,
                                        animation: status === 'testing' ? 'pulse 1s infinite' : 'none',
                                    }} />
                                    <span style={{ fontSize: '11px', color: getStatusColor(status), textTransform: 'uppercase' }}>
                                        {status === 'online' ? '온라인' : status === 'offline' ? '오프라인' : status === 'testing' ? '테스트 중' : '미확인'}
                                    </span>
                                </div>

                                {/* DB Icon */}
                                <div style={{
                                    width: '52px',
                                    height: '52px',
                                    borderRadius: '12px',
                                    background: dbInfo.gradient,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '26px',
                                    boxShadow: `0 4px 12px ${dbInfo.color}40`,
                                    flexShrink: 0,
                                }}>
                                    {dbInfo.icon}
                                </div>

                                {/* Connection Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                        <FavoriteIcon itemType="connection" itemId={conn.id} name={conn.name} size={18} />
                                        <span style={{ fontSize: '17px', fontWeight: 600, color: '#e2e8f0' }}>{conn.name}</span>
                                        <span style={{
                                            padding: '3px 10px',
                                            borderRadius: '6px',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            background: `${dbInfo.color}20`,
                                            color: dbInfo.color,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                        }}>
                                            {conn.type}
                                        </span>
                                        {/* Visibility Badge */}
                                        {conn.visibility && (
                                            <span style={{
                                                padding: '3px 8px',
                                                borderRadius: '6px',
                                                fontSize: '10px',
                                                fontWeight: 500,
                                                background: conn.visibility === 'private' ? 'rgba(99, 102, 241, 0.15)' :
                                                    conn.visibility === 'group' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                                color: conn.visibility === 'private' ? '#a5b4fc' :
                                                    conn.visibility === 'group' ? '#34d399' : '#fbbf24',
                                            }}>
                                                {conn.visibility === 'private' ? '🔒 비공개' :
                                                    conn.visibility === 'group' ? '👥 그룹' : '🌐 공개'}
                                            </span>
                                        )}
                                        {/* Owner Badge */}
                                        {conn.isOwner && (
                                            <span style={{
                                                padding: '3px 8px',
                                                borderRadius: '6px',
                                                fontSize: '10px',
                                                fontWeight: 500,
                                                background: 'rgba(139, 92, 246, 0.15)',
                                                color: '#c4b5fd',
                                            }}>
                                                👤 내 연결
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span>🌐</span> {conn.host}:{conn.port}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span>📂</span> {conn.database}
                                        </span>
                                        {conn.createdAt && (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span>📅</span> {new Date(conn.createdAt).toLocaleDateString('ko-KR')}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <button
                                        onClick={() => handleTestConnection(conn.id)}
                                        disabled={status === 'testing'}
                                        title="연결 테스트"
                                        style={{
                                            padding: '8px 12px',
                                            background: 'rgba(251, 191, 36, 0.15)',
                                            border: '1px solid rgba(251, 191, 36, 0.3)',
                                            borderRadius: '8px',
                                            color: '#fbbf24',
                                            cursor: status === 'testing' ? 'not-allowed' : 'pointer',
                                            fontSize: '13px',
                                            fontWeight: 500,
                                            transition: 'all 0.2s',
                                            opacity: status === 'testing' ? 0.6 : 1,
                                        }}
                                    >
                                        {status === 'testing' ? '⏳' : '🔌'} 테스트
                                    </button>
                                    <Link href={`/editor?connectionId=${conn.id}`} style={{
                                        padding: '8px 14px',
                                        background: 'rgba(16, 185, 129, 0.15)',
                                        border: '1px solid rgba(16, 185, 129, 0.3)',
                                        borderRadius: '8px',
                                        color: '#10b981',
                                        textDecoration: 'none',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        transition: 'all 0.2s',
                                    }}>
                                        ⚡ 쿼리
                                    </Link>
                                    <Link href={`/schemas?connectionId=${conn.id}`} style={{
                                        padding: '8px 14px',
                                        background: 'rgba(99, 102, 241, 0.15)',
                                        border: '1px solid rgba(99, 102, 241, 0.3)',
                                        borderRadius: '8px',
                                        color: '#a5b4fc',
                                        textDecoration: 'none',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        transition: 'all 0.2s',
                                    }}>
                                        📊 스키마
                                    </Link>
                                    <button
                                        onClick={() => handleDuplicate(conn)}
                                        title="복제"
                                        style={{
                                            padding: '8px 12px',
                                            background: 'rgba(168, 85, 247, 0.15)',
                                            border: '1px solid rgba(168, 85, 247, 0.3)',
                                            borderRadius: '8px',
                                            color: '#a855f7',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: 500,
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        📋
                                    </button>
                                    <button
                                        onClick={() => handleEdit(conn)}
                                        title="수정"
                                        style={{
                                            padding: '8px 12px',
                                            background: 'rgba(59, 130, 246, 0.15)',
                                            border: '1px solid rgba(59, 130, 246, 0.3)',
                                            borderRadius: '8px',
                                            color: '#60a5fa',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: 500,
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={() => handleDelete(conn.id)}
                                        title="삭제"
                                        style={{
                                            padding: '8px 12px',
                                            background: 'rgba(239, 68, 68, 0.15)',
                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                            borderRadius: '8px',
                                            color: '#f87171',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: 500,
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Keyboard shortcuts hint */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.9); }
                }
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
                a:hover {
                    filter: brightness(1.1);
                }
            `}</style>

            {/* Edit Modal */}
            {editingConnection && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    animation: 'fadeIn 0.2s ease-out',
                }}
                onClick={() => setEditingConnection(null)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'linear-gradient(135deg, #1e1b4b, #0f172a)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            borderRadius: '20px',
                            padding: '28px',
                            width: '100%',
                            maxWidth: '500px',
                            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
                            animation: 'slideUp 0.3s ease-out',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                background: dbIcons[editingConnection.type.toLowerCase()]?.gradient || 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '24px',
                            }}>
                                {dbIcons[editingConnection.type.toLowerCase()]?.icon || '🗄️'}
                            </div>
                            <div>
                                <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#e2e8f0', margin: 0 }}>
                                    연결 수정
                                </h2>
                                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                                    {editingConnection.type.toUpperCase()}
                                </p>
                            </div>
                            <button
                                onClick={() => setEditingConnection(null)}
                                style={{
                                    marginLeft: 'auto',
                                    background: 'rgba(99, 102, 241, 0.1)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    padding: '8px 12px',
                                    fontSize: '16px',
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px', fontWeight: 500 }}>
                                    연결 이름 *
                                </label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        background: 'rgba(15, 23, 42, 0.6)',
                                        border: '1px solid rgba(99, 102, 241, 0.2)',
                                        borderRadius: '10px',
                                        color: '#e2e8f0',
                                        fontSize: '14px',
                                        outline: 'none',
                                    }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px', fontWeight: 500 }}>
                                        호스트 *
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.host}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, host: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px',
                                            background: 'rgba(15, 23, 42, 0.6)',
                                            border: '1px solid rgba(99, 102, 241, 0.2)',
                                            borderRadius: '10px',
                                            color: '#e2e8f0',
                                            fontSize: '14px',
                                            outline: 'none',
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px', fontWeight: 500 }}>
                                        포트 *
                                    </label>
                                    <input
                                        type="number"
                                        value={editForm.port}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, port: parseInt(e.target.value) || 0 }))}
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px',
                                            background: 'rgba(15, 23, 42, 0.6)',
                                            border: '1px solid rgba(99, 102, 241, 0.2)',
                                            borderRadius: '10px',
                                            color: '#e2e8f0',
                                            fontSize: '14px',
                                            outline: 'none',
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px', fontWeight: 500 }}>
                                    데이터베이스 *
                                </label>
                                <input
                                    type="text"
                                    value={editForm.database}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, database: e.target.value }))}
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        background: 'rgba(15, 23, 42, 0.6)',
                                        border: '1px solid rgba(99, 102, 241, 0.2)',
                                        borderRadius: '10px',
                                        color: '#e2e8f0',
                                        fontSize: '14px',
                                        outline: 'none',
                                    }}
                                />
                            </div>

                            <div style={{ 
                                padding: '14px',
                                background: 'rgba(251, 191, 36, 0.1)',
                                borderRadius: '10px',
                                border: '1px solid rgba(251, 191, 36, 0.2)',
                            }}>
                                <div style={{ fontSize: '12px', color: '#fbbf24', marginBottom: '10px', fontWeight: 500 }}>
                                    🔐 자격 증명 (선택사항 - 변경 시에만 입력)
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <input
                                        type="text"
                                        placeholder="사용자 이름"
                                        value={editForm.username}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            background: 'rgba(15, 23, 42, 0.6)',
                                            border: '1px solid rgba(99, 102, 241, 0.2)',
                                            borderRadius: '8px',
                                            color: '#e2e8f0',
                                            fontSize: '13px',
                                            outline: 'none',
                                        }}
                                    />
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="비밀번호"
                                            value={editForm.password}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                                            style={{
                                                width: '100%',
                                                padding: '10px 36px 10px 12px',
                                                background: 'rgba(15, 23, 42, 0.6)',
                                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                                borderRadius: '8px',
                                                color: '#e2e8f0',
                                                fontSize: '13px',
                                                outline: 'none',
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{
                                                position: 'absolute',
                                                right: '10px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                color: '#64748b',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                            }}
                                        >
                                            {showPassword ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Visibility Section */}
                            <div style={{
                                padding: '16px',
                                background: 'rgba(16, 185, 129, 0.05)',
                                borderRadius: '10px',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                            }}>
                                <div style={{ fontSize: '12px', color: '#10b981', marginBottom: '12px', fontWeight: 500 }}>
                                    🔐 접근 권한
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                    {[
                                        { id: 'private', label: '🔒 비공개', color: '#6366f1' },
                                        { id: 'group', label: '👥 그룹', color: '#10b981' },
                                        { id: 'public', label: '🌐 공개', color: '#f59e0b' },
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setEditForm(prev => ({ ...prev, visibility: opt.id as 'private' | 'group' | 'public', sharedWithGroups: opt.id !== 'group' ? [] : prev.sharedWithGroups }))}
                                            style={{
                                                flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center', fontSize: '12px', fontWeight: 500,
                                                background: editForm.visibility === opt.id ? `${opt.color}20` : 'rgba(15, 23, 42, 0.6)',
                                                color: editForm.visibility === opt.id ? opt.color : '#94a3b8',
                                                border: editForm.visibility === opt.id ? `2px solid ${opt.color}` : '1px solid rgba(99, 102, 241, 0.2)',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                                {editForm.visibility === 'group' && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {groups.length === 0 ? (
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>그룹이 없습니다</span>
                                        ) : groups.map((g) => (
                                            <button
                                                key={g.id}
                                                type="button"
                                                onClick={() => setEditForm(prev => ({
                                                    ...prev,
                                                    sharedWithGroups: prev.sharedWithGroups.includes(g.id)
                                                        ? prev.sharedWithGroups.filter(id => id !== g.id)
                                                        : [...prev.sharedWithGroups, g.id]
                                                }))}
                                                style={{
                                                    padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, cursor: 'pointer',
                                                    background: editForm.sharedWithGroups.includes(g.id) ? '#10b981' : 'rgba(15, 23, 42, 0.6)',
                                                    color: editForm.sharedWithGroups.includes(g.id) ? 'white' : '#e2e8f0',
                                                    border: editForm.sharedWithGroups.includes(g.id) ? '2px solid #10b981' : '1px solid rgba(99, 102, 241, 0.2)',
                                                }}
                                            >
                                                {editForm.sharedWithGroups.includes(g.id) ? '✓ ' : ''}{g.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                            <button
                                onClick={() => setEditingConnection(null)}
                                style={{
                                    padding: '12px 24px',
                                    background: 'rgba(99, 102, 241, 0.1)',
                                    border: '1px solid rgba(99, 102, 241, 0.2)',
                                    borderRadius: '10px',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                }}
                            >
                                취소
                            </button>
                            <button
                                onClick={handleUpdate}
                                disabled={saving || !editForm.name || !editForm.host || !editForm.database}
                                style={{
                                    padding: '12px 28px',
                                    background: (editForm.name && editForm.host && editForm.database) 
                                        ? 'linear-gradient(90deg, #6366f1, #8b5cf6)'
                                        : 'rgba(99, 102, 241, 0.3)',
                                    border: 'none',
                                    borderRadius: '10px',
                                    color: '#fff',
                                    cursor: (saving || !editForm.name || !editForm.host || !editForm.database) ? 'not-allowed' : 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: (editForm.name && editForm.host && editForm.database) ? '0 4px 15px rgba(99, 102, 241, 0.3)' : 'none',
                                }}
                            >
                                {saving ? (
                                    <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span> 저장 중...</>
                                ) : (
                                    <>💾 저장</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
