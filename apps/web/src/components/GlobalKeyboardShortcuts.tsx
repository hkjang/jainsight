'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

// Types
interface Shortcut {
    keys: string[];
    desc: string;
    icon?: string;
    category?: string;
}

interface CommandItem {
    id: string;
    title: string;
    description?: string;
    icon: string;
    action: () => void;
    keywords?: string[];
    category: string;
}

interface RecentPage {
    path: string;
    name: string;
    icon: string;
    visitedAt: number;
}

// Shortcut Help Modal Component
const ShortcutHelp = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null;

    const shortcutCategories = [
        {
            title: '🧭 네비게이션',
            shortcuts: [
                { keys: ['g', 'h'], desc: '홈 대시보드' },
                { keys: ['g', 'c'], desc: '연결 관리' },
                { keys: ['g', 'e'], desc: 'SQL 에디터' },
                { keys: ['g', 's'], desc: '스키마 탐색' },
                { keys: ['g', 'a'], desc: 'API Gateway' },
                { keys: ['g', 'l'], desc: '감사 로그' },
                { keys: ['g', 'd'], desc: '관리자 대시보드' },
                { keys: ['g', 'm'], desc: 'AI 모델 관리' },
                { keys: ['g', 'r'], desc: 'RAG 추적' },
            ],
        },
        {
            title: '⚡ 빠른 액션',
            shortcuts: [
                { keys: ['Ctrl', 'K'], desc: '명령 팔레트 열기' },
                { keys: ['n'], desc: '새 연결 생성' },
                { keys: ['/'], desc: '전역 검색' },
                { keys: ['r'], desc: '최근 방문 페이지' },
                { keys: ['b'], desc: '뒤로 가기' },
                { keys: ['f'], desc: '앞으로 가기' },
            ],
        },
        {
            title: '🎛️ 시스템',
            shortcuts: [
                { keys: ['?'], desc: '단축키 도움말' },
                { keys: ['Esc'], desc: '닫기 / 취소' },
                { keys: ['Ctrl', '/'], desc: '테마 전환' },
            ],
        },
    ];

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(8px)',
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
                    background: 'linear-gradient(145deg, #1e1b4b 0%, #0f172a 50%, #1e1b4b 100%)',
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    borderRadius: '24px',
                    padding: '32px',
                    width: '600px',
                    maxHeight: '85vh',
                    overflowY: 'auto',
                    boxShadow: '0 25px 80px rgba(0, 0, 0, 0.6), 0 0 60px rgba(99, 102, 241, 0.15)',
                    animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
            >
                {/* Header */}
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '28px',
                    paddingBottom: '20px',
                    borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
                }}>
                    <div>
                        <h2 style={{ 
                            fontSize: '24px', 
                            fontWeight: 700, 
                            margin: 0,
                            background: 'linear-gradient(90deg, #e0e7ff, #a5b4fc, #818cf8)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                        }}>
                            <span style={{ fontSize: '28px' }}>⌨️</span>
                            키보드 단축키
                        </h2>
                        <p style={{ 
                            color: '#64748b', 
                            fontSize: '14px', 
                            marginTop: '6px' 
                        }}>
                            빠른 네비게이션을 위한 단축키
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(99, 102, 241, 0.15)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            borderRadius: '10px',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '10px 14px',
                            fontSize: '16px',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                            e.currentTarget.style.color = '#f87171';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)';
                            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                            e.currentTarget.style.color = '#94a3b8';
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Categories */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {shortcutCategories.map((category, catIndex) => (
                        <div key={catIndex}>
                            <h3 style={{ 
                                fontSize: '14px', 
                                fontWeight: 600, 
                                color: '#a5b4fc', 
                                marginBottom: '12px',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                            }}>
                                {category.title}
                            </h3>
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(2, 1fr)', 
                                gap: '8px' 
                            }}>
                                {category.shortcuts.map((shortcut, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '12px 16px',
                                            background: 'rgba(99, 102, 241, 0.08)',
                                            borderRadius: '10px',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)';
                                            e.currentTarget.style.transform = 'translateX(4px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)';
                                            e.currentTarget.style.transform = 'translateX(0)';
                                        }}
                                    >
                                        <span style={{ fontSize: '13px', color: '#e2e8f0' }}>
                                            {shortcut.desc}
                                        </span>
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            {shortcut.keys.map((key, i) => (
                                                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <kbd style={{
                                                        padding: '4px 8px',
                                                        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.9), rgba(30, 27, 75, 0.9))',
                                                        border: '1px solid rgba(99, 102, 241, 0.4)',
                                                        borderRadius: '6px',
                                                        fontSize: '11px',
                                                        fontFamily: 'ui-monospace, monospace',
                                                        color: '#c7d2fe',
                                                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                                                        minWidth: '24px',
                                                        textAlign: 'center' as const,
                                                    }}>
                                                        {key}
                                                    </kbd>
                                                    {i < shortcut.keys.length - 1 && (
                                                        <span style={{ color: '#4f46e5', fontWeight: 600, fontSize: '12px' }}>+</span>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Tips */}
                <div style={{ 
                    marginTop: '28px', 
                    padding: '16px', 
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(6, 182, 212, 0.1))', 
                    borderRadius: '14px',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                }}>
                    <div style={{ 
                        fontSize: '13px', 
                        color: '#10b981', 
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}>
                        <span style={{ fontSize: '16px' }}>💡</span>
                        <span>
                            <strong>Pro Tip:</strong> Ctrl+K를 눌러 명령 팔레트를 열면 모든 기능을 검색할 수 있습니다!
                        </span>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.95) translateY(-10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
};

// Command Palette Component
const CommandPalette = ({ 
    isOpen, 
    onClose, 
    commands,
    recentPages,
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    commands: CommandItem[];
    recentPages: RecentPage[];
}) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const filteredCommands = useMemo(() => {
        if (!query.trim()) {
            // Show recent pages first when no query
            const recentCommands: CommandItem[] = recentPages.slice(0, 3).map(page => ({
                id: `recent-${page.path}`,
                title: page.name,
                description: '최근 방문',
                icon: page.icon,
                action: () => {},
                keywords: [],
                category: '최근',
            }));
            return [...recentCommands, ...commands.slice(0, 8)];
        }

        const lowerQuery = query.toLowerCase();
        return commands
            .filter(cmd => 
                cmd.title.toLowerCase().includes(lowerQuery) ||
                cmd.description?.toLowerCase().includes(lowerQuery) ||
                cmd.keywords?.some(k => k.toLowerCase().includes(lowerQuery))
            )
            .slice(0, 10);
    }, [query, commands, recentPages]);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    useEffect(() => {
        if (listRef.current && filteredCommands.length > 0) {
            const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
            selectedElement?.scrollIntoView({ block: 'nearest' });
        }
    }, [selectedIndex, filteredCommands.length]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => 
                    prev < filteredCommands.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => 
                    prev > 0 ? prev - 1 : filteredCommands.length - 1
                );
                break;
            case 'Enter':
                e.preventDefault();
                if (filteredCommands[selectedIndex]) {
                    filteredCommands[selectedIndex].action();
                    onClose();
                }
                break;
            case 'Escape':
                e.preventDefault();
                onClose();
                break;
        }
    };

    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                paddingTop: '15vh',
                zIndex: 10000,
                animation: 'fadeIn 0.15s ease-out',
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(180deg, #1e1b4b 0%, #0f172a 100%)',
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    borderRadius: '20px',
                    width: '560px',
                    maxHeight: '480px',
                    overflow: 'hidden',
                    boxShadow: '0 30px 100px rgba(0, 0, 0, 0.7), 0 0 80px rgba(99, 102, 241, 0.2)',
                    animation: 'slideDown 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
                onKeyDown={handleKeyDown}
            >
                {/* Search Input */}
                <div style={{ 
                    padding: '20px 24px', 
                    borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                }}>
                    <span style={{ 
                        fontSize: '20px', 
                        opacity: 0.7,
                        filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.5))',
                    }}>🔍</span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="명령어, 페이지, 액션 검색..."
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            fontSize: '16px',
                            color: '#e2e8f0',
                        }}
                    />
                    <kbd style={{
                        padding: '4px 10px',
                        background: 'rgba(99, 102, 241, 0.15)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        color: '#a5b4fc',
                    }}>
                        ESC
                    </kbd>
                </div>

                {/* Commands List */}
                <div 
                    ref={listRef}
                    style={{ 
                        maxHeight: '360px', 
                        overflowY: 'auto',
                        padding: '8px',
                    }}
                >
                    {filteredCommands.length === 0 ? (
                        <div style={{ 
                            padding: '40px 20px', 
                            textAlign: 'center',
                            color: '#64748b',
                        }}>
                            <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}>🔎</span>
                            검색 결과가 없습니다
                        </div>
                    ) : (
                        filteredCommands.map((cmd, index) => (
                            <div
                                key={cmd.id}
                                onClick={() => {
                                    cmd.action();
                                    onClose();
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '14px',
                                    padding: '14px 16px',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    background: selectedIndex === index 
                                        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(139, 92, 246, 0.2))'
                                        : 'transparent',
                                    border: selectedIndex === index
                                        ? '1px solid rgba(99, 102, 241, 0.4)'
                                        : '1px solid transparent',
                                    transition: 'all 0.15s',
                                }}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <span style={{ 
                                    fontSize: '20px',
                                    width: '36px',
                                    height: '36px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'rgba(99, 102, 241, 0.15)',
                                    borderRadius: '10px',
                                }}>{cmd.icon}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ 
                                        fontSize: '14px', 
                                        fontWeight: 500, 
                                        color: '#e2e8f0',
                                    }}>{cmd.title}</div>
                                    {cmd.description && (
                                        <div style={{ 
                                            fontSize: '12px', 
                                            color: '#64748b',
                                            marginTop: '2px',
                                        }}>{cmd.description}</div>
                                    )}
                                </div>
                                <span style={{ 
                                    fontSize: '11px', 
                                    color: '#6366f1',
                                    background: 'rgba(99, 102, 241, 0.1)',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                }}>{cmd.category}</span>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div style={{ 
                    padding: '12px 20px', 
                    borderTop: '1px solid rgba(99, 102, 241, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    fontSize: '12px',
                    color: '#64748b',
                }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <kbd style={{
                            padding: '3px 6px',
                            background: 'rgba(99, 102, 241, 0.1)',
                            borderRadius: '4px',
                            fontSize: '10px',
                            color: '#a5b4fc',
                        }}>↑↓</kbd>
                        이동
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <kbd style={{
                            padding: '3px 6px',
                            background: 'rgba(99, 102, 241, 0.1)',
                            borderRadius: '4px',
                            fontSize: '10px',
                            color: '#a5b4fc',
                        }}>Enter</kbd>
                        실행
                    </span>
                    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px' }}>⚡</span>
                        빠른 액션
                    </span>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-20px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
};

// Recent Pages Popup
const RecentPagesPopup = ({ 
    isOpen, 
    onClose, 
    recentPages,
    onNavigate,
}: { 
    isOpen: boolean; 
    onClose: () => void;
    recentPages: RecentPage[];
    onNavigate: (path: string) => void;
}) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        if (isOpen) {
            setSelectedIndex(0);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex(prev => 
                        prev < recentPages.length - 1 ? prev + 1 : 0
                    );
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex(prev => 
                        prev > 0 ? prev - 1 : recentPages.length - 1
                    );
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (recentPages[selectedIndex]) {
                        onNavigate(recentPages[selectedIndex].path);
                        onClose();
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    onClose();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, recentPages, selectedIndex, onNavigate, onClose]);

    if (!isOpen || recentPages.length === 0) return null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                animation: 'fadeIn 0.15s ease-out',
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(180deg, #1e1b4b 0%, #0f172a 100%)',
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    borderRadius: '16px',
                    padding: '16px',
                    width: '340px',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                    animation: 'scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
            >
                <div style={{ 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    color: '#a5b4fc',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }}>
                    <span>🕐</span>
                    최근 방문 페이지
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {recentPages.map((page, index) => (
                        <div
                            key={page.path}
                            onClick={() => {
                                onNavigate(page.path);
                                onClose();
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 14px',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                background: selectedIndex === index 
                                    ? 'rgba(99, 102, 241, 0.2)'
                                    : 'rgba(99, 102, 241, 0.08)',
                                border: selectedIndex === index
                                    ? '1px solid rgba(99, 102, 241, 0.4)'
                                    : '1px solid transparent',
                                transition: 'all 0.15s',
                            }}
                            onMouseEnter={() => setSelectedIndex(index)}
                        >
                            <span style={{ fontSize: '18px' }}>{page.icon}</span>
                            <span style={{ 
                                flex: 1, 
                                fontSize: '13px', 
                                color: '#e2e8f0',
                                fontWeight: 500,
                            }}>{page.name}</span>
                            <kbd style={{
                                padding: '2px 8px',
                                background: 'rgba(99, 102, 241, 0.1)',
                                borderRadius: '4px',
                                fontSize: '11px',
                                color: '#a5b4fc',
                            }}>{index + 1}</kbd>
                        </div>
                    ))}
                </div>
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

// Main Component
export function GlobalKeyboardShortcuts() {
    const router = useRouter();
    const pathname = usePathname();
    const [showHelp, setShowHelp] = useState(false);
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [showRecentPages, setShowRecentPages] = useState(false);
    const [gPressed, setGPressed] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);
    const [recentPages, setRecentPages] = useState<RecentPage[]>([]);

    // Load recent pages from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem('recentPages');
            if (stored) {
                setRecentPages(JSON.parse(stored));
            }
        } catch {
            // Ignore
        }
    }, []);

    // Track page visits
    useEffect(() => {
        if (!pathname) return;

        const pageInfo = getPageInfo(pathname);
        if (!pageInfo) return;

        setRecentPages(prev => {
            const filtered = prev.filter(p => p.path !== pathname);
            const newPages = [
                { path: pathname, name: pageInfo.name, icon: pageInfo.icon, visitedAt: Date.now() },
                ...filtered,
            ].slice(0, 8);

            try {
                localStorage.setItem('recentPages', JSON.stringify(newPages));
            } catch {
                // Ignore
            }
            return newPages;
        });
    }, [pathname]);

    const showToast = useCallback((message: string, type: 'success' | 'info' | 'warning' = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 2500);
    }, []);

    const navigateTo = useCallback((path: string, name: string) => {
        if (path !== pathname) {
            router.push(path);
            showToast(`${name}(으)로 이동`, 'success');
        }
    }, [router, pathname, showToast]);

    // Get page info helper
    const getPageInfo = (path: string): { name: string; icon: string } | null => {
        const pageMap: Record<string, { name: string; icon: string }> = {
            '/': { name: '홈', icon: '🏠' },
            '/connections': { name: '연결 관리', icon: '🔌' },
            '/connections/create': { name: '새 연결', icon: '➕' },
            '/editor': { name: 'SQL 에디터', icon: '📝' },
            '/schemas': { name: '스키마 탐색', icon: '📊' },
            '/api-builder': { name: 'API Gateway', icon: '🔗' },
            '/audit': { name: '감사 로그', icon: '📋' },
            '/admin': { name: '관리자', icon: '⚙️' },
            '/admin/models': { name: 'AI 모델', icon: '🤖' },
            '/admin/rag': { name: 'RAG 추적', icon: '🧠' },
            '/admin/agents': { name: '에이전트', icon: '🤝' },
            '/admin/settings': { name: '설정', icon: '⚙️' },
        };
        return pageMap[path] || null;
    };

    // Command definitions
    const commands: CommandItem[] = useMemo(() => [
        // Navigation
        { id: 'nav-home', title: '홈 대시보드', icon: '🏠', action: () => navigateTo('/', '홈'), category: '네비게이션', keywords: ['home', 'dashboard'] },
        { id: 'nav-connections', title: '연결 관리', icon: '🔌', action: () => navigateTo('/connections', '연결 관리'), category: '네비게이션', keywords: ['connection', 'database'] },
        { id: 'nav-editor', title: 'SQL 에디터', icon: '📝', action: () => navigateTo('/editor', 'SQL 에디터'), category: '네비게이션', keywords: ['sql', 'query', 'editor'] },
        { id: 'nav-schemas', title: '스키마 탐색', icon: '📊', action: () => navigateTo('/schemas', '스키마'), category: '네비게이션', keywords: ['schema', 'table', 'column'] },
        { id: 'nav-api', title: 'API Gateway', icon: '🔗', action: () => navigateTo('/api-builder', 'API Gateway'), category: '네비게이션', keywords: ['api', 'gateway', 'endpoint'] },
        { id: 'nav-audit', title: '감사 로그', icon: '📋', action: () => navigateTo('/audit', '감사 로그'), category: '네비게이션', keywords: ['audit', 'log', 'history'] },
        
        // Admin
        { id: 'admin-dashboard', title: '관리자 대시보드', icon: '⚙️', action: () => navigateTo('/admin', '관리자'), category: '관리', keywords: ['admin', 'dashboard'] },
        { id: 'admin-models', title: 'AI 모델 관리', icon: '🤖', action: () => navigateTo('/admin/models', 'AI 모델'), category: '관리', keywords: ['ai', 'model', 'llm'] },
        { id: 'admin-rag', title: 'RAG 추적', icon: '🧠', action: () => navigateTo('/admin/rag', 'RAG'), category: '관리', keywords: ['rag', 'retrieval', 'augmented'] },
        { id: 'admin-agents', title: '에이전트 관리', icon: '🤝', action: () => navigateTo('/admin/agents', '에이전트'), category: '관리', keywords: ['agent', 'autonomous'] },
        { id: 'admin-crawlers', title: '크롤러 관리', icon: '🕷️', action: () => navigateTo('/admin/collection/crawlers', '크롤러'), category: '관리', keywords: ['crawler', 'crawling', 'rss'] },
        { id: 'admin-extraction', title: 'AI 추출', icon: '🔬', action: () => navigateTo('/admin/ai/extraction', 'AI 추출'), category: '관리', keywords: ['extraction', 'ai'] },
        
        // Actions
        { id: 'action-new-connection', title: '새 연결 생성', icon: '➕', action: () => navigateTo('/connections/create', '새 연결'), category: '액션', keywords: ['new', 'create', 'connection'] },
        { id: 'action-help', title: '단축키 도움말', icon: '⌨️', action: () => setShowHelp(true), category: '도움말', keywords: ['help', 'shortcut', 'keyboard'] },
        { id: 'action-back', title: '뒤로 가기', icon: '⬅️', action: () => router.back(), category: '네비게이션', keywords: ['back', 'previous'] },
        { id: 'action-forward', title: '앞으로 가기', icon: '➡️', action: () => router.forward(), category: '네비게이션', keywords: ['forward', 'next'] },
    ], [navigateTo, router]);

    // Keyboard event handler
    useEffect(() => {
        let gTimeout: NodeJS.Timeout | null = null;

        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isInputFocused = target.tagName === 'INPUT' || 
                                   target.tagName === 'TEXTAREA' || 
                                   target.isContentEditable ||
                                   target.closest('.monaco-editor') !== null; // Monaco Editor detection

            // Command Palette - works everywhere
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setShowCommandPalette(true);
                return;
            }

            // Skip other shortcuts if in input or Monaco editor
            if (isInputFocused) return;

            // Help modal open
            if (showHelp || showCommandPalette || showRecentPages) {
                if (e.key === 'Escape') {
                    setShowHelp(false);
                    setShowCommandPalette(false);
                    setShowRecentPages(false);
                }
                return;
            }

            // Help shortcut
            if (e.key === '?' && !e.shiftKey) {
                e.preventDefault();
                setShowHelp(true);
                return;
            }

            // Theme toggle
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                showToast('테마 토글 (준비 중)', 'info');
                return;
            }

            // Search
            if (e.key === '/') {
                e.preventDefault();
                setShowCommandPalette(true);
                return;
            }

            // Recent pages
            if (e.key === 'r' && !gPressed) {
                e.preventDefault();
                setShowRecentPages(true);
                return;
            }

            // Back/Forward
            if (e.key === 'b' && !gPressed) {
                e.preventDefault();
                router.back();
                return;
            }
            if (e.key === 'f' && !gPressed) {
                e.preventDefault();
                router.forward();
                return;
            }

            // New connection
            if (e.key === 'n' && !gPressed) {
                e.preventDefault();
                navigateTo('/connections/create', '새 연결 생성');
                return;
            }

            // Escape
            if (e.key === 'Escape') {
                setShowHelp(false);
                setShowCommandPalette(false);
                setShowRecentPages(false);
                setGPressed(false);
                return;
            }

            // 'g' prefix navigation
            if (e.key === 'g' && !gPressed) {
                setGPressed(true);
                gTimeout = setTimeout(() => setGPressed(false), 1500);
                return;
            }

            if (gPressed) {
                const gNavigations: Record<string, { path: string; name: string }> = {
                    'h': { path: '/', name: '홈' },
                    'c': { path: '/connections', name: '연결 관리' },
                    'e': { path: '/editor', name: 'SQL 에디터' },
                    's': { path: '/schemas', name: '스키마 탐색' },
                    'a': { path: '/api-builder', name: 'API Gateway' },
                    'l': { path: '/audit', name: '감사 로그' },
                    'd': { path: '/admin', name: '관리자 대시보드' },
                    'm': { path: '/admin/models', name: 'AI 모델' },
                    'r': { path: '/admin/rag', name: 'RAG 추적' },
                };

                const nav = gNavigations[e.key];
                if (nav) {
                    e.preventDefault();
                    navigateTo(nav.path, nav.name);
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
    }, [router, pathname, gPressed, showHelp, showCommandPalette, showRecentPages, navigateTo, showToast]);

    const toastColors = {
        success: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)', icon: '✅' },
        info: { bg: 'rgba(99, 102, 241, 0.15)', border: 'rgba(99, 102, 241, 0.4)', icon: '⚡' },
        warning: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', icon: '⚠️' },
    };

    return (
        <>
            {/* Toast Notification */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    bottom: '28px',
                    right: '28px',
                    padding: '14px 22px',
                    background: `linear-gradient(135deg, ${toastColors[toast.type].bg}, ${toastColors[toast.type].bg})`,
                    border: `1px solid ${toastColors[toast.type].border}`,
                    borderRadius: '14px',
                    color: '#e2e8f0',
                    fontSize: '14px',
                    fontWeight: 500,
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    animation: 'slideInRight 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}>
                    <span style={{ fontSize: '18px' }}>{toastColors[toast.type].icon}</span>
                    {toast.message}
                </div>
            )}

            {/* G-key indicator */}
            {gPressed && (
                <div style={{
                    position: 'fixed',
                    bottom: '28px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '14px 28px',
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    borderRadius: '16px',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 600,
                    boxShadow: '0 12px 50px rgba(99, 102, 241, 0.5), 0 0 40px rgba(124, 58, 237, 0.3)',
                    zIndex: 9999,
                    animation: 'pulse 1s ease-in-out infinite',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                }}>
                    <span style={{ 
                        background: 'rgba(255,255,255,0.2)', 
                        padding: '4px 10px', 
                        borderRadius: '6px',
                        fontFamily: 'monospace',
                    }}>g</span>
                    + 다음 키를 누르세요...
                    <span style={{ 
                        fontSize: '12px', 
                        opacity: 0.7,
                        marginLeft: '8px',
                    }}>h c e s a l d m r</span>
                </div>
            )}

            <ShortcutHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
            
            <CommandPalette 
                isOpen={showCommandPalette} 
                onClose={() => setShowCommandPalette(false)} 
                commands={commands}
                recentPages={recentPages}
            />

            <RecentPagesPopup
                isOpen={showRecentPages}
                onClose={() => setShowRecentPages(false)}
                recentPages={recentPages.filter(p => p.path !== pathname)}
                onNavigate={(path) => {
                    const info = getPageInfo(path);
                    if (info) navigateTo(path, info.name);
                }}
            />

            <style>{`
                @keyframes slideInRight {
                    from { opacity: 0; transform: translateX(30px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
                    50% { opacity: 0.9; transform: translateX(-50%) scale(1.02); }
                }
            `}</style>
        </>
    );
}
