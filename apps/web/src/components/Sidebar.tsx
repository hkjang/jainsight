'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface MenuItem {
    name: string;
    path: string;
    icon: string;
    adminOnly?: boolean;
    badge?: string;
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
        title: 'Enterprise Admin',
        adminOnly: true,
        items: [
            { name: '사용자 관리', path: '/admin/users', icon: '👥', adminOnly: true },
            { name: '그룹 관리', path: '/admin/groups', icon: '🏢', adminOnly: true },
            { name: 'RBAC 관리', path: '/admin/rbac', icon: '🔐', adminOnly: true },
            { name: '쿼리 정책', path: '/admin/queries', icon: '📋', adminOnly: true },
            { name: 'API 키', path: '/admin/api-keys', icon: '🔑', adminOnly: true },
            { name: '운영 리포트', path: '/admin/reports', icon: '📊', adminOnly: true },
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
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);
    const [showTooltip, setShowTooltip] = useState<string | null>(null);
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

    // Keyboard shortcut for toggle
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                e.preventDefault();
                setCollapsed(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

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
            width: collapsed ? '72px' : '260px',
            minWidth: collapsed ? '72px' : '260px',
            background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            borderRight: '1px solid rgba(99, 102, 241, 0.15)',
            position: 'relative',
        }}>
            {/* Header */}
            <div style={{
                padding: collapsed ? '16px 12px' : '20px 16px',
                borderBottom: '1px solid rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'space-between',
            }}>
                <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: collapsed ? '40px' : '36px',
                        height: collapsed ? '40px' : '36px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: collapsed ? '20px' : '18px',
                        boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                        transition: 'all 0.3s',
                    }}>
                        ⚡
                    </div>
                    {!collapsed && (
                        <span style={{
                            fontSize: '18px',
                            fontWeight: 700,
                            background: 'linear-gradient(90deg, #e0e7ff, #c7d2fe)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}>
                            Jainsight
                        </span>
                    )}
                </Link>
                {!collapsed && (
                    <button
                        onClick={() => setCollapsed(true)}
                        style={{
                            background: 'rgba(99, 102, 241, 0.1)',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#a5b4fc',
                            cursor: 'pointer',
                            padding: '8px 10px',
                            fontSize: '12px',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                        }}
                        title="접기 (Ctrl+B)"
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
                        borderRadius: '8px',
                        color: '#a5b4fc',
                        cursor: 'pointer',
                        padding: '10px',
                        fontSize: '14px',
                        transition: 'all 0.2s',
                    }}
                    title="펼치기 (Ctrl+B)"
                >
                    ▶
                </button>
            )}

            {/* Navigation */}
            <nav style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: collapsed ? '8px 6px' : '12px 8px',
            }}>
                {visibleGroups.map((group, groupIdx) => {
                    const isExpanded = expandedGroups.has(group.title);
                    const visibleItems = group.items.filter(item => !item.adminOnly || isAdmin);

                    return (
                        <div key={group.title} style={{ 
                            marginBottom: '8px',
                            animation: 'fadeIn 0.3s ease-out forwards',
                            animationDelay: `${groupIdx * 0.05}s`,
                        }}>
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
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        color: '#94a3b8',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {group.adminOnly && <span style={{ fontSize: '10px' }}>🔒</span>}
                                        {group.title}
                                    </span>
                                    <span style={{
                                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.25s ease',
                                        fontSize: '10px',
                                    }}>
                                        ▼
                                    </span>
                                </button>
                            )}

                            <div style={{
                                overflow: 'hidden',
                                maxHeight: collapsed ? 'none' : (isExpanded ? '500px' : '0'),
                                transition: 'max-height 0.3s ease',
                            }}>
                                {visibleItems.map((item, itemIdx) => {
                                    const isActive = pathname === item.path || 
                                        (item.path !== '/' && pathname.startsWith(item.path));
                                    const isHovered = hoveredItem === item.path;

                                    return (
                                        <div key={item.path} style={{ position: 'relative' }}>
                                            <Link
                                                href={item.path}
                                                onMouseEnter={() => {
                                                    setHoveredItem(item.path);
                                                    if (collapsed) setShowTooltip(item.path);
                                                }}
                                                onMouseLeave={() => {
                                                    setHoveredItem(null);
                                                    setShowTooltip(null);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    padding: collapsed ? '12px' : '11px 14px',
                                                    margin: collapsed ? '4px 0' : '2px 4px',
                                                    borderRadius: '10px',
                                                    textDecoration: 'none',
                                                    color: isActive ? '#fff' : isHovered ? '#e2e8f0' : '#cbd5e1',
                                                    background: isActive
                                                        ? 'linear-gradient(90deg, rgba(99, 102, 241, 0.4), rgba(139, 92, 246, 0.25))'
                                                        : isHovered
                                                        ? 'rgba(99, 102, 241, 0.1)'
                                                        : 'transparent',
                                                    border: isActive
                                                        ? '1px solid rgba(99, 102, 241, 0.4)'
                                                        : '1px solid transparent',
                                                    boxShadow: isActive
                                                        ? '0 4px 15px rgba(99, 102, 241, 0.15)'
                                                        : 'none',
                                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    fontSize: '14px',
                                                    fontWeight: isActive ? 500 : 400,
                                                    justifyContent: collapsed ? 'center' : 'flex-start',
                                                    transform: isActive && !collapsed ? 'translateX(4px)' : 'translateX(0)',
                                                    animation: 'fadeSlideIn 0.3s ease-out forwards',
                                                    animationDelay: `${(groupIdx * 0.05) + (itemIdx * 0.03)}s`,
                                                    opacity: 0,
                                                }}
                                            >
                                                {/* Active indicator */}
                                                {isActive && !collapsed && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        left: 0,
                                                        top: '50%',
                                                        transform: 'translateY(-50%)',
                                                        width: '3px',
                                                        height: '60%',
                                                        background: 'linear-gradient(180deg, #6366f1, #8b5cf6)',
                                                        borderRadius: '0 4px 4px 0',
                                                    }} />
                                                )}
                                                <span style={{
                                                    fontSize: collapsed ? '20px' : '16px',
                                                    opacity: isActive ? 1 : 0.85,
                                                    transition: 'transform 0.2s',
                                                    transform: isHovered && !isActive ? 'scale(1.15)' : 'scale(1)',
                                                }}>
                                                    {item.icon}
                                                </span>
                                                {!collapsed && <span>{item.name}</span>}
                                                {item.badge && !collapsed && (
                                                    <span style={{
                                                        marginLeft: 'auto',
                                                        padding: '2px 6px',
                                                        background: 'rgba(239, 68, 68, 0.2)',
                                                        color: '#f87171',
                                                        fontSize: '10px',
                                                        fontWeight: 600,
                                                        borderRadius: '4px',
                                                    }}>
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </Link>
                                            
                                            {/* Tooltip for collapsed state */}
                                            {collapsed && showTooltip === item.path && (
                                                <div style={{
                                                    position: 'absolute',
                                                    left: '100%',
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    marginLeft: '12px',
                                                    padding: '8px 14px',
                                                    background: 'rgba(30, 27, 75, 0.95)',
                                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                                    borderRadius: '8px',
                                                    color: '#e2e8f0',
                                                    fontSize: '13px',
                                                    fontWeight: 500,
                                                    whiteSpace: 'nowrap',
                                                    zIndex: 100,
                                                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
                                                    animation: 'tooltipFadeIn 0.15s ease-out',
                                                }}>
                                                    {item.name}
                                                    <div style={{
                                                        position: 'absolute',
                                                        left: '-6px',
                                                        top: '50%',
                                                        transform: 'translateY(-50%) rotate(45deg)',
                                                        width: '10px',
                                                        height: '10px',
                                                        background: 'rgba(30, 27, 75, 0.95)',
                                                        borderLeft: '1px solid rgba(99, 102, 241, 0.3)',
                                                        borderBottom: '1px solid rgba(99, 102, 241, 0.3)',
                                                    }} />
                                                </div>
                                            )}
                                        </div>
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
                background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.5) 0%, rgba(15, 23, 42, 0.8) 100%)',
            }}>
                {!collapsed ? (
                    <>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '12px',
                            padding: '10px 12px',
                            background: 'rgba(99, 102, 241, 0.05)',
                            borderRadius: '10px',
                            border: '1px solid rgba(99, 102, 241, 0.1)',
                        }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: isAdmin
                                    ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                                    : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '15px',
                                fontWeight: 600,
                                color: '#fff',
                                boxShadow: `0 4px 12px ${isAdmin ? 'rgba(245, 158, 11, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                            }}>
                                {userName.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontSize: '14px',
                                    fontWeight: 600,
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
                                padding: '10px 14px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '10px',
                                color: '#f87171',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 500,
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                            }}
                        >
                            <span>🚪</span>
                            로그아웃
                        </button>
                    </>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <div
                            style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '50%',
                                background: isAdmin
                                    ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                                    : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '16px',
                                fontWeight: 600,
                                color: '#fff',
                                boxShadow: `0 4px 12px ${isAdmin ? 'rgba(245, 158, 11, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                                cursor: 'default',
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
                                borderRadius: '8px',
                                color: '#f87171',
                                cursor: 'pointer',
                                padding: '10px',
                                fontSize: '14px',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                        >
                            🚪
                        </button>
                    </div>
                )}
            </div>

            {/* Styles */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes fadeSlideIn {
                    from {
                        opacity: 0;
                        transform: translateX(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                
                @keyframes tooltipFadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(-50%) translateX(-5px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(-50%) translateX(0);
                    }
                }
                
                nav::-webkit-scrollbar {
                    width: 4px;
                }
                
                nav::-webkit-scrollbar-track {
                    background: transparent;
                }
                
                nav::-webkit-scrollbar-thumb {
                    background: rgba(99, 102, 241, 0.3);
                    border-radius: 4px;
                }
                
                nav::-webkit-scrollbar-thumb:hover {
                    background: rgba(99, 102, 241, 0.5);
                }
            `}</style>
        </aside>
    );
}
