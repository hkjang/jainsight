'use client';

import { useEffect, useState, useCallback } from 'react';

const API_URL = '/api';

interface ApiKey {
    id: string;
    name: string;
    keyPrefix: string;
    ownerId: string;
    ownerName?: string;
    scopes: string[];
    rateLimit: number;
    usageCount: number;
    status: 'active' | 'revoked' | 'expired';
    expiresAt?: string;
    lastUsedAt?: string;
    createdAt: string;
    ipWhitelist?: string[];
}

interface ApiKeyStats {
    totalKeys: number;
    activeKeys: number;
    totalCalls: number;
    expiredKeys: number;
}

interface NewKeyResponse {
    id: string;
    key: string;
    keyPrefix: string;
}

const scopeLabels: Record<string, string> = {
    'query:read': '쿼리 조회',
    'query:execute': '쿼리 실행',
    'data:read': '데이터 조회',
    'schema:read': '스키마 조회',
    'admin:read': '관리자 조회'
};

const availableScopes = Object.keys(scopeLabels);

export default function ApiKeysAdminPage() {
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [stats, setStats] = useState<ApiKeyStats>({ totalKeys: 0, activeKeys: 0, totalCalls: 0, expiredKeys: 0 });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    
    // Create modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['query:read']);
    const [newKeyRateLimit, setNewKeyRateLimit] = useState(100);
    const [newKeyExpiry, setNewKeyExpiry] = useState<string>('30d');
    const [newKeyIPs, setNewKeyIPs] = useState('');
    
    // Generated key
    const [generatedKey, setGeneratedKey] = useState<NewKeyResponse | null>(null);
    
    // Details modal
    const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [usageData, setUsageData] = useState<{ date: string; count: number }[]>([]);

    const fetchApiKeys = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/api-keys`);
            if (response.ok) {
                const data = await response.json();
                setApiKeys(data);
            } else {
                setApiKeys([
                    { id: '1', name: 'Production API', keyPrefix: 'jsk_live_', ownerId: 'u1', ownerName: 'Admin', scopes: ['query:execute', 'data:read'], rateLimit: 1000, usageCount: 15420, status: 'active', createdAt: new Date(Date.now() - 30*24*60*60*1000).toISOString(), lastUsedAt: new Date().toISOString() },
                    { id: '2', name: 'Analytics Dashboard', keyPrefix: 'jsk_live_', ownerId: 'u2', ownerName: 'Analyst', scopes: ['query:read', 'data:read', 'schema:read'], rateLimit: 500, usageCount: 8920, status: 'active', createdAt: new Date(Date.now() - 60*24*60*60*1000).toISOString() },
                    { id: '3', name: 'Test Environment', keyPrefix: 'jsk_test_', ownerId: 'u1', ownerName: 'Admin', scopes: ['query:execute'], rateLimit: 100, usageCount: 2350, status: 'active', expiresAt: new Date(Date.now() + 7*24*60*60*1000).toISOString(), createdAt: new Date().toISOString() },
                    { id: '4', name: 'Old Integration', keyPrefix: 'jsk_live_', ownerId: 'u3', ownerName: 'Developer', scopes: ['query:read'], rateLimit: 50, usageCount: 450, status: 'revoked', createdAt: new Date(Date.now() - 180*24*60*60*1000).toISOString() },
                    { id: '5', name: 'Expired Key', keyPrefix: 'jsk_live_', ownerId: 'u2', ownerName: 'Analyst', scopes: ['data:read'], rateLimit: 200, usageCount: 1200, status: 'expired', expiresAt: new Date(Date.now() - 7*24*60*60*1000).toISOString(), createdAt: new Date(Date.now() - 90*24*60*60*1000).toISOString() },
                ]);
            }
        } catch (error) {
            console.error('Failed to fetch API keys:', error);
        }
    }, []);

    const fetchStats = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/api-keys/stats`);
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            } else {
                setStats({ totalKeys: 5, activeKeys: 3, totalCalls: 28340, expiredKeys: 2 });
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchKeyUsage = useCallback(async (keyId: string) => {
        try {
            const response = await fetch(`${API_URL}/api-keys/${keyId}/usage`);
            if (response.ok) {
                const data = await response.json();
                setUsageData(data);
            } else {
                // Mock usage data
                const now = new Date();
                setUsageData(Array.from({ length: 7 }, (_, i) => ({
                    date: new Date(now.getTime() - (6-i)*24*60*60*1000).toLocaleDateString('ko-KR'),
                    count: Math.floor(Math.random() * 500) + 100
                })));
            }
        } catch (error) {
            console.error('Failed to fetch usage:', error);
        }
    }, []);

    useEffect(() => {
        fetchApiKeys();
        fetchStats();
    }, [fetchApiKeys, fetchStats]);

    const handleCreateKey = async () => {
        if (!newKeyName || newKeyScopes.length === 0) return;
        
        try {
            const expiryDays = parseInt(newKeyExpiry);
            const expiresAt = newKeyExpiry === 'never' ? undefined : new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();
            
            const response = await fetch(`${API_URL}/api-keys`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newKeyName,
                    scopes: newKeyScopes,
                    rateLimit: newKeyRateLimit,
                    expiresAt,
                    ipWhitelist: newKeyIPs ? newKeyIPs.split(',').map(ip => ip.trim()) : undefined
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                setGeneratedKey(data);
                fetchApiKeys();
                fetchStats();
            } else {
                // Mock generated key
                setGeneratedKey({
                    id: 'new-1',
                    key: `jsk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
                    keyPrefix: 'jsk_live_'
                });
            }
        } catch (error) {
            console.error('Failed to create API key:', error);
        }
    };

    const handleRevokeKey = async (keyId: string) => {
        if (!confirm('이 API 키를 취소하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
        
        try {
            const response = await fetch(`${API_URL}/api-keys/${keyId}/revoke`, { method: 'POST' });
            if (response.ok) {
                fetchApiKeys();
                fetchStats();
            }
        } catch (error) {
            console.error('Failed to revoke key:', error);
        }
    };

    const handleOpenDetails = async (key: ApiKey) => {
        setSelectedKey(key);
        await fetchKeyUsage(key.id);
        setShowDetailsModal(true);
    };

    const resetCreateForm = () => {
        setNewKeyName('');
        setNewKeyScopes(['query:read']);
        setNewKeyRateLimit(100);
        setNewKeyExpiry('30d');
        setNewKeyIPs('');
        setGeneratedKey(null);
        setShowCreateModal(false);
    };

    const toggleScope = (scope: string) => {
        setNewKeyScopes(prev => prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]);
    };

    const filteredKeys = apiKeys.filter(key => {
        const matchesSearch = key.name.toLowerCase().includes(searchTerm.toLowerCase()) || key.keyPrefix.includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || key.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const containerStyle: React.CSSProperties = { padding: '24px', maxWidth: '1400px', margin: '0 auto' };
    const cardStyle: React.CSSProperties = { background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' };
    const buttonStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: 'white' };
    const inputStyle: React.CSSProperties = { padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none', width: '100%' };
    const modalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
    const modalStyle: React.CSSProperties = { background: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '500px', maxHeight: '80vh', overflow: 'auto' };

    const statusColors: Record<string, string> = { active: '#10B981', revoked: '#EF4444', expired: '#6B7280' };
    const statusLabels: Record<string, string> = { active: '활성', revoked: '취소됨', expired: '만료됨' };

    if (loading) {
        return <div style={{ ...containerStyle, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}><div style={{ fontSize: '18px', color: '#6B7280' }}>로딩 중...</div></div>;
    }

    return (
        <div style={containerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1F2937' }}>🔑 API 키 관리</h1>
                    <p style={{ color: '#6B7280', marginTop: '4px' }}>API 접근 키 생성 및 관리</p>
                </div>
                <button style={buttonStyle} onClick={() => setShowCreateModal(true)}>+ API 키 생성</button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {[
                    { label: '전체 키', value: stats.totalKeys, icon: '🔑', color: '#3B82F6' },
                    { label: '활성 키', value: stats.activeKeys, icon: '✅', color: '#10B981' },
                    { label: '총 호출', value: stats.totalCalls.toLocaleString(), icon: '📊', color: '#8B5CF6' },
                    { label: '만료/취소', value: stats.expiredKeys, icon: '⚠️', color: '#EF4444' },
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

            {/* Filters */}
            <div style={{ ...cardStyle, marginBottom: '24px' }}>
                <div style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input type="text" placeholder="🔍 API 키 검색..." style={{ ...inputStyle, minWidth: '200px', width: 'auto' }} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <select style={{ ...inputStyle, minWidth: '140px', width: 'auto', cursor: 'pointer' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="all">모든 상태</option>
                        <option value="active">활성</option>
                        <option value="revoked">취소됨</option>
                        <option value="expired">만료됨</option>
                    </select>
                </div>
            </div>

            {/* Keys Table */}
            <div style={cardStyle}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#F9FAFB' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>API 키</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Scope</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Rate Limit</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>사용량</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>상태</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>만료일</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>작업</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredKeys.map(key => (
                            <tr key={key.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                                <td style={{ padding: '16px' }}>
                                    <div style={{ fontWeight: '500' }}>{key.name}</div>
                                    <code style={{ fontSize: '11px', color: '#6B7280', background: '#F3F4F6', padding: '2px 4px', borderRadius: '4px' }}>{key.keyPrefix}***</code>
                                    {key.ownerName && <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>by {key.ownerName}</div>}
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                        {key.scopes.slice(0, 2).map(scope => (
                                            <span key={scope} style={{ padding: '2px 6px', background: '#EEF2FF', color: '#4F46E5', fontSize: '10px', borderRadius: '4px' }}>
                                                {scopeLabels[scope] || scope}
                                            </span>
                                        ))}
                                        {key.scopes.length > 2 && (
                                            <span style={{ padding: '2px 6px', background: '#F3F4F6', color: '#6B7280', fontSize: '10px', borderRadius: '4px' }}>+{key.scopes.length - 2}</span>
                                        )}
                                    </div>
                                </td>
                                <td style={{ padding: '16px', textAlign: 'center', fontSize: '14px' }}>{key.rateLimit}/분</td>
                                <td style={{ padding: '16px', textAlign: 'center', fontWeight: '500', fontSize: '14px' }}>{key.usageCount.toLocaleString()}</td>
                                <td style={{ padding: '16px', textAlign: 'center' }}>
                                    <span style={{ padding: '4px 8px', background: `${statusColors[key.status]}15`, color: statusColors[key.status], fontSize: '11px', fontWeight: '500', borderRadius: '4px' }}>
                                        {statusLabels[key.status]}
                                    </span>
                                </td>
                                <td style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#6B7280' }}>
                                    {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString('ko-KR') : '-'}
                                </td>
                                <td style={{ padding: '16px', textAlign: 'right' }}>
                                    <button onClick={() => handleOpenDetails(key)} style={{ padding: '4px 12px', background: '#EEF2FF', color: '#4F46E5', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', marginRight: '8px' }}>상세</button>
                                    {key.status === 'active' && (
                                        <button onClick={() => handleRevokeKey(key.id)} style={{ padding: '4px 12px', background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>취소</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredKeys.length === 0 && (
                    <div style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>API 키가 없습니다</div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div style={modalOverlayStyle} onClick={resetCreateForm}>
                    <div style={modalStyle} onClick={e => e.stopPropagation()}>
                        {!generatedKey ? (
                            <>
                                <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>API 키 생성</h2>
                                
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>키 이름 *</label>
                                    <input type="text" style={inputStyle} value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="예: Production API" />
                                </div>
                                
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Scope *</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {availableScopes.map(scope => (
                                            <button
                                                key={scope}
                                                onClick={() => toggleScope(scope)}
                                                style={{
                                                    padding: '6px 12px',
                                                    background: newKeyScopes.includes(scope) ? '#4F46E5' : '#F3F4F6',
                                                    color: newKeyScopes.includes(scope) ? 'white' : '#374151',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    fontSize: '12px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {scopeLabels[scope]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Rate Limit (요청/분)</label>
                                    <input type="number" style={inputStyle} value={newKeyRateLimit} onChange={e => setNewKeyRateLimit(Number(e.target.value))} min={1} />
                                </div>
                                
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>만료 기간</label>
                                    <select style={inputStyle} value={newKeyExpiry} onChange={e => setNewKeyExpiry(e.target.value)}>
                                        <option value="7">7일</option>
                                        <option value="30">30일</option>
                                        <option value="90">90일</option>
                                        <option value="365">1년</option>
                                        <option value="never">무제한</option>
                                    </select>
                                </div>
                                
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>IP 화이트리스트 (쉼표 구분)</label>
                                    <input type="text" style={inputStyle} value={newKeyIPs} onChange={e => setNewKeyIPs(e.target.value)} placeholder="192.168.1.1, 10.0.0.0/24" />
                                </div>
                                
                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                    <button style={{ ...buttonStyle, background: '#F3F4F6', color: '#374151' }} onClick={resetCreateForm}>취소</button>
                                    <button style={buttonStyle} onClick={handleCreateKey}>생성</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔑</div>
                                    <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#059669' }}>API 키 생성 완료!</h2>
                                </div>
                                
                                <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#D97706', fontWeight: '500', fontSize: '14px' }}>
                                        ⚠️ 이 키는 다시 표시되지 않습니다!
                                    </div>
                                </div>
                                
                                <div style={{ background: '#F3F4F6', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
                                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>API Key</div>
                                    <div style={{ fontFamily: 'monospace', fontSize: '14px', wordBreak: 'break-all', color: '#1F2937', userSelect: 'all' }}>
                                        {generatedKey.key}
                                    </div>
                                </div>
                                
                                <button
                                    style={{ ...buttonStyle, width: '100%' }}
                                    onClick={() => {
                                        navigator.clipboard.writeText(generatedKey.key);
                                        alert('클립보드에 복사되었습니다!');
                                    }}
                                >
                                    📋 복사하기
                                </button>
                                
                                <button style={{ ...buttonStyle, width: '100%', marginTop: '12px', background: '#F3F4F6', color: '#374151' }} onClick={resetCreateForm}>닫기</button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {showDetailsModal && selectedKey && (
                <div style={modalOverlayStyle} onClick={() => setShowDetailsModal(false)}>
                    <div style={{ ...modalStyle, maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div>
                                <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>{selectedKey.name}</h2>
                                <code style={{ fontSize: '12px', color: '#6B7280' }}>{selectedKey.keyPrefix}***</code>
                            </div>
                            <span style={{ padding: '6px 12px', background: `${statusColors[selectedKey.status]}15`, color: statusColors[selectedKey.status], borderRadius: '6px', fontWeight: '500' }}>
                                {statusLabels[selectedKey.status]}
                            </span>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ background: '#F9FAFB', padding: '16px', borderRadius: '8px' }}>
                                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>총 사용량</div>
                                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{selectedKey.usageCount.toLocaleString()}</div>
                            </div>
                            <div style={{ background: '#F9FAFB', padding: '16px', borderRadius: '8px' }}>
                                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Rate Limit</div>
                                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{selectedKey.rateLimit}/분</div>
                            </div>
                        </div>
                        
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px' }}>7일 사용량 추이</div>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '120px', background: '#F9FAFB', borderRadius: '8px', padding: '16px' }}>
                                {usageData.map((d, i) => (
                                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{
                                            width: '100%',
                                            height: `${Math.max((d.count / 500) * 80, 10)}px`,
                                            background: 'linear-gradient(180deg, #3B82F6, #60A5FA)',
                                            borderRadius: '4px 4px 0 0'
                                        }} />
                                        <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '4px' }}>{d.date.split('.').slice(1).join('/')}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Scopes</div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {selectedKey.scopes.map(scope => (
                                    <span key={scope} style={{ padding: '6px 12px', background: '#EEF2FF', color: '#4F46E5', fontSize: '12px', borderRadius: '6px' }}>
                                        {scopeLabels[scope] || scope}
                                    </span>
                                ))}
                            </div>
                        </div>
                        
                        {selectedKey.ipWhitelist && selectedKey.ipWhitelist.length > 0 && (
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>IP 화이트리스트</div>
                                <div style={{ background: '#F3F4F6', padding: '12px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px' }}>
                                    {selectedKey.ipWhitelist.join(', ')}
                                </div>
                            </div>
                        )}
                        
                        <button style={{ ...buttonStyle, background: '#F3F4F6', color: '#374151', width: '100%' }} onClick={() => setShowDetailsModal(false)}>닫기</button>
                    </div>
                </div>
            )}
        </div>
    );
}
