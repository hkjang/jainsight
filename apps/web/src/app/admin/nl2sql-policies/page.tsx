'use client';

import { useState, useEffect, useMemo } from 'react';

interface Nl2SqlPolicy {
    id: string;
    name: string;
    isActive: boolean;
    blockedKeywords?: string;
    allowedTables?: string;
    deniedColumns?: string;
    maxResultRows: number;
    requireApproval: boolean;
    blockDdl: boolean;
    blockDml: boolean;
    enableInjectionCheck: boolean;
    enablePiiMasking: boolean;
    description?: string;
    priority: number;
    createdAt: string;
}

const API_BASE = 'http://localhost:3333/api';

const presetTemplates = [
    { 
        name: '읽기 전용 (보수적)', 
        icon: '🔒', 
        preset: { blockDdl: true, blockDml: true, enableInjectionCheck: true, enablePiiMasking: true, maxResultRows: 100 }
    },
    { 
        name: '분석 용도 (표준)', 
        icon: '📊', 
        preset: { blockDdl: true, blockDml: true, enableInjectionCheck: true, enablePiiMasking: true, maxResultRows: 1000 }
    },
    { 
        name: '개발 환경 (유연)', 
        icon: '🛠️', 
        preset: { blockDdl: true, blockDml: false, enableInjectionCheck: true, enablePiiMasking: false, maxResultRows: 10000 }
    },
    { 
        name: '관리자 (전체 권한)', 
        icon: '👑', 
        preset: { blockDdl: false, blockDml: false, enableInjectionCheck: true, enablePiiMasking: false, maxResultRows: 100000 }
    },
];

export default function Nl2SqlPoliciesPage() {
    const [policies, setPolicies] = useState<Nl2SqlPolicy[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<Nl2SqlPolicy | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [comparing, setComparing] = useState<string[]>([]);

    const [form, setForm] = useState({
        name: '',
        blockedKeywords: '',
        allowedTables: '',
        deniedColumns: '',
        maxResultRows: 1000,
        requireApproval: false,
        blockDdl: true,
        blockDml: false,
        enableInjectionCheck: true,
        enablePiiMasking: true,
        description: '',
        priority: 1,
    });

    useEffect(() => { fetchPolicies(); }, []);

    const fetchPolicies = async () => {
        try {
            const res = await fetch(`${API_BASE}/admin/nl2sql-policies`);
            setPolicies(await res.json());
        } catch (error) {
            console.error('Failed to fetch policies:', error);
        } finally {
            setLoading(false);
        }
    };

    // Statistics
    const stats = useMemo(() => {
        const total = policies.length;
        const active = policies.filter(p => p.isActive).length;
        const withDdlBlock = policies.filter(p => p.blockDdl).length;
        const withDmlBlock = policies.filter(p => p.blockDml).length;
        const withPiiMasking = policies.filter(p => p.enablePiiMasking).length;
        return { total, active, withDdlBlock, withDmlBlock, withPiiMasking };
    }, [policies]);

    // Filtered policies
    const filteredPolicies = useMemo(() => {
        if (!searchQuery) return policies;
        const query = searchQuery.toLowerCase();
        return policies.filter(p => 
            p.name.toLowerCase().includes(query) ||
            p.description?.toLowerCase().includes(query)
        );
    }, [policies, searchQuery]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...form,
                blockedKeywords: form.blockedKeywords ? form.blockedKeywords.split(',').map(s => s.trim()) : [],
                allowedTables: form.allowedTables ? form.allowedTables.split(',').map(s => s.trim()) : [],
                deniedColumns: form.deniedColumns ? form.deniedColumns.split(',').map(s => s.trim()) : [],
            };

            const url = editingPolicy ? `${API_BASE}/admin/nl2sql-policies/${editingPolicy.id}` : `${API_BASE}/admin/nl2sql-policies`;
            const res = await fetch(url, {
                method: editingPolicy ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                fetchPolicies();
                closeModal();
            }
        } catch (error) {
            console.error('Failed to save policy:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            await fetch(`${API_BASE}/admin/nl2sql-policies/${id}`, { method: 'DELETE' });
            fetchPolicies();
        } catch (error) {
            console.error('Failed to delete policy:', error);
        }
    };

    const handleActivate = async (id: string) => {
        try {
            await fetch(`${API_BASE}/admin/nl2sql-policies/${id}/activate`, { method: 'POST' });
            fetchPolicies();
        } catch (error) {
            console.error('Failed to activate policy:', error);
        }
    };

    const handleDuplicate = (policy: Nl2SqlPolicy) => {
        setEditingPolicy(null);
        setForm({
            name: `${policy.name} (복사본)`,
            blockedKeywords: policy.blockedKeywords ? JSON.parse(policy.blockedKeywords).join(', ') : '',
            allowedTables: policy.allowedTables ? JSON.parse(policy.allowedTables).join(', ') : '',
            deniedColumns: policy.deniedColumns ? JSON.parse(policy.deniedColumns).join(', ') : '',
            maxResultRows: policy.maxResultRows,
            requireApproval: policy.requireApproval,
            blockDdl: policy.blockDdl,
            blockDml: policy.blockDml,
            enableInjectionCheck: policy.enableInjectionCheck,
            enablePiiMasking: policy.enablePiiMasking,
            description: policy.description || '',
            priority: policy.priority + 1,
        });
        setShowModal(true);
    };

    const handleExportPolicy = (policy: Nl2SqlPolicy) => {
        const json = JSON.stringify(policy, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `policy-${policy.name.replace(/\s+/g, '-')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const applyPreset = (preset: typeof presetTemplates[0]['preset']) => {
        setForm({ ...form, ...preset });
    };

    const toggleCompare = (id: string) => {
        setComparing(prev => 
            prev.includes(id) 
                ? prev.filter(x => x !== id) 
                : prev.length < 2 ? [...prev, id] : [prev[1], id]
        );
    };

    const openEditModal = (policy: Nl2SqlPolicy) => {
        setEditingPolicy(policy);
        setForm({
            name: policy.name,
            blockedKeywords: policy.blockedKeywords ? JSON.parse(policy.blockedKeywords).join(', ') : '',
            allowedTables: policy.allowedTables ? JSON.parse(policy.allowedTables).join(', ') : '',
            deniedColumns: policy.deniedColumns ? JSON.parse(policy.deniedColumns).join(', ') : '',
            maxResultRows: policy.maxResultRows,
            requireApproval: policy.requireApproval,
            blockDdl: policy.blockDdl,
            blockDml: policy.blockDml,
            enableInjectionCheck: policy.enableInjectionCheck,
            enablePiiMasking: policy.enablePiiMasking,
            description: policy.description || '',
            priority: policy.priority,
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingPolicy(null);
        setForm({
            name: '', blockedKeywords: '', allowedTables: '', deniedColumns: '',
            maxResultRows: 1000, requireApproval: false, blockDdl: true, blockDml: false,
            enableInjectionCheck: true, enablePiiMasking: true, description: '', priority: 1,
        });
    };

    const inputStyle = { width: '100%', padding: '10px 14px', background: 'rgba(30, 30, 50, 0.8)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '8px', color: '#e0e0e0', fontSize: '14px', outline: 'none' };
    const buttonStyle = { padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 500 as const, transition: 'all 0.2s ease' };
    const checkboxLabelStyle = { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#a0a0a0' };

    const StatCard = ({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) => (
        <div style={{ padding: '14px 18px', background: 'rgba(20, 20, 35, 0.6)', borderRadius: '10px', border: '1px solid rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '22px' }}>{icon}</span>
            <div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>{label}</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color }}>{value}</div>
            </div>
        </div>
    );

    // Comparison Table
    const ComparisonTable = () => {
        if (comparing.length !== 2) return null;
        const [p1, p2] = comparing.map(id => policies.find(p => p.id === id)!).filter(Boolean);
        if (!p1 || !p2) return null;

        const fields = [
            { key: 'blockDdl', label: 'DDL 차단' },
            { key: 'blockDml', label: 'DML 차단' },
            { key: 'enableInjectionCheck', label: 'Injection 검사' },
            { key: 'enablePiiMasking', label: 'PII 마스킹' },
            { key: 'maxResultRows', label: '최대 행 수' },
            { key: 'requireApproval', label: '승인 필요' },
        ];

        return (
            <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>📊 정책 비교</h3>
                    <button onClick={() => setComparing([])} style={{ ...buttonStyle, padding: '4px 10px', background: 'rgba(107, 114, 128, 0.2)', color: '#9ca3af', fontSize: '12px' }}>닫기</button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'rgba(99, 102, 241, 0.15)' }}>
                            <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#6b7280' }}>항목</th>
                            <th style={{ padding: '10px', textAlign: 'center', fontSize: '12px', color: '#a5b4fc' }}>{p1.name}</th>
                            <th style={{ padding: '10px', textAlign: 'center', fontSize: '12px', color: '#a5b4fc' }}>{p2.name}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {fields.map(f => {
                            const v1 = (p1 as any)[f.key];
                            const v2 = (p2 as any)[f.key];
                            const isDiff = v1 !== v2;
                            return (
                                <tr key={f.key} style={{ borderTop: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                    <td style={{ padding: '10px', fontSize: '13px', color: '#e0e0e0' }}>{f.label}</td>
                                    <td style={{ padding: '10px', textAlign: 'center', fontSize: '13px', color: isDiff ? '#f59e0b' : '#6b7280' }}>
                                        {typeof v1 === 'boolean' ? (v1 ? '✓' : '✗') : v1}
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'center', fontSize: '13px', color: isDiff ? '#f59e0b' : '#6b7280' }}>
                                        {typeof v2 === 'boolean' ? (v2 ? '✓' : '✗') : v2}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 700, background: 'linear-gradient(90deg, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' }}>
                        NL2SQL 정책
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: '14px' }}>SQL 생성 시 적용되는 보안 및 실행 정책을 관리합니다.</p>
                </div>
                <button onClick={() => setShowModal(true)} style={{ ...buttonStyle, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', color: '#fff' }}>
                    + 정책 추가
                </button>
            </div>

            {/* Statistics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                <StatCard icon="📋" label="전체 정책" value={stats.total} color="#fff" />
                <StatCard icon="✅" label="활성화" value={stats.active} color="#10b981" />
                <StatCard icon="🛡️" label="DDL 차단" value={stats.withDdlBlock} color="#ef4444" />
                <StatCard icon="⚡" label="DML 차단" value={stats.withDmlBlock} color="#f59e0b" />
                <StatCard icon="🔒" label="PII 마스킹" value={stats.withPiiMasking} color="#a855f7" />
            </div>

            {/* Search & Filter */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: '1', maxWidth: '320px' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: '#6b7280' }}>🔍</span>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="정책 검색..."
                        style={{ ...inputStyle, paddingLeft: '36px' }}
                    />
                </div>
                {comparing.length > 0 && (
                    <span style={{ fontSize: '12px', color: '#a5b4fc' }}>
                        비교 선택: {comparing.length}/2
                    </span>
                )}
            </div>

            {/* Comparison */}
            <ComparisonTable />

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                    <div style={{ width: '40px', height: '40px', margin: '0 auto 16px', border: '3px solid rgba(99, 102, 241, 0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    로딩 중...
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            ) : filteredPolicies.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(20, 20, 35, 0.6)', borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                    <div style={{ color: '#6b7280', marginBottom: '16px' }}>
                        {searchQuery ? '검색 결과가 없습니다.' : '등록된 정책이 없습니다.'}
                    </div>
                    {!searchQuery && (
                        <button onClick={() => setShowModal(true)} style={{ ...buttonStyle, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', color: '#fff' }}>
                            첫 정책 추가하기
                        </button>
                    )}
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '14px' }}>
                    {filteredPolicies.map((policy) => (
                        <div 
                            key={policy.id} 
                            style={{ 
                                padding: '18px', 
                                background: 'rgba(20, 20, 35, 0.6)', 
                                borderRadius: '14px', 
                                border: policy.isActive 
                                    ? '2px solid rgba(16, 185, 129, 0.5)' 
                                    : comparing.includes(policy.id) 
                                    ? '2px solid rgba(99, 102, 241, 0.5)' 
                                    : '1px solid rgba(99, 102, 241, 0.2)',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>{policy.name}</span>
                                    <span style={{ fontSize: '11px', color: '#6b7280', padding: '2px 8px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '4px' }}>
                                        우선순위: {policy.priority}
                                    </span>
                                    {policy.isActive && (
                                        <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '11px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
                                            ✓ 활성
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button 
                                        onClick={() => toggleCompare(policy.id)} 
                                        style={{ 
                                            ...buttonStyle, 
                                            background: comparing.includes(policy.id) ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.15)', 
                                            color: '#a5b4fc', 
                                            padding: '5px 10px', 
                                            fontSize: '12px' 
                                        }}
                                    >
                                        {comparing.includes(policy.id) ? '✓ 비교 중' : '비교'}
                                    </button>
                                    {!policy.isActive && (
                                        <button onClick={() => handleActivate(policy.id)} style={{ ...buttonStyle, background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '5px 10px', fontSize: '12px' }}>
                                            활성화
                                        </button>
                                    )}
                                    <button onClick={() => handleDuplicate(policy)} style={{ ...buttonStyle, background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', padding: '5px 10px', fontSize: '12px' }}>
                                        복제
                                    </button>
                                    <button onClick={() => handleExportPolicy(policy)} style={{ ...buttonStyle, background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '5px 10px', fontSize: '12px' }}>
                                        📤
                                    </button>
                                    <button onClick={() => openEditModal(policy)} style={{ ...buttonStyle, background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', padding: '5px 10px', fontSize: '12px' }}>
                                        편집
                                    </button>
                                    <button onClick={() => handleDelete(policy.id)} style={{ ...buttonStyle, background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '5px 10px', fontSize: '12px' }}>
                                        삭제
                                    </button>
                                </div>
                            </div>

                            {policy.description && (
                                <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>{policy.description}</div>
                            )}

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', background: policy.blockDdl ? 'rgba(239, 68, 68, 0.2)' : 'rgba(75, 85, 99, 0.2)', color: policy.blockDdl ? '#fca5a5' : '#6b7280' }}>
                                    DDL {policy.blockDdl ? '차단' : '허용'}
                                </span>
                                <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', background: policy.blockDml ? 'rgba(245, 158, 11, 0.2)' : 'rgba(75, 85, 99, 0.2)', color: policy.blockDml ? '#fcd34d' : '#6b7280' }}>
                                    DML {policy.blockDml ? '차단' : '허용'}
                                </span>
                                {policy.enableInjectionCheck && <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc' }}>Injection 검사</span>}
                                {policy.enablePiiMasking && <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', background: 'rgba(168, 85, 247, 0.2)', color: '#c4b5fd' }}>PII 마스킹</span>}
                                <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', background: 'rgba(75, 85, 99, 0.3)', color: '#9ca3af' }}>Max: {policy.maxResultRows.toLocaleString()} rows</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div 
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
                    onClick={(e) => e.target === e.currentTarget && closeModal()}
                >
                    <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderRadius: '20px', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '28px', width: '640px', maxHeight: '90vh', overflow: 'auto' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px', color: '#fff' }}>
                            {editingPolicy ? '✏️ 정책 편집' : '➕ 정책 추가'}
                        </h2>

                        {/* Preset Templates */}
                        {!editingPolicy && (
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>빠른 템플릿:</div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {presetTemplates.map((t, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => applyPreset(t.preset)}
                                            style={{
                                                ...buttonStyle,
                                                padding: '8px 14px',
                                                fontSize: '12px',
                                                background: 'rgba(99, 102, 241, 0.15)',
                                                color: '#a5b4fc',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                            }}
                                        >
                                            <span>{t.icon}</span> {t.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gap: '14px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#a0a0a0' }}>정책 이름 *</label>
                                        <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required style={inputStyle} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#a0a0a0' }}>우선순위</label>
                                        <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) })} style={inputStyle} min={1} />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#a0a0a0' }}>설명</label>
                                    <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={inputStyle} placeholder="정책에 대한 간단한 설명" />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#a0a0a0' }}>차단 키워드 (쉼표 구분)</label>
                                    <input type="text" value={form.blockedKeywords} onChange={(e) => setForm({ ...form, blockedKeywords: e.target.value })} style={inputStyle} placeholder="DROP, DELETE, TRUNCATE" />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#a0a0a0' }}>금지 컬럼 (PII)</label>
                                    <input type="text" value={form.deniedColumns} onChange={(e) => setForm({ ...form, deniedColumns: e.target.value })} style={inputStyle} placeholder="ssn, password, credit_card" />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#a0a0a0' }}>최대 결과 행 수</label>
                                    <input type="number" value={form.maxResultRows} onChange={(e) => setForm({ ...form, maxResultRows: parseInt(e.target.value) })} style={inputStyle} min={1} />
                                </div>

                                <div style={{ padding: '16px', background: 'rgba(10, 10, 20, 0.5)', borderRadius: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <label style={checkboxLabelStyle}>
                                        <input type="checkbox" checked={form.blockDdl} onChange={(e) => setForm({ ...form, blockDdl: e.target.checked })} style={{ accentColor: '#6366f1' }} />
                                        🛡️ DDL 차단 (CREATE, DROP 등)
                                    </label>
                                    <label style={checkboxLabelStyle}>
                                        <input type="checkbox" checked={form.blockDml} onChange={(e) => setForm({ ...form, blockDml: e.target.checked })} style={{ accentColor: '#6366f1' }} />
                                        ⚡ DML 차단 (INSERT, UPDATE 등)
                                    </label>
                                    <label style={checkboxLabelStyle}>
                                        <input type="checkbox" checked={form.enableInjectionCheck} onChange={(e) => setForm({ ...form, enableInjectionCheck: e.target.checked })} style={{ accentColor: '#6366f1' }} />
                                        🔍 SQL Injection 검사
                                    </label>
                                    <label style={checkboxLabelStyle}>
                                        <input type="checkbox" checked={form.enablePiiMasking} onChange={(e) => setForm({ ...form, enablePiiMasking: e.target.checked })} style={{ accentColor: '#6366f1' }} />
                                        🔒 PII 컬럼 마스킹
                                    </label>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={closeModal} style={{ ...buttonStyle, background: 'rgba(107, 114, 128, 0.2)', color: '#9ca3af' }}>취소</button>
                                <button type="submit" style={{ ...buttonStyle, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', color: '#fff' }}>{editingPolicy ? '저장' : '추가'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
