'use client';

import { useState } from 'react';

// Enhanced Button with consistent styling
interface ButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    icon?: string;
    loading?: boolean;
    disabled?: boolean;
    tooltip?: string;
    fullWidth?: boolean;
}

export function Button({
    children,
    onClick,
    variant = 'secondary',
    size = 'md',
    icon,
    loading = false,
    disabled = false,
    tooltip,
    fullWidth = false,
}: ButtonProps) {
    const [isHovered, setIsHovered] = useState(false);

    const variantStyles = {
        primary: {
            bg: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            bgHover: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            color: '#fff',
            border: 'none',
        },
        secondary: {
            bg: 'rgba(99, 102, 241, 0.15)',
            bgHover: 'rgba(99, 102, 241, 0.25)',
            color: '#a5b4fc',
            border: '1px solid rgba(99, 102, 241, 0.3)',
        },
        success: {
            bg: 'rgba(16, 185, 129, 0.15)',
            bgHover: 'rgba(16, 185, 129, 0.25)',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.3)',
        },
        warning: {
            bg: 'rgba(245, 158, 11, 0.15)',
            bgHover: 'rgba(245, 158, 11, 0.25)',
            color: '#f59e0b',
            border: '1px solid rgba(245, 158, 11, 0.3)',
        },
        danger: {
            bg: 'rgba(239, 68, 68, 0.15)',
            bgHover: 'rgba(239, 68, 68, 0.25)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.3)',
        },
        ghost: {
            bg: 'transparent',
            bgHover: 'rgba(99, 102, 241, 0.1)',
            color: '#94a3b8',
            border: 'none',
        },
    };

    const sizeStyles = {
        sm: { padding: '6px 12px', fontSize: '12px', gap: '6px' },
        md: { padding: '10px 16px', fontSize: '14px', gap: '8px' },
        lg: { padding: '14px 24px', fontSize: '16px', gap: '10px' },
    };

    const style = variantStyles[variant];
    const sizeStyle = sizeStyles[size];

    return (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            title={tooltip}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: sizeStyle.gap,
                padding: sizeStyle.padding,
                fontSize: sizeStyle.fontSize,
                fontWeight: 500,
                background: isHovered ? style.bgHover : style.bg,
                color: style.color,
                border: style.border,
                borderRadius: '10px',
                cursor: disabled || loading ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isHovered && !disabled ? 'translateY(-1px)' : 'translateY(0)',
                boxShadow: isHovered && variant === 'primary' 
                    ? '0 8px 20px rgba(99, 102, 241, 0.3)' 
                    : 'none',
                width: fullWidth ? '100%' : 'auto',
            }}
        >
            {loading ? (
                <span style={{ 
                    display: 'inline-block',
                    animation: 'spin 1s linear infinite',
                }}>⏳</span>
            ) : icon ? (
                <span>{icon}</span>
            ) : null}
            {children}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </button>
    );
}

// Icon Button for toolbar actions
export function IconButton({
    icon,
    onClick,
    tooltip,
    active = false,
    disabled = false,
    size = 'md',
}: {
    icon: string;
    onClick?: () => void;
    tooltip?: string;
    active?: boolean;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
}) {
    const [isHovered, setIsHovered] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    const sizes = {
        sm: { size: '28px', fontSize: '14px' },
        md: { size: '36px', fontSize: '18px' },
        lg: { size: '44px', fontSize: '22px' },
    };

    const sizeStyle = sizes[size];

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
                onClick={onClick}
                disabled={disabled}
                onMouseEnter={() => { setIsHovered(true); setShowTooltip(true); }}
                onMouseLeave={() => { setIsHovered(false); setShowTooltip(false); }}
                style={{
                    width: sizeStyle.size,
                    height: sizeStyle.size,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: sizeStyle.fontSize,
                    background: active 
                        ? 'rgba(99, 102, 241, 0.2)' 
                        : isHovered 
                            ? 'rgba(99, 102, 241, 0.15)' 
                            : 'transparent',
                    border: active 
                        ? '1px solid rgba(99, 102, 241, 0.4)' 
                        : '1px solid transparent',
                    borderRadius: '8px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.5 : 1,
                    transition: 'all 0.2s ease',
                    transform: isHovered && !disabled ? 'scale(1.1)' : 'scale(1)',
                }}
            >
                {icon}
            </button>
            {tooltip && showTooltip && (
                <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: '8px',
                    padding: '6px 12px',
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '6px',
                    color: '#e2e8f0',
                    fontSize: '12px',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    zIndex: 1000,
                    animation: 'tooltipFade 0.15s ease-out',
                }}>
                    {tooltip}
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 0,
                        height: 0,
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent',
                        borderTop: '6px solid rgba(15, 23, 42, 0.95)',
                    }} />
                </div>
            )}
            <style>{`
                @keyframes tooltipFade {
                    from { opacity: 0; transform: translateX(-50%) translateY(4px); }
                    to { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
            `}</style>
        </div>
    );
}

// Empty State Component
export function EmptyState({
    icon,
    title,
    description,
    action,
}: {
    icon: string;
    title: string;
    description?: string;
    action?: { label: string; onClick: () => void };
}) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 24px',
            textAlign: 'center',
        }}>
            <div style={{
                width: '80px',
                height: '80px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '40px',
                background: 'rgba(99, 102, 241, 0.1)',
                borderRadius: '20px',
                marginBottom: '20px',
                animation: 'float 3s ease-in-out infinite',
            }}>
                {icon}
            </div>
            <h3 style={{
                fontSize: '18px',
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
                    marginBottom: action ? '20px' : 0,
                    maxWidth: '300px',
                }}>
                    {description}
                </p>
            )}
            {action && (
                <Button variant="primary" onClick={action.onClick}>
                    {action.label}
                </Button>
            )}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
            `}</style>
        </div>
    );
}

// Loading Spinner
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
    const sizes = { sm: '16px', md: '24px', lg: '40px' };
    const strokeSizes = { sm: 2, md: 3, lg: 4 };

    return (
        <svg
            width={sizes[size]}
            height={sizes[size]}
            viewBox="0 0 24 24"
            style={{ animation: 'rotate 1s linear infinite' }}
        >
            <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="rgba(99, 102, 241, 0.2)"
                strokeWidth={strokeSizes[size]}
            />
            <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="#6366f1"
                strokeWidth={strokeSizes[size]}
                strokeLinecap="round"
                strokeDasharray="31.4 31.4"
                style={{ animation: 'dash 1.5s ease-in-out infinite' }}
            />
            <style>{`
                @keyframes rotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes dash {
                    0% { stroke-dashoffset: 31.4; }
                    50% { stroke-dashoffset: 0; }
                    100% { stroke-dashoffset: -31.4; }
                }
            `}</style>
        </svg>
    );
}

// Badge Component
export function Badge({
    children,
    variant = 'default',
}: {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}) {
    const colors = {
        default: { bg: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc' },
        success: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
        warning: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
        error: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
        info: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
    };

    const style = colors[variant];

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 10px',
            fontSize: '12px',
            fontWeight: 500,
            background: style.bg,
            color: style.color,
            borderRadius: '6px',
        }}>
            {children}
        </span>
    );
}

// Card Component
export function Card({
    children,
    title,
    icon,
    action,
    noPadding = false,
}: {
    children: React.ReactNode;
    title?: string;
    icon?: string;
    action?: React.ReactNode;
    noPadding?: boolean;
}) {
    return (
        <div style={{
            background: 'rgba(30, 27, 75, 0.5)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '16px',
            overflow: 'hidden',
        }}>
            {title && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderBottom: '1px solid rgba(99, 102, 241, 0.15)',
                    background: 'rgba(15, 23, 42, 0.5)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {icon && <span style={{ fontSize: '18px' }}>{icon}</span>}
                        <h3 style={{
                            fontSize: '16px',
                            fontWeight: 600,
                            color: '#e2e8f0',
                            margin: 0,
                        }}>
                            {title}
                        </h3>
                    </div>
                    {action}
                </div>
            )}
            <div style={{ padding: noPadding ? 0 : '20px' }}>
                {children}
            </div>
        </div>
    );
}

// Tab Component
export function Tabs({
    tabs,
    activeTab,
    onTabChange,
}: {
    tabs: Array<{ id: string; label: string; icon?: string }>;
    activeTab: string;
    onTabChange: (id: string) => void;
}) {
    return (
        <div style={{
            display: 'flex',
            gap: '4px',
            padding: '4px',
            background: 'rgba(15, 23, 42, 0.5)',
            borderRadius: '12px',
        }}>
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        fontSize: '14px',
                        fontWeight: 500,
                        background: activeTab === tab.id 
                            ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.2))' 
                            : 'transparent',
                        color: activeTab === tab.id ? '#e2e8f0' : '#64748b',
                        border: activeTab === tab.id 
                            ? '1px solid rgba(99, 102, 241, 0.4)' 
                            : '1px solid transparent',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                    }}
                >
                    {tab.icon && <span>{tab.icon}</span>}
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
