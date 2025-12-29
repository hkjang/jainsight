'use client';

import { useState, useEffect, useMemo } from 'react';

interface AiProvider {
    id: string;
    name: string;
    type: string;
}

interface AiModel {
    id: string;
    name: string;
    version?: string;
    modelId: string;
    providerId: string;
    provider?: AiProvider;
    purpose: 'sql' | 'explain' | 'general';
    maxTokens: number;
    temperature: number;
    topP: number;
    systemPrompt?: string;
    isActive: boolean;
    description?: string;
    createdAt: string;
}

const API_BASE = '/api';

const purposeConfig: Record<string, { color: string; icon: string; label: string }> = {
    sql: { color: '#10b981', icon: '📊', label: 'SQL 생성' },
    explain: { color: '#6366f1', icon: '💬', label: '설명' },
    general: { color: '#f59e0b', icon: '🤖', label: '일반' },
};

export default function AiModelsPage() {
    const [models, setModels] = useState<AiModel[]>([]);
    const [providers, setProviders] = useState<AiProvider[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingModel, setEditingModel] = useState<AiModel | null>(null);
    const [testResults, setTestResults] = useState<Record<string, { success: boolean; response?: string; latencyMs: number }>>({});
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterProvider, setFilterProvider] = useState('');
    const [filterPurpose, setFilterPurpose] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const [form, setForm] = useState({
        name: '',
        version: '',
        modelId: '',
        providerId: '',
        purpose: 'sql' as 'sql' | 'explain' | 'general',
        maxTokens: 4096,
        temperature: 0.1,
        topP: 0.9,
        systemPrompt: '',
        isActive: true,
        description: '',
    });

    useEffect(() => {
        fetchData();
    }, []);

    // Auto refresh every 30 seconds
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => fetchData(), 30000);
        return () => clearInterval(interval);
    }, [autoRefresh]);

    // Toast helper
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchData = async () => {
        try {
            const [modelsRes, providersRes] = await Promise.all([
                fetch(`${API_BASE}/admin/ai-models`),
                fetch(`${API_BASE}/admin/ai-providers`),
            ]);
            setModels(await modelsRes.json());
            setProviders(await providersRes.json());
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Statistics
    const stats = useMemo(() => {
        const total = models.length;
        const active = models.filter(m => m.isActive).length;
        const byPurpose = models.reduce((acc, m) => {
            acc[m.purpose] = (acc[m.purpose] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const byProvider = models.reduce((acc, m) => {
            const providerName = m.provider?.name || 'Unknown';
            acc[providerName] = (acc[providerName] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        return { total, active, byPurpose, byProvider };
    }, [models]);

    // Filtered models
    const filteredModels = useMemo(() => {
        let result = [...models];

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(m => 
                m.name.toLowerCase().includes(query) ||
                m.modelId.toLowerCase().includes(query) ||
                m.description?.toLowerCase().includes(query)
            );
        }

        if (filterProvider) {
            result = result.filter(m => m.providerId === filterProvider);
        }

        if (filterPurpose) {
            result = result.filter(m => m.purpose === filterPurpose);
        }

        if (filterStatus === 'active') {
            result = result.filter(m => m.isActive);
        } else if (filterStatus === 'inactive') {
            result = result.filter(m => !m.isActive);
        }

        return result;
    }, [models, searchQuery, filterProvider, filterPurpose, filterStatus]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingModel 
                ? `${API_BASE}/admin/ai-models/${editingModel.id}`
                : `${API_BASE}/admin/ai-models`;
            
            const res = await fetch(url, {
                method: editingModel ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });

            if (res.ok) {
                fetchData();
                closeModal();
            }
        } catch (error) {
            console.error('Failed to save model:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            await fetch(`${API_BASE}/admin/ai-models/${id}`, { method: 'DELETE' });
            fetchData();
        } catch (error) {
            console.error('Failed to delete model:', error);
        }
    };

    const handleTest = async (id: string) => {
        setTestResults(prev => ({ ...prev, [id]: { success: false, response: '테스트 중...', latencyMs: 0 } }));
        try {
            const res = await fetch(`${API_BASE}/admin/ai-models/${id}/test`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: 'SELECT 1' }),
            });
            const data = await res.json();
            setTestResults(prev => ({ ...prev, [id]: data }));
        } catch (error) {
            setTestResults(prev => ({ ...prev, [id]: { success: false, response: '테스트 실패', latencyMs: 0 } }));
        }
    };

    const handleDuplicateModel = (model: AiModel) => {
        setEditingModel(null);
        setForm({
            name: `${model.name} (복사본)`,
            version: model.version || '',
            modelId: model.modelId,
            providerId: model.providerId,
            purpose: model.purpose,
            maxTokens: model.maxTokens,
            temperature: model.temperature,
            topP: model.topP,
            systemPrompt: model.systemPrompt || '',
            isActive: false,
            description: model.description || '',
        });
        setShowModal(true);
    };

    const openEditModal = (model: AiModel) => {
        setEditingModel(model);
        setForm({
            name: model.name,
            version: model.version || '',
            modelId: model.modelId,
            providerId: model.providerId,
            purpose: model.purpose,
            maxTokens: model.maxTokens,
            temperature: model.temperature,
            topP: model.topP,
            systemPrompt: model.systemPrompt || '',
            isActive: model.isActive,
            description: model.description || '',
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingModel(null);
        setForm({
            name: '',
            version: '',
            modelId: '',
            providerId: '',
            purpose: 'sql',
            maxTokens: 4096,
            temperature: 0.1,
            topP: 0.9,
            systemPrompt: '',
            isActive: true,
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

    const StatCard = ({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) => (
        <div style={{
            padding: '16px 20px',
            background: 'rgba(20, 20, 35, 0.6)',
            borderRadius: '12px',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
        }}>
            <div style={{
                width: '42px',
                height: '42px',
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
                <div style={{ fontSize: '12px', color: '#6b7280' }}>{label}</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color }}>{value}</div>
            </div>
        </div>
    );

    return (
        <div>
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
                        AI Models
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: '14px' }}>
                        SQL 생성, 설명 등 용도별 AI 모델을 관리합니다.
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    style={{
                        ...buttonStyle,
                        background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                        color: '#fff',
                    }}
                >
                    + Model 추가
                </button>
            </div>

            {/* Statistics */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
                gap: '12px', 
                marginBottom: '24px' 
            }}>
                <StatCard icon="🤖" label="전체 모델" value={stats.total} color="#fff" />
                <StatCard icon="✅" label="활성화" value={stats.active} color="#10b981" />
                <StatCard icon="📊" label="SQL 생성" value={stats.byPurpose.sql || 0} color="#10b981" />
                <StatCard icon="💬" label="설명" value={stats.byPurpose.explain || 0} color="#6366f1" />
                <StatCard icon="🔧" label="일반" value={stats.byPurpose.general || 0} color="#f59e0b" />
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
                        placeholder="모델 검색..."
                        style={{ ...inputStyle, paddingLeft: '36px' }}
                    />
                </div>
                <select
                    value={filterProvider}
                    onChange={(e) => setFilterProvider(e.target.value)}
                    style={{ ...inputStyle, width: 'auto', minWidth: '140px' }}
                >
                    <option value="">모든 Provider</option>
                    {providers.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                <select
                    value={filterPurpose}
                    onChange={(e) => setFilterPurpose(e.target.value)}
                    style={{ ...inputStyle, width: 'auto', minWidth: '120px' }}
                >
                    <option value="">모든 용도</option>
                    <option value="sql">SQL 생성</option>
                    <option value="explain">설명</option>
                    <option value="general">일반</option>
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
                
                {/* View Toggle */}
                <div style={{ display: 'flex', gap: '4px', background: 'rgba(30, 30, 50, 0.8)', borderRadius: '8px', padding: '4px' }}>
                    <button
                        onClick={() => setViewMode('grid')}
                        style={{
                            ...buttonStyle,
                            padding: '6px 12px',
                            background: viewMode === 'grid' ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                            color: viewMode === 'grid' ? '#a5b4fc' : '#6b7280',
                        }}
                    >
                        ⊞
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        style={{
                            ...buttonStyle,
                            padding: '6px 12px',
                            background: viewMode === 'list' ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                            color: viewMode === 'list' ? '#a5b4fc' : '#6b7280',
                        }}
                    >
                        ☰
                    </button>
                </div>
            </div>

            {/* Results count */}
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                {filteredModels.length}개 모델 표시
            </div>

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
            ) : filteredModels.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '60px',
                    background: 'rgba(20, 20, 35, 0.6)',
                    borderRadius: '16px',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
                    <div style={{ color: '#6b7280', marginBottom: '16px' }}>
                        {searchQuery || filterProvider || filterPurpose || filterStatus
                            ? '검색 결과가 없습니다.'
                            : '등록된 AI Model이 없습니다.'}
                    </div>
                    {!searchQuery && !filterProvider && !filterPurpose && !filterStatus && (
                        <button
                            onClick={() => setShowModal(true)}
                            style={{
                                ...buttonStyle,
                                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                color: '#fff',
                            }}
                        >
                            첫 Model 추가하기
                        </button>
                    )}
                </div>
            ) : viewMode === 'grid' ? (
                <div style={{ display: 'grid', gap: '14px', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))' }}>
                    {filteredModels.map((model) => {
                        const purposeInfo = purposeConfig[model.purpose] || purposeConfig.general;
                        return (
                            <div
                                key={model.id}
                                style={{
                                    padding: '18px',
                                    background: 'rgba(20, 20, 35, 0.6)',
                                    borderRadius: '14px',
                                    border: '1px solid rgba(99, 102, 241, 0.2)',
                                    opacity: model.isActive ? 1 : 0.7,
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                {/* Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>
                                                {model.name}
                                            </span>
                                            {model.version && (
                                                <span style={{ 
                                                    fontSize: '11px', 
                                                    color: '#6b7280',
                                                    padding: '2px 6px',
                                                    background: 'rgba(99, 102, 241, 0.1)',
                                                    borderRadius: '4px',
                                                }}>
                                                    v{model.version}
                                                </span>
                                            )}
                                            {!model.isActive && (
                                                <span style={{
                                                    fontSize: '10px',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    background: 'rgba(107, 114, 128, 0.2)',
                                                    color: '#6b7280',
                                                }}>
                                                    비활성
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                            {model.modelId}
                                        </div>
                                    </div>
                                    <div style={{
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        fontSize: '11px',
                                        fontWeight: 500,
                                        background: `${purposeInfo.color}15`,
                                        color: purposeInfo.color,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        height: 'fit-content',
                                    }}>
                                        {purposeInfo.icon} {purposeInfo.label}
                                    </div>
                                </div>

                                {/* Provider */}
                                {model.provider && (
                                    <div style={{ 
                                        fontSize: '12px', 
                                        color: '#a5b4fc', 
                                        marginBottom: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                    }}>
                                        <span style={{ color: '#6b7280' }}>Provider:</span>
                                        {model.provider.name}
                                    </div>
                                )}

                                {/* Parameters */}
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(3, 1fr)', 
                                    gap: '8px', 
                                    marginBottom: '14px',
                                    padding: '12px',
                                    background: 'rgba(10, 10, 20, 0.5)',
                                    borderRadius: '8px',
                                }}>
                                    <div>
                                        <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>Temperature</div>
                                        <div style={{ fontSize: '14px', color: '#e0e0e0', fontWeight: 500 }}>{model.temperature}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>Top-P</div>
                                        <div style={{ fontSize: '14px', color: '#e0e0e0', fontWeight: 500 }}>{model.topP}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>Max Tokens</div>
                                        <div style={{ fontSize: '14px', color: '#e0e0e0', fontWeight: 500 }}>{model.maxTokens.toLocaleString()}</div>
                                    </div>
                                </div>

                                {/* Test Result */}
                                {testResults[model.id] && (
                                    <div style={{
                                        padding: '10px',
                                        marginBottom: '12px',
                                        background: testResults[model.id].success 
                                            ? 'rgba(16, 185, 129, 0.1)' 
                                            : testResults[model.id].response === '테스트 중...'
                                            ? 'rgba(99, 102, 241, 0.1)'
                                            : 'rgba(239, 68, 68, 0.1)',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        color: testResults[model.id].success 
                                            ? '#10b981' 
                                            : testResults[model.id].response === '테스트 중...'
                                            ? '#a5b4fc'
                                            : '#ef4444',
                                    }}>
                                        {testResults[model.id].success 
                                            ? `✓ 성공 • ${testResults[model.id].latencyMs}ms`
                                            : testResults[model.id].response === '테스트 중...'
                                            ? '⏳ 테스트 중...'
                                            : `✗ ${testResults[model.id].response}`}
                                    </div>
                                )}

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => handleTest(model.id)}
                                        style={{
                                            ...buttonStyle,
                                            flex: 1,
                                            background: 'rgba(99, 102, 241, 0.2)',
                                            color: '#a5b4fc',
                                            padding: '8px',
                                        }}
                                    >
                                        🧪 테스트
                                    </button>
                                    <button
                                        onClick={() => handleDuplicateModel(model)}
                                        style={{
                                            ...buttonStyle,
                                            background: 'rgba(16, 185, 129, 0.2)',
                                            color: '#10b981',
                                            padding: '8px 12px',
                                        }}
                                    >
                                        📋
                                    </button>
                                    <button
                                        onClick={() => openEditModal(model)}
                                        style={{
                                            ...buttonStyle,
                                            background: 'rgba(59, 130, 246, 0.2)',
                                            color: '#93c5fd',
                                            padding: '8px 12px',
                                        }}
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={() => handleDelete(model.id)}
                                        style={{
                                            ...buttonStyle,
                                            background: 'rgba(239, 68, 68, 0.2)',
                                            color: '#fca5a5',
                                            padding: '8px 12px',
                                        }}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* List View */
                <div style={{ 
                    background: 'rgba(20, 20, 35, 0.6)', 
                    borderRadius: '14px', 
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    overflow: 'hidden',
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>모델</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Provider</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>용도</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>상태</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Max Tokens</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>액션</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredModels.map((model) => {
                                const purposeInfo = purposeConfig[model.purpose] || purposeConfig.general;
                                return (
                                    <tr key={model.id} style={{ borderTop: '1px solid rgba(99, 102, 241, 0.1)' }}>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ fontSize: '14px', color: '#fff', fontWeight: 500 }}>{model.name}</div>
                                            <div style={{ fontSize: '11px', color: '#6b7280' }}>{model.modelId}</div>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#a5b4fc' }}>
                                            {model.provider?.name || '-'}
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                fontSize: '11px',
                                                background: `${purposeInfo.color}15`,
                                                color: purposeInfo.color,
                                            }}>
                                                {purposeInfo.icon} {purposeInfo.label}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                fontSize: '11px',
                                                background: model.isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                                                color: model.isActive ? '#10b981' : '#6b7280',
                                            }}>
                                                {model.isActive ? '활성' : '비활성'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#e0e0e0', textAlign: 'right' }}>
                                            {model.maxTokens.toLocaleString()}
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                <button onClick={() => handleTest(model.id)} style={{ ...buttonStyle, background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', padding: '4px 8px', fontSize: '12px' }}>테스트</button>
                                                <button onClick={() => openEditModal(model)} style={{ ...buttonStyle, background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', padding: '4px 8px', fontSize: '12px' }}>편집</button>
                                                <button onClick={() => handleDelete(model.id)} style={{ ...buttonStyle, background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '4px 8px', fontSize: '12px' }}>삭제</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
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
                    }}
                    onClick={(e) => e.target === e.currentTarget && closeModal()}
                >
                    <div style={{
                        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                        borderRadius: '20px',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        padding: '28px',
                        width: '540px',
                        maxHeight: '90vh',
                        overflow: 'auto',
                    }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px', color: '#fff' }}>
                            {editingModel ? '✏️ Model 편집' : '➕ Model 추가'}
                        </h2>

                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gap: '14px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
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
                                            placeholder="예: SQL Generator"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#a0a0a0' }}>
                                            버전
                                        </label>
                                        <input
                                            type="text"
                                            value={form.version}
                                            onChange={(e) => setForm({ ...form, version: e.target.value })}
                                            style={inputStyle}
                                            placeholder="1.0"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#a0a0a0' }}>
                                        Provider *
                                    </label>
                                    <select
                                        value={form.providerId}
                                        onChange={(e) => setForm({ ...form, providerId: e.target.value })}
                                        required
                                        style={inputStyle}
                                    >
                                        <option value="">선택하세요</option>
                                        {providers.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#a0a0a0' }}>
                                        Model ID *
                                    </label>
                                    <input
                                        type="text"
                                        value={form.modelId}
                                        onChange={(e) => setForm({ ...form, modelId: e.target.value })}
                                        required
                                        style={inputStyle}
                                        placeholder="codellama:7b, gpt-4, etc."
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#a0a0a0' }}>
                                        용도
                                    </label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {(['sql', 'explain', 'general'] as const).map(purpose => {
                                            const info = purposeConfig[purpose];
                                            return (
                                                <button
                                                    key={purpose}
                                                    type="button"
                                                    onClick={() => setForm({ ...form, purpose })}
                                                    style={{
                                                        flex: 1,
                                                        padding: '10px',
                                                        borderRadius: '8px',
                                                        border: form.purpose === purpose 
                                                            ? `2px solid ${info.color}` 
                                                            : '1px solid rgba(99, 102, 241, 0.3)',
                                                        background: form.purpose === purpose 
                                                            ? `${info.color}20` 
                                                            : 'rgba(30, 30, 50, 0.8)',
                                                        color: form.purpose === purpose ? info.color : '#6b7280',
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
                                                    <span>{info.icon}</span>
                                                    {info.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#a0a0a0' }}>
                                            Temperature
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="2"
                                            value={form.temperature}
                                            onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                                            style={inputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#a0a0a0' }}>
                                            Top-P
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="1"
                                            value={form.topP}
                                            onChange={(e) => setForm({ ...form, topP: parseFloat(e.target.value) })}
                                            style={inputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#a0a0a0' }}>
                                            Max Tokens
                                        </label>
                                        <input
                                            type="number"
                                            min="128"
                                            value={form.maxTokens}
                                            onChange={(e) => setForm({ ...form, maxTokens: parseInt(e.target.value) })}
                                            style={inputStyle}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#a0a0a0' }}>
                                        System Prompt
                                    </label>
                                    <textarea
                                        value={form.systemPrompt}
                                        onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                                        style={{ ...inputStyle, minHeight: '90px', resize: 'vertical', fontFamily: 'monospace' }}
                                        placeholder="You are an expert SQL assistant..."
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
                                <button type="button" onClick={closeModal} style={{ ...buttonStyle, background: 'rgba(107, 114, 128, 0.2)', color: '#9ca3af' }}>
                                    취소
                                </button>
                                <button type="submit" style={{ ...buttonStyle, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', color: '#fff' }}>
                                    {editingModel ? '저장' : '추가'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
