'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            // 로그인 상태면 대시보드로
            router.replace('/dashboard');
        } else {
            // 비로그인이면 로그인 페이지로
            router.replace('/login');
        }
    }, [router]);

    // 리다이렉트 중 로딩 표시
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f0a1f 0%, #1a1040 50%, #0f172a 100%)'
        }}>
            <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: '32px', marginBottom: '16px', animation: 'pulse 1.5s infinite' }}>⏳</div>
                <div>리다이렉트 중...</div>
            </div>
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.9); }
                }
            `}</style>
        </div>
    );
}
