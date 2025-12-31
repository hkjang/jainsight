'use client';

import { useEffect, useState, useCallback } from 'react';
import { darkTheme, darkStyles } from '../../../components/admin/AdminUtils';

const API_URL = '/api';

interface SystemSettings {
    general: { siteName: string; siteDescription: string; maintenanceMode: boolean; allowRegistration: boolean };
    security: { sessionTimeout: number; maxLoginAttempts: number; passwordMinLength: number; requireMFA: boolean; allowedIPs: string[] };
    query: { defaultLimit: number; maxExecutionTime: number; allowDDL: boolean; requireWhereClause: boolean; auditAllQueries: boolean };
    api: { rateLimit: number; defaultKeyExpiry: number; requireIPWhitelist: boolean };
    notifications: { emailEnabled: boolean; slackEnabled: boolean; slackWebhook: string; alertThreshold: number };
}

type SettingSection = keyof SystemSettings;

export default function SettingsPage() {
    const [settings, setSettings] = useState<SystemSettings>({
        general: { siteName: 'Jainsight DB Hub', siteDescription: 'Enterprise Database Management Platform', maintenanceMode: false, allowRegistration: true },
        security: { sessionTimeout: 60, maxLoginAttempts: 5, passwordMinLength: 8, requireMFA: false, allowedIPs: [] },
        query: { defaultLimit: 1000, maxExecutionTime: 30, allowDDL: false, requireWhereClause: true, auditAllQueries: true },
        api: { rateLimit: 100, defaultKeyExpiry: 30, requireIPWhitelist: false },
        notifications: { emailEnabled: true, slackEnabled: false, slackWebhook: '', alertThreshold: 80 }
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeSection, setActiveSection] = useState<SettingSection>('general');
    const [hasChanges, setHasChanges] = useState(false);
    const [savedMessage, setSavedMessage] = useState('');
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [showDDLConfirm, setShowDDLConfirm] = useState(false);
    const [newIP, setNewIP] = useState('');
    const [testingSlack, setTestingSlack] = useState(false);
    const [changeHistory, setChangeHistory] = useState<{ time: string; section: string; field: string }[]>([]);

    const fetchSettings = useCallback(async () => {
        try { const res = await fetch(`${API_URL}/settings`); if (res.ok) setSettings(await res.json()); } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchSettings(); }, [fetchSettings]);

    const updateSetting = <K extends SettingSection>(section: K, key: keyof SystemSettings[K], value: SystemSettings[K][keyof SystemSettings[K]]) => {
        setSettings(prev => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try { const res = await fetch(`${API_URL}/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
            if (res.ok) { setSavedMessage('설정이 저장되었습니다.'); setHasChanges(false); setTimeout(() => setSavedMessage(''), 3000); }
        } catch (e) { console.error(e); setSavedMessage('저장 실패'); } finally { setSaving(false); }
    };

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    const defaultSettings: SystemSettings = {
        general: { siteName: 'Jainsight DB Hub', siteDescription: 'Enterprise Database Management Platform', maintenanceMode: false, allowRegistration: true },
        security: { sessionTimeout: 60, maxLoginAttempts: 5, passwordMinLength: 8, requireMFA: false, allowedIPs: [] },
        query: { defaultLimit: 1000, maxExecutionTime: 30, allowDDL: false, requireWhereClause: true, auditAllQueries: true },
        api: { rateLimit: 100, defaultKeyExpiry: 30, requireIPWhitelist: false },
        notifications: { emailEnabled: true, slackEnabled: false, slackWebhook: '', alertThreshold: 80 }
    };

    const handleResetDefaults = () => {
        setSettings(defaultSettings);
        setHasChanges(true);
        setShowResetConfirm(false);
        showNotification('기본값으로 초기화되었습니다. 저장을 눌러주세요.', 'success');
    };

    const handleExportSettings = () => {
        const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `jainsight_settings_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showNotification('설정이 내보내졌습니다.', 'success');
    };

    const handleImportSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target?.result as string);
                setSettings(imported);
                setHasChanges(true);
                showNotification('설정이 가져와졌습니다. 저장을 눌러주세요.', 'success');
            } catch {
                showNotification('잘못된 파일 형식입니다.', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleAddIP = () => {
        if (!newIP.trim()) return;
        const ipPattern = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
        if (!ipPattern.test(newIP.trim())) {
            showNotification('잘못된 IP 형식입니다. (ex: 192.168.1.1 또는 10.0.0.0/24)', 'error');
            return;
        }
        updateSetting('security', 'allowedIPs', [...settings.security.allowedIPs, newIP.trim()] as unknown as string[]);
        setNewIP('');
        showNotification('IP가 추가되었습니다.', 'success');
    };

    const handleRemoveIP = (ip: string) => {
        updateSetting('security', 'allowedIPs', settings.security.allowedIPs.filter(i => i !== ip) as unknown as string[]);
        showNotification('IP가 제거되었습니다.', 'success');
    };

    const handleTestSlackWebhook = async () => {
        if (!settings.notifications.slackWebhook) {
            showNotification('Slack Webhook URL을 입력해주세요.', 'error');
            return;
        }
        setTestingSlack(true);
        try {
            const res = await fetch(settings.notifications.slackWebhook, {
                method: 'POST', mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: '🔔 Jainsight 테스트 메시지입니다!' })
            });
            showNotification('Slack 테스트 메시지가 발송되었습니다.', 'success');
        } catch (e) {
            showNotification('Slack Webhook 연결 실패', 'error');
        } finally { setTestingSlack(false); }
    };

    const handleDDLChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setShowDDLConfirm(true);
        } else {
            updateSetting('query', 'allowDDL', false);
        }
    };

    const confirmDDL = () => {
        updateSetting('query', 'allowDDL', true);
        setShowDDLConfirm(false);
        showNotification('⚠️ DDL 실행이 허용되었습니다. 주의하세요!', 'error');
    };

    const sections = [{ id: 'general' as const, name: '일반', icon: '⚙️' }, { id: 'security' as const, name: '보안', icon: '🔒' }, { id: 'query' as const, name: '쿼리', icon: '📝' }, { id: 'api' as const, name: 'API', icon: '🔗' }, { id: 'notifications' as const, name: '알림', icon: '🔔' }];
    const labelStyle: React.CSSProperties = { display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary };
    const fieldStyle: React.CSSProperties = { marginBottom: '20px' };
    const checkboxLabelStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', color: darkTheme.textPrimary };

    if (loading) return <div style={{ ...darkStyles.container, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}><div style={{ color: darkTheme.textSecondary }}>로딩 중...</div></div>;

    return (
        <div style={{ ...darkStyles.container, maxWidth: '1200px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div><h1 style={{ fontSize: '28px', fontWeight: 'bold', color: darkTheme.textPrimary }}>⚙️ 시스템 설정</h1><p style={{ color: darkTheme.textSecondary, marginTop: '4px' }}>플랫폼 전역 설정 관리</p></div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {savedMessage && <span style={{ color: darkTheme.accentGreen, fontSize: '14px' }}>✅ {savedMessage}</span>}
                    <label style={{ ...darkStyles.buttonSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        📤 가져오기
                        <input type="file" accept=".json" onChange={handleImportSettings} style={{ display: 'none' }} />
                    </label>
                    <button style={darkStyles.buttonSecondary} onClick={handleExportSettings}>📥 내보내기</button>
                    <button style={{ ...darkStyles.buttonSecondary, color: darkTheme.accentYellow }} onClick={() => setShowResetConfirm(true)}>🔄 초기화</button>
                    <button onClick={handleSave} disabled={!hasChanges || saving} style={{ ...darkStyles.button, background: hasChanges ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : darkTheme.bgSecondary, color: hasChanges ? 'white' : darkTheme.textMuted, cursor: hasChanges ? 'pointer' : 'not-allowed' }}>{saving ? '저장 중...' : '💾 저장'}</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px' }}>
                <div style={darkStyles.card}>
                    {sections.map(section => (
                        <button key={section.id} onClick={() => setActiveSection(section.id)} style={{ width: '100%', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px', background: activeSection === section.id ? `${darkTheme.accentBlue}15` : 'transparent', border: 'none', borderLeft: activeSection === section.id ? `3px solid ${darkTheme.accentBlue}` : '3px solid transparent', cursor: 'pointer', fontSize: '14px', fontWeight: activeSection === section.id ? '600' : '400', color: activeSection === section.id ? darkTheme.accentBlue : darkTheme.textSecondary, textAlign: 'left' }}>
                            <span>{section.icon}</span><span>{section.name}</span>
                        </button>
                    ))}
                </div>

                <div style={darkStyles.card}>
                    <div style={{ padding: '24px' }}>
                        {activeSection === 'general' && <div>
                            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: darkTheme.textPrimary }}>일반 설정</h2>
                            <div style={fieldStyle}><label style={labelStyle}>사이트 이름</label><input type="text" style={{ ...darkStyles.input, width: '100%' }} value={settings.general.siteName} onChange={e => updateSetting('general', 'siteName', e.target.value)} /></div>
                            <div style={fieldStyle}><label style={labelStyle}>사이트 설명</label><input type="text" style={{ ...darkStyles.input, width: '100%' }} value={settings.general.siteDescription} onChange={e => updateSetting('general', 'siteDescription', e.target.value)} /></div>
                            <div style={fieldStyle}><label style={checkboxLabelStyle}><input type="checkbox" checked={settings.general.maintenanceMode} onChange={e => updateSetting('general', 'maintenanceMode', e.target.checked)} style={{ width: '18px', height: '18px' }} /><div><div style={{ fontWeight: '500' }}>유지보수 모드</div><div style={{ fontSize: '12px', color: darkTheme.textMuted }}>활성화 시 관리자만 접근 가능</div></div></label></div>
                            <div style={fieldStyle}><label style={checkboxLabelStyle}><input type="checkbox" checked={settings.general.allowRegistration} onChange={e => updateSetting('general', 'allowRegistration', e.target.checked)} style={{ width: '18px', height: '18px' }} /><div><div style={{ fontWeight: '500' }}>회원가입 허용</div><div style={{ fontSize: '12px', color: darkTheme.textMuted }}>새 사용자 등록 허용</div></div></label></div>
                        </div>}

                        {activeSection === 'security' && <div>
                            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: darkTheme.textPrimary }}>보안 설정</h2>
                            <div style={fieldStyle}><label style={labelStyle}>세션 타임아웃 (분)</label><input type="number" style={{ ...darkStyles.input, maxWidth: '200px' }} value={settings.security.sessionTimeout} onChange={e => updateSetting('security', 'sessionTimeout', parseInt(e.target.value))} min={5} /></div>
                            <div style={fieldStyle}><label style={labelStyle}>최대 로그인 시도 횟수</label><input type="number" style={{ ...darkStyles.input, maxWidth: '200px' }} value={settings.security.maxLoginAttempts} onChange={e => updateSetting('security', 'maxLoginAttempts', parseInt(e.target.value))} min={1} /></div>
                            <div style={fieldStyle}><label style={labelStyle}>비밀번호 최소 길이</label><input type="number" style={{ ...darkStyles.input, maxWidth: '200px' }} value={settings.security.passwordMinLength} onChange={e => updateSetting('security', 'passwordMinLength', parseInt(e.target.value))} min={6} /></div>
                            <div style={fieldStyle}><label style={checkboxLabelStyle}><input type="checkbox" checked={settings.security.requireMFA} onChange={e => updateSetting('security', 'requireMFA', e.target.checked)} style={{ width: '18px', height: '18px' }} /><div><div style={{ fontWeight: '500' }}>2단계 인증 필수</div><div style={{ fontSize: '12px', color: darkTheme.textMuted }}>모든 사용자에게 MFA 요구</div></div></label></div>
                            
                            {/* IP Whitelist Management */}
                            <div style={fieldStyle}>
                                <label style={labelStyle}>허용 IP 목록</label>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                    <input type="text" style={{ ...darkStyles.input, flex: 1 }} value={newIP} onChange={e => setNewIP(e.target.value)} placeholder="192.168.1.1 또는 10.0.0.0/24" onKeyDown={e => e.key === 'Enter' && handleAddIP()} />
                                    <button style={darkStyles.button} onClick={handleAddIP}>+ 추가</button>
                                </div>
                                {settings.security.allowedIPs.length > 0 ? (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {settings.security.allowedIPs.map(ip => (
                                            <span key={ip} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: darkTheme.bgSecondary, borderRadius: '6px', fontSize: '13px', color: darkTheme.textPrimary }}>
                                                {ip}
                                                <button onClick={() => handleRemoveIP(ip)} style={{ background: 'transparent', border: 'none', color: darkTheme.accentRed, cursor: 'pointer', fontSize: '14px' }}>×</button>
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '13px', color: darkTheme.textMuted }}>등록된 허용 IP가 없습니다.</div>
                                )}
                            </div>
                        </div>}

                        {activeSection === 'query' && <div>
                            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: darkTheme.textPrimary }}>쿼리 설정</h2>
                            <div style={fieldStyle}><label style={labelStyle}>기본 LIMIT 값</label><input type="number" style={{ ...darkStyles.input, maxWidth: '200px' }} value={settings.query.defaultLimit} onChange={e => updateSetting('query', 'defaultLimit', parseInt(e.target.value))} min={1} /></div>
                            <div style={fieldStyle}><label style={labelStyle}>최대 실행 시간 (초)</label><input type="number" style={{ ...darkStyles.input, maxWidth: '200px' }} value={settings.query.maxExecutionTime} onChange={e => updateSetting('query', 'maxExecutionTime', parseInt(e.target.value))} min={1} /></div>
                            <div style={{ ...fieldStyle, padding: '16px', background: settings.query.allowDDL ? `${darkTheme.accentRed}15` : 'transparent', borderRadius: '8px', border: settings.query.allowDDL ? `1px solid ${darkTheme.accentRed}30` : 'none' }}>
                                <label style={checkboxLabelStyle}>
                                    <input type="checkbox" checked={settings.query.allowDDL} onChange={handleDDLChange} style={{ width: '18px', height: '18px', accentColor: darkTheme.accentRed }} />
                                    <div><div style={{ fontWeight: '500', color: darkTheme.accentRed }}>DDL 허용 ⚠️</div><div style={{ fontSize: '12px', color: darkTheme.textMuted }}>DROP, CREATE, ALTER 등 허용 (위험 - 확인 필요)</div></div>
                                </label>
                            </div>
                            <div style={fieldStyle}><label style={checkboxLabelStyle}><input type="checkbox" checked={settings.query.requireWhereClause} onChange={e => updateSetting('query', 'requireWhereClause', e.target.checked)} style={{ width: '18px', height: '18px' }} /><div><div style={{ fontWeight: '500' }}>WHERE 절 필수</div><div style={{ fontSize: '12px', color: darkTheme.textMuted }}>UPDATE, DELETE 시 WHERE 필수</div></div></label></div>
                            <div style={fieldStyle}><label style={checkboxLabelStyle}><input type="checkbox" checked={settings.query.auditAllQueries} onChange={e => updateSetting('query', 'auditAllQueries', e.target.checked)} style={{ width: '18px', height: '18px' }} /><div><div style={{ fontWeight: '500' }}>모든 쿼리 감사</div><div style={{ fontSize: '12px', color: darkTheme.textMuted }}>실행된 모든 쿼리 로깅</div></div></label></div>
                        </div>}

                        {activeSection === 'api' && <div>
                            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: darkTheme.textPrimary }}>API 설정</h2>
                            <div style={fieldStyle}><label style={labelStyle}>Rate Limit (요청/분)</label><input type="number" style={{ ...darkStyles.input, maxWidth: '200px' }} value={settings.api.rateLimit} onChange={e => updateSetting('api', 'rateLimit', parseInt(e.target.value))} min={1} /></div>
                            <div style={fieldStyle}><label style={labelStyle}>기본 키 만료 기간 (일)</label><input type="number" style={{ ...darkStyles.input, maxWidth: '200px' }} value={settings.api.defaultKeyExpiry} onChange={e => updateSetting('api', 'defaultKeyExpiry', parseInt(e.target.value))} min={1} /></div>
                            <div style={fieldStyle}><label style={checkboxLabelStyle}><input type="checkbox" checked={settings.api.requireIPWhitelist} onChange={e => updateSetting('api', 'requireIPWhitelist', e.target.checked)} style={{ width: '18px', height: '18px' }} /><div><div style={{ fontWeight: '500' }}>IP 화이트리스트 필수</div><div style={{ fontSize: '12px', color: darkTheme.textMuted }}>API 키 생성 시 IP 제한 필수</div></div></label></div>
                        </div>}

                        {activeSection === 'notifications' && <div>
                            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: darkTheme.textPrimary }}>알림 설정</h2>
                            <div style={fieldStyle}><label style={checkboxLabelStyle}><input type="checkbox" checked={settings.notifications.emailEnabled} onChange={e => updateSetting('notifications', 'emailEnabled', e.target.checked)} style={{ width: '18px', height: '18px' }} /><div><div style={{ fontWeight: '500' }}>이메일 알림</div><div style={{ fontSize: '12px', color: darkTheme.textMuted }}>중요 이벤트 이메일 발송</div></div></label></div>
                            <div style={fieldStyle}><label style={checkboxLabelStyle}><input type="checkbox" checked={settings.notifications.slackEnabled} onChange={e => updateSetting('notifications', 'slackEnabled', e.target.checked)} style={{ width: '18px', height: '18px' }} /><div><div style={{ fontWeight: '500' }}>Slack 알림</div><div style={{ fontSize: '12px', color: darkTheme.textMuted }}>Slack 채널로 알림 발송</div></div></label></div>
                            {settings.notifications.slackEnabled && (
                                <div style={fieldStyle}>
                                    <label style={labelStyle}>Slack Webhook URL</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input type="text" style={{ ...darkStyles.input, flex: 1 }} value={settings.notifications.slackWebhook} onChange={e => updateSetting('notifications', 'slackWebhook', e.target.value)} placeholder="https://hooks.slack.com/services/..." />
                                        <button style={{ ...darkStyles.buttonSecondary, opacity: testingSlack ? 0.6 : 1 }} onClick={handleTestSlackWebhook} disabled={testingSlack}>
                                            {testingSlack ? '⏳' : '🔔'} 테스트
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div style={fieldStyle}><label style={labelStyle}>알림 임계값 (위험도 %)</label><div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}><input type="range" min="0" max="100" value={settings.notifications.alertThreshold} onChange={e => updateSetting('notifications', 'alertThreshold', parseInt(e.target.value))} style={{ flex: 1 }} /><span style={{ minWidth: '50px', fontWeight: '500', color: darkTheme.textPrimary }}>{settings.notifications.alertThreshold}%</span></div><div style={{ fontSize: '12px', color: darkTheme.textMuted, marginTop: '4px' }}>이 위험도 이상일 때 알림 발송</div></div>
                        </div>}
                    </div>
                </div>
            </div>

            {/* Reset Confirmation Modal */}
            {showResetConfirm && (
                <div style={darkStyles.modalOverlay} onClick={() => setShowResetConfirm(false)}>
                    <div style={darkStyles.modal} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: darkTheme.textPrimary }}>⚠️ 설정 초기화</h2>
                        <p style={{ color: darkTheme.textSecondary, marginBottom: '24px' }}>모든 설정을 기본값으로 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button style={darkStyles.buttonSecondary} onClick={() => setShowResetConfirm(false)}>취소</button>
                            <button style={{ ...darkStyles.button, background: darkTheme.accentRed }} onClick={handleResetDefaults}>🔄 초기화</button>
                        </div>
                    </div>
                </div>
            )}

            {/* DDL Confirmation Modal */}
            {showDDLConfirm && (
                <div style={darkStyles.modalOverlay} onClick={() => setShowDDLConfirm(false)}>
                    <div style={darkStyles.modal} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: darkTheme.accentRed, display: 'flex', alignItems: 'center', gap: '10px' }}>🚨 위험한 설정 변경</h2>
                        <p style={{ color: darkTheme.textSecondary, marginBottom: '16px' }}>DDL(DROP, CREATE, ALTER 등) 실행을 허용하시겠습니까?</p>
                        <div style={{ background: `${darkTheme.accentRed}15`, border: `1px solid ${darkTheme.accentRed}30`, borderRadius: '8px', padding: '12px', marginBottom: '24px' }}>
                            <div style={{ color: darkTheme.accentRed, fontWeight: '500', fontSize: '14px' }}>⚠️ 이 설정은 데이터베이스 전체를 삭제하거나 구조를 변경할 수 있습니다.</div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button style={darkStyles.buttonSecondary} onClick={() => setShowDDLConfirm(false)}>취소</button>
                            <button style={{ ...darkStyles.button, background: darkTheme.accentRed }} onClick={confirmDDL}>⚠️ DDL 허용</button>
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
