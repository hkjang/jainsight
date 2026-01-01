'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (message: string, type: Toast['type'], duration?: number) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        // 폴백: context 없으면 콘솔에 출력
        return {
            toasts: [],
            addToast: (message: string, type: Toast['type']) => console.log(`[${type}] ${message}`),
            removeToast: () => {}
        };
    }
    return context;
}

const toastStyles: Record<Toast['type'], { bg: string; icon: string }> = {
    success: { bg: 'linear-gradient(135deg, #10b981, #059669)', icon: '✅' },
    error: { bg: 'linear-gradient(135deg, #ef4444, #dc2626)', icon: '❌' },
    info: { bg: 'linear-gradient(135deg, #3b82f6, #2563eb)', icon: 'ℹ️' },
    warning: { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', icon: '⚠️' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: Toast['type'], duration = 4000) => {
        const id = Math.random().toString(36).slice(2);
        setToasts(prev => [...prev, { id, message, type, duration }]);
        
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
            
            {/* Toast Container */}
            <div style={{
                position: 'fixed', bottom: '24px', right: '24px', zIndex: 9998,
                display: 'flex', flexDirection: 'column', gap: '12px', pointerEvents: 'none'
            }}>
                {toasts.map((toast, index) => (
                    <div
                        key={toast.id}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '14px 20px', minWidth: '280px', maxWidth: '400px',
                            background: toastStyles[toast.type].bg, borderRadius: '12px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.3)', color: 'white',
                            animation: `slideIn 0.3s ease-out ${index * 0.05}s both`, pointerEvents: 'auto'
                        }}
                    >
                        <span style={{ fontSize: '18px' }}>{toastStyles[toast.type].icon}</span>
                        <span style={{ flex: 1, fontSize: '14px', fontWeight: '500' }}>{toast.message}</span>
                        <button
                            onClick={() => removeToast(toast.id)}
                            style={{
                                background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%',
                                width: '24px', height: '24px', cursor: 'pointer', color: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px'
                            }}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>

            <style>{`
                @keyframes slideIn { 
                    from { opacity: 0; transform: translateX(100px); } 
                    to { opacity: 1; transform: translateX(0); } 
                }
            `}</style>
        </ToastContext.Provider>
    );
}

export default ToastProvider;
