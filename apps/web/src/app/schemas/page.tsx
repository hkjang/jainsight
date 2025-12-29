'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

interface Connection {
    id: string;
    name: string;
    type: string;
}

interface TableInfo {
    name: string;
    type: 'TABLE' | 'VIEW';
}

interface ColumnInfo {
    name: string;
    type: string;
    nullable: boolean;
    primaryKey: boolean;
    defaultValue?: string;
}

const dbIcons: Record<string, { icon: string; color: string }> = {
    postgresql: { icon: '🐘', color: '#336791' },
    mysql: { icon: '🐬', color: '#00758f' },
    mariadb: { icon: '🦭', color: '#003545' },
    mssql: { icon: '🔷', color: '#CC2927' },
    oracle: { icon: '🔶', color: '#F80000' },
    sqlite: { icon: '📁', color: '#003B57' },
};

export default function SchemaExplorerPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [connections, setConnections] = useState<Connection[]>([]);
    const [selectedConnection, setSelectedConnection] = useState<string>('');
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [columns, setColumns] = useState<ColumnInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [tableSearch, setTableSearch] = useState('');
    const [columnSearch, setColumnSearch] = useState('');

    // Get connection from URL params
    useEffect(() => {
        const connId = searchParams.get('connectionId');
        if (connId) {
            setSelectedConnection(connId);
        }
    }, [searchParams]);

    useEffect(() => {
        fetchConnections();
    }, []);

    useEffect(() => {
        if (selectedConnection) {
            fetchTables(selectedConnection);
            setSelectedTable('');
            setColumns([]);
        }
    }, [selectedConnection]);

    useEffect(() => {
        if (selectedConnection && selectedTable) {
            fetchColumns(selectedConnection, selectedTable);
        }
    }, [selectedConnection, selectedTable]);

    const fetchConnections = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        try {
            const res = await fetch('/api/connections', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401) {
                router.push('/login');
                return;
            }
            const data = await res.json();
            if (Array.isArray(data)) {
                setConnections(data);
            }
        } catch (e) {
            console.error('Failed to fetch connections', e);
        }
    };

    const fetchTables = async (connId: string) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/schema/${connId}/tables`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setTables(data);
            } else {
                setTables([]);
            }
        } catch (e) {
            console.error('Failed to fetch tables', e);
            setTables([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchColumns = async (connId: string, tableName: string) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/schema/${connId}/tables/${tableName}/columns`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setColumns(data);
            } else {
                setColumns([]);
            }
        } catch (e) {
            console.error('Failed to fetch columns', e);
            setColumns([]);
        } finally {
            setLoading(false);
        }
    };

    const selectedConn = connections.find(c => c.id === selectedConnection);
    const dbInfo = selectedConn ? dbIcons[selectedConn.type.toLowerCase()] || { icon: '🗄️', color: '#6366f1' } : null;

    const filteredTables = useMemo(() => {
        if (!tableSearch) return tables;
        return tables.filter(t => t.name.toLowerCase().includes(tableSearch.toLowerCase()));
    }, [tables, tableSearch]);

    const filteredColumns = useMemo(() => {
        if (!columnSearch) return columns;
        return columns.filter(c => c.name.toLowerCase().includes(columnSearch.toLowerCase()));
    }, [columns, columnSearch]);

    const tableCount = tables.filter(t => t.type === 'TABLE').length;
    const viewCount = tables.filter(t => t.type === 'VIEW').length;

    return (
        <div style={{ display: 'flex', height: '100%', background: '#0f172a' }}>
            {/* Left Sidebar - Connection & Tables */}
            <div style={{ 
                width: '320px', 
                borderRight: '1px solid rgba(99, 102, 241, 0.15)', 
                display: 'flex', 
                flexDirection: 'column',
                background: 'rgba(15, 23, 42, 0.8)',
            }}>
                {/* Connection Selector */}
                <div style={{ padding: '20px', borderBottom: '1px solid rgba(99, 102, 241, 0.15)' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '8px', fontWeight: 500 }}>
                        데이터베이스 연결
                    </label>
                    <select
                        value={selectedConnection}
                        onChange={(e) => setSelectedConnection(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 14px',
                            background: 'rgba(30, 27, 75, 0.6)',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            borderRadius: '8px',
                            color: '#e2e8f0',
                            fontSize: '14px',
                            outline: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        <option value="">연결 선택...</option>
                        {connections.map((conn) => {
                            const info = dbIcons[conn.type.toLowerCase()] || { icon: '🗄️' };
                            return (
                                <option key={conn.id} value={conn.id}>
                                    {info.icon} {conn.name}
                                </option>
                            );
                        })}
                    </select>

                    {connections.length === 0 && (
                        <Link href="/connections/create" style={{
                            display: 'block',
                            marginTop: '12px',
                            padding: '10px',
                            background: 'rgba(99, 102, 241, 0.15)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            borderRadius: '8px',
                            color: '#a5b4fc',
                            textDecoration: 'none',
                            fontSize: '13px',
                            textAlign: 'center',
                        }}>
                            + 연결 추가하기
                        </Link>
                    )}
                </div>

                {/* Tables List */}
                <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
                    {selectedConnection ? (
                        <>
                            {/* Stats */}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                <div style={{
                                    flex: 1,
                                    padding: '10px',
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    borderRadius: '8px',
                                    textAlign: 'center',
                                }}>
                                    <div style={{ fontSize: '18px', fontWeight: 600, color: '#10b981' }}>{tableCount}</div>
                                    <div style={{ fontSize: '11px', color: '#64748b' }}>테이블</div>
                                </div>
                                <div style={{
                                    flex: 1,
                                    padding: '10px',
                                    background: 'rgba(251, 191, 36, 0.1)',
                                    borderRadius: '8px',
                                    textAlign: 'center',
                                }}>
                                    <div style={{ fontSize: '18px', fontWeight: 600, color: '#fbbf24' }}>{viewCount}</div>
                                    <div style={{ fontSize: '11px', color: '#64748b' }}>뷰</div>
                                </div>
                            </div>

                            {/* Search */}
                            <div style={{ position: 'relative', marginBottom: '12px' }}>
                                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '12px' }}>🔍</span>
                                <input
                                    type="text"
                                    placeholder="테이블 검색..."
                                    value={tableSearch}
                                    onChange={(e) => setTableSearch(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 10px 8px 32px',
                                        background: 'rgba(30, 27, 75, 0.4)',
                                        border: '1px solid rgba(99, 102, 241, 0.15)',
                                        borderRadius: '6px',
                                        color: '#e2e8f0',
                                        fontSize: '13px',
                                        outline: 'none',
                                    }}
                                />
                            </div>

                            {/* Table List */}
                            {loading && tables.length === 0 ? (
                                <div style={{ padding: '20px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '24px', marginBottom: '8px', animation: 'pulse 2s infinite' }}>⏳</div>
                                    <div style={{ color: '#64748b', fontSize: '13px' }}>테이블 로딩 중...</div>
                                </div>
                            ) : filteredTables.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {filteredTables.map((table) => (
                                        <div
                                            key={table.name}
                                            onClick={() => setSelectedTable(table.name)}
                                            style={{
                                                padding: '10px 12px',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                background: selectedTable === table.name 
                                                    ? 'linear-gradient(90deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.15))'
                                                    : 'transparent',
                                                border: selectedTable === table.name 
                                                    ? '1px solid rgba(99, 102, 241, 0.3)' 
                                                    : '1px solid transparent',
                                                transition: 'all 0.2s',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (selectedTable !== table.name) {
                                                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (selectedTable !== table.name) {
                                                    e.currentTarget.style.background = 'transparent';
                                                }
                                            }}
                                        >
                                            <span style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                background: table.type === 'VIEW' ? '#fbbf24' : '#10b981',
                                                boxShadow: `0 0 6px ${table.type === 'VIEW' ? '#fbbf24' : '#10b981'}`,
                                            }} />
                                            <span style={{
                                                flex: 1,
                                                fontSize: '13px',
                                                color: selectedTable === table.name ? '#e2e8f0' : '#94a3b8',
                                                fontWeight: selectedTable === table.name ? 500 : 400,
                                            }}>
                                                {table.name}
                                            </span>
                                            <span style={{
                                                fontSize: '10px',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                background: table.type === 'VIEW' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                                color: table.type === 'VIEW' ? '#fbbf24' : '#10b981',
                                            }}>
                                                {table.type}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ padding: '20px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}>📭</div>
                                    <div style={{ color: '#64748b', fontSize: '13px' }}>
                                        {tableSearch ? '검색 결과 없음' : '테이블 없음'}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ 
                            height: '100%', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            padding: '20px',
                        }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>🔌</div>
                            <div style={{ color: '#64748b', fontSize: '14px', textAlign: 'center' }}>
                                위에서 연결을 선택하면<br />테이블 목록이 표시됩니다
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel - Schema Details */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div style={{ 
                    padding: '20px 24px', 
                    borderBottom: '1px solid rgba(99, 102, 241, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                }}>
                    {selectedTable ? (
                        <>
                            {dbInfo && (
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    background: `linear-gradient(135deg, ${dbInfo.color}, ${dbInfo.color}80)`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '20px',
                                }}>
                                    {dbInfo.icon}
                                </div>
                            )}
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#e2e8f0', marginBottom: '2px' }}>
                                    {selectedTable}
                                </h2>
                                <p style={{ fontSize: '13px', color: '#64748b' }}>
                                    {columns.length} 컬럼 · {selectedConn?.name}
                                </p>
                            </div>
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                                <Link href={`/editor?connectionId=${selectedConnection}&table=${selectedTable}`} style={{
                                    padding: '8px 16px',
                                    background: 'rgba(16, 185, 129, 0.15)',
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                    borderRadius: '8px',
                                    color: '#10b981',
                                    textDecoration: 'none',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                }}>
                                    ⚡ 쿼리 열기
                                </Link>
                            </div>
                        </>
                    ) : (
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#94a3b8' }}>
                                스키마 탐색기
                            </h2>
                            <p style={{ fontSize: '13px', color: '#64748b' }}>
                                테이블을 선택하면 스키마 정보가 표시됩니다
                            </p>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
                    {selectedTable ? (
                        <>
                            {/* Column Search */}
                            <div style={{ position: 'relative', marginBottom: '16px', maxWidth: '300px' }}>
                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>🔍</span>
                                <input
                                    type="text"
                                    placeholder="컬럼 검색..."
                                    value={columnSearch}
                                    onChange={(e) => setColumnSearch(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px 10px 38px',
                                        background: 'rgba(30, 27, 75, 0.4)',
                                        border: '1px solid rgba(99, 102, 241, 0.15)',
                                        borderRadius: '8px',
                                        color: '#e2e8f0',
                                        fontSize: '13px',
                                        outline: 'none',
                                    }}
                                />
                            </div>

                            {/* Columns Table */}
                            <div style={{
                                background: 'rgba(30, 27, 75, 0.4)',
                                borderRadius: '12px',
                                border: '1px solid rgba(99, 102, 241, 0.15)',
                                overflow: 'hidden',
                            }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PK</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>컬럼명</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>데이터 타입</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nullable</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan={4} style={{ padding: '40px', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '24px', marginBottom: '8px', animation: 'pulse 2s infinite' }}>⏳</div>
                                                    <div style={{ color: '#64748b', fontSize: '13px' }}>컬럼 정보 로딩 중...</div>
                                                </td>
                                            </tr>
                                        ) : filteredColumns.length > 0 ? (
                                            filteredColumns.map((col, idx) => (
                                                <tr 
                                                    key={col.name}
                                                    style={{ 
                                                        borderTop: idx > 0 ? '1px solid rgba(99, 102, 241, 0.1)' : 'none',
                                                        transition: 'background 0.2s',
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <td style={{ padding: '12px 16px', width: '50px' }}>
                                                        {col.primaryKey && (
                                                            <span style={{ fontSize: '14px' }} title="Primary Key">🔑</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#e2e8f0' }}>{col.name}</span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <span style={{
                                                            padding: '3px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '12px',
                                                            fontFamily: 'monospace',
                                                            background: 'rgba(139, 92, 246, 0.15)',
                                                            color: '#a78bfa',
                                                        }}>
                                                            {col.type}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <span style={{
                                                            padding: '3px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '11px',
                                                            background: col.nullable ? 'rgba(251, 191, 36, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                            color: col.nullable ? '#fbbf24' : '#f87171',
                                                        }}>
                                                            {col.nullable ? 'NULL' : 'NOT NULL'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                                                    {columnSearch ? '검색 결과 없음' : '컬럼 정보 없음'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div style={{ 
                            height: '100%', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center' 
                        }}>
                            <div style={{ 
                                fontSize: '72px', 
                                marginBottom: '24px', 
                                opacity: 0.3,
                                filter: 'grayscale(0.5)',
                            }}>
                                📊
                            </div>
                            <h3 style={{ fontSize: '18px', color: '#94a3b8', marginBottom: '8px' }}>
                                테이블을 선택하세요
                            </h3>
                            <p style={{ fontSize: '14px', color: '#64748b', textAlign: 'center' }}>
                                왼쪽 패널에서 테이블을 클릭하면<br />
                                컬럼 정보가 여기에 표시됩니다
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                select option {
                    background: #1e293b;
                    color: #e2e8f0;
                }
                input::placeholder {
                    color: #64748b;
                }
                input:focus, select:focus {
                    border-color: rgba(99, 102, 241, 0.5) !important;
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
                }
            `}</style>
        </div>
    );
}
