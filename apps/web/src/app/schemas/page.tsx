'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { translateColumnName, translateTableName } from '../../utils/columnTranslator';

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

const dbIcons: Record<string, { icon: string; color: string; gradient: string }> = {
    postgresql: { icon: '🐘', color: '#336791', gradient: 'linear-gradient(135deg, #336791, #4A90A4)' },
    mysql: { icon: '🐬', color: '#00758f', gradient: 'linear-gradient(135deg, #00758f, #f29111)' },
    mariadb: { icon: '🦭', color: '#003545', gradient: 'linear-gradient(135deg, #003545, #00728C)' },
    mssql: { icon: '🔷', color: '#CC2927', gradient: 'linear-gradient(135deg, #CC2927, #5C2D91)' },
    oracle: { icon: '🔶', color: '#F80000', gradient: 'linear-gradient(135deg, #F80000, #FF6B6B)' },
    sqlite: { icon: '📁', color: '#003B57', gradient: 'linear-gradient(135deg, #003B57, #0F5298)' },
};

// Data type color mapping for visual distinction
const getDataTypeStyle = (type: string) => {
    const lowerType = type.toLowerCase();
    
    // String types
    if (lowerType.includes('varchar') || lowerType.includes('text') || lowerType.includes('char')) {
        return { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }; // green
    }
    // Numeric types
    if (lowerType.includes('int') || lowerType.includes('numeric') || lowerType.includes('decimal') || lowerType.includes('float') || lowerType.includes('double')) {
        return { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }; // blue
    }
    // Date/Time types
    if (lowerType.includes('date') || lowerType.includes('time') || lowerType.includes('timestamp')) {
        return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }; // amber
    }
    // Boolean
    if (lowerType.includes('bool')) {
        return { bg: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }; // pink
    }
    // JSON/Object types
    if (lowerType.includes('json') || lowerType.includes('object')) {
        return { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }; // purple
    }
    // UUID
    if (lowerType.includes('uuid')) {
        return { bg: 'rgba(20, 184, 166, 0.15)', color: '#14b8a6' }; // teal
    }
    // Default
    return { bg: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' };
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
    const [copiedColumn, setCopiedColumn] = useState<string | null>(null);
    const [hoveredTable, setHoveredTable] = useState<string | null>(null);
    const [viewType, setViewType] = useState<'ALL' | 'TABLE' | 'VIEW'>('ALL');

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

    const handleCopyColumn = useCallback((colName: string) => {
        navigator.clipboard.writeText(colName);
        setCopiedColumn(colName);
        setTimeout(() => setCopiedColumn(null), 2000);
    }, []);

    const handleCopyAllColumns = useCallback(() => {
        const allCols = columns.map(c => c.name).join(', ');
        navigator.clipboard.writeText(allCols);
        setCopiedColumn('__ALL__');
        setTimeout(() => setCopiedColumn(null), 2000);
    }, [columns]);

    const generateSelectQuery = useCallback(() => {
        if (!selectedTable || columns.length === 0) return;
        const cols = columns.map(c => c.name).join(',\n  ');
        const query = `SELECT\n  ${cols}\nFROM ${selectedTable}\nLIMIT 100;`;
        navigator.clipboard.writeText(query);
        setCopiedColumn('__QUERY__');
        setTimeout(() => setCopiedColumn(null), 2000);
    }, [selectedTable, columns]);

    const selectedConn = connections.find(c => c.id === selectedConnection);
    const dbInfo = selectedConn ? dbIcons[selectedConn.type.toLowerCase()] || { icon: '🗄️', color: '#6366f1', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)' } : null;

    const filteredTables = useMemo(() => {
        let result = tables;
        if (viewType !== 'ALL') {
            result = result.filter(t => t.type === viewType);
        }
        if (tableSearch) {
            result = result.filter(t => t.name.toLowerCase().includes(tableSearch.toLowerCase()));
        }
        return result;
    }, [tables, tableSearch, viewType]);

    const filteredColumns = useMemo(() => {
        if (!columnSearch) return columns;
        return columns.filter(c => c.name.toLowerCase().includes(columnSearch.toLowerCase()));
    }, [columns, columnSearch]);

    const tableCount = tables.filter(t => t.type === 'TABLE').length;
    const viewCount = tables.filter(t => t.type === 'VIEW').length;
    const pkCount = columns.filter(c => c.primaryKey).length;
    const nullableCount = columns.filter(c => c.nullable).length;

    return (
        <div style={{ display: 'flex', height: '100%', background: '#0f172a' }}>
            {/* Left Sidebar - Connection & Tables */}
            <div style={{ 
                width: '340px', 
                borderRight: '1px solid rgba(99, 102, 241, 0.15)', 
                display: 'flex', 
                flexDirection: 'column',
                background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 27, 75, 0.8) 100%)',
            }}>
                {/* Connection Selector */}
                <div style={{ 
                    padding: '20px', 
                    borderBottom: '1px solid rgba(99, 102, 241, 0.15)',
                    animation: 'fadeIn 0.3s ease-out',
                }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        데이터베이스 연결
                    </label>
                    <select
                        value={selectedConnection}
                        onChange={(e) => setSelectedConnection(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 14px',
                            background: 'rgba(30, 27, 75, 0.8)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            borderRadius: '10px',
                            color: '#e2e8f0',
                            fontSize: '14px',
                            outline: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
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
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            marginTop: '12px',
                            padding: '12px',
                            background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            borderRadius: '10px',
                            color: '#a5b4fc',
                            textDecoration: 'none',
                            fontSize: '13px',
                            fontWeight: 500,
                            transition: 'all 0.2s',
                        }}>
                            <span>✨</span> 연결 추가하기
                        </Link>
                    )}
                </div>

                {/* Tables List */}
                <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
                    {selectedConnection ? (
                        <>
                            {/* Stats */}
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: '1fr 1fr', 
                                gap: '10px', 
                                marginBottom: '16px',
                                animation: 'fadeSlideUp 0.3s ease-out',
                            }}>
                                <div 
                                    onClick={() => setViewType(viewType === 'TABLE' ? 'ALL' : 'TABLE')}
                                    style={{
                                        padding: '12px',
                                        background: viewType === 'TABLE' 
                                            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.15))'
                                            : 'rgba(16, 185, 129, 0.1)',
                                        borderRadius: '10px',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        border: viewType === 'TABLE' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <div style={{ fontSize: '22px', fontWeight: 700, color: '#10b981' }}>{tableCount}</div>
                                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>테이블</div>
                                </div>
                                <div 
                                    onClick={() => setViewType(viewType === 'VIEW' ? 'ALL' : 'VIEW')}
                                    style={{
                                        padding: '12px',
                                        background: viewType === 'VIEW' 
                                            ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.25), rgba(245, 158, 11, 0.15))'
                                            : 'rgba(251, 191, 36, 0.1)',
                                        borderRadius: '10px',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        border: viewType === 'VIEW' ? '1px solid rgba(251, 191, 36, 0.4)' : '1px solid transparent',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <div style={{ fontSize: '22px', fontWeight: 700, color: '#fbbf24' }}>{viewCount}</div>
                                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>뷰</div>
                                </div>
                            </div>

                            {/* Search */}
                            <div style={{ position: 'relative', marginBottom: '14px' }}>
                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '14px' }}>🔍</span>
                                <input
                                    type="text"
                                    placeholder="테이블 검색..."
                                    value={tableSearch}
                                    onChange={(e) => setTableSearch(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px 10px 38px',
                                        background: 'rgba(30, 27, 75, 0.5)',
                                        border: '1px solid rgba(99, 102, 241, 0.2)',
                                        borderRadius: '8px',
                                        color: '#e2e8f0',
                                        fontSize: '13px',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                    }}
                                />
                                {tableSearch && (
                                    <button
                                        onClick={() => setTableSearch('')}
                                        style={{
                                            position: 'absolute',
                                            right: '10px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            color: '#64748b',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                        }}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* Table List */}
                            {loading && tables.length === 0 ? (
                                <div style={{ padding: '30px', textAlign: 'center' }}>
                                    <div style={{ 
                                        fontSize: '32px', 
                                        marginBottom: '12px', 
                                        animation: 'pulse 1.5s infinite' 
                                    }}>⏳</div>
                                    <div style={{ color: '#64748b', fontSize: '13px' }}>테이블 로딩 중...</div>
                                </div>
                            ) : filteredTables.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {filteredTables.map((table, idx) => (
                                        <div
                                            key={table.name}
                                            onClick={() => setSelectedTable(table.name)}
                                            onMouseEnter={() => setHoveredTable(table.name)}
                                            onMouseLeave={() => setHoveredTable(null)}
                                            style={{
                                                padding: '12px 14px',
                                                borderRadius: '10px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                background: selectedTable === table.name 
                                                    ? 'linear-gradient(90deg, rgba(99, 102, 241, 0.25), rgba(139, 92, 246, 0.15))'
                                                    : hoveredTable === table.name
                                                    ? 'rgba(99, 102, 241, 0.08)'
                                                    : 'transparent',
                                                border: selectedTable === table.name 
                                                    ? '1px solid rgba(99, 102, 241, 0.4)' 
                                                    : '1px solid transparent',
                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                transform: selectedTable === table.name ? 'translateX(4px)' : 'translateX(0)',
                                                animation: 'fadeSlideUp 0.3s ease-out forwards',
                                                animationDelay: `${idx * 0.02}s`,
                                                opacity: 0,
                                            }}
                                        >
                                            <span style={{
                                                width: '10px',
                                                height: '10px',
                                                borderRadius: '50%',
                                                background: table.type === 'VIEW' ? '#fbbf24' : '#10b981',
                                                boxShadow: `0 0 8px ${table.type === 'VIEW' ? '#fbbf24' : '#10b981'}50`,
                                                transition: 'transform 0.2s',
                                                transform: selectedTable === table.name ? 'scale(1.2)' : 'scale(1)',
                                            }} />
                                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                                <span style={{
                                                    display: 'block',
                                                    fontSize: '13px',
                                                    color: selectedTable === table.name ? '#e2e8f0' : '#94a3b8',
                                                    fontWeight: selectedTable === table.name ? 600 : 400,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}>
                                                    {table.name}
                                                </span>
                                                <span style={{
                                                    fontSize: '11px',
                                                    color: '#6366f1',
                                                    display: 'block',
                                                    marginTop: '2px',
                                                }}>
                                                    {translateTableName(table.name) !== table.name ? translateTableName(table.name) : ''}
                                                </span>
                                            </div>
                                            <span style={{
                                                fontSize: '10px',
                                                padding: '3px 8px',
                                                borderRadius: '6px',
                                                background: table.type === 'VIEW' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                                color: table.type === 'VIEW' ? '#fbbf24' : '#10b981',
                                                fontWeight: 600,
                                            }}>
                                                {table.type}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ padding: '30px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.4 }}>📭</div>
                                    <div style={{ color: '#64748b', fontSize: '13px' }}>
                                        {tableSearch ? '검색 결과 없음' : '테이블 없음'}
                                    </div>
                                    {tableSearch && (
                                        <button
                                            onClick={() => setTableSearch('')}
                                            style={{
                                                marginTop: '12px',
                                                padding: '8px 16px',
                                                background: 'rgba(99, 102, 241, 0.15)',
                                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                                borderRadius: '8px',
                                                color: '#a5b4fc',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                            }}
                                        >
                                            필터 초기화
                                        </button>
                                    )}
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
                            padding: '30px',
                        }}>
                            <div style={{ 
                                fontSize: '56px', 
                                marginBottom: '20px', 
                                opacity: 0.4,
                                animation: 'float 3s ease-in-out infinite',
                            }}>🔌</div>
                            <div style={{ color: '#94a3b8', fontSize: '15px', textAlign: 'center', lineHeight: 1.6 }}>
                                위에서 연결을 선택하면<br/>테이블 목록이 표시됩니다
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel - Schema Details */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(15, 23, 42, 0.5)' }}>
                {/* Header */}
                <div style={{ 
                    padding: '20px 28px', 
                    borderBottom: '1px solid rgba(99, 102, 241, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    background: 'rgba(15, 23, 42, 0.8)',
                }}>
                    {selectedTable ? (
                        <>
                            {dbInfo && (
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '12px',
                                    background: dbInfo.gradient,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '24px',
                                    boxShadow: `0 4px 15px ${dbInfo.color}40`,
                                }}>
                                    {dbInfo.icon}
                                </div>
                            )}
                            <div style={{ flex: 1 }}>
                                <h2 style={{ 
                                    fontSize: '20px', 
                                    fontWeight: 700, 
                                    color: '#e2e8f0', 
                                    marginBottom: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                }}>
                                    {selectedTable}
                                    <span style={{
                                        fontSize: '11px',
                                        padding: '3px 10px',
                                        borderRadius: '6px',
                                        background: tables.find(t => t.name === selectedTable)?.type === 'VIEW' 
                                            ? 'rgba(251, 191, 36, 0.2)' 
                                            : 'rgba(16, 185, 129, 0.2)',
                                        color: tables.find(t => t.name === selectedTable)?.type === 'VIEW' 
                                            ? '#fbbf24' 
                                            : '#10b981',
                                        fontWeight: 600,
                                    }}>
                                        {tables.find(t => t.name === selectedTable)?.type || 'TABLE'}
                                    </span>
                                </h2>
                                <p style={{ fontSize: '13px', color: '#64748b' }}>
                                    {columns.length} 컬럼 · {pkCount} PK · {nullableCount} nullable · {selectedConn?.name}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={generateSelectQuery}
                                    title="SELECT 쿼리 생성"
                                    style={{
                                        padding: '10px 16px',
                                        background: copiedColumn === '__QUERY__' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(139, 92, 246, 0.15)',
                                        border: `1px solid ${copiedColumn === '__QUERY__' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(139, 92, 246, 0.3)'}`,
                                        borderRadius: '10px',
                                        color: copiedColumn === '__QUERY__' ? '#10b981' : '#a78bfa',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {copiedColumn === '__QUERY__' ? '✓ 복사됨' : '📝 SELECT 생성'}
                                </button>
                                <Link href={`/editor?connectionId=${selectedConnection}&table=${selectedTable}`} style={{
                                    padding: '10px 18px',
                                    background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.15))',
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                    borderRadius: '10px',
                                    color: '#10b981',
                                    textDecoration: 'none',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s',
                                }}>
                                    ⚡ 쿼리 열기
                                </Link>
                            </div>
                        </>
                    ) : (
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#94a3b8' }}>
                                스키마 탐색기
                            </h2>
                            <p style={{ fontSize: '13px', color: '#64748b' }}>
                                테이블을 선택하면 스키마 정보가 표시됩니다
                            </p>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
                    {selectedTable ? (
                        <>
                            {/* Column Search & Actions */}
                            <div style={{ 
                                display: 'flex', 
                                gap: '12px', 
                                marginBottom: '20px',
                                animation: 'fadeSlideUp 0.3s ease-out',
                            }}>
                                <div style={{ position: 'relative', flex: 1, maxWidth: '320px' }}>
                                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>🔍</span>
                                    <input
                                        type="text"
                                        placeholder="컬럼 검색..."
                                        value={columnSearch}
                                        onChange={(e) => setColumnSearch(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px 12px 42px',
                                            background: 'rgba(30, 27, 75, 0.5)',
                                            border: '1px solid rgba(99, 102, 241, 0.2)',
                                            borderRadius: '10px',
                                            color: '#e2e8f0',
                                            fontSize: '14px',
                                            outline: 'none',
                                            transition: 'all 0.2s',
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={handleCopyAllColumns}
                                    style={{
                                        padding: '12px 18px',
                                        background: copiedColumn === '__ALL__' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.1)',
                                        border: `1px solid ${copiedColumn === '__ALL__' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.2)'}`,
                                        borderRadius: '10px',
                                        color: copiedColumn === '__ALL__' ? '#10b981' : '#a5b4fc',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {copiedColumn === '__ALL__' ? '✓ 복사됨' : '📋 전체 컬럼 복사'}
                                </button>
                            </div>

                            {/* Columns Table */}
                            <div style={{
                                background: 'rgba(30, 27, 75, 0.4)',
                                borderRadius: '14px',
                                border: '1px solid rgba(99, 102, 241, 0.15)',
                                overflow: 'hidden',
                                animation: 'fadeSlideUp 0.4s ease-out',
                            }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(99, 102, 241, 0.08)' }}>
                                            <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', width: '50px' }}>PK</th>
                                            <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>컨럼명</th>
                                            <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>한글 설명 ✨</th>
                                            <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>데이터 타입</th>
                                            <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nullable</th>
                                            <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', width: '80px' }}>복사</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan={6} style={{ padding: '50px', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'pulse 1.5s infinite' }}>⏳</div>
                                                    <div style={{ color: '#64748b', fontSize: '14px' }}>컬럼 정보 로딩 중...</div>
                                                </td>
                                            </tr>
                                        ) : filteredColumns.length > 0 ? (
                                            filteredColumns.map((col, idx) => (
                                                <tr 
                                                    key={col.name}
                                                    style={{ 
                                                        borderTop: idx > 0 ? '1px solid rgba(99, 102, 241, 0.08)' : 'none',
                                                        transition: 'background 0.2s',
                                                        animation: 'fadeSlideUp 0.3s ease-out forwards',
                                                        animationDelay: `${idx * 0.03}s`,
                                                        opacity: 0,
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <td style={{ padding: '14px 18px', width: '50px' }}>
                                                        {col.primaryKey && (
                                                            <span style={{ fontSize: '16px' }} title="Primary Key">🔑</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '14px 18px' }}>
                                                        <span style={{ 
                                                            fontSize: '14px', 
                                                            fontWeight: col.primaryKey ? 600 : 500, 
                                                            color: col.primaryKey ? '#fbbf24' : '#e2e8f0',
                                                            fontFamily: 'monospace',
                                                        }}>
                                                            {col.name}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '14px 18px' }}>
                                                        <span style={{
                                                            fontSize: '13px',
                                                            color: '#a5b4fc',
                                                            fontStyle: 'normal',
                                                        }}>
                                                            {translateColumnName(col.name)}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '14px 18px' }}>
                                                        <span style={{
                                                            padding: '4px 10px',
                                                            borderRadius: '6px',
                                                            fontSize: '12px',
                                                            fontFamily: 'monospace',
                                                            background: getDataTypeStyle(col.type).bg,
                                                            color: getDataTypeStyle(col.type).color,
                                                            fontWeight: 500,
                                                        }}>
                                                            {col.type}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '14px 18px' }}>
                                                        <span style={{
                                                            padding: '4px 10px',
                                                            borderRadius: '6px',
                                                            fontSize: '11px',
                                                            fontWeight: 600,
                                                            background: col.nullable ? 'rgba(251, 191, 36, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                            color: col.nullable ? '#fbbf24' : '#f87171',
                                                        }}>
                                                            {col.nullable ? 'NULL' : 'NOT NULL'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                                                        <button
                                                            onClick={() => handleCopyColumn(col.name)}
                                                            style={{
                                                                padding: '6px 12px',
                                                                background: copiedColumn === col.name ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.1)',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                color: copiedColumn === col.name ? '#10b981' : '#a5b4fc',
                                                                cursor: 'pointer',
                                                                fontSize: '12px',
                                                                transition: 'all 0.2s',
                                                            }}
                                                        >
                                                            {copiedColumn === col.name ? '✓' : '📋'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>
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
                                fontSize: '80px', 
                                marginBottom: '28px', 
                                opacity: 0.25,
                                animation: 'float 4s ease-in-out infinite',
                            }}>
                                📊
                            </div>
                            <h3 style={{ fontSize: '20px', color: '#94a3b8', marginBottom: '10px', fontWeight: 600 }}>
                                테이블을 선택하세요
                            </h3>
                            <p style={{ fontSize: '14px', color: '#64748b', textAlign: 'center', lineHeight: 1.6 }}>
                                왼쪽 패널에서 테이블을 클릭하면<br/>
                                컬럼 정보가 여기에 표시됩니다
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes fadeSlideUp {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.95); }
                }
                
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
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
                
                button:hover:not(:disabled) {
                    filter: brightness(1.1);
                }
                
                a:hover {
                    filter: brightness(1.1);
                }
            `}</style>
        </div>
    );
}
