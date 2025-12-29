'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface ShortcutHelpProps {
    isOpen: boolean;
    onClose: () => void;
}

const ShortcutHelp = ({ isOpen, onClose }: ShortcutHelpProps) => {
    if (!isOpen) return null;

    const shortcuts = [
        { keys: ['g', 'h'], desc: '홈 대시보드' },
        { keys: ['g', 'c'], desc: '연결 관리' },
        { keys: ['g', 'e'], desc: 'SQL 에디터' },
        { keys: ['g', 's'], desc: '스키마 탐색' },
        { keys: ['g', 'a'], desc: 'API Gateway' },
        { keys: ['g', 'l'], desc: '감사 로그' },
        { keys: ['n'], desc: '새 연결 생성' },
        { keys: ['?'], desc: '단축키 도움말' },
        { keys: ['Esc'], desc: '닫기' },
    ];

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                animation: 'fadeIn 0.2s ease-out',
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(135deg, #1e1b4b, #0f172a)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '20px',
                    padding: '28px',
                    width: '420px',
                    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
                    animation: 'slideUp 0.3s ease-out',
                }}
            >
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '20px' 
                }}>
                    <h2 style={{ 
                        fontSize: '20px', 
                        fontWeight: 600, 
                        color: '#e2e8f0',
                        background: 'linear-gradient(90deg, #e0e7ff, #c7d2fe)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        ⌨️ 키보드 단축키
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(99, 102, 241, 0.1)',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '8px 12px',
                            fontSize: '16px',
                        }}
                    >
                        ✕
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {shortcuts.map((shortcut, index) => (
                        <div
                            key={index}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '10px 14px',
                                background: 'rgba(99, 102, 241, 0.08)',
                                borderRadius: '8px',
                            }}
                        >
                            <span style={{ fontSize: '14px', color: '#e2e8f0' }}>
                                {shortcut.desc}
                            </span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                {shortcut.keys.map((key, i) => (
                                    <span key={i}>
                                        <kbd style={{
                                            padding: '4px 10px',
                                            background: 'rgba(15, 23, 42, 0.8)',
                                            border: '1px solid rgba(99, 102, 241, 0.3)',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontFamily: 'monospace',
                                            color: '#a5b4fc',
                                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                                        }}>
                                            {key}
                                        </kbd>
                                        {i < shortcut.keys.length - 1 && (
                                            <span style={{ margin: '0 4px', color: '#64748b' }}>+</span>
                                        )}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ 
                    marginTop: '20px', 
                    padding: '12px', 
                    background: 'rgba(16, 185, 129, 0.1)', 
                    borderRadius: '10px',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                }}>
                    <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 500 }}>
                        💡 팁: g + 문자를 연속으로 눌러 빠르게 이동하세요
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export function GlobalKeyboardShortcuts() {
    const router = useRouter();
    const pathname = usePathname();
    const [showHelp, setShowHelp] = useState(false);
    const [gPressed, setGPressed] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const showToast = useCallback((message: string) => {
        setToast(message);
        setTimeout(() => setToast(null), 2000);
    }, []);

    useEffect(() => {
        let gTimeout: NodeJS.Timeout | null = null;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Skip if in input/textarea
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            // Skip if modal is open
            if (showHelp) {
                if (e.key === 'Escape') {
                    setShowHelp(false);
                }
                return;
            }

            // Help shortcut
            if (e.key === '?' || e.key === '/') {
                e.preventDefault();
                setShowHelp(true);
                return;
            }

            // Escape to close any modal
            if (e.key === 'Escape') {
                setShowHelp(false);
                return;
            }

            // 'n' for new connection
            if (e.key === 'n' && !gPressed) {
                e.preventDefault();
                router.push('/connections/create');
                showToast('새 연결 생성으로 이동');
                return;
            }

            // 'g' prefix for navigation
            if (e.key === 'g' && !gPressed) {
                setGPressed(true);
                gTimeout = setTimeout(() => setGPressed(false), 1000);
                return;
            }

            if (gPressed) {
                let destination = '';
                let name = '';

                switch (e.key) {
                    case 'h':
                        destination = '/';
                        name = '홈';
                        break;
                    case 'c':
                        destination = '/connections';
                        name = '연결 관리';
                        break;
                    case 'e':
                        destination = '/editor';
                        name = 'SQL 에디터';
                        break;
                    case 's':
                        destination = '/schemas';
                        name = '스키마 탐색';
                        break;
                    case 'a':
                        destination = '/api-builder';
                        name = 'API Gateway';
                        break;
                    case 'l':
                        destination = '/audit';
                        name = '감사 로그';
                        break;
                }

                if (destination && destination !== pathname) {
                    e.preventDefault();
                    router.push(destination);
                    showToast(`${name}(으)로 이동`);
                }

                setGPressed(false);
                if (gTimeout) clearTimeout(gTimeout);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (gTimeout) clearTimeout(gTimeout);
        };
    }, [router, pathname, gPressed, showHelp, showToast]);

    return (
        <>
            {/* Toast Notification */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    padding: '12px 20px',
                    background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    borderRadius: '12px',
                    color: '#e2e8f0',
                    fontSize: '14px',
                    fontWeight: 500,
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    animation: 'slideIn 0.3s ease-out',
                }}>
                    <span style={{ fontSize: '18px' }}>⚡</span>
                    {toast}
                </div>
            )}

            {/* G-key indicator */}
            {gPressed && (
                <div style={{
                    position: 'fixed',
                    bottom: '24px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 600,
                    boxShadow: '0 10px 40px rgba(99, 102, 241, 0.5)',
                    zIndex: 9999,
                    animation: 'fadeIn 0.1s ease-out',
                }}>
                    g + ? 입력 대기 중...
                </div>
            )}

            <ShortcutHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />

            <style>{`
                @keyframes slideIn {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </>
    );
}
