'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

interface AiProvider {
    id: string;
    name: string;
    type: 'vllm' | 'ollama' | 'openai';
    endpoint: string;
    apiKey?: string;
    timeoutMs: number;
    retryCount: number;
    isActive: boolean;
    priority: number;
    description?: string;
    createdAt: string;
}

interface TestResult {
    success: boolean;
    message: string;
    latencyMs?: number;
    testedAt?: string;
}

interface DiagnosticTestResult {
    name: string;
    success: boolean;
    message: string;
    latencyMs: number;
    details?: any;
}

interface DiagnosticResult {
    providerId: string;
    providerName: string;
    providerType: string;
    endpoint: string;
    timestamp: string;
    tests: DiagnosticTestResult[];
    summary: {
        passed: number;
        failed: number;
        totalLatencyMs: number;
        status: 'healthy' | 'degraded' | 'failed';
    };
    availableModels: string[];
}

const API_BASE = '/api';

const providerIcons: Record<string, string> = {
    vllm: '⚡',
    ollama: '🦙',
    openai: '🤖',
};

const providerGradients: Record<string, string> = {
    vllm: 'linear-gradient(135deg, #10b981, #059669)',
    ollama: 'linear-gradient(135deg, #f59e0b, #d97706)',
    openai: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
};

export default function AiProvidersPage() {
    const [providers, setProviders] = useState<AiProvider[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingProvider, setEditingProvider] = useState<AiProvider | null>(null);
    const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [sortBy, setSortBy] = useState<'priority' | 'name' | 'createdAt'>('priority');
    const [testingAll, setTestingAll] = useState(false);
    const [selectedProviders, setSelectedProviders] = useState<Set<string>>(new Set());
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    
    // Diagnostic state
    const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
    const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
    const [diagnosingId, setDiagnosingId] = useState<string | null>(null);
    
    // Interactive Test Modal state
    const [showTestModal, setShowTestModal] = useState(false);
    const [testingProvider, setTestingProvider] = useState<AiProvider | null>(null);
    const [testPrompt, setTestPrompt] = useState('안녕하세요! 간단히 자기소개해 주세요.');
    const [testResponse, setTestResponse] = useState('');
    const [testLoading, setTestLoading] = useState(false);
    const [testLatency, setTestLatency] = useState<number | null>(null);
    const [testError, setTestError] = useState('');

    const [form, setForm] = useState({
        name: '',
        type: 'ollama' as 'vllm' | 'ollama' | 'openai',
        endpoint: '',
        apiKey: '',
        timeoutMs: 30000,
        retryCount: 3,
        isActive: true,
        priority: 1,
        description: '',
    });

    useEffect(() => {
        fetchProviders();
    }, []);

    // Auto refresh every 30 seconds
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => {
            fetchProviders();
            setLastRefresh(new Date());
        }, 30000);
        return () => clearInterval(interval);
    }, [autoRefresh]);

    // Toast helper
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchProviders = async () => {
        try {
            const res = await fetch(`${API_BASE}/admin/ai-providers`);
            const data = await res.json();
            setProviders(data);
        } catch (error) {
            console.error('Failed to fetch providers:', error);
        } finally {
            setLoading(false);
        }
    };

    // Statistics
    const stats = useMemo(() => {
        const total = providers.length;
        const active = providers.filter(p => p.isActive).length;
        const byType = providers.reduce((acc, p) => {
            acc[p.type] = (acc[p.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const testedCount = Object.keys(testResults).length;
        const onlineCount = Object.values(testResults).filter(r => r.success).length;
        
        return { total, active, byType, testedCount, onlineCount };
    }, [providers, testResults]);

    // Filtered and sorted providers
    const filteredProviders = useMemo(() => {
        let result = [...providers];

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(p => 
                p.name.toLowerCase().includes(query) ||
                p.endpoint.toLowerCase().includes(query) ||
                p.description?.toLowerCase().includes(query)
            );
        }

        if (filterType) {
            result = result.filter(p => p.type === filterType);
        }

        if (filterStatus === 'active') {
            result = result.filter(p => p.isActive);
        } else if (filterStatus === 'inactive') {
            result = result.filter(p => !p.isActive);
        }

        result.sort((a, b) => {
            if (sortBy === 'priority') return a.priority - b.priority;
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        return result;
    }, [providers, searchQuery, filterType, filterStatus, sortBy]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingProvider 
                ? `${API_BASE}/admin/ai-providers/${editingProvider.id}`
                : `${API_BASE}/admin/ai-providers`;
            
            const res = await fetch(url, {
                method: editingProvider ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });

            if (res.ok) {
                fetchProviders();
                closeModal();
                showToast(editingProvider ? 'Provider 수정 완료' : 'Provider 추가 완료', 'success');
            }
        } catch (error) {
            console.error('Failed to save provider:', error);
            showToast('저장 실패', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            await fetch(`${API_BASE}/admin/ai-providers/${id}`, { method: 'DELETE' });
            fetchProviders();
            showToast('Provider 삭제 완료', 'success');
        } catch (error) {
            console.error('Failed to delete provider:', error);
            showToast('삭제 실패', 'error');
        }
    };

    const handleDuplicate = (provider: AiProvider) => {
        setEditingProvider(null);
        setForm({
            name: `${provider.name} (복사본)`,
            type: provider.type,
            endpoint: provider.endpoint,
            apiKey: '',
            timeoutMs: provider.timeoutMs,
            retryCount: provider.retryCount,
            isActive: false,
            priority: provider.priority + 1,
            description: provider.description || '',
        });
        setShowModal(true);
        showToast('Provider 복제 - 정보를 수정 후 저장하세요', 'info');
    };

    const handleTest = async (id: string) => {
        setTestResults(prev => ({ ...prev, [id]: { success: false, message: '테스트 중...' } }));
        try {
            const res = await fetch(`${API_BASE}/admin/ai-providers/${id}/test`, { method: 'POST' });
            const data = await res.json();
            setTestResults(prev => ({ 
                ...prev, 
                [id]: { ...data, testedAt: new Date().toISOString() } 
            }));
        } catch (error) {
            setTestResults(prev => ({ 
                ...prev, 
                [id]: { success: false, message: '연결 실패', testedAt: new Date().toISOString() } 
            }));
        }
    };

    const handleTestAll = async () => {
        setTestingAll(true);
        for (const provider of providers.filter(p => p.isActive)) {
            await handleTest(provider.id);
        }
        setTestingAll(false);
    };

    const handleDiagnose = async (id: string) => {
        setDiagnosingId(id);
        try {
            const res = await fetch(`${API_BASE}/admin/ai-providers/${id}/diagnose`, { method: 'POST' });
            const data = await res.json();
            setDiagnosticResult(data);
            setShowDiagnosticModal(true);
        } catch (error) {
            showToast('진단 실패', 'error');
        } finally {
            setDiagnosingId(null);
        }
    };

    // Interactive Test Modal
    const openInteractiveTest = (provider: AiProvider) => {
        setTestingProvider(provider);
        setTestResponse('');
        setTestError('');
        setTestLatency(null);
        setShowTestModal(true);
    };

    const runInteractiveTest = async () => {
        if (!testingProvider || !testPrompt.trim()) return;
        
        setTestLoading(true);
        setTestResponse('');
        setTestError('');
        setTestLatency(null);
        
        const startTime = performance.now();
        
        try {
            const res = await fetch(`${API_BASE}/admin/ai-providers/${testingProvider.id}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: testPrompt }),
            });
            
            const endTime = performance.now();
            setTestLatency(Math.round(endTime - startTime));
            
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'API 호출 실패');
            }
            
            const data = await res.json();
            setTestResponse(data.response || data.content || JSON.stringify(data, null, 2));
        } catch (error: any) {
            setTestError(error.message || '테스트 실패');
        } finally {
            setTestLoading(false);
        }
    };

    const handleBulkToggle = async (isActive: boolean) => {
        try {
            await Promise.all(
                Array.from(selectedProviders).map(id =>
                    fetch(`${API_BASE}/admin/ai-providers/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ isActive }),
                    })
                )
            );
            fetchProviders();
            setSelectedProviders(new Set());
        } catch (error) {
            console.error('Failed to bulk update:', error);
        }
    };

    const handlePriorityChange = async (id: string, direction: 'up' | 'down') => {
        const provider = providers.find(p => p.id === id);
        if (!provider) return;
        
        const newPriority = direction === 'up' 
            ? Math.max(1, provider.priority - 1) 
            : provider.priority + 1;
        
        try {
            await fetch(`${API_BASE}/admin/ai-providers/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ priority: newPriority }),
            });
            fetchProviders();
        } catch (error) {
            console.error('Failed to update priority:', error);
        }
    };

    const toggleSelectProvider = (id: string) => {
        setSelectedProviders(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedProviders.size === filteredProviders.length) {
            setSelectedProviders(new Set());
        } else {
            setSelectedProviders(new Set(filteredProviders.map(p => p.id)));
        }
    };

    const openEditModal = (provider: AiProvider) => {
        setEditingProvider(provider);
        setForm({
            name: provider.name,
            type: provider.type,
            endpoint: provider.endpoint,
            apiKey: provider.apiKey || '',
            timeoutMs: provider.timeoutMs,
            retryCount: provider.retryCount,
            isActive: provider.isActive,
            priority: provider.priority,
            description: provider.description || '',
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingProvider(null);
        setForm({
            name: '',
            type: 'ollama',
            endpoint: '',
            apiKey: '',
            timeoutMs: 30000,
            retryCount: 3,
            isActive: true,
            priority: 1,
            description: '',
        });
    };

    const inputStyle = {
        width: '100%',
        padding: '10px 14px',
        background: 'rgba(30, 30, 50, 0.8)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: '8px',
        color: '#e0e0e0',
        fontSize: '14px',
        outline: 'none',
        transition: 'all 0.2s ease',
    };

    const buttonStyle = {
        padding: '10px 20px',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 500,
        transition: 'all 0.2s ease',
    };

    const StatCard = ({ icon, label, value, color, subValue }: { 
        icon: string; label: string; value: number | string; color: string; subValue?: string 
    }) => (
        <div style={{
            padding: '16px 20px',
            background: 'rgba(20, 20, 35, 0.6)',
            borderRadius: '12px',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            transition: 'all 0.2s ease',
        }}>
            <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: `${color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
            }}>
                {icon}
            </div>
            <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>{label}</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color }}>{value}</div>
                {subValue && <div style={{ fontSize: '11px', color: '#6b7280' }}>{subValue}</div>}
            </div>
        </div>
    );

    return (
        <div>
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
                    animation: 'slideIn 0.3s ease',
                }}>
                    {toast.type === 'success' ? '✓ ' : toast.type === 'error' ? '✗ ' : 'ℹ '}
                    {toast.message}
                </div>
            )}
            <style>{`@keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

            {/* Header */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '24px',
            }}>
                <div>
                    <h1 style={{ 
                        fontSize: '28px', 
                        fontWeight: 700,
                        background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '8px',
                    }}>
                        AI Providers
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: '14px' }}>
                        vLLM, Ollama, OpenAI 등 AI 서비스 연결을 관리합니다.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {/* Auto Refresh Toggle */}
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        padding: '8px 14px',
                        background: 'rgba(20, 20, 35, 0.6)',
                        borderRadius: '8px',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                    }}>
                        <div 
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            style={{
                                width: '36px',
                                height: '18px',
                                borderRadius: '9px',
                                background: autoRefresh ? 'rgba(16, 185, 129, 0.6)' : 'rgba(107, 114, 128, 0.3)',
                                position: 'relative',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <div style={{
                                width: '14px',
                                height: '14px',
                                borderRadius: '50%',
                                background: '#fff',
                                position: 'absolute',
                                top: '2px',
                                left: autoRefresh ? '20px' : '2px',
                                transition: 'all 0.2s ease',
                            }} />
                        </div>
                        <span style={{ fontSize: '11px', color: autoRefresh ? '#10b981' : '#6b7280' }}>
                            {autoRefresh ? `자동 새로고침 ON` : '자동 새로고침 OFF'}
                        </span>
                    </div>
                    <button
                        onClick={handleTestAll}
                        disabled={testingAll}
                        style={{
                            ...buttonStyle,
                            background: 'rgba(16, 185, 129, 0.2)',
                            color: testingAll ? '#6b7280' : '#10b981',
                            opacity: testingAll ? 0.7 : 1,
                        }}
                    >
                        {testingAll ? '⏳ 테스트 중...' : '🔄 전체 테스트'}
                    </button>
                    <button
                        onClick={() => setShowModal(true)}
                        style={{
                            ...buttonStyle,
                            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                            color: '#fff',
                        }}
                    >
                        + Provider 추가
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                gap: '12px', 
                marginBottom: '24px' 
            }}>
                <StatCard 
                    icon="🔌" 
                    label="전체 Provider" 
                    value={stats.total} 
                    color="#fff"
                />
                <StatCard 
                    icon="✅" 
                    label="활성화됨" 
                    value={stats.active} 
                    color="#10b981"
                    subValue={`${stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%`}
                />
                <StatCard 
                    icon="📡" 
                    label="온라인" 
                    value={stats.onlineCount} 
                    color={stats.onlineCount > 0 ? '#10b981' : '#6b7280'}
                    subValue={`테스트됨: ${stats.testedCount}`}
                />
                <StatCard 
                    icon="⚡" 
                    label="vLLM" 
                    value={stats.byType.vllm || 0} 
                    color="#10b981"
                />
                <StatCard 
                    icon="🦙" 
                    label="Ollama" 
                    value={stats.byType.ollama || 0} 
                    color="#f59e0b"
                />
                <StatCard 
                    icon="🤖" 
                    label="OpenAI" 
                    value={stats.byType.openai || 0} 
                    color="#6366f1"
                />
            </div>

            {/* Search & Filters */}
            <div style={{ 
                display: 'flex', 
                gap: '12px', 
                marginBottom: '20px',
                flexWrap: 'wrap',
                alignItems: 'center',
            }}>
                <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
                    <span style={{ 
                        position: 'absolute', 
                        left: '12px', 
                        top: '50%', 
                        transform: 'translateY(-50%)',
                        fontSize: '14px',
                        color: '#6b7280',
                    }}>🔍</span>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Provider 검색..."
                        style={{
                            ...inputStyle,
                            paddingLeft: '36px',
                        }}
                    />
                </div>
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    style={{ ...inputStyle, width: 'auto', minWidth: '120px' }}
                >
                    <option value="">모든 유형</option>
                    <option value="vllm">vLLM</option>
                    <option value="ollama">Ollama</option>
                    <option value="openai">OpenAI</option>
                </select>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{ ...inputStyle, width: 'auto', minWidth: '120px' }}
                >
                    <option value="">모든 상태</option>
                    <option value="active">활성화</option>
                    <option value="inactive">비활성화</option>
                </select>
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    style={{ ...inputStyle, width: 'auto', minWidth: '120px' }}
                >
                    <option value="priority">우선순위순</option>
                    <option value="name">이름순</option>
                    <option value="createdAt">최신순</option>
                </select>
            </div>

            {/* Bulk Actions */}
            {selectedProviders.size > 0 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    borderRadius: '10px',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                }}>
                    <span style={{ fontSize: '14px', color: '#a5b4fc' }}>
                        {selectedProviders.size}개 선택됨
                    </span>
                    <button
                        onClick={() => handleBulkToggle(true)}
                        style={{ ...buttonStyle, background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '6px 12px' }}
                    >
                        일괄 활성화
                    </button>
                    <button
                        onClick={() => handleBulkToggle(false)}
                        style={{ ...buttonStyle, background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '6px 12px' }}
                    >
                        일괄 비활성화
                    </button>
                    <button
                        onClick={() => setSelectedProviders(new Set())}
                        style={{ ...buttonStyle, background: 'transparent', color: '#6b7280', padding: '6px 12px' }}
                    >
                        선택 해제
                    </button>
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                    <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        margin: '0 auto 16px',
                        border: '3px solid rgba(99, 102, 241, 0.3)',
                        borderTopColor: '#6366f1',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                    }} />
                    로딩 중...
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            ) : filteredProviders.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '60px',
                    background: 'rgba(20, 20, 35, 0.6)',
                    borderRadius: '16px',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔌</div>
                    <div style={{ color: '#6b7280', marginBottom: '16px' }}>
                        {searchQuery || filterType || filterStatus 
                            ? '검색 결과가 없습니다.' 
                            : '등록된 AI Provider가 없습니다.'}
                    </div>
                    {!searchQuery && !filterType && !filterStatus && (
                        <button
                            onClick={() => setShowModal(true)}
                            style={{
                                ...buttonStyle,
                                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                color: '#fff',
                            }}
                        >
                            첫 Provider 추가하기
                        </button>
                    )}
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                    {/* Select All Header */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '8px 16px',
                        fontSize: '12px',
                        color: '#6b7280',
                    }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={selectedProviders.size === filteredProviders.length && filteredProviders.length > 0}
                                onChange={toggleSelectAll}
                                style={{ accentColor: '#6366f1' }}
                            />
                            전체 선택
                        </label>
                        <span>|</span>
                        <span>{filteredProviders.length}개 표시</span>
                    </div>

                    {filteredProviders.map((provider, index) => (
                        <div
                            key={provider.id}
                            style={{
                                padding: '16px 20px',
                                background: 'rgba(20, 20, 35, 0.6)',
                                borderRadius: '14px',
                                border: selectedProviders.has(provider.id) 
                                    ? '1px solid rgba(99, 102, 241, 0.5)'
                                    : '1px solid rgba(99, 102, 241, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                transition: 'all 0.2s ease',
                                opacity: provider.isActive ? 1 : 0.6,
                            }}
                        >
                            {/* Checkbox */}
                            <input
                                type="checkbox"
                                checked={selectedProviders.has(provider.id)}
                                onChange={() => toggleSelectProvider(provider.id)}
                                style={{ accentColor: '#6366f1' }}
                            />

                            {/* Priority Controls */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handlePriorityChange(provider.id, 'up'); }}
                                    disabled={provider.priority <= 1}
                                    style={{
                                        width: '24px',
                                        height: '18px',
                                        borderRadius: '4px 4px 0 0',
                                        border: 'none',
                                        background: provider.priority <= 1 ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.25)',
                                        color: provider.priority <= 1 ? '#4b5563' : '#a5b4fc',
                                        cursor: provider.priority <= 1 ? 'not-allowed' : 'pointer',
                                        fontSize: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    ▲
                                </button>
                                <div style={{
                                    width: '24px',
                                    height: '24px',
                                    background: 'rgba(99, 102, 241, 0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: '#a5b4fc',
                                }}>
                                    {provider.priority}
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handlePriorityChange(provider.id, 'down'); }}
                                    style={{
                                        width: '24px',
                                        height: '18px',
                                        borderRadius: '0 0 4px 4px',
                                        border: 'none',
                                        background: 'rgba(99, 102, 241, 0.25)',
                                        color: '#a5b4fc',
                                        cursor: 'pointer',
                                        fontSize: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    ▼
                                </button>
                            </div>

                            {/* Provider Icon */}
                            <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '10px',
                                background: providerGradients[provider.type],
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '20px',
                                flexShrink: 0,
                            }}>
                                {providerIcons[provider.type]}
                            </div>

                            {/* Provider Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>
                                        {provider.name}
                                    </span>
                                    <span style={{
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        fontWeight: 500,
                                        textTransform: 'uppercase',
                                        background: provider.isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                                        color: provider.isActive ? '#10b981' : '#6b7280',
                                    }}>
                                        {provider.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                    <span style={{
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        background: 'rgba(99, 102, 241, 0.2)',
                                        color: '#a5b4fc',
                                        textTransform: 'uppercase',
                                    }}>
                                        {provider.type}
                                    </span>
                                </div>
                                <div style={{ 
                                    fontSize: '12px', 
                                    color: '#6b7280',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}>
                                    {provider.endpoint}
                                </div>
                                {provider.description && (
                                    <div style={{ 
                                        fontSize: '11px', 
                                        color: '#4b5563',
                                        marginTop: '2px',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}>
                                        {provider.description}
                                    </div>
                                )}
                            </div>

                            {/* Test Result */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {testResults[provider.id] && (
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-end',
                                        gap: '2px',
                                    }}>
                                        <span style={{
                                            fontSize: '12px',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            background: testResults[provider.id].success 
                                                ? 'rgba(16, 185, 129, 0.2)' 
                                                : testResults[provider.id].message === '테스트 중...'
                                                ? 'rgba(99, 102, 241, 0.2)'
                                                : 'rgba(239, 68, 68, 0.2)',
                                            color: testResults[provider.id].success 
                                                ? '#10b981' 
                                                : testResults[provider.id].message === '테스트 중...'
                                                ? '#a5b4fc'
                                                : '#ef4444',
                                            fontWeight: 500,
                                        }}>
                                            {testResults[provider.id].success 
                                                ? `✓ ${testResults[provider.id].latencyMs}ms`
                                                : testResults[provider.id].message === '테스트 중...'
                                                ? '⏳ 테스트 중...'
                                                : '✗ 실패'}
                                        </span>
                                        {testResults[provider.id].testedAt && (
                                            <span style={{ fontSize: '10px', color: '#4b5563' }}>
                                                {new Date(testResults[provider.id].testedAt!).toLocaleTimeString('ko-KR')}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <button
                                    onClick={() => handleTest(provider.id)}
                                    style={{
                                        ...buttonStyle,
                                        background: 'rgba(99, 102, 241, 0.2)',
                                        color: '#a5b4fc',
                                        padding: '8px 14px',
                                    }}
                                >
                                    테스트
                                </button>
                                <button
                                    onClick={() => handleDiagnose(provider.id)}
                                    disabled={diagnosingId === provider.id}
                                    style={{
                                        ...buttonStyle,
                                        background: diagnosingId === provider.id ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.2)',
                                        color: diagnosingId === provider.id ? '#6b7280' : '#10b981',
                                        padding: '8px 14px',
                                    }}
                                >
                                    {diagnosingId === provider.id ? '⏳' : '🔍'} 진단
                                </button>
                                <button
                                    onClick={() => openInteractiveTest(provider)}
                                    style={{
                                        ...buttonStyle,
                                        background: 'rgba(245, 158, 11, 0.2)',
                                        color: '#fbbf24',
                                        padding: '8px 14px',
                                    }}
                                >
                                    💬 AI 채팅
                                </button>
                                <button
                                    onClick={() => handleDuplicate(provider)}
                                    style={{
                                        ...buttonStyle,
                                        background: 'rgba(168, 85, 247, 0.2)',
                                        color: '#c4b5fd',
                                        padding: '8px 14px',
                                    }}
                                >
                                    복제
                                </button>
                                <button
                                    onClick={() => openEditModal(provider)}
                                    style={{
                                        ...buttonStyle,
                                        background: 'rgba(59, 130, 246, 0.2)',
                                        color: '#93c5fd',
                                        padding: '8px 14px',
                                    }}
                                >
                                    편집
                                </button>
                                <button
                                    onClick={() => handleDelete(provider.id)}
                                    style={{
                                        ...buttonStyle,
                                        background: 'rgba(239, 68, 68, 0.2)',
                                        color: '#fca5a5',
                                        padding: '8px 14px',
                                    }}
                                >
                                    삭제
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div 
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.7)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        animation: 'fadeIn 0.2s ease',
                    }}
                    onClick={(e) => e.target === e.currentTarget && closeModal()}
                >
                    <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
                    <div style={{
                        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                        borderRadius: '20px',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        padding: '28px',
                        width: '480px',
                        maxHeight: '90vh',
                        overflow: 'auto',
                        animation: 'slideIn 0.2s ease',
                    }}>
                        <style>{`@keyframes slideIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
                        <h2 style={{ 
                            fontSize: '20px', 
                            fontWeight: 600, 
                            marginBottom: '20px',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                        }}>
                            <span style={{ fontSize: '24px' }}>
                                {editingProvider ? '✏️' : '➕'}
                            </span>
                            {editingProvider ? 'Provider 편집' : 'Provider 추가'}
                        </h2>

                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gap: '14px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#a0a0a0' }}>
                                        이름 *
                                    </label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        required
                                        style={inputStyle}
                                        placeholder="예: Local Ollama"
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#a0a0a0' }}>
                                        Provider 유형 *
                                    </label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {(['ollama', 'vllm', 'openai'] as const).map(type => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setForm({ ...form, type })}
                                                style={{
                                                    flex: 1,
                                                    padding: '10px',
                                                    borderRadius: '8px',
                                                    border: form.type === type 
                                                        ? '2px solid #6366f1' 
                                                        : '1px solid rgba(99, 102, 241, 0.3)',
                                                    background: form.type === type 
                                                        ? 'rgba(99, 102, 241, 0.2)' 
                                                        : 'rgba(30, 30, 50, 0.8)',
                                                    color: form.type === type ? '#a5b4fc' : '#6b7280',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    fontSize: '13px',
                                                    fontWeight: 500,
                                                    transition: 'all 0.2s ease',
                                                }}
                                            >
                                                <span>{providerIcons[type]}</span>
                                                {type.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#a0a0a0' }}>
                                        API Endpoint *
                                    </label>
                                    <input
                                        type="url"
                                        value={form.endpoint}
                                        onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                                        required
                                        style={inputStyle}
                                        placeholder={form.type === 'ollama' ? 'http://localhost:11434' : 'https://api.openai.com'}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#a0a0a0' }}>
                                        API Key {form.type === 'openai' ? '*' : '(선택)'}
                                    </label>
                                    <input
                                        type="password"
                                        value={form.apiKey}
                                        onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                                        style={inputStyle}
                                        placeholder={form.type === 'openai' ? 'sk-...' : 'API Key (선택)'}
                                        required={form.type === 'openai'}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#a0a0a0' }}>
                                            Timeout (ms)
                                        </label>
                                        <input
                                            type="number"
                                            value={form.timeoutMs}
                                            onChange={(e) => setForm({ ...form, timeoutMs: parseInt(e.target.value) })}
                                            style={inputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#a0a0a0' }}>
                                            Retry
                                        </label>
                                        <input
                                            type="number"
                                            value={form.retryCount}
                                            onChange={(e) => setForm({ ...form, retryCount: parseInt(e.target.value) })}
                                            style={inputStyle}
                                            min={0}
                                            max={10}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#a0a0a0' }}>
                                            우선순위
                                        </label>
                                        <input
                                            type="number"
                                            value={form.priority}
                                            onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) })}
                                            style={inputStyle}
                                            min={1}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#a0a0a0' }}>
                                        설명
                                    </label>
                                    <textarea
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }}
                                        placeholder="Provider에 대한 설명"
                                    />
                                </div>

                                <label style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '10px', 
                                    cursor: 'pointer',
                                    padding: '10px',
                                    background: 'rgba(30, 30, 50, 0.5)',
                                    borderRadius: '8px',
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={form.isActive}
                                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                                        style={{ accentColor: '#6366f1' }}
                                    />
                                    <span style={{ fontSize: '14px', color: form.isActive ? '#10b981' : '#6b7280' }}>
                                        {form.isActive ? '✅ 활성화됨' : '⏸️ 비활성화됨'}
                                    </span>
                                </label>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    style={{
                                        ...buttonStyle,
                                        background: 'rgba(107, 114, 128, 0.2)',
                                        color: '#9ca3af',
                                    }}
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        ...buttonStyle,
                                        background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                        color: '#fff',
                                    }}
                                >
                                    {editingProvider ? '저장' : '추가'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Diagnostic Result Modal */}
            {showDiagnosticModal && diagnosticResult && (
                <div 
                    onClick={() => setShowDiagnosticModal(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                    }}
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                            borderRadius: '16px',
                            padding: '28px',
                            width: '90%',
                            maxWidth: '600px',
                            maxHeight: '80vh',
                            overflow: 'auto',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
                        }}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div>
                                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                                    🔍 진단 결과
                                </h2>
                                <p style={{ fontSize: '13px', color: '#6b7280' }}>
                                    {diagnosticResult.providerName} ({diagnosticResult.providerType})
                                </p>
                            </div>
                            <button
                                onClick={() => setShowDiagnosticModal(false)}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    color: '#fca5a5',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Summary */}
                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            marginBottom: '20px',
                            padding: '16px',
                            background: diagnosticResult.summary.status === 'healthy' 
                                ? 'rgba(16, 185, 129, 0.1)' 
                                : diagnosticResult.summary.status === 'degraded' 
                                ? 'rgba(251, 191, 36, 0.1)' 
                                : 'rgba(239, 68, 68, 0.1)',
                            borderRadius: '12px',
                            border: `1px solid ${diagnosticResult.summary.status === 'healthy' 
                                ? 'rgba(16, 185, 129, 0.3)' 
                                : diagnosticResult.summary.status === 'degraded' 
                                ? 'rgba(251, 191, 36, 0.3)' 
                                : 'rgba(239, 68, 68, 0.3)'}`,
                        }}>
                            <div style={{ textAlign: 'center', flex: 1 }}>
                                <div style={{ fontSize: '28px', fontWeight: 700, color: '#10b981' }}>{diagnosticResult.summary.passed}</div>
                                <div style={{ fontSize: '11px', color: '#6b7280' }}>통과</div>
                            </div>
                            <div style={{ textAlign: 'center', flex: 1 }}>
                                <div style={{ fontSize: '28px', fontWeight: 700, color: '#ef4444' }}>{diagnosticResult.summary.failed}</div>
                                <div style={{ fontSize: '11px', color: '#6b7280' }}>실패</div>
                            </div>
                            <div style={{ textAlign: 'center', flex: 1 }}>
                                <div style={{ fontSize: '28px', fontWeight: 700, color: '#a5b4fc' }}>{diagnosticResult.summary.totalLatencyMs}ms</div>
                                <div style={{ fontSize: '11px', color: '#6b7280' }}>총 지연</div>
                            </div>
                            <div style={{ textAlign: 'center', flex: 1 }}>
                                <div style={{ 
                                    fontSize: '14px', 
                                    fontWeight: 700, 
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    background: diagnosticResult.summary.status === 'healthy' 
                                        ? 'rgba(16, 185, 129, 0.2)' 
                                        : diagnosticResult.summary.status === 'degraded' 
                                        ? 'rgba(251, 191, 36, 0.2)' 
                                        : 'rgba(239, 68, 68, 0.2)',
                                    color: diagnosticResult.summary.status === 'healthy' 
                                        ? '#10b981' 
                                        : diagnosticResult.summary.status === 'degraded' 
                                        ? '#fbbf24' 
                                        : '#ef4444',
                                }}>
                                    {diagnosticResult.summary.status === 'healthy' ? '✓ 정상' 
                                        : diagnosticResult.summary.status === 'degraded' ? '⚠ 일부 문제' 
                                        : '✗ 실패'}
                                </div>
                            </div>
                        </div>

                        {/* Test Results */}
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#a5b4fc', marginBottom: '12px' }}>테스트 결과</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {diagnosticResult.tests.map((test, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px 16px',
                                        background: test.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                                        borderRadius: '10px',
                                        border: `1px solid ${test.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                    }}>
                                        <span style={{ fontSize: '18px' }}>
                                            {test.success ? '✅' : '❌'}
                                        </span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>
                                                {test.name}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                                {test.message}
                                            </div>
                                        </div>
                                        <span style={{ 
                                            fontSize: '12px', 
                                            fontWeight: 600, 
                                            color: '#a5b4fc',
                                            padding: '4px 8px',
                                            background: 'rgba(99, 102, 241, 0.1)',
                                            borderRadius: '6px',
                                        }}>
                                            {test.latencyMs}ms
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Available Models */}
                        {diagnosticResult.availableModels.length > 0 && (
                            <div>
                                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#a5b4fc', marginBottom: '12px' }}>
                                    사용 가능한 모델 ({diagnosticResult.availableModels.length})
                                </h3>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {diagnosticResult.availableModels.map((model, idx) => (
                                        <span key={idx} style={{
                                            padding: '6px 12px',
                                            background: 'rgba(99, 102, 241, 0.1)',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            color: '#a5b4fc',
                                            fontFamily: 'monospace',
                                        }}>
                                            {model}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Endpoint Info */}
                        <div style={{ 
                            marginTop: '20px', 
                            padding: '12px 16px', 
                            background: 'rgba(99, 102, 241, 0.05)',
                            borderRadius: '8px',
                            fontSize: '11px',
                            color: '#6b7280',
                        }}>
                            <strong>Endpoint:</strong> {diagnosticResult.endpoint}<br/>
                            <strong>테스트 시간:</strong> {new Date(diagnosticResult.timestamp).toLocaleString('ko-KR')}
                        </div>
                    </div>
                </div>
            )}

            {/* Interactive Test Modal */}
            {showTestModal && testingProvider && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }} onClick={() => setShowTestModal(false)}>
                    <div style={{
                        background: 'linear-gradient(180deg, #1e1e3f 0%, #0f0f1a 100%)',
                        borderRadius: '16px', padding: '24px', width: '700px', maxHeight: '85vh', overflowY: 'auto',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                    }} onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ 
                                    fontSize: '28px',
                                    background: providerGradients[testingProvider.type],
                                    padding: '8px',
                                    borderRadius: '10px',
                                }}>{providerIcons[testingProvider.type]}</span>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
                                        {testingProvider.name} 테스트
                                    </h2>
                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{testingProvider.endpoint}</div>
                                </div>
                            </div>
                            <button onClick={() => setShowTestModal(false)} style={{ 
                                background: 'transparent', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer',
                            }}>×</button>
                        </div>

                        {/* Prompt Input */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '13px', color: '#a5b4fc', marginBottom: '8px', fontWeight: 600 }}>
                                💬 프롬프트
                            </label>
                            <textarea
                                value={testPrompt}
                                onChange={(e) => setTestPrompt(e.target.value)}
                                placeholder="AI에게 보낼 메시지를 입력하세요..."
                                style={{
                                    ...inputStyle,
                                    minHeight: '100px',
                                    resize: 'vertical',
                                }}
                            />
                        </div>

                        {/* Example Prompts */}
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>예시 프롬프트:</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {['안녕하세요!', '1부터 10까지 더하면?', 'SQL 쿼리 작성 도와줘', '오늘 날씨 어때?'].map(p => (
                                    <button 
                                        key={p} 
                                        onClick={() => setTestPrompt(p)}
                                        style={{
                                            padding: '6px 12px',
                                            background: 'rgba(99, 102, 241, 0.1)',
                                            border: '1px solid rgba(99, 102, 241, 0.3)',
                                            borderRadius: '6px',
                                            color: '#a5b4fc',
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                        }}
                                    >{p}</button>
                                ))}
                            </div>
                        </div>

                        {/* Run Button */}
                        <button
                            onClick={runInteractiveTest}
                            disabled={testLoading || !testPrompt.trim()}
                            style={{
                                ...buttonStyle,
                                width: '100%',
                                background: testLoading ? 'rgba(99, 102, 241, 0.3)' : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                color: '#fff',
                                padding: '14px',
                                fontSize: '15px',
                                fontWeight: 600,
                                marginBottom: '16px',
                            }}
                        >
                            {testLoading ? '⏳ AI 응답 대기 중...' : '🚀 테스트 실행'}
                        </button>

                        {/* Response Section */}
                        {(testResponse || testError || testLoading) && (
                            <div style={{
                                background: 'rgba(20, 20, 35, 0.8)',
                                borderRadius: '12px',
                                padding: '16px',
                                border: testError ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: testError ? '#fca5a5' : '#86efac' }}>
                                        {testError ? '❌ 에러' : '✅ AI 응답'}
                                    </span>
                                    {testLatency && (
                                        <span style={{ 
                                            fontSize: '11px', 
                                            padding: '4px 10px', 
                                            background: 'rgba(99, 102, 241, 0.2)', 
                                            borderRadius: '6px',
                                            color: '#a5b4fc',
                                        }}>
                                            ⏱ {testLatency}ms
                                        </span>
                                    )}
                                </div>
                                {testLoading ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280' }}>
                                        <div style={{ 
                                            width: '16px', height: '16px', borderRadius: '50%',
                                            border: '2px solid rgba(99, 102, 241, 0.3)', borderTopColor: '#6366f1',
                                            animation: 'spin 1s linear infinite',
                                        }} />
                                        응답 생성 중...
                                    </div>
                                ) : testError ? (
                                    <div style={{ color: '#fca5a5', fontSize: '13px' }}>{testError}</div>
                                ) : (
                                    <pre style={{ 
                                        margin: 0, 
                                        whiteSpace: 'pre-wrap', 
                                        wordBreak: 'break-word',
                                        fontSize: '13px',
                                        lineHeight: 1.6,
                                        color: '#e0e0e0',
                                        maxHeight: '300px',
                                        overflowY: 'auto',
                                    }}>{testResponse}</pre>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
