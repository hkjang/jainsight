'use client';

import { useState, useEffect } from 'react';

// Query Tooltip Component for showing full query on hover
export function QueryTooltip({ query, children }: { query: string; children: React.ReactNode }) {
    const [showTooltip, setShowTooltip] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    const handleMouseEnter = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setPosition({ 
            x: rect.left + window.scrollX, 
            y: rect.bottom + window.scrollY + 8 
        });
        setShowTooltip(true);
    };

    return (
        <div 
            style={{ position: 'relative', display: 'inline-block', width: '100%' }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => setShowTooltip(false)}
        >
            {children}
            {showTooltip && query.length > 50 && (
                <div
                    style={{
                        position: 'fixed',
                        left: Math.min(position.x, window.innerWidth - 420),
                        top: position.y,
                        zIndex: 10000,
                        maxWidth: '400px',
                        padding: '12px 16px',
                        background: 'rgba(15, 23, 42, 0.98)',
                        border: '1px solid rgba(99, 102, 241, 0.4)',
                        borderRadius: '12px',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                        backdropFilter: 'blur(12px)',
                        animation: 'tooltipFadeIn 0.15s ease-out',
                    }}
                >
                    <div style={{ 
                        fontSize: '11px', 
                        color: '#6366f1', 
                        marginBottom: '8px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                    }}>
                        Full Query
                    </div>
                    <pre style={{
                        margin: 0,
                        fontSize: '12px',
                        color: '#e2e8f0',
                        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, monospace',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        maxHeight: '200px',
                        overflow: 'auto',
                        lineHeight: 1.5,
                    }}>
                        {query}
                    </pre>
                </div>
            )}
            <style>{`
                @keyframes tooltipFadeIn {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

// Current Time Display Component
export function CurrentTime() {
    const [time, setTime] = useState<string>('');
    const [date, setDate] = useState<string>('');

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
            setDate(now.toLocaleDateString('ko-KR', { 
                month: 'short', 
                day: 'numeric', 
                weekday: 'short' 
            }));
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    if (!time) return null;

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            background: 'rgba(99, 102, 241, 0.1)',
            borderRadius: '10px',
            border: '1px solid rgba(99, 102, 241, 0.2)',
        }}>
            <span style={{ fontSize: '14px' }}>🕐</span>
            <div>
                <div style={{ 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    color: '#e2e8f0',
                    fontVariantNumeric: 'tabular-nums',
                }}>
                    {time}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {date}
                </div>
            </div>
        </div>
    );
}

// Notification Badge Component (for issue indicator)
export function NotificationBadge({ 
    count, 
    type = 'warning' 
}: { 
    count: number; 
    type?: 'warning' | 'error' | 'info';
}) {
    if (count === 0) return null;

    const colors = {
        warning: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', text: '#f59e0b' },
        error: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', text: '#ef4444' },
        info: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.4)', text: '#3b82f6' },
    };

    const style = colors[type];

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '20px',
            height: '20px',
            padding: '0 6px',
            background: style.bg,
            border: `1px solid ${style.border}`,
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: 600,
            color: style.text,
            animation: type === 'error' ? 'badgePulse 2s infinite' : 'none',
        }}>
            {count}
            {type === 'error' && (
                <style>{`
                    @keyframes badgePulse {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.05); }
                    }
                `}</style>
            )}
        </span>
    );
}

// Duration Badge Component
export function DurationBadge({ ms }: { ms: number }) {
    const getColor = (duration: number) => {
        if (duration < 100) return '#10b981'; // green - fast
        if (duration < 500) return '#f59e0b'; // yellow - medium
        return '#ef4444'; // red - slow
    };

    const formatDuration = (duration: number) => {
        if (duration < 1000) return `${duration}ms`;
        return `${(duration / 1000).toFixed(2)}s`;
    };

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            background: 'rgba(99, 102, 241, 0.1)',
            borderRadius: '4px',
            fontSize: '11px',
            fontFamily: 'ui-monospace, monospace',
            color: getColor(ms),
        }}>
            <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: getColor(ms),
            }} />
            {formatDuration(ms)}
        </span>
    );
}
