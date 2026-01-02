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
    // New enhanced fields
    successCount?: number;
    errorCount?: number;
    avgLatency?: number;
    lastErrorAt?: string;
    lastErrorMessage?: string;
    tags?: string[];
    timeout?: number;
    deprecatedAt?: string;
    deprecatedMessage?: string;
    webhookUrl?: string;
    webhookEvents?: ('success' | 'error' | 'all')[];
    allowedOrigins?: string[];
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
    // === NEW: Additional Editor State ===
    const [queryTimeout, setQueryTimeout] = useState(30000); // Default 30s
    const [rateLimit, setRateLimit] = useState({ requests: 100, windowSeconds: 60 });
    const [allowedOrigins, setAllowedOrigins] = useState<string[]>([]);
    const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
    const [showApiInfo, setShowApiInfo] = useState(false);

    // Test Modal State
    const [showTestModal, setShowTestModal] = useState(false);
    const [testingApi, setTestingApi] = useState<ApiTemplate | null>(null);
    const [testParams, setTestParams] = useState<Record<string, any>>({});
    const [testResult, setTestResult] = useState<TestResult | null>(null);
    const [testing, setTesting] = useState(false);

    // Code Snippet Modal State
    const [showSnippetModal, setShowSnippetModal] = useState(false);
    const [snippetApi, setSnippetApi] = useState<ApiTemplate | null>(null);
    const [snippetType, setSnippetType] = useState<'curl' | 'javascript' | 'python' | 'go' | 'php' | 'csharp'>('curl');

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

    // === NEW: Bulk Operations State ===
    const [selectedApis, setSelectedApis] = useState<Set<string>>(new Set());
    const [bulkActionLoading, setBulkActionLoading] = useState(false);

    // === NEW: Tags State ===
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [editingTags, setEditingTags] = useState<string[]>([]);
    const [newTagInput, setNewTagInput] = useState('');

    // === NEW: Deprecation Filter ===
    const [filterDeprecation, setFilterDeprecation] = useState<'all' | 'active' | 'deprecated'>('all');

    // === NEW: Import/Export State ===
    const [showImportModal, setShowImportModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [importJson, setImportJson] = useState('');
    const [importConnectionId, setImportConnectionId] = useState('');

    // === NEW: Webhook Config State (in editor) ===
    const [editingWebhookUrl, setEditingWebhookUrl] = useState('');
    const [editingWebhookEvents, setEditingWebhookEvents] = useState<('success' | 'error' | 'all')[]>([]);

    // === NEW: Statistics Modal ===
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [statsApi, setStatsApi] = useState<any>(null);

    // === User API Keys (for code snippets) ===
    const [userApiKeys, setUserApiKeys] = useState<any[]>([]);
    const [selectedApiKeyForSnippet, setSelectedApiKeyForSnippet] = useState<string>('');

    // Monaco Editor ref
    const editorRef = useRef<any>(null);
    const schemaInfoRef = useRef(schemaInfo);

    useEffect(() => {
        fetchTemplates();
        fetchConnections();
        fetchFavorites();
        fetchTags();
        fetchUserApiKeys();
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

    const fetchUserApiKeys = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch('/api/api-keys/my', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUserApiKeys(data);
                // Set first key as default for snippets
                if (data.length > 0 && !selectedApiKeyForSnippet) {
                    setSelectedApiKeyForSnippet(data[0].keyPrefix);
                }
            }
        } catch (e) {
            console.error('Failed to fetch user API keys', e);
        }
    };

    const fetchSchemaInfo = async () => {
        const token = localStorage.getItem('token');
        if (!token || !connectionId) return;

        try {
            // Fetch tables first
            const tablesRes = await fetch(`/api/schema/${connectionId}/tables`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (tablesRes.ok) {
                const tablesData = await tablesRes.json();
                const tableNames = tablesData.map((t: any) => t.tableName || t.table_name || t.name || t);
                const columns: Record<string, string[]> = {};
                
                // Fetch columns for each table (limit to first 20 tables for performance)
                const tablesToFetch = tableNames.slice(0, 20);
                await Promise.all(tablesToFetch.map(async (tableName: string) => {
                    try {
                        const colRes = await fetch(`/api/schema/${connectionId}/tables/${tableName}/columns`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        if (colRes.ok) {
                            const colData = await colRes.json();
                            columns[tableName] = colData.map((c: any) => c.columnName || c.column_name || c.name || c);
                        }
                    } catch (e) {
                        console.warn(`Failed to fetch columns for ${tableName}`, e);
                    }
                }));
                
                setSchemaInfo({ tables: tableNames, columns });
                schemaInfoRef.current = { tables: tableNames, columns };
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
                    visibility,
                    // New fields
                    tags: editingTags.length > 0 ? editingTags : null,
                    timeout: queryTimeout,
                    rateLimit: rateLimit.requests > 0 ? rateLimit : null,
                    webhookUrl: editingWebhookUrl || null,
                    webhookEvents: editingWebhookEvents.length > 0 ? editingWebhookEvents : null,
                })
            });

            if (res.ok) {
                setView('list');
                fetchTemplates();
                fetchTags(); // Refresh tags
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
        // Reset new fields
        setEditingTags([]);
        setQueryTimeout(30000);
        setRateLimit({ requests: 100, windowSeconds: 60 });
        setEditingWebhookUrl('');
        setEditingWebhookEvents([]);
        setShowAdvancedConfig(false);
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
        // Load new fields
        setEditingTags(api.tags || []);
        setQueryTimeout(api.timeout || 30000);
        setRateLimit(api.rateLimit || { requests: 100, windowSeconds: 60 });
        setEditingWebhookUrl(api.webhookUrl || '');
        setEditingWebhookEvents(api.webhookEvents || []);
        setShowAdvancedConfig(false);
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
        // Get current SQL directly from editor to ensure we have the latest value
        const currentSql = editorRef.current?.getValue() || sql;
        
        if (!connectionId) {
            showToast('연결을 먼저 선택해주세요', 'error');
            return;
        }
        if (!currentSql.trim()) {
            showToast('SQL 쿼리를 입력해주세요', 'error');
            return;
        }

        setInlineTesting(true);
        setInlineTestResult(null);

        const token = localStorage.getItem('token');
        const startTime = Date.now();

        try {
            // Replace parameters in SQL with test values
            let processedSql = currentSql;
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

    // === NEW: Bulk Operations ===
    const toggleSelectApi = (id: string) => {
        setSelectedApis(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const selectAllApis = () => {
        setSelectedApis(new Set(filteredTemplates.map(t => t.id)));
    };

    const deselectAllApis = () => {
        setSelectedApis(new Set());
    };

    const handleBulkToggle = async (active: boolean) => {
        if (selectedApis.size === 0) {
            showToast('선택된 API가 없습니다', 'error');
            return;
        }
        
        setBulkActionLoading(true);
        const token = localStorage.getItem('token');
        
        try {
            const res = await fetch('/api/sql-api/bulk/toggle', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ ids: Array.from(selectedApis), active })
            });
            
            if (res.ok) {
                const data = await res.json();
                showToast(`${data.success}개 API ${active ? '활성화' : '비활성화'} 완료`, 'success');
                setSelectedApis(new Set());
                fetchTemplates();
            }
        } catch (e) {
            showToast('일괄 작업 실패', 'error');
        } finally {
            setBulkActionLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedApis.size === 0) {
            showToast('선택된 API가 없습니다', 'error');
            return;
        }
        
        if (!confirm(`${selectedApis.size}개의 API를 삭제하시겠습니까?`)) return;
        
        setBulkActionLoading(true);
        const token = localStorage.getItem('token');
        
        try {
            const res = await fetch('/api/sql-api/bulk', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ ids: Array.from(selectedApis) })
            });
            
            if (res.ok) {
                const data = await res.json();
                showToast(`${data.success}개 API 삭제 완료`, 'success');
                setSelectedApis(new Set());
                fetchTemplates();
            }
        } catch (e) {
            showToast('일괄 삭제 실패', 'error');
        } finally {
            setBulkActionLoading(false);
        }
    };

    // === NEW: Tags Functions ===
    const fetchTags = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/sql-api/tags', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAvailableTags(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error('Failed to fetch tags', e);
        }
    };

    const addTag = () => {
        if (!newTagInput.trim()) return;
        if (!editingTags.includes(newTagInput.trim())) {
            setEditingTags([...editingTags, newTagInput.trim()]);
        }
        setNewTagInput('');
    };

    const removeTag = (tag: string) => {
        setEditingTags(editingTags.filter(t => t !== tag));
    };

    // === NEW: Deprecation ===
    const handleDeprecate = async (id: string) => {
        const message = prompt('Deprecation 메시지를 입력하세요 (선택사항):') || undefined;
        
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/sql-api/${id}/deprecate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ message })
            });
            
            if (res.ok) {
                showToast('API가 deprecated로 표시되었습니다', 'success');
                fetchTemplates();
            }
        } catch (e) {
            showToast('Deprecation 실패', 'error');
        }
    };

    const handleUndeprecate = async (id: string) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/sql-api/${id}/undeprecate`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (res.ok) {
                showToast('Deprecation이 제거되었습니다', 'success');
                fetchTemplates();
            }
        } catch (e) {
            showToast('Deprecation 제거 실패', 'error');
        }
    };

    // === NEW: Statistics Modal ===
    const openStatsModal = async (api: ApiTemplate) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/sql-api/${api.id}/stats/detailed`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStatsApi(data);
                setShowStatsModal(true);
            }
        } catch (e) {
            showToast('통계 조회 실패', 'error');
        }
    };

    // === NEW: Export APIs ===
    const handleExport = async () => {
        const token = localStorage.getItem('token');
        const idsToExport = selectedApis.size > 0 ? Array.from(selectedApis) : [];
        
        try {
            const res = await fetch('/api/sql-api/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ ids: idsToExport })
            });
            
            if (res.ok) {
                const data = await res.json();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `api_export_${new Date().toISOString().slice(0, 10)}.json`;
                link.click();
                showToast(`${data.length}개 API 내보내기 완료`, 'success');
                setShowExportModal(false);
            }
        } catch (e) {
            showToast('내보내기 실패', 'error');
        }
    };

    // === NEW: Import APIs ===
    const handleImport = async () => {
        if (!importJson.trim() || !importConnectionId) {
            showToast('JSON과 연결을 입력해주세요', 'error');
            return;
        }
        
        let apis;
        try {
            apis = JSON.parse(importJson);
            if (!Array.isArray(apis)) {
                apis = [apis];
            }
        } catch (e) {
            showToast('유효하지 않은 JSON 형식입니다', 'error');
            return;
        }
        
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/sql-api/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ apis, connectionId: importConnectionId })
            });
            
            if (res.ok) {
                const data = await res.json();
                showToast(`${data.imported}개 API 가져오기 완료 (${data.failed}개 실패)`, 'success');
                setShowImportModal(false);
                setImportJson('');
                fetchTemplates();
            }
        } catch (e) {
            showToast('가져오기 실패', 'error');
        }
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

    // Generate code snippets - Enhanced with more languages
    const generateSnippet = (api: ApiTemplate, type: 'curl' | 'javascript' | 'python' | 'go' | 'php' | 'csharp'): string => {
        const endpoint = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/sql-api/execute/${api.id}`;
        const params = api.parameters?.reduce((acc, p) => {
            acc[p.name] = p.type === 'number' ? 123 : 'value';
            return acc;
        }, {} as Record<string, any>) || {};
        // Use placeholder API key - actual key must be copied from profile
        const hasUserKeys = userApiKeys.length > 0;
        const apiKeyToUse = hasUserKeys ? 'jai_YOUR_API_KEY' : api.apiKey;
        const apiKeyNote = hasUserKeys 
            ? ' // 프로필 > API 키 관리에서 복사한 키를 입력하세요'
            : ' // ⚠️ 프로필에서 개인 API 키를 생성하세요';

        if (type === 'curl') {
            return `curl -X POST '${endpoint}' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "apiKey": "${apiKeyToUse}",${apiKeyNote}
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
        apiKey: '${apiKeyToUse}',${apiKeyNote}
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
        'apiKey': '${apiKeyToUse}',${apiKeyNote.replace('//', '#')}
        'params': ${JSON.stringify(params, null, 8).replace(/\n/g, '\n        ')}
    }
)

data = response.json()
print(data)`;
        }

        if (type === 'go') {
            const paramsJson = JSON.stringify({ apiKey: apiKeyToUse, params }, null, 4);
            return `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)

func main() {
    payload := []byte(\`${paramsJson}\`)
    
    resp, err := http.Post(
        "${endpoint}",
        "application/json",
        bytes.NewBuffer(payload),
    )
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()
    
    body, _ := io.ReadAll(resp.Body)
    fmt.Println(string(body))
}`;
        }

        if (type === 'php') {
            return `<?php

$endpoint = '${endpoint}';
$data = [
    'apiKey' => '${apiKeyToUse}',${apiKeyNote.replace('//', '//')}
    'params' => ${JSON.stringify(params, null, 4).replace(/\n/g, '\n    ')}
];

$options = [
    'http' => [
        'header' => "Content-Type: application/json\\r\\n",
        'method' => 'POST',
        'content' => json_encode($data)
    ]
];

$context = stream_context_create($options);
$result = file_get_contents($endpoint, false, $context);

$response = json_decode($result, true);
print_r($response);`;
        }

        if (type === 'csharp') {
            return `using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static async Task Main()
    {
        var client = new HttpClient();
        var payload = new
        {
            apiKey = "${apiKeyToUse}",${apiKeyNote}
            @params = new ${JSON.stringify(params).replace(/"/g, '')}
        };
        
        var json = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        
        var response = await client.PostAsync(
            "${endpoint}",
            content
        );
        
        var result = await response.Content.ReadAsStringAsync();
        Console.WriteLine(result);
    }
}`;
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
        <div style={{ padding: '24px', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                            {([
                                { type: 'curl', label: '🔗 cURL' },
                                { type: 'javascript', label: '🟡 JavaScript' },
                                { type: 'python', label: '🐍 Python' },
                                { type: 'go', label: '🔵 Go' },
                                { type: 'php', label: '🐘 PHP' },
                                { type: 'csharp', label: '💜 C#' },
                            ] as const).map(({ type, label }) => (
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
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* API Key Notice */}
                        <div style={{
                            padding: '10px 14px',
                            background: 'rgba(99, 102, 241, 0.1)',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            borderRadius: '8px',
                            marginBottom: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}>
                            <span style={{ fontSize: '14px' }}>🔑</span>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                {userApiKeys.length > 0 
                                    ? <>API 키: <a href="/profile" style={{ color: '#a5b4fc' }}>프로필 → API 키 관리</a>에서 복사</>
                                    : <><a href="/profile" style={{ color: '#a5b4fc' }}>프로필</a>에서 개인 API 키를 먼저 생성하세요</>
                                }
                            </span>
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
                                                                <div 
                                                                    onClick={() => handleEditApi(t)}
                                                                    style={{ color: '#e2e8f0', fontWeight: 500, fontSize: '13px', cursor: 'pointer' }}
                                                                    onMouseEnter={(e) => (e.target as HTMLElement).style.color = '#a5b4fc'}
                                                                    onMouseLeave={(e) => (e.target as HTMLElement).style.color = '#e2e8f0'}
                                                                >
                                                                    {t.name}
                                                                </div>
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
                    flex: 1,
                    minHeight: 0,
                    overflow: 'hidden',
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

                    {/* Description & Tags Row */}
                    <div style={{
                        display: 'flex',
                        gap: '16px',
                        padding: '12px 16px',
                        background: 'rgba(30, 27, 75, 0.5)',
                        borderBottom: '1px solid rgba(99, 102, 241, 0.15)',
                    }}>
                        {/* Description Input */}
                        <div style={{ flex: 2 }}>
                            <label style={{ 
                                fontSize: '11px', 
                                color: '#94a3b8', 
                                marginBottom: '4px',
                                display: 'block',
                            }}>
                                📝 설명
                            </label>
                            <input
                                type="text"
                                placeholder="API 설명을 입력하세요 (예: 사용자 정보 조회 API)"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    background: 'rgba(15, 23, 42, 0.6)',
                                    border: '1px solid rgba(99, 102, 241, 0.2)',
                                    borderRadius: '8px',
                                    color: '#e2e8f0',
                                    fontSize: '13px',
                                    outline: 'none',
                                }}
                            />
                        </div>

                        {/* Tags Input */}
                        <div style={{ flex: 1 }}>
                            <label style={{ 
                                fontSize: '11px', 
                                color: '#94a3b8', 
                                marginBottom: '4px',
                                display: 'block',
                            }}>
                                🏷️ 태그
                            </label>
                            <div style={{
                                display: 'flex',
                                gap: '6px',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                padding: '6px 10px',
                                background: 'rgba(15, 23, 42, 0.6)',
                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                borderRadius: '8px',
                                minHeight: '36px',
                            }}>
                                {editingTags.map(tag => (
                                    <span 
                                        key={tag}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '2px 8px',
                                            background: 'rgba(99, 102, 241, 0.25)',
                                            borderRadius: '12px',
                                            fontSize: '11px',
                                            color: '#a5b4fc',
                                        }}
                                    >
                                        {tag}
                                        <button
                                            onClick={() => removeTag(tag)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#a5b4fc',
                                                cursor: 'pointer',
                                                padding: '0 2px',
                                                fontSize: '12px',
                                                lineHeight: 1,
                                            }}
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                                <input
                                    type="text"
                                    placeholder="태그 추가..."
                                    value={newTagInput}
                                    onChange={(e) => setNewTagInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ',') {
                                            e.preventDefault();
                                            addTag();
                                        }
                                    }}
                                    style={{
                                        flex: 1,
                                        minWidth: '80px',
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#e2e8f0',
                                        fontSize: '12px',
                                        outline: 'none',
                                    }}
                                />
                            </div>
                        </div>

                        {/* Toggle Advanced Config */}
                        <button
                            onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
                            style={{
                                padding: '8px 12px',
                                background: showAdvancedConfig ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.1)',
                                border: `1px solid ${showAdvancedConfig ? 'rgba(99, 102, 241, 0.5)' : 'rgba(99, 102, 241, 0.2)'}`,
                                borderRadius: '8px',
                                color: '#a5b4fc',
                                cursor: 'pointer',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                alignSelf: 'flex-end',
                            }}
                        >
                            ⚙️ 고급 설정 {showAdvancedConfig ? '▲' : '▼'}
                        </button>
                    </div>

                    {/* Advanced Configuration Panel */}
                    {showAdvancedConfig && (
                        <div style={{
                            padding: '16px',
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.05))',
                            borderBottom: '1px solid rgba(99, 102, 241, 0.15)',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '16px',
                        }}>
                            {/* Active Status */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <label style={{ 
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    color: '#e2e8f0',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={isActive}
                                        onChange={(e) => setIsActive(e.target.checked)}
                                        style={{ accentColor: '#10b981' }}
                                    />
                                    🟢 활성화
                                </label>
                            </div>

                            {/* Cache TTL */}
                            <div>
                                <label style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px', display: 'block' }}>
                                    💾 캐시 TTL (초)
                                </label>
                                <input
                                    type="number"
                                    value={cacheTtl}
                                    onChange={(e) => setCacheTtl(parseInt(e.target.value) || 0)}
                                    min={0}
                                    placeholder="0 = 캐시 없음"
                                    style={{
                                        width: '100%',
                                        padding: '8px 10px',
                                        background: 'rgba(15, 23, 42, 0.6)',
                                        border: '1px solid rgba(99, 102, 241, 0.2)',
                                        borderRadius: '6px',
                                        color: '#e2e8f0',
                                        fontSize: '12px',
                                        outline: 'none',
                                    }}
                                />
                            </div>

                            {/* Timeout */}
                            <div>
                                <label style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px', display: 'block' }}>
                                    ⏱️ 타임아웃 (ms)
                                </label>
                                <input
                                    type="number"
                                    value={queryTimeout}
                                    onChange={(e) => setQueryTimeout(parseInt(e.target.value) || 30000)}
                                    min={1000}
                                    step={1000}
                                    placeholder="30000"
                                    style={{
                                        width: '100%',
                                        padding: '8px 10px',
                                        background: 'rgba(15, 23, 42, 0.6)',
                                        border: '1px solid rgba(99, 102, 241, 0.2)',
                                        borderRadius: '6px',
                                        color: '#e2e8f0',
                                        fontSize: '12px',
                                        outline: 'none',
                                    }}
                                />
                            </div>

                            {/* Rate Limit */}
                            <div>
                                <label style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px', display: 'block' }}>
                                    🚦 Rate Limit
                                </label>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <input
                                        type="number"
                                        value={rateLimit.requests}
                                        onChange={(e) => setRateLimit(prev => ({ ...prev, requests: parseInt(e.target.value) || 100 }))}
                                        min={1}
                                        style={{
                                            width: '70px',
                                            padding: '8px 10px',
                                            background: 'rgba(15, 23, 42, 0.6)',
                                            border: '1px solid rgba(99, 102, 241, 0.2)',
                                            borderRadius: '6px',
                                            color: '#e2e8f0',
                                            fontSize: '12px',
                                            outline: 'none',
                                        }}
                                    />
                                    <span style={{ color: '#64748b', fontSize: '11px' }}>요청 /</span>
                                    <input
                                        type="number"
                                        value={rateLimit.windowSeconds}
                                        onChange={(e) => setRateLimit(prev => ({ ...prev, windowSeconds: parseInt(e.target.value) || 60 }))}
                                        min={1}
                                        style={{
                                            width: '60px',
                                            padding: '8px 10px',
                                            background: 'rgba(15, 23, 42, 0.6)',
                                            border: '1px solid rgba(99, 102, 241, 0.2)',
                                            borderRadius: '6px',
                                            color: '#e2e8f0',
                                            fontSize: '12px',
                                            outline: 'none',
                                        }}
                                    />
                                    <span style={{ color: '#64748b', fontSize: '11px' }}>초</span>
                                </div>
                            </div>

                            {/* Webhook URL */}
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px', display: 'block' }}>
                                    🔔 Webhook URL (선택)
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="url"
                                        value={editingWebhookUrl}
                                        onChange={(e) => setEditingWebhookUrl(e.target.value)}
                                        placeholder="https://example.com/webhook"
                                        style={{
                                            flex: 1,
                                            padding: '8px 10px',
                                            background: 'rgba(15, 23, 42, 0.6)',
                                            border: '1px solid rgba(99, 102, 241, 0.2)',
                                            borderRadius: '6px',
                                            color: '#e2e8f0',
                                            fontSize: '12px',
                                            outline: 'none',
                                        }}
                                    />
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        {(['success', 'error', 'all'] as const).map(event => (
                                            <button
                                                key={event}
                                                onClick={() => {
                                                    setEditingWebhookEvents(prev => 
                                                        prev.includes(event) 
                                                            ? prev.filter(e => e !== event)
                                                            : [...prev, event]
                                                    );
                                                }}
                                                style={{
                                                    padding: '6px 10px',
                                                    background: editingWebhookEvents.includes(event) 
                                                        ? event === 'success' ? 'rgba(16, 185, 129, 0.3)'
                                                        : event === 'error' ? 'rgba(239, 68, 68, 0.3)'
                                                        : 'rgba(99, 102, 241, 0.3)'
                                                        : 'rgba(99, 102, 241, 0.1)',
                                                    border: '1px solid rgba(99, 102, 241, 0.2)',
                                                    borderRadius: '6px',
                                                    color: editingWebhookEvents.includes(event) ? '#e2e8f0' : '#64748b',
                                                    cursor: 'pointer',
                                                    fontSize: '10px',
                                                }}
                                            >
                                                {event === 'success' ? '✓' : event === 'error' ? '✗' : '★'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Unified IDE-Style Layout */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        background: 'rgba(30, 27, 75, 0.4)',
                        borderRadius: '0 0 12px 12px',
                        overflow: 'hidden',
                        gap: '1px',
                    }}>
                        {/* Top Row: SQL Editor + Parameters */}
                        <div style={{
                            display: 'flex',
                            flex: 3,
                            minHeight: '300px',
                            gap: '1px',
                        }}>
                            {/* Left: SQL Editor */}
                            <div style={{
                                flex: 6,
                                display: 'flex',
                                flexDirection: 'column',
                                background: 'rgba(30, 27, 75, 0.6)',
                                overflow: 'hidden',
                            }}>
                                {/* Editor Toolbar */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '8px 12px',
                                    background: 'rgba(15, 23, 42, 0.5)',
                                    borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
                                    gap: '8px',
                                    flexWrap: 'wrap',
                                }}>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#a5b4fc' }}>📝 SQL 쿼리</span>
                                        {/* Templates Dropdown */}
                                        <div style={{ position: 'relative' }}>
                                            <button
                                                onClick={() => { setShowTemplatesDropdown(!showTemplatesDropdown); setShowSnippetsDropdown(false); }}
                                                style={{
                                                    padding: '4px 10px',
                                                    background: showTemplatesDropdown ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.15)',
                                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                                    borderRadius: '6px',
                                                    color: '#a5b4fc',
                                                    cursor: 'pointer',
                                                    fontSize: '11px',
                                                }}
                                            >
                                                📋 템플릿
                                            </button>
                                            {showTemplatesDropdown && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '100%',
                                                    left: 0,
                                                    marginTop: '4px',
                                                    width: '260px',
                                                    background: 'rgba(30, 27, 75, 0.98)',
                                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                                    borderRadius: '10px',
                                                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                                                    zIndex: 50,
                                                    maxHeight: '300px',
                                                    overflowY: 'auto',
                                                }}>
                                                    <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(99, 102, 241, 0.2)', fontSize: '11px', color: '#94a3b8' }}>
                                                        SQL 템플릿
                                                    </div>
                                                    {SQL_TEMPLATES.map((t, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => insertTemplate(t)}
                                                            style={{
                                                                display: 'block',
                                                                width: '100%',
                                                                padding: '10px 12px',
                                                                background: 'transparent',
                                                                border: 'none',
                                                                textAlign: 'left',
                                                                color: '#e2e8f0',
                                                                cursor: 'pointer',
                                                                fontSize: '12px',
                                                            }}
                                                        >
                                                            {t.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        {/* AI Assist */}
                                        <button
                                            onClick={() => setShowAiAssist(!showAiAssist)}
                                            style={{
                                                padding: '4px 10px',
                                                background: showAiAssist ? 'rgba(168, 85, 247, 0.3)' : 'rgba(168, 85, 247, 0.15)',
                                                border: 'none',
                                                borderRadius: '6px',
                                                color: '#c084fc',
                                                cursor: 'pointer',
                                                fontSize: '11px',
                                            }}
                                        >
                                            ✨ AI
                                        </button>
                                        {/* Word Wrap */}
                                        <button
                                            onClick={() => setWordWrap(!wordWrap)}
                                            title={wordWrap ? 'Word Wrap 끄기' : 'Word Wrap 켜기'}
                                            style={{
                                                padding: '4px 8px',
                                                background: wordWrap ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.1)',
                                                border: 'none',
                                                borderRadius: '6px',
                                                color: wordWrap ? '#a5b4fc' : '#64748b',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                            }}
                                        >
                                            ↩️
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        {/* Query Complexity */}
                                        <div style={{
                                            padding: '3px 8px',
                                            borderRadius: '4px',
                                            fontSize: '10px',
                                            fontWeight: 500,
                                            background: getQueryComplexity() === 'high' ? 'rgba(239, 68, 68, 0.15)' : getQueryComplexity() === 'medium' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                            color: getQueryComplexity() === 'high' ? '#f87171' : getQueryComplexity() === 'medium' ? '#fbbf24' : '#10b981',
                                        }}>
                                            {getQueryComplexity() === 'high' ? '🔴' : getQueryComplexity() === 'medium' ? '🟡' : '🟢'} {getQueryComplexity().toUpperCase()}
                                        </div>
                                        {/* Connection Status */}
                                        <button
                                            onClick={testConnection}
                                            disabled={!connectionId || connectionStatus === 'testing'}
                                            style={{
                                                padding: '3px 8px',
                                                borderRadius: '4px',
                                                fontSize: '10px',
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
                                                width: '5px', height: '5px', borderRadius: '50%',
                                                background: connectionStatus === 'connected' ? '#10b981' : connectionStatus === 'failed' ? '#ef4444' : '#64748b',
                                            }} />
                                            {connectionStatus === 'connected' ? '연결됨' : connectionStatus === 'failed' ? '실패' : '연결'}
                                        </button>
                                        <span style={{ fontSize: '9px', color: '#64748b' }}>Ctrl+Enter / F5</span>
                                    </div>
                                </div>

                                {/* AI Assist Panel (inline) */}
                                {showAiAssist && (
                                    <div style={{
                                        padding: '10px 12px',
                                        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(99, 102, 241, 0.1))',
                                        borderBottom: '1px solid rgba(168, 85, 247, 0.3)',
                                        display: 'flex',
                                        gap: '8px',
                                    }}>
                                        <input
                                            type="text"
                                            value={aiPrompt}
                                            onChange={(e) => setAiPrompt(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && generateSqlWithAI()}
                                            placeholder="원하는 쿼리를 설명하세요..."
                                            style={{
                                                flex: 1,
                                                padding: '8px 12px',
                                                background: 'rgba(15, 23, 42, 0.6)',
                                                border: '1px solid rgba(168, 85, 247, 0.2)',
                                                borderRadius: '6px',
                                                color: '#e2e8f0',
                                                fontSize: '12px',
                                                outline: 'none',
                                            }}
                                        />
                                        <button
                                            onClick={generateSqlWithAI}
                                            disabled={aiLoading || !aiPrompt.trim()}
                                            style={{
                                                padding: '8px 16px',
                                                background: 'linear-gradient(90deg, rgba(168, 85, 247, 0.4), rgba(99, 102, 241, 0.4))',
                                                border: 'none',
                                                borderRadius: '6px',
                                                color: '#e2e8f0',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                cursor: aiLoading || !aiPrompt.trim() ? 'not-allowed' : 'pointer',
                                            }}
                                        >
                                            {aiLoading ? '⏳' : '🚀'} 생성
                                        </button>
                                        <button
                                            onClick={() => setShowAiAssist(false)}
                                            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '14px' }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}

                                {/* Monaco Editor */}
                                <div style={{ flex: 1, minHeight: '200px' }}>
                                    <MonacoEditor
                                        height="100%"
                                        defaultLanguage="sql"
                                        theme="vs-dark"
                                        value={sql}
                                        onChange={(val) => setSql(val || '')}
                                        onMount={(editor, monaco) => {
                                            editorRef.current = editor;
                                            editor.addAction({
                                                id: 'run-query',
                                                label: 'Run Query',
                                                keybindings: [
                                                    monaco.KeyCode.F5,
                                                    monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter
                                                ],
                                                run: () => {
                                                    if (connectionId && !inlineTesting) {
                                                        runInlineQueryTest();
                                                    }
                                                }
                                            });
                                            const sqlKeywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'ON', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'ORDER', 'BY', 'ASC', 'DESC', 'GROUP', 'HAVING', 'LIMIT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'AS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'];
                                            monaco.languages.registerCompletionItemProvider('sql', {
                                                provideCompletionItems: (model: any, position: any) => {
                                                    const word = model.getWordUntilPosition(position);
                                                    const range = {
                                                        startLineNumber: position.lineNumber,
                                                        endLineNumber: position.lineNumber,
                                                        startColumn: word.startColumn,
                                                        endColumn: word.endColumn,
                                                    };
                                                    const suggestions: any[] = sqlKeywords.map(kw => ({
                                                        label: kw,
                                                        kind: monaco.languages.CompletionItemKind.Keyword,
                                                        insertText: kw,
                                                        range,
                                                    }));
                                                    const currentSchema = schemaInfoRef.current;
                                                    currentSchema.tables.forEach(table => {
                                                        suggestions.push({ label: table, kind: monaco.languages.CompletionItemKind.Class, insertText: table, detail: 'Table', range });
                                                    });
                                                    Object.entries(currentSchema.columns).forEach(([table, cols]) => {
                                                        cols.forEach(col => {
                                                            suggestions.push({ label: col, kind: monaco.languages.CompletionItemKind.Field, insertText: col, detail: `Column (${table})`, range });
                                                        });
                                                    });
                                                    return { suggestions };
                                                }
                                            });
                                        }}
                                        options={{
                                            minimap: { enabled: false },
                                            fontSize: 14,
                                            padding: { top: 12 },
                                            scrollBeyondLastLine: false,
                                            wordWrap: wordWrap ? 'on' : 'off',
                                            quickSuggestions: true,
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Right: Parameters Panel */}
                            <div style={{
                                flex: 4,
                                display: 'flex',
                                flexDirection: 'column',
                                background: 'rgba(30, 27, 75, 0.6)',
                                overflow: 'hidden',
                            }}>
                                <div style={{
                                    padding: '8px 12px',
                                    background: 'rgba(15, 23, 42, 0.5)',
                                    borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#a5b4fc' }}>⚙️ 파라미터</span>
                                    <span style={{ fontSize: '10px', color: '#64748b' }}>{params.length}개</span>
                                </div>
                                <div style={{ flex: 1, padding: '12px', overflow: 'auto' }}>
                                    {params.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {params.map((p, idx) => (
                                                <div key={p.name} style={{ padding: '10px 12px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
                                                    <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#a78bfa', marginBottom: '8px', fontWeight: 600 }}>:{p.name}</div>
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <select value={p.type} onChange={(e) => { const newParams = [...params]; newParams[idx].type = e.target.value; setParams(newParams); }} style={{ flex: 1, padding: '6px 8px', background: 'rgba(30, 27, 75, 0.8)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '4px', color: '#e2e8f0', fontSize: '11px', outline: 'none' }}>
                                                            <option value="string">String</option>
                                                            <option value="number">Number</option>
                                                            <option value="boolean">Boolean</option>
                                                        </select>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#94a3b8', cursor: 'pointer' }}>
                                                            <input type="checkbox" checked={p.required} onChange={(e) => { const newParams = [...params]; newParams[idx].required = e.target.checked; setParams(newParams); }} style={{ accentColor: '#6366f1' }} />
                                                            필수
                                                        </label>
                                                    </div>
                                                    <input type={p.type === 'number' ? 'number' : 'text'} value={inlineTestParams[p.name] || ''} onChange={(e) => setInlineTestParams(prev => ({ ...prev, [p.name]: e.target.value }))} placeholder={`테스트 값 (${p.type})`} style={{ width: '100%', marginTop: '8px', padding: '6px 8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '4px', color: '#e2e8f0', fontSize: '11px', outline: 'none' }} />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                                            <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.5 }}>📝</div>
                                            SQL에서 <code style={{ color: '#a78bfa' }}>:paramName</code> 형식으로<br/>파라미터를 정의하세요
                                        </div>
                                    )}
                                    <button onClick={runInlineQueryTest} disabled={inlineTesting || !connectionId} style={{ width: '100%', marginTop: '12px', padding: '10px', background: inlineTesting ? 'rgba(16, 185, 129, 0.3)' : 'linear-gradient(90deg, #10b981, #06b6d4)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: inlineTesting || !connectionId ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                        {inlineTesting ? '⏳ 실행 중...' : '▶ 쿼리 실행'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Bottom: Results Panel */}
                        <div style={{ flex: 2, minHeight: '180px', background: 'rgba(30, 27, 75, 0.6)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <div style={{ padding: '8px 12px', background: 'rgba(15, 23, 42, 0.5)', borderBottom: '1px solid rgba(99, 102, 241, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#a5b4fc' }}>📊 실행 결과</span>
                                    {inlineTestResult && (
                                        <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 500, background: inlineTestResult.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: inlineTestResult.success ? '#10b981' : '#f87171' }}>
                                            {inlineTestResult.success ? '✓ 성공' : '✗ 실패'} · {inlineTestResult.duration}ms{inlineTestResult.rowCount !== undefined && ` · ${inlineTestResult.rowCount} rows`}
                                        </span>
                                    )}
                                </div>
                                {inlineTestResult?.success && inlineTestResult.data?.length > 0 && (
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button onClick={exportResultsCSV} style={{ padding: '3px 8px', background: 'rgba(99, 102, 241, 0.2)', border: 'none', borderRadius: '4px', color: '#a5b4fc', cursor: 'pointer', fontSize: '10px' }}>📥 CSV</button>
                                        <button onClick={exportResultsJSON} style={{ padding: '3px 8px', background: 'rgba(99, 102, 241, 0.2)', border: 'none', borderRadius: '4px', color: '#a5b4fc', cursor: 'pointer', fontSize: '10px' }}>📥 JSON</button>
                                        <button onClick={copyResultsToClipboard} style={{ padding: '3px 8px', background: 'rgba(99, 102, 241, 0.2)', border: 'none', borderRadius: '4px', color: '#a5b4fc', cursor: 'pointer', fontSize: '10px' }}>📋 복사</button>
                                    </div>
                                )}
                            </div>
                            <div style={{ flex: 1, overflow: 'auto' }}>
                                {!inlineTestResult ? (
                                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '12px' }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.4 }}>🔍</div>
                                            Ctrl+Enter 또는 ▶ 버튼을 눌러 쿼리를 실행하세요
                                        </div>
                                    </div>
                                ) : inlineTestResult.error ? (
                                    <div style={{ padding: '16px', color: '#fca5a5', fontSize: '12px', background: 'rgba(239, 68, 68, 0.1)' }}>
                                        <strong>Error:</strong> {inlineTestResult.error}
                                    </div>
                                ) : inlineTestResult.success && inlineTestResult.data?.length > 0 ? (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(99, 102, 241, 0.1)', position: 'sticky', top: 0 }}>
                                                <th style={{ padding: '8px 10px', textAlign: 'center', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid rgba(99, 102, 241, 0.2)', width: '40px', background: 'rgba(15, 23, 42, 0.9)' }}>#</th>
                                                {Object.keys(inlineTestResult.data[0]).map((key) => (
                                                    <th key={key} style={{ padding: '8px 10px', textAlign: 'left', color: '#a5b4fc', fontWeight: 600, borderBottom: '1px solid rgba(99, 102, 241, 0.2)', whiteSpace: 'nowrap', background: 'rgba(15, 23, 42, 0.9)' }}>{key}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {inlineTestResult.data.slice(0, 100).map((row, rowIndex) => (
                                                <tr key={rowIndex} style={{ background: rowIndex % 2 === 0 ? 'transparent' : 'rgba(99, 102, 241, 0.03)' }}>
                                                    <td style={{ padding: '6px 10px', textAlign: 'center', color: '#64748b', borderBottom: '1px solid rgba(99, 102, 241, 0.1)' }}>{rowIndex + 1}</td>
                                                    {Object.values(row).map((value: any, colIndex: number) => (
                                                        <td key={colIndex} style={{ padding: '6px 10px', color: value === null ? '#64748b' : '#e2e8f0', borderBottom: '1px solid rgba(99, 102, 241, 0.1)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: typeof value === 'number' ? 'monospace' : 'inherit' }} title={String(value ?? 'null')}>
                                                            {value === null ? <em style={{ opacity: 0.5 }}>null</em> : String(value)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '12px' }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '24px', marginBottom: '6px', opacity: 0.5 }}>📭</div>
                                            쿼리 실행 완료 (결과 없음)
                                        </div>
                                    </div>
                                )}
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
