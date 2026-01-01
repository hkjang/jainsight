'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';

interface Connection {
    id: string;
    name: string;
    type: string;
    host: string;
    database: string;
    visibility?: 'private' | 'team' | 'group' | 'public';
    sharedWithGroups?: string[];
    createdBy?: string;
    isOwner?: boolean;
}

interface Group {
    id: string;
    name: string;
    type: string;
}

const dbIcons: Record<string, { icon: string; color: string }> = {
    postgresql: { icon: '🐘', color: '#336791' },
    postgres: { icon: '🐘', color: '#336791' },
    mysql: { icon: '🐬', color: '#00758f' },
    mssql: { icon: '🔷', color: '#CC2927' },
    oracle: { icon: '🔶', color: '#F80000' },
    mariadb: { icon: '🦭', color: '#003545' },
    sqlite: { icon: '📁', color: '#003B57' },
};

export default function ConnectionsSharingPage() {
    const [connections, setConnections] = useState<Connection[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        const token = localStorage.getItem('token');
        try {
            const [connRes, groupRes] = await Promise.all([
                fetch('/api/connections', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/groups', { headers: { 'Authorization': `Bearer ${token}` } }),
            ]);
            if (connRes.ok) setConnections(await connRes.json());
            if (groupRes.ok) setGroups(await groupRes.json());
        } catch (e) {
            console.error('Failed to fetch data', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const stats = useMemo(() => {
        const privateConns = connections.filter(c => c.visibility === 'private' || !c.visibility);
        const groupConns = connections.filter(c => c.visibility === 'group');
        const publicConns = connections.filter(c => c.visibility === 'public');
        
        const groupsWithConnections = new Set<string>();
        groupConns.forEach(c => c.sharedWithGroups?.forEach(g => groupsWithConnections.add(g)));
        
        return { 
            total: connections.length, 
            private: privateConns.length, 
            group: groupConns.length, 
            public: publicConns.length,
            groupsWithConnections: groupsWithConnections.size,
        };
    }, [connections]);

    const getGroupName = (groupId: string) => groups.find(g => g.id === groupId)?.name || groupId.slice(0, 8);

    if (loading) {
        return (
            <div style={{ padding: '32px', background: '#0f0a1f', minHeight: '100vh' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', color: '#94a3b8' }}>로딩 중...</div>
            </div>
        );
    }

    return (
        <div style={{ padding: '32px', background: '#0f0a1f', minHeight: '100vh' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ marginBottom: '28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '28px' }}>🔌</span>
                        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>연결 공유 현황</h1>
                    </div>
                    <p style={{ color: '#64748b', fontSize: '14px' }}>모든 데이터베이스 연결의 공유 상태를 한눈에 확인하세요</p>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                    {[
                        { label: '전체 연결', value: stats.total, icon: '📊', color: '#6366f1' },
                        { label: '비공개', value: stats.private, icon: '🔒', color: '#a78bfa' },
                        { label: '그룹 공유', value: stats.group, icon: '👥', color: '#10b981' },
                        { label: '전체 공개', value: stats.public, icon: '🌐', color: '#f59e0b' },
                        { label: '연결된 그룹', value: stats.groupsWithConnections, icon: '🏢', color: '#ec4899' },
                    ].map(stat => (
                        <div key={stat.label} style={{
                            padding: '20px',
                            background: `${stat.color}10`,
                            borderRadius: '12px',
                            border: `1px solid ${stat.color}30`,
                        }}>
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>{stat.icon} {stat.label}</div>
                            <div style={{ fontSize: '28px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                        </div>
                    ))}
                </div>

                {/* Connections by Visibility */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* Group Shared Connections */}
                    <div style={{ background: 'rgba(30, 27, 75, 0.5)', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '20px' }}>
                        <h3 style={{ color: '#10b981', fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            👥 그룹 공유 연결 ({stats.group})
                        </h3>
                        {connections.filter(c => c.visibility === 'group').length === 0 ? (
                            <p style={{ color: '#64748b', fontSize: '13px' }}>그룹 공유된 연결이 없습니다</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {connections.filter(c => c.visibility === 'group').map(conn => (
                                    <div key={conn.id} style={{
                                        padding: '14px 16px', borderRadius: '10px',
                                        background: 'rgba(16, 185, 129, 0.08)',
                                        border: '1px solid rgba(16, 185, 129, 0.15)',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '18px' }}>{dbIcons[conn.type.toLowerCase()]?.icon || '🗄️'}</span>
                                            <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '14px' }}>{conn.name}</span>
                                            <span style={{ fontSize: '11px', color: '#64748b' }}>{conn.type}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {conn.sharedWithGroups?.map(gid => (
                                                <span key={gid} style={{
                                                    padding: '4px 10px', borderRadius: '6px', fontSize: '11px',
                                                    background: 'rgba(16, 185, 129, 0.2)', color: '#34d399',
                                                }}>
                                                    {getGroupName(gid)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Public Connections */}
                    <div style={{ background: 'rgba(30, 27, 75, 0.5)', borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '20px' }}>
                        <h3 style={{ color: '#f59e0b', fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            🌐 전체 공개 연결 ({stats.public})
                        </h3>
                        {connections.filter(c => c.visibility === 'public').length === 0 ? (
                            <p style={{ color: '#64748b', fontSize: '13px' }}>전체 공개된 연결이 없습니다</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {connections.filter(c => c.visibility === 'public').map(conn => (
                                    <div key={conn.id} style={{
                                        padding: '14px 16px', borderRadius: '10px',
                                        background: 'rgba(245, 158, 11, 0.08)',
                                        border: '1px solid rgba(245, 158, 11, 0.15)',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '18px' }}>{dbIcons[conn.type.toLowerCase()]?.icon || '🗄️'}</span>
                                            <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '14px' }}>{conn.name}</span>
                                            <span style={{ fontSize: '11px', color: '#64748b' }}>{conn.type}</span>
                                            <span style={{ marginLeft: 'auto', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>
                                                모든 사용자 접근 가능
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div style={{ marginTop: '28px', padding: '20px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <h4 style={{ color: '#e2e8f0', fontSize: '14px', margin: 0 }}>빠른 작업</h4>
                            <p style={{ color: '#64748b', fontSize: '12px', margin: '4px 0 0 0' }}>연결 및 그룹 관리 바로가기</p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <Link href="/connections/create" style={{
                                padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', color: 'white',
                                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px',
                            }}>
                                ➕ 새 연결
                            </Link>
                            <Link href="/admin/groups" style={{
                                padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                                background: 'rgba(16, 185, 129, 0.15)', color: '#34d399',
                                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                            }}>
                                👥 그룹 관리
                            </Link>
                            <Link href="/connections" style={{
                                padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                                background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc',
                                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                            }}>
                                🔌 연결 목록
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
