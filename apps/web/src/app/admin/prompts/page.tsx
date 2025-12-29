'use client';

import { useState, useEffect, useMemo } from 'react';

interface PromptTemplate {
    id: string;
    name: string;
    version: number;
    content: string;
    variables?: string;
    purpose: string;
    isActive: boolean;
    isApproved: boolean;
    approvedBy?: string;
    approvedAt?: string;
    description?: string;
    createdAt: string;
}

const API_BASE = 'http://localhost:3333/api';

const purposeConfig: Record<string, { icon: string; label: string; color: string }> = {
    nl2sql: { icon: '📊', label: 'NL2SQL', color: '#10b981' },
    explain: { icon: '💬', label: '설명', color: '#6366f1' },
    optimize: { icon: '⚡', label: '최적화', color: '#f59e0b' },
    validate: { icon: '✓', label: '검증', color: '#a855f7' },
};

export default function PromptsPage() {
    const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPrompt, setEditingPrompt] = useState<PromptTemplate | null>(null);
    const [testResult, setTestResult] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPurpose, setFilterPurpose] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());

    const [form, setForm] = useState({
        name: '',
        content: '',
        purpose: 'nl2sql',
        isActive: true,
        description: '',
    });

    const [testForm, setTestForm] = useState({
        schema: '',
        userQuery: '',
    });

    useEffect(() => {
        fetchPrompts();
    }, []);

    const fetchPrompts = async () => {
        try {
            const res = await fetch(`${API_BASE}/admin/prompts`);
            const data = await res.json();
            setPrompts(data);
        } catch (error) {
            console.error('Failed to fetch prompts:', error);
        } finally {
            setLoading(false);
        }
    };

    // Statistics
    const stats = useMemo(() => {
        const total = prompts.length;
        const approved = prompts.filter(p => p.isApproved).length;
        const pending = prompts.filter(p => !p.isApproved).length;
        const byPurpose = prompts.reduce((acc, p) => {
            acc[p.purpose] = (acc[p.purpose] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return { total, approved, pending, byPurpose };
    }, [prompts]);

    // Filtered prompts
    const filteredPrompts = useMemo(() => {
        let result = [...prompts];
        
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.content.toLowerCase().includes(query) ||
                p.description?.toLowerCase().includes(query)
            );
        }

        if (filterPurpose) {
            result = result.filter(p => p.purpose === filterPurpose);
        }

        if (filterStatus === 'approved') {
            result = result.filter(p => p.isApproved);
        } else if (filterStatus === 'pending') {
            result = result.filter(p => !p.isApproved);
        }

        return result;
    }, [prompts, searchQuery, filterPurpose, filterStatus]);

    // Highlight variables in prompt content
    const highlightVariables = (content: string) => {
        return content.replace(/\{\{(\w+)\}\}/g, '<span style="background: rgba(99, 102, 241, 0.3); color: #a5b4fc; padding: 1px 4px; border-radius: 3px; font-weight: 500;">{{$1}}</span>');
    };

    // Extract variables from content
    const extractVariables = (content: string): string[] => {
        const matches = content.match(/\{\{(\w+)\}\}/g) || [];
        return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingPrompt 
                ? `${API_BASE}/admin/prompts/${editingPrompt.id}`
                : `${API_BASE}/admin/prompts`;
            
            const res = await fetch(url, {
                method: editingPrompt ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });

            if (res.ok) {
                fetchPrompts();
                closeModal();
            }
        } catch (error) {
            console.error('Failed to save prompt:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            await fetch(`${API_BASE}/admin/prompts/${id}`, { method: 'DELETE' });
            fetchPrompts();
        } catch (error) {
            console.error('Failed to delete prompt:', error);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            await fetch(`${API_BASE}/admin/prompts/${id}/approve`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ approvedBy: 'admin' }),
            });
            fetchPrompts();
        } catch (error) {
            console.error('Failed to approve prompt:', error);
        }
    };

    const handleCopy = async (prompt: PromptTemplate) => {
        await navigator.clipboard.writeText(prompt.content);
        setCopiedId(prompt.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleDuplicate = (prompt: PromptTemplate) => {
        setEditingPrompt(null);
        setForm({
            name: `${prompt.name} (복사본)`,
            content: prompt.content,
            purpose: prompt.purpose,
            isActive: false,
            description: prompt.description || '',
        });
        setShowModal(true);
    };

    const handleTest = async () => {
        try {
            const res = await fetch(`${API_BASE}/admin/prompts/test`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: form.content,
                    schema: testForm.schema,
                    userQuery: testForm.userQuery,
                }),
            });
            const data = await res.json();
            setTestResult(data.rendered);
        } catch (error) {
            setTestResult('테스트 실패');
        }
    };

    const loadDefaultPrompt = async () => {
        try {
            const res = await fetch(`${API_BASE}/admin/prompts/default/nl2sql`);
            const data = await res.json();
            setForm({ ...form, content: data.content });
        } catch (error) {
            console.error('Failed to load default prompt:', error);
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedPrompts(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const openEditModal = (prompt: PromptTemplate) => {
        setEditingPrompt(prompt);
        setForm({
            name: prompt.name,
            content: prompt.content,
            purpose: prompt.purpose,
            isActive: prompt.isActive,
            description: prompt.description || '',
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingPrompt(null);
        setTestResult(null);
        setForm({ name: '', content: '', purpose: 'nl2sql', isActive: true, description: '' });
        setTestForm({ schema: '', userQuery: '' });
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
            padding: '14px 18px',
            background: 'rgba(20, 20, 35, 0.6)',
            borderRadius: '10px',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
        }}>
            <span style={{ fontSize: '22px' }}>{icon}</span>
            <div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>{label}</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color }}>{value}</div>
            </div>
        </div>
    );

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ 
                        fontSize: '28px', fontWeight: 700,
                        background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '8px',
                    }}>
                        Prompt Templates
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: '14px' }}>
                        NL2SQL 변환을 위한 프롬프트 템플릿을 관리합니다.
                    </p>
                </div>
                <button onClick={() => setShowModal(true)} style={{ ...buttonStyle, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', color: '#fff' }}>
                    + Prompt 추가
                </button>
            </div>

            {/* Statistics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                <StatCard icon="📝" label="전체 템플릿" value={stats.total} color="#fff" />
                <StatCard icon="✅" label="승인됨" value={stats.approved} color="#10b981" />
                <StatCard icon="⏳" label="승인 대기" value={stats.pending} color="#f59e0b" />
                {Object.entries(stats.byPurpose).slice(0, 3).map(([purpose, count]) => {
                    const config = purposeConfig[purpose] || { icon: '📄', label: purpose, color: '#6b7280' };
                    return <StatCard key={purpose} icon={config.icon} label={config.label} value={count} color={config.color} />;
                })}
            </div>

            {/* Search & Filters */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: '#6b7280' }}>🔍</span>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Prompt 검색..."
                        style={{ ...inputStyle, paddingLeft: '36px' }}
                    />
                </div>
                <select value={filterPurpose} onChange={(e) => setFilterPurpose(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: '120px' }}>
                    <option value="">모든 용도</option>
                    <option value="nl2sql">NL2SQL</option>
                    <option value="explain">설명</option>
                    <option value="optimize">최적화</option>
                    <option value="validate">검증</option>
                </select>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: '120px' }}>
                    <option value="">모든 상태</option>
                    <option value="approved">승인됨</option>
                    <option value="pending">승인 대기</option>
                </select>
            </div>

            {/* Results count */}
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                {filteredPrompts.length}개 템플릿 표시
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                    <div style={{ width: '40px', height: '40px', margin: '0 auto 16px', border: '3px solid rgba(99, 102, 241, 0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    로딩 중...
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            ) : filteredPrompts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(20, 20, 35, 0.6)', borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                    <div style={{ color: '#6b7280', marginBottom: '16px' }}>
                        {searchQuery || filterPurpose || filterStatus ? '검색 결과가 없습니다.' : '등록된 Prompt가 없습니다.'}
                    </div>
                    {!searchQuery && !filterPurpose && !filterStatus && (
                        <button onClick={() => setShowModal(true)} style={{ ...buttonStyle, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', color: '#fff' }}>
                            첫 Prompt 추가하기
                        </button>
                    )}
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '14px' }}>
                    {filteredPrompts.map((prompt) => {
                        const isExpanded = expandedPrompts.has(prompt.id);
                        const config = purposeConfig[prompt.purpose] || { icon: '📄', label: prompt.purpose, color: '#6b7280' };
                        const variables = extractVariables(prompt.content);
                        
                        return (
                            <div key={prompt.id} style={{ 
                                padding: '18px', 
                                background: 'rgba(20, 20, 35, 0.6)', 
                                borderRadius: '14px', 
                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                opacity: prompt.isActive ? 1 : 0.7,
                            }}>
                                {/* Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>{prompt.name}</span>
                                        <span style={{ fontSize: '11px', color: '#6b7280', padding: '2px 8px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '4px' }}>v{prompt.version}</span>
                                        <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '11px', background: `${config.color}15`, color: config.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {config.icon} {config.label}
                                        </span>
                                        {prompt.isApproved ? (
                                            <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '11px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
                                                ✓ 승인됨
                                            </span>
                                        ) : (
                                            <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '11px', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>
                                                ⏳ 승인 대기
                                            </span>
                                        )}
                                        {!prompt.isActive && (
                                            <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '11px', background: 'rgba(107, 114, 128, 0.2)', color: '#6b7280' }}>
                                                비활성
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        {!prompt.isApproved && (
                                            <button onClick={() => handleApprove(prompt.id)} style={{ ...buttonStyle, background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '6px 12px' }}>
                                                승인
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleCopy(prompt)} 
                                            style={{ ...buttonStyle, background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', padding: '6px 12px' }}
                                        >
                                            {copiedId === prompt.id ? '✓ 복사됨' : '📋 복사'}
                                        </button>
                                        <button onClick={() => handleDuplicate(prompt)} style={{ ...buttonStyle, background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '6px 12px' }}>
                                            복제
                                        </button>
                                        <button onClick={() => openEditModal(prompt)} style={{ ...buttonStyle, background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', padding: '6px 12px' }}>
                                            편집
                                        </button>
                                        <button onClick={() => handleDelete(prompt.id)} style={{ ...buttonStyle, background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '6px 12px' }}>
                                            삭제
                                        </button>
                                    </div>
                                </div>

                                {/* Variables */}
                                {variables.length > 0 && (
                                    <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '11px', color: '#6b7280' }}>변수:</span>
                                        {variables.map(v => (
                                            <span key={v} style={{
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                background: 'rgba(99, 102, 241, 0.2)',
                                                color: '#a5b4fc',
                                                fontFamily: 'monospace',
                                            }}>
                                                {`{{${v}}}`}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Content Preview */}
                                <div 
                                    onClick={() => toggleExpand(prompt.id)}
                                    style={{ 
                                        padding: '14px', 
                                        background: 'rgba(10, 10, 20, 0.5)', 
                                        borderRadius: '8px', 
                                        cursor: 'pointer',
                                    }}
                                >
                                    <pre 
                                        style={{ 
                                            fontSize: '12px', 
                                            color: '#a0a0a0',
                                            whiteSpace: 'pre-wrap',
                                            maxHeight: isExpanded ? 'none' : '100px',
                                            overflow: 'hidden',
                                            margin: 0,
                                            fontFamily: 'monospace',
                                        }}
                                        dangerouslySetInnerHTML={{ __html: highlightVariables(
                                            isExpanded ? prompt.content : prompt.content.substring(0, 300) + (prompt.content.length > 300 ? '...' : '')
                                        )}}
                                    />
                                    <div style={{ 
                                        marginTop: '8px', 
                                        fontSize: '11px', 
                                        color: '#6366f1',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                    }}>
                                        {isExpanded ? '▲ 접기' : '▼ 전체 보기'}
                                        <span style={{ color: '#6b7280' }}>• {prompt.content.length} 자</span>
                                    </div>
                                </div>

                                {/* Approval info */}
                                {prompt.isApproved && prompt.approvedBy && (
                                    <div style={{ marginTop: '10px', fontSize: '11px', color: '#6b7280' }}>
                                        승인: {prompt.approvedBy} • {prompt.approvedAt ? new Date(prompt.approvedAt).toLocaleString('ko-KR') : ''}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div 
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
                    onClick={(e) => e.target === e.currentTarget && closeModal()}
                >
                    <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderRadius: '20px', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '28px', width: '900px', maxHeight: '90vh', overflow: 'auto' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px', color: '#fff' }}>
                            {editingPrompt ? '✏️ Prompt 편집' : '➕ Prompt 추가'}
                        </h2>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <form onSubmit={handleSubmit}>
                                <div style={{ display: 'grid', gap: '14px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#a0a0a0' }}>이름 *</label>
                                            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required style={inputStyle} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#a0a0a0' }}>용도</label>
                                            <select value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} style={inputStyle}>
                                                <option value="nl2sql">NL2SQL</option>
                                                <option value="explain">설명</option>
                                                <option value="optimize">최적화</option>
                                                <option value="validate">검증</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <label style={{ fontSize: '13px', color: '#a0a0a0' }}>프롬프트 내용 *</label>
                                            <button type="button" onClick={loadDefaultPrompt} style={{ ...buttonStyle, background: 'transparent', color: '#6366f1', padding: '4px 8px', fontSize: '12px' }}>
                                                📥 기본 템플릿
                                            </button>
                                        </div>
                                        <textarea
                                            value={form.content}
                                            onChange={(e) => setForm({ ...form, content: e.target.value })}
                                            required
                                            style={{ ...inputStyle, minHeight: '280px', resize: 'vertical', fontFamily: 'monospace', fontSize: '13px' }}
                                            placeholder="프롬프트 내용을 입력하세요.&#10;&#10;사용 가능한 변수:&#10;{{schema}} - 테이블 스키마&#10;{{userQuery}} - 사용자 질문&#10;{{context}} - 추가 컨텍스트"
                                        />
                                        {/* Variable preview in editor */}
                                        {extractVariables(form.content).length > 0 && (
                                            <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '11px', color: '#6b7280' }}>감지된 변수:</span>
                                                {extractVariables(form.content).map(v => (
                                                    <span key={v} style={{
                                                        padding: '2px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '11px',
                                                        background: 'rgba(16, 185, 129, 0.2)',
                                                        color: '#10b981',
                                                        fontFamily: 'monospace',
                                                    }}>
                                                        {`{{${v}}}`}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px', background: 'rgba(30, 30, 50, 0.5)', borderRadius: '8px' }}>
                                        <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} style={{ accentColor: '#6366f1' }} />
                                        <span style={{ fontSize: '14px', color: form.isActive ? '#10b981' : '#6b7280' }}>
                                            {form.isActive ? '✅ 활성화됨' : '⏸️ 비활성화됨'}
                                        </span>
                                    </label>

                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button type="button" onClick={closeModal} style={{ ...buttonStyle, background: 'rgba(107, 114, 128, 0.2)', color: '#9ca3af' }}>취소</button>
                                        <button type="submit" style={{ ...buttonStyle, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', color: '#fff' }}>
                                            {editingPrompt ? '저장' : '추가'}
                                        </button>
                                    </div>
                                </div>
                            </form>

                            <div>
                                <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '14px', color: '#fff' }}>🧪 렌더링 테스트</h3>
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#a0a0a0' }}>스키마 (schema)</label>
                                        <textarea value={testForm.schema} onChange={(e) => setTestForm({ ...testForm, schema: e.target.value })} style={{ ...inputStyle, minHeight: '80px', fontFamily: 'monospace' }} placeholder="CREATE TABLE users (id INT, name VARCHAR(100)...);" />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#a0a0a0' }}>사용자 질문 (userQuery)</label>
                                        <input type="text" value={testForm.userQuery} onChange={(e) => setTestForm({ ...testForm, userQuery: e.target.value })} style={inputStyle} placeholder="예: 최근 주문 목록 보여줘" />
                                    </div>
                                    <button type="button" onClick={handleTest} style={{ ...buttonStyle, background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
                                        ▶ 렌더링 테스트
                                    </button>
                                    {testResult && (
                                        <div>
                                            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>결과:</div>
                                            <pre 
                                                style={{ 
                                                    padding: '14px', 
                                                    background: 'rgba(10, 10, 20, 0.5)', 
                                                    borderRadius: '8px', 
                                                    fontSize: '12px', 
                                                    color: '#a0a0a0', 
                                                    whiteSpace: 'pre-wrap', 
                                                    maxHeight: '200px', 
                                                    overflow: 'auto', 
                                                    margin: 0,
                                                    fontFamily: 'monospace',
                                                }}
                                                dangerouslySetInnerHTML={{ __html: highlightVariables(testResult) }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
