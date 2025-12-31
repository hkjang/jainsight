'use client';

import { useEffect, useState, useCallback } from 'react';
import { darkTheme, darkStyles, AnimatedCard, TabGroup } from '../../components/admin/AdminUtils';

const API_URL = '/api';

interface SecurityInfo {
    passwordChangedAt?: string;
    lastLoginAt?: string;
    lastLoginIp?: string;
    failedLoginAttempts: number;
    activeSessions: number;
    recentSecurityEvents: {
        id: string;
        action: string;
        createdAt: string;
        ipAddress?: string;
    }[];
}

interface Session {
    id: string;
    deviceName?: string;
    deviceType?: string;
    browser?: string;
    os?: string;
    ipAddress?: string;
    location?: string;
    lastActivityAt?: string;
    createdAt: string;
}

export default function SecurityPage() {
    const [activeTab, setActiveTab] = useState('password');
    const [securityInfo, setSecurityInfo] = useState<SecurityInfo | null>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const userId = 'current-user';

    const fetchSecurityInfo = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/users/${userId}/security`);
            if (response.ok) {
                setSecurityInfo(await response.json());
            } else {
                setSecurityInfo({
                    passwordChangedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                    lastLoginAt: new Date().toISOString(),
                    lastLoginIp: '192.168.1.1',
                    failedLoginAttempts: 0,
                    activeSessions: 2,
                    recentSecurityEvents: [
                        { id: '1', action: 'login', createdAt: new Date().toISOString(), ipAddress: '192.168.1.1' },
                        { id: '2', action: 'password_change', createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() }
                    ]
                });
            }
        } catch (error) { console.error('Failed to fetch security info:', error); }
    }, [userId]);

    const fetchSessions = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/users/${userId}/sessions`);
            if (response.ok) {
                setSessions(await response.json());
            } else {
                setSessions([
                    { id: '1', deviceName: 'Chrome on Windows', deviceType: 'desktop', browser: 'Chrome', os: 'Windows 11', ipAddress: '192.168.1.1', location: 'Seoul, KR', createdAt: new Date().toISOString(), lastActivityAt: new Date().toISOString() },
                    { id: '2', deviceName: 'Safari on iPhone', deviceType: 'mobile', browser: 'Safari', os: 'iOS 17', ipAddress: '192.168.1.100', location: 'Seoul, KR', createdAt: new Date(Date.now() - 86400000).toISOString() }
                ]);
            }
        } catch (error) { console.error('Failed to fetch sessions:', error); }
        finally { setLoading(false); }
    }, [userId]);

    useEffect(() => {
        fetchSecurityInfo();
        fetchSessions();
    }, [fetchSecurityInfo, fetchSessions]);

    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) {
            showNotification('새 비밀번호가 일치하지 않습니다.', 'error');
            return;
        }
        if (newPassword.length < 8) {
            showNotification('비밀번호는 8자 이상이어야 합니다.', 'error');
            return;
        }
        setSaving(true);
        try {
            const response = await fetch(`${API_URL}/users/${userId}/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword })
            });
            const result = await response.json();
            if (result.success) {
                showNotification(result.message, 'success');
                setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
                fetchSecurityInfo();
            } else {
                showNotification(result.message, 'error');
            }
        } catch { showNotification('비밀번호 변경 실패', 'error'); }
        finally { setSaving(false); }
    };

    const handleTerminateSession = async (sessionId: string) => {
        try {
            await fetch(`${API_URL}/users/${userId}/sessions/${sessionId}`, { method: 'DELETE' });
            showNotification('세션이 종료되었습니다.', 'success');
            fetchSessions();
            fetchSecurityInfo();
        } catch { showNotification('세션 종료 실패', 'error'); }
    };

    const handleTerminateAll = async () => {
        if (!confirm('다른 모든 기기에서 로그아웃하시겠습니까?')) return;
        try {
            await fetch(`${API_URL}/users/${userId}/sessions`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ exceptCurrentSession: 'current' })
            });
            showNotification('모든 세션이 종료되었습니다.', 'success');
            fetchSessions();
            fetchSecurityInfo();
        } catch { showNotification('세션 종료 실패', 'error'); }
    };

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const formatDate = (dateStr?: string) => dateStr ? new Date(dateStr).toLocaleString('ko-KR') : '-';
    const formatTimeAgo = (dateStr?: string) => {
        if (!dateStr) return '-';
        const diff = Date.now() - new Date(dateStr).getTime();
        if (diff < 60000) return '방금 전';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
        return `${Math.floor(diff / 86400000)}일 전`;
    };

    const actionLabels: Record<string, { label: string; icon: string }> = {
        login: { label: '로그인', icon: '🔐' },
        logout: { label: '로그아웃', icon: '🚪' },
        login_failed: { label: '로그인 실패', icon: '❌' },
        password_change: { label: '비밀번호 변경', icon: '🔑' }
    };

    if (loading) {
        return (
            <div style={{ ...darkStyles.container, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <div style={{ textAlign: 'center', color: darkTheme.textSecondary }}>⏳ 로딩 중...</div>
            </div>
        );
    }

    return (
        <div style={darkStyles.container}>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: darkTheme.textPrimary, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    🔒 보안 설정
                </h1>
                <p style={{ color: darkTheme.textSecondary, marginTop: '4px' }}>비밀번호 및 로그인 보안 관리</p>
            </div>

            {/* Security Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {[
                    { label: '활성 세션', value: securityInfo?.activeSessions || 0, color: darkTheme.accentBlue, icon: '📱' },
                    { label: '마지막 로그인', value: formatTimeAgo(securityInfo?.lastLoginAt), color: darkTheme.accentGreen, icon: '🕐' },
                    { label: '실패 시도', value: securityInfo?.failedLoginAttempts || 0, color: securityInfo?.failedLoginAttempts ? darkTheme.accentRed : darkTheme.accentGreen, icon: '⚠️' }
                ].map((stat, i) => (
                    <AnimatedCard key={stat.label} delay={i * 0.1}>
                        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '24px' }}>{stat.icon}</span>
                            <div>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
                                <div style={{ fontSize: '13px', color: darkTheme.textMuted }}>{stat.label}</div>
                            </div>
                        </div>
                    </AnimatedCard>
                ))}
            </div>

            <div style={{ marginBottom: '24px' }}>
                <TabGroup
                    tabs={[
                        { id: 'password', label: '비밀번호 변경', icon: '🔑' },
                        { id: 'sessions', label: '활성 세션', icon: '📱' },
                        { id: 'history', label: '보안 로그', icon: '📋' }
                    ]}
                    activeTab={activeTab}
                    onChange={setActiveTab}
                />
            </div>

            {activeTab === 'password' && (
                <AnimatedCard delay={0.2}>
                    <div style={{ padding: '24px', maxWidth: '400px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', color: darkTheme.textPrimary, marginBottom: '20px' }}>비밀번호 변경</h3>
                        <div style={{ display: 'grid', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>현재 비밀번호</label>
                                <input type="password" style={{ ...darkStyles.input, width: '100%' }} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>새 비밀번호</label>
                                <input type="password" style={{ ...darkStyles.input, width: '100%' }} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="8자 이상" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>새 비밀번호 확인</label>
                                <input type="password" style={{ ...darkStyles.input, width: '100%' }} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />
                            </div>
                            <button style={{ ...darkStyles.button, width: '100%', marginTop: '8px' }} onClick={handleChangePassword} disabled={saving}>
                                {saving ? '변경 중...' : '🔐 비밀번호 변경'}
                            </button>
                        </div>
                        {securityInfo?.passwordChangedAt && (
                            <p style={{ marginTop: '16px', fontSize: '13px', color: darkTheme.textMuted }}>
                                마지막 변경: {formatDate(securityInfo.passwordChangedAt)}
                            </p>
                        )}
                    </div>
                </AnimatedCard>
            )}

            {activeTab === 'sessions' && (
                <AnimatedCard delay={0.2}>
                    <div style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '600', color: darkTheme.textPrimary }}>활성 세션</h3>
                            {sessions.length > 1 && (
                                <button style={darkStyles.buttonSecondary} onClick={handleTerminateAll}>🚪 다른 기기 로그아웃</button>
                            )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {sessions.map((session, i) => (
                                <div key={session.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: darkTheme.bgSecondary, borderRadius: '8px', animation: `fadeIn 0.3s ease-out ${i * 0.1}s both` }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${darkTheme.accentBlue}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                                        {session.deviceType === 'mobile' ? '📱' : session.deviceType === 'tablet' ? '📲' : '💻'}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '500', color: darkTheme.textPrimary }}>{session.deviceName || `${session.browser} on ${session.os}`}</div>
                                        <div style={{ fontSize: '13px', color: darkTheme.textMuted }}>{session.ipAddress} {session.location && `• ${session.location}`}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '13px', color: darkTheme.textSecondary }}>{formatTimeAgo(session.lastActivityAt || session.createdAt)}</div>
                                        {i === 0 ? (
                                            <span style={{ fontSize: '11px', color: darkTheme.accentGreen, padding: '2px 6px', background: `${darkTheme.accentGreen}20`, borderRadius: '4px' }}>현재 세션</span>
                                        ) : (
                                            <button onClick={() => handleTerminateSession(session.id)} style={{ fontSize: '12px', color: darkTheme.accentRed, background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>종료</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </AnimatedCard>
            )}

            {activeTab === 'history' && (
                <AnimatedCard delay={0.2}>
                    <div style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', color: darkTheme.textPrimary, marginBottom: '20px' }}>최근 보안 이벤트</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {(securityInfo?.recentSecurityEvents || []).map((event, i) => {
                                const info = actionLabels[event.action] || { label: event.action, icon: '📌' };
                                return (
                                    <div key={event.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: darkTheme.bgSecondary, borderRadius: '6px' }}>
                                        <span style={{ fontSize: '18px' }}>{info.icon}</span>
                                        <div style={{ flex: 1 }}>
                                            <span style={{ color: darkTheme.textPrimary }}>{info.label}</span>
                                            {event.ipAddress && <span style={{ marginLeft: '8px', fontSize: '13px', color: darkTheme.textMuted }}>{event.ipAddress}</span>}
                                        </div>
                                        <span style={{ fontSize: '13px', color: darkTheme.textSecondary }}>{formatDate(event.createdAt)}</span>
                                    </div>
                                );
                            })}
                            {(!securityInfo?.recentSecurityEvents || securityInfo.recentSecurityEvents.length === 0) && (
                                <div style={{ textAlign: 'center', padding: '20px', color: darkTheme.textMuted }}>보안 이벤트가 없습니다</div>
                            )}
                        </div>
                    </div>
                </AnimatedCard>
            )}

            {notification && (
                <div style={{ position: 'fixed', bottom: '24px', right: '24px', padding: '16px 24px', background: notification.type === 'success' ? darkTheme.accentGreen : darkTheme.accentRed, color: 'white', borderRadius: '12px', zIndex: 1000, fontWeight: '500' }}>
                    {notification.type === 'success' ? '✅' : '❌'} {notification.message}
                </div>
            )}
            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
    );
}
