'use client';

import { useEffect, useState, useCallback } from 'react';
import { darkTheme, darkStyles, AnimatedCard, Tooltip } from '../../components/admin/AdminUtils';

const API_URL = '/api';

interface UserProfile {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
    bio?: string;
    jobTitle?: string;
    role: string;
    status: string;
    accountSource: string;
    lastLoginAt?: string;
    createdAt: string;
}

export default function ProfilePage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editBio, setEditBio] = useState('');
    const [editJobTitle, setEditJobTitle] = useState('');
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // In real app, get userId from auth context
    const userId = 'current-user';

    const fetchProfile = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/users/${userId}/profile`);
            if (response.ok) {
                const data = await response.json();
                setProfile(data);
                setEditName(data.name || '');
                setEditBio(data.bio || '');
                setEditJobTitle(data.jobTitle || '');
            } else {
                // Mock data for development
                const mockProfile: UserProfile = {
                    id: userId,
                    email: 'user@example.com',
                    name: '사용자',
                    bio: '데이터 분석가입니다.',
                    jobTitle: '시니어 데이터 엔지니어',
                    role: 'analyst',
                    status: 'active',
                    accountSource: 'local',
                    createdAt: new Date().toISOString()
                };
                setProfile(mockProfile);
                setEditName(mockProfile.name);
                setEditBio(mockProfile.bio || '');
                setEditJobTitle(mockProfile.jobTitle || '');
            }
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleSave = async () => {
        try {
            const response = await fetch(`${API_URL}/users/${userId}/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editName,
                    bio: editBio,
                    jobTitle: editJobTitle
                })
            });
            if (response.ok) {
                showNotification('프로필이 저장되었습니다.', 'success');
                setEditing(false);
                fetchProfile();
            } else {
                showNotification('저장 실패', 'error');
            }
        } catch (error) {
            console.error('Failed to save profile:', error);
            showNotification('저장 실패', 'error');
        }
    };

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const formatDate = (dateStr?: string) => dateStr ? new Date(dateStr).toLocaleDateString('ko-KR') : '-';

    if (loading) {
        return (
            <div style={{ ...darkStyles.container, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <div style={{ textAlign: 'center', color: darkTheme.textSecondary }}>
                    <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
                    로딩 중...
                </div>
            </div>
        );
    }

    return (
        <div style={darkStyles.container}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: darkTheme.textPrimary, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    👤 내 프로필
                </h1>
                <p style={{ color: darkTheme.textSecondary, marginTop: '4px' }}>개인 정보 및 계정 설정</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
                {/* Avatar Card */}
                <AnimatedCard delay={0.1}>
                    <div style={{ padding: '32px', textAlign: 'center' }}>
                        <div style={{
                            width: '120px', height: '120px', borderRadius: '50%',
                            background: `linear-gradient(135deg, ${darkTheme.accentBlue}40, ${darkTheme.accentPurple}40)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 20px', fontSize: '48px', fontWeight: 'bold',
                            color: darkTheme.accentBlue, border: `3px solid ${darkTheme.accentBlue}`,
                            boxShadow: `0 0 30px ${darkTheme.accentBlue}30`
                        }}>
                            {profile?.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: darkTheme.textPrimary, marginBottom: '4px' }}>
                            {profile?.name}
                        </h2>
                        <p style={{ color: darkTheme.textSecondary, fontSize: '14px', marginBottom: '8px' }}>
                            {profile?.jobTitle || '직책 미지정'}
                        </p>
                        <span style={{
                            display: 'inline-block', padding: '4px 12px', borderRadius: '9999px',
                            fontSize: '12px', fontWeight: '500',
                            background: profile?.role === 'admin' ? `${darkTheme.accentPurple}20` : `${darkTheme.accentBlue}20`,
                            color: profile?.role === 'admin' ? darkTheme.accentPurple : darkTheme.accentBlue
                        }}>
                            {profile?.role?.toUpperCase()}
                        </span>

                        <div style={{ marginTop: '24px', borderTop: `1px solid ${darkTheme.border}`, paddingTop: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <span style={{ color: darkTheme.textMuted, fontSize: '13px' }}>상태</span>
                                <span style={{
                                    padding: '2px 8px', borderRadius: '4px', fontSize: '12px',
                                    background: profile?.status === 'active' ? `${darkTheme.accentGreen}20` : `${darkTheme.accentYellow}20`,
                                    color: profile?.status === 'active' ? darkTheme.accentGreen : darkTheme.accentYellow
                                }}>
                                    {profile?.status === 'active' ? '활성' : profile?.status}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <span style={{ color: darkTheme.textMuted, fontSize: '13px' }}>계정 유형</span>
                                <span style={{ color: darkTheme.textSecondary, fontSize: '13px' }}>{profile?.accountSource?.toUpperCase()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: darkTheme.textMuted, fontSize: '13px' }}>가입일</span>
                                <span style={{ color: darkTheme.textSecondary, fontSize: '13px' }}>{formatDate(profile?.createdAt)}</span>
                            </div>
                        </div>
                    </div>
                </AnimatedCard>

                {/* Profile Form */}
                <AnimatedCard delay={0.2}>
                    <div style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '600', color: darkTheme.textPrimary }}>프로필 정보</h3>
                            {!editing ? (
                                <button style={darkStyles.button} onClick={() => setEditing(true)}>✏️ 수정</button>
                            ) : (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button style={darkStyles.buttonSecondary} onClick={() => setEditing(false)}>취소</button>
                                    <button style={darkStyles.button} onClick={handleSave}>💾 저장</button>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'grid', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>이메일</label>
                                <input
                                    type="email"
                                    style={{ ...darkStyles.input, width: '100%', opacity: 0.7 }}
                                    value={profile?.email || ''}
                                    disabled
                                />
                                <p style={{ fontSize: '12px', color: darkTheme.textMuted, marginTop: '4px' }}>이메일은 변경할 수 없습니다</p>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>이름</label>
                                <input
                                    type="text"
                                    style={{ ...darkStyles.input, width: '100%' }}
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    disabled={!editing}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>직책</label>
                                <input
                                    type="text"
                                    style={{ ...darkStyles.input, width: '100%' }}
                                    value={editJobTitle}
                                    onChange={(e) => setEditJobTitle(e.target.value)}
                                    disabled={!editing}
                                    placeholder="예: 시니어 데이터 엔지니어"
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>소개</label>
                                <textarea
                                    style={{ ...darkStyles.input, width: '100%', minHeight: '100px', resize: 'vertical' }}
                                    value={editBio}
                                    onChange={(e) => setEditBio(e.target.value)}
                                    disabled={!editing}
                                    placeholder="자기소개를 입력하세요..."
                                />
                            </div>
                        </div>
                    </div>
                </AnimatedCard>
            </div>

            {/* Quick Links */}
            <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <AnimatedCard delay={0.3}>
                    <a href="/settings" style={{ display: 'block', padding: '20px', textDecoration: 'none', transition: 'transform 0.2s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '24px' }}>⚙️</span>
                            <div>
                                <div style={{ fontWeight: '500', color: darkTheme.textPrimary }}>설정</div>
                                <div style={{ fontSize: '13px', color: darkTheme.textMuted }}>테마, 언어, 알림</div>
                            </div>
                        </div>
                    </a>
                </AnimatedCard>
                <AnimatedCard delay={0.4}>
                    <a href="/activity" style={{ display: 'block', padding: '20px', textDecoration: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '24px' }}>📊</span>
                            <div>
                                <div style={{ fontWeight: '500', color: darkTheme.textPrimary }}>활동 이력</div>
                                <div style={{ fontSize: '13px', color: darkTheme.textMuted }}>로그인, 쿼리, 리포트</div>
                            </div>
                        </div>
                    </a>
                </AnimatedCard>
                <AnimatedCard delay={0.5}>
                    <a href="/security" style={{ display: 'block', padding: '20px', textDecoration: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '24px' }}>🔒</span>
                            <div>
                                <div style={{ fontWeight: '500', color: darkTheme.textPrimary }}>보안</div>
                                <div style={{ fontSize: '13px', color: darkTheme.textMuted }}>비밀번호, 세션</div>
                            </div>
                        </div>
                    </a>
                </AnimatedCard>
                <AnimatedCard delay={0.6}>
                    <a href="/dashboard" style={{ display: 'block', padding: '20px', textDecoration: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '24px' }}>🏠</span>
                            <div>
                                <div style={{ fontWeight: '500', color: darkTheme.textPrimary }}>대시보드</div>
                                <div style={{ fontSize: '13px', color: darkTheme.textMuted }}>빠른 액션, 통계</div>
                            </div>
                        </div>
                    </a>
                </AnimatedCard>
            </div>

            {/* Notification Toast */}
            {notification && (
                <div style={{
                    position: 'fixed', bottom: '24px', right: '24px', padding: '16px 24px',
                    background: notification.type === 'success' ? darkTheme.accentGreen : darkTheme.accentRed,
                    color: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    animation: 'slideIn 0.3s ease-out', zIndex: 1000, fontSize: '14px', fontWeight: '500'
                }}>
                    {notification.type === 'success' ? '✅' : '❌'} {notification.message}
                </div>
            )}
            <style>{`@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }`}</style>
        </div>
    );
}
