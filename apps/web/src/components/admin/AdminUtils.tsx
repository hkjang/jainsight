'use client';

import { useState, useCallback, useEffect, createContext, useContext, ReactNode } from 'react';

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
