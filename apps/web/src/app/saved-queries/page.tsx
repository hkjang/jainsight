'use client';

import { useEffect, useState, useCallback } from 'react';
import { darkTheme, darkStyles, AnimatedCard, SearchInput, Pagination, TabGroup } from '../../components/admin/AdminUtils';
import { FavoriteIcon } from '../../components/FavoriteButton';
import useAuth from '../../hooks/useAuth';

const API_URL = '/api';

interface SavedQuery {
    id: string;
    name: string;
    description?: string;
    query: string;
    userId: string;
    userName: string;
    isPublic: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export default function SavedQueriesPage() {
    const { user, token, loading: authLoading, isAuthenticated } = useAuth();
    const [queries, setQueries] = useState<SavedQuery[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'my' | 'public'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [selectedQuery, setSelectedQuery] = useState<SavedQuery | null>(null);
    const itemsPerPage = 12;

    const fetchQueries = useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/queries`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setQueries(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch queries:', error);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (!authLoading && isAuthenticated) fetchQueries();
    }, [fetchQueries, authLoading, isAuthenticated]);

    const handleDelete = async (queryId: string) => {
        if (!token || !confirm('이 쿼리를 삭제하시겠습니까?')) return;
        try {
            await fetch(`${API_URL}/queries/${queryId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            showNotification('쿼리가 삭제되었습니다.', 'success');
            fetchQueries();
        } catch {
            showNotification('삭제 실패', 'error');
        }
    };

    const copyQuery = (query: string) => {
        navigator.clipboard.writeText(query);
        showNotification('쿼리가 복사되었습니다.', 'success');
    };

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const filteredQueries = queries.filter(q => {
        const matchesSearch = q.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            q.query.toLowerCase().includes(searchTerm.toLowerCase());
        if (filter === 'my') return matchesSearch && q.userId === user?.id;
        if (filter === 'public') return matchesSearch && q.isPublic;
        return matchesSearch;
    });

    const totalPages = Math.ceil(filteredQueries.length / itemsPerPage);
    const paginatedQueries = filteredQueries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (authLoading || loading) {
        return (
            <div style={{ ...darkStyles.container, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <div style={{ textAlign: 'center', color: darkTheme.textSecondary }}>⏳ 로딩 중...</div>
            </div>
        );
    }

    return (
        <div style={darkStyles.container}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: darkTheme.textPrimary, display: 'flex', alignItems: 'center', gap: '12px' }}>
                            📊 저장된 쿼리
                        </h1>
                        <p style={{ color: darkTheme.textSecondary, marginTop: '4px' }}>
                            저장된 SQL 쿼리를 관리하고 재사용합니다 ({queries.length}개)
                        </p>
                    </div>
                    <a href="/editor" style={{ ...darkStyles.button, textDecoration: 'none' }}>
                        ➕ 새 쿼리
                    </a>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '250px', maxWidth: '400px' }}>
                        <SearchInput
                            value={searchTerm}
                            onChange={setSearchTerm}
                            placeholder="쿼리 검색..."
                        />
                    </div>
                    <TabGroup
                        tabs={[
                            { id: 'all', label: `전체 (${queries.length})` },
                            { id: 'my', label: `내 쿼리 (${queries.filter(q => q.userId === user?.id).length})` },
                            { id: 'public', label: `공개 (${queries.filter(q => q.isPublic).length})`, icon: '🌐' },
                        ]}
                        activeTab={filter}
                        onChange={(id) => { setFilter(id as 'all' | 'my' | 'public'); setCurrentPage(1); }}
                    />
                </div>
            </div>

            {/* Query List */}
            {paginatedQueries.length === 0 ? (
                <AnimatedCard>
                    <div style={{ padding: '48px', textAlign: 'center' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                        <div style={{ color: darkTheme.textSecondary, fontSize: '16px' }}>
                            {searchTerm ? '검색 결과가 없습니다' : '저장된 쿼리가 없습니다'}
                        </div>
                        <a href="/editor" style={{
                            display: 'inline-block', marginTop: '16px', padding: '12px 24px',
                            background: `${darkTheme.accentBlue}20`, color: darkTheme.accentBlue,
                            borderRadius: '8px', textDecoration: 'none', fontWeight: '500'
                        }}>
                            🚀 첫 쿼리 작성하기
                        </a>
                    </div>
                </AnimatedCard>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                    {paginatedQueries.map((query, i) => (
                        <AnimatedCard key={query.id} delay={i * 0.05}>
                            <div style={{ padding: '16px' }}>
                                {/* Header with favorite */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                        <FavoriteIcon itemType="query" itemId={query.id} name={query.name} size={18} />
                                        <h3 style={{ 
                                            fontSize: '16px', fontWeight: '600', color: darkTheme.textPrimary, 
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' 
                                        }}>
                                            {query.name}
                                        </h3>
                                    </div>
                                    {query.isPublic && (
                                        <span style={{ 
                                            padding: '2px 8px', fontSize: '11px', fontWeight: '500',
                                            background: `${darkTheme.accentGreen}20`, color: darkTheme.accentGreen, 
                                            borderRadius: '4px' 
                                        }}>
                                            공개
                                        </span>
                                    )}
                                </div>

                                {/* Description */}
                                {query.description && (
                                    <p style={{ 
                                        fontSize: '13px', color: darkTheme.textMuted, marginBottom: '12px',
                                        overflow: 'hidden', textOverflow: 'ellipsis', 
                                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                                    }}>
                                        {query.description}
                                    </p>
                                )}

                                {/* Query Preview */}
                                <div style={{
                                    background: darkTheme.bgSecondary, borderRadius: '8px', padding: '10px',
                                    marginBottom: '12px', fontSize: '12px', fontFamily: 'monospace',
                                    color: darkTheme.textSecondary, overflow: 'hidden', 
                                    textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                }}>
                                    {query.query.substring(0, 60)}{query.query.length > 60 ? '...' : ''}
                                </div>

                                {/* Meta */}
                                <div style={{ fontSize: '12px', color: darkTheme.textMuted, marginBottom: '12px' }}>
                                    작성자: {query.userName || 'Unknown'}
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <a href={`/editor?id=${query.id}`} style={{
                                        padding: '6px 12px', fontSize: '12px', fontWeight: '500',
                                        background: `${darkTheme.accentBlue}20`, color: darkTheme.accentBlue,
                                        borderRadius: '6px', textDecoration: 'none'
                                    }}>
                                        ▶️ 실행
                                    </a>
                                    <button onClick={() => copyQuery(query.query)} style={{
                                        padding: '6px 12px', fontSize: '12px', fontWeight: '500',
                                        background: darkTheme.bgSecondary, color: darkTheme.textSecondary,
                                        border: 'none', borderRadius: '6px', cursor: 'pointer'
                                    }}>
                                        📋 복사
                                    </button>
                                    <button onClick={() => setSelectedQuery(query)} style={{
                                        padding: '6px 12px', fontSize: '12px', fontWeight: '500',
                                        background: darkTheme.bgSecondary, color: darkTheme.textSecondary,
                                        border: 'none', borderRadius: '6px', cursor: 'pointer'
                                    }}>
                                        👁️ 보기
                                    </button>
                                    {query.userId === user?.id && (
                                        <button onClick={() => handleDelete(query.id)} style={{
                                            padding: '6px 12px', fontSize: '12px', fontWeight: '500',
                                            background: `${darkTheme.accentRed}20`, color: darkTheme.accentRed,
                                            border: 'none', borderRadius: '6px', cursor: 'pointer'
                                        }}>
                                            🗑️
                                        </button>
                                    )}
                                </div>
                            </div>
                        </AnimatedCard>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ marginTop: '24px' }}>
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
            )}

            {/* Query Detail Modal */}
            {selectedQuery && (
                <div style={darkStyles.modalOverlay} onClick={() => setSelectedQuery(null)}>
                    <div style={{ ...darkStyles.modal, maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FavoriteIcon itemType="query" itemId={selectedQuery.id} name={selectedQuery.name} size={20} />
                                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: darkTheme.textPrimary }}>{selectedQuery.name}</h2>
                            </div>
                            <button onClick={() => setSelectedQuery(null)} style={{ background: 'none', border: 'none', color: darkTheme.textMuted, fontSize: '24px', cursor: 'pointer' }}>×</button>
                        </div>
                        {selectedQuery.description && (
                            <p style={{ color: darkTheme.textSecondary, marginBottom: '16px' }}>{selectedQuery.description}</p>
                        )}
                        <div style={{
                            background: darkTheme.bgSecondary, borderRadius: '12px', padding: '16px',
                            fontFamily: 'monospace', fontSize: '13px', color: darkTheme.textPrimary,
                            whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '300px', overflowY: 'auto'
                        }}>
                            {selectedQuery.query}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
                            <button onClick={() => copyQuery(selectedQuery.query)} style={darkStyles.buttonSecondary}>📋 복사</button>
                            <a href={`/editor?id=${selectedQuery.id}`} style={darkStyles.button}>▶️ 에디터에서 열기</a>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification */}
            {notification && (
                <div style={{
                    position: 'fixed', bottom: '24px', right: '24px', padding: '16px 24px',
                    background: notification.type === 'success' ? darkTheme.accentGreen : darkTheme.accentRed,
                    color: 'white', borderRadius: '12px', zIndex: 1000, fontWeight: '500'
                }}>
                    {notification.type === 'success' ? '✅' : '❌'} {notification.message}
                </div>
            )}
        </div>
    );
}
