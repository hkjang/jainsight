'use client';

import { useEffect, useState, useCallback } from 'react';
import { darkTheme, darkStyles, AnimatedCard, TabGroup } from '../../components/admin/AdminUtils';
import useAuth from '../../hooks/useAuth';

const API_URL = '/api';

interface UserPreferences {
    theme: 'dark' | 'light' | 'system';
    language: string;
    timezone: string;
    notifications: {
        email: boolean;
        browser: boolean;
        queryResults: boolean;
        systemAlerts: boolean;
    };
    editor: {
        fontSize: number;
        tabSize: number;
        autoComplete: boolean;
        lineNumbers: boolean;
    };
}

const languageOptions = [
    { value: 'ko', label: '한국어' },
    { value: 'en', label: 'English' },
    { value: 'ja', label: '日本語' }
];

const timezoneOptions = [
    { value: 'Asia/Seoul', label: '서울 (UTC+9)' },
    { value: 'Asia/Tokyo', label: '도쿄 (UTC+9)' },
    { value: 'America/New_York', label: '뉴욕 (UTC-5)' },
    { value: 'Europe/London', label: '런던 (UTC+0)' }
];

export default function SettingsPage() {
    const { user, token, loading: authLoading, isAuthenticated } = useAuth();
    const [preferences, setPreferences] = useState<UserPreferences | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const fetchPreferences = useCallback(async () => {
        if (!user?.id || !token) return;
        
        try {
            const response = await fetch(`${API_URL}/users/${user.id}/preferences`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setPreferences(data);
            } else {
                // Default preferences
                setPreferences({
                    theme: 'system',
                    language: 'ko',
                    timezone: 'Asia/Seoul',
                    notifications: { email: true, browser: true, queryResults: true, systemAlerts: true },
                    editor: { fontSize: 14, tabSize: 4, autoComplete: true, lineNumbers: true }
                });
            }
        } catch (error) {
            console.error('Failed to fetch preferences:', error);
        } finally {
            setLoading(false);
        }
    }, [user, token]);

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            fetchPreferences();
        }
    }, [fetchPreferences, authLoading, isAuthenticated]);

    const handleSave = async () => {
        if (!preferences || !user?.id || !token) return;
        setSaving(true);
        try {
            const response = await fetch(`${API_URL}/users/${user.id}/preferences`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(preferences)
            });
            if (response.ok) {
                showNotification('설정이 저장되었습니다.', 'success');
            } else {
                showNotification('저장 실패', 'error');
            }
        } catch (error) {
            console.error('Failed to save preferences:', error);
            showNotification('저장 실패', 'error');
        } finally {
            setSaving(false);
        }
    };

    const updatePreference = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
        if (preferences) {
            setPreferences({ ...preferences, [key]: value });
        }
    };

    const updateNotification = (key: keyof UserPreferences['notifications'], value: boolean) => {
        if (preferences) {
            setPreferences({
                ...preferences,
                notifications: { ...preferences.notifications, [key]: value }
            });
        }
    };

    const updateEditor = (key: keyof UserPreferences['editor'], value: number | boolean) => {
        if (preferences) {
            setPreferences({
                ...preferences,
                editor: { ...preferences.editor, [key]: value }
            });
        }
    };

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const toggleStyle = (active: boolean): React.CSSProperties => ({
        width: '48px', height: '24px', borderRadius: '12px', cursor: 'pointer',
        background: active ? darkTheme.accentBlue : darkTheme.bgSecondary,
        position: 'relative', transition: 'background 0.2s', border: 'none'
    });

    const toggleKnobStyle = (active: boolean): React.CSSProperties => ({
        position: 'absolute', top: '2px', left: active ? '26px' : '2px',
        width: '20px', height: '20px', borderRadius: '50%',
        background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
    });

    if (authLoading || loading) {
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: darkTheme.textPrimary, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        ⚙️ 설정
                    </h1>
                    <p style={{ color: darkTheme.textSecondary, marginTop: '4px' }}>개인 설정 및 환경 구성</p>
                </div>
                <button style={{ ...darkStyles.button, opacity: saving ? 0.7 : 1 }} onClick={handleSave} disabled={saving}>
                    {saving ? '저장 중...' : '💾 저장'}
                </button>
            </div>

            {/* Tabs */}
            <div style={{ marginBottom: '24px' }}>
                <TabGroup
                    tabs={[
                        { id: 'general', label: '일반', icon: '🎨' },
                        { id: 'notifications', label: '알림', icon: '🔔' },
                        { id: 'editor', label: '에디터', icon: '📝' }
                    ]}
                    activeTab={activeTab}
                    onChange={setActiveTab}
                />
            </div>

            {/* General Settings */}
            {activeTab === 'general' && (
                <AnimatedCard delay={0.1}>
                    <div style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', color: darkTheme.textPrimary, marginBottom: '24px' }}>일반 설정</h3>
                        
                        <div style={{ display: 'grid', gap: '24px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: darkTheme.textSecondary }}>테마</label>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    {(['light', 'dark', 'system'] as const).map((theme) => (
                                        <button
                                            key={theme}
                                            style={{
                                                padding: '12px 24px', borderRadius: '8px', cursor: 'pointer',
                                                background: preferences?.theme === theme ? darkTheme.accentBlue : darkTheme.bgSecondary,
                                                color: preferences?.theme === theme ? 'white' : darkTheme.textSecondary,
                                                border: 'none', fontWeight: '500', transition: 'all 0.2s'
                                            }}
                                            onClick={() => updatePreference('theme', theme)}
                                        >
                                            {theme === 'light' ? '☀️ 라이트' : theme === 'dark' ? '🌙 다크' : '💻 시스템'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: darkTheme.textSecondary }}>언어</label>
                                <select
                                    style={{ ...darkStyles.input, width: '300px' }}
                                    value={preferences?.language}
                                    onChange={(e) => updatePreference('language', e.target.value)}
                                >
                                    {languageOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: darkTheme.textSecondary }}>시간대</label>
                                <select
                                    style={{ ...darkStyles.input, width: '300px' }}
                                    value={preferences?.timezone}
                                    onChange={(e) => updatePreference('timezone', e.target.value)}
                                >
                                    {timezoneOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </AnimatedCard>
            )}

            {/* Notification Settings */}
            {activeTab === 'notifications' && (
                <AnimatedCard delay={0.1}>
                    <div style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', color: darkTheme.textPrimary, marginBottom: '24px' }}>알림 설정</h3>
                        
                        <div style={{ display: 'grid', gap: '20px' }}>
                            {[
                                { key: 'email' as const, label: '이메일 알림', desc: '중요 알림을 이메일로 받습니다' },
                                { key: 'browser' as const, label: '브라우저 알림', desc: '푸시 알림을 받습니다' },
                                { key: 'queryResults' as const, label: '쿼리 결과 알림', desc: '쿼리 완료 시 알림을 받습니다' },
                                { key: 'systemAlerts' as const, label: '시스템 알림', desc: '시스템 상태 변경 알림' }
                            ].map(({ key, label, desc }) => (
                                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: darkTheme.bgSecondary, borderRadius: '8px' }}>
                                    <div>
                                        <div style={{ fontWeight: '500', color: darkTheme.textPrimary }}>{label}</div>
                                        <div style={{ fontSize: '13px', color: darkTheme.textMuted, marginTop: '2px' }}>{desc}</div>
                                    </div>
                                    <button
                                        style={toggleStyle(preferences?.notifications?.[key] ?? true)}
                                        onClick={() => updateNotification(key, !preferences?.notifications?.[key])}
                                    >
                                        <div style={toggleKnobStyle(preferences?.notifications?.[key] ?? true)} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </AnimatedCard>
            )}

            {/* Editor Settings */}
            {activeTab === 'editor' && (
                <AnimatedCard delay={0.1}>
                    <div style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', color: darkTheme.textPrimary, marginBottom: '24px' }}>에디터 설정</h3>
                        
                        <div style={{ display: 'grid', gap: '24px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: darkTheme.textSecondary }}>
                                    글꼴 크기: {preferences?.editor?.fontSize}px
                                </label>
                                <input
                                    type="range"
                                    min="10"
                                    max="24"
                                    value={preferences?.editor?.fontSize || 14}
                                    onChange={(e) => updateEditor('fontSize', parseInt(e.target.value))}
                                    style={{ width: '300px', accentColor: darkTheme.accentBlue }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: darkTheme.textSecondary }}>탭 크기</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {[2, 4, 8].map((size) => (
                                        <button
                                            key={size}
                                            style={{
                                                padding: '8px 16px', borderRadius: '6px', cursor: 'pointer',
                                                background: preferences?.editor?.tabSize === size ? darkTheme.accentBlue : darkTheme.bgSecondary,
                                                color: preferences?.editor?.tabSize === size ? 'white' : darkTheme.textSecondary,
                                                border: 'none', fontWeight: '500'
                                            }}
                                            onClick={() => updateEditor('tabSize', size)}
                                        >
                                            {size}칸
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: darkTheme.bgSecondary, borderRadius: '8px' }}>
                                <div>
                                    <div style={{ fontWeight: '500', color: darkTheme.textPrimary }}>자동 완성</div>
                                    <div style={{ fontSize: '13px', color: darkTheme.textMuted, marginTop: '2px' }}>SQL 키워드 자동 완성</div>
                                </div>
                                <button
                                    style={toggleStyle(preferences?.editor?.autoComplete ?? true)}
                                    onClick={() => updateEditor('autoComplete', !preferences?.editor?.autoComplete)}
                                >
                                    <div style={toggleKnobStyle(preferences?.editor?.autoComplete ?? true)} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: darkTheme.bgSecondary, borderRadius: '8px' }}>
                                <div>
                                    <div style={{ fontWeight: '500', color: darkTheme.textPrimary }}>줄 번호</div>
                                    <div style={{ fontSize: '13px', color: darkTheme.textMuted, marginTop: '2px' }}>에디터에 줄 번호 표시</div>
                                </div>
                                <button
                                    style={toggleStyle(preferences?.editor?.lineNumbers ?? true)}
                                    onClick={() => updateEditor('lineNumbers', !preferences?.editor?.lineNumbers)}
                                >
                                    <div style={toggleKnobStyle(preferences?.editor?.lineNumbers ?? true)} />
                                </button>
                            </div>
                        </div>
                    </div>
                </AnimatedCard>
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
