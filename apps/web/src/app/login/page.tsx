'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegister, setIsRegister] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(isRegister ? { email, password, name: email.split('@')[0] } : { email, password }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || '인증에 실패했습니다');
            }

            const data = await res.json();

            if (isRegister) {
                setIsRegister(false);
                setError('success:회원가입 완료! 로그인해주세요.');
            } else {
                localStorage.setItem('token', data.access_token);
                document.cookie = `token=${data.access_token}; path=/`;
                router.push('/');
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDemoLogin = () => {
        setEmail('admin@example.com');
        setPassword('admin123');
    };

    const getInputStyle = (fieldName: string) => ({
        width: '100%',
        padding: '14px 16px',
        paddingRight: fieldName === 'password' ? '48px' : '16px',
        background: focusedField === fieldName ? 'rgba(40, 37, 90, 0.8)' : 'rgba(30, 27, 75, 0.6)',
        border: focusedField === fieldName ? '1px solid rgba(99, 102, 241, 0.6)' : '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: '12px',
        color: '#e2e8f0',
        fontSize: '15px',
        outline: 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: focusedField === fieldName ? '0 0 20px rgba(99, 102, 241, 0.15)' : 'none',
    });

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
            padding: '20px',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Animated Background Elements */}
            <div style={{
                position: 'absolute',
                top: '10%',
                left: '10%',
                width: '300px',
                height: '300px',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
                borderRadius: '50%',
                animation: 'float 6s ease-in-out infinite',
            }} />
            <div style={{
                position: 'absolute',
                bottom: '15%',
                right: '15%',
                width: '250px',
                height: '250px',
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
                borderRadius: '50%',
                animation: 'float 8s ease-in-out infinite reverse',
            }} />
            <div style={{
                position: 'absolute',
                top: '50%',
                right: '5%',
                width: '150px',
                height: '150px',
                background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
                borderRadius: '50%',
                animation: 'float 5s ease-in-out infinite',
            }} />

            <div style={{
                width: '100%',
                maxWidth: '440px',
                padding: '44px',
                background: 'rgba(30, 27, 75, 0.6)',
                borderRadius: '28px',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                backdropFilter: 'blur(24px)',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3), 0 0 100px rgba(99, 102, 241, 0.1)',
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                    <div style={{
                        width: '72px',
                        height: '72px',
                        margin: '0 auto 20px',
                        borderRadius: '20px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px',
                        boxShadow: '0 10px 30px rgba(99, 102, 241, 0.4)',
                        animation: 'pulse-glow 3s ease-in-out infinite',
                    }}>
                        ⚡
                    </div>
                    <h1 style={{
                        fontSize: '32px',
                        fontWeight: 700,
                        background: 'linear-gradient(90deg, #e0e7ff, #c7d2fe, #a5b4fc)',
                        backgroundSize: '200% 100%',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '10px',
                        animation: 'gradient-shift 4s ease-in-out infinite',
                    }}>
                        Jainsight
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '15px', letterSpacing: '0.5px' }}>
                        Enterprise DB Hub
                    </p>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: '14px',
                    padding: '5px',
                    marginBottom: '28px',
                    position: 'relative',
                }}>
                    <div style={{
                        position: 'absolute',
                        top: '5px',
                        left: isRegister ? '50%' : '5px',
                        width: 'calc(50% - 5px)',
                        height: 'calc(100% - 10px)',
                        background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                        borderRadius: '10px',
                        transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 2px 10px rgba(99, 102, 241, 0.3)',
                    }} />
                    <button
                        onClick={() => { setIsRegister(false); setError(''); }}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '10px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 600,
                            background: 'transparent',
                            color: !isRegister ? '#fff' : '#94a3b8',
                            transition: 'color 0.3s',
                            position: 'relative',
                            zIndex: 1,
                        }}
                    >
                        로그인
                    </button>
                    <button
                        onClick={() => { setIsRegister(true); setError(''); }}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '10px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 600,
                            background: 'transparent',
                            color: isRegister ? '#fff' : '#94a3b8',
                            transition: 'color 0.3s',
                            position: 'relative',
                            zIndex: 1,
                        }}
                    >
                        회원가입
                    </button>
                </div>

                {/* Error/Success Message */}
                {error && (
                    <div style={{
                        marginBottom: '24px',
                        padding: '14px 18px',
                        borderRadius: '12px',
                        fontSize: '14px',
                        background: error.startsWith('success:') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        border: error.startsWith('success:') ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                        color: error.startsWith('success:') ? '#10b981' : '#f87171',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        animation: 'shake 0.5s ease-in-out',
                    }}>
                        <span>{error.startsWith('success:') ? '✓' : '⚠'}</span>
                        {error.startsWith('success:') ? error.slice(8) : error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ 
                            display: 'block', 
                            marginBottom: '10px', 
                            fontSize: '13px', 
                            color: focusedField === 'email' ? '#a5b4fc' : '#94a3b8',
                            fontWeight: 500,
                            transition: 'color 0.3s',
                        }}>
                            이메일
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onFocus={() => setFocusedField('email')}
                                onBlur={() => setFocusedField(null)}
                                placeholder="name@company.com"
                                required
                                style={getInputStyle('email')}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '28px' }}>
                        <label style={{ 
                            display: 'block', 
                            marginBottom: '10px', 
                            fontSize: '13px', 
                            color: focusedField === 'password' ? '#a5b4fc' : '#94a3b8',
                            fontWeight: 500,
                            transition: 'color 0.3s',
                        }}>
                            비밀번호
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onFocus={() => setFocusedField('password')}
                                onBlur={() => setFocusedField(null)}
                                placeholder="••••••••"
                                required
                                style={getInputStyle('password')}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '14px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: '#64748b',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    padding: '4px',
                                    transition: 'color 0.2s',
                                }}
                                title={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: loading ? 'rgba(99, 102, 241, 0.5)' : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                            border: 'none',
                            borderRadius: '14px',
                            color: '#fff',
                            fontSize: '16px',
                            fontWeight: 600,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            boxShadow: loading ? 'none' : '0 8px 25px rgba(99, 102, 241, 0.35)',
                            transform: loading ? 'scale(0.98)' : 'scale(1)',
                        }}
                    >
                        {loading ? (
                            <>
                                <span style={{ 
                                    display: 'inline-block',
                                    animation: 'spin 1s linear infinite',
                                }}>⏳</span> 
                                처리 중...
                            </>
                        ) : (
                            <>{isRegister ? '가입하기 →' : '로그인 →'}</>
                        )}
                    </button>
                </form>

                {/* Demo Account Info */}
                <div style={{
                    marginTop: '28px',
                    padding: '18px',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
                    borderRadius: '14px',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                }}
                onClick={handleDemoLogin}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))';
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))';
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.2)';
                    e.currentTarget.style.transform = 'translateY(0)';
                }}
                >
                    <div style={{ 
                        fontSize: '12px', 
                        color: '#94a3b8', 
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <span>💡 데모 계정</span>
                        <span style={{ 
                            fontSize: '11px', 
                            padding: '2px 8px', 
                            background: 'rgba(99, 102, 241, 0.2)',
                            borderRadius: '4px',
                            color: '#a5b4fc',
                        }}>
                            클릭하여 자동 입력
                        </span>
                    </div>
                    <div style={{ fontSize: '14px', color: '#a5b4fc', fontFamily: 'monospace' }}>
                        admin@example.com / admin123
                    </div>
                </div>

                {/* Features */}
                <div style={{ 
                    marginTop: '24px', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    gap: '20px',
                    color: '#64748b',
                    fontSize: '12px',
                }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        🔒 보안 연결
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        🚀 빠른 시작
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ✨ 무료 사용
                    </span>
                </div>
            </div>

            {/* Styles */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(-20px) scale(1.05); }
                }
                
                @keyframes pulse-glow {
                    0%, 100% { 
                        box-shadow: 0 10px 30px rgba(99, 102, 241, 0.4);
                    }
                    50% { 
                        box-shadow: 0 10px 40px rgba(99, 102, 241, 0.6), 0 0 60px rgba(139, 92, 246, 0.3);
                    }
                }
                
                @keyframes gradient-shift {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
                    20%, 40%, 60%, 80% { transform: translateX(4px); }
                }
                
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                input::placeholder {
                    color: #64748b;
                }
                
                button:hover:not(:disabled) {
                    filter: brightness(1.05);
                }
            `}</style>
        </div>
    );
}
