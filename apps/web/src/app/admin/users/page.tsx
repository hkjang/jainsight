'use client';

import { useEffect, useState, useCallback } from 'react';
import { 
    useAdminShortcuts, exportToCSV, useAutoRefresh, ConfirmDialog, 
    darkTheme, darkStyles, AnimatedCard, SearchInput, Pagination, 
    StatusIndicator, FloatingActionButton, NotificationBadge, TabGroup, Tooltip, MiniChart
} from '../../../components/admin/AdminUtils';

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
    invited: '#3B82F6', active: '#10B981', locked: '#EF4444', deleted: '#6B7280'
};
const statusLabels: Record<string, string> = {
    invited: '초대됨', active: '활성', locked: '잠김', deleted: '삭제됨'
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
    const [currentPage, setCurrentPage] = useState(1);
    const [activityData] = useState([12, 19, 15, 25, 22, 30, 28, 35, 32, 40, 38, 42]);
    const itemsPerPage = 10;
    
    // Edit user modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editName, setEditName] = useState('');
    const [editRole, setEditRole] = useState('');
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const fetchUsers = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/users?limit=100`);
            if (response.ok) {
                const data = await response.json();
                const mappedUsers = (data.users || []).map((u: Record<string, unknown>) => ({
                    ...u, status: u.status || 'active', accountSource: u.accountSource || 'local'
                }));
                setUsers(mappedUsers);
            } else {
                setUsers([
                    { id: '1', email: 'admin@example.com', name: 'Admin User', role: 'admin', status: 'active', accountSource: 'local', createdAt: new Date().toISOString(), lastLoginAt: new Date().toISOString() },
                    { id: '2', email: 'user@example.com', name: 'Regular User', role: 'user', status: 'active', accountSource: 'local', createdAt: new Date().toISOString() },
                    { id: '3', email: 'analyst@example.com', name: 'Data Analyst', role: 'analyst', status: 'active', accountSource: 'sso', createdAt: new Date().toISOString() },
                    { id: '4', email: 'dev@example.com', name: 'Developer', role: 'developer', status: 'locked', accountSource: 'local', createdAt: new Date().toISOString(), lockReason: '비정상 접근 시도' },
                    { id: '5', email: 'invited@example.com', name: 'New User', role: 'user', status: 'invited', accountSource: 'local', createdAt: new Date().toISOString() },
                ]);
            }
        } catch (error) { console.error('Failed to fetch users:', error); setUsers([]); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);
    useAutoRefresh(fetchUsers, 30000, autoRefresh);

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

    const handleSelectAll = () => {
        if (selectedUsers.size === paginatedUsers.length) setSelectedUsers(new Set());
        else setSelectedUsers(new Set(paginatedUsers.map(u => u.id)));
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
            await fetch(`${API_URL}/users/bulk/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userIds: Array.from(selectedUsers), status }) });
            fetchUsers(); setSelectedUsers(new Set());
        } catch (error) { console.error('Bulk action failed:', error); }
    };

    const handleInviteUser = async () => {
        if (!inviteEmail || !inviteName) return;
        try {
            await fetch(`${API_URL}/users/invite`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: inviteEmail, name: inviteName }) });
            fetchUsers(); setShowInviteModal(false); setInviteEmail(''); setInviteName('');
        } catch (error) { console.error('Invite failed:', error); }
    };

    const handleUserAction = async (userId: string, action: 'unlock' | 'lock' | 'resend-invite' | 'force-logout') => {
        try {
            const endpoint = action === 'resend-invite' ? 'resend-invite' : action;
            await fetch(`${API_URL}/users/${userId}/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: action === 'lock' ? JSON.stringify({ reason: '관리자 잠금' }) : undefined });
            fetchUsers();
            showNotification('작업이 완료되었습니다.', 'success');
        } catch (error) { console.error(`${action} failed:`, error); showNotification('작업 실패', 'error'); }
    };

    const handleResetPassword = async (userId: string) => {
        if (!confirm('이 사용자의 비밀번호를 초기화하시겠습니까?')) return;
        try {
            const response = await fetch(`${API_URL}/users/${userId}/reset-password`, { method: 'POST' });
            if (response.ok) {
                const data = await response.json();
                showNotification(`임시 비밀번호: ${data.tempPassword}`, 'success');
            } else {
                showNotification('비밀번호 초기화 실패', 'error');
            }
        } catch (error) { console.error('Reset password failed:', error); showNotification('비밀번호 초기화 실패', 'error'); }
    };

    const handleOpenEditModal = (user: User) => {
        setEditingUser(user);
        setEditName(user.name);
        setEditRole(user.role);
        setShowEditModal(true);
    };

    const handleEditUser = async () => {
        if (!editingUser || !editName) return;
        try {
            const response = await fetch(`${API_URL}/users/${editingUser.id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editName, role: editRole })
            });
            if (response.ok) {
                fetchUsers();
                setShowEditModal(false);
                setEditingUser(null);
                showNotification('사용자 정보가 수정되었습니다.', 'success');
            } else {
                showNotification('수정 실패', 'error');
            }
        } catch (error) { console.error('Edit user failed:', error); showNotification('수정 실패', 'error'); }
    };

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    const formatDate = (dateStr?: string) => dateStr ? new Date(dateStr).toLocaleString('ko-KR') : '-';

    const statusBadgeStyle = (status: string): React.CSSProperties => ({
        display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: '500', background: `${statusColors[status]}20`, color: statusColors[status]
    });

    const lockedCount = users.filter(u => u.status === 'locked').length;
    const invitedCount = users.filter(u => u.status === 'invited').length;

    if (loading) {
        return (
            <div style={{ ...darkStyles.container, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                    {[1,2,3,4].map(i => (
                        <div key={i} style={{ ...darkStyles.card, padding: '20px', flex: 1, height: '80px', background: 'linear-gradient(90deg, rgba(30,41,59,0.8) 0%, rgba(51,65,85,0.6) 50%, rgba(30,41,59,0.8) 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                    ))}
                </div>
                <div style={{ ...darkStyles.card, height: '400px', background: 'linear-gradient(90deg, rgba(30,41,59,0.8) 0%, rgba(51,65,85,0.6) 50%, rgba(30,41,59,0.8) 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
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
                        <StatusIndicator status="online" label="실시간" pulse />
                    </h1>
                    <p style={{ color: darkTheme.textSecondary, marginTop: '4px' }}>사용자 수명주기 및 접근 관리</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: darkTheme.textSecondary, cursor: 'pointer' }}>
                        <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} style={{ accentColor: darkTheme.accentBlue }} />자동 새로고침
                    </label>
                    <Tooltip content="CSV로 내보내기">
                        <button style={darkStyles.buttonSecondary} onClick={() => exportToCSV(users, 'users')}>📥 내보내기</button>
                    </Tooltip>
                    <NotificationBadge count={invitedCount}>
                        <button style={darkStyles.button} onClick={() => setShowInviteModal(true)}>+ 사용자 초대</button>
                    </NotificationBadge>
                </div>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {Object.entries(statusLabels).map(([status, label], index) => {
                    const count = users.filter(u => u.status === status).length;
                    return (
                        <AnimatedCard key={status} delay={index * 0.1} onClick={() => setStatusFilter(status)}>
                            <div style={{ padding: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: statusColors[status], boxShadow: `0 0 10px ${statusColors[status]}50`, animation: status === 'active' ? 'pulse 2s infinite' : 'none' }} />
                                        <div>
                                            <div style={{ fontSize: '28px', fontWeight: 'bold', color: statusColors[status] }}>{count}</div>
                                            <div style={{ fontSize: '14px', color: darkTheme.textSecondary }}>{label}</div>
                                        </div>
                                    </div>
                                    {status === 'active' && <MiniChart data={activityData} color={statusColors[status]} height={30} />}
                                </div>
                            </div>
                        </AnimatedCard>
                    );
                })}
            </div>
            <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>

            {/* Main Card */}
            <AnimatedCard delay={0.4}>
                {/* Tab-style Toolbar */}
                <div style={{ display: 'flex', gap: '12px', padding: '16px', borderBottom: `1px solid ${darkTheme.border}`, alignItems: 'center', flexWrap: 'wrap' }}>
                    <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="사용자 검색..." onClear={() => setSearchTerm('')} />
                    <TabGroup 
                        tabs={[
                            { id: 'all', label: '전체', badge: users.length },
                            { id: 'active', label: '활성', icon: '✅' },
                            { id: 'locked', label: '잠김', icon: '🔒', badge: lockedCount },
                            { id: 'invited', label: '초대됨', icon: '✉️', badge: invitedCount },
                        ]} 
                        activeTab={statusFilter} 
                        onChange={setStatusFilter} 
                    />
                    
                    {selectedUsers.size > 0 && (
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '14px', color: darkTheme.textSecondary }}>{selectedUsers.size}명 선택됨</span>
                            <Tooltip content="선택된 사용자 활성화"><button style={{ ...darkStyles.button, padding: '8px 12px', background: darkTheme.accentGreen }} onClick={() => handleBulkAction('activate')}>✅</button></Tooltip>
                            <Tooltip content="선택된 사용자 잠금"><button style={{ ...darkStyles.button, padding: '8px 12px', background: darkTheme.accentYellow }} onClick={() => handleBulkAction('lock')}>🔒</button></Tooltip>
                            <Tooltip content="선택된 사용자 삭제"><button style={{ ...darkStyles.button, padding: '8px 12px', background: darkTheme.accentRed }} onClick={() => handleBulkAction('delete')}>🗑️</button></Tooltip>
                        </div>
                    )}
                </div>

                {/* Table */}
                <table style={darkStyles.table}>
                    <thead>
                        <tr>
                            <th style={darkStyles.th}><input type="checkbox" checked={selectedUsers.size === paginatedUsers.length && paginatedUsers.length > 0} onChange={handleSelectAll} /></th>
                            <th style={darkStyles.th}>사용자</th>
                            <th style={darkStyles.th}>역할</th>
                            <th style={darkStyles.th}>상태</th>
                            <th style={darkStyles.th}>계정 소스</th>
                            <th style={darkStyles.th}>마지막 로그인</th>
                            <th style={darkStyles.th}>작업</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedUsers.map((user, index) => (
                            <tr key={user.id} style={{ transition: 'background 0.2s', animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both` }} 
                                onMouseEnter={e => (e.currentTarget.style.background = darkTheme.bgCardHover)}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                <td style={darkStyles.td}><input type="checkbox" checked={selectedUsers.has(user.id)} onChange={() => handleSelectUser(user.id)} /></td>
                                <td style={darkStyles.td}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `linear-gradient(135deg, ${statusColors[user.status]}40, ${statusColors[user.status]}20)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>{user.name[0].toUpperCase()}</div>
                                        <div>
                                            <div style={{ fontWeight: '500', color: darkTheme.textPrimary }}>{user.name}</div>
                                            <div style={{ fontSize: '12px', color: darkTheme.textMuted }}>{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td style={darkStyles.td}>
                                    <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', background: user.role === 'admin' ? `${darkTheme.accentPurple}20` : `${darkTheme.textMuted}20`, color: user.role === 'admin' ? darkTheme.accentPurple : darkTheme.textSecondary }}>{user.role}</span>
                                </td>
                                <td style={darkStyles.td}>
                                    <span style={statusBadgeStyle(user.status)}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />{statusLabels[user.status]}
                                    </span>
                                    {user.lockReason && <div style={{ fontSize: '11px', color: darkTheme.accentRed, marginTop: '4px' }}>{user.lockReason}</div>}
                                </td>
                                <td style={{ ...darkStyles.td, color: darkTheme.textSecondary }}>
                                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', background: darkTheme.bgSecondary }}>{user.accountSource.toUpperCase()}</span>
                                </td>
                                <td style={{ ...darkStyles.td, color: darkTheme.textSecondary, fontSize: '13px' }}>{formatDate(user.lastLoginAt)}</td>
                                <td style={darkStyles.td}>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <Tooltip content="수정"><button style={{ ...darkStyles.buttonSecondary, padding: '4px 10px', fontSize: '12px' }} onClick={() => handleOpenEditModal(user)}>✏️</button></Tooltip>
                                        <Tooltip content="비밀번호 초기화"><button style={{ ...darkStyles.buttonSecondary, padding: '4px 10px', fontSize: '12px' }} onClick={() => handleResetPassword(user.id)}>🔑</button></Tooltip>
                                        {user.status === 'locked' && <Tooltip content="잠금 해제"><button style={{ ...darkStyles.button, padding: '4px 10px', fontSize: '12px', background: darkTheme.accentGreen }} onClick={() => handleUserAction(user.id, 'unlock')}>🔓</button></Tooltip>}
                                        {user.status === 'invited' && <Tooltip content="초대 재전송"><button style={{ ...darkStyles.button, padding: '4px 10px', fontSize: '12px' }} onClick={() => handleUserAction(user.id, 'resend-invite')}>📧</button></Tooltip>}
                                        <Tooltip content="강제 로그아웃"><button style={{ ...darkStyles.buttonSecondary, padding: '4px 10px', fontSize: '12px' }} onClick={() => handleUserAction(user.id, 'force-logout')}>⏏️</button></Tooltip>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredUsers.length === 0 ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: darkTheme.textMuted }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                        <div style={{ fontSize: '16px', marginBottom: '8px' }}>검색 결과가 없습니다</div>
                        <div style={{ fontSize: '14px' }}>다른 검색어를 시도해보세요</div>
                    </div>
                ) : (
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filteredUsers.length} itemsPerPage={itemsPerPage} />
                )}
            </AnimatedCard>
            <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>

            {/* Floating Action Button */}
            <FloatingActionButton icon="+" onClick={() => setShowInviteModal(true)} tooltip="새 사용자 초대" color={darkTheme.accentBlue} />

            {/* Invite Modal */}
            {showInviteModal && (
                <div style={darkStyles.modalOverlay} onClick={() => setShowInviteModal(false)}>
                    <div style={{ ...darkStyles.modal, animation: 'modalSlide 0.3s ease-out' }} onClick={(e) => e.stopPropagation()}>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', color: darkTheme.textPrimary, display: 'flex', alignItems: 'center', gap: '10px' }}>✉️ 사용자 초대</h2>
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
                            <button style={darkStyles.button} onClick={handleInviteUser}>✈️ 초대 보내기</button>
                        </div>
                    </div>
                </div>
            )}
            <style>{`@keyframes modalSlide { from { opacity: 0; transform: scale(0.95) translateY(-10px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>

            {/* Edit User Modal */}
            {showEditModal && editingUser && (
                <div style={darkStyles.modalOverlay} onClick={() => setShowEditModal(false)}>
                    <div style={{ ...darkStyles.modal, animation: 'modalSlide 0.3s ease-out' }} onClick={(e) => e.stopPropagation()}>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', color: darkTheme.textPrimary, display: 'flex', alignItems: 'center', gap: '10px' }}>✏️ 사용자 수정</h2>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>이름</label>
                            <input type="text" style={{ ...darkStyles.input, width: '100%' }} value={editName} onChange={(e) => setEditName(e.target.value)} />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>이메일 (읽기 전용)</label>
                            <input type="email" style={{ ...darkStyles.input, width: '100%', opacity: 0.6 }} value={editingUser.email} disabled />
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>역할</label>
                            <select style={{ ...darkStyles.input, width: '100%' }} value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                                <option value="user">User</option>
                                <option value="analyst">Analyst</option>
                                <option value="developer">Developer</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button style={darkStyles.buttonSecondary} onClick={() => setShowEditModal(false)}>취소</button>
                            <button style={darkStyles.button} onClick={handleEditUser}>💾 저장</button>
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
                    animation: 'modalSlide 0.3s ease-out', zIndex: 1000, fontSize: '14px', fontWeight: '500'
                }}>
                    {notification.type === 'success' ? '✅' : '❌'} {notification.message}
                </div>
            )}
        </div>
    );
}
