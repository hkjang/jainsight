'use client';

import { useState, useCallback, useEffect, createContext, useContext, ReactNode } from 'react';

// Dark Theme Color Constants
export const darkTheme = {
    // Backgrounds
    bgPrimary: '#0f172a',
    bgSecondary: '#1e293b',
    bgCard: 'rgba(30, 41, 59, 0.8)',
    bgCardHover: 'rgba(51, 65, 85, 0.9)',
    bgInput: 'rgba(15, 23, 42, 0.6)',
    bgOverlay: 'rgba(0, 0, 0, 0.7)',
    
    // Text
    textPrimary: '#e2e8f0',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    
    // Borders
    border: 'rgba(148, 163, 184, 0.2)',
    borderLight: 'rgba(148, 163, 184, 0.1)',
    
    // Accent Colors
    accentBlue: '#3b82f6',
    accentGreen: '#10b981',
    accentRed: '#ef4444',
    accentYellow: '#f59e0b',
    accentPurple: '#8b5cf6',
    accentCyan: '#06b6d4',
    
    // Gradients
    gradient: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
    cardGradient: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.8) 100%)',
};

// Common Dark Styles
export const darkStyles = {
    container: {
        padding: '24px',
        maxWidth: '1600px',
        margin: '0 auto',
        minHeight: '100vh',
    } as React.CSSProperties,
    
    card: {
        background: darkTheme.cardGradient,
        borderRadius: '12px',
        border: `1px solid ${darkTheme.border}`,
        backdropFilter: 'blur(10px)',
        overflow: 'hidden',
    } as React.CSSProperties,
    
    input: {
        padding: '10px 14px',
        background: darkTheme.bgInput,
        border: `1px solid ${darkTheme.border}`,
        borderRadius: '8px',
        fontSize: '14px',
        color: darkTheme.textPrimary,
        outline: 'none',
    } as React.CSSProperties,
    
    button: {
        padding: '10px 20px',
        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
    } as React.CSSProperties,
    
    buttonSecondary: {
        padding: '10px 20px',
        background: 'rgba(51, 65, 85, 0.5)',
        color: darkTheme.textPrimary,
        border: `1px solid ${darkTheme.border}`,
        borderRadius: '8px',
        fontSize: '14px',
        cursor: 'pointer',
    } as React.CSSProperties,
    
    table: {
        width: '100%',
        borderCollapse: 'collapse' as const,
    },
    
    th: {
        padding: '12px 16px',
        background: 'rgba(15, 23, 42, 0.6)',
        color: darkTheme.textSecondary,
        fontSize: '12px',
        fontWeight: '600',
        textAlign: 'left' as const,
        borderBottom: `1px solid ${darkTheme.border}`,
    } as React.CSSProperties,
    
    td: {
        padding: '14px 16px',
        borderBottom: `1px solid ${darkTheme.borderLight}`,
        color: darkTheme.textPrimary,
    } as React.CSSProperties,
    
    modalOverlay: {
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: darkTheme.bgOverlay,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
    } as React.CSSProperties,
    
    modal: {
        background: darkTheme.cardGradient,
        borderRadius: '16px',
        padding: '24px',
        width: '100%',
        maxWidth: '500px',
        border: `1px solid ${darkTheme.border}`,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    } as React.CSSProperties,
};

interface Toast {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    duration?: number;
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (type: Toast['type'], message: string, duration?: number) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((type: Toast['type'], message: string, duration = 4000) => {
        const id = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { id, type, message, duration }]);
        
        if (duration > 0) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, duration);
        }
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
    const typeStyles: Record<Toast['type'], { bg: string; border: string; icon: string }> = {
        success: { bg: '#D1FAE5', border: '#10B981', icon: '✅' },
        error: { bg: '#FEE2E2', border: '#EF4444', icon: '❌' },
        warning: { bg: '#FEF3C7', border: '#F59E0B', icon: '⚠️' },
        info: { bg: '#DBEAFE', border: '#3B82F6', icon: 'ℹ️' }
    };

    return (
        <div style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            pointerEvents: 'none'
        }}>
            {toasts.map((toast, index) => {
                const style = typeStyles[toast.type];
                return (
                    <div
                        key={toast.id}
                        style={{
                            background: style.bg,
                            border: `1px solid ${style.border}`,
                            borderRadius: '12px',
                            padding: '14px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                            minWidth: '300px',
                            maxWidth: '450px',
                            pointerEvents: 'auto',
                            animation: 'slideIn 0.3s ease-out',
                            animationDelay: `${index * 0.05}s`
                        }}
                    >
                        <span style={{ fontSize: '20px' }}>{style.icon}</span>
                        <span style={{ flex: 1, fontSize: '14px', fontWeight: '500', color: '#1F2937' }}>
                            {toast.message}
                        </span>
                        <button
                            onClick={() => onRemove(toast.id)}
                            style={{
                                background: 'none',
                                border: 'none',
                                fontSize: '16px',
                                cursor: 'pointer',
                                opacity: 0.5,
                                padding: '4px'
                            }}
                        >
                            ✕
                        </button>
                    </div>
                );
            })}
            <style>{`
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateX(100px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
            `}</style>
        </div>
    );
}

// Loading Skeleton Component
export function Skeleton({ width = '100%', height = '20px', borderRadius = '4px' }: { width?: string; height?: string; borderRadius?: string }) {
    return (
        <div style={{
            width,
            height,
            borderRadius,
            background: 'linear-gradient(90deg, #E5E7EB 0%, #F3F4F6 50%, #E5E7EB 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite'
        }}>
            <style>{`
                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>
        </div>
    );
}

// Data Export Utility
export function exportToCSV<T extends object>(data: T[], filename: string) {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0] as object);
    const csvContent = [
        headers.join(','),
        ...data.map(row => 
            headers.map(h => {
                const val = (row as Record<string, unknown>)[h];
                if (typeof val === 'string' && val.includes(',')) {
                    return `"${val}"`;
                }
                return val ?? '';
            }).join(',')
        )
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

export function exportToJSON(data: unknown, filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

// Auto Refresh Hook
export function useAutoRefresh(callback: () => void, intervalMs: number, enabled: boolean = true) {
    useEffect(() => {
        if (!enabled || intervalMs <= 0) return;
        
        const interval = setInterval(callback, intervalMs);
        return () => clearInterval(interval);
    }, [callback, intervalMs, enabled]);
}

// Confirmation Dialog Component
export function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmText = '확인',
    cancelText = '취소',
    onConfirm,
    onCancel,
    isDangerous = false
}: {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDangerous?: boolean;
}) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
        }} onClick={onCancel}>
            <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '24px',
                width: '100%',
                maxWidth: '400px',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                animation: 'scaleIn 0.2s ease-out'
            }} onClick={e => e.stopPropagation()}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', color: '#1F2937' }}>
                    {title}
                </h3>
                <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px', lineHeight: '1.5' }}>
                    {message}
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '10px 20px',
                            background: '#F3F4F6',
                            color: '#374151',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: '10px 20px',
                            background: isDangerous ? '#EF4444' : '#3B82F6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
}

// Keyboard Shortcuts Hook for Admin Pages
export function useAdminShortcuts(shortcuts: { key: string; ctrl?: boolean; shift?: boolean; action: () => void; description: string }[]) {
    const [showHelp, setShowHelp] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            
            // Show help with ?
            if (e.key === '?' && !e.ctrlKey) {
                e.preventDefault();
                setShowHelp(prev => !prev);
                return;
            }
            
            for (const shortcut of shortcuts) {
                const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !e.ctrlKey;
                const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
                
                if (e.key.toLowerCase() === shortcut.key.toLowerCase() && ctrlMatch && shiftMatch) {
                    e.preventDefault();
                    shortcut.action();
                    return;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts]);

    const ShortcutHelp = () => {
        if (!showHelp) return null;
        
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000
            }} onClick={() => setShowHelp(false)}>
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '24px',
                    width: '100%',
                    maxWidth: '400px',
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                }} onClick={e => e.stopPropagation()}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ⌨️ 키보드 단축키
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {shortcuts.map((s, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #E5E7EB' }}>
                                <span style={{ fontSize: '14px', color: '#374151' }}>{s.description}</span>
                                <kbd style={{
                                    padding: '4px 8px',
                                    background: '#F3F4F6',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontFamily: 'monospace',
                                    fontWeight: '500'
                                }}>
                                    {s.ctrl && 'Ctrl+'}
                                    {s.shift && 'Shift+'}
                                    {s.key.toUpperCase()}
                                </kbd>
                            </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                            <span style={{ fontSize: '14px', color: '#374151' }}>도움말 표시/숨기기</span>
                            <kbd style={{ padding: '4px 8px', background: '#F3F4F6', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace' }}>?</kbd>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowHelp(false)}
                        style={{
                            width: '100%',
                            marginTop: '20px',
                            padding: '10px',
                            background: '#F3F4F6',
                            color: '#374151',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            cursor: 'pointer'
                        }}
                    >
                        닫기 (ESC)
                    </button>
                </div>
            </div>
        );
    };

    return { showHelp, setShowHelp, ShortcutHelp };
}

// Stats Card Component
export function StatsCard({ 
    icon, 
    label, 
    value, 
    color = '#3B82F6',
    trend,
    onClick 
}: { 
    icon: string; 
    label: string; 
    value: string | number; 
    color?: string;
    trend?: { value: number; isUp: boolean };
    onClick?: () => void;
}) {
    return (
        <div 
            onClick={onClick}
            style={{
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                padding: '20px',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.2s',
                border: '1px solid transparent'
            }}
            onMouseEnter={e => {
                if (onClick) {
                    (e.currentTarget as HTMLDivElement).style.borderColor = color;
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                }
            }}
            onMouseLeave={e => {
                if (onClick) {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent';
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                }
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background: `${color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px'
                }}>
                    {icon}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '24px', fontWeight: 'bold', color }}>{value}</span>
                        {trend && (
                            <span style={{
                                fontSize: '12px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: trend.isUp ? '#D1FAE5' : '#FEE2E2',
                                color: trend.isUp ? '#059669' : '#DC2626'
                            }}>
                                {trend.isUp ? '↑' : '↓'} {Math.abs(trend.value)}%
                            </span>
                        )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>{label}</div>
                </div>
            </div>
        </div>
    );
}

// Empty State Component
export function EmptyState({ 
    icon, 
    title, 
    description, 
    action 
}: { 
    icon: string; 
    title: string; 
    description: string; 
    action?: { label: string; onClick: () => void };
}) {
    return (
        <div style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>{icon}</div>
            <div style={{ fontSize: '18px', fontWeight: '500', color: '#1F2937', marginBottom: '8px' }}>{title}</div>
            <div style={{ color: '#6B7280', marginBottom: action ? '20px' : '0' }}>{description}</div>
            {action && (
                <button
                    onClick={action.onClick}
                    style={{
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer'
                    }}
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}

// Badge Component
export function Badge({ 
    children, 
    color = '#3B82F6',
    variant = 'filled'
}: { 
    children: ReactNode; 
    color?: string;
    variant?: 'filled' | 'outline' | 'subtle';
}) {
    const styles: Record<typeof variant, React.CSSProperties> = {
        filled: { background: color, color: 'white' },
        outline: { background: 'transparent', border: `1px solid ${color}`, color },
        subtle: { background: `${color}15`, color }
    };

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '500',
            ...styles[variant]
        }}>
            {children}
        </span>
    );
}

// ============================================
// ENHANCED COMPONENTS FOR ADMIN UX
// ============================================

// Animated Card with hover effects
export function AnimatedCard({ 
    children, 
    onClick,
    delay = 0,
    className = ''
}: { 
    children: ReactNode; 
    onClick?: () => void;
    delay?: number;
    className?: string;
}) {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
        <div
            className={className}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                ...darkStyles.card,
                cursor: onClick ? 'pointer' : 'default',
                transform: isHovered ? 'translateY(-4px) scale(1.01)' : 'translateY(0) scale(1)',
                boxShadow: isHovered 
                    ? '0 20px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.3)' 
                    : '0 4px 12px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                animation: `fadeInUp 0.5s ease-out ${delay}s both`,
            }}
        >
            {children}
            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

// Mini Sparkline Chart
export function MiniChart({ 
    data, 
    color = darkTheme.accentBlue,
    height = 40 
}: { 
    data: number[]; 
    color?: string;
    height?: number;
}) {
    if (!data.length) return null;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    const points = data.map((v, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = height - ((v - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width="100%" height={height} style={{ overflow: 'visible' }}>
            <defs>
                <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polygon 
                points={`0,${height} ${points} 100,${height}`} 
                fill={`url(#gradient-${color.replace('#', '')})`}
            />
            <polyline 
                points={points} 
                fill="none" 
                stroke={color} 
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle 
                cx="100" 
                cy={height - ((data[data.length - 1] - min) / range) * height}
                r="4" 
                fill={color}
            >
                <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />
            </circle>
        </svg>
    );
}

// Progress Ring (Circular Progress)
export function ProgressRing({ 
    progress, 
    size = 60, 
    strokeWidth = 6,
    color = darkTheme.accentBlue,
    showLabel = true
}: { 
    progress: number; 
    size?: number;
    strokeWidth?: number;
    color?: string;
    showLabel?: boolean;
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div style={{ position: 'relative', width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={darkTheme.bgSecondary}
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
                    style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
                />
            </svg>
            {showLabel && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: size / 4,
                    fontWeight: 'bold',
                    color: darkTheme.textPrimary
                }}>
                    {Math.round(progress)}%
                </div>
            )}
        </div>
    );
}

// Enhanced Search Input with icon and clear button
export function SearchInput({ 
    value, 
    onChange, 
    placeholder = '검색...',
    onClear
}: { 
    value: string; 
    onChange: (value: string) => void;
    placeholder?: string;
    onClear?: () => void;
}) {
    return (
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <span style={{ 
                position: 'absolute', 
                left: '12px', 
                fontSize: '14px',
                color: darkTheme.textMuted 
            }}>🔍</span>
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                style={{
                    ...darkStyles.input,
                    paddingLeft: '36px',
                    paddingRight: value ? '36px' : '14px',
                    minWidth: '220px',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={e => {
                    e.target.style.borderColor = darkTheme.accentBlue;
                    e.target.style.boxShadow = `0 0 0 3px ${darkTheme.accentBlue}20`;
                }}
                onBlur={e => {
                    e.target.style.borderColor = darkTheme.border;
                    e.target.style.boxShadow = 'none';
                }}
            />
            {value && onClear && (
                <button
                    onClick={onClear}
                    style={{
                        position: 'absolute',
                        right: '8px',
                        background: darkTheme.bgSecondary,
                        border: 'none',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        color: darkTheme.textMuted
                    }}
                >✕</button>
            )}
        </div>
    );
}

// Pagination Component
export function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    totalItems,
    itemsPerPage
}: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems?: number;
    itemsPerPage?: number;
}) {
    const pageNumbers = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

    for (let i = start; i <= end; i++) pageNumbers.push(i);

    const btnStyle = (active: boolean): React.CSSProperties => ({
        padding: '8px 12px',
        background: active ? darkTheme.accentBlue : darkTheme.bgSecondary,
        color: active ? 'white' : darkTheme.textSecondary,
        border: `1px solid ${active ? darkTheme.accentBlue : darkTheme.border}`,
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: active ? '600' : '400',
        transition: 'all 0.2s',
    });

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between', padding: '16px 0' }}>
            {totalItems !== undefined && itemsPerPage && (
                <span style={{ fontSize: '13px', color: darkTheme.textMuted }}>
                    {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalItems)} / {totalItems}
                </span>
            )}
            <div style={{ display: 'flex', gap: '4px' }}>
                <button 
                    onClick={() => onPageChange(currentPage - 1)} 
                    disabled={currentPage === 1}
                    style={{ ...btnStyle(false), opacity: currentPage === 1 ? 0.5 : 1 }}
                >◀</button>
                {start > 1 && <><button onClick={() => onPageChange(1)} style={btnStyle(false)}>1</button><span style={{ color: darkTheme.textMuted }}>...</span></>}
                {pageNumbers.map(n => (
                    <button key={n} onClick={() => onPageChange(n)} style={btnStyle(n === currentPage)}>{n}</button>
                ))}
                {end < totalPages && <><span style={{ color: darkTheme.textMuted }}>...</span><button onClick={() => onPageChange(totalPages)} style={btnStyle(false)}>{totalPages}</button></>}
                <button 
                    onClick={() => onPageChange(currentPage + 1)} 
                    disabled={currentPage === totalPages}
                    style={{ ...btnStyle(false), opacity: currentPage === totalPages ? 0.5 : 1 }}
                >▶</button>
            </div>
        </div>
    );
}

// Live Status Indicator
export function StatusIndicator({ 
    status, 
    label,
    pulse = false 
}: { 
    status: 'online' | 'offline' | 'warning' | 'busy'; 
    label?: string;
    pulse?: boolean;
}) {
    const colors = {
        online: darkTheme.accentGreen,
        offline: darkTheme.textMuted,
        warning: darkTheme.accentYellow,
        busy: darkTheme.accentRed
    };
    const color = colors[status];

    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: color,
                boxShadow: pulse ? `0 0 0 0 ${color}` : 'none',
                animation: pulse && status !== 'offline' ? 'statusPulse 2s infinite' : 'none',
            }} />
            {label && <span style={{ fontSize: '13px', color: darkTheme.textSecondary }}>{label}</span>}
            <style>{`
                @keyframes statusPulse {
                    0% { box-shadow: 0 0 0 0 ${color}80; }
                    70% { box-shadow: 0 0 0 8px ${color}00; }
                    100% { box-shadow: 0 0 0 0 ${color}00; }
                }
            `}</style>
        </div>
    );
}

// Floating Action Button
export function FloatingActionButton({
    icon,
    onClick,
    tooltip,
    position = 'bottom-right',
    color = darkTheme.accentBlue
}: {
    icon: string;
    onClick: () => void;
    tooltip?: string;
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    color?: string;
}) {
    const [isHovered, setIsHovered] = useState(false);
    const positionStyles: Record<typeof position, React.CSSProperties> = {
        'bottom-right': { bottom: '24px', right: '24px' },
        'bottom-left': { bottom: '24px', left: '24px' },
        'top-right': { top: '24px', right: '24px' },
        'top-left': { top: '24px', left: '24px' },
    };

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            title={tooltip}
            style={{
                position: 'fixed',
                ...positionStyles[position],
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${color}, ${color}dd)`,
                border: 'none',
                boxShadow: isHovered 
                    ? `0 8px 25px ${color}50, 0 0 0 4px ${color}30` 
                    : `0 4px 15px ${color}40`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                transform: isHovered ? 'scale(1.1) rotate(90deg)' : 'scale(1) rotate(0deg)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: 100,
            }}
        >
            {icon}
        </button>
    );
}

// Notification Badge
export function NotificationBadge({ 
    count, 
    children 
}: { 
    count: number; 
    children: ReactNode;
}) {
    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            {children}
            {count > 0 && (
                <span style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    minWidth: '20px',
                    height: '20px',
                    padding: '0 6px',
                    background: darkTheme.accentRed,
                    color: 'white',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 2px 8px ${darkTheme.accentRed}50`,
                    animation: 'badgePop 0.3s ease-out',
                }}>
                    {count > 99 ? '99+' : count}
                    <style>{`
                        @keyframes badgePop {
                            0% { transform: scale(0); }
                            50% { transform: scale(1.2); }
                            100% { transform: scale(1); }
                        }
                    `}</style>
                </span>
            )}
        </div>
    );
}

// Tab Group Component
export function TabGroup({
    tabs,
    activeTab,
    onChange
}: {
    tabs: { id: string; label: string; icon?: string; badge?: number }[];
    activeTab: string;
    onChange: (id: string) => void;
}) {
    return (
        <div style={{ 
            display: 'flex', 
            gap: '4px', 
            background: darkTheme.bgSecondary, 
            padding: '4px', 
            borderRadius: '10px',
            width: 'fit-content'
        }}>
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    style={{
                        padding: '10px 20px',
                        background: activeTab === tab.id ? darkTheme.accentBlue : 'transparent',
                        color: activeTab === tab.id ? 'white' : darkTheme.textSecondary,
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: activeTab === tab.id ? '600' : '400',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s ease',
                    }}
                >
                    {tab.icon && <span>{tab.icon}</span>}
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                        <span style={{
                            background: activeTab === tab.id ? 'white' : darkTheme.accentRed,
                            color: activeTab === tab.id ? darkTheme.accentBlue : 'white',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            fontSize: '10px',
                            fontWeight: 'bold'
                        }}>{tab.badge}</span>
                    )}
                </button>
            ))}
        </div>
    );
}

// Tooltip Component
export function Tooltip({ 
    content, 
    children,
    position = 'top'
}: { 
    content: string; 
    children: ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
}) {
    const [show, setShow] = useState(false);
    
    const posStyles: Record<typeof position, React.CSSProperties> = {
        top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px' },
        bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px' },
        left: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '8px' },
        right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '8px' },
    };

    return (
        <div 
            style={{ position: 'relative', display: 'inline-block' }}
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
        >
            {children}
            {show && (
                <div style={{
                    position: 'absolute',
                    ...posStyles[position],
                    background: darkTheme.bgPrimary,
                    color: darkTheme.textPrimary,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    zIndex: 1000,
                    animation: 'tooltipFade 0.15s ease-out',
                }}>
                    {content}
                    <style>{`
                        @keyframes tooltipFade {
                            from { opacity: 0; transform: translateX(-50%) translateY(4px); }
                            to { opacity: 1; transform: translateX(-50%) translateY(0); }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
}

// Global CSS for enhanced animations
export const globalAdminStyles = `
    @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }
    
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
    
    @keyframes slideInRight {
        from { opacity: 0; transform: translateX(20px); }
        to { opacity: 1; transform: translateX(0); }
    }
    
    @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
    }
    
    .admin-table tbody tr:hover {
        background: rgba(59, 130, 246, 0.1) !important;
    }
    
    .admin-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }
    
    .admin-input:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    }
`;

