'use client';

/**
 * Skeleton Loaders and Status Indicators
 * 로딩 상태와 연결 상태를 시각적으로 표시하는 컴포넌트들
 */

// Skeleton Loader - Content placeholder during loading
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
                width: typeof width === 'number' ? `${width}px` : width,
                height: typeof height === 'number' ? `${height}px` : height,
                borderRadius,
                background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.2) 50%, rgba(99, 102, 241, 0.1) 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
            }}
        >
            <style>{`
                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>
        </div>
    );
}

// Card Skeleton for connection cards
export function CardSkeleton() {
    return (
        <div style={{
            padding: '20px',
            background: 'rgba(30, 27, 75, 0.4)',
            borderRadius: '16px',
            border: '1px solid rgba(99, 102, 241, 0.15)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <Skeleton width={48} height={48} borderRadius="12px" />
                <div style={{ flex: 1 }}>
                    <Skeleton width="60%" height={20} />
                    <div style={{ height: 8 }} />
                    <Skeleton width="40%" height={14} />
                </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
                <Skeleton width={80} height={32} borderRadius="8px" />
                <Skeleton width={80} height={32} borderRadius="8px" />
                <Skeleton width={80} height={32} borderRadius="8px" />
            </div>
        </div>
    );
}

// Connection Status Indicator with animation
export type ConnectionStatus = 'online' | 'offline' | 'testing' | 'unknown';

export function ConnectionStatusBadge({ 
    status, 
    showLabel = true 
}: { 
    status: ConnectionStatus;
    showLabel?: boolean;
}) {
    const statusConfig = {
        online: { 
            color: '#10b981', 
            bg: 'rgba(16, 185, 129, 0.15)', 
            border: 'rgba(16, 185, 129, 0.4)',
            label: '연결됨',
            pulse: true,
        },
        offline: { 
            color: '#ef4444', 
            bg: 'rgba(239, 68, 68, 0.15)', 
            border: 'rgba(239, 68, 68, 0.4)',
            label: '연결 끊김',
            pulse: false,
        },
        testing: { 
            color: '#f59e0b', 
            bg: 'rgba(245, 158, 11, 0.15)', 
            border: 'rgba(245, 158, 11, 0.4)',
            label: '테스트 중...',
            pulse: true,
        },
        unknown: { 
            color: '#64748b', 
            bg: 'rgba(100, 116, 139, 0.15)', 
            border: 'rgba(100, 116, 139, 0.3)',
            label: '미확인',
            pulse: false,
        },
    };

    const config = statusConfig[status];

    return (
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: showLabel ? '6px 12px' : '6px',
            background: config.bg,
            border: `1px solid ${config.border}`,
            borderRadius: '20px',
        }}>
            <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: config.color,
                boxShadow: config.pulse ? `0 0 8px ${config.color}` : 'none',
                animation: config.pulse ? 'statusPulse 2s infinite' : 'none',
            }} />
            {showLabel && (
                <span style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: config.color,
                }}>
                    {config.label}
                </span>
            )}
            <style>{`
                @keyframes statusPulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(0.9); }
                }
            `}</style>
        </div>
    );
}

// Animated Counter for stats
export function AnimatedCounter({ 
    value, 
    duration = 1000,
    prefix = '',
    suffix = '' 
}: { 
    value: number;
    duration?: number;
    prefix?: string;
    suffix?: string;
}) {
    const [displayValue, setDisplayValue] = React.useState(0);

    React.useEffect(() => {
        let startTime: number;
        let animationFrame: number;

        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            
            setDisplayValue(Math.floor(value * progress));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [value, duration]);

    return <span>{prefix}{displayValue}{suffix}</span>;
}

// For AnimatedCounter to work
import React from 'react';

// Progress Ring for success rate
export function ProgressRing({ 
    progress, 
    size = 40, 
    strokeWidth = 4,
    color = '#10b981' 
}: { 
    progress: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="rgba(99, 102, 241, 0.2)"
                strokeWidth={strokeWidth}
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
            />
        </svg>
    );
}

// Pulse Dot for live indicators
export function PulseDot({ color = '#10b981', size = 8 }: { color?: string; size?: number }) {
    return (
        <span style={{
            display: 'inline-block',
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 ${size}px ${color}`,
            animation: 'pulseDot 2s infinite',
        }}>
            <style>{`
                @keyframes pulseDot {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.2); }
                }
            `}</style>
        </span>
    );
}

// Table Skeleton for data tables
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
    return (
        <div style={{
            background: 'rgba(30, 27, 75, 0.4)',
            borderRadius: '12px',
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                padding: '14px 18px',
                background: 'rgba(99, 102, 241, 0.08)',
                gap: '16px',
            }}>
                {Array.from({ length: columns }).map((_, i) => (
                    <Skeleton key={i} width={`${100 / columns}%`} height={14} />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, rowIdx) => (
                <div
                    key={rowIdx}
                    style={{
                        display: 'flex',
                        padding: '14px 18px',
                        borderTop: '1px solid rgba(99, 102, 241, 0.08)',
                        gap: '16px',
                    }}
                >
                    {Array.from({ length: columns }).map((_, colIdx) => (
                        <Skeleton 
                            key={colIdx} 
                            width={`${100 / columns}%`} 
                            height={16} 
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

// Empty State with illustration
export function EmptyStateIllustration({
    icon = '📭',
    title,
    description,
    action,
}: {
    icon?: string;
    title: string;
    description?: string;
    action?: { label: string; onClick: () => void } | { label: string; href: string };
}) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 24px',
            textAlign: 'center',
        }}>
            <div style={{
                width: '100px',
                height: '100px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1))',
                borderRadius: '24px',
                marginBottom: '24px',
                animation: 'float 3s ease-in-out infinite',
            }}>
                {icon}
            </div>
            <h3 style={{
                fontSize: '20px',
                fontWeight: 600,
                color: '#e2e8f0',
                marginBottom: '8px',
            }}>
                {title}
            </h3>
            {description && (
                <p style={{
                    fontSize: '14px',
                    color: '#64748b',
                    marginBottom: action ? '24px' : 0,
                    maxWidth: '320px',
                    lineHeight: 1.6,
                }}>
                    {description}
                </p>
            )}
            {action && (
                'href' in action ? (
                    <a
                        href={action.href}
                        style={{
                            padding: '12px 24px',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            borderRadius: '12px',
                            color: '#fff',
                            textDecoration: 'none',
                            fontSize: '14px',
                            fontWeight: 600,
                            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                            transition: 'all 0.2s',
                        }}
                    >
                        {action.label}
                    </a>
                ) : (
                    <button
                        onClick={action.onClick}
                        style={{
                            padding: '12px 24px',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            border: 'none',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                            transition: 'all 0.2s',
                        }}
                    >
                        {action.label}
                    </button>
                )
            )}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
            `}</style>
        </div>
    );
}
