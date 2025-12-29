'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Connection {
    id: string;
    name: string;
    type: string;
    host: string;
    port: number;
    database: string;
    createdAt: string;
}

export default function ConnectionsPage() {
    const [connections, setConnections] = useState<Connection[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        fetch('/api/connections', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.ok ? res.json() : [])
            .then(data => setConnections(data))
            .catch(() => setConnections([]))
            .finally(() => setLoading(false));
    }, [router]);

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        const token = localStorage.getItem('token');
        try {
            await fetch(`/api/connections/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setConnections(prev => prev.filter(c => c.id !== id));
        } catch (e) {
            console.error('Delete failed', e);
        }
    };

    const dbIcons: Record<string, string> = {
        postgresql: '🐘',
        mysql: '🐬',
        mssql: '🔷',
        oracle: '🔶',
        mariadb: '🦭',
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
                    <div>로딩 중...</div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: 700,
                        background: 'linear-gradient(90deg, #e0e7ff, #c7d2fe)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '6px',
                    }}>
                        데이터베이스 연결
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '14px' }}>등록된 데이터베이스 연결을 관리합니다</p>
                </div>
                <Link href="/connections/create" style={{
                    padding: '10px 20px',
                    background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                    borderRadius: '10px',
                    color: '#fff',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                }}>
                    <span>+</span> 연결 추가
                </Link>
            </div>

            {connections.length === 0 ? (
                <div style={{
                    padding: '60px',
                    textAlign: 'center',
                    background: 'rgba(30, 27, 75, 0.5)',
                    borderRadius: '16px',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔗</div>
                    <div style={{ color: '#94a3b8', marginBottom: '16px' }}>등록된 연결이 없습니다</div>
                    <Link href="/connections/create" style={{
                        display: 'inline-block',
                        padding: '10px 20px',
                        background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                        borderRadius: '10px',
                        color: '#fff',
                        textDecoration: 'none',
                        fontSize: '14px',
                        fontWeight: 500,
                    }}>
                        첫 연결 추가하기
                    </Link>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                    {connections.map((conn) => (
                        <div key={conn.id} style={{
                            padding: '20px',
                            background: 'rgba(30, 27, 75, 0.5)',
                            borderRadius: '12px',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                        }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '10px',
                                background: 'rgba(99, 102, 241, 0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '24px',
                            }}>
                                {dbIcons[conn.type.toLowerCase()] || '🗄️'}
                            </div>

                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '16px', fontWeight: 600, color: '#e2e8f0' }}>{conn.name}</span>
                                    <span style={{
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        background: 'rgba(99, 102, 241, 0.2)',
                                        color: '#a5b4fc',
                                        textTransform: 'uppercase',
                                    }}>
                                        {conn.type}
                                    </span>
                                </div>
                                <div style={{ fontSize: '13px', color: '#64748b' }}>
                                    {conn.host}:{conn.port} / {conn.database}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <Link href={`/editor?connectionId=${conn.id}`} style={{
                                    padding: '8px 14px',
                                    background: 'rgba(16, 185, 129, 0.15)',
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                    borderRadius: '8px',
                                    color: '#10b981',
                                    textDecoration: 'none',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                }}>
                                    쿼리
                                </Link>
                                <Link href={`/schemas?connectionId=${conn.id}`} style={{
                                    padding: '8px 14px',
                                    background: 'rgba(99, 102, 241, 0.15)',
                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                    borderRadius: '8px',
                                    color: '#a5b4fc',
                                    textDecoration: 'none',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                }}>
                                    스키마
                                </Link>
                                <button onClick={() => handleDelete(conn.id)} style={{
                                    padding: '8px 14px',
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '8px',
                                    color: '#f87171',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                }}>
                                    삭제
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
