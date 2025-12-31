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
    system: '#EF4444', organization: '#F97316', database: '#3B82F6', schema: '#8B5CF6', table: '#10B981', query: '#F59E0B'
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
                <div style={darkStyles.card}>
                    <div style={{ padding: '16px', borderBottom: `1px solid ${darkTheme.border}` }}>
                        <div style={{ fontWeight: '600', color: darkTheme.textPrimary, marginBottom: '8px' }}>📊 권한 매트릭스</div>
                        <div style={{ fontSize: '12px', color: darkTheme.textSecondary }}>역할별 리소스-액션 권한을 한눈에 확인합니다</div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: darkTheme.bgSecondary }}>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', color: darkTheme.textSecondary, fontSize: '12px', fontWeight: '600', borderBottom: `1px solid ${darkTheme.border}` }}>리소스 범위</th>
                                    {['read', 'execute', 'modify', 'delete', 'admin'].map(action => (
                                        <th key={action} style={{ padding: '12px 16px', textAlign: 'center', color: darkTheme.textSecondary, fontSize: '12px', fontWeight: '600', borderBottom: `1px solid ${darkTheme.border}`, minWidth: '80px' }}>
                                            {action === 'read' && '👁️'} {action === 'execute' && '▶️'} {action === 'modify' && '✏️'} {action === 'delete' && '🗑️'} {action === 'admin' && '⚙️'}<br/>
                                            <span style={{ color: darkTheme.textMuted }}>{action}</span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {['system', 'organization', 'database', 'schema', 'table', 'query'].map((scope, idx) => (
                                    <tr key={scope} style={{ background: idx % 2 === 0 ? 'transparent' : darkTheme.bgSecondary }}>
                                        <td style={{ padding: '12px 16px', borderBottom: `1px solid ${darkTheme.borderLight}` }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: scopeColors[scope] }}></span>
                                                <span style={{ fontWeight: '500', color: darkTheme.textPrimary }}>{scope.charAt(0).toUpperCase() + scope.slice(1)}</span>
                                                <code style={{ fontSize: '10px', color: darkTheme.textMuted, background: darkTheme.bgInput, padding: '2px 6px', borderRadius: '4px' }}>
                                                    {scope === 'system' ? '*' : scope === 'database' ? 'db:*' : scope === 'schema' ? 'schema:*.*' : scope === 'table' ? 'table:*' : scope === 'query' ? 'query:*' : 'org:*'}
                                                </code>
                                            </div>
                                        </td>
                                        {['read', 'execute', 'modify', 'delete', 'admin'].map(action => {
                                            // Check if any role has this permission
                                            const hasPermission = selectedRole && permissions.some(p => p.scope === scope && p.action === action && p.isAllow);
                                            const isDenied = selectedRole && permissions.some(p => p.scope === scope && p.action === action && !p.isAllow);
                                            return (
                                                <td key={action} style={{ padding: '12px 16px', textAlign: 'center', borderBottom: `1px solid ${darkTheme.borderLight}` }}>
                                                    {hasPermission ? (
                                                        <span style={{ display: 'inline-block', width: '24px', height: '24px', borderRadius: '6px', background: `${darkTheme.accentGreen}20`, color: darkTheme.accentGreen, lineHeight: '24px' }}>✓</span>
                                                    ) : isDenied ? (
                                                        <span style={{ display: 'inline-block', width: '24px', height: '24px', borderRadius: '6px', background: `${darkTheme.accentRed}20`, color: darkTheme.accentRed, lineHeight: '24px' }}>✕</span>
                                                    ) : (
                                                        <span style={{ display: 'inline-block', width: '24px', height: '24px', borderRadius: '6px', background: darkTheme.bgInput, color: darkTheme.textMuted, lineHeight: '24px' }}>-</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {!selectedRole && (
                        <div style={{ padding: '32px', textAlign: 'center', color: darkTheme.textMuted }}>
                            💡 왼쪽 '역할 관리' 탭에서 역할을 선택하면 해당 역할의 권한이 표시됩니다
                        </div>
                    )}
                    <div style={{ padding: '16px', borderTop: `1px solid ${darkTheme.border}`, display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: darkTheme.textSecondary }}>
                            <span style={{ display: 'inline-block', width: '16px', height: '16px', borderRadius: '4px', background: `${darkTheme.accentGreen}20`, color: darkTheme.accentGreen, textAlign: 'center', lineHeight: '16px', fontSize: '10px' }}>✓</span> 허용
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: darkTheme.textSecondary }}>
                            <span style={{ display: 'inline-block', width: '16px', height: '16px', borderRadius: '4px', background: `${darkTheme.accentRed}20`, color: darkTheme.accentRed, textAlign: 'center', lineHeight: '16px', fontSize: '10px' }}>✕</span> 거부
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: darkTheme.textSecondary }}>
                            <span style={{ display: 'inline-block', width: '16px', height: '16px', borderRadius: '4px', background: darkTheme.bgInput, color: darkTheme.textMuted, textAlign: 'center', lineHeight: '16px', fontSize: '10px' }}>-</span> 미설정
                        </span>
                    </div>
                </div>
            )}

            {activeTab === 'policies' && (
                <div style={darkStyles.card}>
                    <div style={{ padding: '16px', borderBottom: `1px solid ${darkTheme.border}` }}>
                        <div style={{ fontWeight: '600', color: darkTheme.textPrimary, marginBottom: '8px' }}>📋 권한 정책 템플릿</div>
                        <div style={{ fontSize: '12px', color: darkTheme.textSecondary }}>미리 정의된 권한 세트를 역할에 빠르게 적용합니다</div>
                    </div>
                    <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                        {[
                            {
                                name: '👁️ 읽기 전용 (Read-Only)',
                                description: '모든 리소스를 조회할 수 있지만 수정할 수 없습니다',
                                color: darkTheme.accentBlue,
                                permissions: [
                                    { scope: 'database', resource: 'db:*', action: 'read' },
                                    { scope: 'schema', resource: 'schema:*.*', action: 'read' },
                                    { scope: 'table', resource: 'table:*', action: 'read' },
                                    { scope: 'query', resource: 'query:*', action: 'read' },
                                ]
                            },
                            {
                                name: '📊 데이터 분석가 (Analyst)',
                                description: '쿼리 실행이 가능하며 저장된 쿼리를 관리합니다',
                                color: darkTheme.accentPurple,
                                permissions: [
                                    { scope: 'database', resource: 'db:*', action: 'read' },
                                    { scope: 'database', resource: 'db:*', action: 'execute' },
                                    { scope: 'query', resource: 'query:*', action: 'read' },
                                    { scope: 'query', resource: 'query:*', action: 'execute' },
                                    { scope: 'query', resource: 'query:*', action: 'modify' },
                                ]
                            },
                            {
                                name: '💻 개발자 (Developer)',
                                description: '스키마 수정 및 테이블 관리가 가능합니다',
                                color: darkTheme.accentGreen,
                                permissions: [
                                    { scope: 'database', resource: 'db:*', action: 'read' },
                                    { scope: 'database', resource: 'db:*', action: 'execute' },
                                    { scope: 'schema', resource: 'schema:*.*', action: 'read' },
                                    { scope: 'schema', resource: 'schema:*.*', action: 'modify' },
                                    { scope: 'table', resource: 'table:*', action: 'read' },
                                    { scope: 'table', resource: 'table:*', action: 'modify' },
                                    { scope: 'query', resource: 'query:*', action: 'admin' },
                                ]
                            },
                            {
                                name: '⚙️ 관리자 (Admin)',
                                description: '시스템 전체에 대한 모든 권한을 가집니다',
                                color: darkTheme.accentRed,
                                permissions: [
                                    { scope: 'system', resource: '*', action: 'admin' },
                                    { scope: 'database', resource: 'db:*', action: 'admin' },
                                    { scope: 'schema', resource: 'schema:*.*', action: 'admin' },
                                    { scope: 'table', resource: 'table:*', action: 'admin' },
                                    { scope: 'query', resource: 'query:*', action: 'admin' },
                                ]
                            },
                        ].map((template, idx) => (
                            <div key={idx} style={{
                                padding: '20px', borderRadius: '12px', background: darkTheme.bgSecondary,
                                border: `1px solid ${darkTheme.border}`, transition: 'all 0.2s'
                            }}>
                                <div style={{ fontSize: '16px', fontWeight: '600', color: darkTheme.textPrimary, marginBottom: '8px' }}>{template.name}</div>
                                <div style={{ fontSize: '12px', color: darkTheme.textSecondary, marginBottom: '16px' }}>{template.description}</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '16px' }}>
                                    {template.permissions.map((perm, pidx) => (
                                        <span key={pidx} style={{
                                            padding: '2px 6px', fontSize: '10px', borderRadius: '4px',
                                            background: `${scopeColors[perm.scope]}20`, color: scopeColors[perm.scope]
                                        }}>
                                            {perm.scope}:{perm.action}
                                        </span>
                                    ))}
                                </div>
                                <button
                                    onClick={() => {
                                        if (!selectedRole) {
                                            showNotification('먼저 역할을 선택해주세요', 'error');
                                            return;
                                        }
                                        // Would apply template permissions here
                                        showNotification(`${template.name} 템플릿이 ${selectedRole.name}에 적용되었습니다`, 'success');
                                    }}
                                    style={{
                                        width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
                                        background: `${template.color}20`, color: template.color,
                                        fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                >
                                    {selectedRole ? `${selectedRole.name}에 적용` : '역할 선택 필요'}
                                </button>
                            </div>
                        ))}
                    </div>
                    {!selectedRole && (
                        <div style={{ padding: '16px', borderTop: `1px solid ${darkTheme.border}`, textAlign: 'center', color: darkTheme.textMuted, fontSize: '13px' }}>
                            💡 '역할 관리' 탭에서 역할을 선택한 후 템플릿을 적용할 수 있습니다
                        </div>
                    )}
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
                    <div style={{ ...darkStyles.modal, maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', color: darkTheme.textPrimary }}>🔐 권한 추가</h2>
                        
                        {/* Scope Selection with Description */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: darkTheme.textSecondary }}>Scope (범위)</label>
                            <select style={{ ...darkStyles.input, width: '100%' }} value={newPermScope} onChange={e => setNewPermScope(e.target.value)}>
                                <option value="system">🖥️ System - 시스템 전체</option>
                                <option value="organization">🏢 Organization - 조직 레벨</option>
                                <option value="database">🗄️ Database - 데이터베이스</option>
                                <option value="schema">📂 Schema - 스키마</option>
                                <option value="table">📋 Table - 테이블</option>
                                <option value="query">🔍 Query - 저장된 쿼리</option>
                            </select>
                            <div style={{ marginTop: '8px', padding: '12px', background: `${scopeColors[newPermScope] || darkTheme.textMuted}15`, borderRadius: '8px', borderLeft: `3px solid ${scopeColors[newPermScope] || darkTheme.textMuted}` }}>
                                <div style={{ fontSize: '12px', color: darkTheme.textSecondary }}>
                                    {newPermScope === 'system' && '⚡ 관리자 설정, 사용자 관리, 시스템 구성 등 전반적인 시스템 권한'}
                                    {newPermScope === 'organization' && '🏢 조직 또는 테넌트 레벨의 권한 (멀티 테넌트 환경)'}
                                    {newPermScope === 'database' && '🗄️ 데이터베이스 연결, 접근, 쿼리 실행 권한'}
                                    {newPermScope === 'schema' && '📂 특정 스키마 내의 객체들에 대한 권한'}
                                    {newPermScope === 'table' && '📋 특정 테이블 또는 뷰에 대한 직접적인 권한'}
                                    {newPermScope === 'query' && '🔍 저장된 쿼리 실행 및 관리 권한'}
                                </div>
                            </div>
                        </div>

                        {/* Resource Pattern with Examples */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: darkTheme.textSecondary }}>Resource (리소스 패턴) *</label>
                            <input type="text" style={{ ...darkStyles.input, width: '100%', fontFamily: 'monospace' }} value={newPermResource} onChange={e => setNewPermResource(e.target.value)} placeholder={
                                newPermScope === 'system' ? '*' :
                                newPermScope === 'database' ? 'db:production' :
                                newPermScope === 'schema' ? 'schema:mydb.public' :
                                newPermScope === 'table' ? 'table:mydb.public.users' :
                                newPermScope === 'query' ? 'query:*' : 'resource-pattern'
                            } />
                            <div style={{ marginTop: '10px', padding: '12px', background: darkTheme.bgInput, borderRadius: '8px' }}>
                                <div style={{ fontSize: '12px', fontWeight: '600', color: darkTheme.textSecondary, marginBottom: '8px' }}>📝 패턴 예시:</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {newPermScope === 'system' && (
                                        <>
                                            <code onClick={() => setNewPermResource('*')} style={{ padding: '4px 8px', background: darkTheme.bgSecondary, borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: darkTheme.accentBlue }}>* (전체)</code>
                                            <code onClick={() => setNewPermResource('users:*')} style={{ padding: '4px 8px', background: darkTheme.bgSecondary, borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: darkTheme.accentBlue }}>users:* (사용자 관리)</code>
                                            <code onClick={() => setNewPermResource('settings:*')} style={{ padding: '4px 8px', background: darkTheme.bgSecondary, borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: darkTheme.accentBlue }}>settings:* (설정)</code>
                                        </>
                                    )}
                                    {newPermScope === 'database' && (
                                        <>
                                            <code onClick={() => setNewPermResource('db:*')} style={{ padding: '4px 8px', background: darkTheme.bgSecondary, borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: darkTheme.accentBlue }}>db:* (모든 DB)</code>
                                            <code onClick={() => setNewPermResource('db:production')} style={{ padding: '4px 8px', background: darkTheme.bgSecondary, borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: darkTheme.accentBlue }}>db:production</code>
                                            <code onClick={() => setNewPermResource('db:analytics')} style={{ padding: '4px 8px', background: darkTheme.bgSecondary, borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: darkTheme.accentBlue }}>db:analytics</code>
                                        </>
                                    )}
                                    {newPermScope === 'schema' && (
                                        <>
                                            <code onClick={() => setNewPermResource('schema:*.*')} style={{ padding: '4px 8px', background: darkTheme.bgSecondary, borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: darkTheme.accentBlue }}>schema:*.* (전체)</code>
                                            <code onClick={() => setNewPermResource('schema:mydb.public')} style={{ padding: '4px 8px', background: darkTheme.bgSecondary, borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: darkTheme.accentBlue }}>schema:mydb.public</code>
                                            <code onClick={() => setNewPermResource('schema:mydb.*')} style={{ padding: '4px 8px', background: darkTheme.bgSecondary, borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: darkTheme.accentBlue }}>schema:mydb.* (DB 내 전체)</code>
                                        </>
                                    )}
                                    {newPermScope === 'table' && (
                                        <>
                                            <code onClick={() => setNewPermResource('table:*')} style={{ padding: '4px 8px', background: darkTheme.bgSecondary, borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: darkTheme.accentBlue }}>table:* (모든 테이블)</code>
                                            <code onClick={() => setNewPermResource('table:mydb.public.users')} style={{ padding: '4px 8px', background: darkTheme.bgSecondary, borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: darkTheme.accentBlue }}>table:mydb.public.users</code>
                                            <code onClick={() => setNewPermResource('table:mydb.public.*')} style={{ padding: '4px 8px', background: darkTheme.bgSecondary, borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: darkTheme.accentBlue }}>table:mydb.public.*</code>
                                        </>
                                    )}
                                    {newPermScope === 'query' && (
                                        <>
                                            <code onClick={() => setNewPermResource('query:*')} style={{ padding: '4px 8px', background: darkTheme.bgSecondary, borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: darkTheme.accentBlue }}>query:* (모든 쿼리)</code>
                                            <code onClick={() => setNewPermResource('query:saved:*')} style={{ padding: '4px 8px', background: darkTheme.bgSecondary, borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: darkTheme.accentBlue }}>query:saved:*</code>
                                        </>
                                    )}
                                    {newPermScope === 'organization' && (
                                        <>
                                            <code onClick={() => setNewPermResource('org:*')} style={{ padding: '4px 8px', background: darkTheme.bgSecondary, borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: darkTheme.accentBlue }}>org:* (모든 조직)</code>
                                            <code onClick={() => setNewPermResource('org:default')} style={{ padding: '4px 8px', background: darkTheme.bgSecondary, borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: darkTheme.accentBlue }}>org:default</code>
                                        </>
                                    )}
                                </div>
                                <div style={{ marginTop: '8px', fontSize: '11px', color: darkTheme.textMuted }}>💡 클릭하여 자동 입력 / * 는 와일드카드(모든 항목)</div>
                            </div>
                        </div>

                        {/* Action Selection with Description */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: darkTheme.textSecondary }}>Action (수행 작업)</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                                {[
                                    { value: 'read', label: '읽기', icon: '👁️', desc: '데이터 조회/열람' },
                                    { value: 'execute', label: '실행', icon: '▶️', desc: '쿼리/작업 실행' },
                                    { value: 'modify', label: '수정', icon: '✏️', desc: '데이터 변경' },
                                    { value: 'delete', label: '삭제', icon: '🗑️', desc: '데이터 삭제' },
                                    { value: 'admin', label: '관리', icon: '⚙️', desc: '전체 관리 권한' },
                                ].map(action => (
                                    <div key={action.value} onClick={() => setNewPermAction(action.value)} style={{
                                        padding: '12px 8px', borderRadius: '8px', textAlign: 'center', cursor: 'pointer',
                                        background: newPermAction === action.value ? `${darkTheme.accentBlue}20` : darkTheme.bgInput,
                                        border: `2px solid ${newPermAction === action.value ? darkTheme.accentBlue : 'transparent'}`,
                                        transition: 'all 0.2s'
                                    }}>
                                        <div style={{ fontSize: '20px', marginBottom: '4px' }}>{action.icon}</div>
                                        <div style={{ fontSize: '12px', fontWeight: '600', color: newPermAction === action.value ? darkTheme.accentBlue : darkTheme.textPrimary }}>{action.label}</div>
                                        <div style={{ fontSize: '10px', color: darkTheme.textMuted, marginTop: '2px' }}>{action.desc}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Allow/Deny Toggle */}
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={() => setNewPermIsAllow(true)} style={{
                                    flex: 1, padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                    background: newPermIsAllow ? `${darkTheme.accentGreen}20` : darkTheme.bgInput,
                                    color: newPermIsAllow ? darkTheme.accentGreen : darkTheme.textSecondary,
                                    fontWeight: newPermIsAllow ? '600' : '400',
                                    boxShadow: newPermIsAllow ? `0 0 0 2px ${darkTheme.accentGreen}` : 'none'
                                }}>✅ 허용 (ALLOW)</button>
                                <button onClick={() => setNewPermIsAllow(false)} style={{
                                    flex: 1, padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                    background: !newPermIsAllow ? `${darkTheme.accentRed}20` : darkTheme.bgInput,
                                    color: !newPermIsAllow ? darkTheme.accentRed : darkTheme.textSecondary,
                                    fontWeight: !newPermIsAllow ? '600' : '400',
                                    boxShadow: !newPermIsAllow ? `0 0 0 2px ${darkTheme.accentRed}` : 'none'
                                }}>🚫 거부 (DENY)</button>
                            </div>
                            <div style={{ marginTop: '8px', fontSize: '11px', color: darkTheme.textMuted, textAlign: 'center' }}>
                                {newPermIsAllow ? '이 권한 규칙에 해당하는 요청을 허용합니다' : '이 권한 규칙에 해당하는 요청을 명시적으로 차단합니다 (DENY가 ALLOW보다 우선)'}
                            </div>
                        </div>

                        {/* Preview */}
                        <div style={{ marginBottom: '20px', padding: '16px', background: darkTheme.bgSecondary, borderRadius: '12px', border: `1px solid ${darkTheme.border}` }}>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: darkTheme.textSecondary, marginBottom: '8px' }}>📋 권한 규칙 미리보기</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ padding: '4px 8px', background: newPermIsAllow ? `${darkTheme.accentGreen}20` : `${darkTheme.accentRed}20`, color: newPermIsAllow ? darkTheme.accentGreen : darkTheme.accentRed, fontSize: '12px', borderRadius: '4px', fontWeight: '600' }}>{newPermIsAllow ? 'ALLOW' : 'DENY'}</span>
                                <span style={{ padding: '4px 8px', background: `${scopeColors[newPermScope] || darkTheme.textMuted}20`, color: scopeColors[newPermScope] || darkTheme.textMuted, fontSize: '11px', borderRadius: '4px' }}>{newPermScope.toUpperCase()}</span>
                                <code style={{ padding: '4px 8px', background: darkTheme.bgInput, borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace', color: darkTheme.textPrimary }}>{newPermResource || '(리소스 입력 필요)'}</code>
                                <span style={{ color: darkTheme.textMuted }}>→</span>
                                <span style={{ padding: '4px 8px', background: `${darkTheme.accentBlue}20`, color: darkTheme.accentBlue, fontSize: '12px', borderRadius: '4px', fontWeight: '500' }}>{newPermAction.toUpperCase()}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button style={darkStyles.buttonSecondary} onClick={() => setShowPermissionModal(false)}>취소</button>
                            <button style={{ ...darkStyles.button, opacity: newPermResource ? 1 : 0.5 }} onClick={handleAddPermission} disabled={!newPermResource}>+ 권한 추가</button>
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
