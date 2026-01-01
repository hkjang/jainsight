'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface CommandItem {
    id: string;
    label: string;
    icon: string;
    action?: () => void;
    href?: string;
    category: string;
    shortcut?: string;
}

const defaultCommands: CommandItem[] = [
    // 네비게이션
    { id: 'dashboard', label: '대시보드로 이동', icon: '🏠', href: '/dashboard', category: '네비게이션', shortcut: 'G D' },
    { id: 'editor', label: '새 쿼리 작성', icon: '➕', href: '/editor', category: '네비게이션', shortcut: 'G E' },
    { id: 'connections', label: '연결 관리', icon: '🔌', href: '/connections', category: '네비게이션', shortcut: 'G C' },
    { id: 'schemas', label: '스키마 탐색', icon: '🗂️', href: '/schemas', category: '네비게이션' },
    { id: 'reports', label: '리포트', icon: '📊', href: '/admin/reports', category: '네비게이션' },
    
    // 사용자
    { id: 'profile', label: '내 프로필', icon: '👤', href: '/profile', category: '사용자', shortcut: 'G P' },
    { id: 'settings', label: '설정', icon: '⚙️', href: '/settings', category: '사용자', shortcut: 'G S' },
    { id: 'notifications', label: '알림 센터', icon: '🔔', href: '/notifications', category: '사용자', shortcut: 'G N' },
    { id: 'favorites', label: '즐겨찾기', icon: '⭐', href: '/favorites', category: '사용자', shortcut: 'G F' },
    { id: 'security', label: '보안 설정', icon: '🔒', href: '/security', category: '사용자' },
    { id: 'activity', label: '활동 내역', icon: '📋', href: '/activity', category: '사용자' },
    
    // 관리자
    { id: 'admin-users', label: '사용자 관리', icon: '👥', href: '/admin/users', category: '관리자' },
    { id: 'audit', label: '감사 로그', icon: '📜', href: '/audit', category: '관리자' },
    { id: 'ai-providers', label: 'AI 프로바이더', icon: '🤖', href: '/admin/ai/providers', category: '관리자' },
];

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    // 필터링된 명령어
    const filteredCommands = defaultCommands.filter(cmd =>
        cmd.label.toLowerCase().includes(search.toLowerCase()) ||
        cmd.category.toLowerCase().includes(search.toLowerCase())
    );

    // 카테고리별 그룹화
    const groupedCommands = filteredCommands.reduce((acc, cmd) => {
        if (!acc[cmd.category]) acc[cmd.category] = [];
        acc[cmd.category].push(cmd);
        return acc;
    }, {} as Record<string, CommandItem[]>);

    // 키보드 단축키: Ctrl+K 또는 Ctrl+P
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'p')) {
                e.preventDefault();
                setOpen(true);
            }
            if (e.key === 'Escape') {
                setOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // 열릴 때 포커스
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setSelectedIndex(0);
        }
    }, [open]);

    // 명령 실행
    const executeCommand = useCallback((cmd: CommandItem) => {
        if (cmd.href) {
            router.push(cmd.href);
        } else if (cmd.action) {
            cmd.action();
        }
        setOpen(false);
        setSearch('');
    }, [router]);

    // 키보드 네비게이션
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
            executeCommand(filteredCommands[selectedIndex]);
        }
    };

    if (!open) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh'
        }}>
            {/* Backdrop */}
            <div 
                onClick={() => { setOpen(false); setSearch(''); }}
                style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            />
            
            {/* Modal */}
            <div style={{
                position: 'relative', width: '100%', maxWidth: '520px',
                background: 'rgba(20, 17, 50, 0.98)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(99,102,241,0.3)', borderRadius: '16px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', overflow: 'hidden',
                animation: 'slideDown 0.2s ease-out'
            }}>
                {/* Search Input */}
                <div style={{ padding: '16px', borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px' }}>🔍</span>
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="명령어 검색..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setSelectedIndex(0); }}
                            onKeyDown={handleKeyDown}
                            style={{
                                width: '100%', padding: '12px 16px', paddingLeft: '40px',
                                background: 'rgba(30, 27, 75, 0.5)', border: '1px solid rgba(99,102,241,0.2)',
                                borderRadius: '10px', color: '#e2e8f0', fontSize: '15px', outline: 'none'
                            }}
                        />
                        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '6px' }}>
                            <kbd style={{ padding: '4px 8px', background: 'rgba(99,102,241,0.1)', borderRadius: '4px', fontSize: '11px', color: '#94a3b8' }}>↑↓</kbd>
                            <kbd style={{ padding: '4px 8px', background: 'rgba(99,102,241,0.1)', borderRadius: '4px', fontSize: '11px', color: '#94a3b8' }}>Enter</kbd>
                        </div>
                    </div>
                </div>

                {/* Commands List */}
                <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '8px' }}>
                    {Object.entries(groupedCommands).map(([category, commands]) => (
                        <div key={category}>
                            <div style={{ padding: '8px 12px', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {category}
                            </div>
                            {commands.map((cmd) => {
                                const globalIndex = filteredCommands.indexOf(cmd);
                                return (
                                    <button
                                        key={cmd.id}
                                        onClick={() => executeCommand(cmd)}
                                        style={{
                                            width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                                            padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                            background: globalIndex === selectedIndex ? 'rgba(99,102,241,0.2)' : 'transparent',
                                            color: '#e2e8f0', fontSize: '14px', textAlign: 'left', transition: 'background 0.1s'
                                        }}
                                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                                    >
                                        <span style={{ fontSize: '18px' }}>{cmd.icon}</span>
                                        <span style={{ flex: 1 }}>{cmd.label}</span>
                                        {cmd.shortcut && (
                                            <span style={{ display: 'flex', gap: '4px' }}>
                                                {cmd.shortcut.split(' ').map((key, i) => (
                                                    <kbd key={i} style={{ padding: '2px 6px', background: 'rgba(99,102,241,0.15)', borderRadius: '4px', fontSize: '10px', color: '#94a3b8' }}>{key}</kbd>
                                                ))}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                    {filteredCommands.length === 0 && (
                        <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                            검색 결과가 없습니다
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(99,102,241,0.1)', display: 'flex', gap: '16px', fontSize: '11px', color: '#64748b' }}>
                    <span>💡 팁: <strong>Ctrl+K</strong> 또는 <strong>Ctrl+P</strong>로 열기</span>
                </div>
            </div>

            <style>{`
                @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}

export default CommandPalette;
