'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Types
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextValue {
    showToast: (message: string, type?: ToastType, duration?: number) => void;
    hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Toast Item Component
const ToastItem = ({ 
    toast, 
    onClose 
}: { 
    toast: Toast; 
    onClose: (id: string) => void;
}) => {
    const icons: Record<ToastType, string> = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ',
    };

    const colors: Record<ToastType, { bg: string; border: string; text: string }> = {
        success: {
            bg: 'rgba(16, 185, 129, 0.15)',
            border: 'rgba(16, 185, 129, 0.4)',
            text: '#10b981',
        },
        error: {
            bg: 'rgba(239, 68, 68, 0.15)',
            border: 'rgba(239, 68, 68, 0.4)',
            text: '#ef4444',
        },
        warning: {
            bg: 'rgba(245, 158, 11, 0.15)',
            border: 'rgba(245, 158, 11, 0.4)',
            text: '#f59e0b',
        },
        info: {
            bg: 'rgba(99, 102, 241, 0.15)',
            border: 'rgba(99, 102, 241, 0.4)',
            text: '#6366f1',
        },
    };

    const style = colors[toast.type];

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 18px',
                background: style.bg,
                border: `1px solid ${style.border}`,
                borderRadius: '12px',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                animation: 'toastSlideIn 0.3s ease-out',
                maxWidth: '400px',
            }}
        >
            <span style={{ 
                fontSize: '18px', 
                color: style.text,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: style.bg,
                fontWeight: 700,
            }}>
                {icons[toast.type]}
            </span>
            <span style={{ 
                flex: 1, 
                fontSize: '14px', 
                color: '#e2e8f0',
                fontWeight: 500,
            }}>
                {toast.message}
            </span>
            <button
                onClick={() => onClose(toast.id)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#94a3b8';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#64748b';
                    e.currentTarget.style.background = 'transparent';
                }}
                aria-label="닫기"
            >
                ✕
            </button>
        </div>
    );
};

// Toast Provider Component
export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((
        message: string, 
        type: ToastType = 'info', 
        duration: number = 3000
    ) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newToast: Toast = { id, message, type, duration };
        
        setToasts(prev => [...prev, newToast]);

        if (duration > 0) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, duration);
        }
    }, []);

    const hideToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast, hideToast }}>
            {children}
            
            {/* Toast Container */}
            {toasts.length > 0 && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        right: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        zIndex: 10000,
                        pointerEvents: 'auto',
                    }}
                    role="region"
                    aria-label="알림"
                    aria-live="polite"
                >
                    {toasts.map(toast => (
                        <ToastItem 
                            key={toast.id} 
                            toast={toast} 
                            onClose={hideToast} 
                        />
                    ))}
                </div>
            )}

            <style>{`
                @keyframes toastSlideIn {
                    from {
                        opacity: 0;
                        transform: translateX(100%) scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0) scale(1);
                    }
                }
            `}</style>
        </ToastContext.Provider>
    );
}

// Custom Hook
export function useToast() {
    const context = useContext(ToastContext);
    
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    
    return context;
}
