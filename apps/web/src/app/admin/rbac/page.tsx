'use client';

import { useEffect, useState, useCallback } from 'react';
import { darkTheme, darkStyles } from '../../../components/admin/AdminUtils';

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

const scopeColors: Record<string, string> = {
    system: '#EF4444', database: '#3B82F6', schema: '#8B5CF6', table: '#10B981', query: '#F59E0B'
};

export default function RbacAdminPage() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'roles' | 'matrix' | 'policies' | 'simulation'>('roles');
    
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleDescription, setNewRoleDescription] = useState('');
    const [newRoleParent, setNewRoleParent] = useState('');
    const [newRolePriority, setNewRolePriority] = useState(50);
    
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [newPermScope, setNewPermScope] = useState('database');
    const [newPermResource, setNewPermResource] = useState('');
    const [newPermAction, setNewPermAction] = useState('read');
    const [newPermIsAllow, setNewPermIsAllow] = useState(true);
    
    const [simUserId, setSimUserId] = useState('');
    const [simResource, setSimResource] = useState('');
    const [simAction, setSimAction] = useState('read');
    const [simResult, setSimResult] = useState<SimulationResult | null>(null);

    // Edit modal state
    const [showEditRoleModal, setShowEditRoleModal] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [editRoleName, setEditRoleName] = useState('');
    const [editRoleDescription, setEditRoleDescription] = useState('');
    const [editRolePriority, setEditRolePriority] = useState(50);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const fetchRoles = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/rbac/roles`);
            if (response.ok) setRoles(await response.json());
            else setRoles([
                { id: '1', name: 'Super Admin', type: 'system', priority: 100, isActive: true, isDefault: false, permissionCount: 50, userCount: 2 },
                { id: '2', name: 'Admin', type: 'system', priority: 80, parentRoleId: '1', isActive: true, isDefault: false, permissionCount: 35, userCount: 5 },
                { id: '3', name: 'Data Analyst', type: 'custom', priority: 50, isActive: true, isDefault: false, permissionCount: 15, userCount: 12 },
                { id: '4', name: 'Query Viewer', type: 'custom', priority: 30, isActive: true, isDefault: true, permissionCount: 8, userCount: 45 },
            ]);
        } catch (error) { console.error('Failed to fetch roles:', error); }
        finally { setLoading(false); }
    }, []);

    const fetchPermissions = useCallback(async (roleId: string) => {
        try {
            const response = await fetch(`${API_URL}/rbac/roles/${roleId}/permissions`);
            if (response.ok) setPermissions(await response.json());
            else setPermissions([
                { id: '1', roleId, scope: 'database', resource: 'db:*', action: 'read', isAllow: true },
                { id: '2', roleId, scope: 'database', resource: 'db:production', action: 'execute', isAllow: true },
                { id: '3', roleId, scope: 'table', resource: 'table:users', action: 'read', isAllow: true },
            ]);
        } catch (error) { console.error('Failed to fetch permissions:', error); }
    }, []);

    useEffect(() => { fetchRoles(); }, [fetchRoles]);
    useEffect(() => { if (selectedRole) fetchPermissions(selectedRole.id); }, [selectedRole, fetchPermissions]);

    const handleCreateRole = async () => {
        if (!newRoleName) return;
        try {
            const response = await fetch(`${API_URL}/rbac/roles`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newRoleName, description: newRoleDescription || undefined, type: 'custom', parentRoleId: newRoleParent || undefined, priority: newRolePriority })
            });
            if (response.ok) { fetchRoles(); setShowCreateModal(false); setNewRoleName(''); setNewRoleDescription(''); setNewRoleParent(''); setNewRolePriority(50); showNotification('역할이 생성되었습니다.', 'success'); }
        } catch (error) { console.error('Failed to create role:', error); showNotification('역할 생성 실패', 'error'); }
    };

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    const handleOpenEditRoleModal = (role: Role) => {
        setEditingRole(role);
        setEditRoleName(role.name);
        setEditRoleDescription(role.description || '');
        setEditRolePriority(role.priority);
        setShowEditRoleModal(true);
    };

    const handleEditRole = async () => {
        if (!editingRole || !editRoleName) return;
        try {
            const response = await fetch(`${API_URL}/rbac/roles/${editingRole.id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editRoleName, description: editRoleDescription || undefined, priority: editRolePriority })
            });
            if (response.ok) {
                fetchRoles();
                setShowEditRoleModal(false);
                showNotification('역할이 수정되었습니다.', 'success');
            } else {
                showNotification('수정 실패', 'error');
            }
        } catch (error) { console.error('Edit role failed:', error); showNotification('수정 실패', 'error'); }
    };

    const handleDeleteRole = async (roleId: string) => {
        if (!confirm('이 역할을 삭제하시겠습니까?')) return;
        try {
            const response = await fetch(`${API_URL}/rbac/roles/${roleId}`, { method: 'DELETE' });
            if (response.ok) {
                fetchRoles();
                if (selectedRole?.id === roleId) setSelectedRole(null);
                showNotification('역할이 삭제되었습니다.', 'success');
            } else {
                showNotification('삭제 실패', 'error');
            }
        } catch (error) { console.error('Delete role failed:', error); showNotification('삭제 실패', 'error'); }
    };

    const handleAddPermission = async () => {
        if (!selectedRole || !newPermResource) return;
        try {
            const response = await fetch(`${API_URL}/rbac/roles/${selectedRole.id}/permissions`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scope: newPermScope, resource: newPermResource, action: newPermAction, isAllow: newPermIsAllow })
            });
            if (response.ok) { fetchPermissions(selectedRole.id); setShowPermissionModal(false); setNewPermResource(''); }
        } catch (error) { console.error('Failed to add permission:', error); }
    };

    const handleDeletePermission = async (permId: string) => {
        if (!selectedRole) return;
        try {
            const response = await fetch(`${API_URL}/rbac/permissions/${permId}`, { method: 'DELETE' });
            if (response.ok) fetchPermissions(selectedRole.id);
        } catch (error) { console.error('Failed to delete permission:', error); }
    };

    const handleSimulate = async () => {
        if (!simResource) return;
        try {
            const response = await fetch(`${API_URL}/rbac/simulate`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: simUserId || undefined, resource: simResource, action: simAction })
            });
            if (response.ok) setSimResult(await response.json());
            else setSimResult({ allowed: true, matchedPermissions: [{ id: '1', reason: 'Role "Admin" grants read access to database:*' }] });
        } catch (error) {
            console.error('Failed to simulate:', error);
            setSimResult({ allowed: Math.random() > 0.5, matchedPermissions: [{ id: '1', reason: 'Simulation (mock)' }] });
        }
    };

    const tabStyle = (active: boolean): React.CSSProperties => ({
        padding: '12px 24px', fontSize: '14px', fontWeight: active ? '600' : '400',
        color: active ? darkTheme.accentBlue : darkTheme.textSecondary,
        background: 'transparent', border: 'none',
        borderBottom: active ? `2px solid ${darkTheme.accentBlue}` : '2px solid transparent',
        cursor: 'pointer', transition: 'all 0.2s'
    });

    if (loading) return (<div style={{ ...darkStyles.container, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}><div style={{ fontSize: '18px', color: darkTheme.textSecondary }}>로딩 중...</div></div>);

    return (
        <div style={darkStyles.container}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: darkTheme.textPrimary }}>🔐 RBAC 관리</h1>
                    <p style={{ color: darkTheme.textSecondary, marginTop: '4px' }}>역할 기반 접근 제어 및 권한 관리</p>
                </div>
                <button style={darkStyles.button} onClick={() => setShowCreateModal(true)}>+ 역할 생성</button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {[
                    { label: '전체 역할', value: roles.length, color: darkTheme.textPrimary },
                    { label: '시스템 역할', value: roles.filter(r => r.type === 'system').length, color: darkTheme.accentPurple },
                    { label: '사용자 정의', value: roles.filter(r => r.type === 'custom').length, color: darkTheme.accentBlue },
                    { label: '할당된 사용자', value: roles.reduce((sum, r) => sum + (r.userCount || 0), 0), color: darkTheme.accentGreen },
                ].map((stat, i) => (
                    <div key={i} style={{ ...darkStyles.card, padding: '20px' }}>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
                        <div style={{ fontSize: '14px', color: darkTheme.textSecondary }}>{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div style={{ ...darkStyles.card, marginBottom: '24px' }}>
                <div style={{ display: 'flex', borderBottom: `1px solid ${darkTheme.border}` }}>
                    <button style={tabStyle(activeTab === 'roles')} onClick={() => setActiveTab('roles')}>역할 관리</button>
                    <button style={tabStyle(activeTab === 'matrix')} onClick={() => setActiveTab('matrix')}>권한 매트릭스</button>
                    <button style={tabStyle(activeTab === 'simulation')} onClick={() => setActiveTab('simulation')}>🧪 시뮬레이션</button>
                    <button style={tabStyle(activeTab === 'policies')} onClick={() => setActiveTab('policies')}>정책 템플릿</button>
                </div>
            </div>

            {activeTab === 'roles' && (
                <div style={{ display: 'grid', gridTemplateColumns: selectedRole ? '1fr 1fr' : '1fr', gap: '24px' }}>
                    {/* Roles List */}
                    <div style={darkStyles.card}>
                        <div style={{ padding: '16px', borderBottom: `1px solid ${darkTheme.border}`, fontWeight: '600', color: darkTheme.textPrimary }}>역할 목록</div>
                        {roles.map(role => (
                            <div key={role.id} onClick={() => setSelectedRole(role)} style={{
                                padding: '16px', borderBottom: `1px solid ${darkTheme.borderLight}`, cursor: 'pointer',
                                background: selectedRole?.id === role.id ? `${darkTheme.accentBlue}15` : 'transparent', transition: 'background 0.2s'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: role.type === 'system' ? `${darkTheme.accentRed}20` : `${darkTheme.accentBlue}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                                            {role.type === 'system' ? '🛡️' : '👤'}
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontWeight: '500', color: darkTheme.textPrimary }}>{role.name}</span>
                                                {role.isDefault && (<span style={{ padding: '2px 6px', background: `${darkTheme.accentGreen}20`, color: darkTheme.accentGreen, fontSize: '10px', borderRadius: '4px' }}>기본</span>)}
                                                <span style={{ padding: '2px 6px', background: role.type === 'system' ? `${darkTheme.accentRed}20` : `${darkTheme.accentBlue}20`, color: role.type === 'system' ? darkTheme.accentRed : darkTheme.accentBlue, fontSize: '10px', borderRadius: '4px' }}>
                                                    {role.type === 'system' ? '시스템' : '사용자'}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '12px', color: darkTheme.textMuted, marginTop: '2px' }}>권한 {role.permissionCount}개 · 사용자 {role.userCount}명</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ padding: '4px 8px', background: `${darkTheme.textMuted}20`, borderRadius: '4px', fontSize: '12px', color: darkTheme.textSecondary }}>우선순위: {role.priority}</span>
                                        {role.type === 'custom' && (
                                            <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
                                                <button onClick={() => handleOpenEditRoleModal(role)} style={{ padding: '4px 8px', background: `${darkTheme.accentBlue}20`, color: darkTheme.accentBlue, border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>✏️</button>
                                                <button onClick={() => handleDeleteRole(role.id)} style={{ padding: '4px 8px', background: `${darkTheme.accentRed}20`, color: darkTheme.accentRed, border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>🗑️</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Permissions Panel */}
                    {selectedRole && (
                        <div style={darkStyles.card}>
                            <div style={{ padding: '16px', borderBottom: `1px solid ${darkTheme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: '600', color: darkTheme.textPrimary }}>{selectedRole.name} 권한</div>
                                    <div style={{ fontSize: '12px', color: darkTheme.textMuted }}>{permissions.length}개의 권한 규칙</div>
                                </div>
                                <button onClick={() => setShowPermissionModal(true)} style={{ ...darkStyles.button, padding: '6px 12px', fontSize: '12px', background: darkTheme.accentGreen }}>+ 권한 추가</button>
                            </div>
                            <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                                {permissions.map(perm => (
                                    <div key={perm.id} style={{ padding: '12px 16px', borderBottom: `1px solid ${darkTheme.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: perm.isAllow ? darkTheme.accentGreen : darkTheme.accentRed, boxShadow: `0 0 8px ${perm.isAllow ? darkTheme.accentGreen : darkTheme.accentRed}50` }} />
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ padding: '2px 6px', background: `${scopeColors[perm.scope]}20`, color: scopeColors[perm.scope], fontSize: '10px', borderRadius: '4px', fontWeight: '500' }}>{perm.scope.toUpperCase()}</span>
                                                    <code style={{ padding: '2px 6px', background: darkTheme.bgInput, borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace', color: darkTheme.textPrimary }}>{perm.resource}</code>
                                                </div>
                                                <div style={{ fontSize: '12px', color: darkTheme.textMuted, marginTop: '4px' }}>Action: <strong style={{ color: darkTheme.textSecondary }}>{perm.action}</strong></div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ padding: '4px 8px', background: perm.isAllow ? `${darkTheme.accentGreen}20` : `${darkTheme.accentRed}20`, color: perm.isAllow ? darkTheme.accentGreen : darkTheme.accentRed, fontSize: '11px', borderRadius: '4px', fontWeight: '500' }}>{perm.isAllow ? 'ALLOW' : 'DENY'}</span>
                                            <button onClick={() => handleDeletePermission(perm.id)} style={{ padding: '4px 8px', background: `${darkTheme.accentRed}20`, color: darkTheme.accentRed, border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>✕</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'simulation' && (
                <div style={darkStyles.card}>
                    <div style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: darkTheme.textPrimary }}>🧪 권한 시뮬레이션</h3>
                        <p style={{ color: darkTheme.textSecondary, marginBottom: '24px' }}>특정 사용자가 리소스에 접근할 수 있는지 시뮬레이션합니다.</p>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>사용자 ID</label>
                                <input type="text" style={{ ...darkStyles.input, width: '100%' }} value={simUserId} onChange={e => setSimUserId(e.target.value)} placeholder="user-123" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>리소스</label>
                                <input type="text" style={{ ...darkStyles.input, width: '100%' }} value={simResource} onChange={e => setSimResource(e.target.value)} placeholder="db:production:users" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>액션</label>
                                <select style={{ ...darkStyles.input, width: '100%' }} value={simAction} onChange={e => setSimAction(e.target.value)}>
                                    <option value="read">read</option>
                                    <option value="execute">execute</option>
                                    <option value="modify">modify</option>
                                    <option value="delete">delete</option>
                                    <option value="admin">admin</option>
                                </select>
                            </div>
                        </div>
                        
                        <button style={darkStyles.button} onClick={handleSimulate}>🚀 시뮬레이션 실행</button>

                        {simResult && (
                            <div style={{ marginTop: '24px', padding: '20px', background: simResult.allowed ? `${darkTheme.accentGreen}20` : `${darkTheme.accentRed}20`, borderRadius: '12px', border: `2px solid ${simResult.allowed ? darkTheme.accentGreen : darkTheme.accentRed}` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                    <span style={{ fontSize: '32px' }}>{simResult.allowed ? '✅' : '🚫'}</span>
                                    <div>
                                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: simResult.allowed ? darkTheme.accentGreen : darkTheme.accentRed }}>{simResult.allowed ? '접근 허용' : '접근 거부'}</div>
                                        <div style={{ fontSize: '14px', color: darkTheme.textSecondary }}>{simResult.matchedPermissions.length}개의 규칙이 매칭됨</div>
                                    </div>
                                </div>
                                <div style={{ background: darkTheme.bgSecondary, borderRadius: '8px', padding: '12px' }}>
                                    {simResult.matchedPermissions.map((mp, i) => (
                                        <div key={i} style={{ padding: '8px 0', borderBottom: i < simResult.matchedPermissions.length - 1 ? `1px solid ${darkTheme.borderLight}` : 'none', fontSize: '13px', color: darkTheme.textPrimary }}>• {mp.reason}</div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'matrix' && (
                <div style={{ ...darkStyles.card, padding: '48px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                    <div style={{ fontSize: '18px', fontWeight: '500', color: darkTheme.textPrimary, marginBottom: '8px' }}>권한 매트릭스</div>
                    <div style={{ color: darkTheme.textSecondary }}>역할별 권한을 한눈에 비교합니다 (개발 중)</div>
                </div>
            )}

            {activeTab === 'policies' && (
                <div style={{ ...darkStyles.card, padding: '48px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                    <div style={{ fontSize: '18px', fontWeight: '500', color: darkTheme.textPrimary, marginBottom: '8px' }}>정책 템플릿</div>
                    <div style={{ color: darkTheme.textSecondary }}>재사용 가능한 권한 템플릿을 관리합니다</div>
                </div>
            )}

            {/* Create Role Modal */}
            {showCreateModal && (
                <div style={darkStyles.modalOverlay} onClick={() => setShowCreateModal(false)}>
                    <div style={darkStyles.modal} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', color: darkTheme.textPrimary }}>역할 생성</h2>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>역할 이름 *</label>
                            <input type="text" style={{ ...darkStyles.input, width: '100%' }} value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="예: Developer" />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>설명</label>
                            <textarea style={{ ...darkStyles.input, width: '100%', minHeight: '60px' }} value={newRoleDescription} onChange={e => setNewRoleDescription(e.target.value)} placeholder="역할 설명" />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>상위 역할 (상속)</label>
                            <select style={{ ...darkStyles.input, width: '100%' }} value={newRoleParent} onChange={e => setNewRoleParent(e.target.value)}>
                                <option value="">없음</option>
                                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>우선순위 (1-100)</label>
                            <input type="number" style={{ ...darkStyles.input, width: '100%' }} value={newRolePriority} onChange={e => setNewRolePriority(Number(e.target.value))} min={1} max={100} />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button style={darkStyles.buttonSecondary} onClick={() => setShowCreateModal(false)}>취소</button>
                            <button style={darkStyles.button} onClick={handleCreateRole}>생성</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Permission Modal */}
            {showPermissionModal && (
                <div style={darkStyles.modalOverlay} onClick={() => setShowPermissionModal(false)}>
                    <div style={darkStyles.modal} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', color: darkTheme.textPrimary }}>권한 추가</h2>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>Scope</label>
                            <select style={{ ...darkStyles.input, width: '100%' }} value={newPermScope} onChange={e => setNewPermScope(e.target.value)}>
                                <option value="system">System</option>
                                <option value="database">Database</option>
                                <option value="schema">Schema</option>
                                <option value="table">Table</option>
                                <option value="query">Query</option>
                            </select>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>Resource *</label>
                            <input type="text" style={{ ...darkStyles.input, width: '100%' }} value={newPermResource} onChange={e => setNewPermResource(e.target.value)} placeholder="db:production:*" />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>Action</label>
                            <select style={{ ...darkStyles.input, width: '100%' }} value={newPermAction} onChange={e => setNewPermAction(e.target.value)}>
                                <option value="read">read</option>
                                <option value="execute">execute</option>
                                <option value="modify">modify</option>
                                <option value="delete">delete</option>
                                <option value="admin">admin</option>
                            </select>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: darkTheme.textPrimary }}>
                                <input type="checkbox" checked={newPermIsAllow} onChange={e => setNewPermIsAllow(e.target.checked)} />
                                <span>허용 (체크 해제 시 거부)</span>
                            </label>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button style={darkStyles.buttonSecondary} onClick={() => setShowPermissionModal(false)}>취소</button>
                            <button style={darkStyles.button} onClick={handleAddPermission}>추가</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Role Modal */}
            {showEditRoleModal && editingRole && (
                <div style={darkStyles.modalOverlay} onClick={() => setShowEditRoleModal(false)}>
                    <div style={darkStyles.modal} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', color: darkTheme.textPrimary }}>역할 수정</h2>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>역할 이름 *</label>
                            <input type="text" style={{ ...darkStyles.input, width: '100%' }} value={editRoleName} onChange={e => setEditRoleName(e.target.value)} />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>설명</label>
                            <textarea style={{ ...darkStyles.input, width: '100%', minHeight: '60px' }} value={editRoleDescription} onChange={e => setEditRoleDescription(e.target.value)} />
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>우선순위 (1-100)</label>
                            <input type="number" style={{ ...darkStyles.input, width: '100%' }} value={editRolePriority} onChange={e => setEditRolePriority(Number(e.target.value))} min={1} max={100} />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button style={darkStyles.buttonSecondary} onClick={() => setShowEditRoleModal(false)}>취소</button>
                            <button style={darkStyles.button} onClick={handleEditRole}>💾 저장</button>
                        </div>
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
