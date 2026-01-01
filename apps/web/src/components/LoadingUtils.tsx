'use client';

import { CSSProperties, ReactNode } from 'react';

// 스켈레톤 로딩 컴포넌트
export function Skeleton({ 
    width = '100%', 
    height = '20px',
    borderRadius = '8px',
    className = ''
}: { 
    width?: string | number;
    height?: string | number;
    borderRadius?: string;
    className?: string;
}) {
    return (
        <div 
            className={className}
            style={{
                width,
                height,
                borderRadius,
                background: 'linear-gradient(90deg, rgba(99,102,241,0.1) 25%, rgba(99,102,241,0.2) 50%, rgba(99,102,241,0.1) 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite'
            }}
        />
    );
}

// 스켈레톤 카드
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
    return (
        <div style={{
            padding: '20px',
            background: 'rgba(30, 27, 75, 0.5)',
            borderRadius: '12px',
            border: '1px solid rgba(99,102,241,0.1)'
        }}>
            <Skeleton width="40%" height="24px" />
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Array.from({ length: lines }).map((_, i) => (
                    <Skeleton key={i} width={`${100 - i * 10}%`} height="16px" />
                ))}
            </div>
        </div>
    );
}

// 스켈레톤 테이블 행
export function SkeletonRow({ columns = 5 }: { columns?: number }) {
    return (
        <tr>
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} style={{ padding: '12px' }}>
                    <Skeleton width={i === 0 ? '60%' : '80%'} height="16px" />
                </td>
            ))}
        </tr>
    );
}

// Hover 효과 래퍼
export function HoverScale({ 
    children, 
    scale = 1.02,
    style = {}
}: { 
    children: ReactNode;
    scale?: number;
    style?: CSSProperties;
}) {
    return (
        <div 
            style={{
                transition: 'transform 0.2s ease-out',
                ...style
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = `scale(${scale})`}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
            {children}
        </div>
    );
}

// 페이드인 컴포넌트
export function FadeIn({ 
    children, 
    delay = 0,
    duration = 0.3
}: { 
    children: ReactNode;
    delay?: number;
    duration?: number;
}) {
    return (
        <div style={{
            animation: `fadeIn ${duration}s ease-out ${delay}s both`
        }}>
            {children}
        </div>
    );
}

// 전체 페이지 로딩
export function PageLoading({ message = '로딩 중...' }: { message?: string }) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            gap: '16px'
        }}>
            <div style={{
                width: '48px',
                height: '48px',
                border: '3px solid rgba(99,102,241,0.2)',
                borderTopColor: '#6366f1',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
            }} />
            <span style={{ color: '#94a3b8', fontSize: '14px' }}>{message}</span>
        </div>
    );
}

// 글로벌 스타일 (레이아웃에 추가)
export const animationStyles = `
    @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;

export default Skeleton;
