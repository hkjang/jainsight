'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegister, setIsRegister] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

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

    const inputStyle = {
        width: '100%',
        padding: '14px 16px',
        background: 'rgba(30, 27, 75, 0.6)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: '10px',
        color: '#e2e8f0',
        fontSize: '15px',
        outline: 'none',
        transition: 'all 0.2s',
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
            padding: '20px',
        }}>
            <div style={{
                width: '100%',
                maxWidth: '420px',
                padding: '40px',
                background: 'rgba(30, 27, 75, 0.5)',
                borderRadius: '24px',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                backdropFilter: 'blur(20px)',
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        margin: '0 auto 16px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '28px',
                    }}>
                        ⚡
                    </div>
                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: 700,
                        background: 'linear-gradient(90deg, #e0e7ff, #c7d2fe)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '8px',
                    }}>
                        Jainsight
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                        Enterprise DB Hub
                    </p>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    background: 'rgba(15, 23, 42, 0.5)',
                    borderRadius: '12px',
                    padding: '4px',
                    marginBottom: '24px',
                }}>
                    <button
                        onClick={() => { setIsRegister(false); setError(''); }}
                        style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 500,
                            background: !isRegister ? 'linear-gradient(90deg, #6366f1, #8b5cf6)' : 'transparent',
                            color: !isRegister ? '#fff' : '#94a3b8',
                            transition: 'all 0.2s',
                        }}
                    >
                        로그인
                    </button>
                    <button
                        onClick={() => { setIsRegister(true); setError(''); }}
                        style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 500,
                            background: isRegister ? 'linear-gradient(90deg, #6366f1, #8b5cf6)' : 'transparent',
                            color: isRegister ? '#fff' : '#94a3b8',
                            transition: 'all 0.2s',
                        }}
                    >
                        회원가입
                    </button>
                </div>

                {/* Error/Success Message */}
                {error && (
                    <div style={{
                        marginBottom: '20px',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        fontSize: '14px',
                        background: error.startsWith('success:') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        border: error.startsWith('success:') ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                        color: error.startsWith('success:') ? '#10b981' : '#f87171',
                    }}>
                        {error.startsWith('success:') ? error.slice(8) : error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#94a3b8' }}>
                            이메일
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@company.com"
                            required
                            style={inputStyle}
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#94a3b8' }}>
                            비밀번호
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            style={inputStyle}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: loading ? 'rgba(99, 102, 241, 0.5)' : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                            border: 'none',
                            borderRadius: '10px',
                            color: '#fff',
                            fontSize: '15px',
                            fontWeight: 600,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                        }}
                    >
                        {loading ? (
                            <>⏳ 처리 중...</>
                        ) : (
                            <>{isRegister ? '가입하기' : '로그인'}</>
                        )}
                    </button>
                </form>

                {/* Demo Account Info */}
                <div style={{
                    marginTop: '24px',
                    padding: '16px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    borderRadius: '10px',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
                        💡 데모 계정
                    </div>
                    <div style={{ fontSize: '13px', color: '#a5b4fc' }}>
                        admin@test.com / admin123
                    </div>
                </div>
            </div>
        </div>
    );
}
