'use client';

import { useEffect, useState, useCallback } from 'react';
import { darkTheme, darkStyles } from '../../../components/admin/AdminUtils';

const API_URL = '/api';

interface Group {
    id: string;
    name: string;
    description?: string;
    type: 'organization' | 'project' | 'task';
    parentId?: string;
    ownerId?: string;
    isAutoGroup: boolean;
    autoGroupCondition?: Record<string, unknown>;
    memberCount?: number;
    createdAt: string;
}

interface GroupMember {
    id: string;
    userId: string;
    userName?: string;
    userEmail?: string;
    role: string;
    addedAt: string;
}

interface User {
    id: string;
    username: string;
    email: string;
    displayName?: string;
    isActive: boolean;
}

const typeColors: Record<string, string> = {
    organization: '#8B5CF6',
    project: '#3B82F6',
    task: '#10B981'
};

const typeLabels: Record<string, string> = {
    organization: '조직',
    project: '프로젝트',
    task: '업무'
};

export default function GroupsAdminPage() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [members, setMembers] = useState<GroupMember[]>([]);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [users, setUsers] = useState<User[]>([]);
    
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupType, setNewGroupType] = useState<'organization' | 'project' | 'task'>('project');
    const [newGroupDescription, setNewGroupDescription] = useState('');
    const [newGroupParent, setNewGroupParent] = useState<string>('');
    const [isAutoGroup, setIsAutoGroup] = useState(false);
    const [autoCondition, setAutoCondition] = useState('');

    // Edit modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Group | null>(null);
    const [editGroupName, setEditGroupName] = useState('');
    const [editGroupType, setEditGroupType] = useState<'organization' | 'project' | 'task'>('project');
    const [editGroupDescription, setEditGroupDescription] = useState('');
    const [editGroupParent, setEditGroupParent] = useState<string>('');
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string>('');

    const fetchGroups = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/groups`);
            if (response.ok) {
                const data = await response.json();
                setGroups(Array.isArray(data) ? data : []);
            } else {
                console.warn('Failed to fetch groups, API returned:', response.status);
                setGroups([]);
            }
        } catch (error) {
            console.error('Failed to fetch groups:', error);
            setGroups([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchMembers = useCallback(async (groupId: string) => {
        try {
            const response = await fetch(`${API_URL}/groups/${groupId}/members`);
            if (response.ok) {
                const data = await response.json();
                setMembers(Array.isArray(data) ? data : []);
            } else {
                console.warn('Failed to fetch members, API returned:', response.status);
                setMembers([]);
            }
        } catch (error) {
            console.error('Failed to fetch members:', error);
            setMembers([]);
        }
    }, []);

    const fetchUsers = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/users?limit=100`);
            if (response.ok) {
                const data = await response.json();
                // Handle both array and object with items property
                const userList = Array.isArray(data) ? data : (data.items || data.users || []);
                setUsers(userList.filter((u: User) => u.isActive !== false));
            }
        } catch (error) { console.error('Failed to fetch users:', error); }
    }, []);

    useEffect(() => { fetchGroups(); fetchUsers(); }, [fetchGroups, fetchUsers]);

    const handleCreateGroup = async () => {
        if (!newGroupName) return;
        try {
            const response = await fetch(`${API_URL}/groups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newGroupName,
                    type: newGroupType,
                    description: newGroupDescription || undefined,
                    parentId: newGroupParent || undefined,
                    isAutoGroup,
                    autoGroupCondition: isAutoGroup && autoCondition ? JSON.parse(autoCondition) : undefined
                })
            });
            if (response.ok) { fetchGroups(); setShowCreateModal(false); resetForm(); }
        } catch (error) { console.error('Failed to create group:', error); }
    };

    const handleDeleteGroup = async (groupId: string) => {
        if (!confirm('그룹을 삭제하시겠습니까?')) return;
        try {
            const response = await fetch(`${API_URL}/groups/${groupId}`, { method: 'DELETE' });
            if (response.ok) fetchGroups();
        } catch (error) { console.error('Failed to delete group:', error); }
    };

    const handleRemoveMember = async (groupId: string, userId: string) => {
        try {
            const response = await fetch(`${API_URL}/groups/${groupId}/members/${userId}`, { method: 'DELETE' });
            if (response.ok) fetchMembers(groupId);
        } catch (error) { console.error('Failed to remove member:', error); }
    };

    const handleOpenMembers = async (group: Group) => {
        setSelectedGroup(group);
        await fetchMembers(group.id);
        setShowMembersModal(true);
    };

    const resetForm = () => {
        setNewGroupName(''); setNewGroupType('project'); setNewGroupDescription('');
        setNewGroupParent(''); setIsAutoGroup(false); setAutoCondition('');
    };

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    const handleOpenEditModal = (group: Group) => {
        setEditingGroup(group);
        setEditGroupName(group.name);
        setEditGroupType(group.type);
        setEditGroupDescription(group.description || '');
        setEditGroupParent(group.parentId || '');
        setShowEditModal(true);
    };

    const handleEditGroup = async () => {
        if (!editingGroup || !editGroupName) return;
        try {
            const response = await fetch(`${API_URL}/groups/${editingGroup.id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editGroupName,
                    type: editGroupType,
                    description: editGroupDescription || undefined,
                    parentId: editGroupParent || undefined,
                    updatedBy: 'admin'
                })
            });
            if (response.ok) {
                fetchGroups();
                setShowEditModal(false);
                showNotification('그룹이 수정되었습니다.', 'success');
            } else {
                showNotification('수정 실패', 'error');
            }
        } catch (error) { console.error('Edit group failed:', error); showNotification('수정 실패', 'error'); }
    };

    const handleAddMember = async () => {
        if (!selectedGroup || !selectedUserId) return;
        try {
            const response = await fetch(`${API_URL}/groups/${selectedGroup.id}/members`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: selectedUserId, addedBy: 'admin' })
            });
            if (response.ok) {
                fetchMembers(selectedGroup.id);
                setSelectedUserId('');
                showNotification('멤버가 추가되었습니다.', 'success');
            } else {
                showNotification('멤버 추가 실패', 'error');
            }
        } catch (error) { console.error('Add member failed:', error); showNotification('멤버 추가 실패', 'error'); }
    };

    // Filter out users already in the group
    const getAvailableUsers = () => {
        const memberUserIds = new Set(members.map(m => m.userId));
        return users.filter(u => !memberUserIds.has(u.id));
    };

    const getChildren = (parentId: string): Group[] => groups.filter(g => g.parentId === parentId);
    const getRootGroups = (): Group[] => groups.filter(g => !g.parentId);
    const toggleExpand = (groupId: string) => {
        const newExpanded = new Set(expandedGroups);
        if (newExpanded.has(groupId)) newExpanded.delete(groupId);
        else newExpanded.add(groupId);
        setExpandedGroups(newExpanded);
    };

    const filteredGroups = groups.filter(group => {
        const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === 'all' || group.type === typeFilter;
        return matchesSearch && matchesType;
    });

    const GroupNode = ({ group, depth = 0 }: { group: Group; depth?: number }) => {
        const children = getChildren(group.id);
        const hasChildren = children.length > 0;
        const isExpanded = expandedGroups.has(group.id);

        return (
            <div>
                <div 
                    style={{ 
                        display: 'flex', alignItems: 'center', padding: '12px 16px',
                        paddingLeft: `${16 + depth * 24}px`,
                        borderBottom: `1px solid ${darkTheme.borderLight}`,
                        background: depth > 0 ? 'rgba(15, 23, 42, 0.3)' : 'transparent',
                        transition: 'background 0.2s',
                        cursor: hasChildren ? 'pointer' : 'default'
                    }}
                    onClick={() => hasChildren && toggleExpand(group.id)}
                    onMouseEnter={e => (e.currentTarget.style.background = darkTheme.bgCardHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = depth > 0 ? 'rgba(15, 23, 42, 0.3)' : 'transparent')}
                >
                    <span style={{ width: '24px', marginRight: '8px', color: darkTheme.textMuted }}>
                        {hasChildren ? (isExpanded ? '▼' : '▶') : '•'}
                    </span>
                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: typeColors[group.type], marginRight: '12px', boxShadow: `0 0 8px ${typeColors[group.type]}50` }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '500', color: darkTheme.textPrimary }}>{group.name}</span>
                            {group.isAutoGroup && (
                                <span style={{ padding: '2px 6px', background: `${darkTheme.accentYellow}20`, color: darkTheme.accentYellow, fontSize: '10px', borderRadius: '4px', fontWeight: '500' }}>자동</span>
                            )}
                        </div>
                        {group.description && (<div style={{ fontSize: '12px', color: darkTheme.textMuted, marginTop: '2px' }}>{group.description}</div>)}
                    </div>
                    <span style={{ padding: '4px 8px', background: `${typeColors[group.type]}20`, color: typeColors[group.type], fontSize: '12px', borderRadius: '4px', marginRight: '16px' }}>{typeLabels[group.type]}</span>
                    <span style={{ fontSize: '14px', color: darkTheme.textSecondary, width: '80px' }}>👥 {group.memberCount || 0}</span>
                    <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleOpenEditModal(group)} style={{ padding: '4px 12px', background: `${darkTheme.accentBlue}20`, color: darkTheme.accentBlue, border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>✏️</button>
                        <button onClick={() => handleOpenMembers(group)} style={{ padding: '4px 12px', background: `${darkTheme.accentPurple}20`, color: darkTheme.accentPurple, border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>멤버</button>
                        <button onClick={() => handleDeleteGroup(group.id)} style={{ padding: '4px 12px', background: `${darkTheme.accentRed}20`, color: darkTheme.accentRed, border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>삭제</button>
                    </div>
                </div>
                {isExpanded && children.map(child => (<GroupNode key={child.id} group={child} depth={depth + 1} />))}
            </div>
        );
    };

    if (loading) {
        return (<div style={{ ...darkStyles.container, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}><div style={{ fontSize: '18px', color: darkTheme.textSecondary }}>로딩 중...</div></div>);
    }

    return (
        <div style={darkStyles.container}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: darkTheme.textPrimary }}>🏢 그룹 관리</h1>
                    <p style={{ color: darkTheme.textSecondary, marginTop: '4px' }}>계층형 그룹 및 자동 그룹 관리</p>
                </div>
                <button style={darkStyles.button} onClick={() => setShowCreateModal(true)}>+ 그룹 생성</button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {Object.entries(typeLabels).map(([type, label]) => {
                    const count = groups.filter(g => g.type === type).length;
                    const memberCount = groups.filter(g => g.type === type).reduce((sum, g) => sum + (g.memberCount || 0), 0);
                    return (
                        <div key={type} style={{ ...darkStyles.card, padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${typeColors[type]}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                                    {type === 'organization' ? '🏢' : type === 'project' ? '📁' : '📋'}
                                </div>
                                <div>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: typeColors[type] }}>{count}개</div>
                                    <div style={{ fontSize: '12px', color: darkTheme.textSecondary }}>{label} (👥 {memberCount})</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Main Card */}
            <div style={darkStyles.card}>
                <div style={{ display: 'flex', gap: '12px', padding: '16px', borderBottom: `1px solid ${darkTheme.border}`, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input type="text" placeholder="🔍 그룹 검색..." style={{ ...darkStyles.input, minWidth: '200px' }} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    <select style={{ ...darkStyles.input, minWidth: '120px', cursor: 'pointer' }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                        <option value="all">모든 유형</option>
                        {Object.entries(typeLabels).map(([type, label]) => (<option key={type} value={type}>{label}</option>))}
                    </select>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                        <button style={darkStyles.buttonSecondary} onClick={() => setExpandedGroups(new Set(groups.map(g => g.id)))}>모두 펼치기</button>
                        <button style={darkStyles.buttonSecondary} onClick={() => setExpandedGroups(new Set())}>모두 접기</button>
                    </div>
                </div>

                {searchTerm || typeFilter !== 'all' ? (
                    <div>{filteredGroups.map(group => (<GroupNode key={group.id} group={group} depth={0} />))}</div>
                ) : (
                    <div>{getRootGroups().map(group => (<GroupNode key={group.id} group={group} depth={0} />))}</div>
                )}

                {filteredGroups.length === 0 && (<div style={{ padding: '48px', textAlign: 'center', color: darkTheme.textMuted }}>그룹이 없습니다</div>)}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div style={darkStyles.modalOverlay} onClick={() => setShowCreateModal(false)}>
                    <div style={{ ...darkStyles.modal, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', color: darkTheme.textPrimary }}>그룹 생성</h2>
                        
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>그룹 이름 *</label>
                            <input type="text" style={{ ...darkStyles.input, width: '100%' }} value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="예: 개발팀" />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>유형</label>
                            <select style={{ ...darkStyles.input, width: '100%' }} value={newGroupType} onChange={e => setNewGroupType(e.target.value as 'organization' | 'project' | 'task')}>
                                <option value="organization">조직</option>
                                <option value="project">프로젝트</option>
                                <option value="task">업무</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>상위 그룹</label>
                            <select style={{ ...darkStyles.input, width: '100%' }} value={newGroupParent} onChange={e => setNewGroupParent(e.target.value)}>
                                <option value="">없음 (최상위)</option>
                                {groups.map(g => (<option key={g.id} value={g.id}>{g.name}</option>))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>설명</label>
                            <textarea style={{ ...darkStyles.input, width: '100%', minHeight: '80px', resize: 'vertical' }} value={newGroupDescription} onChange={e => setNewGroupDescription(e.target.value)} placeholder="그룹 설명 (선택)" />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: darkTheme.textPrimary }}>
                                <input type="checkbox" checked={isAutoGroup} onChange={e => setIsAutoGroup(e.target.checked)} />
                                <span style={{ fontSize: '14px', fontWeight: '500' }}>자동 그룹</span>
                            </label>
                            {isAutoGroup && (
                                <div style={{ marginTop: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', color: darkTheme.textMuted, marginBottom: '6px' }}>조건 (JSON 형식)</label>
                                    <textarea style={{ ...darkStyles.input, width: '100%', fontFamily: 'monospace', fontSize: '12px' }} value={autoCondition} onChange={e => setAutoCondition(e.target.value)} placeholder='{"emailDomain": "@dev.com"}' />
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button style={darkStyles.buttonSecondary} onClick={() => { setShowCreateModal(false); resetForm(); }}>취소</button>
                            <button style={darkStyles.button} onClick={handleCreateGroup}>생성</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Members Modal */}
            {showMembersModal && selectedGroup && (
                <div style={darkStyles.modalOverlay} onClick={() => setShowMembersModal(false)}>
                    <div style={{ ...darkStyles.modal, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div>
                                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: darkTheme.textPrimary }}>{selectedGroup.name} 멤버</h2>
                                <p style={{ fontSize: '14px', color: darkTheme.textSecondary }}>{members.length}명</p>
                            </div>
                        </div>

                        {/* Add Member */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            <select 
                                style={{ ...darkStyles.input, flex: 1, cursor: 'pointer' }} 
                                value={selectedUserId} 
                                onChange={e => setSelectedUserId(e.target.value)}
                            >
                                <option value="">-- 사용자 선택 --</option>
                                {getAvailableUsers().map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.displayName || user.username} ({user.email})
                                    </option>
                                ))}
                            </select>
                            <button 
                                style={{ 
                                    ...darkStyles.button, 
                                    padding: '8px 16px',
                                    opacity: selectedUserId ? 1 : 0.5,
                                    cursor: selectedUserId ? 'pointer' : 'not-allowed'
                                }} 
                                onClick={handleAddMember}
                                disabled={!selectedUserId}
                            >+ 추가</button>
                        </div>

                        <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                            {members.map(member => (
                                <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderBottom: `1px solid ${darkTheme.borderLight}` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `${darkTheme.accentPurple}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: darkTheme.accentPurple, fontWeight: '600' }}>
                                            {(member.userName || 'U')[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '500', color: darkTheme.textPrimary }}>{member.userName || 'Unknown'}</div>
                                            <div style={{ fontSize: '12px', color: darkTheme.textMuted }}>{member.userEmail}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ padding: '2px 8px', background: member.role === 'admin' ? `${darkTheme.accentRed}20` : `${darkTheme.textMuted}20`, color: member.role === 'admin' ? darkTheme.accentRed : darkTheme.textSecondary, fontSize: '11px', borderRadius: '4px' }}>{member.role}</span>
                                        <button onClick={() => handleRemoveMember(selectedGroup.id, member.userId)} style={{ padding: '4px 8px', background: `${darkTheme.accentRed}20`, color: darkTheme.accentRed, border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>제거</button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: '20px', textAlign: 'right' }}>
                            <button style={darkStyles.buttonSecondary} onClick={() => setShowMembersModal(false)}>닫기</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Group Modal */}
            {showEditModal && editingGroup && (
                <div style={darkStyles.modalOverlay} onClick={() => setShowEditModal(false)}>
                    <div style={{ ...darkStyles.modal, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', color: darkTheme.textPrimary }}>그룹 수정</h2>
                        
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>그룹 이름 *</label>
                            <input type="text" style={{ ...darkStyles.input, width: '100%' }} value={editGroupName} onChange={e => setEditGroupName(e.target.value)} />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>유형</label>
                            <select style={{ ...darkStyles.input, width: '100%' }} value={editGroupType} onChange={e => setEditGroupType(e.target.value as 'organization' | 'project' | 'task')}>
                                <option value="organization">조직</option>
                                <option value="project">프로젝트</option>
                                <option value="task">업무</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>상위 그룹</label>
                            <select style={{ ...darkStyles.input, width: '100%' }} value={editGroupParent} onChange={e => setEditGroupParent(e.target.value)}>
                                <option value="">없음 (최상위)</option>
                                {groups.filter(g => g.id !== editingGroup.id).map(g => (<option key={g.id} value={g.id}>{g.name}</option>))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>설명</label>
                            <textarea style={{ ...darkStyles.input, width: '100%', minHeight: '80px', resize: 'vertical' }} value={editGroupDescription} onChange={e => setEditGroupDescription(e.target.value)} />
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button style={darkStyles.buttonSecondary} onClick={() => setShowEditModal(false)}>취소</button>
                            <button style={darkStyles.button} onClick={handleEditGroup}>💾 저장</button>
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
