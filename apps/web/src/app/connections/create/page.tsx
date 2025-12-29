'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface DBTypeInfo {
    id: string;
    name: string;
    icon: string;
    color: string;
    gradient: string;
    defaultPort: number;
    description: string;
}

const DB_TYPES: DBTypeInfo[] = [
    { id: 'postgresql', name: 'PostgreSQL', icon: '🐘', color: '#336791', gradient: 'linear-gradient(135deg, #336791, #4A90A4)', defaultPort: 5432, description: '고급 오픈소스 관계형 DB' },
    { id: 'mysql', name: 'MySQL', icon: '🐬', color: '#00758f', gradient: 'linear-gradient(135deg, #00758f, #f29111)', defaultPort: 3306, description: '가장 널리 사용되는 오픈소스 DB' },
    { id: 'mariadb', name: 'MariaDB', icon: '🦭', color: '#003545', gradient: 'linear-gradient(135deg, #003545, #00728C)', defaultPort: 3306, description: 'MySQL 호환 포크' },
    { id: 'mssql', name: 'SQL Server', icon: '🔷', color: '#CC2927', gradient: 'linear-gradient(135deg, #CC2927, #5C2D91)', defaultPort: 1433, description: 'Microsoft 엔터프라이즈 DB' },
    { id: 'oracle', name: 'Oracle', icon: '🔶', color: '#F80000', gradient: 'linear-gradient(135deg, #F80000, #FF6B6B)', defaultPort: 1521, description: '엔터프라이즈급 관계형 DB' },
    { id: 'sqlite', name: 'SQLite', icon: '📁', color: '#003B57', gradient: 'linear-gradient(135deg, #003B57, #0F5298)', defaultPort: 0, description: '경량 파일 기반 DB' },
];

export default function CreateConnectionPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [selectedType, setSelectedType] = useState<DBTypeInfo | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        type: '',
        host: 'localhost',
        port: 3306,
        username: '',
        password: '',
        database: '',
    });
    const [loading, setLoading] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    // Update port when DB type changes
    useEffect(() => {
        if (selectedType) {
            setFormData(prev => ({
                ...prev,
                type: selectedType.id,
                port: selectedType.defaultPort,
            }));
        }
    }, [selectedType]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'port' ? parseInt(value) || 0 : value,
        }));
    };

    const handleTest = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch('/api/connections/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            setTestResult(data);
        } catch {
            setTestResult({ success: false, message: '네트워크 오류가 발생했습니다' });
        } finally {
            setTesting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/connections', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                router.push('/connections');
                router.refresh();
            } else {
                const data = await res.json();
                alert(data.message || '연결 저장에 실패했습니다');
            }
        } catch {
            alert('연결 저장 중 오류가 발생했습니다');
        } finally {
            setLoading(false);
        }
    };

    const isFormValid = formData.name && formData.host && formData.database && 
        (selectedType?.id === 'sqlite' || (formData.username && formData.password));

    return (
        <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <Link href="/connections" style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#94a3b8',
                    textDecoration: 'none',
                    fontSize: '14px',
                    marginBottom: '16px',
                    transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#e2e8f0'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                >
                    ← 연결 목록으로
                </Link>
                <h1 style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    background: 'linear-gradient(90deg, #e0e7ff, #c7d2fe)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: '8px',
                }}>
                    새 데이터베이스 연결
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                    데이터베이스 연결 정보를 입력하고 테스트해보세요
                </p>
            </div>

            {/* Progress Steps */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px', gap: '16px' }}>
                {[
                    { num: 1, label: 'DB 타입 선택' },
                    { num: 2, label: '연결 정보 입력' },
                ].map((s, i) => (
                    <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: 600,
                            background: step >= s.num 
                                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' 
                                : 'rgba(99, 102, 241, 0.15)',
                            color: step >= s.num ? '#fff' : '#94a3b8',
                            transition: 'all 0.3s',
                        }}>
                            {step > s.num ? '✓' : s.num}
                        </div>
                        <span style={{ 
                            fontSize: '14px', 
                            color: step >= s.num ? '#e2e8f0' : '#64748b',
                            fontWeight: step === s.num ? 600 : 400,
                        }}>
                            {s.label}
                        </span>
                        {i < 1 && (
                            <div style={{
                                width: '60px',
                                height: '2px',
                                background: step > 1 
                                    ? 'linear-gradient(90deg, #6366f1, #8b5cf6)' 
                                    : 'rgba(99, 102, 241, 0.2)',
                                marginLeft: '8px',
                                borderRadius: '1px',
                            }} />
                        )}
                    </div>
                ))}
            </div>

            {/* Step 1: Select DB Type */}
            {step === 1 && (
                <div>
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', 
                        gap: '16px',
                    }}>
                        {DB_TYPES.map((db) => (
                            <div
                                key={db.id}
                                onClick={() => {
                                    setSelectedType(db);
                                    setStep(2);
                                }}
                                style={{
                                    padding: '20px',
                                    background: 'rgba(30, 27, 75, 0.5)',
                                    borderRadius: '14px',
                                    border: selectedType?.id === db.id 
                                        ? `2px solid ${db.color}` 
                                        : '1px solid rgba(99, 102, 241, 0.2)',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(30, 27, 75, 0.7)';
                                    e.currentTarget.style.transform = 'translateY(-3px)';
                                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(30, 27, 75, 0.5)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <div style={{
                                    width: '52px',
                                    height: '52px',
                                    borderRadius: '12px',
                                    background: db.gradient,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '26px',
                                    boxShadow: `0 4px 12px ${db.color}40`,
                                    flexShrink: 0,
                                }}>
                                    {db.icon}
                                </div>
                                <div>
                                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>
                                        {db.name}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                                        {db.description}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                                        {db.defaultPort > 0 ? `포트: ${db.defaultPort}` : '파일 기반'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 2: Connection Details */}
            {step === 2 && selectedType && (
                <div style={{
                    background: 'rgba(30, 27, 75, 0.5)',
                    borderRadius: '16px',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    padding: '28px',
                }}>
                    {/* Selected DB Header */}
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '16px', 
                        marginBottom: '24px',
                        paddingBottom: '20px',
                        borderBottom: '1px solid rgba(99, 102, 241, 0.15)',
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: selectedType.gradient,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                        }}>
                            {selectedType.icon}
                        </div>
                        <div>
                            <div style={{ fontSize: '18px', fontWeight: 600, color: '#e2e8f0' }}>
                                {selectedType.name} 연결 설정
                            </div>
                            <div style={{ fontSize: '13px', color: '#64748b' }}>
                                {selectedType.description}
                            </div>
                        </div>
                        <button
                            onClick={() => setStep(1)}
                            style={{
                                marginLeft: 'auto',
                                padding: '8px 16px',
                                background: 'rgba(99, 102, 241, 0.15)',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                borderRadius: '8px',
                                color: '#a5b4fc',
                                cursor: 'pointer',
                                fontSize: '13px',
                            }}
                        >
                            타입 변경
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Connection Name */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: 500 }}>
                                연결 이름 *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="예: Production DB, Dev Server..."
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    background: 'rgba(15, 23, 42, 0.6)',
                                    border: '1px solid rgba(99, 102, 241, 0.2)',
                                    borderRadius: '10px',
                                    color: '#e2e8f0',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                }}
                            />
                        </div>

                        {/* Host & Port */}
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: 500 }}>
                                    호스트 *
                                </label>
                                <input
                                    type="text"
                                    name="host"
                                    value={formData.host}
                                    onChange={handleChange}
                                    placeholder="localhost 또는 IP 주소"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        background: 'rgba(15, 23, 42, 0.6)',
                                        border: '1px solid rgba(99, 102, 241, 0.2)',
                                        borderRadius: '10px',
                                        color: '#e2e8f0',
                                        fontSize: '14px',
                                        outline: 'none',
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: 500 }}>
                                    포트 *
                                </label>
                                <input
                                    type="number"
                                    name="port"
                                    value={formData.port}
                                    onChange={handleChange}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        background: 'rgba(15, 23, 42, 0.6)',
                                        border: '1px solid rgba(99, 102, 241, 0.2)',
                                        borderRadius: '10px',
                                        color: '#e2e8f0',
                                        fontSize: '14px',
                                        outline: 'none',
                                    }}
                                />
                            </div>
                        </div>

                        {/* Database Name */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: 500 }}>
                                데이터베이스 이름 *
                            </label>
                            <input
                                type="text"
                                name="database"
                                value={formData.database}
                                onChange={handleChange}
                                placeholder={selectedType.id === 'sqlite' ? '파일 경로 (예: ./data.db)' : '데이터베이스 이름'}
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    background: 'rgba(15, 23, 42, 0.6)',
                                    border: '1px solid rgba(99, 102, 241, 0.2)',
                                    borderRadius: '10px',
                                    color: '#e2e8f0',
                                    fontSize: '14px',
                                    outline: 'none',
                                }}
                            />
                        </div>

                        {/* Username & Password */}
                        {selectedType.id !== 'sqlite' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: 500 }}>
                                        사용자 이름 *
                                    </label>
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        placeholder="DB 사용자 이름"
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '12px 16px',
                                            background: 'rgba(15, 23, 42, 0.6)',
                                            border: '1px solid rgba(99, 102, 241, 0.2)',
                                            borderRadius: '10px',
                                            color: '#e2e8f0',
                                            fontSize: '14px',
                                            outline: 'none',
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: 500 }}>
                                        비밀번호 *
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder="••••••••"
                                            required
                                            style={{
                                                width: '100%',
                                                padding: '12px 16px',
                                                paddingRight: '48px',
                                                background: 'rgba(15, 23, 42, 0.6)',
                                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                                borderRadius: '10px',
                                                color: '#e2e8f0',
                                                fontSize: '14px',
                                                outline: 'none',
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{
                                                position: 'absolute',
                                                right: '12px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                color: '#64748b',
                                                cursor: 'pointer',
                                                fontSize: '16px',
                                            }}
                                        >
                                            {showPassword ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Test Result */}
                        {testResult && (
                            <div style={{
                                padding: '14px 18px',
                                borderRadius: '10px',
                                marginBottom: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                background: testResult.success 
                                    ? 'rgba(16, 185, 129, 0.15)' 
                                    : 'rgba(239, 68, 68, 0.15)',
                                border: `1px solid ${testResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            }}>
                                <span style={{ fontSize: '20px' }}>
                                    {testResult.success ? '✅' : '❌'}
                                </span>
                                <span style={{ 
                                    color: testResult.success ? '#10b981' : '#f87171',
                                    fontSize: '14px',
                                }}>
                                    {testResult.message}
                                </span>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '8px' }}>
                            <button
                                type="button"
                                onClick={handleTest}
                                disabled={testing || !isFormValid}
                                style={{
                                    padding: '12px 24px',
                                    background: 'rgba(251, 191, 36, 0.15)',
                                    border: '1px solid rgba(251, 191, 36, 0.3)',
                                    borderRadius: '10px',
                                    color: '#fbbf24',
                                    cursor: testing || !isFormValid ? 'not-allowed' : 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    opacity: !isFormValid ? 0.5 : 1,
                                    transition: 'all 0.2s',
                                }}
                            >
                                {testing ? (
                                    <>
                                        <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
                                        테스트 중...
                                    </>
                                ) : (
                                    <>🔌 연결 테스트</>
                                )}
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !isFormValid}
                                style={{
                                    padding: '12px 28px',
                                    background: isFormValid 
                                        ? 'linear-gradient(90deg, #6366f1, #8b5cf6)' 
                                        : 'rgba(99, 102, 241, 0.3)',
                                    border: 'none',
                                    borderRadius: '10px',
                                    color: '#fff',
                                    cursor: loading || !isFormValid ? 'not-allowed' : 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: isFormValid ? '0 4px 15px rgba(99, 102, 241, 0.3)' : 'none',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {loading ? (
                                    <>
                                        <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
                                        저장 중...
                                    </>
                                ) : (
                                    <>💾 연결 저장</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                input::placeholder {
                    color: #64748b;
                }
                input:focus {
                    border-color: rgba(99, 102, 241, 0.5) !important;
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
                }
                button:hover:not(:disabled) {
                    filter: brightness(1.1);
                }
            `}</style>
        </div>
    );
}
