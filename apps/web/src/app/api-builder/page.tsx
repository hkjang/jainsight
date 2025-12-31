'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import loader from '@monaco-editor/loader';
import {
    BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// Configure Monaco to load from local assets (offline support)
// This prevents loading from CDN (cdn.jsdelivr.net)
loader.config({
  paths: {
    vs: '/monaco-editor/min/vs'
  }
});

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });


interface ApiTemplate {
    id: string;
    name: string;
    sql: string;
    apiKey: string;
    parameters: Array<{ name: string; type: string; required: boolean }>;
    connectionId: string;
    createdAt: string;
}

export default function ApiBuilderPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<ApiTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'list' | 'editor'>('list');
    const [connections, setConnections] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [showApiKey, setShowApiKey] = useState<string | null>(null);

    // Editor State
    const [editingApiId, setEditingApiId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [sql, setSql] = useState('SELECT * FROM users WHERE id = :userId');
    const [params, setParams] = useState<any[]>([]);
    const [connectionId, setConnectionId] = useState('');
    const [saving, setSaving] = useState(false);
    const [testResult, setTestResult] = useState<any>(null);

    useEffect(() => {
        fetchTemplates();
        fetchConnections();
    }, []);

    // Auto-detect params from SQL
    useEffect(() => {
        const regex = /:([\w]+)/g;
        const matches = new Set<string>();
        let match;
        while ((match = regex.exec(sql)) !== null) {
            matches.add(match[1]);
        }

        const newParams = Array.from(matches).map(p => {
            const existing = params.find(ep => ep.name === p);
            return existing || { name: p, type: 'string', required: true };
        });
        setParams(newParams);
    }, [sql]);

    const fetchTemplates = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        try {
            const res = await fetch('/api/sql-api', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTemplates(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error('Failed to fetch templates', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchConnections = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch('/api/connections', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setConnections(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error('Failed to fetch connections', e);
        }
    };

    const handleSave = async () => {
        if (!name || !connectionId) {
            alert('이름과 연결을 선택해주세요');
            return;
        }

        const token = localStorage.getItem('token');
        setSaving(true);

        try {
            const url = editingApiId 
                ? `/api/sql-api/${editingApiId}`
                : '/api/sql-api';
            const method = editingApiId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name,
                    sql,
                    parameters: params,
                    connectionId
                })
            });

            if (res.ok) {
                setView('list');
                fetchTemplates();
                resetEditor();
            } else {
                const data = await res.json();
                alert(data.message || 'API 저장에 실패했습니다');
            }
        } catch {
            alert('API 저장 중 오류가 발생했습니다');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('이 API를 삭제하시겠습니까?')) return;

        const token = localStorage.getItem('token');
        try {
            await fetch(`/api/sql-api/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchTemplates();
        } catch (e) {
            console.error('Delete failed', e);
        }
    };

    const handleCopyKey = useCallback((key: string, id: string) => {
        navigator.clipboard.writeText(key);
        setCopiedKey(id);
        setTimeout(() => setCopiedKey(null), 2000);
    }, []);

    const handleCopyEndpoint = useCallback((id: string) => {
        const endpoint = `${window.location.origin}/api/sql-api/${id}/execute`;
        navigator.clipboard.writeText(endpoint);
        setCopiedKey(`endpoint-${id}`);
        setTimeout(() => setCopiedKey(null), 2000);
    }, []);

    const resetEditor = () => {
        setEditingApiId(null);
        setName('');
        setSql('SELECT * FROM users WHERE id = :userId');
        setParams([]);
        setConnectionId('');
        setTestResult(null);
    };

    const handleEditApi = (api: ApiTemplate) => {
        setEditingApiId(api.id);
        setName(api.name);
        setSql(api.sql);
        setParams(api.parameters || []);
        setConnectionId(api.connectionId);
        setView('editor');
    };

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.sql.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ 
                        width: '250px', 
                        height: '32px', 
                        background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.2), rgba(99, 102, 241, 0.1))',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.5s infinite',
                        borderRadius: '8px',
                    }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{
                            height: '180px',
                            background: 'linear-gradient(90deg, rgba(30, 27, 75, 0.5), rgba(49, 46, 129, 0.3), rgba(30, 27, 75, 0.5))',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 1.5s infinite',
                            borderRadius: '16px',
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
        <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
            {view === 'list' && (
                <>
                    {/* Header */}
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'flex-start', 
                        marginBottom: '24px',
                        animation: 'fadeSlideUp 0.4s ease-out',
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
                                SQL-to-API Gateway
                            </h1>
                            <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                                SQL 쿼리를 REST API로 변환하세요 · {templates.length}개의 API
                            </p>
                        </div>
                        <button
                            onClick={() => { setView('editor'); resetEditor(); }}
                            style={{
                                padding: '12px 24px',
                                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                border: 'none',
                                borderRadius: '12px',
                                color: '#fff',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                                transition: 'all 0.2s',
                            }}
                        >
                            <span>+</span> 새 API 생성
                        </button>
                    </div>

                    {/* Search */}
                    {templates.length > 0 && (
                        <div style={{ 
                            position: 'relative', 
                            marginBottom: '24px',
                            animation: 'fadeSlideUp 0.4s ease-out',
                            animationDelay: '0.1s',
                            opacity: 0,
                            animationFillMode: 'forwards',
                        }}>
                            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>🔍</span>
                            <input
                                type="text"
                                placeholder="API 이름 또는 SQL 검색..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    maxWidth: '400px',
                                    padding: '14px 16px 14px 48px',
                                    background: 'rgba(30, 27, 75, 0.6)',
                                    border: '1px solid rgba(99, 102, 241, 0.2)',
                                    borderRadius: '12px',
                                    color: '#e2e8f0',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                }}
                            />
                        </div>
                    )}

                    {/* API Cards */}
                    {filteredTemplates.length > 0 ? (
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
                            gap: '20px' 
                        }}>
                            {filteredTemplates.map((t, idx) => (
                                <div 
                                    key={t.id} 
                                    style={{
                                        background: 'rgba(30, 27, 75, 0.5)',
                                        borderRadius: '16px',
                                        border: '1px solid rgba(99, 102, 241, 0.2)',
                                        padding: '24px',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        animation: 'fadeSlideUp 0.4s ease-out forwards',
                                        animationDelay: `${0.1 + idx * 0.05}s`,
                                        opacity: 0,
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-4px)';
                                        e.currentTarget.style.boxShadow = '0 15px 40px rgba(99, 102, 241, 0.15)';
                                        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.2)';
                                    }}
                                >
                                    {/* Card Header */}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
                                        <div style={{
                                            width: '44px',
                                            height: '44px',
                                            borderRadius: '12px',
                                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.2))',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '20px',
                                            flexShrink: 0,
                                        }}>
                                            🌐
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <h3 style={{ 
                                                fontSize: '16px', 
                                                fontWeight: 600, 
                                                color: '#e2e8f0', 
                                                marginBottom: '4px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {t.name}
                                            </h3>
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                <span style={{
                                                    padding: '3px 8px',
                                                    background: 'rgba(16, 185, 129, 0.15)',
                                                    borderRadius: '6px',
                                                    fontSize: '11px',
                                                    color: '#10b981',
                                                    fontWeight: 500,
                                                }}>
                                                    GET/POST
                                                </span>
                                                <span style={{
                                                    padding: '3px 8px',
                                                    background: 'rgba(139, 92, 246, 0.15)',
                                                    borderRadius: '6px',
                                                    fontSize: '11px',
                                                    color: '#a78bfa',
                                                    fontWeight: 500,
                                                }}>
                                                    {t.parameters?.length || 0} params
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* SQL Preview */}
                                    <div style={{
                                        padding: '12px 14px',
                                        background: 'rgba(15, 23, 42, 0.6)',
                                        borderRadius: '10px',
                                        marginBottom: '16px',
                                        overflow: 'hidden',
                                    }}>
                                        <code style={{ 
                                            fontSize: '12px', 
                                            color: '#94a3b8',
                                            display: 'block',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {t.sql}
                                        </code>
                                    </div>

                                    {/* API Key */}
                                    <div style={{ marginBottom: '16px' }}>
                                        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px', fontWeight: 500 }}>
                                            API KEY
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <div style={{
                                                flex: 1,
                                                padding: '8px 12px',
                                                background: 'rgba(15, 23, 42, 0.6)',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                fontFamily: 'monospace',
                                                color: '#94a3b8',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {showApiKey === t.id ? t.apiKey : '••••••••••••••••'}
                                            </div>
                                            <button
                                                onClick={() => setShowApiKey(showApiKey === t.id ? null : t.id)}
                                                style={{
                                                    padding: '8px 12px',
                                                    background: 'rgba(99, 102, 241, 0.1)',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    color: '#a5b4fc',
                                                    cursor: 'pointer',
                                                    fontSize: '12px',
                                                }}
                                                title={showApiKey === t.id ? '숨기기' : '보기'}
                                            >
                                                {showApiKey === t.id ? '🙈' : '👁️'}
                                            </button>
                                            <button
                                                onClick={() => handleCopyKey(t.apiKey, t.id)}
                                                style={{
                                                    padding: '8px 12px',
                                                    background: copiedKey === t.id ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.1)',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    color: copiedKey === t.id ? '#10b981' : '#a5b4fc',
                                                    cursor: 'pointer',
                                                    fontSize: '12px',
                                                }}
                                            >
                                                {copiedKey === t.id ? '✓' : '📋'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => handleCopyEndpoint(t.id)}
                                            style={{
                                                flex: 1,
                                                padding: '10px',
                                                background: copiedKey === `endpoint-${t.id}` ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.1)',
                                                border: `1px solid ${copiedKey === `endpoint-${t.id}` ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.2)'}`,
                                                borderRadius: '8px',
                                                color: copiedKey === `endpoint-${t.id}` ? '#10b981' : '#a5b4fc',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            {copiedKey === `endpoint-${t.id}` ? '✓ 복사됨' : '🔗 엔드포인트 복사'}
                                        </button>
                                        <button
                                            onClick={() => window.open(`/api/sql-api/${t.id}/openapi`, '_blank')}
                                            style={{
                                                padding: '10px 16px',
                                                background: 'rgba(251, 191, 36, 0.1)',
                                                border: '1px solid rgba(251, 191, 36, 0.2)',
                                                borderRadius: '8px',
                                                color: '#fbbf24',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                            }}
                                        >
                                            📄 Docs
                                        </button>
                                        <button
                                            onClick={() => handleEditApi(t)}
                                            title="수정"
                                            style={{
                                                padding: '10px 16px',
                                                background: 'rgba(59, 130, 246, 0.1)',
                                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                                borderRadius: '8px',
                                                color: '#60a5fa',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                            }}
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleDelete(t.id)}
                                            style={{
                                                padding: '10px 16px',
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                                borderRadius: '8px',
                                                color: '#f87171',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                            }}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : templates.length === 0 ? (
                        <div style={{
                            padding: '80px 40px',
                            textAlign: 'center',
                            background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.6), rgba(49, 46, 129, 0.3))',
                            borderRadius: '20px',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            animation: 'fadeSlideUp 0.4s ease-out',
                        }}>
                            <div style={{ 
                                fontSize: '64px', 
                                marginBottom: '20px',
                                animation: 'float 3s ease-in-out infinite',
                            }}>🌐</div>
                            <h3 style={{ fontSize: '20px', color: '#e2e8f0', marginBottom: '10px', fontWeight: 600 }}>
                                API가 없습니다
                            </h3>
                            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
                                SQL 쿼리를 REST API로 변환하세요
                            </p>
                            <button
                                onClick={() => { setView('editor'); resetEditor(); }}
                                style={{
                                    padding: '14px 28px',
                                    background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                    border: 'none',
                                    borderRadius: '12px',
                                    color: '#fff',
                                    fontSize: '15px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                                }}
                            >
                                + 첫 API 생성하기
                            </button>
                        </div>
                    ) : (
                        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                            검색 결과가 없습니다
                        </div>
                    )}
                </>
            )}

            {view === 'editor' && (
                <div style={{ animation: 'fadeSlideUp 0.4s ease-out' }}>
                    {/* Editor Header */}
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        marginBottom: '24px' 
                    }}>
                        <div>
                            <button
                                onClick={() => setView('list')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    marginBottom: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                ← API 목록으로
                            </button>
                            <h1 style={{
                                fontSize: '24px',
                                fontWeight: 700,
                                background: 'linear-gradient(90deg, #e0e7ff, #c7d2fe)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}>
                                {editingApiId ? 'API 수정' : '새 API 생성'}
                            </h1>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving || !name || !connectionId}
                            style={{
                                padding: '12px 28px',
                                background: (name && connectionId) 
                                    ? 'linear-gradient(90deg, #6366f1, #8b5cf6)' 
                                    : 'rgba(99, 102, 241, 0.3)',
                                border: 'none',
                                borderRadius: '12px',
                                color: '#fff',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: (saving || !name || !connectionId) ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: (name && connectionId) ? '0 4px 15px rgba(99, 102, 241, 0.3)' : 'none',
                            }}
                        >
                            {saving ? (
                                <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span> 저장 중...</>
                            ) : (
                                <>💾 API 저장</>
                            )}
                        </button>
                    </div>

                    {/* Editor Form */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
                        {/* Left: SQL Editor */}
                        <div style={{
                            background: 'rgba(30, 27, 75, 0.5)',
                            borderRadius: '16px',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid rgba(99, 102, 241, 0.15)',
                                display: 'flex',
                                gap: '16px',
                                alignItems: 'center',
                            }}>
                                <input
                                    type="text"
                                    placeholder="API 이름 *"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: '10px 14px',
                                        background: 'rgba(15, 23, 42, 0.6)',
                                        border: '1px solid rgba(99, 102, 241, 0.2)',
                                        borderRadius: '8px',
                                        color: '#e2e8f0',
                                        fontSize: '14px',
                                        outline: 'none',
                                    }}
                                />
                                <select
                                    value={connectionId}
                                    onChange={(e) => setConnectionId(e.target.value)}
                                    style={{
                                        padding: '10px 14px',
                                        background: 'rgba(15, 23, 42, 0.6)',
                                        border: '1px solid rgba(99, 102, 241, 0.2)',
                                        borderRadius: '8px',
                                        color: '#e2e8f0',
                                        fontSize: '14px',
                                        outline: 'none',
                                        cursor: 'pointer',
                                        minWidth: '180px',
                                    }}
                                >
                                    <option value="">연결 선택 *</option>
                                    {connections.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ height: '400px' }}>
                                <MonacoEditor
                                    height="100%"
                                    defaultLanguage="sql"
                                    theme="vs-dark"
                                    value={sql}
                                    onChange={(val) => setSql(val || '')}
                                    options={{
                                        minimap: { enabled: false },
                                        fontSize: 14,
                                        padding: { top: 16 },
                                        scrollBeyondLastLine: false,
                                    }}
                                />
                            </div>
                        </div>

                        {/* Right: Parameters */}
                        <div style={{
                            background: 'rgba(30, 27, 75, 0.5)',
                            borderRadius: '16px',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            padding: '20px',
                        }}>
                            <h3 style={{ 
                                fontSize: '14px', 
                                fontWeight: 600, 
                                color: '#e2e8f0', 
                                marginBottom: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}>
                                📝 파라미터 설정
                            </h3>
                            
                            {params.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {params.map((p, idx) => (
                                        <div 
                                            key={p.name}
                                            style={{
                                                padding: '14px',
                                                background: 'rgba(15, 23, 42, 0.6)',
                                                borderRadius: '10px',
                                                border: '1px solid rgba(99, 102, 241, 0.15)',
                                            }}
                                        >
                                            <div style={{ 
                                                fontSize: '13px', 
                                                fontFamily: 'monospace', 
                                                color: '#a78bfa', 
                                                marginBottom: '10px',
                                                fontWeight: 600,
                                            }}>
                                                :{p.name}
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <select
                                                    value={p.type}
                                                    onChange={(e) => {
                                                        const newParams = [...params];
                                                        newParams[idx].type = e.target.value;
                                                        setParams(newParams);
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px 10px',
                                                        background: 'rgba(30, 27, 75, 0.8)',
                                                        border: '1px solid rgba(99, 102, 241, 0.2)',
                                                        borderRadius: '6px',
                                                        color: '#e2e8f0',
                                                        fontSize: '12px',
                                                        outline: 'none',
                                                    }}
                                                >
                                                    <option value="string">String</option>
                                                    <option value="number">Number</option>
                                                    <option value="boolean">Boolean</option>
                                                </select>
                                                <label style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: '6px',
                                                    fontSize: '12px',
                                                    color: '#94a3b8',
                                                    cursor: 'pointer',
                                                }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={p.required}
                                                        onChange={(e) => {
                                                            const newParams = [...params];
                                                            newParams[idx].required = e.target.checked;
                                                            setParams(newParams);
                                                        }}
                                                        style={{ accentColor: '#6366f1' }}
                                                    />
                                                    필수
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{
                                    padding: '30px',
                                    textAlign: 'center',
                                    color: '#64748b',
                                    fontSize: '13px',
                                }}>
                                    <div style={{ fontSize: '28px', marginBottom: '10px', opacity: 0.5 }}>📝</div>
                                    SQL에서 <code style={{ color: '#a78bfa' }}>:paramName</code><br/>
                                    형식으로 파라미터 정의
                                </div>
                            )}

                            {/* Tips */}
                            <div style={{
                                marginTop: '20px',
                                padding: '14px',
                                background: 'rgba(99, 102, 241, 0.1)',
                                borderRadius: '10px',
                                border: '1px solid rgba(99, 102, 241, 0.2)',
                            }}>
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', fontWeight: 500 }}>
                                    💡 사용법
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.6 }}>
                                    • SQL에 <code style={{ color: '#a78bfa' }}>:userId</code> 형식 사용<br/>
                                    • API 호출 시 파라미터로 전달<br/>
                                    • 자동 SQL Injection 방지
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                
                input::placeholder {
                    color: #64748b;
                }
                
                input:focus, select:focus {
                    border-color: rgba(99, 102, 241, 0.5) !important;
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
                }
                
                select option {
                    background: #1e293b;
                    color: #e2e8f0;
                }
                
                button:hover:not(:disabled) {
                    filter: brightness(1.05);
                }
            `}</style>
        </div>
    );
}
