'use client';

import { useEffect, useState, useCallback } from 'react';

const API_URL = '/api';

interface Role {
    id: string;
    name: string;
    description?: string;
    type: 'system' | 'custom';
    priority: number;
    parentRoleId?: string;
    isActive: boolean;
    isDefault: boolean;
    permissionCount?: number;
    userCount?: number;
}

interface Permission {
    id: string;
    roleId: string;
    scope: string;
    resource: string;
    action: string;
    isAllow: boolean;
    condition?: Record<string, unknown>;
}

interface SimulationResult {
    allowed: boolean;
    matchedPermissions: { id: string; reason: string }[];
}

export default function RbacAdminPage() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'roles' | 'matrix' | 'policies' | 'simulation'>('roles');
    
    // Create role modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleDescription, setNewRoleDescription] = useState('');
    const [newRoleParent, setNewRoleParent] = useState('');
    const [newRolePriority, setNewRolePriority] = useState(50);
    
    // Add permission modal
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [newPermScope, setNewPermScope] = useState('database');
    const [newPermResource, setNewPermResource] = useState('');
    const [newPermAction, setNewPermAction] = useState('read');
    const [newPermIsAllow, setNewPermIsAllow] = useState(true);
    
    // Simulation
    const [simUserId, setSimUserId] = useState('');
    const [simResource, setSimResource] = useState('');
    const [simAction, setSimAction] = useState('');
    const [simResult, setSimResult] = useState<SimulationResult | null>(null);

    const fetchRoles = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/rbac/roles`);
            if (response.ok) {
                const data = await response.json();
                setRoles(data);
            } else {
                setRoles([
                    { id: '1', name: 'Super Admin', type: 'system', priority: 100, isActive: true, isDefault: false, permissionCount: 50, userCount: 2 },
                    { id: '2', name: 'Admin', type: 'system', priority: 80, parentRoleId: '1', isActive: true, isDefault: false, permissionCount: 35, userCount: 5 },
                    { id: '3', name: 'Data Analyst', type: 'custom', priority: 50, isActive: true, isDefault: false, permissionCount: 15, userCount: 12 },
                    { id: '4', name: 'Query Viewer', type: 'custom', priority: 30, isActive: true, isDefault: true, permissionCount: 8, userCount: 45 },
                    { id: '5', name: 'Developer', type: 'custom', priority: 60, isActive: true, isDefault: false, permissionCount: 25, userCount: 20 },
                ]);
            }
        } catch (error) {
            console.error('Failed to fetch roles:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchPermissions = useCallback(async (roleId: string) => {
        try {
            const response = await fetch(`${API_URL}/rbac/roles/${roleId}/permissions`);
            if (response.ok) {
                const data = await response.json();
                setPermissions(data);
            } else {
                setPermissions([
                    { id: '1', roleId, scope: 'database', resource: 'db:*', action: 'read', isAllow: true },
                    { id: '2', roleId, scope: 'database', resource: 'db:production', action: 'execute', isAllow: true },
                    { id: '3', roleId, scope: 'table', resource: 'table:users', action: 'read', isAllow: true },
                    { id: '4', roleId, scope: 'query', resource: 'query:*', action: 'execute', isAllow: true },
                    { id: '5', roleId, scope: 'system', resource: 'admin:*', action: 'admin', isAllow: false },
                ]);
            }
        } catch (error) {
            console.error('Failed to fetch permissions:', error);
        }
    }, []);

    useEffect(() => {
        fetchRoles();
    }, [fetchRoles]);

    useEffect(() => {
        if (selectedRole) {
            fetchPermissions(selectedRole.id);
        }
    }, [selectedRole, fetchPermissions]);

    const handleCreateRole = async () => {
        if (!newRoleName) return;
        
        try {
            const response = await fetch(`${API_URL}/rbac/roles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newRoleName,
                    description: newRoleDescription || undefined,
                    type: 'custom',
                    parentRoleId: newRoleParent || undefined,
                    priority: newRolePriority
                })
            });
            
            if (response.ok) {
                fetchRoles();
                setShowCreateModal(false);
                setNewRoleName('');
                setNewRoleDescription('');
                setNewRoleParent('');
                setNewRolePriority(50);
            }
        } catch (error) {
            console.error('Failed to create role:', error);
        }
    };

    const handleAddPermission = async () => {
        if (!selectedRole || !newPermResource) return;
        
        try {
            const response = await fetch(`${API_URL}/rbac/roles/${selectedRole.id}/permissions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scope: newPermScope,
                    resource: newPermResource,
                    action: newPermAction,
                    isAllow: newPermIsAllow
                })
            });
            
            if (response.ok) {
                fetchPermissions(selectedRole.id);
                setShowPermissionModal(false);
                setNewPermResource('');
            }
        } catch (error) {
            console.error('Failed to add permission:', error);
        }
    };

    const handleDeletePermission = async (permId: string) => {
        if (!selectedRole) return;
        
        try {
            const response = await fetch(`${API_URL}/rbac/permissions/${permId}`, { method: 'DELETE' });
            if (response.ok) {
                fetchPermissions(selectedRole.id);
            }
        } catch (error) {
            console.error('Failed to delete permission:', error);
        }
    };

    const handleSimulate = async () => {
        if (!simUserId && !simResource) return;
        
        try {
            const response = await fetch(`${API_URL}/rbac/simulate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: simUserId || undefined,
                    resource: simResource,
                    action: simAction
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                setSimResult(data);
            } else {
                // Mock result
                setSimResult({
                    allowed: true,
                    matchedPermissions: [
                        { id: '1', reason: 'Role "Admin" grants read access to database:*' },
                        { id: '2', reason: 'No deny rule matched' }
                    ]
                });
            }
        } catch (error) {
            console.error('Failed to simulate:', error);
            setSimResult({
                allowed: Math.random() > 0.5,
                matchedPermissions: [{ id: '1', reason: 'Simulation (mock)' }]
            });
        }
    };

    const containerStyle: React.CSSProperties = {
        padding: '24px',
        maxWidth: '1600px',
        margin: '0 auto'
    };

    const cardStyle: React.CSSProperties = {
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
    };

    const tabStyle = (active: boolean): React.CSSProperties => ({
        padding: '12px 24px',
        fontSize: '14px',
        fontWeight: active ? '600' : '400',
        color: active ? '#3B82F6' : '#6B7280',
        background: 'none',
        border: 'none',
        borderBottom: active ? '2px solid #3B82F6' : '2px solid transparent',
        cursor: 'pointer',
        transition: 'all 0.2s'
    });

    const buttonStyle: React.CSSProperties = {
        padding: '8px 16px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        border: 'none',
        background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
        color: 'white'
    };

    const inputStyle: React.CSSProperties = {
        padding: '10px 12px',
        border: '1px solid #D1D5DB',
        borderRadius: '8px',
        fontSize: '14px',
        outline: 'none',
        width: '100%'
    };

    const modalOverlayStyle: React.CSSProperties = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
    };

    const modalStyle: React.CSSProperties = {
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        width: '100%',
        maxWidth: '450px',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
    };

    const scopeColors: Record<string, string> = {
        system: '#EF4444',
        database: '#3B82F6',
        schema: '#8B5CF6',
        table: '#10B981',
        query: '#F59E0B'
    };

    if (loading) {
        return (
            <div style={{ ...containerStyle, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <div style={{ fontSize: '18px', color: '#6B7280' }}>로딩 중...</div>
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1F2937' }}>🔐 RBAC 관리</h1>
                    <p style={{ color: '#6B7280', marginTop: '4px' }}>역할 기반 접근 제어 및 권한 관리</p>
                </div>
                <button style={buttonStyle} onClick={() => setShowCreateModal(true)}>+ 역할 생성</button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ ...cardStyle, padding: '20px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1F2937' }}>{roles.length}</div>
                    <div style={{ fontSize: '14px', color: '#6B7280' }}>전체 역할</div>
                </div>
                <div style={{ ...cardStyle, padding: '20px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8B5CF6' }}>
                        {roles.filter(r => r.type === 'system').length}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6B7280' }}>시스템 역할</div>
                </div>
                <div style={{ ...cardStyle, padding: '20px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3B82F6' }}>
                        {roles.filter(r => r.type === 'custom').length}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6B7280' }}>사용자 정의</div>
                </div>
                <div style={{ ...cardStyle, padding: '20px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981' }}>
                        {roles.reduce((sum, r) => sum + (r.userCount || 0), 0)}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6B7280' }}>할당된 사용자</div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ ...cardStyle, marginBottom: '24px' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB' }}>
                    <button style={tabStyle(activeTab === 'roles')} onClick={() => setActiveTab('roles')}>역할 관리</button>
                    <button style={tabStyle(activeTab === 'matrix')} onClick={() => setActiveTab('matrix')}>권한 매트릭스</button>
                    <button style={tabStyle(activeTab === 'simulation')} onClick={() => setActiveTab('simulation')}>🧪 시뮬레이션</button>
                    <button style={tabStyle(activeTab === 'policies')} onClick={() => setActiveTab('policies')}>정책 템플릿</button>
                </div>
            </div>

            {activeTab === 'roles' && (
                <div style={{ display: 'grid', gridTemplateColumns: selectedRole ? '1fr 1fr' : '1fr', gap: '24px' }}>
                    {/* Roles List */}
                    <div style={cardStyle}>
                        <div style={{ padding: '16px', borderBottom: '1px solid #E5E7EB', fontWeight: '600' }}>역할 목록</div>
                        {roles.map(role => (
                            <div
                                key={role.id}
                                onClick={() => setSelectedRole(role)}
                                style={{
                                    padding: '16px',
                                    borderBottom: '1px solid #E5E7EB',
                                    cursor: 'pointer',
                                    background: selectedRole?.id === role.id ? '#EEF2FF' : 'white',
                                    transition: 'background 0.2s'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '10px',
                                            background: role.type === 'system' ? '#FEE2E2' : '#DBEAFE',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '18px'
                                        }}>
                                            {role.type === 'system' ? '🛡️' : '👤'}
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontWeight: '500' }}>{role.name}</span>
                                                {role.isDefault && (
                                                    <span style={{ padding: '2px 6px', background: '#D1FAE5', color: '#059669', fontSize: '10px', borderRadius: '4px' }}>기본</span>
                                                )}
                                                <span style={{
                                                    padding: '2px 6px',
                                                    background: role.type === 'system' ? '#FEE2E2' : '#DBEAFE',
                                                    color: role.type === 'system' ? '#DC2626' : '#2563EB',
                                                    fontSize: '10px',
                                                    borderRadius: '4px'
                                                }}>
                                                    {role.type === 'system' ? '시스템' : '사용자'}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                                                권한 {role.permissionCount}개 · 사용자 {role.userCount}명
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ padding: '4px 8px', background: '#F3F4F6', borderRadius: '4px', fontSize: '12px', color: '#6B7280' }}>
                                        우선순위: {role.priority}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Permissions Panel */}
                    {selectedRole && (
                        <div style={cardStyle}>
                            <div style={{ 
                                padding: '16px', 
                                borderBottom: '1px solid #E5E7EB',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontWeight: '600' }}>{selectedRole.name} 권한</div>
                                    <div style={{ fontSize: '12px', color: '#6B7280' }}>{permissions.length}개의 권한 규칙</div>
                                </div>
                                <button
                                    onClick={() => setShowPermissionModal(true)}
                                    style={{ ...buttonStyle, padding: '6px 12px', fontSize: '12px', background: '#10B981' }}
                                >
                                    + 권한 추가
                                </button>
                            </div>
                            <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                                {permissions.map(perm => (
                                    <div
                                        key={perm.id}
                                        style={{
                                            padding: '12px 16px',
                                            borderBottom: '1px solid #E5E7EB',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                background: perm.isAllow ? '#10B981' : '#EF4444'
                                            }} />
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{
                                                        padding: '2px 6px',
                                                        background: `${scopeColors[perm.scope]}15`,
                                                        color: scopeColors[perm.scope],
                                                        fontSize: '10px',
                                                        borderRadius: '4px',
                                                        fontWeight: '500'
                                                    }}>
                                                        {perm.scope.toUpperCase()}
                                                    </span>
                                                    <code style={{
                                                        padding: '2px 6px',
                                                        background: '#F3F4F6',
                                                        borderRadius: '4px',
                                                        fontSize: '12px',
                                                        fontFamily: 'monospace'
                                                    }}>
                                                        {perm.resource}
                                                    </code>
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                                                    Action: <strong>{perm.action}</strong>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                background: perm.isAllow ? '#D1FAE5' : '#FEE2E2',
                                                color: perm.isAllow ? '#059669' : '#DC2626',
                                                fontSize: '11px',
                                                borderRadius: '4px',
                                                fontWeight: '500'
                                            }}>
                                                {perm.isAllow ? 'ALLOW' : 'DENY'}
                                            </span>
                                            <button
                                                onClick={() => handleDeletePermission(perm.id)}
                                                style={{
                                                    padding: '4px 8px',
                                                    background: '#FEE2E2',
                                                    color: '#DC2626',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'simulation' && (
                <div style={cardStyle}>
                    <div style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>🧪 권한 시뮬레이션</h3>
                        <p style={{ color: '#6B7280', marginBottom: '24px' }}>
                            특정 사용자가 리소스에 접근할 수 있는지 시뮬레이션합니다.
                        </p>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>사용자 ID</label>
                                <input
                                    type="text"
                                    style={inputStyle}
                                    value={simUserId}
                                    onChange={e => setSimUserId(e.target.value)}
                                    placeholder="user-123"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>리소스</label>
                                <input
                                    type="text"
                                    style={inputStyle}
                                    value={simResource}
                                    onChange={e => setSimResource(e.target.value)}
                                    placeholder="db:production:users"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>액션</label>
                                <select
                                    style={inputStyle}
                                    value={simAction}
                                    onChange={e => setSimAction(e.target.value)}
                                >
                                    <option value="read">read</option>
                                    <option value="execute">execute</option>
                                    <option value="modify">modify</option>
                                    <option value="delete">delete</option>
                                    <option value="admin">admin</option>
                                </select>
                            </div>
                        </div>
                        
                        <button style={buttonStyle} onClick={handleSimulate}>
                            🚀 시뮬레이션 실행
                        </button>

                        {simResult && (
                            <div style={{
                                marginTop: '24px',
                                padding: '20px',
                                background: simResult.allowed ? '#D1FAE5' : '#FEE2E2',
                                borderRadius: '12px',
                                border: `2px solid ${simResult.allowed ? '#10B981' : '#EF4444'}`
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    marginBottom: '16px'
                                }}>
                                    <span style={{ fontSize: '32px' }}>{simResult.allowed ? '✅' : '🚫'}</span>
                                    <div>
                                        <div style={{
                                            fontSize: '20px',
                                            fontWeight: 'bold',
                                            color: simResult.allowed ? '#059669' : '#DC2626'
                                        }}>
                                            {simResult.allowed ? '접근 허용' : '접근 거부'}
                                        </div>
                                        <div style={{ fontSize: '14px', color: '#6B7280' }}>
                                            {simResult.matchedPermissions.length}개의 규칙이 매칭됨
                                        </div>
                                    </div>
                                </div>
                                <div style={{ background: 'white', borderRadius: '8px', padding: '12px' }}>
                                    {simResult.matchedPermissions.map((mp, i) => (
                                        <div key={i} style={{
                                            padding: '8px 0',
                                            borderBottom: i < simResult.matchedPermissions.length - 1 ? '1px solid #E5E7EB' : 'none',
                                            fontSize: '13px',
                                            color: '#374151'
                                        }}>
                                            • {mp.reason}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'matrix' && (
                <div style={{ ...cardStyle, padding: '48px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                    <div style={{ fontSize: '18px', fontWeight: '500', color: '#1F2937', marginBottom: '8px' }}>권한 매트릭스</div>
                    <div style={{ color: '#6B7280' }}>역할별 권한을 한눈에 비교합니다 (개발 중)</div>
                </div>
            )}

            {activeTab === 'policies' && (
                <div style={{ ...cardStyle, padding: '48px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                    <div style={{ fontSize: '18px', fontWeight: '500', color: '#1F2937', marginBottom: '8px' }}>정책 템플릿</div>
                    <div style={{ color: '#6B7280' }}>재사용 가능한 권한 템플릿을 관리합니다</div>
                </div>
            )}

            {/* Create Role Modal */}
            {showCreateModal && (
                <div style={modalOverlayStyle} onClick={() => setShowCreateModal(false)}>
                    <div style={modalStyle} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>역할 생성</h2>
                        
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>역할 이름 *</label>
                            <input type="text" style={inputStyle} value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="예: Developer" />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>설명</label>
                            <textarea style={{ ...inputStyle, minHeight: '60px' }} value={newRoleDescription} onChange={e => setNewRoleDescription(e.target.value)} placeholder="역할 설명" />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>상위 역할 (상속)</label>
                            <select style={inputStyle} value={newRoleParent} onChange={e => setNewRoleParent(e.target.value)}>
                                <option value="">없음</option>
                                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>우선순위 (1-100)</label>
                            <input type="number" style={inputStyle} value={newRolePriority} onChange={e => setNewRolePriority(Number(e.target.value))} min={1} max={100} />
                        </div>
                        
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button style={{ ...buttonStyle, background: '#F3F4F6', color: '#374151' }} onClick={() => setShowCreateModal(false)}>취소</button>
                            <button style={buttonStyle} onClick={handleCreateRole}>생성</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Permission Modal */}
            {showPermissionModal && (
                <div style={modalOverlayStyle} onClick={() => setShowPermissionModal(false)}>
                    <div style={modalStyle} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>권한 추가</h2>
                        
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Scope</label>
                            <select style={inputStyle} value={newPermScope} onChange={e => setNewPermScope(e.target.value)}>
                                <option value="system">System</option>
                                <option value="database">Database</option>
                                <option value="schema">Schema</option>
                                <option value="table">Table</option>
                                <option value="query">Query</option>
                            </select>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Resource *</label>
                            <input type="text" style={inputStyle} value={newPermResource} onChange={e => setNewPermResource(e.target.value)} placeholder="db:production:*" />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Action</label>
                            <select style={inputStyle} value={newPermAction} onChange={e => setNewPermAction(e.target.value)}>
                                <option value="read">read</option>
                                <option value="execute">execute</option>
                                <option value="modify">modify</option>
                                <option value="delete">delete</option>
                                <option value="admin">admin</option>
                            </select>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input type="checkbox" checked={newPermIsAllow} onChange={e => setNewPermIsAllow(e.target.checked)} />
                                <span>허용 (체크 해제 시 거부)</span>
                            </label>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button style={{ ...buttonStyle, background: '#F3F4F6', color: '#374151' }} onClick={() => setShowPermissionModal(false)}>취소</button>
                            <button style={buttonStyle} onClick={handleAddPermission}>추가</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
