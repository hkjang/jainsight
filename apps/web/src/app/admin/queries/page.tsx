'use client';

import { useEffect, useState, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface QueryPolicy {
    id: string;
    name: string;
    description?: string;
    type: 'ddl_block' | 'where_required' | 'limit_required' | 'risk_threshold' | 'time_window';
    riskScore: number;
    action: 'block' | 'warn' | 'audit' | 'allow';
    isActive: boolean;
    conditions?: Record<string, unknown>;
    createdAt: string;
}

interface QueryExecution {
    id: string;
    rawQuery: string;
    executedBy: string;
    status: 'allowed' | 'blocked' | 'warned';
    riskScore: number;
    connectionName?: string;
    executedAt: string;
    blockedReason?: string;
}

interface PolicyStats {
    totalExecutions: number;
    blockedCount: number;
    highRiskCount: number;
    avgRiskScore: number;
}

export default function QueryPoliciesAdminPage() {
    const [policies, setPolicies] = useState<QueryPolicy[]>([]);
    const [executions, setExecutions] = useState<QueryExecution[]>([]);
    const [stats, setStats] = useState<PolicyStats>({ totalExecutions: 0, blockedCount: 0, highRiskCount: 0, avgRiskScore: 0 });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'policies' | 'executions' | 'library' | 'test'>('policies');
    
    // Create policy modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPolicyName, setNewPolicyName] = useState('');
    const [newPolicyType, setNewPolicyType] = useState<QueryPolicy['type']>('ddl_block');
    const [newPolicyRisk, setNewPolicyRisk] = useState(50);
    const [newPolicyAction, setNewPolicyAction] = useState<QueryPolicy['action']>('block');
    
    // Test query
    const [testQuery, setTestQuery] = useState('');
    const [testResult, setTestResult] = useState<{ valid: boolean; risks: string[]; riskScore: number } | null>(null);

    const fetchPolicies = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/query-policies`);
            if (response.ok) {
                const data = await response.json();
                setPolicies(data);
            } else {
                setPolicies([
                    { id: '1', name: 'DDL 차단', type: 'ddl_block', riskScore: 100, action: 'block', isActive: true, createdAt: new Date().toISOString() },
                    { id: '2', name: 'WHERE 필수', type: 'where_required', riskScore: 80, action: 'block', isActive: true, createdAt: new Date().toISOString() },
                    { id: '3', name: 'LIMIT 강제', type: 'limit_required', riskScore: 60, action: 'warn', isActive: true, createdAt: new Date().toISOString() },
                    { id: '4', name: '고위험 차단', type: 'risk_threshold', riskScore: 85, action: 'block', isActive: false, createdAt: new Date().toISOString() },
                    { id: '5', name: '업무시간 제한', description: '09:00-18:00 외 실행 금지', type: 'time_window', riskScore: 70, action: 'block', isActive: true, createdAt: new Date().toISOString() },
                ]);
            }
        } catch (error) {
            console.error('Failed to fetch policies:', error);
        }
    }, []);

    const fetchExecutions = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/query-policies/executions?limit=50`);
            if (response.ok) {
                const data = await response.json();
                setExecutions(data);
            } else {
                setExecutions([
                    { id: '1', rawQuery: 'SELECT * FROM users WHERE id = 1', executedBy: 'admin', status: 'allowed', riskScore: 20, connectionName: 'production', executedAt: new Date().toISOString() },
                    { id: '2', rawQuery: 'DELETE FROM logs', executedBy: 'user1', status: 'blocked', riskScore: 95, connectionName: 'staging', executedAt: new Date().toISOString(), blockedReason: 'WHERE 절 필수' },
                    { id: '3', rawQuery: 'DROP TABLE temp_data', executedBy: 'developer', status: 'blocked', riskScore: 100, connectionName: 'production', executedAt: new Date().toISOString(), blockedReason: 'DDL 차단됨' },
                    { id: '4', rawQuery: 'SELECT COUNT(*) FROM orders', executedBy: 'analyst', status: 'allowed', riskScore: 15, connectionName: 'analytics', executedAt: new Date().toISOString() },
                    { id: '5', rawQuery: 'UPDATE users SET status = "active"', executedBy: 'admin', status: 'warned', riskScore: 65, connectionName: 'production', executedAt: new Date().toISOString() },
                ]);
            }
        } catch (error) {
            console.error('Failed to fetch executions:', error);
        }
    }, []);

    const fetchStats = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/query-policies/stats`);
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            } else {
                setStats({ totalExecutions: 1245, blockedCount: 87, highRiskCount: 156, avgRiskScore: 38 });
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPolicies();
        fetchExecutions();
        fetchStats();
    }, [fetchPolicies, fetchExecutions, fetchStats]);

    const handleCreatePolicy = async () => {
        if (!newPolicyName) return;
        
        try {
            const response = await fetch(`${API_URL}/query-policies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newPolicyName,
                    type: newPolicyType,
                    riskScore: newPolicyRisk,
                    action: newPolicyAction
                })
            });
            
            if (response.ok) {
                fetchPolicies();
                setShowCreateModal(false);
                setNewPolicyName('');
            }
        } catch (error) {
            console.error('Failed to create policy:', error);
        }
    };

    const handleTogglePolicy = async (policyId: string, isActive: boolean) => {
        try {
            const response = await fetch(`${API_URL}/query-policies/${policyId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !isActive })
            });
            
            if (response.ok) {
                fetchPolicies();
            }
        } catch (error) {
            console.error('Failed to toggle policy:', error);
        }
    };

    const handleTestQuery = async () => {
        if (!testQuery) return;
        
        try {
            const response = await fetch(`${API_URL}/query-policies/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: testQuery })
            });
            
            if (response.ok) {
                const data = await response.json();
                setTestResult(data);
            } else {
                // Mock result
                const hasDDL = /^(DROP|CREATE|ALTER|TRUNCATE)/i.test(testQuery.trim());
                const hasWhere = /WHERE/i.test(testQuery);
                const hasLimit = /LIMIT/i.test(testQuery);
                const isDelete = /^DELETE/i.test(testQuery.trim());
                const isUpdate = /^UPDATE/i.test(testQuery.trim());
                
                const risks: string[] = [];
                let riskScore = 10;
                
                if (hasDDL) { risks.push('DDL 문 감지'); riskScore += 80; }
                if ((isDelete || isUpdate) && !hasWhere) { risks.push('WHERE 절 누락'); riskScore += 60; }
                if (!hasLimit && !hasDDL) { risks.push('LIMIT 없음 (권장)'); riskScore += 10; }
                
                setTestResult({
                    valid: !hasDDL && (hasWhere || (!isDelete && !isUpdate)),
                    risks,
                    riskScore: Math.min(riskScore, 100)
                });
            }
        } catch (error) {
            console.error('Failed to validate query:', error);
        }
    };

    const containerStyle: React.CSSProperties = { padding: '24px', maxWidth: '1400px', margin: '0 auto' };
    const cardStyle: React.CSSProperties = { background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' };
    const buttonStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: 'white' };
    const inputStyle: React.CSSProperties = { padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none', width: '100%' };
    const tabStyle = (active: boolean): React.CSSProperties => ({ padding: '12px 24px', fontSize: '14px', fontWeight: active ? '600' : '400', color: active ? '#3B82F6' : '#6B7280', background: 'none', border: 'none', borderBottom: active ? '2px solid #3B82F6' : '2px solid transparent', cursor: 'pointer' });
    const modalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
    const modalStyle: React.CSSProperties = { background: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '450px' };

    const typeLabels: Record<string, string> = { ddl_block: 'DDL 차단', where_required: 'WHERE 필수', limit_required: 'LIMIT 필수', risk_threshold: '위험도 기준', time_window: '시간 제한' };
    const actionColors: Record<string, string> = { block: '#EF4444', warn: '#F59E0B', audit: '#3B82F6', allow: '#10B981' };
    const statusColors: Record<string, string> = { allowed: '#10B981', blocked: '#EF4444', warned: '#F59E0B' };

    if (loading) {
        return <div style={{ ...containerStyle, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}><div style={{ fontSize: '18px', color: '#6B7280' }}>로딩 중...</div></div>;
    }

    return (
        <div style={containerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1F2937' }}>📋 쿼리 정책</h1>
                    <p style={{ color: '#6B7280', marginTop: '4px' }}>쿼리 실행 정책 및 위험도 관리</p>
                </div>
                <button style={buttonStyle} onClick={() => setShowCreateModal(true)}>+ 정책 생성</button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {[
                    { label: '총 실행', value: stats.totalExecutions, icon: '📊', color: '#3B82F6' },
                    { label: '차단됨', value: stats.blockedCount, icon: '🚫', color: '#EF4444' },
                    { label: '고위험', value: stats.highRiskCount, icon: '⚠️', color: '#F59E0B' },
                    { label: '평균 위험도', value: `${stats.avgRiskScore}%`, icon: '📈', color: '#10B981' },
                ].map(stat => (
                    <div key={stat.label} style={{ ...cardStyle, padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{stat.icon}</div>
                            <div>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
                                <div style={{ fontSize: '12px', color: '#6B7280' }}>{stat.label}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div style={{ ...cardStyle, marginBottom: '24px' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB' }}>
                    {[
                        { id: 'policies', label: '정책 목록' },
                        { id: 'executions', label: '실행 이력' },
                        { id: 'test', label: '🧪 쿼리 테스트' },
                        { id: 'library', label: '쿼리 라이브러리' }
                    ].map(tab => (
                        <button key={tab.id} style={tabStyle(activeTab === tab.id)} onClick={() => setActiveTab(tab.id as typeof activeTab)}>{tab.label}</button>
                    ))}
                </div>
            </div>

            {activeTab === 'policies' && (
                <div style={cardStyle}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#F9FAFB' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>정책명</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>유형</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>위험도</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>액션</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>상태</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>작업</th>
                            </tr>
                        </thead>
                        <tbody>
                            {policies.map(policy => (
                                <tr key={policy.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ fontWeight: '500' }}>{policy.name}</div>
                                        {policy.description && <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>{policy.description}</div>}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{ padding: '4px 8px', background: '#F3F4F6', borderRadius: '4px', fontSize: '12px' }}>{typeLabels[policy.type]}</span>
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            <div style={{ width: '60px', height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{
                                                    width: `${policy.riskScore}%`,
                                                    height: '100%',
                                                    background: policy.riskScore >= 80 ? '#EF4444' : policy.riskScore >= 50 ? '#F59E0B' : '#10B981',
                                                    borderRadius: '3px'
                                                }} />
                                            </div>
                                            <span style={{ fontSize: '12px', fontWeight: '500' }}>{policy.riskScore}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center' }}>
                                        <span style={{ padding: '4px 8px', background: `${actionColors[policy.action]}15`, color: actionColors[policy.action], borderRadius: '4px', fontSize: '12px', fontWeight: '500' }}>
                                            {policy.action.toUpperCase()}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => handleTogglePolicy(policy.id, policy.isActive)}
                                            style={{
                                                width: '48px',
                                                height: '24px',
                                                borderRadius: '12px',
                                                border: 'none',
                                                background: policy.isActive ? '#10B981' : '#D1D5DB',
                                                cursor: 'pointer',
                                                position: 'relative',
                                                transition: 'background 0.2s'
                                            }}
                                        >
                                            <span style={{
                                                position: 'absolute',
                                                top: '2px',
                                                left: policy.isActive ? '26px' : '2px',
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '50%',
                                                background: 'white',
                                                transition: 'left 0.2s',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                            }} />
                                        </button>
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>
                                        <button style={{ padding: '4px 12px', background: '#EEF2FF', color: '#4F46E5', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', marginRight: '8px' }}>편집</button>
                                        <button style={{ padding: '4px 12px', background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>삭제</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'executions' && (
                <div style={cardStyle}>
                    <div style={{ padding: '16px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '600' }}>최근 실행 이력</span>
                        <button style={{ ...buttonStyle, padding: '6px 12px', fontSize: '12px', background: '#F3F4F6', color: '#374151' }} onClick={() => fetchExecutions()}>🔄 새로고침</button>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#F9FAFB' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>쿼리</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>실행자</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>상태</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>위험도</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>연결</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>시간</th>
                            </tr>
                        </thead>
                        <tbody>
                            {executions.map(exec => (
                                <tr key={exec.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                                    <td style={{ padding: '12px 16px', maxWidth: '400px' }}>
                                        <code style={{ display: 'block', padding: '8px', background: '#F3F4F6', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {exec.rawQuery}
                                        </code>
                                        {exec.blockedReason && (
                                            <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px' }}>⚠️ {exec.blockedReason}</div>
                                        )}
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>{exec.executedBy}</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                        <span style={{ padding: '4px 8px', background: `${statusColors[exec.status]}15`, color: statusColors[exec.status], borderRadius: '4px', fontSize: '11px', fontWeight: '500' }}>
                                            {exec.status === 'allowed' ? '허용' : exec.status === 'blocked' ? '차단' : '경고'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                        <span style={{ padding: '2px 8px', background: exec.riskScore >= 70 ? '#FEE2E2' : exec.riskScore >= 40 ? '#FEF3C7' : '#D1FAE5', color: exec.riskScore >= 70 ? '#DC2626' : exec.riskScore >= 40 ? '#D97706' : '#059669', borderRadius: '4px', fontSize: '12px', fontWeight: '500' }}>
                                            {exec.riskScore}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6B7280' }}>{exec.connectionName}</td>
                                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#6B7280', textAlign: 'right' }}>{new Date(exec.executedAt).toLocaleString('ko-KR')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'test' && (
                <div style={cardStyle}>
                    <div style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>🧪 쿼리 위험도 테스트</h3>
                        <p style={{ color: '#6B7280', marginBottom: '20px' }}>쿼리를 실행하기 전에 위험도를 미리 확인합니다.</p>
                        
                        <textarea
                            style={{ ...inputStyle, minHeight: '120px', fontFamily: 'monospace', marginBottom: '16px' }}
                            value={testQuery}
                            onChange={e => setTestQuery(e.target.value)}
                            placeholder="SELECT * FROM users WHERE id = 1;"
                        />
                        
                        <button style={buttonStyle} onClick={handleTestQuery}>🔍 검증하기</button>

                        {testResult && (
                            <div style={{
                                marginTop: '24px',
                                padding: '20px',
                                background: testResult.valid ? '#D1FAE5' : '#FEE2E2',
                                borderRadius: '12px',
                                border: `2px solid ${testResult.valid ? '#10B981' : '#EF4444'}`
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                    <span style={{ fontSize: '32px' }}>{testResult.valid ? '✅' : '🚫'}</span>
                                    <div>
                                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: testResult.valid ? '#059669' : '#DC2626' }}>
                                            {testResult.valid ? '실행 가능' : '정책 위반'}
                                        </div>
                                        <div style={{ fontSize: '14px', color: '#6B7280' }}>위험도 점수: {testResult.riskScore}</div>
                                    </div>
                                </div>
                                
                                {testResult.risks.length > 0 && (
                                    <div style={{ background: 'white', borderRadius: '8px', padding: '12px' }}>
                                        <div style={{ fontWeight: '500', marginBottom: '8px', fontSize: '14px' }}>감지된 위험:</div>
                                        {testResult.risks.map((risk, i) => (
                                            <div key={i} style={{ padding: '4px 0', fontSize: '13px', color: '#374151' }}>• {risk}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'library' && (
                <div style={{ ...cardStyle, padding: '48px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
                    <div style={{ fontSize: '18px', fontWeight: '500', color: '#1F2937', marginBottom: '8px' }}>쿼리 라이브러리</div>
                    <div style={{ color: '#6B7280' }}>승인된 쿼리 템플릿을 관리합니다 (개발 중)</div>
                </div>
            )}

            {/* Create Policy Modal */}
            {showCreateModal && (
                <div style={modalOverlayStyle} onClick={() => setShowCreateModal(false)}>
                    <div style={modalStyle} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>정책 생성</h2>
                        
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>정책명 *</label>
                            <input type="text" style={inputStyle} value={newPolicyName} onChange={e => setNewPolicyName(e.target.value)} placeholder="예: DDL 차단" />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>유형</label>
                            <select style={inputStyle} value={newPolicyType} onChange={e => setNewPolicyType(e.target.value as QueryPolicy['type'])}>
                                {Object.entries(typeLabels).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>위험도 점수 (0-100)</label>
                            <input type="number" style={inputStyle} value={newPolicyRisk} onChange={e => setNewPolicyRisk(Number(e.target.value))} min={0} max={100} />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>액션</label>
                            <select style={inputStyle} value={newPolicyAction} onChange={e => setNewPolicyAction(e.target.value as QueryPolicy['action'])}>
                                <option value="block">차단</option>
                                <option value="warn">경고</option>
                                <option value="audit">감사</option>
                                <option value="allow">허용</option>
                            </select>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button style={{ ...buttonStyle, background: '#F3F4F6', color: '#374151' }} onClick={() => setShowCreateModal(false)}>취소</button>
                            <button style={buttonStyle} onClick={handleCreatePolicy}>생성</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
