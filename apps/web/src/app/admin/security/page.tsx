'use client';

import { useState, useEffect, useMemo } from 'react';

interface SecuritySettings {
    id?: string;
    enablePromptInjectionCheck: boolean;
    enableSqlInjectionCheck: boolean;
    enableDdlBlock: boolean;
    enableDmlBlock: boolean;
    enablePiiMasking: boolean;
    maxResultRows: number;
    blockedKeywords: string;
    piiColumns: string;
    enableRateLimiting: boolean;
    maxRequestsPerMinute: number;
    enableAuditLog: boolean;
    retentionDays: number;
}

const API_URL = '/api';

const defaultSettings: SecuritySettings = {
    enablePromptInjectionCheck: true,
    enableSqlInjectionCheck: true,
    enableDdlBlock: true,
    enableDmlBlock: false,
    enablePiiMasking: true,
    maxResultRows: 1000,
    blockedKeywords: 'DROP, DELETE, TRUNCATE, ALTER, CREATE, GRANT, REVOKE',
    piiColumns: 'ssn, password, credit_card, phone, email, address',
    enableRateLimiting: true,
    maxRequestsPerMinute: 60,
    enableAuditLog: true,
    retentionDays: 90,
};

const presetProfiles = [
    {
        name: '엄격 모드',
        icon: '🔒',
        description: '모든 보안 기능 활성화, 최소 권한',
        settings: {
            enablePromptInjectionCheck: true,
            enableSqlInjectionCheck: true,
            enableDdlBlock: true,
            enableDmlBlock: true,
            enablePiiMasking: true,
            maxResultRows: 100,
            enableRateLimiting: true,
            maxRequestsPerMinute: 30,
        }
    },
    {
        name: '표준 모드',
        icon: '⚖️',
        description: '일반적인 프로덕션 환경에 적합',
        settings: {
            enablePromptInjectionCheck: true,
            enableSqlInjectionCheck: true,
            enableDdlBlock: true,
            enableDmlBlock: false,
            enablePiiMasking: true,
            maxResultRows: 1000,
            enableRateLimiting: true,
            maxRequestsPerMinute: 60,
        }
    },
    {
        name: '개발 모드',
        icon: '🛠️',
        description: '개발/테스트 환경용 유연한 설정',
        settings: {
            enablePromptInjectionCheck: true,
            enableSqlInjectionCheck: true,
            enableDdlBlock: false,
            enableDmlBlock: false,
            enablePiiMasking: false,
            maxResultRows: 10000,
            enableRateLimiting: false,
            maxRequestsPerMinute: 1000,
        }
    },
];

export const dynamic = 'force-dynamic';

export default function SecurityPage() {
    const [settings, setSettings] = useState<SecuritySettings>(defaultSettings);
    const [originalSettings, setOriginalSettings] = useState<SecuritySettings>(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activePreset, setActivePreset] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    const unsavedChanges = useMemo(() => {
        return JSON.stringify(settings) !== JSON.stringify(originalSettings);
    }, [settings, originalSettings]);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/security-settings`);
            if (res.ok) {
                const data = await res.json();
                setSettings(data);
                setOriginalSettings(data);
                checkPreset(data);
            }
        } catch (e) {
            console.error('Failed to fetch settings:', e);
            showNotification('설정을 불러오는데 실패했습니다', 'error');
        } finally {
            setLoading(false);
        }
    };

    const checkPreset = (data: SecuritySettings) => {
        for (const preset of presetProfiles) {
            const matches = Object.entries(preset.settings).every(
                ([key, value]) => (data as any)[key] === value
            );
            if (matches) {
                setActivePreset(preset.name);
                return;
            }
        }
        setActivePreset(null);
    };

    // Security Score
    const securityScore = useMemo(() => {
        let score = 0;
        if (settings.enablePromptInjectionCheck) score += 20;
        if (settings.enableSqlInjectionCheck) score += 20;
        if (settings.enableDdlBlock) score += 15;
        if (settings.enableDmlBlock) score += 10;
        if (settings.enablePiiMasking) score += 15;
        if (settings.enableRateLimiting) score += 10;
        if (settings.enableAuditLog) score += 10;
        return score;
    }, [settings]);

    const updateSettings = (updates: Partial<SecuritySettings>) => {
        setSettings(prev => ({ ...prev, ...updates }));
        setActivePreset(null);
    };

    const applyPreset = (preset: typeof presetProfiles[0]) => {
        setSettings(prev => ({ ...prev, ...preset.settings }));
        setActivePreset(preset.name);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/admin/security-settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            if (res.ok) {
                const data = await res.json();
                setSettings(data);
                setOriginalSettings(data);
                showNotification('설정이 저장되었습니다', 'success');
            } else {
                showNotification('저장에 실패했습니다', 'error');
            }
        } catch (e) {
            console.error('Failed to save:', e);
            showNotification('저장에 실패했습니다', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!confirm('모든 설정을 기본값으로 초기화하시겠습니까?')) return;
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/admin/security-settings/reset`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                setSettings(data);
                setOriginalSettings(data);
                showNotification('기본값으로 초기화되었습니다', 'success');
                checkPreset(data);
            } else {
                showNotification('초기화에 실패했습니다', 'error');
            }
        } catch (e) {
            console.error('Failed to reset:', e);
            showNotification('초기화에 실패했습니다', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleExport = () => {
        const json = JSON.stringify(settings, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `security-settings-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target?.result as string);
                setSettings({ ...defaultSettings, ...imported });
                setActivePreset(null);
                showNotification('설정을 가져왔습니다 (저장 필요)', 'success');
            } catch {
                showNotification('올바른 JSON 파일이 아닙니다', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const inputStyle = {
        width: '100%',
        padding: '10px 14px',
        background: 'rgba(30, 30, 50, 0.8)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: '8px',
        color: '#e0e0e0',
        fontSize: '14px',
        outline: 'none',
    };

    const buttonStyle = {
        padding: '12px 24px',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 500 as const,
        transition: 'all 0.2s ease',
    };

    const toggleStyle = (enabled: boolean) => ({
        width: '48px',
        height: '24px',
        borderRadius: '12px',
        background: enabled ? 'linear-gradient(90deg, #10b981, #059669)' : 'rgba(107, 114, 128, 0.3)',
        position: 'relative' as const,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    });

    const toggleKnobStyle = (enabled: boolean) => ({
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        background: '#fff',
        position: 'absolute' as const,
        top: '2px',
        left: enabled ? '26px' : '2px',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    });

    const ToggleRow = ({ label, description, value, onChange, icon }: { label: string; description: string; value: boolean; onChange: (v: boolean) => void; icon?: string }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(99, 102, 241, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                {icon && <span style={{ fontSize: '20px', marginTop: '2px' }}>{icon}</span>}
                <div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#fff', marginBottom: '4px' }}>{label}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{description}</div>
                </div>
            </div>
            <div style={toggleStyle(value)} onClick={() => onChange(!value)}>
                <div style={toggleKnobStyle(value)} />
            </div>
        </div>
    );

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <div style={{ color: '#6b7280' }}>로딩 중...</div>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 700, background: 'linear-gradient(90deg, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' }}>
                        보안 설정
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: '14px' }}>AI SQL 생성 시 적용되는 보안 정책을 설정합니다.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {unsavedChanges && (
                        <span style={{ fontSize: '12px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            ● 저장되지 않은 변경사항
                        </span>
                    )}
                    <button onClick={handleReset} style={{ ...buttonStyle, background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '10px 16px' }}>
                        🔄 초기화
                    </button>
                    <label style={{ ...buttonStyle, background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', cursor: 'pointer', padding: '10px 16px' }}>
                        📥 가져오기
                        <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
                    </label>
                    <button onClick={handleExport} style={{ ...buttonStyle, background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '10px 16px' }}>
                        📤 내보내기
                    </button>
                    <button 
                        onClick={handleSave} 
                        disabled={!unsavedChanges || saving}
                        style={{ 
                            ...buttonStyle, 
                            background: unsavedChanges ? 'linear-gradient(90deg, #6366f1, #8b5cf6)' : 'rgba(107, 114, 128, 0.2)', 
                            color: unsavedChanges ? '#fff' : '#6b7280',
                            opacity: saving ? 0.7 : 1,
                        }}
                    >
                        {saving ? '저장 중...' : '💾 설정 저장'}
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>
                {/* Main Settings */}
                <div style={{ display: 'grid', gap: '20px' }}>
                    {/* Security Score */}
                    <div style={{ 
                        padding: '20px', 
                        background: 'rgba(20, 20, 35, 0.6)', 
                        borderRadius: '16px', 
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '24px',
                    }}>
                        <div style={{ 
                            width: '80px', 
                            height: '80px', 
                            borderRadius: '50%', 
                            background: `conic-gradient(${securityScore >= 80 ? '#10b981' : securityScore >= 50 ? '#f59e0b' : '#ef4444'} ${securityScore * 3.6}deg, rgba(99, 102, 241, 0.2) 0deg)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <div style={{ 
                                width: '64px', 
                                height: '64px', 
                                borderRadius: '50%', 
                                background: 'rgba(20, 20, 35, 0.95)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '20px',
                                fontWeight: 700,
                                color: securityScore >= 80 ? '#10b981' : securityScore >= 50 ? '#f59e0b' : '#ef4444',
                            }}>
                                {securityScore}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>보안 점수</div>
                            <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                {securityScore >= 80 ? '우수한 보안 수준입니다' : securityScore >= 50 ? '추가 보안 설정을 권장합니다' : '보안 설정을 강화해주세요'}
                            </div>
                        </div>
                    </div>

                    {/* Preset Profiles */}
                    <div style={{ padding: '20px', background: 'rgba(20, 20, 35, 0.6)', borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                        <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '14px' }}>⚡ 빠른 프로필</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                            {presetProfiles.map(preset => (
                                <button 
                                    key={preset.name} 
                                    onClick={() => applyPreset(preset)}
                                    style={{
                                        padding: '14px',
                                        borderRadius: '10px',
                                        border: activePreset === preset.name ? '2px solid #6366f1' : '1px solid rgba(99, 102, 241, 0.2)',
                                        background: activePreset === preset.name ? 'rgba(99, 102, 241, 0.2)' : 'rgba(30, 30, 50, 0.5)',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>{preset.icon}</div>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{preset.name}</div>
                                    <div style={{ fontSize: '11px', color: '#6b7280' }}>{preset.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Injection Protection */}
                    <div style={{ padding: '24px', background: 'rgba(20, 20, 35, 0.6)', borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '20px' }}>🛡️</span> Injection 방어
                        </h2>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>악의적인 입력 패턴을 탐지하고 차단합니다.</p>

                        <ToggleRow
                            icon="🎯"
                            label="Prompt Injection 검사"
                            description="AI 프롬프트에 대한 조작 시도를 탐지합니다"
                            value={settings.enablePromptInjectionCheck}
                            onChange={(v) => updateSettings({ enablePromptInjectionCheck: v })}
                        />
                        <ToggleRow
                            icon="💉"
                            label="SQL Injection 검사"
                            description="생성된 SQL에서 위험한 패턴을 탐지합니다"
                            value={settings.enableSqlInjectionCheck}
                            onChange={(v) => updateSettings({ enableSqlInjectionCheck: v })}
                        />
                    </div>

                    {/* Statement Control */}
                    <div style={{ padding: '24px', background: 'rgba(20, 20, 35, 0.6)', borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '20px' }}>⚠️</span> SQL 문 통제
                        </h2>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>특정 유형의 SQL 문 생성을 차단합니다.</p>

                        <ToggleRow
                            icon="🗑️"
                            label="DDL 문 차단"
                            description="CREATE, DROP, ALTER, TRUNCATE 등의 문을 차단합니다"
                            value={settings.enableDdlBlock}
                            onChange={(v) => updateSettings({ enableDdlBlock: v })}
                        />
                        <ToggleRow
                            icon="✏️"
                            label="DML 문 차단"
                            description="INSERT, UPDATE, DELETE 문을 차단합니다"
                            value={settings.enableDmlBlock}
                            onChange={(v) => updateSettings({ enableDmlBlock: v })}
                        />

                        <div style={{ marginTop: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#a0a0a0' }}>
                                차단 키워드 (쉼표 구분)
                            </label>
                            <textarea
                                value={settings.blockedKeywords}
                                onChange={(e) => updateSettings({ blockedKeywords: e.target.value })}
                                style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }}
                            />
                        </div>
                    </div>

                    {/* PII Protection */}
                    <div style={{ padding: '24px', background: 'rgba(20, 20, 35, 0.6)', borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '20px' }}>🔒</span> 개인정보 보호
                        </h2>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>민감한 개인정보 컬럼에 대한 접근을 통제합니다.</p>

                        <ToggleRow
                            icon="👤"
                            label="PII 컬럼 마스킹"
                            description="개인정보 컬럼 접근 시 자동으로 마스킹 처리합니다"
                            value={settings.enablePiiMasking}
                            onChange={(v) => updateSettings({ enablePiiMasking: v })}
                        />

                        <div style={{ marginTop: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#a0a0a0' }}>
                                PII 컬럼 패턴 (쉼표 구분)
                            </label>
                            <textarea
                                value={settings.piiColumns}
                                onChange={(e) => updateSettings({ piiColumns: e.target.value })}
                                style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                            />
                        </div>
                    </div>

                    {/* Rate Limiting & Audit */}
                    <div style={{ padding: '24px', background: 'rgba(20, 20, 35, 0.6)', borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '20px' }}>📊</span> 제한 및 감사
                        </h2>

                        <ToggleRow
                            icon="⏱️"
                            label="Rate Limiting"
                            description="과도한 요청을 제한합니다"
                            value={settings.enableRateLimiting}
                            onChange={(v) => updateSettings({ enableRateLimiting: v })}
                        />
                        
                        {settings.enableRateLimiting && (
                            <div style={{ marginTop: '12px', marginBottom: '16px', padding: '12px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#a0a0a0' }}>분당 최대 요청 수</label>
                                <input
                                    type="number"
                                    value={settings.maxRequestsPerMinute}
                                    onChange={(e) => updateSettings({ maxRequestsPerMinute: parseInt(e.target.value) || 60 })}
                                    style={{ ...inputStyle, maxWidth: '120px' }}
                                    min={1}
                                />
                            </div>
                        )}

                        <ToggleRow
                            icon="📜"
                            label="감사 로그"
                            description="모든 AI 요청을 기록합니다"
                            value={settings.enableAuditLog}
                            onChange={(v) => updateSettings({ enableAuditLog: v })}
                        />

                        <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#a0a0a0' }}>최대 결과 행 수</label>
                                <input
                                    type="number"
                                    value={settings.maxResultRows}
                                    onChange={(e) => updateSettings({ maxResultRows: parseInt(e.target.value) || 1000 })}
                                    style={inputStyle}
                                    min={1}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#a0a0a0' }}>로그 보관 기간 (일)</label>
                                <input
                                    type="number"
                                    value={settings.retentionDays}
                                    onChange={(e) => updateSettings({ retentionDays: parseInt(e.target.value) || 90 })}
                                    style={inputStyle}
                                    min={1}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Status Overview */}
                    <div style={{ padding: '18px', background: 'rgba(20, 20, 35, 0.6)', borderRadius: '14px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '14px' }}>⚡ 현재 상태</h3>
                        <div style={{ display: 'grid', gap: '10px' }}>
                            {[
                                { label: 'Injection 방어', enabled: settings.enablePromptInjectionCheck && settings.enableSqlInjectionCheck },
                                { label: 'DDL 차단', enabled: settings.enableDdlBlock },
                                { label: 'DML 차단', enabled: settings.enableDmlBlock },
                                { label: 'PII 마스킹', enabled: settings.enablePiiMasking },
                                { label: 'Rate Limit', enabled: settings.enableRateLimiting },
                            ].map(item => (
                                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                                    <span style={{ fontSize: '13px', color: '#a0a0a0' }}>{item.label}</span>
                                    <span style={{ 
                                        fontSize: '11px', 
                                        padding: '3px 8px', 
                                        borderRadius: '4px', 
                                        background: item.enabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                                        color: item.enabled ? '#10b981' : '#6b7280',
                                    }}>
                                        {item.enabled ? 'ON' : 'OFF'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tips */}
                    <div style={{ padding: '18px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '14px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#f59e0b', marginBottom: '10px' }}>💡 보안 팁</h3>
                        <ul style={{ fontSize: '12px', color: '#a0a0a0', margin: 0, paddingLeft: '16px', display: 'grid', gap: '6px' }}>
                            <li>프로덕션 환경에서는 DDL 차단을 권장합니다</li>
                            <li>민감 데이터가 있는 경우 PII 마스킹을 활성화하세요</li>
                            <li>정기적으로 감사 로그를 검토하세요</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Notification Toast */}
            {notification && (
                <div style={{
                    position: 'fixed', bottom: '24px', right: '24px', padding: '16px 24px',
                    background: notification.type === 'success' ? '#10b981' : '#ef4444',
                    color: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    zIndex: 1000, fontSize: '14px', fontWeight: '500'
                }}>
                    {notification.type === 'success' ? '✅' : '❌'} {notification.message}
                </div>
            )}
        </div>
    );
}
