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
    description?: string;
    sql: string;
    apiKey: string;
    parameters: Array<{ name: string; type: string; required: boolean; defaultValue?: any }>;
    connectionId: string;
    createdAt: string;
    updatedAt?: string;
    isActive: boolean;
    version: number;
    usageCount: number;
    lastUsedAt?: string;
    cacheTtl?: number;
    rateLimit?: { requests: number; windowSeconds: number };
    method?: string;
}

interface TestResult {
    success: boolean;
    data?: any;
    error?: string;
    duration: number;
    rowCount?: number;
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
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Editor State
    const [editingApiId, setEditingApiId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [sql, setSql] = useState('SELECT * FROM users WHERE id = :userId');
    const [params, setParams] = useState<any[]>([]);
    const [connectionId, setConnectionId] = useState('');
    const [saving, setSaving] = useState(false);
    const [cacheTtl, setCacheTtl] = useState(0);
    const [isActive, setIsActive] = useState(true);

    // Test Modal State
    const [showTestModal, setShowTestModal] = useState(false);
    const [testingApi, setTestingApi] = useState<ApiTemplate | null>(null);
    const [testParams, setTestParams] = useState<Record<string, any>>({});
    const [testResult, setTestResult] = useState<TestResult | null>(null);
    const [testing, setTesting] = useState(false);

    // Code Snippet Modal State
    const [showSnippetModal, setShowSnippetModal] = useState(false);
    const [snippetApi, setSnippetApi] = useState<ApiTemplate | null>(null);
    const [snippetType, setSnippetType] = useState<'curl' | 'javascript' | 'python'>('curl');

    // Favorites State
    const [favoriteApis, setFavoriteApis] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchTemplates();
        fetchConnections();
        fetchFavorites();
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

    const fetchFavorites = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const userId = payload.userId || payload.sub || payload.id;
            if (!userId) return;

            const res = await fetch(`/api/users/${userId}/favorites?type=api`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const favIds = new Set<string>(data.map((f: any) => f.itemId));
                setFavoriteApis(favIds);
            }
        } catch (e) {
            console.error('Failed to fetch favorites', e);
        }
    };

    const toggleFavoriteApi = async (apiId: string, apiName: string) => {
        const token = localStorage.getItem('token');
        if (!token) {
            showToast('로그인이 필요합니다', 'error');
            return;
        }

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const userId = payload.userId || payload.sub || payload.id;
            if (!userId) {
                showToast('사용자 정보를 찾을 수 없습니다', 'error');
                return;
            }

            const isFavorite = favoriteApis.has(apiId);
            
            if (isFavorite) {
                // Remove from favorites
                await fetch(`/api/users/${userId}/favorites/api/${apiId}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                });
                setFavoriteApis(prev => {
                    const next = new Set(prev);
                    next.delete(apiId);
                    return next;
                });
                showToast('즐겨찾기에서 제거되었습니다', 'success');
            } else {
                // Add to favorites
                await fetch(`/api/users/${userId}/favorites`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}` 
                    },
                    body: JSON.stringify({
                        itemType: 'api',
                        itemId: apiId,
                        name: apiName,
                        description: 'API Gateway',
                        icon: '🌐'
                    })
                });
                setFavoriteApis(prev => new Set([...prev, apiId]));
                showToast('즐겨찾기에 추가되었습니다', 'success');
            }
        } catch (e) {
            console.error('Failed to toggle favorite', e);
            showToast('즐겨찾기 변경에 실패했습니다', 'error');
        }
    };

    const handleSave = async () => {
        if (!name || !connectionId) {
            showToast('이름과 연결을 선택해주세요', 'error');
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
                    description,
                    sql,
                    parameters: params,
                    connectionId,
                    cacheTtl: cacheTtl || null,
                    isActive
                })
            });

            if (res.ok) {
                setView('list');
                fetchTemplates();
                resetEditor();
                showToast(editingApiId ? 'API 수정 완료' : 'API 생성 완료', 'success');
            } else {
                const data = await res.json();
                showToast(data.message || 'API 저장에 실패했습니다', 'error');
            }
        } catch {
            showToast('API 저장 중 오류가 발생했습니다', 'error');
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
        const endpoint = `${window.location.origin}/api/sql-api/execute/${id}`;
        navigator.clipboard.writeText(endpoint);
        setCopiedKey(`endpoint-${id}`);
        setTimeout(() => setCopiedKey(null), 2000);
    }, []);

    const resetEditor = () => {
        setEditingApiId(null);
        setName('');
        setDescription('');
        setSql('SELECT * FROM users WHERE id = :userId');
        setParams([]);
        setConnectionId('');
        setCacheTtl(0);
        setIsActive(true);
        setTestResult(null);
    };

    const handleEditApi = (api: ApiTemplate) => {
        setEditingApiId(api.id);
        setName(api.name);
        setDescription(api.description || '');
        setSql(api.sql);
        setParams(api.parameters || []);
        setConnectionId(api.connectionId);
        setCacheTtl(api.cacheTtl || 0);
        setIsActive(api.isActive !== false);
        setView('editor');
    };

    // Toast helper
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Toggle API active status
    const handleToggleActive = async (id: string) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/sql-api/${id}/toggle`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                showToast(data.message, 'success');
                fetchTemplates();
            }
        } catch (e) {
            showToast('상태 변경 실패', 'error');
        }
    };

    // Duplicate API
    const handleDuplicate = async (id: string) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/sql-api/${id}/duplicate`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                showToast('API 복제 완료', 'success');
                fetchTemplates();
            }
        } catch (e) {
            showToast('복제 실패', 'error');
        }
    };

    // Regenerate API key
    const handleRegenerateKey = async (id: string) => {
        if (!confirm('API 키를 재생성하시겠습니까? 기존 키는 더 이상 사용할 수 없습니다.')) return;
        
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/sql-api/${id}/regenerate-key`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                showToast('API 키 재생성 완료', 'success');
                fetchTemplates();
            }
        } catch (e) {
            showToast('키 재생성 실패', 'error');
        }
    };

    // Open test modal
    const openTestModal = (api: ApiTemplate) => {
        setTestingApi(api);
        const defaultParams: Record<string, any> = {};
        api.parameters?.forEach(p => {
            defaultParams[p.name] = p.defaultValue || '';
        });
        setTestParams(defaultParams);
        setTestResult(null);
        setShowTestModal(true);
    };

    // Run test
    const runTest = async () => {
        if (!testingApi) return;
        setTesting(true);
        setTestResult(null);
        
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/sql-api/${testingApi.id}/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ params: testParams })
            });
            const data = await res.json();
            setTestResult(data);
        } catch (e: any) {
            setTestResult({ success: false, error: e.message, duration: 0 });
        } finally {
            setTesting(false);
        }
    };

    // Open code snippet modal
    const openSnippetModal = (api: ApiTemplate) => {
        setSnippetApi(api);
        setSnippetType('curl');
        setShowSnippetModal(true);
    };

    // Generate code snippets
    const generateSnippet = (api: ApiTemplate, type: 'curl' | 'javascript' | 'python'): string => {
        const endpoint = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/sql-api/execute/${api.id}`;
        const params = api.parameters?.reduce((acc, p) => {
            acc[p.name] = p.type === 'number' ? 123 : 'value';
            return acc;
        }, {} as Record<string, any>) || {};

        if (type === 'curl') {
            return `curl -X POST '${endpoint}' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "apiKey": "${api.apiKey}",
    "params": ${JSON.stringify(params, null, 4).replace(/\n/g, '\n    ')}
  }'`;
        }

        if (type === 'javascript') {
            return `const response = await fetch('${endpoint}', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        apiKey: '${api.apiKey}',
        params: ${JSON.stringify(params, null, 8).replace(/\n/g, '\n        ')}
    })
});

const data = await response.json();
console.log(data);`;
        }

        if (type === 'python') {
            return `import requests

response = requests.post(
    '${endpoint}',
    json={
        'apiKey': '${api.apiKey}',
        'params': ${JSON.stringify(params, null, 8).replace(/\n/g, '\n        ')}
    }
)

data = response.json()
print(data)`;
        }

        return '';
    };

    // Copy snippet to clipboard
    const copySnippet = () => {
        if (!snippetApi) return;
        navigator.clipboard.writeText(generateSnippet(snippetApi, snippetType));
        showToast('코드 복사 완료', 'success');
    };

    // Format relative time
    const formatRelativeTime = (dateStr?: string) => {
        if (!dateStr) return '사용 기록 없음';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return '방금 전';
        if (diffMins < 60) return `${diffMins}분 전`;
        if (diffHours < 24) return `${diffHours}시간 전`;
        return `${diffDays}일 전`;
    };

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.sql.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
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
            {/* Toast Notification */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    padding: '12px 20px',
                    borderRadius: '10px',
                    background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.9)' 
                        : toast.type === 'error' ? 'rgba(239, 68, 68, 0.9)' 
                        : 'rgba(99, 102, 241, 0.9)',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 500,
                    zIndex: 9999,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    animation: 'fadeSlideUp 0.3s ease',
                }}>
                    {toast.type === 'success' ? '✓ ' : toast.type === 'error' ? '✗ ' : 'ℹ '}
                    {toast.message}
                </div>
            )}

            {/* Test Modal */}
            {showTestModal && testingApi && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                }} onClick={() => setShowTestModal(false)}>
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '90%',
                            maxWidth: '700px',
                            maxHeight: '80vh',
                            overflow: 'auto',
                            background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.98), rgba(49, 46, 129, 0.95))',
                            borderRadius: '20px',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            padding: '28px',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#e2e8f0' }}>
                                🧪 API 테스트: {testingApi.name}
                            </h2>
                            <button onClick={() => setShowTestModal(false)} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '24px', cursor: 'pointer' }}>×</button>
                        </div>

                        {/* Parameters Input */}
                        {testingApi.parameters && testingApi.parameters.length > 0 && (
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ fontSize: '14px', fontWeight: 500, color: '#a5b4fc', marginBottom: '12px' }}>파라미터</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {testingApi.parameters.map(p => (
                                        <div key={p.name} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            <span style={{ color: '#a78bfa', fontFamily: 'monospace', width: '120px' }}>:{p.name}</span>
                                            <input
                                                type={p.type === 'number' ? 'number' : 'text'}
                                                value={testParams[p.name] || ''}
                                                onChange={(e) => setTestParams(prev => ({ ...prev, [p.name]: e.target.value }))}
                                                placeholder={`${p.type}${p.required ? ' (필수)' : ''}`}
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
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Run Test Button */}
                        <button
                            onClick={runTest}
                            disabled={testing}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: testing ? 'rgba(99, 102, 241, 0.3)' : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                border: 'none',
                                borderRadius: '10px',
                                color: '#fff',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: testing ? 'not-allowed' : 'pointer',
                                marginBottom: '20px',
                            }}
                        >
                            {testing ? '⏳ 실행 중...' : '▶ 테스트 실행'}
                        </button>

                        {/* Test Result */}
                        {testResult && (
                            <div style={{
                                padding: '16px',
                                background: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                borderRadius: '12px',
                                border: `1px solid ${testResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ color: testResult.success ? '#10b981' : '#f87171', fontWeight: 600 }}>
                                        {testResult.success ? '✓ 성공' : '✗ 실패'}
                                    </span>
                                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>
                                        ⏱ {testResult.duration}ms {testResult.rowCount !== undefined && `· ${testResult.rowCount} rows`}
                                    </span>
                                </div>
                                <pre style={{
                                    background: 'rgba(0,0,0,0.3)',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    overflow: 'auto',
                                    maxHeight: '200px',
                                    fontSize: '12px',
                                    color: testResult.success ? '#a5b4fc' : '#fca5a5',
                                    margin: 0,
                                }}>
                                    {testResult.error || JSON.stringify(testResult.data, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Code Snippet Modal */}
            {showSnippetModal && snippetApi && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                }} onClick={() => setShowSnippetModal(false)}>
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '90%',
                            maxWidth: '700px',
                            maxHeight: '80vh',
                            overflow: 'auto',
                            background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.98), rgba(49, 46, 129, 0.95))',
                            borderRadius: '20px',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            padding: '28px',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#e2e8f0' }}>
                                💻 코드 스니펫: {snippetApi.name}
                            </h2>
                            <button onClick={() => setShowSnippetModal(false)} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '24px', cursor: 'pointer' }}>×</button>
                        </div>

                        {/* Language Tabs */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            {(['curl', 'javascript', 'python'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setSnippetType(type)}
                                    style={{
                                        padding: '8px 16px',
                                        background: snippetType === type ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.1)',
                                        border: `1px solid ${snippetType === type ? 'rgba(99, 102, 241, 0.5)' : 'rgba(99, 102, 241, 0.2)'}`,
                                        borderRadius: '8px',
                                        color: snippetType === type ? '#a5b4fc' : '#6b7280',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                    }}
                                >
                                    {type === 'curl' ? '🔗 cURL' : type === 'javascript' ? '🟡 JavaScript' : '🐍 Python'}
                                </button>
                            ))}
                        </div>

                        {/* Code Block */}
                        <pre style={{
                            background: 'rgba(0,0,0,0.4)',
                            padding: '16px',
                            borderRadius: '12px',
                            overflow: 'auto',
                            maxHeight: '300px',
                            fontSize: '13px',
                            color: '#a5b4fc',
                            fontFamily: 'monospace',
                            lineHeight: 1.6,
                            margin: 0,
                            marginBottom: '16px',
                        }}>
                            {generateSnippet(snippetApi, snippetType)}
                        </pre>

                        {/* Copy Button */}
                        <button
                            onClick={copySnippet}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                border: 'none',
                                borderRadius: '10px',
                                color: '#fff',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            📋 코드 복사
                        </button>
                    </div>
                </div>
            )}

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
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '12px' }}>
                                        <div style={{
                                            width: '44px',
                                            height: '44px',
                                            borderRadius: '12px',
                                            background: t.isActive !== false 
                                                ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.2))'
                                                : 'rgba(75, 85, 99, 0.3)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '20px',
                                            flexShrink: 0,
                                            opacity: t.isActive !== false ? 1 : 0.6,
                                        }}>
                                            🌐
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <h3 style={{ 
                                                    fontSize: '16px', 
                                                    fontWeight: 600, 
                                                    color: t.isActive !== false ? '#e2e8f0' : '#9ca3af', 
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    margin: 0,
                                                }}>
                                                    {t.name}
                                                </h3>
                                                {/* Active/Inactive Badge */}
                                                <span style={{
                                                    padding: '2px 6px',
                                                    background: t.isActive !== false ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                    borderRadius: '4px',
                                                    fontSize: '10px',
                                                    color: t.isActive !== false ? '#10b981' : '#f87171',
                                                    fontWeight: 600,
                                                }}>
                                                    {t.isActive !== false ? 'ON' : 'OFF'}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                <span style={{
                                                    padding: '2px 6px',
                                                    background: 'rgba(16, 185, 129, 0.15)',
                                                    borderRadius: '4px',
                                                    fontSize: '10px',
                                                    color: '#10b981',
                                                    fontWeight: 500,
                                                }}>
                                                    POST
                                                </span>
                                                <span style={{
                                                    padding: '2px 6px',
                                                    background: 'rgba(139, 92, 246, 0.15)',
                                                    borderRadius: '4px',
                                                    fontSize: '10px',
                                                    color: '#a78bfa',
                                                    fontWeight: 500,
                                                }}>
                                                    {t.parameters?.length || 0} params
                                                </span>
                                                {/* Usage Count */}
                                                <span style={{
                                                    padding: '2px 6px',
                                                    background: 'rgba(251, 191, 36, 0.15)',
                                                    borderRadius: '4px',
                                                    fontSize: '10px',
                                                    color: '#fbbf24',
                                                    fontWeight: 500,
                                                }}>
                                                    📊 {t.usageCount || 0} calls
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    {t.description && (
                                        <div style={{ 
                                            fontSize: '12px', 
                                            color: '#94a3b8', 
                                            marginBottom: '12px',
                                            lineHeight: 1.4,
                                        }}>
                                            {t.description}
                                        </div>
                                    )}

                                    {/* SQL Preview */}
                                    <div style={{
                                        padding: '10px 12px',
                                        background: 'rgba(15, 23, 42, 0.6)',
                                        borderRadius: '8px',
                                        marginBottom: '12px',
                                        overflow: 'hidden',
                                    }}>
                                        <code style={{ 
                                            fontSize: '11px', 
                                            color: '#94a3b8',
                                            display: 'block',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {t.sql}
                                        </code>
                                    </div>

                                    {/* Last Used */}
                                    <div style={{ 
                                        fontSize: '11px', 
                                        color: '#6b7280', 
                                        marginBottom: '12px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                    }}>
                                        <span>🕐 {formatRelativeTime(t.lastUsedAt)}</span>
                                        {t.cacheTtl && t.cacheTtl > 0 && (
                                            <span>⚡ 캐시 {t.cacheTtl}초</span>
                                        )}
                                    </div>

                                    {/* API Key */}
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: 500 }}>
                                            API KEY
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <div style={{
                                                flex: 1,
                                                padding: '6px 10px',
                                                background: 'rgba(15, 23, 42, 0.6)',
                                                borderRadius: '6px',
                                                fontSize: '11px',
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
                                                    padding: '6px 10px',
                                                    background: 'rgba(99, 102, 241, 0.1)',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    color: '#a5b4fc',
                                                    cursor: 'pointer',
                                                    fontSize: '11px',
                                                }}
                                                title={showApiKey === t.id ? '숨기기' : '보기'}
                                            >
                                                {showApiKey === t.id ? '🙈' : '👁️'}
                                            </button>
                                            <button
                                                onClick={() => handleCopyKey(t.apiKey, t.id)}
                                                style={{
                                                    padding: '6px 10px',
                                                    background: copiedKey === t.id ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.1)',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    color: copiedKey === t.id ? '#10b981' : '#a5b4fc',
                                                    cursor: 'pointer',
                                                    fontSize: '11px',
                                                }}
                                            >
                                                {copiedKey === t.id ? '✓' : '📋'}
                                            </button>
                                            <button
                                                onClick={() => handleRegenerateKey(t.id)}
                                                style={{
                                                    padding: '6px 10px',
                                                    background: 'rgba(251, 191, 36, 0.1)',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    color: '#fbbf24',
                                                    cursor: 'pointer',
                                                    fontSize: '11px',
                                                }}
                                                title="키 재생성"
                                            >
                                                🔄
                                            </button>
                                        </div>
                                    </div>

                                    {/* Primary Actions */}
                                    <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                                        <button
                                            onClick={() => openTestModal(t)}
                                            style={{
                                                flex: 1,
                                                padding: '8px',
                                                background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1))',
                                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                                borderRadius: '8px',
                                                color: '#10b981',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                            }}
                                        >
                                            🧪 테스트
                                        </button>
                                        <button
                                            onClick={() => openSnippetModal(t)}
                                            style={{
                                                flex: 1,
                                                padding: '8px',
                                                background: 'rgba(139, 92, 246, 0.1)',
                                                border: '1px solid rgba(139, 92, 246, 0.2)',
                                                borderRadius: '8px',
                                                color: '#a78bfa',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                            }}
                                        >
                                            💻 코드
                                        </button>
                                        <button
                                            onClick={() => handleCopyEndpoint(t.id)}
                                            style={{
                                                flex: 1,
                                                padding: '8px',
                                                background: copiedKey === `endpoint-${t.id}` ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.1)',
                                                border: `1px solid ${copiedKey === `endpoint-${t.id}` ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.2)'}`,
                                                borderRadius: '8px',
                                                color: copiedKey === `endpoint-${t.id}` ? '#10b981' : '#a5b4fc',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                            }}
                                        >
                                            {copiedKey === `endpoint-${t.id}` ? '✓' : '🔗 URL'}
                                        </button>
                                    </div>

                                    {/* Secondary Actions */}
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button
                                            onClick={() => handleToggleActive(t.id)}
                                            style={{
                                                padding: '6px 10px',
                                                background: t.isActive !== false ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                border: `1px solid ${t.isActive !== false ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                                                borderRadius: '6px',
                                                color: t.isActive !== false ? '#f87171' : '#10b981',
                                                cursor: 'pointer',
                                                fontSize: '11px',
                                            }}
                                            title={t.isActive !== false ? '비활성화' : '활성화'}
                                        >
                                            {t.isActive !== false ? '⏸️' : '▶️'}
                                        </button>
                                        <button
                                            onClick={() => handleDuplicate(t.id)}
                                            style={{
                                                padding: '6px 10px',
                                                background: 'rgba(99, 102, 241, 0.1)',
                                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                                borderRadius: '6px',
                                                color: '#a5b4fc',
                                                cursor: 'pointer',
                                                fontSize: '11px',
                                            }}
                                            title="복제"
                                        >
                                            📄
                                        </button>
                                        <button
                                            onClick={() => window.open(`/api/sql-api/${t.id}/openapi`, '_blank')}
                                            style={{
                                                padding: '6px 10px',
                                                background: 'rgba(251, 191, 36, 0.1)',
                                                border: '1px solid rgba(251, 191, 36, 0.2)',
                                                borderRadius: '6px',
                                                color: '#fbbf24',
                                                cursor: 'pointer',
                                                fontSize: '11px',
                                            }}
                                            title="API 문서"
                                        >
                                            📖
                                        </button>
                                        <button
                                            onClick={() => toggleFavoriteApi(t.id, t.name)}
                                            style={{
                                                padding: '6px 10px',
                                                background: favoriteApis.has(t.id) ? 'rgba(251, 191, 36, 0.2)' : 'rgba(251, 191, 36, 0.1)',
                                                border: `1px solid ${favoriteApis.has(t.id) ? 'rgba(251, 191, 36, 0.4)' : 'rgba(251, 191, 36, 0.2)'}`,
                                                borderRadius: '6px',
                                                color: '#fbbf24',
                                                cursor: 'pointer',
                                                fontSize: '11px',
                                                transition: 'all 0.2s',
                                            }}
                                            title={favoriteApis.has(t.id) ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                                        >
                                            {favoriteApis.has(t.id) ? '⭐' : '☆'}
                                        </button>
                                        <div style={{ flex: 1 }} />
                                        <button
                                            onClick={() => handleEditApi(t)}
                                            style={{
                                                padding: '6px 10px',
                                                background: 'rgba(59, 130, 246, 0.1)',
                                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                                borderRadius: '6px',
                                                color: '#60a5fa',
                                                cursor: 'pointer',
                                                fontSize: '11px',
                                            }}
                                            title="수정"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleDelete(t.id)}
                                            style={{
                                                padding: '6px 10px',
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                                borderRadius: '6px',
                                                color: '#f87171',
                                                cursor: 'pointer',
                                                fontSize: '11px',
                                            }}
                                            title="삭제"
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
