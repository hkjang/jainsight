'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { useRouter } from 'next/navigation';

// ============================================================================
// TYPES
// ============================================================================

interface Connection {
    id: string;
    name: string;
    type: string;
}

interface SavedQuery {
    id: string;
    name: string;
    description: string;
    query: string;
    userId: string;
    userName: string;
    isPublic: boolean;
}

interface QueryHistoryItem {
    query: string;
    timestamp: Date;
    duration?: number;
    success: boolean;
}

interface QueryTab {
    id: string;
    name: string;
    query: string;
    unsaved: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

// ============================================================================
// THEME SYSTEM
// ============================================================================

const darkTheme = {
    bg: '#0f172a',
    bgCard: '#1e293b',
    bgHover: '#334155',
    bgInput: '#1e293b',
    border: '#334155',
    borderLight: '#475569',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    primary: '#3b82f6',
    primaryHover: '#2563eb',
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
    accent: '#8b5cf6',
};

const lightTheme = {
    bg: '#f8fafc',
    bgCard: '#ffffff',
    bgHover: '#f1f5f9',
    bgInput: '#ffffff',
    border: '#e2e8f0',
    borderLight: '#cbd5e1',
    text: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    primary: '#3b82f6',
    primaryHover: '#2563eb',
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
    accent: '#8b5cf6',
};

// ============================================================================
// TEMPLATES
// ============================================================================

const QUERY_TEMPLATES = [
    { name: 'All Tables', icon: '📋', query: 'SELECT table_name, table_type\nFROM information_schema.tables\nWHERE table_schema = \'public\'\nORDER BY table_name;', category: 'Schema' },
    { name: 'Table Row Counts', icon: '📊', query: 'SELECT schemaname, relname, n_live_tup AS row_count\nFROM pg_stat_user_tables\nORDER BY n_live_tup DESC;', category: 'Stats' },
    { name: 'Column Info', icon: '🗂️', query: 'SELECT table_name, column_name, data_type, is_nullable\nFROM information_schema.columns\nWHERE table_schema = \'public\'\nORDER BY table_name, ordinal_position;', category: 'Schema' },
    { name: 'Table Sizes', icon: '📈', query: 'SELECT relname AS table_name,\n  pg_size_pretty(pg_total_relation_size(relid)) AS total_size\nFROM pg_catalog.pg_statio_user_tables\nORDER BY pg_total_relation_size(relid) DESC;', category: 'Stats' },
    { name: 'Primary Keys', icon: '🔑', query: 'SELECT tc.table_name, kcu.column_name\nFROM information_schema.table_constraints tc\nJOIN information_schema.key_column_usage kcu\n  ON tc.constraint_name = kcu.constraint_name\nWHERE tc.constraint_type = \'PRIMARY KEY\'\nORDER BY tc.table_name;', category: 'Schema' },
    { name: 'Foreign Keys', icon: '🔗', query: 'SELECT tc.table_name, kcu.column_name,\n  ccu.table_name AS foreign_table, ccu.column_name AS foreign_column\nFROM information_schema.table_constraints tc\nJOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name\nJOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name\nWHERE tc.constraint_type = \'FOREIGN KEY\';', category: 'Schema' },
    { name: 'Index Usage', icon: '📇', query: 'SELECT schemaname, tablename, indexname,\n  idx_scan AS times_used,\n  pg_size_pretty(pg_relation_size(indexrelid)) AS size\nFROM pg_stat_user_indexes\nORDER BY idx_scan DESC;', category: 'Performance' },
    { name: 'Slow Queries', icon: '🐌', query: 'SELECT query, calls, mean_time, total_time\nFROM pg_stat_statements\nORDER BY mean_time DESC\nLIMIT 10;', category: 'Performance' },
    { name: 'Active Connections', icon: '👥', query: 'SELECT usename, application_name, client_addr, state, query\nFROM pg_stat_activity\nWHERE state != \'idle\'\nORDER BY query_start;', category: 'Admin' },
    { name: 'Database Size', icon: '💽', query: 'SELECT pg_database.datname,\n  pg_size_pretty(pg_database_size(pg_database.datname)) AS size\nFROM pg_database\nORDER BY pg_database_size(pg_database.datname) DESC;', category: 'Stats' },
];

// ============================================================================
// SQL FORMATTER
// ============================================================================

const formatSQL = (sql: string): string => {
    const keywords = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'ON', 'AS', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM'];
    let formatted = sql.trim();
    keywords.forEach(kw => {
        formatted = formatted.replace(new RegExp(`\\b${kw}\\b`, 'gi'), kw);
    });
    ['SELECT', 'FROM', 'WHERE', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN'].forEach(kw => {
        formatted = formatted.replace(new RegExp(`\\s+${kw}\\b`, 'gi'), `\n${kw}`);
    });
    return formatted.split('\n').map(line => line.trim()).filter(Boolean).join('\n');
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EditorPage() {
    const router = useRouter();
    
    // Core State
    const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const theme = isDarkMode ? darkTheme : lightTheme;
    
    // Connection & Query State
    const [connections, setConnections] = useState<Connection[]>([]);
    const [selectedConnection, setSelectedConnection] = useState('');
    const [queryTabs, setQueryTabs] = useState<QueryTab[]>([
        { id: '1', name: 'Query 1', query: '-- Select your connection and write your SQL query\nSELECT * FROM information_schema.tables LIMIT 10;', unsaved: false }
    ]);
    const [activeTabId, setActiveTabId] = useState('1');
    
    // Results State
    const [results, setResults] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [executionTime, setExecutionTime] = useState<number | null>(null);
    
    // Pagination & Sorting
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [sortField, setSortField] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);
    const [resultsFilter, setResultsFilter] = useState('');
    
    // UI State
    const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([]);
    const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
    const [showSidebar, setShowSidebar] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showAiModal, setShowAiModal] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);
    
    // Toast Notifications
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    
    // Connection Status
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'testing'>('disconnected');
    
    // Schema Browser
    const [showSchemaPanel, setShowSchemaPanel] = useState(false);
    const [schemaData, setSchemaData] = useState<{ tables: string[]; columns: Record<string, string[]> }>({ tables: [], columns: {} });
    const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
    
    // Export Menu
    const [showExportMenu, setShowExportMenu] = useState(false);
    
    // Row Details Modal
    const [selectedRow, setSelectedRow] = useState<any>(null);
    const [showRowDetails, setShowRowDetails] = useState(false);
    
    // Column Stats Popup
    const [statsColumn, setStatsColumn] = useState<string | null>(null);
    
    // Live Query Timer
    const [queryStartTime, setQueryStartTime] = useState<number | null>(null);
    const [liveTimer, setLiveTimer] = useState<number>(0);
    
    // Fullscreen Mode
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    // Tab Editing
    const [editingTabId, setEditingTabId] = useState<string | null>(null);
    const [editingTabName, setEditingTabName] = useState('');
    
    // Editor Options
    const [showMinimap, setShowMinimap] = useState(false);
    const [showLineNumbers, setShowLineNumbers] = useState(true);
    const [fontSize, setFontSize] = useState(14);
    
    // History Search
    const [historySearch, setHistorySearch] = useState('');
    
    // Favorites
    const [favorites, setFavorites] = useState<string[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('queryFavorites');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });
    
    // Auto-save drafts
    const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
    
    // Connection Testing
    const [testingConnection, setTestingConnection] = useState(false);
    
    // Query Sharing
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [showShareModal, setShowShareModal] = useState(false);
    
    // Selected Result Cell (for keyboard navigation)
    const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
    
    // Quick Actions Menu (right-click context menu)
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'cell' | 'row'; data: any; field?: string } | null>(null);
    
    // Column Stats Popup
    const [showColumnStats, setShowColumnStats] = useState<string | null>(null);
    
    // Selected Rows for Export
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    
    // View Mode
    const [viewMode, setViewMode] = useState<'table' | 'json' | 'cards'>('table');
    
    // Save Modal State
    const [saveName, setSaveName] = useState('');
    const [saveDescription, setSaveDescription] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    
    // AI State
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');
    
    // Editor State
    const [editorHeight, setEditorHeight] = useState(50);
    const [wordWrap, setWordWrap] = useState(false);
    const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
    const editorRef = useRef<any>(null);
    const isDragging = useRef(false);
    const resizeRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
    
    // Toast helper
    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);
    
    // Copy cell value
    const handleCopyCell = (value: any) => {
        navigator.clipboard.writeText(value === null ? 'NULL' : String(value));
        showToast('Cell copied', 'success');
    };
    
    // Toggle fullscreen
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };
    
    // Handle context menu on right-click
    const handleContextMenu = (e: React.MouseEvent, type: 'cell' | 'row', data: any, field?: string) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, type, data, field });
    };
    
    // Close context menu
    const closeContextMenu = () => setContextMenu(null);
    
    // Toggle row selection
    const toggleRowSelection = (rowIndex: number) => {
        const newSelected = new Set(selectedRows);
        if (newSelected.has(rowIndex)) {
            newSelected.delete(rowIndex);
        } else {
            newSelected.add(rowIndex);
        }
        setSelectedRows(newSelected);
    };
    
    // Select all rows
    const selectAllRows = () => {
        if (selectedRows.size === filteredRows.length) {
            setSelectedRows(new Set());
        } else {
            setSelectedRows(new Set(filteredRows.map((_, i) => i)));
        }
    };
    
    // Export selected rows only
    const handleExportSelected = () => {
        if (selectedRows.size === 0) {
            showToast('No rows selected', 'error');
            return;
        }
        const selectedData = Array.from(selectedRows).map(i => filteredRows[i]);
        const json = JSON.stringify(selectedData, null, 2);
        navigator.clipboard.writeText(json);
        showToast(`${selectedRows.size} rows copied as JSON`, 'success');
    };
    
    // Keyboard navigation for results
    const handleResultsKeyDown = (e: React.KeyboardEvent) => {
        if (!selectedCell || !results) return;
        const { row, col } = selectedCell;
        const maxRow = paginatedRows.length - 1;
        const maxCol = results.fields.length - 1;
        
        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                setSelectedCell({ row: Math.max(0, row - 1), col });
                break;
            case 'ArrowDown':
                e.preventDefault();
                setSelectedCell({ row: Math.min(maxRow, row + 1), col });
                break;
            case 'ArrowLeft':
                e.preventDefault();
                setSelectedCell({ row, col: Math.max(0, col - 1) });
                break;
            case 'ArrowRight':
                e.preventDefault();
                setSelectedCell({ row, col: Math.min(maxCol, col + 1) });
                break;
            case 'Enter':
            case 'c':
                if (e.ctrlKey || e.metaKey) {
                    const field = results.fields[col];
                    handleCopyCell(paginatedRows[row][field]);
                }
                break;
        }
    };
    
    // Tab rename
    const startEditingTab = (tabId: string, currentName: string) => {
        setEditingTabId(tabId);
        setEditingTabName(currentName);
    };
    
    const finishEditingTab = () => {
        if (editingTabId && editingTabName.trim()) {
            setQueryTabs(tabs => tabs.map(t => 
                t.id === editingTabId ? { ...t, name: editingTabName.trim() } : t
            ));
            showToast('Tab renamed', 'success');
        }
        setEditingTabId(null);
        setEditingTabName('');
    };
    
    // Favorites
    const toggleFavorite = (queryId: string) => {
        const newFavorites = favorites.includes(queryId) 
            ? favorites.filter(id => id !== queryId)
            : [...favorites, queryId];
        setFavorites(newFavorites);
        localStorage.setItem('queryFavorites', JSON.stringify(newFavorites));
        showToast(favorites.includes(queryId) ? 'Removed from favorites' : 'Added to favorites', 'success');
    };
    
    // Filtered history
    const filteredHistory = historySearch.trim() 
        ? queryHistory.filter(h => h.query.toLowerCase().includes(historySearch.toLowerCase()))
        : queryHistory;
    
    // Test connection
    const testConnection = async () => {
        if (!selectedConnection) {
            showToast('Please select a connection first', 'error');
            return;
        }
        setTestingConnection(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:3000/api/query/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ connectionId: selectedConnection, query: 'SELECT 1' }),
            });
            if (res.ok) {
                setConnectionStatus('connected');
                showToast('✓ Connection successful!', 'success');
            } else {
                setConnectionStatus('disconnected');
                showToast('✗ Connection failed', 'error');
            }
        } catch (e) {
            setConnectionStatus('disconnected');
            showToast('✗ Connection failed', 'error');
        } finally {
            setTestingConnection(false);
        }
    };
    
    // Share query (creates a shareable URL)
    const handleShareQuery = () => {
        const encodedQuery = encodeURIComponent(query);
        const url = `${window.location.origin}/editor?q=${encodedQuery}`;
        setShareUrl(url);
        setShowShareModal(true);
    };
    
    // Copy share URL
    const copyShareUrl = () => {
        if (shareUrl) {
            navigator.clipboard.writeText(shareUrl);
            showToast('Share URL copied!', 'success');
        }
    };
    
    // Auto-save draft to localStorage
    const saveDraft = useCallback(() => {
        const draft = { 
            tabs: queryTabs, 
            activeTabId, 
            timestamp: new Date().toISOString() 
        };
        localStorage.setItem('editorDraft', JSON.stringify(draft));
        setLastAutoSave(new Date());
    }, [queryTabs, activeTabId]);
    
    // Load draft on mount
    useEffect(() => {
        const draft = localStorage.getItem('editorDraft');
        if (draft) {
            try {
                const parsed = JSON.parse(draft);
                if (parsed.tabs && parsed.tabs.length > 0) {
                    setQueryTabs(parsed.tabs);
                    setActiveTabId(parsed.activeTabId || parsed.tabs[0].id);
                }
            } catch (e) {
                console.error('Failed to load draft', e);
            }
        }
    }, []);
    
    // Auto-save every 30 seconds
    useEffect(() => {
        autoSaveRef.current = setInterval(() => {
            saveDraft();
        }, 30000);
        return () => {
            if (autoSaveRef.current) clearInterval(autoSaveRef.current);
        };
    }, [saveDraft]);
    
    // Load query from URL if present
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const sharedQuery = params.get('q');
        if (sharedQuery) {
            setQuery(decodeURIComponent(sharedQuery));
            showToast('Query loaded from shared link', 'info');
            // Clean URL
            window.history.replaceState({}, '', '/editor');
        }
    }, []);

    // Derived State
    const activeTab = queryTabs.find(t => t.id === activeTabId) || queryTabs[0];
    const query = activeTab?.query || '';

    const setQuery = useCallback((newQuery: string) => {
        setQueryTabs(tabs => tabs.map(t =>
            t.id === activeTabId ? { ...t, query: newQuery, unsaved: true } : t
        ));
    }, [activeTabId]);

    // ========================================================================
    // EFFECTS
    // ========================================================================

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setCurrentUser({ id: payload.sub, name: payload.username });
        } catch { }
        
        const savedTheme = localStorage.getItem('editorTheme');
        if (savedTheme) setIsDarkMode(savedTheme === 'dark');
        
        const savedHistory = localStorage.getItem('queryHistory');
        if (savedHistory) {
            try { setQueryHistory(JSON.parse(savedHistory)); } catch { }
        }
        
        fetchConnections(token);
        fetchSavedQueries(token);
    }, [router]);

    useEffect(() => {
        localStorage.setItem('editorTheme', isDarkMode ? 'dark' : 'light');
    }, [isDarkMode]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F5' || (e.ctrlKey && e.key === 'Enter')) {
                e.preventDefault();
                handleExecute();
            }
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                setShowSaveModal(true);
            }
            if (e.ctrlKey && e.shiftKey && e.key === 'A') {
                e.preventDefault();
                setShowAiModal(true);
            }
            if (e.ctrlKey && e.shiftKey && e.key === 'F') {
                e.preventDefault();
                handleFormatQuery();
            }
            if (e.ctrlKey && e.key === 't') {
                e.preventDefault();
                addNewTab();
            }
            if (e.key === 'F1') {
                e.preventDefault();
                setShowShortcuts(s => !s);
            }
            if (e.key === 'Escape') {
                setShowSaveModal(false);
                setShowAiModal(false);
                setShowHistory(false);
                setShowTemplates(false);
                setShowShortcuts(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [query, selectedConnection]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return;
            const container = resizeRef.current?.parentElement;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const newHeight = ((e.clientY - rect.top) / rect.height) * 100;
            setEditorHeight(Math.max(20, Math.min(80, newHeight)));
        };
        const handleMouseUp = () => {
            isDragging.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    // ========================================================================
    // API FUNCTIONS
    // ========================================================================

    const fetchConnections = async (token: string) => {
        try {
            const res = await fetch('http://localhost:3000/api/connections', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401) { router.push('/login'); return; }
            const data = await res.json();
            setConnections(data);
            if (data.length > 0) setSelectedConnection(data[0].id);
        } catch (e) {
            console.error('Failed to fetch connections', e);
        }
    };

    const fetchSavedQueries = async (token: string) => {
        try {
            const res = await fetch('http://localhost:3000/api/queries', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSavedQueries(data);
            }
        } catch (e) {
            console.error('Failed to fetch saved queries', e);
        }
    };

    const handleExecute = useCallback(async () => {
        if (!selectedConnection) {
            setError('Please select a connection');
            showToast('Please select a connection first', 'error');
            return;
        }
        setLoading(true);
        setError('');
        setResults(null);
        setCurrentPage(1);
        setSortField(null);
        setSortDirection(null);
        
        // Start live timer
        const startTime = performance.now();
        setQueryStartTime(startTime);
        setLiveTimer(0);
        timerRef.current = setInterval(() => {
            setLiveTimer(performance.now() - startTime);
        }, 100);

        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch('http://localhost:3000/api/query/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ connectionId: selectedConnection, query }),
            });
            const endTime = performance.now();
            setExecutionTime(endTime - startTime);

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Query execution failed');
            }
            const data = await res.json();
            setResults(data);
            showToast(`Query completed: ${data.rowCount} rows in ${formatDuration(endTime - startTime)}`, 'success');

            const historyItem: QueryHistoryItem = { query: query.trim(), timestamp: new Date(), duration: endTime - startTime, success: true };
            const newHistory = [historyItem, ...queryHistory.slice(0, 49)];
            setQueryHistory(newHistory);
            localStorage.setItem('queryHistory', JSON.stringify(newHistory));
        } catch (e: any) {
            setError(e.message);
            showToast(`Query failed: ${e.message}`, 'error');
            const endTime = performance.now();
            setExecutionTime(endTime - startTime);
            const historyItem: QueryHistoryItem = { query: query.trim(), timestamp: new Date(), duration: endTime - startTime, success: false };
            const newHistory = [historyItem, ...queryHistory.slice(0, 49)];
            setQueryHistory(newHistory);
            localStorage.setItem('queryHistory', JSON.stringify(newHistory));
        } finally {
            setLoading(false);
            setQueryStartTime(null);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    }, [selectedConnection, query, queryHistory, showToast]);

    const handleSaveQuery = async () => {
        if (!saveName) return;
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch('http://localhost:3000/api/queries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name: saveName, description: saveDescription, isPublic, query }),
            });
            if (res.ok) {
                setShowSaveModal(false);
                setSaveName('');
                setSaveDescription('');
                setIsPublic(false);
                fetchSavedQueries(token);
            }
        } catch (e) {
            console.error('Failed to save query', e);
        }
    };

    const handleDeleteQuery = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this query?')) return;
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            await fetch(`http://localhost:3000/api/queries/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            fetchSavedQueries(token);
        } catch (e) {
            console.error('Failed to delete query', e);
        }
    };

    const handleAiGenerate = async () => {
        if (!selectedConnection || !aiPrompt.trim()) return;
        setAiLoading(true);
        setAiError('');
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch('http://localhost:3000/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ connectionId: selectedConnection, prompt: aiPrompt }),
            });
            if (!res.ok) throw new Error('Failed to generate SQL');
            const data = await res.json();
            setQuery(data.sql);
            setShowAiModal(false);
            setAiPrompt('');
        } catch (e: any) {
            setAiError(e.message);
        } finally {
            setAiLoading(false);
        }
    };

    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================

    const addNewTab = () => {
        const newId = String(Date.now());
        setQueryTabs([...queryTabs, { id: newId, name: `Query ${queryTabs.length + 1}`, query: '-- New query\n', unsaved: false }]);
        setActiveTabId(newId);
    };

    const closeTab = (tabId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (queryTabs.length === 1) return;
        const newTabs = queryTabs.filter(t => t.id !== tabId);
        setQueryTabs(newTabs);
        if (activeTabId === tabId) setActiveTabId(newTabs[newTabs.length - 1].id);
    };

    const handleFormatQuery = () => {
        setQuery(formatSQL(query));
        showToast('Query formatted', 'success');
    };
    
    const handleCopyQuery = () => {
        navigator.clipboard.writeText(query);
        showToast('Query copied to clipboard', 'success');
    };
    
    const handleEditorMount = (editor: any, monaco: Monaco) => {
        editorRef.current = editor;
        editor.onDidChangeCursorPosition((e: any) => setCursorPosition({ line: e.position.lineNumber, column: e.position.column }));
    };

    const formatDuration = (ms: number) => ms < 1000 ? `${ms.toFixed(0)}ms` : `${(ms / 1000).toFixed(2)}s`;

    // Export Functions
    const handleExportCsv = () => {
        if (!results?.rows?.length) return;
        const headers = results.fields.join(',');
        const rows = results.rows.map((row: any) => results.fields.map((f: string) => JSON.stringify(row[f] ?? '')).join(',')).join('\n');
        const link = document.createElement('a');
        link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(headers + '\n' + rows);
        link.download = `query_results_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        showToast('CSV exported', 'success');
    };

    const handleExportJson = () => {
        if (!results?.rows?.length) return;
        const blob = new Blob([JSON.stringify(results.rows, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `query_results_${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(link.href);
        showToast('JSON exported', 'success');
    };
    
    const handleExportExcel = () => {
        if (!results?.rows?.length) return;
        const headers = results.fields.join('\t');
        const rows = results.rows.map((row: any) => results.fields.map((f: string) => {
            const val = row[f];
            if (val === null) return '';
            return String(val).replace(/\t/g, ' ').replace(/\n/g, ' ');
        }).join('\t')).join('\n');
        const blob = new Blob(['\ufeff' + headers + '\n' + rows], { type: 'text/tab-separated-values' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `query_results_${new Date().toISOString().slice(0, 10)}.xls`;
        link.click();
        URL.revokeObjectURL(link.href);
        showToast('Excel exported', 'success');
    };
    
    const handleExportMarkdown = () => {
        if (!results?.rows?.length) return;
        const headers = '| ' + results.fields.join(' | ') + ' |';
        const separator = '| ' + results.fields.map(() => '---').join(' | ') + ' |';
        const rows = results.rows.map((row: any) => '| ' + results.fields.map((f: string) => String(row[f] ?? '')).join(' | ') + ' |').join('\n');
        navigator.clipboard.writeText(headers + '\n' + separator + '\n' + rows);
        showToast('Markdown table copied', 'success');
    };
    
    const handleCopyAsInsert = () => {
        if (!results?.rows?.length) return;
        const tableName = 'table_name'; // Could be extracted from query
        const inserts = results.rows.map((row: any) => {
            const values = results.fields.map((f: string) => {
                const val = row[f];
                if (val === null) return 'NULL';
                if (typeof val === 'number') return val;
                return `'${String(val).replace(/'/g, "''")}'`;
            }).join(', ');
            return `INSERT INTO ${tableName} (${results.fields.join(', ')}) VALUES (${values});`;
        }).join('\n');
        navigator.clipboard.writeText(inserts);
        showToast('INSERT statements copied', 'success');
    };
    
    const handleCopyAllResults = () => {
        if (!results?.rows?.length) return;
        const headers = results.fields.join('\t');
        const rows = results.rows.map((row: any) => results.fields.map((f: string) => String(row[f] ?? '')).join('\t')).join('\n');
        navigator.clipboard.writeText(headers + '\n' + rows);
        showToast(`${results.rows.length} rows copied`, 'success');
    };
    
    // Column Statistics
    const getColumnStats = (field: string) => {
        if (!results?.rows) return null;
        const values = results.rows.map((r: any) => r[field]).filter((v: any) => v !== null && v !== undefined);
        const total = values.length;
        const nullCount = results.rows.length - total;
        
        const numericValues = values.filter((v: any) => typeof v === 'number' || !isNaN(parseFloat(v)));
        if (numericValues.length === total && total > 0) {
            const nums = numericValues.map((v: any) => parseFloat(v));
            return {
                type: 'numeric',
                count: total,
                nullCount,
                min: Math.min(...nums).toFixed(2),
                max: Math.max(...nums).toFixed(2),
                avg: (nums.reduce((a: number, b: number) => a + b, 0) / nums.length).toFixed(2),
                sum: nums.reduce((a: number, b: number) => a + b, 0).toFixed(2),
            };
        } else {
            const uniqueValues = new Set(values.map((v: any) => String(v)));
            return {
                type: 'text',
                count: total,
                nullCount,
                uniqueCount: uniqueValues.size,
            };
        }
    };

    // Sorting & Filtering
    const sortedRows = results?.rows ? [...results.rows].sort((a, b) => {
        if (!sortField || !sortDirection) return 0;
        const aVal = a[sortField], bVal = b[sortField];
        if (aVal === bVal) return 0;
        if (aVal === null) return 1;
        if (bVal === null) return -1;
        return sortDirection === 'asc' ? (aVal < bVal ? -1 : 1) : (aVal > bVal ? -1 : 1);
    }) : [];

    const filteredRows = resultsFilter.trim()
        ? sortedRows.filter((row: any) => Object.values(row).some((val: any) => val !== null && String(val).toLowerCase().includes(resultsFilter.toLowerCase())))
        : sortedRows;

    const totalPages = Math.ceil(filteredRows.length / itemsPerPage);
    const paginatedRows = filteredRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc');
            if (sortDirection === 'desc') setSortField(null);
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // ========================================================================
    // STYLES
    // ========================================================================

    const styles = {
        container: { display: 'flex', height: '100%', backgroundColor: theme.bg, color: theme.text, fontFamily: 'Inter, system-ui, sans-serif' },
        sidebar: { width: showSidebar ? 280 : 0, backgroundColor: theme.bgCard, borderRight: `1px solid ${theme.border}`, transition: 'width 0.2s ease', overflow: 'hidden', display: 'flex', flexDirection: 'column' as const },
        main: { flex: 1, display: 'flex', flexDirection: 'column' as const, minWidth: 0, position: 'relative' as const },
        toolbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', backgroundColor: theme.bgCard, borderBottom: `1px solid ${theme.border}`, gap: 8 },
        btn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.15s ease' },
        btnPrimary: { backgroundColor: theme.primary, color: '#fff' },
        btnSecondary: { backgroundColor: 'transparent', color: theme.textSecondary, border: `1px solid ${theme.border}` },
        btnIcon: { padding: 6, backgroundColor: 'transparent', color: theme.textSecondary, border: 'none', borderRadius: 6, cursor: 'pointer' },
        input: { padding: '6px 10px', borderRadius: 6, border: `1px solid ${theme.border}`, backgroundColor: theme.bgInput, color: theme.text, fontSize: 13, outline: 'none' },
        select: { padding: '6px 10px', borderRadius: 6, border: `1px solid ${theme.border}`, backgroundColor: theme.bgInput, color: theme.text, fontSize: 13 },
        modal: { position: 'fixed' as const, inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
        modalContent: { backgroundColor: theme.bgCard, borderRadius: 12, padding: 24, width: 440, maxWidth: '90vw', border: `1px solid ${theme.border}` },
        table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
        th: { padding: '10px 12px', textAlign: 'left' as const, backgroundColor: theme.bgHover, color: theme.textSecondary, fontWeight: 600, borderBottom: `1px solid ${theme.border}`, cursor: 'pointer', userSelect: 'none' as const },
        td: { padding: '8px 12px', borderBottom: `1px solid ${theme.border}`, color: theme.text },
        tabs: { display: 'flex', alignItems: 'center', gap: 2, padding: '4px 8px', backgroundColor: theme.bgHover, borderBottom: `1px solid ${theme.border}`, overflowX: 'auto' as const },
        tab: { display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: '6px 6px 0 0', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' as const },
        statusBar: { display: 'flex', justifyContent: 'space-between', padding: '4px 12px', fontSize: 11, color: theme.textMuted, backgroundColor: theme.bgHover, borderTop: `1px solid ${theme.border}` },
    };

    // ========================================================================
    // RENDER
    // ========================================================================

    return (
        <div style={styles.container}>
            {/* Sidebar */}
            <div style={styles.sidebar}>
                <div style={{ padding: 16, borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>📁 Query Library</span>
                    <button onClick={() => setShowSidebar(false)} style={{ ...styles.btnIcon, fontSize: 16 }}>×</button>
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
                    {/* Favorites Section */}
                    {savedQueries.filter(sq => favorites.includes(sq.id)).length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: theme.warning, marginBottom: 8, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                                ⭐ Favorites
                            </div>
                            {savedQueries.filter(sq => favorites.includes(sq.id)).map(sq => (
                                <div key={sq.id} onClick={() => { setQuery(sq.query); showToast('Query loaded', 'success'); }} style={{ padding: 10, borderRadius: 6, marginBottom: 6, cursor: 'pointer', backgroundColor: theme.bgHover, border: `1px solid ${theme.warning}40` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 500, fontSize: 13 }}>{sq.name}</span>
                                        <button onClick={(e) => { e.stopPropagation(); toggleFavorite(sq.id); }} style={{ ...styles.btnIcon, fontSize: 12, color: theme.warning }}>⭐</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* My Queries */}
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, marginBottom: 8, textTransform: 'uppercase' }}>My Queries</div>
                        {savedQueries.filter(sq => sq.userId === currentUser?.id).map(sq => (
                            <div key={sq.id} onClick={() => { setQuery(sq.query); showToast('Query loaded', 'success'); }} style={{ padding: 10, borderRadius: 6, marginBottom: 6, cursor: 'pointer', backgroundColor: theme.bgHover, border: `1px solid ${theme.border}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 500, fontSize: 13 }}>{sq.name}</span>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        <button onClick={(e) => { e.stopPropagation(); toggleFavorite(sq.id); }} style={{ ...styles.btnIcon, fontSize: 12, color: favorites.includes(sq.id) ? theme.warning : theme.textMuted }}>
                                            {favorites.includes(sq.id) ? '⭐' : '☆'}
                                        </button>
                                        <button onClick={(e) => handleDeleteQuery(sq.id, e)} style={{ ...styles.btnIcon, fontSize: 12, color: theme.error }}>🗑</button>
                                    </div>
                                </div>
                                {sq.description && <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>{sq.description}</div>}
                            </div>
                        ))}
                        {savedQueries.filter(sq => sq.userId === currentUser?.id).length === 0 && (
                            <div style={{ fontSize: 12, color: theme.textMuted, padding: 8, textAlign: 'center' }}>No saved queries yet</div>
                        )}
                    </div>
                    
                    {/* Team Queries */}
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, marginBottom: 8, textTransform: 'uppercase' }}>Team Queries</div>
                        {savedQueries.filter(sq => sq.userId !== currentUser?.id).map(sq => (
                            <div key={sq.id} onClick={() => { setQuery(sq.query); showToast('Query loaded', 'success'); }} style={{ padding: 10, borderRadius: 6, marginBottom: 6, cursor: 'pointer', backgroundColor: theme.bgHover, border: `1px solid ${theme.border}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 500, fontSize: 13 }}>{sq.name}</span>
                                    <button onClick={(e) => { e.stopPropagation(); toggleFavorite(sq.id); }} style={{ ...styles.btnIcon, fontSize: 12, color: favorites.includes(sq.id) ? theme.warning : theme.textMuted }}>
                                        {favorites.includes(sq.id) ? '⭐' : '☆'}
                                    </button>
                                </div>
                                <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>by {sq.userName || 'Unknown'}</div>
                            </div>
                        ))}
                        {savedQueries.filter(sq => sq.userId !== currentUser?.id).length === 0 && (
                            <div style={{ fontSize: 12, color: theme.textMuted, padding: 8, textAlign: 'center' }}>No team queries</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div style={styles.main}>
                {/* Toolbar */}
                <div style={styles.toolbar}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => setShowSidebar(!showSidebar)} style={styles.btnIcon} title="Saved Queries">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <select value={selectedConnection} onChange={(e) => { setSelectedConnection(e.target.value); setConnectionStatus(e.target.value ? 'connected' : 'disconnected'); }} style={{ ...styles.select, minWidth: 160 }}>
                                <option value="">Select Connection</option>
                                {connections.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
                            </select>
                            <button 
                                onClick={testConnection} 
                                disabled={testingConnection || !selectedConnection}
                                style={{ 
                                    ...styles.btnIcon, 
                                    opacity: testingConnection || !selectedConnection ? 0.5 : 1,
                                    animation: testingConnection ? 'spin 1s linear infinite' : 'none'
                                }} 
                                title="Test Connection"
                            >
                                {testingConnection ? '⏳' : '🔌'}
                            </button>
                            <span style={{ 
                                width: 8, height: 8, borderRadius: '50%', 
                                backgroundColor: connectionStatus === 'connected' ? theme.success : connectionStatus === 'testing' ? theme.warning : theme.textMuted,
                                boxShadow: connectionStatus === 'connected' ? `0 0 6px ${theme.success}` : 'none'
                            }} title={connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'testing' ? 'Testing...' : 'Not connected'} />
                        </div>
                        <div style={{ position: 'relative' }}>
                            <button onClick={() => setShowTemplates(!showTemplates)} style={{ ...styles.btn, ...styles.btnSecondary }}>
                                📝 Templates
                            </button>
                            {showTemplates && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, width: 280, backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', zIndex: 50, overflow: 'hidden', maxHeight: 400, overflowY: 'auto' }}>
                                    <div style={{ padding: '8px 12px', borderBottom: `1px solid ${theme.border}`, fontSize: 12, fontWeight: 600, color: theme.textMuted, textTransform: 'uppercase' }}>Query Templates</div>
                                    {['Schema', 'Stats', 'Performance', 'Admin'].map(category => {
                                        const categoryTemplates = QUERY_TEMPLATES.filter(t => t.category === category);
                                        if (categoryTemplates.length === 0) return null;
                                        return (
                                            <div key={category}>
                                                <div style={{ padding: '6px 12px', fontSize: 10, fontWeight: 600, color: theme.textMuted, textTransform: 'uppercase', backgroundColor: theme.bgHover }}>{category}</div>
                                                {categoryTemplates.map((t, i) => (
                                                    <button key={i} onClick={() => { setQuery(t.query); setShowTemplates(false); showToast(`Template "${t.name}" loaded`, 'info'); }} 
                                                        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 12px', textAlign: 'left', border: 'none', backgroundColor: 'transparent', color: theme.text, cursor: 'pointer', fontSize: 13 }}>
                                                        <span>{t.icon}</span> <span>{t.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <button onClick={() => setShowHistory(!showHistory)} style={styles.btnIcon} title="History">🕒</button>
                        <button onClick={handleFormatQuery} style={styles.btnIcon} title="Format SQL">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 10h16M4 14h10M4 18h6"/></svg>
                        </button>
                        <button onClick={handleCopyQuery} style={styles.btnIcon} title="Copy Query">📋</button>
                        <button onClick={handleShareQuery} style={styles.btnIcon} title="Share Query">🔗</button>
                        <button onClick={() => setWordWrap(!wordWrap)} style={{ ...styles.btnIcon, color: wordWrap ? theme.primary : theme.textSecondary }} title="Word Wrap">↩️</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => setShowAiModal(true)} style={{ ...styles.btn, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: '#fff' }}>
                            ✨ AI Assist
                        </button>
                        <button onClick={() => setShowSaveModal(true)} style={{ ...styles.btn, background: 'linear-gradient(135deg, #22c55e, #10b981)', color: '#fff' }}>
                            💾 Save
                        </button>
                        <button onClick={() => setIsDarkMode(!isDarkMode)} style={styles.btnIcon}>{isDarkMode ? '🌞' : '🌙'}</button>
                        <button onClick={() => setShowShortcuts(true)} style={styles.btnIcon} title="Keyboard Shortcuts (F1)">⌨️</button>
                        <button onClick={handleExecute} disabled={loading || !selectedConnection} style={{ ...styles.btn, ...styles.btnPrimary, opacity: loading || !selectedConnection ? 0.5 : 1 }}>
                            {loading ? '⏳ Running...' : '▶ Execute'}
                        </button>
                    </div>
                </div>

                {/* Query Tabs */}
                <div style={styles.tabs}>
                    {queryTabs.map(tab => (
                        <div 
                            key={tab.id} 
                            onClick={() => setActiveTabId(tab.id)} 
                            onDoubleClick={() => startEditingTab(tab.id, tab.name)}
                            style={{ ...styles.tab, backgroundColor: activeTabId === tab.id ? theme.bgCard : 'transparent', color: activeTabId === tab.id ? theme.text : theme.textMuted }}
                        >
                            {editingTabId === tab.id ? (
                                <input 
                                    value={editingTabName}
                                    onChange={(e) => setEditingTabName(e.target.value)}
                                    onBlur={finishEditingTab}
                                    onKeyDown={(e) => { if (e.key === 'Enter') finishEditingTab(); if (e.key === 'Escape') { setEditingTabId(null); setEditingTabName(''); }}}
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ background: 'transparent', border: 'none', outline: 'none', color: theme.text, width: 80, fontSize: 13 }}
                                />
                            ) : (
                                <>
                                    {tab.name}{tab.unsaved && <span style={{ color: theme.warning }}>•</span>}
                                </>
                            )}
                            {queryTabs.length > 1 && <button onClick={(e) => closeTab(tab.id, e)} style={{ marginLeft: 4, background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer', fontSize: 12 }}>×</button>}
                        </div>
                    ))}
                    <button onClick={addNewTab} style={{ ...styles.btnIcon, fontSize: 16 }} title="New Tab">+</button>
                </div>

                {/* Editor & Results */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    {/* Editor */}
                    <div style={{ height: `${editorHeight}%`, position: 'relative', borderBottom: `1px solid ${theme.border}` }}>
                        <Editor
                            height="100%"
                            defaultLanguage="sql"
                            value={query}
                            onChange={(v) => setQuery(v || '')}
                            onMount={handleEditorMount}
                            theme={isDarkMode ? 'vs-dark' : 'vs-light'}
                            options={{ 
                                minimap: { enabled: showMinimap }, 
                                fontSize: fontSize, 
                                lineNumbers: showLineNumbers ? 'on' : 'off', 
                                wordWrap: wordWrap ? 'on' : 'off', 
                                padding: { top: 12 }, 
                                scrollBeyondLastLine: false, 
                                automaticLayout: true,
                                folding: true,
                                lineDecorationsWidth: 10,
                                renderLineHighlight: 'all',
                                cursorBlinking: 'smooth',
                                smoothScrolling: true,
                            }}
                        />
                        <div style={styles.statusBar}>
                            <span>Ln {cursorPosition.line}, Col {cursorPosition.column} | {query.split('\n').length} lines | {query.length} chars</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button onClick={() => setShowMinimap(!showMinimap)} style={{ ...styles.btnIcon, padding: '2px 6px', fontSize: 10 }} title="Toggle Minimap">{showMinimap ? '🗺️' : '🗺️'}</button>
                                <button onClick={() => setShowLineNumbers(!showLineNumbers)} style={{ ...styles.btnIcon, padding: '2px 6px', fontSize: 10 }} title="Toggle Line Numbers">{showLineNumbers ? '#' : '−'}</button>
                                <select value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} style={{ ...styles.select, padding: '2px 4px', fontSize: 10, minWidth: 50 }}>
                                    <option value={12}>12px</option><option value={14}>14px</option><option value={16}>16px</option><option value={18}>18px</option><option value={20}>20px</option>
                                </select>
                                <span style={{ fontSize: 10 }}>SQL | {wordWrap ? 'Wrap: On' : 'Wrap: Off'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Resize Handle */}
                    <div ref={resizeRef} onMouseDown={() => { isDragging.current = true; document.body.style.cursor = 'row-resize'; document.body.style.userSelect = 'none'; }} 
                         style={{ height: 6, backgroundColor: theme.bgHover, cursor: 'row-resize', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 40, height: 3, borderRadius: 2, backgroundColor: theme.border }} />
                    </div>

                    {/* Results Panel */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, backgroundColor: theme.bgCard }} onClick={closeContextMenu}>
                        {/* Results Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: `1px solid ${theme.border}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ fontWeight: 600, fontSize: 13 }}>📊 Results</span>
                                {executionTime !== null && <span style={{ fontSize: 12, color: theme.textMuted, padding: '2px 8px', backgroundColor: theme.bgHover, borderRadius: 4 }}>⏱ {formatDuration(executionTime)}</span>}
                                {results && <span style={{ fontSize: 12, color: theme.textMuted }}>{resultsFilter ? `${filteredRows.length} / ` : ''}{results.rowCount} rows</span>}
                                {selectedRows.size > 0 && (
                                    <span style={{ fontSize: 12, color: theme.primary, padding: '2px 8px', backgroundColor: `${theme.primary}20`, borderRadius: 4 }}>
                                        ✓ {selectedRows.size} selected
                                    </span>
                                )}
                                {/* View Mode Switcher */}
                                {results?.rows?.length > 0 && (
                                    <div style={{ display: 'flex', gap: 2, backgroundColor: theme.bgHover, borderRadius: 4, padding: 2 }}>
                                        <button onClick={() => setViewMode('table')} style={{ ...styles.btnIcon, padding: '4px 8px', fontSize: 11, backgroundColor: viewMode === 'table' ? theme.bgCard : 'transparent', borderRadius: 3 }} title="Table View">📋</button>
                                        <button onClick={() => setViewMode('json')} style={{ ...styles.btnIcon, padding: '4px 8px', fontSize: 11, backgroundColor: viewMode === 'json' ? theme.bgCard : 'transparent', borderRadius: 3 }} title="JSON View">{ }</button>
                                        <button onClick={() => setViewMode('cards')} style={{ ...styles.btnIcon, padding: '4px 8px', fontSize: 11, backgroundColor: viewMode === 'cards' ? theme.bgCard : 'transparent', borderRadius: 3 }} title="Card View">🃏</button>
                                    </div>
                                )}
                            </div>
                            {results?.rows?.length > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <input type="text" placeholder="🔍 Filter..." value={resultsFilter} onChange={(e) => { setResultsFilter(e.target.value); setCurrentPage(1); }} style={{ ...styles.input, width: 140 }} />
                                    <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} style={styles.select}>
                                        <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
                                    </select>
                                    <div style={{ height: 16, width: 1, backgroundColor: theme.border }} />
                                    {selectedRows.size > 0 && (
                                        <button onClick={handleExportSelected} style={{ ...styles.btn, ...styles.btnSecondary, padding: '4px 8px', fontSize: 11 }} title="Export Selected">
                                            📤 Export {selectedRows.size}
                                        </button>
                                    )}
                                    <button onClick={handleCopyAllResults} style={styles.btnIcon} title="Copy All">📋</button>
                                    <div style={{ position: 'relative' }}>
                                        <button onClick={() => setShowExportMenu(!showExportMenu)} style={{ ...styles.btn, ...styles.btnSecondary, padding: '4px 8px', fontSize: 12 }}>
                                            Export ▾
                                        </button>
                                        {showExportMenu && (
                                            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, width: 180, backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', zIndex: 50, overflow: 'hidden' }}>
                                                <button onClick={() => { handleExportCsv(); setShowExportMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 12px', border: 'none', backgroundColor: 'transparent', color: theme.text, cursor: 'pointer', fontSize: 13, textAlign: 'left' }}>📄 CSV</button>
                                                <button onClick={() => { handleExportExcel(); setShowExportMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 12px', border: 'none', backgroundColor: 'transparent', color: theme.text, cursor: 'pointer', fontSize: 13, textAlign: 'left' }}>📊 Excel</button>
                                                <button onClick={() => { handleExportJson(); setShowExportMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 12px', border: 'none', backgroundColor: 'transparent', color: theme.text, cursor: 'pointer', fontSize: 13, textAlign: 'left' }}>{ } JSON</button>
                                                <div style={{ height: 1, backgroundColor: theme.border, margin: '4px 0' }} />
                                                <button onClick={() => { handleExportMarkdown(); setShowExportMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 12px', border: 'none', backgroundColor: 'transparent', color: theme.text, cursor: 'pointer', fontSize: 13, textAlign: 'left' }}>📝 Markdown</button>
                                                <button onClick={() => { handleCopyAsInsert(); setShowExportMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 12px', border: 'none', backgroundColor: 'transparent', color: theme.text, cursor: 'pointer', fontSize: 13, textAlign: 'left' }}>💾 INSERT SQL</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Results Content */}
                        <div style={{ flex: 1, overflow: 'auto', padding: loading || error || !results ? 16 : 0 }}>
                            {loading && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 48, marginBottom: 12, animation: 'spin 1s linear infinite' }}>⚙️</div>
                                        <div style={{ color: theme.textMuted, marginBottom: 8 }}>Executing query...</div>
                                        <div style={{ fontSize: 24, fontWeight: 600, fontFamily: 'monospace', color: theme.primary }}>
                                            {formatDuration(liveTimer)}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {error && (
                                <div style={{ padding: 16, backgroundColor: `${theme.error}15`, border: `1px solid ${theme.error}40`, borderRadius: 8 }}>
                                    <div style={{ fontWeight: 600, color: theme.error, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 20 }}>⚠️</span>
                                        <span>Query Error</span>
                                    </div>
                                    <pre style={{ color: theme.error, fontSize: 13, whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'monospace' }}>{error}</pre>
                                </div>
                            )}
                            {results && (
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th style={{ ...styles.th, width: 40 }}>#</th>
                                            {results.fields?.map((field: string, i: number) => (
                                                <th key={i} style={styles.th} onClick={() => handleSort(field)} title={`Click to sort by ${field}`}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <span>{field}</span>
                                                        {sortField === field && <span style={{ color: theme.primary }}>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedRows.map((row: any, ri: number) => (
                                            <tr 
                                                key={ri} 
                                                style={{ backgroundColor: ri % 2 === 0 ? 'transparent' : theme.bgHover, cursor: 'pointer' }}
                                                onDoubleClick={() => { setSelectedRow(row); setShowRowDetails(true); }}
                                            >
                                                <td style={{ ...styles.td, color: theme.textMuted }}>{(currentPage - 1) * itemsPerPage + ri + 1}</td>
                                                {results.fields?.map((field: string, fi: number) => (
                                                    <td 
                                                        key={fi} 
                                                        style={{ ...styles.td, cursor: 'pointer', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                                        onClick={() => handleCopyCell(row[field])}
                                                        title={row[field] === null ? 'NULL' : `${String(row[field]).substring(0, 100)}${String(row[field]).length > 100 ? '...' : ''}\n\nClick to copy`}
                                                    >
                                                        {row[field] === null ? (
                                                            <span style={{ color: theme.textMuted, fontStyle: 'italic', fontSize: 11 }}>NULL</span>
                                                        ) : typeof row[field] === 'boolean' ? (
                                                            <span style={{ color: row[field] ? theme.success : theme.error }}>{row[field] ? '✓ true' : '✗ false'}</span>
                                                        ) : typeof row[field] === 'number' ? (
                                                            <span style={{ fontFamily: 'monospace', color: theme.accent }}>{row[field].toLocaleString()}</span>
                                                        ) : String(row[field]).length > 50 ? (
                                                            <span>{String(row[field]).substring(0, 50)}...</span>
                                                        ) : (
                                                            String(row[field])
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                            {!loading && !error && !results && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                    <div style={{ textAlign: 'center', color: theme.textMuted }}>
                                        <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>🔍</div>
                                        <div>Run a query to see results</div>
                                        <div style={{ fontSize: 12, marginTop: 4 }}>Press <kbd style={{ padding: '2px 6px', backgroundColor: theme.bgHover, borderRadius: 4 }}>F5</kbd> or <kbd style={{ padding: '2px 6px', backgroundColor: theme.bgHover, borderRadius: 4 }}>Ctrl+Enter</kbd></div>
                                        <div style={{ fontSize: 11, marginTop: 8, color: theme.textMuted }}>💡 Click a cell to copy • Double-click a row to view details</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        {results && totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 12, borderTop: `1px solid ${theme.border}` }}>
                                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} style={{ ...styles.btn, ...styles.btnSecondary, opacity: currentPage === 1 ? 0.5 : 1 }}>««</button>
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ ...styles.btn, ...styles.btnSecondary, opacity: currentPage === 1 ? 0.5 : 1 }}>‹</button>
                                <span style={{ fontSize: 13, color: theme.textSecondary }}>Page {currentPage} of {totalPages}</span>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ ...styles.btn, ...styles.btnSecondary, opacity: currentPage === totalPages ? 0.5 : 1 }}>›</button>
                                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} style={{ ...styles.btn, ...styles.btnSecondary, opacity: currentPage === totalPages ? 0.5 : 1 }}>»»</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* History Panel */}
                {showHistory && (
                    <div style={{ position: 'absolute', top: 56, left: 16, width: 420, backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', zIndex: 40, maxHeight: 500, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: 12, borderBottom: `1px solid ${theme.border}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <span style={{ fontWeight: 600 }}>🕒 Query History</span>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={() => { setQueryHistory([]); localStorage.removeItem('queryHistory'); showToast('History cleared', 'info'); }} style={{ fontSize: 12, color: theme.error, background: 'none', border: 'none', cursor: 'pointer' }}>Clear All</button>
                                    <button onClick={() => setShowHistory(false)} style={styles.btnIcon}>×</button>
                                </div>
                            </div>
                            <input 
                                type="text" 
                                placeholder="🔍 Search history..." 
                                value={historySearch} 
                                onChange={(e) => setHistorySearch(e.target.value)}
                                style={{ ...styles.input, width: '100%' }}
                            />
                        </div>
                        <div style={{ flex: 1, overflow: 'auto' }}>
                            {filteredHistory.length === 0 ? (
                                <div style={{ padding: 24, textAlign: 'center', color: theme.textMuted, fontSize: 13 }}>
                                    {queryHistory.length === 0 ? '📭 No history yet' : '🔍 No matching queries'}
                                </div>
                            ) : filteredHistory.slice(0, 50).map((item, i) => (
                                <div key={i} style={{ padding: 12, borderBottom: `1px solid ${theme.border}`, cursor: 'pointer', transition: 'background 0.1s' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: theme.textMuted, marginBottom: 4 }}>
                                        <span>{new Date(item.timestamp).toLocaleString()}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            {item.duration && <span style={{ backgroundColor: theme.bgHover, padding: '2px 6px', borderRadius: 4 }}>{formatDuration(item.duration)}</span>}
                                            <span style={{ color: item.success ? theme.success : theme.error }}>{item.success ? '✓' : '✗'}</span>
                                        </div>
                                    </div>
                                    <code style={{ fontSize: 12, color: theme.textSecondary, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 8 }}>{item.query}</code>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button onClick={() => { setQuery(item.query); setShowHistory(false); showToast('Query loaded', 'success'); }} style={{ ...styles.btn, ...styles.btnSecondary, padding: '4px 8px', fontSize: 11 }}>📝 Use</button>
                                        <button onClick={() => { navigator.clipboard.writeText(item.query); showToast('Query copied', 'success'); }} style={{ ...styles.btn, ...styles.btnSecondary, padding: '4px 8px', fontSize: 11 }}>📋 Copy</button>
                                        <button onClick={() => { addNewTab(); setQuery(item.query); setShowHistory(false); }} style={{ ...styles.btn, ...styles.btnSecondary, padding: '4px 8px', fontSize: 11 }}>➕ New Tab</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: 8, borderTop: `1px solid ${theme.border}`, fontSize: 11, color: theme.textMuted, textAlign: 'center' }}>
                            Showing {Math.min(50, filteredHistory.length)} of {filteredHistory.length} entries
                        </div>
                    </div>
                )}
            </div>

            {/* Save Modal */}
            {showSaveModal && (
                <div style={styles.modal} onClick={() => setShowSaveModal(false)}>
                    <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>💾 Save Query</h3>
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: theme.textSecondary }}>Name *</label>
                            <input type="text" value={saveName} onChange={(e) => setSaveName(e.target.value)} style={{ ...styles.input, width: '100%' }} placeholder="My Query" autoFocus />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: theme.textSecondary }}>Description</label>
                            <input type="text" value={saveDescription} onChange={(e) => setSaveDescription(e.target.value)} style={{ ...styles.input, width: '100%' }} placeholder="Optional description" />
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 16 }}>
                            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
                            <span style={{ fontSize: 13 }}>Share with team</span>
                        </label>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button onClick={() => setShowSaveModal(false)} style={{ ...styles.btn, ...styles.btnSecondary }}>Cancel</button>
                            <button onClick={handleSaveQuery} disabled={!saveName} style={{ ...styles.btn, ...styles.btnPrimary, opacity: saveName ? 1 : 0.5 }}>Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Share Modal */}
            {showShareModal && (
                <div style={styles.modal} onClick={() => setShowShareModal(false)}>
                    <div style={{ ...styles.modalContent, maxWidth: 500 }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>🔗 Share Query</h3>
                        <p style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 12 }}>
                            Anyone with this link can open the query in their editor.
                        </p>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                            <input 
                                type="text" 
                                value={shareUrl || ''} 
                                readOnly 
                                style={{ ...styles.input, flex: 1, fontFamily: 'monospace', fontSize: 12 }}
                                onClick={(e) => (e.target as HTMLInputElement).select()}
                            />
                            <button onClick={copyShareUrl} style={{ ...styles.btn, ...styles.btnPrimary }}>📋 Copy</button>
                        </div>
                        <div style={{ padding: 12, backgroundColor: theme.bgHover, borderRadius: 8, fontSize: 12, color: theme.textMuted }}>
                            <strong>💡 Tip:</strong> The query is encoded in the URL. Long queries may create very long URLs.
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                            <button onClick={() => setShowShareModal(false)} style={{ ...styles.btn, ...styles.btnSecondary }}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Modal */}
            {showAiModal && (
                <div style={styles.modal} onClick={() => setShowAiModal(false)}>
                    <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>✨ AI SQL Assistant</h3>
                        <p style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 12 }}>Describe your query in natural language</p>
                        <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} style={{ ...styles.input, width: '100%', height: 100, resize: 'none', fontFamily: 'inherit' }} placeholder="e.g., Show me all users created last week" autoFocus />
                        {aiError && <div style={{ color: theme.error, fontSize: 13, marginTop: 8 }}>{aiError}</div>}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                            <button onClick={() => setShowAiModal(false)} style={{ ...styles.btn, ...styles.btnSecondary }}>Cancel</button>
                            <button onClick={handleAiGenerate} disabled={aiLoading || !aiPrompt.trim()} style={{ ...styles.btn, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: '#fff', opacity: aiLoading || !aiPrompt.trim() ? 0.5 : 1 }}>
                                {aiLoading ? '⏳ Generating...' : '✨ Generate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Shortcuts Modal */}
            {showShortcuts && (
                <div style={styles.modal} onClick={() => setShowShortcuts(false)}>
                    <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>⌨️ Keyboard Shortcuts</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {[
                                ['Execute Query', 'F5 / Ctrl+Enter'],
                                ['Save Query', 'Ctrl+S'],
                                ['AI Assist', 'Ctrl+Shift+A'],
                                ['Format SQL', 'Ctrl+Shift+F'],
                                ['New Tab', 'Ctrl+T'],
                                ['Show Shortcuts', 'F1'],
                                ['Toggle Word Wrap', 'Alt+Z'],
                                ['Close Modal', 'Esc'],
                            ].map(([action, keys]) => (
                                <div key={action} style={{ padding: 10, backgroundColor: theme.bgHover, borderRadius: 6 }}>
                                    <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 2 }}>{action}</div>
                                    <div style={{ fontWeight: 500, fontSize: 13 }}>{keys}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                            <button onClick={() => setShowShortcuts(false)} style={{ ...styles.btn, ...styles.btnSecondary }}>Close</button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Row Details Modal */}
            {showRowDetails && selectedRow && (
                <div style={styles.modal} onClick={() => setShowRowDetails(false)}>
                    <div style={{ ...styles.modalContent, maxWidth: 600, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontSize: 18 }}>📋 Row Details</h3>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(selectedRow, null, 2)); showToast('Row copied as JSON', 'success'); }} style={{ ...styles.btn, ...styles.btnSecondary }}>📋 Copy JSON</button>
                                <button onClick={() => setShowRowDetails(false)} style={styles.btnIcon}>×</button>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {results?.fields?.map((field: string, i: number) => (
                                <div key={i} style={{ padding: 12, backgroundColor: theme.bgHover, borderRadius: 6, border: `1px solid ${theme.border}` }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, marginBottom: 4, textTransform: 'uppercase' }}>{field}</div>
                                    <div style={{ fontSize: 14, fontFamily: selectedRow[field] === null || typeof selectedRow[field] === 'number' ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>
                                        {selectedRow[field] === null ? (
                                            <span style={{ color: theme.textMuted, fontStyle: 'italic' }}>NULL</span>
                                        ) : typeof selectedRow[field] === 'boolean' ? (
                                            <span style={{ color: selectedRow[field] ? theme.success : theme.error }}>{selectedRow[field] ? '✓ true' : '✗ false'}</span>
                                        ) : typeof selectedRow[field] === 'object' ? (
                                            <pre style={{ margin: 0, fontSize: 12, overflow: 'auto' }}>{JSON.stringify(selectedRow[field], null, 2)}</pre>
                                        ) : (
                                            String(selectedRow[field])
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Toast Notification */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    padding: '12px 20px',
                    borderRadius: 8,
                    backgroundColor: toast.type === 'success' ? theme.success : toast.type === 'error' ? theme.error : theme.primary,
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 500,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    zIndex: 1000,
                    animation: 'slideIn 0.3s ease'
                }}>
                    <span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}</span>
                    <span>{toast.message}</span>
                </div>
            )}
            
            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
