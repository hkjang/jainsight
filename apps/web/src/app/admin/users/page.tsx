'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAdminShortcuts, exportToCSV, useAutoRefresh, ConfirmDialog, darkTheme, darkStyles } from '../../../components/admin/AdminUtils';

const API_URL = '/api';

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
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; isDangerous?: boolean }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    const fetchUsers = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/users?limit=100`);
            if (response.ok) {
                const data = await response.json();
                const mappedUsers = (data.users || []).map((u: Record<string, unknown>) => ({
                    ...u,
                    status: u.status || 'active',
                    accountSource: u.accountSource || 'local'
                }));
                setUsers(mappedUsers);
            } else {
                setUsers([
                    { id: '1', email: 'admin@example.com', name: 'Admin User', role: 'admin', status: 'active', accountSource: 'local', createdAt: new Date().toISOString(), lastLoginAt: new Date().toISOString() },
                    { id: '2', email: 'user@example.com', name: 'Regular User', role: 'user', status: 'active', accountSource: 'local', createdAt: new Date().toISOString() }
                ]);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

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
        if (newSelected.has(userId)) newSelected.delete(userId);
        else newSelected.add(userId);
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
            if (response.ok) { fetchUsers(); setSelectedUsers(new Set()); }
        } catch (error) { console.error('Bulk action failed:', error); }
    };

    const handleInviteUser = async () => {
        if (!inviteEmail || !inviteName) return;
        try {
            const response = await fetch(`${API_URL}/users/invite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail, name: inviteName })
            });
            if (response.ok) { fetchUsers(); setShowInviteModal(false); setInviteEmail(''); setInviteName(''); }
        } catch (error) { console.error('Invite failed:', error); }
    };

    const handleUserAction = async (userId: string, action: 'unlock' | 'lock' | 'resend-invite' | 'force-logout') => {
        try {
            const endpoint = action === 'resend-invite' ? 'resend-invite' : action;
            const response = await fetch(`${API_URL}/users/${userId}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: action === 'lock' ? JSON.stringify({ reason: '관리자 잠금' }) : undefined
            });
            if (response.ok) fetchUsers();
        } catch (error) { console.error(`${action} failed:`, error); }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('ko-KR');
    };

    const statusBadgeStyle = (status: string): React.CSSProperties => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: '500',
        background: `${statusColors[status]}20`,
        color: statusColors[status]
    });

    if (loading) {
        return (
            <div style={{ ...darkStyles.container, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <div style={{ fontSize: '18px', color: darkTheme.textSecondary }}>로딩 중...</div>
            </div>
        );
    }

    return (
        <div style={darkStyles.container}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: darkTheme.textPrimary, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        👥 사용자 관리
                    </h1>
                    <p style={{ color: darkTheme.textSecondary, marginTop: '4px' }}>사용자 수명주기 및 접근 관리</p>
                </div>
                <button style={darkStyles.button} onClick={() => setShowInviteModal(true)}>
                    + 사용자 초대
                </button>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {Object.entries(statusLabels).map(([status, label]) => {
                    const count = users.filter(u => u.status === status).length;
                    return (
                        <div key={status} style={{ ...darkStyles.card, padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: statusColors[status], boxShadow: `0 0 10px ${statusColors[status]}50` }} />
                                <div>
                                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: statusColors[status] }}>{count}</div>
                                    <div style={{ fontSize: '14px', color: darkTheme.textSecondary }}>{label}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Main Card */}
            <div style={darkStyles.card}>
                {/* Toolbar */}
                <div style={{ display: 'flex', gap: '12px', padding: '16px', borderBottom: `1px solid ${darkTheme.border}`, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="🔍 사용자 검색..."
                        style={{ ...darkStyles.input, minWidth: '200px' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select
                        style={{ ...darkStyles.input, minWidth: '120px', cursor: 'pointer' }}
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
                            <span style={{ marginLeft: 'auto', fontSize: '14px', color: darkTheme.textSecondary }}>
                                {selectedUsers.size}명 선택됨
                            </span>
                            <button style={{ ...darkStyles.button, background: darkTheme.accentGreen }} onClick={() => handleBulkAction('activate')}>활성화</button>
                            <button style={{ ...darkStyles.button, background: darkTheme.accentYellow }} onClick={() => handleBulkAction('lock')}>잠금</button>
                            <button style={{ ...darkStyles.button, background: darkTheme.accentRed }} onClick={() => handleBulkAction('delete')}>삭제</button>
                        </>
                    )}
                </div>

                {/* Table */}
                <table style={darkStyles.table}>
                    <thead>
                        <tr>
                            <th style={darkStyles.th}>
                                <input type="checkbox" checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0} onChange={handleSelectAll} />
                            </th>
                            <th style={darkStyles.th}>사용자</th>
                            <th style={darkStyles.th}>역할</th>
                            <th style={darkStyles.th}>상태</th>
                            <th style={darkStyles.th}>계정 소스</th>
                            <th style={darkStyles.th}>마지막 로그인</th>
                            <th style={darkStyles.th}>생성일</th>
                            <th style={darkStyles.th}>작업</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map((user) => (
                            <tr key={user.id} style={{ transition: 'background 0.2s' }} 
                                onMouseEnter={e => (e.currentTarget.style.background = darkTheme.bgCardHover)}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                <td style={darkStyles.td}>
                                    <input type="checkbox" checked={selectedUsers.has(user.id)} onChange={() => handleSelectUser(user.id)} />
                                </td>
                                <td style={darkStyles.td}>
                                    <div>
                                        <div style={{ fontWeight: '500', color: darkTheme.textPrimary }}>{user.name}</div>
                                        <div style={{ fontSize: '12px', color: darkTheme.textMuted }}>{user.email}</div>
                                    </div>
                                </td>
                                <td style={darkStyles.td}>
                                    <span style={{
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        background: user.role === 'admin' ? `${darkTheme.accentPurple}20` : `${darkTheme.textMuted}20`,
                                        color: user.role === 'admin' ? darkTheme.accentPurple : darkTheme.textSecondary
                                    }}>
                                        {user.role}
                                    </span>
                                </td>
                                <td style={darkStyles.td}>
                                    <span style={statusBadgeStyle(user.status)}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                                        {statusLabels[user.status]}
                                    </span>
                                    {user.lockReason && (
                                        <div style={{ fontSize: '11px', color: darkTheme.accentRed, marginTop: '4px' }}>{user.lockReason}</div>
                                    )}
                                </td>
                                <td style={{ ...darkStyles.td, color: darkTheme.textSecondary }}>{user.accountSource.toUpperCase()}</td>
                                <td style={{ ...darkStyles.td, color: darkTheme.textSecondary }}>{formatDate(user.lastLoginAt)}</td>
                                <td style={{ ...darkStyles.td, color: darkTheme.textSecondary }}>{formatDate(user.createdAt)}</td>
                                <td style={darkStyles.td}>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {user.status === 'locked' && (
                                            <button style={{ ...darkStyles.button, padding: '4px 12px', background: darkTheme.accentGreen }} onClick={() => handleUserAction(user.id, 'unlock')}>잠금 해제</button>
                                        )}
                                        {user.status === 'invited' && (
                                            <button style={{ ...darkStyles.button, padding: '4px 12px' }} onClick={() => handleUserAction(user.id, 'resend-invite')}>재전송</button>
                                        )}
                                        <button style={{ ...darkStyles.buttonSecondary, padding: '4px 12px' }} onClick={() => handleUserAction(user.id, 'force-logout')}>강제 로그아웃</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredUsers.length === 0 && (
                    <div style={{ padding: '48px', textAlign: 'center', color: darkTheme.textMuted }}>검색 결과가 없습니다</div>
                )}
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
                <div style={darkStyles.modalOverlay} onClick={() => setShowInviteModal(false)}>
                    <div style={darkStyles.modal} onClick={(e) => e.stopPropagation()}>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', color: darkTheme.textPrimary }}>사용자 초대</h2>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>이름</label>
                            <input type="text" style={{ ...darkStyles.input, width: '100%' }} value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="홍길동" />
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>이메일</label>
                            <input type="email" style={{ ...darkStyles.input, width: '100%' }} value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="user@example.com" />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button style={darkStyles.buttonSecondary} onClick={() => setShowInviteModal(false)}>취소</button>
                            <button style={darkStyles.button} onClick={handleInviteUser}>초대 보내기</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
