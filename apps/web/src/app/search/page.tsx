'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { darkTheme, darkStyles, AnimatedCard, TabGroup } from '../../components/admin/AdminUtils';
import useAuth from '../../hooks/useAuth';
import { FavoriteIcon } from '../../components/FavoriteButton';

const API_URL = '/api';

interface SearchResult {
    id: string;
    type: 'query' | 'connection' | 'report' | 'user';
    title: string;
    description?: string;
    icon: string;
    href: string;
    meta?: string;
}

const typeInfo = {
    query: { label: '쿼리', icon: '📊', color: '#3B82F6' },
    connection: { label: '연결', icon: '🔌', color: '#10B981' },
    report: { label: '리포트', icon: '📈', color: '#8B5CF6' },
    user: { label: '사용자', icon: '👤', color: '#F59E0B' },
};

export default function SearchPage() {
    const searchParams = useSearchParams();
    const query = searchParams.get('q') || '';
    const { token, loading: authLoading, isAuthenticated } = useAuth();
    
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchInput, setSearchInput] = useState(query);

    const search = useCallback(async (q: string) => {
        if (!q.trim() || !token) {
            setResults([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const allResults: SearchResult[] = [];

        try {
            // 저장된 쿼리 검색
            const queriesRes = await fetch(`${API_URL}/queries`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (queriesRes.ok) {
                const queries = await queriesRes.json();
                const filtered = (queries || []).filter((item: { name?: string; sql?: string }) =>
                    item.name?.toLowerCase().includes(q.toLowerCase()) ||
                    item.sql?.toLowerCase().includes(q.toLowerCase())
                );
                allResults.push(...filtered.map((item: { id: string; name: string; sql?: string }) => ({
                    id: item.id,
                    type: 'query' as const,
                    title: item.name,
                    description: item.sql?.substring(0, 100),
                    icon: '📊',
                    href: `/editor?id=${item.id}`,
                    meta: '저장된 쿼리'
                })));
            }

            // 연결 검색
            const connectionsRes = await fetch(`${API_URL}/connections`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (connectionsRes.ok) {
                const connections = await connectionsRes.json();
                const filtered = (connections || []).filter((item: { name?: string; host?: string; type?: string }) =>
                    item.name?.toLowerCase().includes(q.toLowerCase()) ||
                    item.host?.toLowerCase().includes(q.toLowerCase())
                );
                allResults.push(...filtered.map((item: { id: string; name: string; type?: string; host?: string }) => ({
                    id: item.id,
                    type: 'connection' as const,
                    title: item.name,
                    description: `${item.type || 'Database'} - ${item.host}`,
                    icon: '🔌',
                    href: `/connections/${item.id}`,
                    meta: item.type
                })));
            }

            // 리포트 검색
            const reportsRes = await fetch(`${API_URL}/reports`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (reportsRes.ok) {
                const reports = await reportsRes.json();
                const reportsList = reports.data || reports || [];
                const filtered = reportsList.filter((item: { name?: string; description?: string }) =>
                    item.name?.toLowerCase().includes(q.toLowerCase()) ||
                    item.description?.toLowerCase().includes(q.toLowerCase())
                );
                allResults.push(...filtered.map((item: { id: string; name: string; description?: string }) => ({
                    id: item.id,
                    type: 'report' as const,
                    title: item.name,
                    description: item.description,
                    icon: '📈',
                    href: `/admin/reports/${item.id}`,
                    meta: '리포트'
                })));
            }

            setResults(allResults);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (!authLoading && isAuthenticated && query) {
            search(query);
        } else if (!authLoading) {
            setLoading(false);
        }
    }, [query, authLoading, isAuthenticated, search]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchInput.trim()) {
            window.location.href = `/search?q=${encodeURIComponent(searchInput)}`;
        }
    };

    const filteredResults = filter === 'all' ? results : results.filter(r => r.type === filter);

    if (authLoading) {
        return (
            <div style={{ ...darkStyles.container, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <div style={{ textAlign: 'center', color: darkTheme.textSecondary }}>⏳ 로딩 중...</div>
            </div>
        );
    }

    return (
        <div style={darkStyles.container}>
            {/* Search Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: darkTheme.textPrimary, marginBottom: '16px' }}>
                    🔍 검색
                </h1>
                <form onSubmit={handleSearch}>
                    <div style={{ position: 'relative', maxWidth: '600px' }}>
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="쿼리, 연결, 리포트 검색..."
                            style={{
                                width: '100%', padding: '14px 20px', paddingLeft: '48px',
                                background: 'rgba(30, 27, 75, 0.6)', border: '1px solid rgba(99,102,241,0.3)',
                                borderRadius: '12px', color: '#e2e8f0', fontSize: '16px', outline: 'none'
                            }}
                        />
                        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '20px' }}>🔍</span>
                        <button type="submit" style={{
                            position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                            padding: '8px 16px', background: 'rgba(99,102,241,0.2)', border: 'none',
                            borderRadius: '8px', color: '#e2e8f0', cursor: 'pointer', fontSize: '14px'
                        }}>검색</button>
                    </div>
                </form>
            </div>

            {query && (
                <>
                    {/* Results Count & Filters */}
                    <div style={{ marginBottom: '24px' }}>
                        <p style={{ color: darkTheme.textSecondary, marginBottom: '16px' }}>
                            "{query}" 검색 결과: <strong style={{ color: darkTheme.textPrimary }}>{results.length}개</strong>
                        </p>
                        <TabGroup
                            tabs={[
                                { id: 'all', label: `전체 (${results.length})` },
                                { id: 'query', label: `쿼리 (${results.filter(r => r.type === 'query').length})`, icon: '📊' },
                                { id: 'connection', label: `연결 (${results.filter(r => r.type === 'connection').length})`, icon: '🔌' },
                                { id: 'report', label: `리포트 (${results.filter(r => r.type === 'report').length})`, icon: '📈' },
                            ]}
                            activeTab={filter}
                            onChange={setFilter}
                        />
                    </div>

                    {/* Results */}
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '48px', color: darkTheme.textSecondary }}>
                            ⏳ 검색 중...
                        </div>
                    ) : filteredResults.length === 0 ? (
                        <AnimatedCard>
                            <div style={{ padding: '48px', textAlign: 'center' }}>
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                                <div style={{ color: darkTheme.textSecondary, fontSize: '16px' }}>검색 결과가 없습니다</div>
                                <p style={{ color: darkTheme.textMuted, marginTop: '8px', fontSize: '14px' }}>
                                    다른 검색어를 시도해 보세요
                                </p>
                            </div>
                        </AnimatedCard>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {filteredResults.map((result, i) => {
                                const info = typeInfo[result.type];
                                return (
                                    <AnimatedCard key={`${result.type}-${result.id}`} delay={i * 0.05}>
                                        <a href={result.href} style={{
                                            display: 'flex', alignItems: 'center', gap: '16px',
                                            padding: '16px 20px', textDecoration: 'none', transition: 'all 0.2s'
                                        }}>
                                            <div style={{
                                                width: '48px', height: '48px', borderRadius: '12px',
                                                background: `${info.color}20`, display: 'flex',
                                                alignItems: 'center', justifyContent: 'center', fontSize: '24px'
                                            }}>
                                                {result.icon}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                    <FavoriteIcon 
                                                        itemType={result.type === 'user' ? 'dashboard' : result.type} 
                                                        itemId={result.id} 
                                                        name={result.title} 
                                                        size={16} 
                                                    />
                                                    <span style={{ fontWeight: '600', color: darkTheme.textPrimary }}>{result.title}</span>
                                                    <span style={{
                                                        padding: '2px 8px', background: `${info.color}20`, borderRadius: '4px',
                                                        fontSize: '11px', color: info.color, fontWeight: '500'
                                                    }}>{info.label}</span>
                                                </div>
                                                {result.description && (
                                                    <div style={{
                                                        fontSize: '13px', color: darkTheme.textMuted,
                                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                                    }}>{result.description}</div>
                                                )}
                                            </div>
                                            <span style={{ color: darkTheme.textMuted, fontSize: '20px' }}>→</span>
                                        </a>
                                    </AnimatedCard>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {!query && (
                <AnimatedCard>
                    <div style={{ padding: '48px', textAlign: 'center' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>💡</div>
                        <div style={{ color: darkTheme.textSecondary, fontSize: '16px' }}>검색어를 입력하세요</div>
                        <p style={{ color: darkTheme.textMuted, marginTop: '8px', fontSize: '14px' }}>
                            쿼리, 연결, 리포트를 검색할 수 있습니다
                        </p>
                    </div>
                </AnimatedCard>
            )}
        </div>
    );
}
