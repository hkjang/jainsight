'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface MenuItem {
    name: string;
    path: string;
    icon: string;
    adminOnly?: boolean;
}

interface MenuGroup {
    title: string;
    items: MenuItem[];
    adminOnly?: boolean;
}

const menuGroups: MenuGroup[] = [
    {
        title: '작업 공간',
        items: [
            { name: '대시보드', path: '/', icon: '📊' },
            { name: 'SQL 에디터', path: '/editor', icon: '⚡' },
            { name: '스키마 탐색', path: '/schemas', icon: '🗂️' },
        ]
    },
    {
        title: '데이터 관리',
        items: [
            { name: 'DB 연결', path: '/connections', icon: '🔗' },
            { name: 'API Gateway', path: '/api-builder', icon: '🌐' },
        ]
    },
    {
        title: 'AI 관리',
        adminOnly: true,
        items: [
            { name: 'AI Providers', path: '/admin/ai-providers', icon: '🔌', adminOnly: true },
            { name: 'AI Models', path: '/admin/ai-models', icon: '🤖', adminOnly: true },
            { name: 'Prompts', path: '/admin/prompts', icon: '📝', adminOnly: true },
        ]
    },
    {
        title: '정책 및 보안',
        adminOnly: true,
        items: [
            { name: 'NL2SQL 정책', path: '/admin/nl2sql-policies', icon: '📋', adminOnly: true },
            { name: '보안 설정', path: '/admin/security', icon: '🛡️', adminOnly: true },
        ]
    },
    {
        title: '모니터링',
        adminOnly: true,
        items: [
            { name: 'AI 대시보드', path: '/admin/ai-dashboard', icon: '📈', adminOnly: true },
            { name: 'AI 감사 로그', path: '/admin/ai-audit', icon: '📜', adminOnly: true },
            { name: '쿼리 로그', path: '/audit', icon: '📋', adminOnly: true },
        ]
    },
];

export function Sidebar() {
    const [userRole, setUserRole] = useState<string>('');
    const [userName, setUserName] = useState<string>('');
    const [collapsed, setCollapsed] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['작업 공간', '데이터 관리']));
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUserRole(payload.role || 'user');
                setUserName(payload.username || 'User');
            } catch (e) {
                console.error('Invalid token');
            }
        }

        // Load collapsed state from localStorage
        const savedCollapsed = localStorage.getItem('sidebar-collapsed');
        if (savedCollapsed) {
            setCollapsed(savedCollapsed === 'true');
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('sidebar-collapsed', String(collapsed));
    }, [collapsed]);

    // Auto-expand group containing active path
    useEffect(() => {
        for (const group of menuGroups) {
            if (group.items.some(item => pathname === item.path || pathname.startsWith(item.path + '/'))) {
                setExpandedGroups(prev => new Set([...prev, group.title]));
                break;
            }
        }
    }, [pathname]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        document.cookie = 'token=; Max-Age=0; path=/;';
        router.push('/login');
    };

    const toggleGroup = (title: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(title)) {
                next.delete(title);
            } else {
                next.add(title);
            }
            return next;
        });
    };

    const isAdmin = userRole === 'admin';

    const visibleGroups = menuGroups.filter(g => !g.adminOnly || isAdmin);

    return (
        <aside style={{
            width: collapsed ? '68px' : '260px',
            minWidth: collapsed ? '68px' : '260px',
            background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'all 0.25s ease',
            borderRight: '1px solid rgba(99, 102, 241, 0.15)',
        }}>
            {/* Header */}
            <div style={{
                padding: collapsed ? '16px 12px' : '20px 16px',
                borderBottom: '1px solid rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'space-between',
            }}>
                {!collapsed && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                        }}>
                            ⚡
                        </div>
                        <span style={{
                            fontSize: '18px',
                            fontWeight: 700,
                            background: 'linear-gradient(90deg, #e0e7ff, #c7d2fe)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}>
                            Jainsight
                        </span>
                    </div>
                )}
                {collapsed && (
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                    }}>
                        ⚡
                    </div>
                )}
                {!collapsed && (
                    <button
                        onClick={() => setCollapsed(true)}
                        style={{
                            background: 'rgba(99, 102, 241, 0.1)',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#a5b4fc',
                            cursor: 'pointer',
                            padding: '6px 8px',
                            fontSize: '14px',
                            transition: 'all 0.2s',
                        }}
                        title="사이드바 접기"
                    >
                        ◀
                    </button>
                )}
            </div>

            {/* Expand Button when collapsed */}
            {collapsed && (
                <button
                    onClick={() => setCollapsed(false)}
                    style={{
                        margin: '12px auto',
                        background: 'rgba(99, 102, 241, 0.15)',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#a5b4fc',
                        cursor: 'pointer',
                        padding: '8px',
                        fontSize: '14px',
                    }}
                    title="사이드바 펼치기"
                >
                    ▶
                </button>
            )}

            {/* Navigation */}
            <nav style={{
                flex: 1,
                overflowY: 'auto',
                padding: collapsed ? '8px 4px' : '12px 8px',
            }}>
                {visibleGroups.map((group) => {
                    const isExpanded = expandedGroups.has(group.title);
                    const visibleItems = group.items.filter(item => !item.adminOnly || isAdmin);

                    return (
                        <div key={group.title} style={{ marginBottom: '4px' }}>
                            {!collapsed && (
                                <button
                                    onClick={() => toggleGroup(group.title)}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '8px 12px',
                                        background: 'transparent',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        color: '#94a3b8',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {group.adminOnly && <span style={{ fontSize: '10px' }}>🔒</span>}
                                        {group.title}
                                    </span>
                                    <span style={{
                                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s',
                                        fontSize: '10px',
                                    }}>
                                        ▼
                                    </span>
                                </button>
                            )}

                            <div style={{
                                overflow: 'hidden',
                                maxHeight: collapsed ? 'none' : (isExpanded ? '500px' : '0'),
                                transition: 'max-height 0.25s ease',
                            }}>
                                {visibleItems.map((item) => {
                                    const isActive = pathname === item.path || 
                                        (item.path !== '/' && pathname.startsWith(item.path));

                                    return (
                                        <Link
                                            key={item.path}
                                            href={item.path}
                                            title={collapsed ? item.name : undefined}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                padding: collapsed ? '10px' : '10px 12px',
                                                margin: collapsed ? '4px 0' : '2px 4px',
                                                borderRadius: '8px',
                                                textDecoration: 'none',
                                                color: isActive ? '#fff' : '#cbd5e1',
                                                background: isActive
                                                    ? 'linear-gradient(90deg, rgba(99, 102, 241, 0.4), rgba(139, 92, 246, 0.3))'
                                                    : 'transparent',
                                                border: isActive
                                                    ? '1px solid rgba(99, 102, 241, 0.4)'
                                                    : '1px solid transparent',
                                                transition: 'all 0.2s ease',
                                                fontSize: '14px',
                                                fontWeight: isActive ? 500 : 400,
                                                justifyContent: collapsed ? 'center' : 'flex-start',
                                            }}
                                        >
                                            <span style={{
                                                fontSize: collapsed ? '18px' : '16px',
                                                opacity: isActive ? 1 : 0.8,
                                            }}>
                                                {item.icon}
                                            </span>
                                            {!collapsed && <span>{item.name}</span>}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </nav>

            {/* User Section */}
            <div style={{
                padding: collapsed ? '12px 8px' : '16px',
                borderTop: '1px solid rgba(99, 102, 241, 0.15)',
                background: 'rgba(15, 23, 42, 0.5)',
            }}>
                {!collapsed ? (
                    <>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginBottom: '12px',
                        }}>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: isAdmin
                                    ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                                    : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                fontWeight: 600,
                                color: '#fff',
                            }}>
                                {userName.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    color: '#e2e8f0',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {userName}
                                </div>
                                <div style={{
                                    fontSize: '11px',
                                    color: isAdmin ? '#fbbf24' : '#94a3b8',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                }}>
                                    {isAdmin && <span>👑</span>}
                                    {userRole || 'user'}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '6px',
                                color: '#f87171',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 500,
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                            }}
                        >
                            <span>🚪</span>
                            로그아웃
                        </button>
                    </>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: isAdmin
                                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                                : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#fff',
                        }}
                            title={`${userName} (${userRole})`}
                        >
                            {userName.charAt(0).toUpperCase()}
                        </div>
                        <button
                            onClick={handleLogout}
                            title="로그아웃"
                            style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#f87171',
                                cursor: 'pointer',
                                padding: '8px',
                                fontSize: '14px',
                            }}
                        >
                            🚪
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
}
