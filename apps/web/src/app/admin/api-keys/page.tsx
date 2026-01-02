'use client';

import { useEffect, useState, useCallback } from 'react';
import { darkTheme, darkStyles } from '../../../components/admin/AdminUtils';

const API_URL = '/api';

interface ApiKey {
    id: string;
    name: string;
    keyPrefix: string;
    userId: string;
    userName?: string;
    userEmail?: string;
    scopes: string[];
    allowedIps?: string[];
    rateLimit: number;
    usageCount: number;
    isActive: boolean;
    expiresAt?: string;
    lastUsedAt?: string;
    createdAt: string;
    revokedAt?: string;
    revokedBy?: string;
    revokeReason?: string;
}

interface Stats {
    totalKeys: number;
    activeKeys: number;
    expiredKeys: number;
    revokedKeys: number;
    totalCalls: number;
}

interface UsageRecord {
    id: string;
    apiKeyId: string;
    endpoint: string;
    method: string;
    statusCode: number;
    durationMs: number;
    calledAt: string;
}

const scopeLabels: Record<string, string> = {
    'query:*': '모든 쿼리',
    'query:read': '쿼리 조회',
    'query:execute': '쿼리 실행',
    'data:read': '데이터 조회',
    'schema:read': '스키마 조회',
    'admin:*': '관리자 전체',
};
const availableScopes = ['query:*', 'query:read', 'query:execute', 'data:read', 'schema:read'];

const getKeyStatus = (key: ApiKey): 'active' | 'revoked' | 'expired' => {
    if (!key.isActive || key.revokedAt) return 'revoked';
    if (key.expiresAt && new Date(key.expiresAt) <= new Date()) return 'expired';
    return 'active';
};

const statusColors: Record<string, string> = { active: '#10B981', revoked: '#EF4444', expired: '#6B7280' };
const statusLabels: Record<string, string> = { active: '활성', revoked: '취소됨', expired: '만료됨' };

export default function ApiKeysAdminPage() {
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [stats, setStats] = useState<Stats>({ totalKeys: 0, activeKeys: 0, expiredKeys: 0, revokedKeys: 0, totalCalls: 0 });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    
    // Create modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['query:*']);
    const [newKeyRateLimit, setNewKeyRateLimit] = useState(60);
    const [newKeyExpiry, setNewKeyExpiry] = useState('30');
    const [newKeyIPs, setNewKeyIPs] = useState('');
    const [generatedKey, setGeneratedKey] = useState<{ id: string; key: string; keyPrefix: string } | null>(null);
    
    // Edit modal
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
    const [editKeyName, setEditKeyName] = useState('');
    const [editKeyScopes, setEditKeyScopes] = useState<string[]>([]);
    const [editKeyRateLimit, setEditKeyRateLimit] = useState(60);
    const [editKeyIPs, setEditKeyIPs] = useState('');
    
    // Details modal
    const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [usageData, setUsageData] = useState<UsageRecord[]>([]);
    const [usageStats, setUsageStats] = useState<{ totalCalls: number; successfulCalls: number; failedCalls: number; avgDuration: number } | null>(null);
    
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const fetchApiKeys = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/api-keys`);
            if (res.ok) {
                const data = await res.json();
                setApiKeys(data);
            }
        } catch (e) {
            console.error('Failed to fetch API keys:', e);
        }
    }, []);

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/api-keys/stats`);
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (e) {
            console.error('Failed to fetch stats:', e);
        }
    }, []);

    const fetchKeyUsage = useCallback(async (keyId: string) => {
        try {
            const [usageRes, statsRes] = await Promise.all([
                fetch(`${API_URL}/api-keys/${keyId}/usage?limit=50`),
                fetch(`${API_URL}/api-keys/${keyId}/stats`)
            ]);
            if (usageRes.ok) setUsageData(await usageRes.json());
            if (statsRes.ok) setUsageStats(await statsRes.json());
        } catch (e) {
            console.error('Failed to fetch usage:', e);
        }
    }, []);

    useEffect(() => {
        Promise.all([fetchApiKeys(), fetchStats()]).finally(() => setLoading(false));
    }, [fetchApiKeys, fetchStats]);

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    const handleCreateKey = async () => {
        if (!newKeyName || newKeyScopes.length === 0) {
            showNotification('이름과 스코프를 입력해주세요', 'error');
            return;
        }
        try {
            const expiresAt = newKeyExpiry !== 'never' ? new Date(Date.now() + parseInt(newKeyExpiry) * 24 * 60 * 60 * 1000) : undefined;
            const res = await fetch(`${API_URL}/api-keys`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: 'admin',
                    name: newKeyName,
                    scopes: newKeyScopes,
                    rateLimit: newKeyRateLimit,
                    expiresAt,
                    allowedIps: newKeyIPs ? newKeyIPs.split(',').map(ip => ip.trim()).filter(Boolean) : undefined
                })
            });
            if (res.ok) {
                const data = await res.json();
                setGeneratedKey({ id: data.apiKey?.id, key: data.rawKey, keyPrefix: data.apiKey?.keyPrefix });
                fetchApiKeys();
                fetchStats();
                showNotification('API 키가 생성되었습니다.', 'success');
            } else {
                showNotification('API 키 생성 실패', 'error');
            }
        } catch (e) {
            console.error('Create failed:', e);
            showNotification('API 키 생성 실패', 'error');
        }
    };

    const handleUpdateKey = async () => {
        if (!editingKey || !editKeyName) return;
        try {
            const res = await fetch(`${API_URL}/api-keys/${editingKey.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editKeyName,
                    scopes: editKeyScopes,
                    rateLimit: editKeyRateLimit,
                    allowedIps: editKeyIPs ? editKeyIPs.split(',').map(ip => ip.trim()).filter(Boolean) : []
                })
            });
            if (res.ok) {
                fetchApiKeys();
                setShowEditModal(false);
                showNotification('API 키가 수정되었습니다.', 'success');
            } else {
                showNotification('수정 실패', 'error');
            }
        } catch (e) {
            console.error('Update failed:', e);
            showNotification('수정 실패', 'error');
        }
    };

    const handleRevokeKey = async (keyId: string) => {
        if (!confirm('이 API 키를 취소하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
        try {
            const res = await fetch(`${API_URL}/api-keys/${keyId}/revoke`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ revokedBy: 'admin', reason: '관리자 취소' })
            });
            if (res.ok) {
                fetchApiKeys();
                fetchStats();
                showNotification('API 키가 취소되었습니다.', 'success');
            } else {
                showNotification('취소 실패', 'error');
            }
        } catch (e) {
            console.error('Revoke failed:', e);
            showNotification('취소 실패', 'error');
        }
    };

    const handleDeleteKey = async (keyId: string) => {
        if (!confirm('이 API 키를 완전히 삭제하시겠습니까? 관련 사용량 기록도 모두 삭제됩니다.')) return;
        try {
            const res = await fetch(`${API_URL}/api-keys/${keyId}`, { method: 'DELETE' });
            if (res.ok) {
                fetchApiKeys();
                fetchStats();
                showNotification('API 키가 삭제되었습니다.', 'success');
            } else {
                showNotification('삭제 실패', 'error');
            }
        } catch (e) {
            console.error('Delete failed:', e);
            showNotification('삭제 실패', 'error');
        }
    };

    const handleOpenEdit = (key: ApiKey) => {
        setEditingKey(key);
        setEditKeyName(key.name);
        setEditKeyScopes(key.scopes || []);
        setEditKeyRateLimit(key.rateLimit);
        setEditKeyIPs(key.allowedIps?.join(', ') || '');
        setShowEditModal(true);
    };

    const handleOpenDetails = async (key: ApiKey) => {
        setSelectedKey(key);
        await fetchKeyUsage(key.id);
        setShowDetailsModal(true);
    };

    const resetCreateForm = () => {
        setNewKeyName('');
        setNewKeyScopes(['query:*']);
        setNewKeyRateLimit(60);
        setNewKeyExpiry('30');
        setNewKeyIPs('');
        setGeneratedKey(null);
        setShowCreateModal(false);
    };

    const toggleScope = (scope: string, current: string[], setter: (s: string[]) => void) => {
        setter(current.includes(scope) ? current.filter(s => s !== scope) : [...current, scope]);
    };

    const filteredKeys = apiKeys.filter(key => {
        const status = getKeyStatus(key);
        const matchesSearch = key.name.toLowerCase().includes(searchTerm.toLowerCase()) || key.keyPrefix.includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (loading) return (
        <div style={{ ...darkStyles.container, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
            <div style={{ color: darkTheme.textSecondary }}>로딩 중...</div>
        </div>
    );

    return (
        <div style={darkStyles.container}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: darkTheme.textPrimary }}>🔑 API 키 관리</h1>
                    <p style={{ color: darkTheme.textSecondary, marginTop: '4px' }}>API 접근 키 생성 및 관리</p>
                </div>
                <button style={darkStyles.button} onClick={() => setShowCreateModal(true)}>+ API 키 생성</button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {[
                    { label: '전체 키', value: stats.totalKeys, icon: '🔑', color: darkTheme.accentBlue },
                    { label: '활성 키', value: stats.activeKeys, icon: '✅', color: darkTheme.accentGreen },
                    { label: '총 호출', value: stats.totalCalls.toLocaleString(), icon: '📊', color: darkTheme.accentPurple },
                    { label: '만료/취소', value: stats.expiredKeys + stats.revokedKeys, icon: '⚠️', color: darkTheme.accentRed }
                ].map(stat => (
                    <div key={stat.label} style={{ ...darkStyles.card, padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: `${stat.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{stat.icon}</div>
                            <div>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
                                <div style={{ fontSize: '12px', color: darkTheme.textSecondary }}>{stat.label}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ ...darkStyles.card, marginBottom: '24px' }}>
                <div style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input type="text" placeholder="🔍 API 키 검색..." style={{ ...darkStyles.input, minWidth: '200px' }} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <select style={darkStyles.input} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="all">모든 상태</option>
                        <option value="active">활성</option>
                        <option value="revoked">취소됨</option>
                        <option value="expired">만료됨</option>
                    </select>
                    <span style={{ marginLeft: 'auto', fontSize: '13px', color: darkTheme.textMuted }}>{filteredKeys.length}개의 키</span>
                </div>
            </div>

            {/* Table */}
            <div style={darkStyles.card}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: darkTheme.bgSecondary }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: darkTheme.textMuted }}>API 키</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: darkTheme.textMuted }}>사용자</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: darkTheme.textMuted }}>Scope</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: darkTheme.textMuted }}>Rate Limit</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: darkTheme.textMuted }}>사용량</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: darkTheme.textMuted }}>상태</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: darkTheme.textMuted }}>작업</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredKeys.map(key => {
                            const status = getKeyStatus(key);
                            return (
                                <tr key={key.id} style={{ borderBottom: `1px solid ${darkTheme.borderLight}` }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ fontWeight: '500', color: darkTheme.textPrimary }}>{key.name}</div>
                                        <code style={{ fontSize: '11px', color: darkTheme.textMuted, background: darkTheme.bgInput, padding: '2px 6px', borderRadius: '4px' }}>{key.keyPrefix}</code>
                                        {key.lastUsedAt && (
                                            <div style={{ fontSize: '10px', color: darkTheme.textMuted, marginTop: '4px' }}>
                                                마지막 사용: {new Date(key.lastUsedAt).toLocaleDateString('ko-KR')}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ fontWeight: '500', color: darkTheme.textPrimary, fontSize: '13px' }}>{key.userName || key.userId}</div>
                                        {key.userEmail && (
                                            <div style={{ fontSize: '11px', color: darkTheme.textMuted }}>{key.userEmail}</div>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                            {(key.scopes || []).slice(0, 2).map(scope => (
                                                <span key={scope} style={{ padding: '2px 6px', background: `${darkTheme.accentPurple}20`, color: darkTheme.accentPurple, fontSize: '10px', borderRadius: '4px' }}>
                                                    {scopeLabels[scope] || scope}
                                                </span>
                                            ))}
                                            {(key.scopes || []).length > 2 && (
                                                <span style={{ padding: '2px 6px', background: darkTheme.bgSecondary, color: darkTheme.textMuted, fontSize: '10px', borderRadius: '4px' }}>
                                                    +{key.scopes.length - 2}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center', fontSize: '14px', color: darkTheme.textSecondary }}>{key.rateLimit}/분</td>
                                    <td style={{ padding: '16px', textAlign: 'center', fontWeight: '500', fontSize: '14px', color: darkTheme.textPrimary }}>{(key.usageCount || 0).toLocaleString()}</td>
                                    <td style={{ padding: '16px', textAlign: 'center' }}>
                                        <span style={{ padding: '4px 8px', background: `${statusColors[status]}20`, color: statusColors[status], fontSize: '11px', fontWeight: '500', borderRadius: '4px' }}>
                                            {statusLabels[status]}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                            <button onClick={() => handleOpenDetails(key)} style={{ padding: '4px 10px', background: `${darkTheme.accentBlue}20`, color: darkTheme.accentBlue, border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>상세</button>
                                            {status === 'active' && (
                                                <>
                                                    <button onClick={() => handleOpenEdit(key)} style={{ padding: '4px 10px', background: `${darkTheme.accentPurple}20`, color: darkTheme.accentPurple, border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>수정</button>
                                                    <button onClick={() => handleRevokeKey(key.id)} style={{ padding: '4px 10px', background: `${darkTheme.accentYellow}20`, color: darkTheme.accentYellow, border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>취소</button>
                                                </>
                                            )}
                                            <button onClick={() => handleDeleteKey(key.id)} style={{ padding: '4px 10px', background: `${darkTheme.accentRed}20`, color: darkTheme.accentRed, border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>삭제</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filteredKeys.length === 0 && (
                    <div style={{ padding: '48px', textAlign: 'center', color: darkTheme.textMuted }}>
                        {apiKeys.length === 0 ? '아직 생성된 API 키가 없습니다' : '검색 결과가 없습니다'}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div style={darkStyles.modalOverlay} onClick={resetCreateForm}>
                    <div style={{ ...darkStyles.modal, maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                        {!generatedKey ? (
                            <>
                                <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', color: darkTheme.textPrimary }}>🔑 API 키 생성</h2>
                                
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>키 이름 *</label>
                                    <input type="text" style={{ ...darkStyles.input, width: '100%' }} value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="예: Production API" />
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: darkTheme.textSecondary }}>Scope *</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {availableScopes.map(scope => (
                                            <button key={scope} onClick={() => toggleScope(scope, newKeyScopes, setNewKeyScopes)} style={{
                                                padding: '6px 12px',
                                                background: newKeyScopes.includes(scope) ? darkTheme.accentPurple : darkTheme.bgSecondary,
                                                color: newKeyScopes.includes(scope) ? 'white' : darkTheme.textSecondary,
                                                border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer'
                                            }}>
                                                {scopeLabels[scope] || scope}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>Rate Limit (요청/분)</label>
                                    <input type="number" style={{ ...darkStyles.input, width: '100%' }} value={newKeyRateLimit} onChange={e => setNewKeyRateLimit(Number(e.target.value))} min={1} max={10000} />
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>만료 기간</label>
                                    <select style={{ ...darkStyles.input, width: '100%' }} value={newKeyExpiry} onChange={e => setNewKeyExpiry(e.target.value)}>
                                        <option value="7">7일</option>
                                        <option value="30">30일</option>
                                        <option value="90">90일</option>
                                        <option value="365">1년</option>
                                        <option value="never">무제한</option>
                                    </select>
                                </div>

                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>IP 화이트리스트 (쉼표 구분, 선택)</label>
                                    <input type="text" style={{ ...darkStyles.input, width: '100%' }} value={newKeyIPs} onChange={e => setNewKeyIPs(e.target.value)} placeholder="예: 192.168.1.1, 10.0.0.0/24" />
                                </div>

                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                    <button style={darkStyles.buttonSecondary} onClick={resetCreateForm}>취소</button>
                                    <button style={darkStyles.button} onClick={handleCreateKey}>생성</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔑</div>
                                    <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: darkTheme.accentGreen }}>API 키 생성 완료!</h2>
                                </div>
                                
                                <div style={{ background: `${darkTheme.accentYellow}20`, border: `1px solid ${darkTheme.accentYellow}`, borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: darkTheme.accentYellow, fontWeight: '500', fontSize: '14px' }}>⚠️ 이 키는 다시 표시되지 않습니다!</div>
                                </div>
                                
                                <div style={{ background: darkTheme.bgInput, borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
                                    <div style={{ fontSize: '12px', color: darkTheme.textMuted, marginBottom: '8px' }}>API Key</div>
                                    <div style={{ fontFamily: 'monospace', fontSize: '14px', wordBreak: 'break-all', color: darkTheme.textPrimary, userSelect: 'all' }}>{generatedKey.key}</div>
                                </div>
                                
                                <button style={{ ...darkStyles.button, width: '100%' }} onClick={() => { navigator.clipboard.writeText(generatedKey.key); showNotification('클립보드에 복사되었습니다!', 'success'); }}>📋 복사하기</button>
                                <button style={{ ...darkStyles.buttonSecondary, width: '100%', marginTop: '12px' }} onClick={resetCreateForm}>닫기</button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editingKey && (
                <div style={darkStyles.modalOverlay} onClick={() => setShowEditModal(false)}>
                    <div style={{ ...darkStyles.modal, maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', color: darkTheme.textPrimary }}>✏️ API 키 수정</h2>
                        
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>키 이름 *</label>
                            <input type="text" style={{ ...darkStyles.input, width: '100%' }} value={editKeyName} onChange={e => setEditKeyName(e.target.value)} />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: darkTheme.textSecondary }}>Scope</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {availableScopes.map(scope => (
                                    <button key={scope} onClick={() => toggleScope(scope, editKeyScopes, setEditKeyScopes)} style={{
                                        padding: '6px 12px',
                                        background: editKeyScopes.includes(scope) ? darkTheme.accentPurple : darkTheme.bgSecondary,
                                        color: editKeyScopes.includes(scope) ? 'white' : darkTheme.textSecondary,
                                        border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer'
                                    }}>
                                        {scopeLabels[scope] || scope}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>Rate Limit (요청/분)</label>
                            <input type="number" style={{ ...darkStyles.input, width: '100%' }} value={editKeyRateLimit} onChange={e => setEditKeyRateLimit(Number(e.target.value))} min={1} max={10000} />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>IP 화이트리스트 (쉼표 구분)</label>
                            <input type="text" style={{ ...darkStyles.input, width: '100%' }} value={editKeyIPs} onChange={e => setEditKeyIPs(e.target.value)} placeholder="비어있으면 모든 IP 허용" />
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button style={darkStyles.buttonSecondary} onClick={() => setShowEditModal(false)}>취소</button>
                            <button style={darkStyles.button} onClick={handleUpdateKey}>💾 저장</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {showDetailsModal && selectedKey && (
                <div style={darkStyles.modalOverlay} onClick={() => setShowDetailsModal(false)}>
                    <div style={{ ...darkStyles.modal, maxWidth: '650px', maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div>
                                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: darkTheme.textPrimary }}>{selectedKey.name}</h2>
                                <code style={{ fontSize: '12px', color: darkTheme.textMuted }}>{selectedKey.keyPrefix}</code>
                            </div>
                            <span style={{ padding: '6px 12px', background: `${statusColors[getKeyStatus(selectedKey)]}20`, color: statusColors[getKeyStatus(selectedKey)], borderRadius: '6px', fontWeight: '500' }}>
                                {statusLabels[getKeyStatus(selectedKey)]}
                            </span>
                        </div>

                        {/* Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                            <div style={{ background: darkTheme.bgSecondary, padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: darkTheme.textPrimary }}>{usageStats?.totalCalls || selectedKey.usageCount || 0}</div>
                                <div style={{ fontSize: '11px', color: darkTheme.textMuted }}>총 호출</div>
                            </div>
                            <div style={{ background: darkTheme.bgSecondary, padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: darkTheme.accentGreen }}>{usageStats?.successfulCalls || 0}</div>
                                <div style={{ fontSize: '11px', color: darkTheme.textMuted }}>성공</div>
                            </div>
                            <div style={{ background: darkTheme.bgSecondary, padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: darkTheme.accentRed }}>{usageStats?.failedCalls || 0}</div>
                                <div style={{ fontSize: '11px', color: darkTheme.textMuted }}>실패</div>
                            </div>
                            <div style={{ background: darkTheme.bgSecondary, padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: darkTheme.accentBlue }}>{Math.round(usageStats?.avgDuration || 0)}ms</div>
                                <div style={{ fontSize: '11px', color: darkTheme.textMuted }}>평균 응답</div>
                            </div>
                        </div>

                        {/* Key Info */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                            <div>
                                <div style={{ fontSize: '12px', color: darkTheme.textMuted, marginBottom: '4px' }}>사용자</div>
                                <div style={{ fontSize: '16px', fontWeight: '500', color: darkTheme.textPrimary }}>{selectedKey.userName || selectedKey.userId}</div>
                                {selectedKey.userEmail && (
                                    <div style={{ fontSize: '12px', color: darkTheme.textMuted }}>{selectedKey.userEmail}</div>
                                )}
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', color: darkTheme.textMuted, marginBottom: '4px' }}>Rate Limit</div>
                                <div style={{ fontSize: '16px', fontWeight: '500', color: darkTheme.textPrimary }}>{selectedKey.rateLimit} 요청/분</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', color: darkTheme.textMuted, marginBottom: '4px' }}>생성일</div>
                                <div style={{ fontSize: '16px', fontWeight: '500', color: darkTheme.textPrimary }}>{new Date(selectedKey.createdAt).toLocaleDateString('ko-KR')}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', color: darkTheme.textMuted, marginBottom: '4px' }}>만료일</div>
                                <div style={{ fontSize: '16px', fontWeight: '500', color: selectedKey.expiresAt ? darkTheme.textPrimary : darkTheme.textMuted }}>
                                    {selectedKey.expiresAt ? new Date(selectedKey.expiresAt).toLocaleDateString('ko-KR') : '무제한'}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', color: darkTheme.textMuted, marginBottom: '4px' }}>마지막 사용</div>
                                <div style={{ fontSize: '16px', fontWeight: '500', color: selectedKey.lastUsedAt ? darkTheme.textPrimary : darkTheme.textMuted }}>
                                    {selectedKey.lastUsedAt ? new Date(selectedKey.lastUsedAt).toLocaleString('ko-KR') : '사용 기록 없음'}
                                </div>
                            </div>
                        </div>

                        {/* Scopes */}
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: darkTheme.textPrimary }}>Scopes</div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {(selectedKey.scopes || []).map(scope => (
                                    <span key={scope} style={{ padding: '6px 12px', background: `${darkTheme.accentPurple}20`, color: darkTheme.accentPurple, fontSize: '12px', borderRadius: '6px' }}>
                                        {scopeLabels[scope] || scope}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* IP Whitelist */}
                        {selectedKey.allowedIps && selectedKey.allowedIps.length > 0 && (
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: darkTheme.textPrimary }}>IP 화이트리스트</div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {selectedKey.allowedIps.map(ip => (
                                        <code key={ip} style={{ padding: '4px 8px', background: darkTheme.bgInput, borderRadius: '4px', fontSize: '12px', color: darkTheme.textSecondary }}>{ip}</code>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recent Usage */}
                        {usageData.length > 0 && (
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px', color: darkTheme.textPrimary }}>최근 사용 기록</div>
                                <div style={{ background: darkTheme.bgSecondary, borderRadius: '8px', maxHeight: '200px', overflow: 'auto' }}>
                                    {usageData.slice(0, 10).map((record, idx) => (
                                        <div key={record.id || idx} style={{ padding: '10px 12px', borderBottom: idx < 9 ? `1px solid ${darkTheme.borderLight}` : 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ padding: '2px 6px', background: record.statusCode < 400 ? `${darkTheme.accentGreen}20` : `${darkTheme.accentRed}20`, color: record.statusCode < 400 ? darkTheme.accentGreen : darkTheme.accentRed, fontSize: '10px', borderRadius: '4px' }}>{record.statusCode}</span>
                                            <span style={{ fontSize: '12px', color: darkTheme.textMuted }}>{record.method}</span>
                                            <span style={{ fontSize: '12px', color: darkTheme.textSecondary, flex: 1 }}>{record.endpoint}</span>
                                            <span style={{ fontSize: '11px', color: darkTheme.textMuted }}>{record.durationMs}ms</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button style={{ ...darkStyles.buttonSecondary, width: '100%' }} onClick={() => setShowDetailsModal(false)}>닫기</button>
                    </div>
                </div>
            )}

            {/* Notification Toast */}
            {notification && (
                <div style={{
                    position: 'fixed', bottom: '24px', right: '24px', padding: '16px 24px',
                    background: notification.type === 'success' ? darkTheme.accentGreen : darkTheme.accentRed,
                    color: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    zIndex: 1000, fontSize: '14px', fontWeight: '500'
                }}>
                    {notification.type === 'success' ? '✅' : '❌'} {notification.message}
                </div>
            )}
        </div>
    );
}
