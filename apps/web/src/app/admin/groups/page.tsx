'use client';

import { useEffect, useState, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
    
    // Create form state
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupType, setNewGroupType] = useState<'organization' | 'project' | 'task'>('project');
    const [newGroupDescription, setNewGroupDescription] = useState('');
    const [newGroupParent, setNewGroupParent] = useState<string>('');
    const [isAutoGroup, setIsAutoGroup] = useState(false);
    const [autoCondition, setAutoCondition] = useState('');

    const fetchGroups = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/groups`);
            if (response.ok) {
                const data = await response.json();
                setGroups(data);
            } else {
                // Fallback mock data
                setGroups([
                    { id: '1', name: '개발팀', type: 'organization', isAutoGroup: false, memberCount: 15, createdAt: new Date().toISOString() },
                    { id: '2', name: 'AI 프로젝트', type: 'project', parentId: '1', isAutoGroup: false, memberCount: 8, createdAt: new Date().toISOString() },
                    { id: '3', name: 'DB 최적화', type: 'task', parentId: '2', isAutoGroup: false, memberCount: 3, createdAt: new Date().toISOString() },
                    { id: '4', name: '운영팀', type: 'organization', isAutoGroup: false, memberCount: 10, createdAt: new Date().toISOString() },
                    { id: '5', name: '@dev.com 사용자', description: '이메일에 @dev.com 포함', type: 'project', isAutoGroup: true, memberCount: 25, createdAt: new Date().toISOString() },
                ]);
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
                setMembers(data);
            } else {
                // Mock members
                setMembers([
                    { id: '1', userId: 'u1', userName: 'John Doe', userEmail: 'john@example.com', role: 'member', addedAt: new Date().toISOString() },
                    { id: '2', userId: 'u2', userName: 'Jane Smith', userEmail: 'jane@example.com', role: 'admin', addedAt: new Date().toISOString() },
                ]);
            }
        } catch (error) {
            console.error('Failed to fetch members:', error);
        }
    }, []);

    useEffect(() => {
        fetchGroups();
    }, [fetchGroups]);

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
            
            if (response.ok) {
                fetchGroups();
                setShowCreateModal(false);
                resetForm();
            }
        } catch (error) {
            console.error('Failed to create group:', error);
        }
    };

    const handleDeleteGroup = async (groupId: string) => {
        if (!confirm('그룹을 삭제하시겠습니까?')) return;
        
        try {
            const response = await fetch(`${API_URL}/groups/${groupId}`, { method: 'DELETE' });
            if (response.ok) {
                fetchGroups();
            }
        } catch (error) {
            console.error('Failed to delete group:', error);
        }
    };

    const handleRemoveMember = async (groupId: string, userId: string) => {
        try {
            const response = await fetch(`${API_URL}/groups/${groupId}/members/${userId}`, { method: 'DELETE' });
            if (response.ok) {
                fetchMembers(groupId);
            }
        } catch (error) {
            console.error('Failed to remove member:', error);
        }
    };

    const handleOpenMembers = async (group: Group) => {
        setSelectedGroup(group);
        await fetchMembers(group.id);
        setShowMembersModal(true);
    };

    const resetForm = () => {
        setNewGroupName('');
        setNewGroupType('project');
        setNewGroupDescription('');
        setNewGroupParent('');
        setIsAutoGroup(false);
        setAutoCondition('');
    };

    const getChildren = (parentId: string): Group[] => groups.filter(g => g.parentId === parentId);
    const getRootGroups = (): Group[] => groups.filter(g => !g.parentId);

    const toggleExpand = (groupId: string) => {
        const newExpanded = new Set(expandedGroups);
        if (newExpanded.has(groupId)) {
            newExpanded.delete(groupId);
        } else {
            newExpanded.add(groupId);
        }
        setExpandedGroups(newExpanded);
    };

    const filteredGroups = groups.filter(group => {
        const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === 'all' || group.type === typeFilter;
        return matchesSearch && matchesType;
    });

    const containerStyle: React.CSSProperties = {
        padding: '24px',
        maxWidth: '1400px',
        margin: '0 auto'
    };

    const cardStyle: React.CSSProperties = {
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
    };

    const inputStyle: React.CSSProperties = {
        padding: '10px 12px',
        border: '1px solid #D1D5DB',
        borderRadius: '8px',
        fontSize: '14px',
        outline: 'none',
        width: '100%'
    };

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
        maxWidth: '500px',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
    };

    const GroupNode = ({ group, depth = 0 }: { group: Group; depth?: number }) => {
        const children = getChildren(group.id);
        const hasChildren = children.length > 0;
        const isExpanded = expandedGroups.has(group.id);

        return (
            <div>
                <div 
                    style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 16px',
                        paddingLeft: `${16 + depth * 24}px`,
                        borderBottom: '1px solid #E5E7EB',
                        background: depth > 0 ? '#FAFAFA' : 'white',
                        transition: 'background 0.2s',
                        cursor: hasChildren ? 'pointer' : 'default'
                    }}
                    onClick={() => hasChildren && toggleExpand(group.id)}
                >
                    <span style={{ width: '24px', marginRight: '8px', color: '#9CA3AF' }}>
                        {hasChildren ? (isExpanded ? '▼' : '▶') : '•'}
                    </span>
                    <div style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '2px',
                        background: typeColors[group.type],
                        marginRight: '12px'
                    }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '500' }}>{group.name}</span>
                            {group.isAutoGroup && (
                                <span style={{
                                    padding: '2px 6px',
                                    background: '#FEF3C7',
                                    color: '#D97706',
                                    fontSize: '10px',
                                    borderRadius: '4px',
                                    fontWeight: '500'
                                }}>
                                    자동
                                </span>
                            )}
                        </div>
                        {group.description && (
                            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                                {group.description}
                            </div>
                        )}
                    </div>
                    <span style={{
                        padding: '4px 8px',
                        background: `${typeColors[group.type]}15`,
                        color: typeColors[group.type],
                        fontSize: '12px',
                        borderRadius: '4px',
                        marginRight: '16px'
                    }}>
                        {typeLabels[group.type]}
                    </span>
                    <span style={{ fontSize: '14px', color: '#6B7280', width: '80px' }}>
                        👥 {group.memberCount || 0}
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => handleOpenMembers(group)}
                            style={{
                                padding: '4px 12px',
                                background: '#EEF2FF',
                                color: '#4F46E5',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: 'pointer'
                            }}
                        >
                            멤버
                        </button>
                        <button
                            onClick={() => handleDeleteGroup(group.id)}
                            style={{
                                padding: '4px 12px',
                                background: '#FEE2E2',
                                color: '#DC2626',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: 'pointer'
                            }}
                        >
                            삭제
                        </button>
                    </div>
                </div>
                {isExpanded && children.map(child => (
                    <GroupNode key={child.id} group={child} depth={depth + 1} />
                ))}
            </div>
        );
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
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1F2937' }}>🏢 그룹 관리</h1>
                    <p style={{ color: '#6B7280', marginTop: '4px' }}>계층형 그룹 및 자동 그룹 관리</p>
                </div>
                <button style={buttonStyle} onClick={() => setShowCreateModal(true)}>
                    + 그룹 생성
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {Object.entries(typeLabels).map(([type, label]) => {
                    const count = groups.filter(g => g.type === type).length;
                    const memberCount = groups.filter(g => g.type === type).reduce((sum, g) => sum + (g.memberCount || 0), 0);
                    return (
                        <div key={type} style={{ ...cardStyle, padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    background: `${typeColors[type]}15`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '20px'
                                }}>
                                    {type === 'organization' ? '🏢' : type === 'project' ? '📁' : '📋'}
                                </div>
                                <div>
                                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1F2937' }}>{count}개</div>
                                    <div style={{ fontSize: '12px', color: '#6B7280' }}>{label} (👥 {memberCount})</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div style={{ ...cardStyle, padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: '#FEF3C715',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px'
                        }}>
                            ⚡
                        </div>
                        <div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1F2937' }}>
                                {groups.filter(g => g.isAutoGroup).length}개
                            </div>
                            <div style={{ fontSize: '12px', color: '#6B7280' }}>자동 그룹</div>
                        </div>
                    </div>
                </div>
            </div>

            <div style={cardStyle}>
                <div style={{ display: 'flex', gap: '12px', padding: '16px', borderBottom: '1px solid #E5E7EB', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="🔍 그룹 검색..."
                        style={{ ...inputStyle, minWidth: '200px', width: 'auto' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select
                        style={{ ...inputStyle, minWidth: '120px', width: 'auto', cursor: 'pointer' }}
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                    >
                        <option value="all">모든 유형</option>
                        {Object.entries(typeLabels).map(([type, label]) => (
                            <option key={type} value={type}>{label}</option>
                        ))}
                    </select>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                        <button
                            style={{ padding: '8px 16px', background: '#F3F4F6', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
                            onClick={() => setExpandedGroups(new Set(groups.map(g => g.id)))}
                        >
                            모두 펼치기
                        </button>
                        <button
                            style={{ padding: '8px 16px', background: '#F3F4F6', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
                            onClick={() => setExpandedGroups(new Set())}
                        >
                            모두 접기
                        </button>
                    </div>
                </div>

                {searchTerm || typeFilter !== 'all' ? (
                    <div>
                        {filteredGroups.map(group => (
                            <GroupNode key={group.id} group={group} depth={0} />
                        ))}
                    </div>
                ) : (
                    <div>
                        {getRootGroups().map(group => (
                            <GroupNode key={group.id} group={group} depth={0} />
                        ))}
                    </div>
                )}

                {filteredGroups.length === 0 && (
                    <div style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>
                        그룹이 없습니다
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div style={modalOverlayStyle} onClick={() => setShowCreateModal(false)}>
                    <div style={modalStyle} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>그룹 생성</h2>
                        
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>그룹 이름 *</label>
                            <input
                                type="text"
                                style={inputStyle}
                                value={newGroupName}
                                onChange={e => setNewGroupName(e.target.value)}
                                placeholder="예: 개발팀"
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>유형</label>
                            <select
                                style={inputStyle}
                                value={newGroupType}
                                onChange={e => setNewGroupType(e.target.value as 'organization' | 'project' | 'task')}
                            >
                                <option value="organization">조직</option>
                                <option value="project">프로젝트</option>
                                <option value="task">업무</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>상위 그룹</label>
                            <select
                                style={inputStyle}
                                value={newGroupParent}
                                onChange={e => setNewGroupParent(e.target.value)}
                            >
                                <option value="">없음 (최상위)</option>
                                {groups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>설명</label>
                            <textarea
                                style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                                value={newGroupDescription}
                                onChange={e => setNewGroupDescription(e.target.value)}
                                placeholder="그룹 설명 (선택)"
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={isAutoGroup}
                                    onChange={e => setIsAutoGroup(e.target.checked)}
                                />
                                <span style={{ fontSize: '14px', fontWeight: '500' }}>자동 그룹</span>
                            </label>
                            {isAutoGroup && (
                                <div style={{ marginTop: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#6B7280', marginBottom: '6px' }}>
                                        조건 (JSON 형식)
                                    </label>
                                    <textarea
                                        style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '12px' }}
                                        value={autoCondition}
                                        onChange={e => setAutoCondition(e.target.value)}
                                        placeholder='{"emailDomain": "@dev.com"}'
                                    />
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                style={{ ...buttonStyle, background: '#F3F4F6', color: '#374151' }}
                                onClick={() => { setShowCreateModal(false); resetForm(); }}
                            >
                                취소
                            </button>
                            <button style={buttonStyle} onClick={handleCreateGroup}>
                                생성
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Members Modal */}
            {showMembersModal && selectedGroup && (
                <div style={modalOverlayStyle} onClick={() => setShowMembersModal(false)}>
                    <div style={modalStyle} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div>
                                <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>{selectedGroup.name} 멤버</h2>
                                <p style={{ fontSize: '14px', color: '#6B7280' }}>{members.length}명</p>
                            </div>
                            <button style={{ ...buttonStyle, padding: '6px 12px', fontSize: '12px' }}>
                                + 멤버 추가
                            </button>
                        </div>

                        <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                            {members.map(member => (
                                <div key={member.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px',
                                    borderBottom: '1px solid #E5E7EB'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '50%',
                                            background: '#EEF2FF',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#4F46E5',
                                            fontWeight: '600'
                                        }}>
                                            {(member.userName || 'U')[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '500' }}>{member.userName || 'Unknown'}</div>
                                            <div style={{ fontSize: '12px', color: '#6B7280' }}>{member.userEmail}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{
                                            padding: '2px 8px',
                                            background: member.role === 'admin' ? '#FEE2E2' : '#F3F4F6',
                                            color: member.role === 'admin' ? '#DC2626' : '#374151',
                                            fontSize: '11px',
                                            borderRadius: '4px'
                                        }}>
                                            {member.role}
                                        </span>
                                        <button
                                            onClick={() => handleRemoveMember(selectedGroup.id, member.userId)}
                                            style={{
                                                padding: '4px 8px',
                                                background: '#FEE2E2',
                                                color: '#DC2626',
                                                border: 'none',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            제거
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: '20px', textAlign: 'right' }}>
                            <button
                                style={{ ...buttonStyle, background: '#F3F4F6', color: '#374151' }}
                                onClick={() => setShowMembersModal(false)}
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
