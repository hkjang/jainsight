'use client';

import { useEffect, useState, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    status: 'invited' | 'active' | 'locked' | 'deleted';
    accountSource: 'local' | 'sso' | 'ldap' | 'ad';
    organizationId?: string;
    lastLoginAt?: string;
    createdAt: string;
    lockReason?: string;
}

const statusColors: Record<string, string> = {
    invited: '#3B82F6',
    active: '#10B981',
    locked: '#EF4444',
    deleted: '#6B7280'
};

const statusLabels: Record<string, string> = {
    invited: '초대됨',
    active: '활성',
    locked: '잠김',
    deleted: '삭제됨'
};

export default function UsersAdminPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteName, setInviteName] = useState('');

    const fetchUsers = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/users?limit=100`);
            if (response.ok) {
                const data = await response.json();
                // Map API response to component format
                const mappedUsers = (data.users || []).map((u: Record<string, unknown>) => ({
                    ...u,
                    status: u.status || 'active',
                    accountSource: u.accountSource || 'local'
                }));
                setUsers(mappedUsers);
            } else {
                // Fallback to mock data if API fails
                setUsers([
                    {
                        id: '1',
                        email: 'admin@example.com',
                        name: 'Admin User',
                        role: 'admin',
                        status: 'active',
                        accountSource: 'local',
                        createdAt: new Date().toISOString(),
                        lastLoginAt: new Date().toISOString()
                    },
                    {
                        id: '2',
                        email: 'user@example.com',
                        name: 'Regular User',
                        role: 'user',
                        status: 'active',
                        accountSource: 'local',
                        createdAt: new Date().toISOString()
                    }
                ]);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
            // Fallback mock data
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleSelectAll = () => {
        if (selectedUsers.size === filteredUsers.length) {
            setSelectedUsers(new Set());
        } else {
            setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
        }
    };

    const handleSelectUser = (userId: string) => {
        const newSelected = new Set(selectedUsers);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedUsers(newSelected);
    };

    const handleBulkAction = async (action: 'activate' | 'lock' | 'delete') => {
        if (selectedUsers.size === 0) return;
        
        try {
            const status = action === 'activate' ? 'active' : action === 'lock' ? 'locked' : 'deleted';
            const response = await fetch(`${API_URL}/users/bulk/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userIds: Array.from(selectedUsers), status })
            });
            if (response.ok) {
                fetchUsers();
                setSelectedUsers(new Set());
            }
        } catch (error) {
            console.error('Bulk action failed:', error);
        }
    };

    const handleInviteUser = async () => {
        if (!inviteEmail || !inviteName) return;
        
        try {
            const response = await fetch(`${API_URL}/users/invite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail, name: inviteName })
            });
            if (response.ok) {
                fetchUsers();
                setShowInviteModal(false);
                setInviteEmail('');
                setInviteName('');
            }
        } catch (error) {
            console.error('Invite failed:', error);
        }
    };

    const handleUserAction = async (userId: string, action: 'unlock' | 'lock' | 'resend-invite' | 'force-logout') => {
        try {
            const endpoint = action === 'resend-invite' ? 'resend-invite' : action;
            const response = await fetch(`${API_URL}/users/${userId}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: action === 'lock' ? JSON.stringify({ reason: '관리자 잠금' }) : undefined
            });
            if (response.ok) {
                fetchUsers();
            }
        } catch (error) {
            console.error(`${action} failed:`, error);
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('ko-KR');
    };

    const containerStyle: React.CSSProperties = {
        padding: '24px',
        maxWidth: '1400px',
        margin: '0 auto'
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
    };

    const titleStyle: React.CSSProperties = {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#1F2937'
    };

    const cardStyle: React.CSSProperties = {
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
    };

    const toolbarStyle: React.CSSProperties = {
        display: 'flex',
        gap: '12px',
        padding: '16px',
        borderBottom: '1px solid #E5E7EB',
        flexWrap: 'wrap',
        alignItems: 'center'
    };

    const inputStyle: React.CSSProperties = {
        padding: '8px 12px',
        border: '1px solid #D1D5DB',
        borderRadius: '8px',
        fontSize: '14px',
        outline: 'none',
        minWidth: '200px'
    };

    const selectStyle: React.CSSProperties = {
        ...inputStyle,
        minWidth: '120px',
        cursor: 'pointer'
    };

    const buttonStyle: React.CSSProperties = {
        padding: '8px 16px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        border: 'none',
        transition: 'all 0.2s'
    };

    const primaryButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
        color: 'white'
    };

    const dangerButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        background: '#EF4444',
        color: 'white'
    };

    const tableStyle: React.CSSProperties = {
        width: '100%',
        borderCollapse: 'collapse'
    };

    const thStyle: React.CSSProperties = {
        padding: '12px 16px',
        textAlign: 'left',
        fontSize: '12px',
        fontWeight: '600',
        color: '#6B7280',
        textTransform: 'uppercase',
        background: '#F9FAFB',
        borderBottom: '1px solid #E5E7EB'
    };

    const tdStyle: React.CSSProperties = {
        padding: '12px 16px',
        borderBottom: '1px solid #E5E7EB',
        fontSize: '14px',
        color: '#374151'
    };

    const statusBadgeStyle = (status: string): React.CSSProperties => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: '500',
        background: `${statusColors[status]}15`,
        color: statusColors[status]
    });

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
        maxWidth: '400px',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
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
            <div style={headerStyle}>
                <div>
                    <h1 style={titleStyle}>👥 사용자 관리</h1>
                    <p style={{ color: '#6B7280', marginTop: '4px' }}>사용자 수명주기 및 접근 관리</p>
                </div>
                <button
                    style={primaryButtonStyle}
                    onClick={() => setShowInviteModal(true)}
                >
                    + 사용자 초대
                </button>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {Object.entries(statusLabels).map(([status, label]) => {
                    const count = users.filter(u => u.status === status).length;
                    return (
                        <div key={status} style={{ ...cardStyle, padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    background: statusColors[status]
                                }} />
                                <div>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1F2937' }}>{count}</div>
                                    <div style={{ fontSize: '14px', color: '#6B7280' }}>{label}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={cardStyle}>
                <div style={toolbarStyle}>
                    <input
                        type="text"
                        placeholder="🔍 사용자 검색..."
                        style={inputStyle}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select
                        style={selectStyle}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">모든 상태</option>
                        {Object.entries(statusLabels).map(([status, label]) => (
                            <option key={status} value={status}>{label}</option>
                        ))}
                    </select>
                    
                    {selectedUsers.size > 0 && (
                        <>
                            <span style={{ marginLeft: 'auto', fontSize: '14px', color: '#6B7280' }}>
                                {selectedUsers.size}명 선택됨
                            </span>
                            <button
                                style={{ ...buttonStyle, background: '#10B981', color: 'white' }}
                                onClick={() => handleBulkAction('activate')}
                            >
                                활성화
                            </button>
                            <button
                                style={{ ...buttonStyle, background: '#F59E0B', color: 'white' }}
                                onClick={() => handleBulkAction('lock')}
                            >
                                잠금
                            </button>
                            <button
                                style={dangerButtonStyle}
                                onClick={() => handleBulkAction('delete')}
                            >
                                삭제
                            </button>
                        </>
                    )}
                </div>

                <table style={tableStyle}>
                    <thead>
                        <tr>
                            <th style={thStyle}>
                                <input
                                    type="checkbox"
                                    checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                                    onChange={handleSelectAll}
                                />
                            </th>
                            <th style={thStyle}>사용자</th>
                            <th style={thStyle}>역할</th>
                            <th style={thStyle}>상태</th>
                            <th style={thStyle}>계정 소스</th>
                            <th style={thStyle}>마지막 로그인</th>
                            <th style={thStyle}>생성일</th>
                            <th style={thStyle}>작업</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map((user) => (
                            <tr key={user.id} style={{ transition: 'background 0.2s' }}>
                                <td style={tdStyle}>
                                    <input
                                        type="checkbox"
                                        checked={selectedUsers.has(user.id)}
                                        onChange={() => handleSelectUser(user.id)}
                                    />
                                </td>
                                <td style={tdStyle}>
                                    <div>
                                        <div style={{ fontWeight: '500' }}>{user.name}</div>
                                        <div style={{ fontSize: '12px', color: '#6B7280' }}>{user.email}</div>
                                    </div>
                                </td>
                                <td style={tdStyle}>
                                    <span style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        background: user.role === 'admin' ? '#EEF2FF' : '#F3F4F6',
                                        color: user.role === 'admin' ? '#4F46E5' : '#374151'
                                    }}>
                                        {user.role}
                                    </span>
                                </td>
                                <td style={tdStyle}>
                                    <span style={statusBadgeStyle(user.status)}>
                                        <span style={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            background: 'currentColor'
                                        }} />
                                        {statusLabels[user.status]}
                                    </span>
                                    {user.lockReason && (
                                        <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px' }}>
                                            {user.lockReason}
                                        </div>
                                    )}
                                </td>
                                <td style={tdStyle}>{user.accountSource.toUpperCase()}</td>
                                <td style={tdStyle}>{formatDate(user.lastLoginAt)}</td>
                                <td style={tdStyle}>{formatDate(user.createdAt)}</td>
                                <td style={tdStyle}>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {user.status === 'locked' && (
                                            <button
                                                style={{ ...buttonStyle, background: '#10B981', color: 'white', padding: '4px 12px' }}
                                                onClick={() => handleUserAction(user.id, 'unlock')}
                                            >
                                                잠금 해제
                                            </button>
                                        )}
                                        {user.status === 'invited' && (
                                            <button
                                                style={{ ...buttonStyle, background: '#3B82F6', color: 'white', padding: '4px 12px' }}
                                                onClick={() => handleUserAction(user.id, 'resend-invite')}
                                            >
                                                재전송
                                            </button>
                                        )}
                                        <button
                                            style={{ ...buttonStyle, background: '#F3F4F6', color: '#374151', padding: '4px 12px' }}
                                            onClick={() => handleUserAction(user.id, 'force-logout')}
                                        >
                                            강제 로그아웃
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredUsers.length === 0 && (
                    <div style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>
                        검색 결과가 없습니다
                    </div>
                )}
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
                <div style={modalOverlayStyle} onClick={() => setShowInviteModal(false)}>
                    <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>사용자 초대</h2>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>이름</label>
                            <input
                                type="text"
                                style={{ ...inputStyle, width: '100%' }}
                                value={inviteName}
                                onChange={(e) => setInviteName(e.target.value)}
                                placeholder="홍길동"
                            />
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>이메일</label>
                            <input
                                type="email"
                                style={{ ...inputStyle, width: '100%' }}
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="user@example.com"
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                style={{ ...buttonStyle, background: '#F3F4F6', color: '#374151' }}
                                onClick={() => setShowInviteModal(false)}
                            >
                                취소
                            </button>
                            <button
                                style={primaryButtonStyle}
                                onClick={handleInviteUser}
                            >
                                초대 보내기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
