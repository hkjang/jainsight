'use client';

import { useEffect, useState, useCallback } from 'react';

const API_URL = '/api';

interface SystemSettings {
    general: {
        siteName: string;
        siteDescription: string;
        maintenanceMode: boolean;
        allowRegistration: boolean;
    };
    security: {
        sessionTimeout: number;
        maxLoginAttempts: number;
        passwordMinLength: number;
        requireMFA: boolean;
        allowedIPs: string[];
    };
    query: {
        defaultLimit: number;
        maxExecutionTime: number;
        allowDDL: boolean;
        requireWhereClause: boolean;
        auditAllQueries: boolean;
    };
    api: {
        rateLimit: number;
        defaultKeyExpiry: number;
        requireIPWhitelist: boolean;
    };
    notifications: {
        emailEnabled: boolean;
        slackEnabled: boolean;
        slackWebhook: string;
        alertThreshold: number;
    };
}

type SettingSection = keyof SystemSettings;

export default function SettingsPage() {
    const [settings, setSettings] = useState<SystemSettings>({
        general: {
            siteName: 'Jainsight DB Hub',
            siteDescription: 'Enterprise Database Management Platform',
            maintenanceMode: false,
            allowRegistration: true
        },
        security: {
            sessionTimeout: 60,
            maxLoginAttempts: 5,
            passwordMinLength: 8,
            requireMFA: false,
            allowedIPs: []
        },
        query: {
            defaultLimit: 1000,
            maxExecutionTime: 30,
            allowDDL: false,
            requireWhereClause: true,
            auditAllQueries: true
        },
        api: {
            rateLimit: 100,
            defaultKeyExpiry: 30,
            requireIPWhitelist: false
        },
        notifications: {
            emailEnabled: true,
            slackEnabled: false,
            slackWebhook: '',
            alertThreshold: 80
        }
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeSection, setActiveSection] = useState<SettingSection>('general');
    const [hasChanges, setHasChanges] = useState(false);
    const [savedMessage, setSavedMessage] = useState('');

    const fetchSettings = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/settings`);
            if (response.ok) {
                const data = await response.json();
                setSettings(data);
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const updateSetting = <K extends SettingSection>(
        section: K,
        key: keyof SystemSettings[K],
        value: SystemSettings[K][keyof SystemSettings[K]]
    ) => {
        setSettings(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [key]: value
            }
        }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch(`${API_URL}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            
            if (response.ok) {
                setSavedMessage('설정이 저장되었습니다.');
                setHasChanges(false);
                setTimeout(() => setSavedMessage(''), 3000);
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            setSavedMessage('저장 실패');
        } finally {
            setSaving(false);
        }
    };

    const containerStyle: React.CSSProperties = { padding: '24px', maxWidth: '1200px', margin: '0 auto' };
    const cardStyle: React.CSSProperties = { background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' };
    const inputStyle: React.CSSProperties = { padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none', width: '100%' };
    const labelStyle: React.CSSProperties = { display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#374151' };
    const fieldStyle: React.CSSProperties = { marginBottom: '20px' };

    const sections: { id: SettingSection; name: string; icon: string }[] = [
        { id: 'general', name: '일반', icon: '⚙️' },
        { id: 'security', name: '보안', icon: '🔒' },
        { id: 'query', name: '쿼리', icon: '📝' },
        { id: 'api', name: 'API', icon: '🔗' },
        { id: 'notifications', name: '알림', icon: '🔔' }
    ];

    if (loading) {
        return <div style={{ ...containerStyle, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}><div style={{ fontSize: '18px', color: '#6B7280' }}>로딩 중...</div></div>;
    }

    return (
        <div style={containerStyle}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1F2937' }}>⚙️ 시스템 설정</h1>
                    <p style={{ color: '#6B7280', marginTop: '4px' }}>플랫폼 전역 설정 관리</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {savedMessage && (
                        <span style={{ color: '#10B981', fontSize: '14px' }}>✅ {savedMessage}</span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || saving}
                        style={{
                            padding: '10px 20px',
                            background: hasChanges ? 'linear-gradient(135deg, #3B82F6, #2563EB)' : '#E5E7EB',
                            color: hasChanges ? 'white' : '#9CA3AF',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: hasChanges ? 'pointer' : 'not-allowed'
                        }}
                    >
                        {saving ? '저장 중...' : '💾 저장'}
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px' }}>
                {/* Section Navigation */}
                <div style={cardStyle}>
                    {sections.map(section => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            style={{
                                width: '100%',
                                padding: '14px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                background: activeSection === section.id ? '#EEF2FF' : 'transparent',
                                border: 'none',
                                borderLeft: activeSection === section.id ? '3px solid #3B82F6' : '3px solid transparent',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: activeSection === section.id ? '600' : '400',
                                color: activeSection === section.id ? '#3B82F6' : '#374151',
                                textAlign: 'left'
                            }}
                        >
                            <span>{section.icon}</span>
                            <span>{section.name}</span>
                        </button>
                    ))}
                </div>

                {/* Settings Content */}
                <div style={cardStyle}>
                    <div style={{ padding: '24px' }}>
                        {/* General Settings */}
                        {activeSection === 'general' && (
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>일반 설정</h2>
                                
                                <div style={fieldStyle}>
                                    <label style={labelStyle}>사이트 이름</label>
                                    <input
                                        type="text"
                                        style={inputStyle}
                                        value={settings.general.siteName}
                                        onChange={e => updateSetting('general', 'siteName', e.target.value)}
                                    />
                                </div>

                                <div style={fieldStyle}>
                                    <label style={labelStyle}>사이트 설명</label>
                                    <input
                                        type="text"
                                        style={inputStyle}
                                        value={settings.general.siteDescription}
                                        onChange={e => updateSetting('general', 'siteDescription', e.target.value)}
                                    />
                                </div>

                                <div style={fieldStyle}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={settings.general.maintenanceMode}
                                            onChange={e => updateSetting('general', 'maintenanceMode', e.target.checked)}
                                            style={{ width: '18px', height: '18px', accentColor: '#3B82F6' }}
                                        />
                                        <div>
                                            <div style={{ fontWeight: '500' }}>유지보수 모드</div>
                                            <div style={{ fontSize: '12px', color: '#6B7280' }}>활성화 시 관리자만 접근 가능</div>
                                        </div>
                                    </label>
                                </div>

                                <div style={fieldStyle}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={settings.general.allowRegistration}
                                            onChange={e => updateSetting('general', 'allowRegistration', e.target.checked)}
                                            style={{ width: '18px', height: '18px', accentColor: '#3B82F6' }}
                                        />
                                        <div>
                                            <div style={{ fontWeight: '500' }}>회원가입 허용</div>
                                            <div style={{ fontSize: '12px', color: '#6B7280' }}>새 사용자 등록 허용</div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Security Settings */}
                        {activeSection === 'security' && (
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>보안 설정</h2>
                                
                                <div style={fieldStyle}>
                                    <label style={labelStyle}>세션 타임아웃 (분)</label>
                                    <input
                                        type="number"
                                        style={{ ...inputStyle, maxWidth: '200px' }}
                                        value={settings.security.sessionTimeout}
                                        onChange={e => updateSetting('security', 'sessionTimeout', parseInt(e.target.value))}
                                        min={5}
                                    />
                                </div>

                                <div style={fieldStyle}>
                                    <label style={labelStyle}>최대 로그인 시도 횟수</label>
                                    <input
                                        type="number"
                                        style={{ ...inputStyle, maxWidth: '200px' }}
                                        value={settings.security.maxLoginAttempts}
                                        onChange={e => updateSetting('security', 'maxLoginAttempts', parseInt(e.target.value))}
                                        min={1}
                                    />
                                </div>

                                <div style={fieldStyle}>
                                    <label style={labelStyle}>비밀번호 최소 길이</label>
                                    <input
                                        type="number"
                                        style={{ ...inputStyle, maxWidth: '200px' }}
                                        value={settings.security.passwordMinLength}
                                        onChange={e => updateSetting('security', 'passwordMinLength', parseInt(e.target.value))}
                                        min={6}
                                    />
                                </div>

                                <div style={fieldStyle}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={settings.security.requireMFA}
                                            onChange={e => updateSetting('security', 'requireMFA', e.target.checked)}
                                            style={{ width: '18px', height: '18px', accentColor: '#3B82F6' }}
                                        />
                                        <div>
                                            <div style={{ fontWeight: '500' }}>2단계 인증 필수</div>
                                            <div style={{ fontSize: '12px', color: '#6B7280' }}>모든 사용자에게 MFA 요구</div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Query Settings */}
                        {activeSection === 'query' && (
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>쿼리 설정</h2>
                                
                                <div style={fieldStyle}>
                                    <label style={labelStyle}>기본 LIMIT 값</label>
                                    <input
                                        type="number"
                                        style={{ ...inputStyle, maxWidth: '200px' }}
                                        value={settings.query.defaultLimit}
                                        onChange={e => updateSetting('query', 'defaultLimit', parseInt(e.target.value))}
                                        min={1}
                                    />
                                </div>

                                <div style={fieldStyle}>
                                    <label style={labelStyle}>최대 실행 시간 (초)</label>
                                    <input
                                        type="number"
                                        style={{ ...inputStyle, maxWidth: '200px' }}
                                        value={settings.query.maxExecutionTime}
                                        onChange={e => updateSetting('query', 'maxExecutionTime', parseInt(e.target.value))}
                                        min={1}
                                    />
                                </div>

                                <div style={fieldStyle}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={settings.query.allowDDL}
                                            onChange={e => updateSetting('query', 'allowDDL', e.target.checked)}
                                            style={{ width: '18px', height: '18px', accentColor: '#EF4444' }}
                                        />
                                        <div>
                                            <div style={{ fontWeight: '500', color: '#EF4444' }}>DDL 허용 ⚠️</div>
                                            <div style={{ fontSize: '12px', color: '#6B7280' }}>DROP, CREATE, ALTER 등 허용 (위험)</div>
                                        </div>
                                    </label>
                                </div>

                                <div style={fieldStyle}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={settings.query.requireWhereClause}
                                            onChange={e => updateSetting('query', 'requireWhereClause', e.target.checked)}
                                            style={{ width: '18px', height: '18px', accentColor: '#3B82F6' }}
                                        />
                                        <div>
                                            <div style={{ fontWeight: '500' }}>WHERE 절 필수</div>
                                            <div style={{ fontSize: '12px', color: '#6B7280' }}>UPDATE, DELETE 시 WHERE 필수</div>
                                        </div>
                                    </label>
                                </div>

                                <div style={fieldStyle}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={settings.query.auditAllQueries}
                                            onChange={e => updateSetting('query', 'auditAllQueries', e.target.checked)}
                                            style={{ width: '18px', height: '18px', accentColor: '#3B82F6' }}
                                        />
                                        <div>
                                            <div style={{ fontWeight: '500' }}>모든 쿼리 감사</div>
                                            <div style={{ fontSize: '12px', color: '#6B7280' }}>실행된 모든 쿼리 로깅</div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* API Settings */}
                        {activeSection === 'api' && (
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>API 설정</h2>
                                
                                <div style={fieldStyle}>
                                    <label style={labelStyle}>Rate Limit (요청/분)</label>
                                    <input
                                        type="number"
                                        style={{ ...inputStyle, maxWidth: '200px' }}
                                        value={settings.api.rateLimit}
                                        onChange={e => updateSetting('api', 'rateLimit', parseInt(e.target.value))}
                                        min={1}
                                    />
                                </div>

                                <div style={fieldStyle}>
                                    <label style={labelStyle}>기본 키 만료 기간 (일)</label>
                                    <input
                                        type="number"
                                        style={{ ...inputStyle, maxWidth: '200px' }}
                                        value={settings.api.defaultKeyExpiry}
                                        onChange={e => updateSetting('api', 'defaultKeyExpiry', parseInt(e.target.value))}
                                        min={1}
                                    />
                                </div>

                                <div style={fieldStyle}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={settings.api.requireIPWhitelist}
                                            onChange={e => updateSetting('api', 'requireIPWhitelist', e.target.checked)}
                                            style={{ width: '18px', height: '18px', accentColor: '#3B82F6' }}
                                        />
                                        <div>
                                            <div style={{ fontWeight: '500' }}>IP 화이트리스트 필수</div>
                                            <div style={{ fontSize: '12px', color: '#6B7280' }}>API 키 생성 시 IP 제한 필수</div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Notifications Settings */}
                        {activeSection === 'notifications' && (
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>알림 설정</h2>
                                
                                <div style={fieldStyle}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={settings.notifications.emailEnabled}
                                            onChange={e => updateSetting('notifications', 'emailEnabled', e.target.checked)}
                                            style={{ width: '18px', height: '18px', accentColor: '#3B82F6' }}
                                        />
                                        <div>
                                            <div style={{ fontWeight: '500' }}>이메일 알림</div>
                                            <div style={{ fontSize: '12px', color: '#6B7280' }}>중요 이벤트 이메일 발송</div>
                                        </div>
                                    </label>
                                </div>

                                <div style={fieldStyle}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={settings.notifications.slackEnabled}
                                            onChange={e => updateSetting('notifications', 'slackEnabled', e.target.checked)}
                                            style={{ width: '18px', height: '18px', accentColor: '#3B82F6' }}
                                        />
                                        <div>
                                            <div style={{ fontWeight: '500' }}>Slack 알림</div>
                                            <div style={{ fontSize: '12px', color: '#6B7280' }}>Slack 채널로 알림 발송</div>
                                        </div>
                                    </label>
                                </div>

                                {settings.notifications.slackEnabled && (
                                    <div style={fieldStyle}>
                                        <label style={labelStyle}>Slack Webhook URL</label>
                                        <input
                                            type="text"
                                            style={inputStyle}
                                            value={settings.notifications.slackWebhook}
                                            onChange={e => updateSetting('notifications', 'slackWebhook', e.target.value)}
                                            placeholder="https://hooks.slack.com/services/..."
                                        />
                                    </div>
                                )}

                                <div style={fieldStyle}>
                                    <label style={labelStyle}>알림 임계값 (위험도 %)</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={settings.notifications.alertThreshold}
                                            onChange={e => updateSetting('notifications', 'alertThreshold', parseInt(e.target.value))}
                                            style={{ flex: 1 }}
                                        />
                                        <span style={{ minWidth: '50px', fontWeight: '500' }}>{settings.notifications.alertThreshold}%</span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                                        이 위험도 이상일 때 알림 발송
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
