'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import loader from '@monaco-editor/loader';
import {
    BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// Configure Monaco to load from local assets (offline support)
// This prevents loading from CDN (cdn.jsdelivr.net)
loader.config({
  paths: {
    vs: '/monaco-editor/min/vs'
  }
});

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

// ============================================================================
// THEME SYSTEM
// ============================================================================
const darkTheme = {
    bg: '#0f172a',
    bgCard: '#1e293b',
    bgSecondary: '#1e1b4b',
    bgHover: '#334155',
    text: '#e2e8f0',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    border: 'rgba(99, 102, 241, 0.2)',
    borderHover: 'rgba(99, 102, 241, 0.4)',
    primary: '#6366f1',
    primaryHover: '#8b5cf6',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#06b6d4',
};

// ============================================================================
// SQL TEMPLATES
// ============================================================================
const SQL_TEMPLATES = [
    { name: 'Basic SELECT', icon: '📋', sql: 'SELECT * FROM table_name WHERE id = :id LIMIT 10;', desc: 'Simple select with parameter' },
    { name: 'SELECT with JOIN', icon: '🔗', sql: 'SELECT t1.*, t2.name\nFROM table1 t1\nLEFT JOIN table2 t2 ON t1.t2_id = t2.id\nWHERE t1.id = :id;', desc: 'Join two tables' },
    { name: 'Pagination', icon: '📄', sql: 'SELECT * FROM table_name\nORDER BY created_at DESC\nLIMIT :limit OFFSET :offset;', desc: 'Paginated results' },
    { name: 'Aggregation', icon: '📊', sql: 'SELECT category, COUNT(*) as count, SUM(amount) as total\nFROM table_name\nWHERE status = :status\nGROUP BY category\nORDER BY count DESC;', desc: 'Group and aggregate' },
    { name: 'Search', icon: '🔍', sql: 'SELECT * FROM table_name\nWHERE name ILIKE :searchTerm\n   OR description ILIKE :searchTerm\nLIMIT :limit;', desc: 'Text search query' },
    { name: 'Date Range', icon: '📅', sql: 'SELECT * FROM table_name\nWHERE created_at >= :startDate\n  AND created_at <= :endDate\nORDER BY created_at DESC;', desc: 'Filter by date range' },
    { name: 'Statistics', icon: '📈', sql: 'SELECT \n  COUNT(*) as total,\n  SUM(CASE WHEN status = \'active\' THEN 1 ELSE 0 END) as active_count,\n  AVG(value) as avg_value,\n  MAX(updated_at) as last_updated\nFROM table_name;', desc: 'Basic statistics' },
    { name: 'User Details', icon: '👤', sql: 'SELECT u.*, \n  (SELECT COUNT(*) FROM orders WHERE user_id = u.id) as order_count\nFROM users u\nWHERE u.id = :userId;', desc: 'User with order count' },
];

// ============================================================================
// SQL SNIPPETS
// ============================================================================
const SQL_SNIPPETS = [
    { name: 'SELECT', snippet: 'SELECT column1, column2\nFROM table_name\nWHERE condition;', desc: 'Basic select' },
    { name: 'INSERT', snippet: 'INSERT INTO table_name (column1, column2)\nVALUES (:value1, :value2);', desc: 'Insert record' },
    { name: 'UPDATE', snippet: 'UPDATE table_name\nSET column1 = :value\nWHERE id = :id;', desc: 'Update record' },
    { name: 'DELETE', snippet: 'DELETE FROM table_name\nWHERE id = :id;', desc: 'Delete record' },
    { name: 'JOIN', snippet: 'SELECT t1.*, t2.*\nFROM table1 t1\nINNER JOIN table2 t2 ON t1.id = t2.table1_id;', desc: 'Join tables' },
    { name: 'GROUP BY', snippet: 'SELECT column, COUNT(*), SUM(value)\nFROM table_name\nGROUP BY column\nHAVING COUNT(*) > :minCount;', desc: 'Aggregation' },
    { name: 'ORDER BY', snippet: 'ORDER BY column_name DESC', desc: 'Sort results' },
    { name: 'LIMIT', snippet: 'LIMIT :limit OFFSET :offset', desc: 'Pagination' },
    { name: 'CASE', snippet: 'CASE\n  WHEN condition1 THEN result1\n  WHEN condition2 THEN result2\n  ELSE default_result\nEND', desc: 'Conditional' },
    { name: 'COALESCE', snippet: 'COALESCE(column, :default)', desc: 'Null handling' },
];

// ============================================================================
// SQL FORMATTER
// ============================================================================
const formatSQL = (sql: string): string => {
    const keywords = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'ON', 'AS', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM'];
    let formatted = sql.trim();
    
    // Add newlines before major keywords
    keywords.forEach(kw => {
        const regex = new RegExp(`\\s+${kw}\\s+`, 'gi');
        formatted = formatted.replace(regex, `\n${kw} `);
    });
    
    // Ensure SELECT is at start
    if (formatted.toUpperCase().startsWith('SELECT')) {
        formatted = formatted.replace(/^select/i, 'SELECT');
    }
    
    // Clean up extra whitespace
    formatted = formatted.replace(/[ \t]+/g, ' ').replace(/\n\s+/g, '\n').trim();
    
    return formatted;
};


interface ApiTemplate {
    id: string;
    name: string;
    description?: string;
    sql: string;
    apiKey: string;
    parameters: Array<{ name: string; type: string; required: boolean; defaultValue?: any }>;
    connectionId: string;
    createdAt: string;
    updatedAt?: string;
    isActive: boolean;
    version: number;
    usageCount: number;
    lastUsedAt?: string;
    cacheTtl?: number;
    rateLimit?: { requests: number; windowSeconds: number };
    method?: string;
}

interface TestResult {
    success: boolean;
    data?: any;
    error?: string;
    duration: number;
    rowCount?: number;
}

export default function ApiBuilderPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<ApiTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'list' | 'editor'>('list');
    const [connections, setConnections] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [showApiKey, setShowApiKey] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Editor State
    const [editingApiId, setEditingApiId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [sql, setSql] = useState('SELECT * FROM users WHERE id = :userId');
    const [params, setParams] = useState<any[]>([]);
    const [connectionId, setConnectionId] = useState('');
    const [saving, setSaving] = useState(false);
    const [cacheTtl, setCacheTtl] = useState(0);
    const [visibility, setVisibility] = useState<'private' | 'group' | 'public'>('private');
    const [isActive, setIsActive] = useState(true);

    // Test Modal State
    const [showTestModal, setShowTestModal] = useState(false);
    const [testingApi, setTestingApi] = useState<ApiTemplate | null>(null);
    const [testParams, setTestParams] = useState<Record<string, any>>({});
    const [testResult, setTestResult] = useState<TestResult | null>(null);
    const [testing, setTesting] = useState(false);

    // Code Snippet Modal State
    const [showSnippetModal, setShowSnippetModal] = useState(false);
    const [snippetApi, setSnippetApi] = useState<ApiTemplate | null>(null);
    const [snippetType, setSnippetType] = useState<'curl' | 'javascript' | 'python'>('curl');

    // Favorites State
    const [favoriteApis, setFavoriteApis] = useState<Set<string>>(new Set());

    // Inline Query Test State (for editor)
    const [inlineTestParams, setInlineTestParams] = useState<Record<string, any>>({});
    const [inlineTestResult, setInlineTestResult] = useState<TestResult | null>(null);
    const [inlineTesting, setInlineTesting] = useState(false);
    const [showInlineTestPanel, setShowInlineTestPanel] = useState(false);

    // Enhanced UX State
    const [listViewMode, setListViewMode] = useState<'card' | 'table'>('card');
    const [sortBy, setSortBy] = useState<'name' | 'usageCount' | 'lastUsedAt' | 'createdAt'>('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
    const [showTemplatesDropdown, setShowTemplatesDropdown] = useState(false);
    const [showSnippetsDropdown, setShowSnippetsDropdown] = useState(false);
    const [wordWrap, setWordWrap] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'testing' | 'connected' | 'failed'>('unknown');

    // SQL Editor-style Layout State
    const [rightPanelTab, setRightPanelTab] = useState<'params' | 'results' | 'info'>('params');
    const [leftPanelWidth, setLeftPanelWidth] = useState(60); // percentage
    const [showApiList, setShowApiList] = useState(true); // collapsible sidebar

    // Schema for Autocomplete
    const [schemaInfo, setSchemaInfo] = useState<{ tables: string[]; columns: Record<string, string[]> }>({ tables: [], columns: {} });

    // AI Assist State
    const [showAiAssist, setShowAiAssist] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    // Monaco Editor ref
    const editorRef = useRef<any>(null);

    useEffect(() => {
        fetchTemplates();
        fetchConnections();
        fetchFavorites();
    }, []);

    // Auto-detect params from SQL
    useEffect(() => {
        const regex = /:([\w]+)/g;
        const matches = new Set<string>();
        let match;
        while ((match = regex.exec(sql)) !== null) {
            matches.add(match[1]);
        }

        const newParams = Array.from(matches).map(p => {
            const existing = params.find(ep => ep.name === p);
            return existing || { name: p, type: 'string', required: true };
        });
        setParams(newParams);
    }, [sql]);

    // Fetch schema when connection changes (for autocomplete)
    useEffect(() => {
        if (connectionId && view === 'editor') {
            fetchSchemaInfo();
        }
    }, [connectionId, view]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only in editor view
            if (view !== 'editor') return;
            
            // Ctrl+S - Save
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                if (name && connectionId && !saving) {
                    handleSave();
                }
            }
            // Ctrl+Enter - Run test
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                if (!inlineTesting) {
                    setShowInlineTestPanel(true);
                    runInlineQueryTest();
                }
            }
            // Ctrl+Shift+F - Format SQL
            if (e.ctrlKey && e.shiftKey && e.key === 'F') {
                e.preventDefault();
                setSql(formatSQL(sql));
                showToast('SQL 포맷팅 완료', 'success');
            }
            // F5 - Run test (like SSMS)
            if (e.key === 'F5') {
                e.preventDefault();
                if (!inlineTesting && connectionId) {
                    setShowInlineTestPanel(true);
                    runInlineQueryTest();
                }
            }
            // Escape - Close dropdowns and panels
            if (e.key === 'Escape') {
                setShowTemplatesDropdown(false);
                setShowSnippetsDropdown(false);
                setShowAiAssist(false);
                if (isFullscreen) {
                    setIsFullscreen(false);
                }
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [view, name, connectionId, saving, inlineTesting, sql, isFullscreen]);

    // Test connection
    const testConnection = async () => {
        if (!connectionId) return;
        setConnectionStatus('testing');
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/connections/${connectionId}/test`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            setConnectionStatus(res.ok ? 'connected' : 'failed');
            showToast(res.ok ? '연결 성공' : '연결 실패', res.ok ? 'success' : 'error');
        } catch {
            setConnectionStatus('failed');
            showToast('연결 테스트 실패', 'error');
        }
    };

    // Query complexity indicator
    const getQueryComplexity = useCallback((): 'low' | 'medium' | 'high' => {
        const upperSql = sql.toUpperCase();
        const hasJoin = /\bJOIN\b/.test(upperSql);
        const hasSubquery = /\(\s*SELECT\b/.test(upperSql);
        const hasNoLimit = !/\bLIMIT\b/.test(upperSql);
        const hasWildcard = /SELECT\s+\*/.test(upperSql);
        
        let score = 0;
        if (hasJoin) score += 1;
        if (hasSubquery) score += 2;
        if (hasNoLimit && hasWildcard) score += 2;
        
        return score >= 3 ? 'high' : score >= 1 ? 'medium' : 'low';
    }, [sql]);

    // Export results to CSV
    const exportResultsCSV = () => {
        if (!inlineTestResult?.data?.length) return;
        const headers = Object.keys(inlineTestResult.data[0]).join(',');
        const rows = inlineTestResult.data.map((row: any) => 
            Object.values(row).map(v => JSON.stringify(v ?? '')).join(',')
        ).join('\n');
        const csv = headers + '\n' + rows;
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `api_test_results_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        showToast('CSV 다운로드 완료', 'success');
    };

    // Export results to JSON
    const exportResultsJSON = () => {
        if (!inlineTestResult?.data?.length) return;
        const blob = new Blob([JSON.stringify(inlineTestResult.data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `api_test_results_${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        showToast('JSON 다운로드 완료', 'success');
    };

    // Copy results to clipboard
    const copyResultsToClipboard = () => {
        if (!inlineTestResult?.data?.length) return;
        const headers = Object.keys(inlineTestResult.data[0]).join('\t');
        const rows = inlineTestResult.data.map((row: any) => 
            Object.values(row).map(v => String(v ?? '')).join('\t')
        ).join('\n');
        navigator.clipboard.writeText(headers + '\n' + rows);
        showToast(`${inlineTestResult.data.length} rows 클립보드에 복사됨`, 'success');
    };

    // Copy SQL to clipboard
    const copySqlToClipboard = () => {
        navigator.clipboard.writeText(sql);
        showToast('SQL 클립보드에 복사됨', 'success');
    };

    // Insert template
    const insertTemplate = (template: typeof SQL_TEMPLATES[0]) => {
        setSql(template.sql);
        setShowTemplatesDropdown(false);
        showToast(`'${template.name}' 템플릿 적용됨`, 'info');
    };

    // Insert snippet
    const insertSnippet = (snippet: typeof SQL_SNIPPETS[0]) => {
        setSql(prev => prev + '\n' + snippet.snippet);
        setShowSnippetsDropdown(false);
        showToast(`'${snippet.name}' 스니펫 추가됨`, 'info');
    };

    const fetchTemplates = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        try {
            const res = await fetch('/api/sql-api', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTemplates(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error('Failed to fetch templates', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchConnections = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch('/api/connections', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setConnections(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error('Failed to fetch connections', e);
        }
    };

    const fetchFavorites = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const userId = payload.userId || payload.sub || payload.id;
            if (!userId) return;

            const res = await fetch(`/api/users/${userId}/favorites?type=api`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const favIds = new Set<string>(data.map((f: any) => f.itemId));
                setFavoriteApis(favIds);
            }
        } catch (e) {
            console.error('Failed to fetch favorites', e);
        }
    };

    const fetchSchemaInfo = async () => {
        const token = localStorage.getItem('token');
        if (!token || !connectionId) return;

        try {
            const res = await fetch(`/api/schema/${connectionId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const tables = data.map((t: any) => t.tableName || t.name);
                const columns: Record<string, string[]> = {};
                data.forEach((t: any) => {
                    columns[t.tableName || t.name] = (t.columns || []).map((c: any) => c.columnName || c.name);
                });
                setSchemaInfo({ tables, columns });
            }
        } catch (e) {
            console.error('Failed to fetch schema', e);
        }
    };

    const toggleFavoriteApi = async (apiId: string, apiName: string) => {
        const token = localStorage.getItem('token');
        if (!token) {
            showToast('로그인이 필요합니다', 'error');
            return;
        }

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const userId = payload.userId || payload.sub || payload.id;
            if (!userId) {
                showToast('사용자 정보를 찾을 수 없습니다', 'error');
                return;
            }

            const isFavorite = favoriteApis.has(apiId);
            
            if (isFavorite) {
                // Remove from favorites
                await fetch(`/api/users/${userId}/favorites/api/${apiId}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                });
                setFavoriteApis(prev => {
                    const next = new Set(prev);
                    next.delete(apiId);
                    return next;
                });
                showToast('즐겨찾기에서 제거되었습니다', 'success');
            } else {
                // Add to favorites
                await fetch(`/api/users/${userId}/favorites`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}` 
                    },
                    body: JSON.stringify({
                        itemType: 'api',
                        itemId: apiId,
                        name: apiName,
                        description: 'API Gateway',
                        icon: '🌐'
                    })
                });
                setFavoriteApis(prev => new Set([...prev, apiId]));
                showToast('즐겨찾기에 추가되었습니다', 'success');
            }
        } catch (e) {
            console.error('Failed to toggle favorite', e);
            showToast('즐겨찾기 변경에 실패했습니다', 'error');
        }
    };

    const handleSave = async () => {
        if (!name || !connectionId) {
            showToast('이름과 연결을 선택해주세요', 'error');
            return;
        }

        const token = localStorage.getItem('token');
        setSaving(true);

        try {
            const url = editingApiId 
                ? `/api/sql-api/${editingApiId}`
                : '/api/sql-api';
            const method = editingApiId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name,
                    description,
                    sql,
                    parameters: params,
                    connectionId,
                    cacheTtl: cacheTtl || null,
                    isActive,
                    visibility
                })
            });

            if (res.ok) {
                setView('list');
                fetchTemplates();
                resetEditor();
                showToast(editingApiId ? 'API 수정 완료' : 'API 생성 완료', 'success');
            } else {
                const data = await res.json();
                showToast(data.message || 'API 저장에 실패했습니다', 'error');
            }
        } catch {
            showToast('API 저장 중 오류가 발생했습니다', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('이 API를 삭제하시겠습니까?')) return;

        const token = localStorage.getItem('token');
        try {
            await fetch(`/api/sql-api/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchTemplates();
        } catch (e) {
            console.error('Delete failed', e);
        }
    };

    const handleCopyKey = useCallback((key: string, id: string) => {
        navigator.clipboard.writeText(key);
        setCopiedKey(id);
        setTimeout(() => setCopiedKey(null), 2000);
    }, []);

    const handleCopyEndpoint = useCallback((id: string) => {
        const endpoint = `${window.location.origin}/api/sql-api/execute/${id}`;
        navigator.clipboard.writeText(endpoint);
        setCopiedKey(`endpoint-${id}`);
        setTimeout(() => setCopiedKey(null), 2000);
    }, []);

    const resetEditor = () => {
        setEditingApiId(null);
        setName('');
        setDescription('');
        setSql('SELECT * FROM users WHERE id = :userId');
        setParams([]);
        setConnectionId('');
        setCacheTtl(0);
        setIsActive(true);
        setVisibility('private');
        setTestResult(null);
        // Reset inline test state
        setInlineTestParams({});
        setInlineTestResult(null);
        setShowInlineTestPanel(false);
    };

    const handleEditApi = (api: ApiTemplate) => {
        setEditingApiId(api.id);
        setName(api.name);
        setDescription(api.description || '');
        setSql(api.sql);
        setParams(api.parameters || []);
        setConnectionId(api.connectionId);
        setCacheTtl(api.cacheTtl || 0);
        setIsActive(api.isActive !== false);
        setVisibility((api as any).visibility || 'private');
        setView('editor');
    };

    // Toast helper
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // AI SQL Generation
    const generateSqlWithAI = async () => {
        if (!aiPrompt.trim() || aiLoading) return;
        
        setAiLoading(true);
        const token = localStorage.getItem('token');
        
        try {
            // Build context with schema info
            const schemaContext = schemaInfo.tables.length > 0 
                ? `Available tables: ${schemaInfo.tables.join(', ')}. ${schemaInfo.tables.slice(0, 5).map(t => `Table ${t} has columns: ${(schemaInfo.columns[t] || []).join(', ')}`).join('. ')}`
                : '';
            
            const res = await fetch('/api/llm/generate', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: `Generate a SQL query for: "${aiPrompt}"\n\n${schemaContext}\n\nRespond with ONLY the SQL query, no explanations.`,
                    type: 'sql'
                })
            });
            
            if (res.ok) {
                const data = await res.json();
                const generatedSql = data.result || data.sql || data.content || '';
                if (generatedSql) {
                    setSql(generatedSql.trim());
                    setShowAiAssist(false);
                    setAiPrompt('');
                    showToast('SQL이 생성되었습니다', 'success');
                } else {
                    showToast('SQL 생성 실패', 'error');
                }
            } else {
                showToast('AI 요청 실패', 'error');
            }
        } catch (e) {
            console.error('AI generation failed:', e);
            showToast('AI 요청 중 오류 발생', 'error');
        } finally {
            setAiLoading(false);
        }
    };

    // Run inline query test (directly test SQL from editor)
    const runInlineQueryTest = async () => {
        if (!connectionId) {
            showToast('연결을 먼저 선택해주세요', 'error');
            return;
        }
        if (!sql.trim()) {
            showToast('SQL 쿼리를 입력해주세요', 'error');
            return;
        }

        setInlineTesting(true);
        setInlineTestResult(null);

        const token = localStorage.getItem('token');
        const startTime = Date.now();

        try {
            // Replace parameters in SQL with test values
            let processedSql = sql;
            params.forEach(p => {
                const value = inlineTestParams[p.name];
                if (value !== undefined && value !== '') {
                    // Escape single quotes and wrap string values
                    if (p.type === 'number') {
                        processedSql = processedSql.replace(new RegExp(`:${p.name}\\b`, 'g'), value);
                    } else {
                        const escapedValue = String(value).replace(/'/g, "''");
                        processedSql = processedSql.replace(new RegExp(`:${p.name}\\b`, 'g'), `'${escapedValue}'`);
                    }
                }
            });

            const res = await fetch('/api/query/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    connectionId,
                    query: processedSql
                })
            });

            const duration = Date.now() - startTime;
            const data = await res.json();

            if (res.ok) {
                setInlineTestResult({
                    success: true,
                    data: data.rows || data,
                    duration,
                    rowCount: data.rowCount ?? data.rows?.length ?? 0
                });
                showToast(`쿼리 실행 성공 (${duration}ms)`, 'success');
            } else {
                setInlineTestResult({
                    success: false,
                    error: data.message || data.error || '쿼리 실행 실패',
                    duration
                });
                showToast('쿼리 실행 실패', 'error');
            }
        } catch (e: any) {
            const duration = Date.now() - startTime;
            setInlineTestResult({
                success: false,
                error: e.message || '네트워크 오류',
                duration
            });
            showToast('쿼리 실행 중 오류 발생', 'error');
        } finally {
            setInlineTesting(false);
        }
    };

    // Toggle API active status
    const handleToggleActive = async (id: string) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/sql-api/${id}/toggle`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                showToast(data.message, 'success');
                fetchTemplates();
            }
        } catch (e) {
            showToast('상태 변경 실패', 'error');
        }
    };

    // Duplicate API
    const handleDuplicate = async (id: string) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/sql-api/${id}/duplicate`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                showToast('API 복제 완료', 'success');
                fetchTemplates();
            }
        } catch (e) {
            showToast('복제 실패', 'error');
        }
    };

    // Regenerate API key
    const handleRegenerateKey = async (id: string) => {
        if (!confirm('API 키를 재생성하시겠습니까? 기존 키는 더 이상 사용할 수 없습니다.')) return;
        
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/sql-api/${id}/regenerate-key`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                showToast('API 키 재생성 완료', 'success');
                fetchTemplates();
            }
        } catch (e) {
            showToast('키 재생성 실패', 'error');
        }
    };

    // Open test modal
    const openTestModal = (api: ApiTemplate) => {
        setTestingApi(api);
        const defaultParams: Record<string, any> = {};
        api.parameters?.forEach(p => {
            defaultParams[p.name] = p.defaultValue || '';
        });
        setTestParams(defaultParams);
        setTestResult(null);
        setShowTestModal(true);
    };

    // Run test
    const runTest = async () => {
        if (!testingApi) return;
        setTesting(true);
        setTestResult(null);
        
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/sql-api/${testingApi.id}/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ params: testParams })
            });
            const data = await res.json();
            setTestResult(data);
        } catch (e: any) {
            setTestResult({ success: false, error: e.message, duration: 0 });
        } finally {
            setTesting(false);
        }
    };

    // Open code snippet modal
    const openSnippetModal = (api: ApiTemplate) => {
        setSnippetApi(api);
        setSnippetType('curl');
        setShowSnippetModal(true);
    };

    // Generate code snippets
    const generateSnippet = (api: ApiTemplate, type: 'curl' | 'javascript' | 'python'): string => {
        const endpoint = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/sql-api/execute/${api.id}`;
        const params = api.parameters?.reduce((acc, p) => {
            acc[p.name] = p.type === 'number' ? 123 : 'value';
            return acc;
        }, {} as Record<string, any>) || {};

        if (type === 'curl') {
            return `curl -X POST '${endpoint}' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "apiKey": "${api.apiKey}",
    "params": ${JSON.stringify(params, null, 4).replace(/\n/g, '\n    ')}
  }'`;
        }

        if (type === 'javascript') {
            return `const response = await fetch('${endpoint}', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        apiKey: '${api.apiKey}',
        params: ${JSON.stringify(params, null, 8).replace(/\n/g, '\n        ')}
    })
});

const data = await response.json();
console.log(data);`;
        }

        if (type === 'python') {
            return `import requests

response = requests.post(
    '${endpoint}',
    json={
        'apiKey': '${api.apiKey}',
        'params': ${JSON.stringify(params, null, 8).replace(/\n/g, '\n        ')}
    }
)

data = response.json()
print(data)`;
        }

        return '';
    };

    // Copy snippet to clipboard
    const copySnippet = () => {
        if (!snippetApi) return;
        navigator.clipboard.writeText(generateSnippet(snippetApi, snippetType));
        showToast('코드 복사 완료', 'success');
    };

    // Format relative time
    const formatRelativeTime = (dateStr?: string) => {
        if (!dateStr) return '사용 기록 없음';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return '방금 전';
        if (diffMins < 60) return `${diffMins}분 전`;
        if (diffHours < 24) return `${diffHours}시간 전`;
        return `${diffDays}일 전`;
    };

    // Filter and sort templates
    const filteredTemplates = templates
        // Text search filter
        .filter(t =>
            t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.sql.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
        )
        // Status filter
        .filter(t => {
            if (filterStatus === 'all') return true;
            if (filterStatus === 'active') return t.isActive !== false;
            if (filterStatus === 'inactive') return t.isActive === false;
            return true;
        })
        // Sort
        .sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'usageCount':
                    comparison = (a.usageCount || 0) - (b.usageCount || 0);
                    break;
                case 'lastUsedAt':
                    comparison = new Date(a.lastUsedAt || 0).getTime() - new Date(b.lastUsedAt || 0).getTime();
                    break;
                case 'createdAt':
                default:
                    comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
                    break;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

    if (loading) {
        return (
            <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ 
                        width: '250px', 
                        height: '32px', 
                        background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.2), rgba(99, 102, 241, 0.1))',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.5s infinite',
                        borderRadius: '8px',
                    }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{
                            height: '180px',
                            background: 'linear-gradient(90deg, rgba(30, 27, 75, 0.5), rgba(49, 46, 129, 0.3), rgba(30, 27, 75, 0.5))',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 1.5s infinite',
                            borderRadius: '16px',
                        }} />
                    ))}
                </div>
                <style>{`
                    @keyframes shimmer {
                        0% { background-position: 200% 0; }
                        100% { background-position: -200% 0; }
                    }
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                    @keyframes fadeSlideUp {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Toast Notification */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    padding: '12px 20px',
                    borderRadius: '10px',
                    background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.9)' 
                        : toast.type === 'error' ? 'rgba(239, 68, 68, 0.9)' 
                        : 'rgba(99, 102, 241, 0.9)',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 500,
                    zIndex: 9999,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    animation: 'fadeSlideUp 0.3s ease',
                }}>
                    {toast.type === 'success' ? '✓ ' : toast.type === 'error' ? '✗ ' : 'ℹ '}
                    {toast.message}
                </div>
            )}

            {/* Test Modal */}
            {showTestModal && testingApi && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                }} onClick={() => setShowTestModal(false)}>
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '90%',
                            maxWidth: '700px',
                            maxHeight: '80vh',
                            overflow: 'auto',
                            background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.98), rgba(49, 46, 129, 0.95))',
                            borderRadius: '20px',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            padding: '28px',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#e2e8f0' }}>
                                🧪 API 테스트: {testingApi.name}
                            </h2>
                            <button onClick={() => setShowTestModal(false)} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '24px', cursor: 'pointer' }}>×</button>
                        </div>

                        {/* Parameters Input */}
                        {testingApi.parameters && testingApi.parameters.length > 0 && (
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ fontSize: '14px', fontWeight: 500, color: '#a5b4fc', marginBottom: '12px' }}>파라미터</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {testingApi.parameters.map(p => (
                                        <div key={p.name} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            <span style={{ color: '#a78bfa', fontFamily: 'monospace', width: '120px' }}>:{p.name}</span>
                                            <input
                                                type={p.type === 'number' ? 'number' : 'text'}
                                                value={testParams[p.name] || ''}
                                                onChange={(e) => setTestParams(prev => ({ ...prev, [p.name]: e.target.value }))}
                                                placeholder={`${p.type}${p.required ? ' (필수)' : ''}`}
                                                style={{
                                                    flex: 1,
                                                    padding: '10px 14px',
                                                    background: 'rgba(15, 23, 42, 0.6)',
                                                    border: '1px solid rgba(99, 102, 241, 0.2)',
                                                    borderRadius: '8px',
                                                    color: '#e2e8f0',
                                                    fontSize: '14px',
                                                    outline: 'none',
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Run Test Button */}
                        <button
                            onClick={runTest}
                            disabled={testing}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: testing ? 'rgba(99, 102, 241, 0.3)' : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                border: 'none',
                                borderRadius: '10px',
                                color: '#fff',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: testing ? 'not-allowed' : 'pointer',
                                marginBottom: '20px',
                            }}
                        >
                            {testing ? '⏳ 실행 중...' : '▶ 테스트 실행'}
                        </button>

                        {/* Test Result */}
                        {testResult && (
                            <div style={{
                                padding: '16px',
                                background: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                borderRadius: '12px',
                                border: `1px solid ${testResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ color: testResult.success ? '#10b981' : '#f87171', fontWeight: 600 }}>
                                        {testResult.success ? '✓ 성공' : '✗ 실패'}
                                    </span>
                                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>
                                        ⏱ {testResult.duration}ms {testResult.rowCount !== undefined && `· ${testResult.rowCount} rows`}
                                    </span>
                                </div>
                                <pre style={{
                                    background: 'rgba(0,0,0,0.3)',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    overflow: 'auto',
                                    maxHeight: '200px',
                                    fontSize: '12px',
                                    color: testResult.success ? '#a5b4fc' : '#fca5a5',
                                    margin: 0,
                                }}>
                                    {testResult.error || JSON.stringify(testResult.data, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Code Snippet Modal */}
            {showSnippetModal && snippetApi && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                }} onClick={() => setShowSnippetModal(false)}>
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '90%',
                            maxWidth: '700px',
                            maxHeight: '80vh',
                            overflow: 'auto',
                            background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.98), rgba(49, 46, 129, 0.95))',
                            borderRadius: '20px',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            padding: '28px',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#e2e8f0' }}>
                                💻 코드 스니펫: {snippetApi.name}
                            </h2>
                            <button onClick={() => setShowSnippetModal(false)} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '24px', cursor: 'pointer' }}>×</button>
                        </div>

                        {/* Language Tabs */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            {(['curl', 'javascript', 'python'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setSnippetType(type)}
                                    style={{
                                        padding: '8px 16px',
                                        background: snippetType === type ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.1)',
                                        border: `1px solid ${snippetType === type ? 'rgba(99, 102, 241, 0.5)' : 'rgba(99, 102, 241, 0.2)'}`,
                                        borderRadius: '8px',
                                        color: snippetType === type ? '#a5b4fc' : '#6b7280',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                    }}
                                >
                                    {type === 'curl' ? '🔗 cURL' : type === 'javascript' ? '🟡 JavaScript' : '🐍 Python'}
                                </button>
                            ))}
                        </div>

                        {/* Code Block */}
                        <pre style={{
                            background: 'rgba(0,0,0,0.4)',
                            padding: '16px',
                            borderRadius: '12px',
                            overflow: 'auto',
                            maxHeight: '300px',
                            fontSize: '13px',
                            color: '#a5b4fc',
                            fontFamily: 'monospace',
                            lineHeight: 1.6,
                            margin: 0,
                            marginBottom: '16px',
                        }}>
                            {generateSnippet(snippetApi, snippetType)}
                        </pre>

                        {/* Copy Button */}
                        <button
                            onClick={copySnippet}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                border: 'none',
                                borderRadius: '10px',
                                color: '#fff',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            📋 코드 복사
                        </button>
                    </div>
                </div>
            )}

            {view === 'list' && (
                <>
                    {/* Header */}
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'flex-start', 
                        marginBottom: '24px',
                        animation: 'fadeSlideUp 0.4s ease-out',
                    }}>
                        <div>
                            <h1 style={{
                                fontSize: '28px',
                                fontWeight: 700,
                                background: 'linear-gradient(90deg, #e0e7ff, #c7d2fe)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                marginBottom: '8px',
                            }}>
                                SQL-to-API Gateway
                            </h1>
                            <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                                SQL 쿼리를 REST API로 변환하세요 · {templates.length}개의 API
                            </p>
                        </div>
                        <button
                            onClick={() => { setView('editor'); resetEditor(); }}
                            style={{
                                padding: '12px 24px',
                                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                border: 'none',
                                borderRadius: '12px',
                                color: '#fff',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                                transition: 'all 0.2s',
                            }}
                        >
                            <span>+</span> 새 API 생성
                        </button>
                    </div>

                    {/* Search */}
                    {templates.length > 0 && (
                        <div style={{ 
                            position: 'relative', 
                            marginBottom: '24px',
                            animation: 'fadeSlideUp 0.4s ease-out',
                            animationDelay: '0.1s',
                            opacity: 0,
                            animationFillMode: 'forwards',
                        }}>
                            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>🔍</span>
                            <input
                                type="text"
                                placeholder="API 이름 또는 SQL 검색..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    maxWidth: '400px',
                                    padding: '14px 16px 14px 48px',
                                    background: 'rgba(30, 27, 75, 0.6)',
                                    border: '1px solid rgba(99, 102, 241, 0.2)',
                                    borderRadius: '12px',
                                    color: '#e2e8f0',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                }}
                            />
                        </div>
                    )}

                    {/* Filter & Sort Controls */}
                    {templates.length > 0 && (
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            marginBottom: '20px',
                            flexWrap: 'wrap',
                            gap: '12px'
                        }}>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {/* Status Filter */}
                                <div style={{ display: 'flex', gap: '4px', background: 'rgba(30, 27, 75, 0.6)', borderRadius: '8px', padding: '4px' }}>
                                    {(['all', 'active', 'inactive'] as const).map(status => (
                                        <button
                                            key={status}
                                            onClick={() => setFilterStatus(status)}
                                            style={{
                                                padding: '6px 12px',
                                                background: filterStatus === status ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                                                border: 'none',
                                                borderRadius: '6px',
                                                color: filterStatus === status ? '#a5b4fc' : '#64748b',
                                                fontSize: '12px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            {status === 'all' ? '전체' : status === 'active' ? '🟢 활성' : '⚫ 비활성'}
                                        </button>
                                    ))}
                                </div>

                                {/* Sort Dropdown */}
                                <select
                                    value={`${sortBy}-${sortOrder}`}
                                    onChange={(e) => {
                                        const [by, order] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
                                        setSortBy(by);
                                        setSortOrder(order);
                                    }}
                                    style={{
                                        padding: '6px 12px',
                                        background: 'rgba(30, 27, 75, 0.6)',
                                        border: '1px solid rgba(99, 102, 241, 0.2)',
                                        borderRadius: '8px',
                                        color: '#a5b4fc',
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        outline: 'none',
                                    }}
                                >
                                    <option value="createdAt-desc">최신순</option>
                                    <option value="createdAt-asc">오래된순</option>
                                    <option value="name-asc">이름 (A-Z)</option>
                                    <option value="name-desc">이름 (Z-A)</option>
                                    <option value="usageCount-desc">많이 사용순</option>
                                    <option value="usageCount-asc">적게 사용순</option>
                                    <option value="lastUsedAt-desc">최근 사용순</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {/* Stats Summary */}
                                <div style={{ 
                                    padding: '6px 12px', 
                                    background: 'rgba(16, 185, 129, 0.1)', 
                                    borderRadius: '8px', 
                                    fontSize: '11px', 
                                    color: '#10b981',
                                    display: 'flex',
                                    gap: '12px',
                                }}>
                                    <span>활성: {templates.filter(t => t.isActive).length}</span>
                                    <span>총 호출: {templates.reduce((sum, t) => sum + (t.usageCount || 0), 0).toLocaleString()}</span>
                                </div>

                                {/* View Mode Toggle */}
                                <div style={{ display: 'flex', gap: '4px', background: 'rgba(30, 27, 75, 0.6)', borderRadius: '8px', padding: '4px' }}>
                                    <button
                                        onClick={() => setListViewMode('card')}
                                        style={{
                                            padding: '6px 10px',
                                            background: listViewMode === 'card' ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                                            border: 'none',
                                            borderRadius: '6px',
                                            color: listViewMode === 'card' ? '#a5b4fc' : '#64748b',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                        }}
                                        title="카드 뷰"
                                    >
                                        ▦
                                    </button>
                                    <button
                                        onClick={() => setListViewMode('table')}
                                        style={{
                                            padding: '6px 10px',
                                            background: listViewMode === 'table' ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                                            border: 'none',
                                            borderRadius: '6px',
                                            color: listViewMode === 'table' ? '#a5b4fc' : '#64748b',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                        }}
                                        title="테이블 뷰"
                                    >
                                        ☰
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* API Cards */}
                    {filteredTemplates.length > 0 ? (
                        <>
                            {/* Table View */}
                            {listViewMode === 'table' && (
                                <div style={{
                                    background: 'rgba(30, 27, 75, 0.5)',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(99, 102, 241, 0.2)',
                                    overflow: 'hidden',
                                }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#a5b4fc', fontSize: '12px', fontWeight: 600, borderBottom: '1px solid rgba(99, 102, 241, 0.2)' }}>이름</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#a5b4fc', fontSize: '12px', fontWeight: 600, borderBottom: '1px solid rgba(99, 102, 241, 0.2)' }}>상태</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#a5b4fc', fontSize: '12px', fontWeight: 600, borderBottom: '1px solid rgba(99, 102, 241, 0.2)' }}>파라미터</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'right', color: '#a5b4fc', fontSize: '12px', fontWeight: 600, borderBottom: '1px solid rgba(99, 102, 241, 0.2)' }}>사용량</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#a5b4fc', fontSize: '12px', fontWeight: 600, borderBottom: '1px solid rgba(99, 102, 241, 0.2)' }}>최근 사용</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'center', color: '#a5b4fc', fontSize: '12px', fontWeight: 600, borderBottom: '1px solid rgba(99, 102, 241, 0.2)' }}>액션</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredTemplates.map((t, idx) => (
                                                <tr 
                                                    key={t.id}
                                                    style={{ 
                                                        borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
                                                        transition: 'background 0.15s',
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <button
                                                                onClick={() => toggleFavoriteApi(t.id, t.name)}
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                                                            >
                                                                {favoriteApis.has(t.id) ? '⭐' : '☆'}
                                                            </button>
                                                            <div>
                                                                <div style={{ color: '#e2e8f0', fontWeight: 500, fontSize: '13px' }}>{t.name}</div>
                                                                {t.description && <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>{t.description.slice(0, 40)}...</div>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <span style={{
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '10px',
                                                            fontWeight: 600,
                                                            background: t.isActive !== false ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                                                            color: t.isActive !== false ? '#10b981' : '#6b7280',
                                                        }}>
                                                            {t.isActive !== false ? '활성' : '비활성'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '12px' }}>
                                                        {t.parameters?.length || 0}개
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#a78bfa', fontSize: '12px', fontFamily: 'monospace' }}>
                                                        {(t.usageCount || 0).toLocaleString()}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '11px' }}>
                                                        {formatRelativeTime(t.lastUsedAt)}
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                            <button onClick={() => { setTestingApi(t); setShowTestModal(true); }} style={{ padding: '4px 8px', background: 'rgba(99, 102, 241, 0.2)', border: 'none', borderRadius: '4px', color: '#a5b4fc', cursor: 'pointer', fontSize: '11px' }}>테스트</button>
                                                            <button onClick={() => handleEditApi(t)} style={{ padding: '4px 8px', background: 'rgba(99, 102, 241, 0.1)', border: 'none', borderRadius: '4px', color: '#94a3b8', cursor: 'pointer', fontSize: '11px' }}>수정</button>
                                                            <button onClick={() => handleDelete(t.id)} style={{ padding: '4px 8px', background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '4px', color: '#f87171', cursor: 'pointer', fontSize: '11px' }}>삭제</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Card View */}
                            {listViewMode === 'card' && (
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
                                    gap: '20px' 
                                }}>
                            {filteredTemplates.map((t, idx) => (
                                <div 
                                    key={t.id} 
                                    style={{
                                        background: 'rgba(30, 27, 75, 0.5)',
                                        borderRadius: '16px',
                                        border: '1px solid rgba(99, 102, 241, 0.2)',
                                        padding: '24px',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        animation: 'fadeSlideUp 0.4s ease-out forwards',
                                        animationDelay: `${0.1 + idx * 0.05}s`,
                                        opacity: 0,
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-4px)';
                                        e.currentTarget.style.boxShadow = '0 15px 40px rgba(99, 102, 241, 0.15)';
                                        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.2)';
                                    }}
                                >
                                    {/* Card Header */}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '12px' }}>
                                        <div style={{
                                            width: '44px',
                                            height: '44px',
                                            borderRadius: '12px',
                                            background: t.isActive !== false 
                                                ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.2))'
                                                : 'rgba(75, 85, 99, 0.3)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '20px',
                                            flexShrink: 0,
                                            opacity: t.isActive !== false ? 1 : 0.6,
                                        }}>
                                            🌐
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <h3 style={{ 
                                                    fontSize: '16px', 
                                                    fontWeight: 600, 
                                                    color: t.isActive !== false ? '#e2e8f0' : '#9ca3af', 
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    margin: 0,
                                                }}>
                                                    {t.name}
                                                </h3>
                                                {/* Active/Inactive Badge */}
                                                <span style={{
                                                    padding: '2px 6px',
                                                    background: t.isActive !== false ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                    borderRadius: '4px',
                                                    fontSize: '10px',
                                                    color: t.isActive !== false ? '#10b981' : '#f87171',
                                                    fontWeight: 600,
                                                }}>
                                                    {t.isActive !== false ? 'ON' : 'OFF'}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                <span style={{
                                                    padding: '2px 6px',
                                                    background: 'rgba(16, 185, 129, 0.15)',
                                                    borderRadius: '4px',
                                                    fontSize: '10px',
                                                    color: '#10b981',
                                                    fontWeight: 500,
                                                }}>
                                                    POST
                                                </span>
                                                <span style={{
                                                    padding: '2px 6px',
                                                    background: 'rgba(139, 92, 246, 0.15)',
                                                    borderRadius: '4px',
                                                    fontSize: '10px',
                                                    color: '#a78bfa',
                                                    fontWeight: 500,
                                                }}>
                                                    {t.parameters?.length || 0} params
                                                </span>
                                                {/* Usage Count */}
                                                <span style={{
                                                    padding: '2px 6px',
                                                    background: 'rgba(251, 191, 36, 0.15)',
                                                    borderRadius: '4px',
                                                    fontSize: '10px',
                                                    color: '#fbbf24',
                                                    fontWeight: 500,
                                                }}>
                                                    📊 {t.usageCount || 0} calls
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    {t.description && (
                                        <div style={{ 
                                            fontSize: '12px', 
                                            color: '#94a3b8', 
                                            marginBottom: '12px',
                                            lineHeight: 1.4,
                                        }}>
                                            {t.description}
                                        </div>
                                    )}

                                    {/* SQL Preview */}
                                    <div style={{
                                        padding: '10px 12px',
                                        background: 'rgba(15, 23, 42, 0.6)',
                                        borderRadius: '8px',
                                        marginBottom: '12px',
                                        overflow: 'hidden',
                                    }}>
                                        <code style={{ 
                                            fontSize: '11px', 
                                            color: '#94a3b8',
                                            display: 'block',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {t.sql}
                                        </code>
                                    </div>

                                    {/* Last Used */}
                                    <div style={{ 
                                        fontSize: '11px', 
                                        color: '#6b7280', 
                                        marginBottom: '12px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                    }}>
                                        <span>🕐 {formatRelativeTime(t.lastUsedAt)}</span>
                                        {t.cacheTtl && t.cacheTtl > 0 && (
                                            <span>⚡ 캐시 {t.cacheTtl}초</span>
                                        )}
                                    </div>

                                    {/* Primary Actions */}
                                    <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                                        <button
                                            onClick={() => openTestModal(t)}
                                            style={{
                                                flex: 1,
                                                padding: '8px',
                                                background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1))',
                                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                                borderRadius: '8px',
                                                color: '#10b981',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                            }}
                                        >
                                            🧪 테스트
                                        </button>
                                        <button
                                            onClick={() => openSnippetModal(t)}
                                            style={{
                                                flex: 1,
                                                padding: '8px',
                                                background: 'rgba(139, 92, 246, 0.1)',
                                                border: '1px solid rgba(139, 92, 246, 0.2)',
                                                borderRadius: '8px',
                                                color: '#a78bfa',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                            }}
                                        >
                                            💻 코드
                                        </button>
                                        <button
                                            onClick={() => handleCopyEndpoint(t.id)}
                                            style={{
                                                flex: 1,
                                                padding: '8px',
                                                background: copiedKey === `endpoint-${t.id}` ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.1)',
                                                border: `1px solid ${copiedKey === `endpoint-${t.id}` ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.2)'}`,
                                                borderRadius: '8px',
                                                color: copiedKey === `endpoint-${t.id}` ? '#10b981' : '#a5b4fc',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                            }}
                                        >
                                            {copiedKey === `endpoint-${t.id}` ? '✓' : '🔗 URL'}
                                        </button>
                                    </div>

                                    {/* Secondary Actions */}
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button
                                            onClick={() => handleToggleActive(t.id)}
                                            style={{
                                                padding: '6px 10px',
                                                background: t.isActive !== false ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                border: `1px solid ${t.isActive !== false ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                                                borderRadius: '6px',
                                                color: t.isActive !== false ? '#f87171' : '#10b981',
                                                cursor: 'pointer',
                                                fontSize: '11px',
                                            }}
                                            title={t.isActive !== false ? '비활성화' : '활성화'}
                                        >
                                            {t.isActive !== false ? '⏸️' : '▶️'}
                                        </button>
                                        <button
                                            onClick={() => handleDuplicate(t.id)}
                                            style={{
                                                padding: '6px 10px',
                                                background: 'rgba(99, 102, 241, 0.1)',
                                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                                borderRadius: '6px',
                                                color: '#a5b4fc',
                                                cursor: 'pointer',
                                                fontSize: '11px',
                                            }}
                                            title="복제"
                                        >
                                            📄
                                        </button>
                                        <button
                                            onClick={() => window.open(`/api/sql-api/${t.id}/openapi`, '_blank')}
                                            style={{
                                                padding: '6px 10px',
                                                background: 'rgba(251, 191, 36, 0.1)',
                                                border: '1px solid rgba(251, 191, 36, 0.2)',
                                                borderRadius: '6px',
                                                color: '#fbbf24',
                                                cursor: 'pointer',
                                                fontSize: '11px',
                                            }}
                                            title="API 문서"
                                        >
                                            📖
                                        </button>
                                        <button
                                            onClick={() => toggleFavoriteApi(t.id, t.name)}
                                            style={{
                                                padding: '6px 10px',
                                                background: favoriteApis.has(t.id) ? 'rgba(251, 191, 36, 0.2)' : 'rgba(251, 191, 36, 0.1)',
                                                border: `1px solid ${favoriteApis.has(t.id) ? 'rgba(251, 191, 36, 0.4)' : 'rgba(251, 191, 36, 0.2)'}`,
                                                borderRadius: '6px',
                                                color: '#fbbf24',
                                                cursor: 'pointer',
                                                fontSize: '11px',
                                                transition: 'all 0.2s',
                                            }}
                                            title={favoriteApis.has(t.id) ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                                        >
                                            {favoriteApis.has(t.id) ? '⭐' : '☆'}
                                        </button>
                                        <div style={{ flex: 1 }} />
                                        <button
                                            onClick={() => handleEditApi(t)}
                                            style={{
                                                padding: '6px 10px',
                                                background: 'rgba(59, 130, 246, 0.1)',
                                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                                borderRadius: '6px',
                                                color: '#60a5fa',
                                                cursor: 'pointer',
                                                fontSize: '11px',
                                            }}
                                            title="수정"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleDelete(t.id)}
                                            style={{
                                                padding: '6px 10px',
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                                borderRadius: '6px',
                                                color: '#f87171',
                                                cursor: 'pointer',
                                                fontSize: '11px',
                                            }}
                                            title="삭제"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                            )}
                        </>
                    ) : templates.length === 0 ? (
                        <div style={{
                            padding: '80px 40px',
                            textAlign: 'center',
                            background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.6), rgba(49, 46, 129, 0.3))',
                            borderRadius: '20px',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            animation: 'fadeSlideUp 0.4s ease-out',
                        }}>
                            <div style={{ 
                                fontSize: '64px', 
                                marginBottom: '20px',
                                animation: 'float 3s ease-in-out infinite',
                            }}>🌐</div>
                            <h3 style={{ fontSize: '20px', color: '#e2e8f0', marginBottom: '10px', fontWeight: 600 }}>
                                API가 없습니다
                            </h3>
                            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
                                SQL 쿼리를 REST API로 변환하세요
                            </p>
                            <button
                                onClick={() => { setView('editor'); resetEditor(); }}
                                style={{
                                    padding: '14px 28px',
                                    background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                    border: 'none',
                                    borderRadius: '12px',
                                    color: '#fff',
                                    fontSize: '15px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                                }}
                            >
                                + 첫 API 생성하기
                            </button>
                        </div>
                    ) : (
                        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                            검색 결과가 없습니다
                        </div>
                    )}
                </>
            )}

            {view === 'editor' && (
                <div style={{ 
                    animation: 'fadeSlideUp 0.4s ease-out',
                    display: 'flex',
                    flexDirection: 'column',
                    height: 'calc(100vh - 120px)',
                }}>
                    {/* Compact Header - SQL Editor Style */}
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        gap: '16px',
                        padding: '12px 16px',
                        background: 'rgba(30, 27, 75, 0.6)',
                        borderRadius: '12px 12px 0 0',
                        borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
                    }}>
                        {/* Back Button */}
                        <button
                            onClick={() => setView('list')}
                            style={{
                                background: 'rgba(99, 102, 241, 0.1)',
                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                color: '#a5b4fc',
                                cursor: 'pointer',
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                            }}
                        >
                            ← 목록
                        </button>

                        {/* API Name Input */}
                        <input
                            type="text"
                            placeholder="API 이름 *"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={{
                                flex: 1,
                                maxWidth: '280px',
                                padding: '8px 14px',
                                background: 'rgba(15, 23, 42, 0.6)',
                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                borderRadius: '8px',
                                color: '#e2e8f0',
                                fontSize: '14px',
                                outline: 'none',
                            }}
                        />

                        {/* Connection Select */}
                        <select
                            value={connectionId}
                            onChange={(e) => { setConnectionId(e.target.value); setConnectionStatus('unknown'); }}
                            style={{
                                padding: '8px 14px',
                                background: 'rgba(15, 23, 42, 0.6)',
                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                borderRadius: '8px',
                                color: '#e2e8f0',
                                fontSize: '13px',
                                outline: 'none',
                                cursor: 'pointer',
                                minWidth: '160px',
                            }}
                        >
                            <option value="">연결 선택 *</option>
                            {connections.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>

                        {/* Visibility Select */}
                        <select
                            value={visibility}
                            onChange={(e) => setVisibility(e.target.value as 'private' | 'group' | 'public')}
                            style={{
                                padding: '8px 14px',
                                background: 'rgba(15, 23, 42, 0.6)',
                                border: `1px solid ${visibility === 'public' ? 'rgba(16, 185, 129, 0.3)' : visibility === 'group' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(99, 102, 241, 0.2)'}`,
                                borderRadius: '8px',
                                color: visibility === 'public' ? '#10b981' : visibility === 'group' ? '#fbbf24' : '#a5b4fc',
                                fontSize: '12px',
                                outline: 'none',
                                cursor: 'pointer',
                                minWidth: '120px',
                            }}
                            title="API 공개 범위"
                        >
                            <option value="private">🔒 비공개</option>
                            <option value="group">👥 그룹 공유</option>
                            <option value="public">🌐 전체 공개</option>
                        </select>

                        <div style={{ flex: 1 }} />

                        {/* Test Button */}
                        <button
                            onClick={runInlineQueryTest}
                            disabled={inlineTesting || !connectionId}
                            style={{
                                padding: '8px 16px',
                                background: 'rgba(16, 185, 129, 0.2)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                borderRadius: '8px',
                                color: '#10b981',
                                fontSize: '13px',
                                fontWeight: 500,
                                cursor: connectionId ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                            }}
                        >
                            {inlineTesting ? '⏳' : '▶'} 테스트
                        </button>

                        {/* Save Button */}
                        <button
                            onClick={handleSave}
                            disabled={saving || !name || !connectionId}
                            style={{
                                padding: '8px 20px',
                                background: (name && connectionId) 
                                    ? 'linear-gradient(90deg, #6366f1, #8b5cf6)' 
                                    : 'rgba(99, 102, 241, 0.3)',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: (saving || !name || !connectionId) ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: (name && connectionId) ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none',
                            }}
                        >
                            {saving ? '⏳' : '💾'} 저장
                        </button>
                    </div>

                    {/* Split-Pane Layout */}
                    <div style={{
                        display: 'flex',
                        flex: 1,
                        background: 'rgba(30, 27, 75, 0.4)',
                        borderRadius: '0 0 12px 12px',
                        overflow: 'hidden',
                    }}>
                        {/* Left Panel: SQL Editor */}
                        <div style={{
                            flex: leftPanelWidth,
                            display: 'flex',
                            flexDirection: 'column',
                            borderRight: '1px solid rgba(99, 102, 241, 0.2)',
                            overflow: 'hidden',
                        }}>
                        {/* SQL Editor with minimal header - existing code continues below */}
                        <div style={{
                            background: 'rgba(30, 27, 75, 0.5)',
                            borderRadius: '16px',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid rgba(99, 102, 241, 0.15)',
                                display: 'flex',
                                gap: '16px',
                                alignItems: 'center',
                            }}>
                                <input
                                    type="text"
                                    placeholder="API 이름 *"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: '10px 14px',
                                        background: 'rgba(15, 23, 42, 0.6)',
                                        border: '1px solid rgba(99, 102, 241, 0.2)',
                                        borderRadius: '8px',
                                        color: '#e2e8f0',
                                        fontSize: '14px',
                                        outline: 'none',
                                    }}
                                />
                                <select
                                    value={connectionId}
                                    onChange={(e) => setConnectionId(e.target.value)}
                                    style={{
                                        padding: '10px 14px',
                                        background: 'rgba(15, 23, 42, 0.6)',
                                        border: '1px solid rgba(99, 102, 241, 0.2)',
                                        borderRadius: '8px',
                                        color: '#e2e8f0',
                                        fontSize: '14px',
                                        outline: 'none',
                                        cursor: 'pointer',
                                        minWidth: '180px',
                                    }}
                                >
                                    <option value="">연결 선택 *</option>
                                    {connections.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Enhanced Editor Toolbar */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '10px 16px',
                                background: 'rgba(15, 23, 42, 0.4)',
                                borderBottom: '1px solid rgba(99, 102, 241, 0.15)',
                                gap: '12px',
                                flexWrap: 'wrap',
                            }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    {/* Templates Dropdown */}
                                    <div style={{ position: 'relative' }}>
                                        <button
                                            onClick={() => { setShowTemplatesDropdown(!showTemplatesDropdown); setShowSnippetsDropdown(false); }}
                                            style={{
                                                padding: '6px 12px',
                                                background: showTemplatesDropdown ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.15)',
                                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                                borderRadius: '6px',
                                                color: '#a5b4fc',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                            }}
                                        >
                                            📝 템플릿 ▾
                                        </button>
                                        {showTemplatesDropdown && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '100%',
                                                left: 0,
                                                marginTop: '4px',
                                                width: '280px',
                                                background: 'rgba(30, 27, 75, 0.98)',
                                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                                borderRadius: '10px',
                                                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                                                zIndex: 50,
                                                overflow: 'hidden',
                                            }}>
                                                <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(99, 102, 241, 0.2)', fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                                                    SQL 템플릿 선택
                                                </div>
                                                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                                    {SQL_TEMPLATES.map((t, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => insertTemplate(t)}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '10px',
                                                                width: '100%',
                                                                padding: '10px 12px',
                                                                background: 'transparent',
                                                                border: 'none',
                                                                borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
                                                                color: '#e2e8f0',
                                                                cursor: 'pointer',
                                                                textAlign: 'left',
                                                                fontSize: '12px',
                                                                transition: 'background 0.15s',
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)'}
                                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                        >
                                                            <span style={{ fontSize: '16px' }}>{t.icon}</span>
                                                            <div>
                                                                <div style={{ fontWeight: 500 }}>{t.name}</div>
                                                                <div style={{ fontSize: '10px', color: '#64748b' }}>{t.desc}</div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Snippets Dropdown */}
                                    <div style={{ position: 'relative' }}>
                                        <button
                                            onClick={() => { setShowSnippetsDropdown(!showSnippetsDropdown); setShowTemplatesDropdown(false); }}
                                            style={{
                                                padding: '6px 12px',
                                                background: showSnippetsDropdown ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.15)',
                                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                                borderRadius: '6px',
                                                color: '#a5b4fc',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                            }}
                                        >
                                            ⚡ 스니펫 ▾
                                        </button>
                                        {showSnippetsDropdown && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '100%',
                                                left: 0,
                                                marginTop: '4px',
                                                width: '240px',
                                                background: 'rgba(30, 27, 75, 0.98)',
                                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                                borderRadius: '10px',
                                                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                                                zIndex: 50,
                                                overflow: 'hidden',
                                            }}>
                                                <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(99, 102, 241, 0.2)', fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                                                    SQL 스니펫 추가
                                                </div>
                                                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                                    {SQL_SNIPPETS.map((s, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => insertSnippet(s)}
                                                            style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                width: '100%',
                                                                padding: '8px 12px',
                                                                background: 'transparent',
                                                                border: 'none',
                                                                borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
                                                                color: '#e2e8f0',
                                                                cursor: 'pointer',
                                                                textAlign: 'left',
                                                                fontSize: '12px',
                                                                transition: 'background 0.15s',
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)'}
                                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                        >
                                                            <span style={{ fontWeight: 500, color: '#a78bfa' }}>{s.name}</span>
                                                            <span style={{ fontSize: '10px', color: '#64748b' }}>{s.desc}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ width: '1px', height: '20px', background: 'rgba(99, 102, 241, 0.2)' }} />

                                    {/* Format Button */}
                                    <button
                                        onClick={() => { setSql(formatSQL(sql)); showToast('SQL 포맷팅 완료', 'success'); }}
                                        title="SQL 포맷 (Ctrl+Shift+F)"
                                        style={{
                                            padding: '6px 10px',
                                            background: 'rgba(99, 102, 241, 0.1)',
                                            border: '1px solid rgba(99, 102, 241, 0.2)',
                                            borderRadius: '6px',
                                            color: '#94a3b8',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                        }}
                                    >
                                        ✨
                                    </button>

                                    {/* Copy Button */}
                                    <button
                                        onClick={copySqlToClipboard}
                                        title="SQL 복사"
                                        style={{
                                            padding: '6px 10px',
                                            background: 'rgba(99, 102, 241, 0.1)',
                                            border: '1px solid rgba(99, 102, 241, 0.2)',
                                            borderRadius: '6px',
                                            color: '#94a3b8',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                        }}
                                    >
                                        📋
                                    </button>

                                    {/* Clear Button */}
                                    <button
                                        onClick={() => { setSql(''); showToast('SQL 초기화됨', 'info'); }}
                                        title="SQL 초기화"
                                        style={{
                                            padding: '6px 10px',
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                            borderRadius: '6px',
                                            color: '#f87171',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                        }}
                                    >
                                        🗑️
                                    </button>

                                    {/* Word Wrap Toggle */}
                                    <button
                                        onClick={() => setWordWrap(!wordWrap)}
                                        title={wordWrap ? 'Word Wrap 끄기' : 'Word Wrap 켜기'}
                                        style={{
                                            padding: '6px 10px',
                                            background: wordWrap ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.1)',
                                            border: '1px solid rgba(99, 102, 241, 0.2)',
                                            borderRadius: '6px',
                                            color: wordWrap ? '#a5b4fc' : '#64748b',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                        }}
                                    >
                                        ↩️
                                    </button>
                                </div>

                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    {/* Query Complexity Indicator */}
                                    <div style={{
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: 500,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        background: getQueryComplexity() === 'high' ? 'rgba(239, 68, 68, 0.15)' : getQueryComplexity() === 'medium' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                        color: getQueryComplexity() === 'high' ? '#f87171' : getQueryComplexity() === 'medium' ? '#fbbf24' : '#10b981',
                                    }} title="쿼리 복잡도. 높으면 LIMIT나 인덱스를 고려하세요.">
                                        {getQueryComplexity() === 'high' ? '🔴' : getQueryComplexity() === 'medium' ? '🟡' : '🟢'}
                                        {getQueryComplexity().toUpperCase()}
                                    </div>

                                    {/* AI Assist Button */}
                                    <button
                                        onClick={() => setShowAiAssist(!showAiAssist)}
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '11px',
                                            fontWeight: 500,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            background: showAiAssist ? 'rgba(168, 85, 247, 0.3)' : 'rgba(168, 85, 247, 0.15)',
                                            color: '#c084fc',
                                            border: showAiAssist ? '1px solid rgba(168, 85, 247, 0.5)' : 'none',
                                            cursor: 'pointer',
                                        }}
                                        title="AI로 SQL 생성"
                                    >
                                        ✨ AI Assist
                                    </button>

                                    {/* Connection Status */}
                                    <button
                                        onClick={testConnection}
                                        disabled={!connectionId || connectionStatus === 'testing'}
                                        title="연결 테스트"
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '11px',
                                            fontWeight: 500,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            background: connectionStatus === 'connected' ? 'rgba(16, 185, 129, 0.15)' : connectionStatus === 'failed' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.1)',
                                            color: connectionStatus === 'connected' ? '#10b981' : connectionStatus === 'failed' ? '#f87171' : '#94a3b8',
                                            border: 'none',
                                            cursor: connectionId ? 'pointer' : 'not-allowed',
                                        }}
                                    >
                                        <span style={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            background: connectionStatus === 'connected' ? '#10b981' : connectionStatus === 'failed' ? '#ef4444' : connectionStatus === 'testing' ? '#f59e0b' : '#64748b',
                                            animation: connectionStatus === 'testing' ? 'pulse 1s infinite' : 'none',
                                        }} />
                                        {connectionStatus === 'testing' ? '테스트 중...' : connectionStatus === 'connected' ? '연결됨' : connectionStatus === 'failed' ? '실패' : '연결 테스트'}
                                    </button>

                                    {/* Keyboard Shortcuts Hint */}
                                    <div style={{ fontSize: '10px', color: '#64748b' }}>
                                        F5/Ctrl+Enter 실행 | Ctrl+S 저장
                                    </div>
                                </div>
                            </div>

                            {/* AI Assist Panel */}
                            {showAiAssist && (
                                <div style={{
                                    marginBottom: '12px',
                                    padding: '16px',
                                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(99, 102, 241, 0.1))',
                                    border: '1px solid rgba(168, 85, 247, 0.3)',
                                    borderRadius: '12px',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                        <span style={{ fontSize: '16px' }}>✨</span>
                                        <span style={{ fontWeight: 600, color: '#c084fc' }}>AI SQL 생성</span>
                                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                            원하는 쿼리를 자연어로 설명하세요
                                        </span>
                                        <div style={{ flex: 1 }} />
                                        <button
                                            onClick={() => setShowAiAssist(false)}
                                            style={{
                                                padding: '4px 8px',
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#64748b',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="text"
                                            value={aiPrompt}
                                            onChange={(e) => setAiPrompt(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && generateSqlWithAI()}
                                            placeholder="예: 최근 30일간 사용자별 주문 수와 총액을 조회해줘"
                                            style={{
                                                flex: 1,
                                                padding: '10px 14px',
                                                background: 'rgba(15, 23, 42, 0.6)',
                                                border: '1px solid rgba(168, 85, 247, 0.2)',
                                                borderRadius: '8px',
                                                color: '#e2e8f0',
                                                fontSize: '13px',
                                                outline: 'none',
                                            }}
                                        />
                                        <button
                                            onClick={generateSqlWithAI}
                                            disabled={aiLoading || !aiPrompt.trim()}
                                            style={{
                                                padding: '10px 20px',
                                                background: aiLoading ? 'rgba(168, 85, 247, 0.3)' : 'linear-gradient(90deg, rgba(168, 85, 247, 0.4), rgba(99, 102, 241, 0.4))',
                                                border: '1px solid rgba(168, 85, 247, 0.4)',
                                                borderRadius: '8px',
                                                color: '#e2e8f0',
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                cursor: aiLoading || !aiPrompt.trim() ? 'not-allowed' : 'pointer',
                                                opacity: aiLoading || !aiPrompt.trim() ? 0.6 : 1,
                                            }}
                                        >
                                            {aiLoading ? '⏳ 생성 중...' : '🚀 생성'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div style={{ height: '400px' }}>
                                <MonacoEditor
                                    height="100%"
                                    defaultLanguage="sql"
                                    theme="vs-dark"
                                    value={sql}
                                    onChange={(val) => setSql(val || '')}
                                    onMount={(editor, monaco) => {
                                        editorRef.current = editor;
                                        
                                        // F5 keybinding for run query
                                        editor.addAction({
                                            id: 'run-query',
                                            label: 'Run Query',
                                            keybindings: [monaco.KeyCode.F5],
                                            run: () => {
                                                if (connectionId && !inlineTesting) {
                                                    setShowInlineTestPanel(true);
                                                    runInlineQueryTest();
                                                }
                                            }
                                        });
                                        
                                        // SQL Autocomplete with schema info
                                        const sqlKeywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL', 'ORDER', 'BY', 'ASC', 'DESC', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'TABLE', 'INDEX', 'VIEW', 'AS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'UNION', 'ALL', 'EXISTS', 'COALESCE', 'IFNULL', 'CAST'];
                                        
                                        monaco.languages.registerCompletionItemProvider('sql', {
                                            provideCompletionItems: (model: any, position: any) => {
                                                const word = model.getWordUntilPosition(position);
                                                const range = {
                                                    startLineNumber: position.lineNumber,
                                                    endLineNumber: position.lineNumber,
                                                    startColumn: word.startColumn,
                                                    endColumn: word.endColumn,
                                                };
                                                
                                                const suggestions: any[] = [];
                                                
                                                // SQL Keywords
                                                sqlKeywords.forEach(kw => {
                                                    suggestions.push({
                                                        label: kw,
                                                        kind: monaco.languages.CompletionItemKind.Keyword,
                                                        insertText: kw,
                                                        range,
                                                    });
                                                });
                                                
                                                // Tables from schema
                                                schemaInfo.tables.forEach(table => {
                                                    suggestions.push({
                                                        label: table,
                                                        kind: monaco.languages.CompletionItemKind.Class,
                                                        insertText: table,
                                                        detail: 'Table',
                                                        range,
                                                    });
                                                });
                                                
                                                // Columns from schema
                                                Object.entries(schemaInfo.columns).forEach(([table, cols]) => {
                                                    cols.forEach(col => {
                                                        suggestions.push({
                                                            label: col,
                                                            kind: monaco.languages.CompletionItemKind.Field,
                                                            insertText: col,
                                                            detail: `Column (${table})`,
                                                            range,
                                                        });
                                                    });
                                                });
                                                
                                                return { suggestions };
                                            }
                                        });
                                    }}
                                    options={{
                                        minimap: { enabled: false },
                                        fontSize: 14,
                                        padding: { top: 16 },
                                        scrollBeyondLastLine: false,
                                        wordWrap: wordWrap ? 'on' : 'off',
                                        quickSuggestions: true,
                                        suggestOnTriggerCharacters: true,
                                    }}
                                />
                            </div>
                        </div>

                        {/* Right: Parameters */}
                        <div style={{
                            flex: 40, // Take remaining space 
                            background: 'rgba(30, 27, 75, 0.5)',
                            borderRadius: '16px',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            padding: '20px',
                            maxHeight: 'calc(100vh - 300px)', // Limit height
                            overflow: 'auto', // Enable scrolling
                            display: 'flex',
                            flexDirection: 'column',
                        }}>
                            <h3 style={{ 
                                fontSize: '14px', 
                                fontWeight: 600, 
                                color: '#e2e8f0', 
                                marginBottom: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}>
                                📝 파라미터 설정
                            </h3>
                            
                            {params.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {params.map((p, idx) => (
                                        <div 
                                            key={p.name}
                                            style={{
                                                padding: '14px',
                                                background: 'rgba(15, 23, 42, 0.6)',
                                                borderRadius: '10px',
                                                border: '1px solid rgba(99, 102, 241, 0.15)',
                                            }}
                                        >
                                            <div style={{ 
                                                fontSize: '13px', 
                                                fontFamily: 'monospace', 
                                                color: '#a78bfa', 
                                                marginBottom: '10px',
                                                fontWeight: 600,
                                            }}>
                                                :{p.name}
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <select
                                                    value={p.type}
                                                    onChange={(e) => {
                                                        const newParams = [...params];
                                                        newParams[idx].type = e.target.value;
                                                        setParams(newParams);
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px 10px',
                                                        background: 'rgba(30, 27, 75, 0.8)',
                                                        border: '1px solid rgba(99, 102, 241, 0.2)',
                                                        borderRadius: '6px',
                                                        color: '#e2e8f0',
                                                        fontSize: '12px',
                                                        outline: 'none',
                                                    }}
                                                >
                                                    <option value="string">String</option>
                                                    <option value="number">Number</option>
                                                    <option value="boolean">Boolean</option>
                                                </select>
                                                <label style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: '6px',
                                                    fontSize: '12px',
                                                    color: '#94a3b8',
                                                    cursor: 'pointer',
                                                }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={p.required}
                                                        onChange={(e) => {
                                                            const newParams = [...params];
                                                            newParams[idx].required = e.target.checked;
                                                            setParams(newParams);
                                                        }}
                                                        style={{ accentColor: '#6366f1' }}
                                                    />
                                                    필수
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{
                                    padding: '30px',
                                    textAlign: 'center',
                                    color: '#64748b',
                                    fontSize: '13px',
                                }}>
                                    <div style={{ fontSize: '28px', marginBottom: '10px', opacity: 0.5 }}>📝</div>
                                    SQL에서 <code style={{ color: '#a78bfa' }}>:paramName</code><br/>
                                    형식으로 파라미터 정의
                                </div>
                            )}

                            {/* Tips */}
                            <div style={{
                                marginTop: '20px',
                                padding: '14px',
                                background: 'rgba(99, 102, 241, 0.1)',
                                borderRadius: '10px',
                                border: '1px solid rgba(99, 102, 241, 0.2)',
                            }}>
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', fontWeight: 500 }}>
                                    💡 사용법
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.6 }}>
                                    • SQL에 <code style={{ color: '#a78bfa' }}>:userId</code> 형식 사용<br/>
                                    • API 호출 시 파라미터로 전달<br/>
                                    • 자동 SQL Injection 방지
                                </div>
                            </div>

                            {/* Inline Query Test Panel */}
                            <div style={{
                                marginTop: '20px',
                                padding: '16px',
                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(6, 182, 212, 0.1))',
                                borderRadius: '12px',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                            }}>
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    marginBottom: showInlineTestPanel ? '14px' : 0,
                                }}>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        🧪 쿼리 테스트
                                    </div>
                                    <button
                                        onClick={() => setShowInlineTestPanel(!showInlineTestPanel)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#10b981',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                        }}
                                    >
                                        {showInlineTestPanel ? '▲ 접기' : '▼ 펼치기'}
                                    </button>
                                </div>

                                {showInlineTestPanel && (
                                    <>
                                        {/* Test Parameter Inputs */}
                                        {params.length > 0 && (
                                            <div style={{ marginBottom: '12px' }}>
                                                <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>테스트 파라미터 값 입력:</div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {params.map(p => (
                                                        <div key={p.name} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                            <span style={{ 
                                                                fontSize: '11px', 
                                                                color: '#a78bfa', 
                                                                fontFamily: 'monospace',
                                                                minWidth: '80px',
                                                            }}>
                                                                :{p.name}
                                                            </span>
                                                            <input
                                                                type={p.type === 'number' ? 'number' : 'text'}
                                                                value={inlineTestParams[p.name] || ''}
                                                                onChange={(e) => setInlineTestParams(prev => ({
                                                                    ...prev,
                                                                    [p.name]: e.target.value
                                                                }))}
                                                                placeholder={p.type}
                                                                style={{
                                                                    flex: 1,
                                                                    padding: '6px 10px',
                                                                    background: 'rgba(15, 23, 42, 0.6)',
                                                                    border: '1px solid rgba(99, 102, 241, 0.2)',
                                                                    borderRadius: '6px',
                                                                    color: '#e2e8f0',
                                                                    fontSize: '12px',
                                                                    outline: 'none',
                                                                }}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Run Test Button */}
                                        <button
                                            onClick={runInlineQueryTest}
                                            disabled={inlineTesting || !connectionId}
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                background: inlineTesting ? 'rgba(16, 185, 129, 0.3)' : 'linear-gradient(90deg, #10b981, #06b6d4)',
                                                border: 'none',
                                                borderRadius: '8px',
                                                color: '#fff',
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                cursor: inlineTesting || !connectionId ? 'not-allowed' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            {inlineTesting ? (
                                                <>⏳ 실행 중...</>
                                            ) : (
                                                <>▶ 쿼리 테스트 실행</>
                                            )}
                                        </button>

                                        {/* Test Result */}
                                        {inlineTestResult && (
                                            <div style={{
                                                marginTop: '12px',
                                                background: inlineTestResult.success ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.1)',
                                                borderRadius: '10px',
                                                border: `1px solid ${inlineTestResult.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.3)'}`,
                                                overflow: 'hidden',
                                                maxHeight: '300px', // Limit height to prevent covering editor
                                                display: 'flex',
                                                flexDirection: 'column',
                                            }}>
                                                {/* Result Header */}
                                                <div style={{ 
                                                    display: 'flex', 
                                                    justifyContent: 'space-between', 
                                                    alignItems: 'center',
                                                    padding: '10px 12px',
                                                    background: inlineTestResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.15)',
                                                    borderBottom: `1px solid ${inlineTestResult.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                                }}>
                                                    <span style={{ 
                                                        color: inlineTestResult.success ? '#10b981' : '#f87171', 
                                                        fontWeight: 600,
                                                        fontSize: '12px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                    }}>
                                                        {inlineTestResult.success ? '✓ 실행 성공' : '✗ 실행 실패'}
                                                    </span>
                                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                        {/* Export Buttons */}
                                                        {inlineTestResult.success && inlineTestResult.data?.length > 0 && (
                                                            <>
                                                                <button
                                                                    onClick={exportResultsCSV}
                                                                    title="CSV 다운로드"
                                                                    style={{
                                                                        padding: '4px 8px',
                                                                        background: 'rgba(99, 102, 241, 0.2)',
                                                                        border: 'none',
                                                                        borderRadius: '4px',
                                                                        color: '#a5b4fc',
                                                                        cursor: 'pointer',
                                                                        fontSize: '10px',
                                                                    }}
                                                                >
                                                                    📥 CSV
                                                                </button>
                                                                <button
                                                                    onClick={exportResultsJSON}
                                                                    title="JSON 다운로드"
                                                                    style={{
                                                                        padding: '4px 8px',
                                                                        background: 'rgba(99, 102, 241, 0.2)',
                                                                        border: 'none',
                                                                        borderRadius: '4px',
                                                                        color: '#a5b4fc',
                                                                        cursor: 'pointer',
                                                                        fontSize: '10px',
                                                                    }}
                                                                >
                                                                    📥 JSON
                                                                </button>
                                                                <button
                                                                    onClick={copyResultsToClipboard}
                                                                    title="클립보드 복사"
                                                                    style={{
                                                                        padding: '4px 8px',
                                                                        background: 'rgba(99, 102, 241, 0.2)',
                                                                        border: 'none',
                                                                        borderRadius: '4px',
                                                                        color: '#a5b4fc',
                                                                        cursor: 'pointer',
                                                                        fontSize: '10px',
                                                                    }}
                                                                >
                                                                    📋 복사
                                                                </button>
                                                            </>
                                                        )}
                                                        <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                                                            ⏱ {inlineTestResult.duration}ms
                                                            {inlineTestResult.rowCount !== undefined && ` · ${inlineTestResult.rowCount} rows`}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Error Display */}
                                                {inlineTestResult.error && (
                                                    <div style={{
                                                        padding: '12px',
                                                        color: '#fca5a5',
                                                        fontSize: '12px',
                                                        background: 'rgba(239, 68, 68, 0.1)',
                                                    }}>
                                                        <strong>Error:</strong> {inlineTestResult.error}
                                                    </div>
                                                )}

                                                {/* Results Table */}
                                                {inlineTestResult.success && inlineTestResult.data && Array.isArray(inlineTestResult.data) && inlineTestResult.data.length > 0 && (
                                                    <div style={{ 
                                                        flex: 1,
                                                        maxHeight: '200px', 
                                                        overflow: 'auto',
                                                    }}>
                                                        <table style={{ 
                                                            width: '100%', 
                                                            borderCollapse: 'collapse',
                                                            fontSize: '11px',
                                                        }}>
                                                            <thead>
                                                                <tr style={{ 
                                                                    background: 'rgba(99, 102, 241, 0.1)',
                                                                    position: 'sticky',
                                                                    top: 0,
                                                                }}>
                                                                    <th style={{
                                                                        padding: '8px 10px',
                                                                        textAlign: 'center',
                                                                        color: '#94a3b8',
                                                                        fontWeight: 600,
                                                                        borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
                                                                        width: '40px',
                                                                        background: 'rgba(15, 23, 42, 0.8)',
                                                                    }}>
                                                                        #
                                                                    </th>
                                                                    {Object.keys(inlineTestResult.data[0]).map((key) => (
                                                                        <th 
                                                                            key={key}
                                                                            style={{
                                                                                padding: '8px 10px',
                                                                                textAlign: 'left',
                                                                                color: '#a5b4fc',
                                                                                fontWeight: 600,
                                                                                borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
                                                                                whiteSpace: 'nowrap',
                                                                                background: 'rgba(15, 23, 42, 0.8)',
                                                                            }}
                                                                        >
                                                                            {key}
                                                                        </th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {inlineTestResult.data.slice(0, 100).map((row: any, rowIndex: number) => (
                                                                    <tr 
                                                                        key={rowIndex}
                                                                        style={{ 
                                                                            background: rowIndex % 2 === 0 ? 'rgba(15, 23, 42, 0.4)' : 'rgba(15, 23, 42, 0.2)',
                                                                            transition: 'background 0.15s',
                                                                        }}
                                                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'}
                                                                        onMouseLeave={(e) => e.currentTarget.style.background = rowIndex % 2 === 0 ? 'rgba(15, 23, 42, 0.4)' : 'rgba(15, 23, 42, 0.2)'}
                                                                    >
                                                                        <td style={{
                                                                            padding: '6px 10px',
                                                                            textAlign: 'center',
                                                                            color: '#64748b',
                                                                            borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
                                                                        }}>
                                                                            {rowIndex + 1}
                                                                        </td>
                                                                        {Object.values(row).map((value: any, colIndex: number) => (
                                                                            <td 
                                                                                key={colIndex}
                                                                                style={{
                                                                                    padding: '6px 10px',
                                                                                    color: value === null ? '#64748b' : '#e2e8f0',
                                                                                    borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
                                                                                    maxWidth: '200px',
                                                                                    overflow: 'hidden',
                                                                                    textOverflow: 'ellipsis',
                                                                                    whiteSpace: 'nowrap',
                                                                                    fontFamily: typeof value === 'number' ? 'monospace' : 'inherit',
                                                                                }}
                                                                                title={String(value ?? 'null')}
                                                                            >
                                                                                {value === null ? <em style={{ opacity: 0.5 }}>null</em> : String(value)}
                                                                            </td>
                                                                        ))}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                        {inlineTestResult.data.length > 100 && (
                                                            <div style={{ 
                                                                padding: '8px 12px', 
                                                                textAlign: 'center', 
                                                                color: '#94a3b8', 
                                                                fontSize: '11px',
                                                                background: 'rgba(99, 102, 241, 0.05)',
                                                                borderTop: '1px solid rgba(99, 102, 241, 0.1)',
                                                            }}>
                                                                Showing 100 of {inlineTestResult.data.length} rows
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Empty Result */}
                                                {inlineTestResult.success && (!inlineTestResult.data || !Array.isArray(inlineTestResult.data) || inlineTestResult.data.length === 0) && (
                                                    <div style={{
                                                        padding: '20px',
                                                        textAlign: 'center',
                                                        color: '#94a3b8',
                                                        fontSize: '12px',
                                                    }}>
                                                        <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.5 }}>📭</div>
                                                        쿼리 실행 완료 (결과 없음)
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Styles */}
            <style>{`
                @keyframes fadeSlideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                
                input::placeholder {
                    color: #64748b;
                }
                
                input:focus, select:focus {
                    border-color: rgba(99, 102, 241, 0.5) !important;
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
                }
                
                select option {
                    background: #1e293b;
                    color: #e2e8f0;
                }
                
                button:hover:not(:disabled) {
                    filter: brightness(1.05);
                }
            `}</style>
        </div>
    );
}
