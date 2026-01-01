'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import loader from '@monaco-editor/loader';
import Editor, { Monaco } from '@monaco-editor/react';
import { useRouter } from 'next/navigation';

// Configure Monaco to load from local assets (offline support)
// This prevents loading from CDN (cdn.jsdelivr.net)
loader.config({
  paths: {
    vs: '/monaco-editor/min/vs'
  }
});


// ============================================================================
// TYPES
// ============================================================================

interface Connection {
    id: string;
    name: string;
    type: string;
    host?: string;
    port?: number;
    database?: string;
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

// SQL Snippets for quick insertion
const SQL_SNIPPETS = [
    { name: 'SELECT', snippet: 'SELECT column1, column2\nFROM table_name\nWHERE condition;', desc: 'Basic select query' },
    { name: 'JOIN', snippet: 'SELECT a.*, b.*\nFROM table_a a\nINNER JOIN table_b b ON a.id = b.a_id;', desc: 'Inner join two tables' },
    { name: 'LEFT JOIN', snippet: 'SELECT a.*, b.*\nFROM table_a a\nLEFT JOIN table_b b ON a.id = b.a_id;', desc: 'Left outer join' },
    { name: 'GROUP BY', snippet: 'SELECT column, COUNT(*) as count\nFROM table_name\nGROUP BY column\nORDER BY count DESC;', desc: 'Aggregate with grouping' },
    { name: 'SUBQUERY', snippet: 'SELECT *\nFROM table_name\nWHERE column IN (\n  SELECT column\n  FROM other_table\n  WHERE condition\n);', desc: 'Subquery example' },
    { name: 'CTE', snippet: 'WITH cte_name AS (\n  SELECT column1, column2\n  FROM table_name\n  WHERE condition\n)\nSELECT * FROM cte_name;', desc: 'Common Table Expression' },
    { name: 'INSERT', snippet: 'INSERT INTO table_name (column1, column2)\nVALUES (\'value1\', \'value2\');', desc: 'Insert new record' },
    { name: 'UPDATE', snippet: 'UPDATE table_name\nSET column1 = \'new_value\'\nWHERE condition;', desc: 'Update existing records' },
    { name: 'DELETE', snippet: 'DELETE FROM table_name\nWHERE condition;', desc: 'Delete records' },
    { name: 'CASE', snippet: 'SELECT column,\n  CASE\n    WHEN condition1 THEN result1\n    WHEN condition2 THEN result2\n    ELSE default_result\n  END as alias\nFROM table_name;', desc: 'Conditional logic' },
    { name: 'WINDOW', snippet: 'SELECT column,\n  ROW_NUMBER() OVER (PARTITION BY category ORDER BY value DESC) as rn\nFROM table_name;', desc: 'Window function' },
    { name: 'LIMIT/OFFSET', snippet: 'SELECT *\nFROM table_name\nORDER BY created_at DESC\nLIMIT 10 OFFSET 0;', desc: 'Pagination' },
];

// Error suggestions mapping
const ERROR_SUGGESTIONS: Record<string, { suggestion: string; quickFix?: string }> = {
    'relation.*does not exist': { suggestion: 'Check table name spelling or verify you are connected to the correct database', quickFix: 'SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\';' },
    'column.*does not exist': { suggestion: 'Check column name spelling. Use schema browser to verify available columns.' },
    'syntax error': { suggestion: 'Check for missing keywords, commas, or parentheses. Try formatting the query (Ctrl+Shift+F).' },
    'permission denied': { suggestion: 'You may not have access to this table. Contact your database administrator.' },
    'connection refused': { suggestion: 'Database server is not reachable. Check connection settings and network.' },
    'timeout': { suggestion: 'Query took too long. Try adding LIMIT, filtering with WHERE, or adding indexes.' },
};

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
    const [selectedConnection, setSelectedConnection] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('editorSelectedConnection') || '';
        }
        return '';
    });
    const [connectionSearch, setConnectionSearch] = useState('');
    const [showConnectionDropdown, setShowConnectionDropdown] = useState(false);
    const [recentConnections, setRecentConnections] = useState<string[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('editorRecentConnections');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });
    const [favoriteConnections, setFavoriteConnections] = useState<string[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('editorFavoriteConnections');
            return saved ? JSON.parse(saved).slice(0, 10) : [];
        }
        return [];
    });
    const [executionStats, setExecutionStats] = useState<Array<{ query: string; duration: number; timestamp: Date }>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('editorExecutionStats');
            return saved ? JSON.parse(saved).slice(-20) : [];
        }
        return [];
    });
    const [copyWithHeaders, setCopyWithHeaders] = useState(true);
    const [queryTabs, setQueryTabs] = useState<QueryTab[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('editorQueryTabs');
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch (e) { /* ignore */ }
            }
        }
        return [{ id: '1', name: 'Query 1', query: '-- Select your connection and write your SQL query\nSELECT * FROM information_schema.tables LIMIT 10;', unsaved: false }];
    });
    const [activeTabId, setActiveTabId] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('editorActiveTabId') || '1';
        }
        return '1';
    });
    
    // Results State
    const [results, setResults] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [executionTime, setExecutionTime] = useState<number | null>(null);
    
    // AI Error Analysis
    const [errorAnalysis, setErrorAnalysis] = useState<{ cause: string; solution: string; correctedQuery?: string } | null>(null);
    const [analyzingError, setAnalyzingError] = useState(false);
    
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
    
    // Query Library Filters
    const [librarySearch, setLibrarySearch] = useState('');
    const [librarySortBy, setLibrarySortBy] = useState<'name' | 'recent'>('recent');
    const [libraryShowLimit, setLibraryShowLimit] = useState(20);
    
    // Toast Notifications
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    
    // Connection Status
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'testing'>('disconnected');
    
    // Schema Browser
    const [showSchemaPanel, setShowSchemaPanel] = useState(false);
    const [schemaData, setSchemaData] = useState<{ tables: string[]; columns: Record<string, string[]> }>({ tables: [], columns: {} });
    const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
    const [schemaTranslations, setSchemaTranslations] = useState<Record<string, { koreanName: string; columns: Record<string, string> }>>({});
    
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
    const [saveNameGenerating, setSaveNameGenerating] = useState(false);
    
    // AI State
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');
    const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    
    // Schema Browser State
    const [showSchemaBrowser, setShowSchemaBrowser] = useState(false);
    const [schemaLoading, setSchemaLoading] = useState(false);
    const [schemaFilter, setSchemaFilter] = useState('');
    
    // Snippets Menu
    const [showSnippets, setShowSnippets] = useState(false);
    
    // Explain Plan State
    const [explainResult, setExplainResult] = useState<any>(null);
    const [showExplainModal, setShowExplainModal] = useState(false);
    const [explainLoading, setExplainLoading] = useState(false);
    
    // Page Jump
    const [pageJumpValue, setPageJumpValue] = useState('');
    
    // Query Complexity Indicator
    const [queryComplexity, setQueryComplexity] = useState<'low' | 'medium' | 'high'>('low');
    
    // Query Cancel
    const [abortController, setAbortController] = useState<AbortController | null>(null);
    
    // Auto Refresh
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [autoRefreshInterval, setAutoRefreshInterval] = useState(30);
    const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);
    
    // Chart Visualization
    const [showChart, setShowChart] = useState(false);
    const [chartType, setChartType] = useState<'bar' | 'pie' | 'line'>('bar');
    const [chartField, setChartField] = useState<string | null>(null);
    
    // Column Stats Popup
    const [statsPopupColumn, setStatsPopupColumn] = useState<string | null>(null);
    const [statsPopupPosition, setStatsPopupPosition] = useState<{ x: number; y: number } | null>(null);
    
    // Pinned Results
    const [pinnedResults, setPinnedResults] = useState<Array<{ id: string; query: string; results: any; timestamp: Date }>>([]);
    
    // Query History Undo
    const [queryUndoStack, setQueryUndoStack] = useState<string[]>([]);
    const [queryRedoStack, setQueryRedoStack] = useState<string[]>([]);
    
    // Multi-query execution
    const [splitQueryResults, setSplitQueryResults] = useState<Array<{ query: string; results: any; error?: string }>>([]);
    
    // Hidden Columns
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
    
    // Column Selector Modal
    const [showColumnSelector, setShowColumnSelector] = useState(false);
    
    // Editor State
    const [editorHeight, setEditorHeight] = useState(50);
    const [wordWrap, setWordWrap] = useState(false);
    const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
    const editorRef = useRef<any>(null);
    const monacoRef = useRef<Monaco | null>(null);
    const completionProviderRef = useRef<any>(null);
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
    
    // Open saved query in new tab
    const openSavedQueryInNewTab = (savedQuery: SavedQuery) => {
        const newId = Date.now().toString();
        const newTab: QueryTab = {
            id: newId,
            name: savedQuery.name,
            query: savedQuery.query,
            unsaved: false
        };
        const updatedTabs = [...queryTabs, newTab];
        setQueryTabs(updatedTabs);
        setActiveTabId(newId);
        localStorage.setItem('editorQueryTabs', JSON.stringify(updatedTabs));
        showToast(`Opened "${savedQuery.name}" in new tab`, 'success');
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
    
    const finishEditingTab = async () => {
        if (editingTabId && editingTabName.trim()) {
            const editingTab = queryTabs.find(t => t.id === editingTabId);
            const updatedTabs = queryTabs.map(t => 
                t.id === editingTabId ? { ...t, name: editingTabName.trim() } : t
            );
            setQueryTabs(updatedTabs);
            // Save to localStorage
            localStorage.setItem('editorQueryTabs', JSON.stringify(updatedTabs));
            
            // Also save to Query Library (backend)
            if (editingTab) {
                try {
                    const token = localStorage.getItem('token');
                    const res = await fetch('/api/queries', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ 
                            name: editingTabName.trim(), 
                            query: editingTab.query,
                            description: `Saved from tab: ${editingTabName.trim()}`,
                            isPublic: false
                        }),
                    });
                    if (res.ok) {
                        const savedQuery = await res.json();
                        setSavedQueries(prev => [...prev.filter(q => q.name !== editingTabName.trim()), savedQuery]);
                        showToast(`"${editingTabName.trim()}" saved to Query Library`, 'success');
                    } else {
                        showToast('Tab renamed (library save failed)', 'info');
                    }
                } catch (e) {
                    showToast('Tab renamed (library save failed)', 'info');
                }
            }
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
            const res = await fetch('/api/query/execute', {
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
    
    // Fetch Schema Data
    const fetchSchemaData = async () => {
        if (!selectedConnection) {
            showToast('Please select a connection first', 'error');
            return;
        }
        setSchemaLoading(true);
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch('/api/query/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ 
                    connectionId: selectedConnection, 
                    query: `SELECT table_name, column_name, data_type, is_nullable, column_default
                            FROM information_schema.columns 
                            WHERE table_schema = 'public' 
                            ORDER BY table_name, ordinal_position` 
                }),
            });
            if (res.ok) {
                const data = await res.json();
                const tables: string[] = [];
                const columns: Record<string, Array<{ name: string; type: string; nullable: string }>> = {};
                data.rows?.forEach((row: any) => {
                    if (!tables.includes(row.table_name)) {
                        tables.push(row.table_name);
                        columns[row.table_name] = [];
                    }
                    columns[row.table_name].push({
                        name: row.column_name,
                        type: row.data_type,
                        nullable: row.is_nullable
                    });
                });
                setSchemaData({ tables, columns: columns as any });
                setShowSchemaBrowser(true);
            } else {
                showToast('Failed to fetch schema', 'error');
            }
        } catch (e) {
            showToast('Failed to fetch schema', 'error');
        } finally {
            setSchemaLoading(false);
        }
    };
    
    // Explain/Analyze Query
    const handleExplainQuery = async () => {
        if (!selectedConnection || !query.trim()) {
            showToast('Please select a connection and enter a query', 'error');
            return;
        }
        setExplainLoading(true);
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch('/api/query/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ 
                    connectionId: selectedConnection, 
                    query: `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}` 
                }),
            });
            if (res.ok) {
                const data = await res.json();
                setExplainResult(data.rows?.[0]?.['QUERY PLAN'] || data.rows);
                setShowExplainModal(true);
            } else {
                const errorData = await res.json();
                showToast(`Explain failed: ${errorData.message || 'Unknown error'}`, 'error');
            }
        } catch (e: any) {
            showToast(`Explain failed: ${e.message}`, 'error');
        } finally {
            setExplainLoading(false);
        }
    };
    
    // Insert snippet at cursor
    const insertSnippet = (snippet: string) => {
        if (editorRef.current) {
            const editor = editorRef.current;
            const selection = editor.getSelection();
            const range = new (window as any).monaco.Range(
                selection.startLineNumber,
                selection.startColumn,
                selection.endLineNumber,
                selection.endColumn
            );
            editor.executeEdits('snippet', [{ range, text: snippet, forceMoveMarkers: true }]);
            editor.focus();
        } else {
            setQuery(query + '\n' + snippet);
        }
        setShowSnippets(false);
        showToast('Snippet inserted', 'success');
    };
    
    // SQL Keywords for autocomplete
    const SQL_KEYWORDS = [
        'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN',
        'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'CROSS JOIN',
        'ON', 'USING', 'GROUP BY', 'HAVING', 'ORDER BY', 'ASC', 'DESC', 'LIMIT', 'OFFSET',
        'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE', 'ALTER TABLE',
        'DROP TABLE', 'CREATE INDEX', 'DROP INDEX', 'DISTINCT', 'AS', 'CASE', 'WHEN', 'THEN',
        'ELSE', 'END', 'NULL', 'IS NULL', 'IS NOT NULL', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN',
        'COALESCE', 'NULLIF', 'CAST', 'CONVERT', 'UNION', 'UNION ALL', 'EXCEPT', 'INTERSECT',
        'EXISTS', 'ANY', 'ALL', 'WITH', 'RECURSIVE', 'OVER', 'PARTITION BY', 'ROW_NUMBER',
        'RANK', 'DENSE_RANK', 'FIRST_VALUE', 'LAST_VALUE', 'LAG', 'LEAD'
    ];
    
    // Handle Editor Mount - Register SQL Autocomplete
    const handleEditorMount = (editor: any, monaco: Monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
        
        // Register keyboard shortcuts in Monaco editor
        // Ctrl+Enter or F5 to execute query (full query or selected text)
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            const selection = editor.getSelection();
            const selectedText = editor.getModel()?.getValueInRange(selection);
            
            if (selectedText && selectedText.trim().length > 0) {
                // Execute selected text only
                const event = new CustomEvent('executeSelectedQuery', { detail: selectedText.trim() });
                window.dispatchEvent(event);
            } else {
                // Execute full query
                const executeBtn = document.querySelector('[data-execute-btn]') as HTMLButtonElement;
                if (executeBtn && !executeBtn.disabled) {
                    executeBtn.click();
                }
            }
        });
        
        editor.addCommand(monaco.KeyCode.F5, () => {
            const executeBtn = document.querySelector('[data-execute-btn]') as HTMLButtonElement;
            if (executeBtn && !executeBtn.disabled) {
                executeBtn.click();
            }
        });
        
        // Ctrl+Shift+Enter to execute selected text only
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
            const selection = editor.getSelection();
            const selectedText = editor.getModel()?.getValueInRange(selection);
            if (selectedText && selectedText.trim().length > 0) {
                const event = new CustomEvent('executeSelectedQuery', { detail: selectedText.trim() });
                window.dispatchEvent(event);
            }
        });
        
        // Ctrl+S to save
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            setShowSaveModal(true);
        });
        
        // Ctrl+Shift+F to format
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
            const formatBtn = document.querySelector('[data-format-btn]') as HTMLButtonElement;
            if (formatBtn) formatBtn.click();
        });
        
        // Ctrl+/ to toggle comment
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () => {
            const selection = editor.getSelection();
            const startLine = selection.startLineNumber;
            const endLine = selection.endLineNumber;
            const model = editor.getModel();
            
            const edits: any[] = [];
            for (let line = startLine; line <= endLine; line++) {
                const lineContent = model.getLineContent(line);
                const trimmed = lineContent.trimStart();
                if (trimmed.startsWith('--')) {
                    // Remove comment
                    const commentIndex = lineContent.indexOf('--');
                    edits.push({
                        range: { startLineNumber: line, startColumn: commentIndex + 1, endLineNumber: line, endColumn: commentIndex + 3 },
                        text: ''
                    });
                } else {
                    // Add comment
                    edits.push({
                        range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
                        text: '-- '
                    });
                }
            }
            editor.executeEdits('toggle-comment', edits);
        });
        
        // Ctrl+T to add new tab
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyT, () => {
            const addTabBtn = document.querySelector('[data-add-tab-btn]') as HTMLButtonElement;
            if (addTabBtn) addTabBtn.click();
        });
        
        // Ctrl+Shift+A for AI assist
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyA, () => {
            setShowAiModal(true);
        });
        
        // Ctrl+H for history
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH, () => {
            setShowHistory(prev => !prev);
        });
        
        // Ctrl+E for explain plan
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE, () => {
            const explainBtn = document.querySelector('[data-explain-btn]') as HTMLButtonElement;
            if (explainBtn && !explainBtn.disabled) explainBtn.click();
        });
        
        // Ctrl+D to duplicate line
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD, () => {
            const selection = editor.getSelection();
            const model = editor.getModel();
            const lineNumber = selection.startLineNumber;
            const lineContent = model.getLineContent(lineNumber);
            editor.executeEdits('duplicate-line', [{
                range: { startLineNumber: lineNumber, startColumn: 1, endLineNumber: lineNumber, endColumn: 1 },
                text: lineContent + '\n'
            }]);
        });
        
        // Track cursor position
        editor.onDidChangeCursorPosition((e: any) => {
            setCursorPosition({ line: e.position.lineNumber, column: e.position.column });
        });
        
        // Track selection for status bar
        editor.onDidChangeCursorSelection((e: any) => {
            const selection = e.selection;
            const model = editor.getModel();
            if (model && !selection.isEmpty()) {
                const selectedText = model.getValueInRange(selection);
                const lines = selectedText.split('\n').length;
                const chars = selectedText.length;
                // Update selection info (could add state for this)
            }
        });
        
        // Register SQL completion provider
        if (completionProviderRef.current) {
            completionProviderRef.current.dispose();
        }
        
        completionProviderRef.current = monaco.languages.registerCompletionItemProvider('sql', {
            triggerCharacters: [' ', '.', '(', ','],
            provideCompletionItems: (model: any, position: any) => {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn
                };
                
                // Get text before cursor for context analysis
                const textBeforeCursor = model.getValueInRange({
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column
                }).toUpperCase();
                
                const lineContent = model.getLineContent(position.lineNumber);
                const textBeforeOnLine = lineContent.substring(0, position.column - 1);
                
                const suggestions: any[] = [];
                
                // Check for table.column pattern (after a dot)
                const dotMatch = textBeforeOnLine.match(/(\w+)\.\s*$/);
                if (dotMatch) {
                    const tableName = dotMatch[1].toLowerCase();
                    const tableColumns = schemaData.columns[tableName];
                    if (tableColumns && Array.isArray(tableColumns)) {
                        tableColumns.forEach((col: any) => {
                            const colName = typeof col === 'string' ? col : col.name;
                            const colType = typeof col === 'object' ? col.type : '';
                            suggestions.push({
                                label: colName,
                                kind: monaco.languages.CompletionItemKind.Field,
                                insertText: colName,
                                detail: colType ? `Column (${colType})` : 'Column',
                                documentation: `Column from table ${tableName}`,
                                range
                            });
                        });
                        return { suggestions };
                    }
                }
                
                // Check context for table suggestions (after FROM, JOIN, INTO, UPDATE, DELETE FROM)
                const tableContext = /\b(FROM|JOIN|INTO|UPDATE|DELETE\s+FROM)\s+(\w*)$/i.test(textBeforeCursor);
                
                // Check context for column suggestions (after SELECT, WHERE, SET, ORDER BY, GROUP BY, AND, OR)
                const columnContext = /\b(SELECT|WHERE|SET|ORDER\s+BY|GROUP\s+BY|AND|OR|ON|HAVING)\s+(\w*)$/i.test(textBeforeCursor) ||
                                      /,\s*(\w*)$/i.test(textBeforeOnLine);
                
                // Suggest tables when in table context
                if (tableContext && schemaData.tables?.length > 0) {
                    schemaData.tables.forEach(table => {
                        const translation = schemaTranslations[table];
                        suggestions.push({
                            label: table,
                            kind: monaco.languages.CompletionItemKind.Class,
                            insertText: table,
                            detail: translation?.koreanName || 'Table',
                            documentation: `Table: ${table}${translation?.koreanName ? ` (${translation.koreanName})` : ''}`,
                            range,
                            sortText: '0' + table // Tables first
                        });
                    });
                }
                
                // Suggest columns when in column context
                if (columnContext) {
                    // Add columns from all known tables
                    Object.entries(schemaData.columns).forEach(([tableName, columns]) => {
                        if (Array.isArray(columns)) {
                            columns.forEach((col: any) => {
                                const colName = typeof col === 'string' ? col : col.name;
                                const colType = typeof col === 'object' ? col.type : '';
                                const koreanName = schemaTranslations[tableName]?.columns?.[colName];
                                suggestions.push({
                                    label: `${tableName}.${colName}`,
                                    kind: monaco.languages.CompletionItemKind.Field,
                                    insertText: `${tableName}.${colName}`,
                                    detail: koreanName || colType || 'Column',
                                    documentation: `${colName} from ${tableName}${koreanName ? ` (${koreanName})` : ''}`,
                                    range,
                                    sortText: '1' + colName
                                });
                            });
                        }
                    });
                }
                
                // Always suggest SQL keywords
                SQL_KEYWORDS.forEach(keyword => {
                    if (keyword.toUpperCase().startsWith(word.word.toUpperCase())) {
                        suggestions.push({
                            label: keyword,
                            kind: monaco.languages.CompletionItemKind.Keyword,
                            insertText: keyword + ' ',
                            detail: 'SQL Keyword',
                            range,
                            sortText: '2' + keyword // Keywords after tables/columns
                        });
                    }
                });
                
                return { suggestions };
            }
        });
    };
    
    // Get error suggestion
    const getErrorSuggestion = (errorMessage: string) => {
        for (const [pattern, suggestion] of Object.entries(ERROR_SUGGESTIONS)) {
            if (new RegExp(pattern, 'i').test(errorMessage)) {
                return suggestion;
            }
        }
        return null;
    };
    
    // Page jump handler
    const handlePageJump = () => {
        const page = parseInt(pageJumpValue);
        if (!isNaN(page) && page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            setPageJumpValue('');
        } else {
            showToast(`Enter a page number between 1 and ${totalPages}`, 'error');
        }
    };
    
    // Cancel running query
    const handleCancelQuery = () => {
        if (abortController) {
            abortController.abort();
            setAbortController(null);
            setLoading(false);
            showToast('Query cancelled', 'info');
        }
    };
    
    // Pin current results
    const handlePinResults = () => {
        if (results && results.rows?.length > 0) {
            const pinned = {
                id: String(Date.now()),
                query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
                results: { ...results },
                timestamp: new Date()
            };
            setPinnedResults(prev => [...prev, pinned].slice(-5)); // Keep max 5 pinned
            showToast('Results pinned!', 'success');
        }
    };
    
    // Remove pinned result
    const handleUnpinResult = (id: string) => {
        setPinnedResults(prev => prev.filter(p => p.id !== id));
    };
    
    // Undo query change
    const handleUndo = () => {
        if (queryUndoStack.length > 0) {
            const prev = queryUndoStack[queryUndoStack.length - 1];
            setQueryRedoStack(r => [...r, query]);
            setQueryUndoStack(s => s.slice(0, -1));
            setQuery(prev);
        }
    };
    
    // Redo query change
    const handleRedo = () => {
        if (queryRedoStack.length > 0) {
            const next = queryRedoStack[queryRedoStack.length - 1];
            setQueryUndoStack(s => [...s, query]);
            setQueryRedoStack(r => r.slice(0, -1));
            setQuery(next);
        }
    };
    
    // Toggle auto-refresh
    const toggleAutoRefresh = () => {
        if (autoRefresh) {
            setAutoRefresh(false);
            if (autoRefreshRef.current) {
                clearInterval(autoRefreshRef.current);
                autoRefreshRef.current = null;
            }
            showToast('Auto-refresh disabled', 'info');
        } else {
            setAutoRefresh(true);
            showToast(`Auto-refresh enabled: every ${autoRefreshInterval}s`, 'success');
        }
    };
    
    // Auto-refresh effect
    useEffect(() => {
        if (autoRefresh && selectedConnection) {
            autoRefreshRef.current = setInterval(() => {
                handleExecute();
            }, autoRefreshInterval * 1000);
            return () => {
                if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
            };
        }
    }, [autoRefresh, autoRefreshInterval, selectedConnection]);
    
    // Show column stats popup
    const handleShowColumnStats = (field: string, event: React.MouseEvent) => {
        event.stopPropagation();
        if (statsPopupColumn === field) {
            setStatsPopupColumn(null);
            setStatsPopupPosition(null);
        } else {
            setStatsPopupColumn(field);
            setStatsPopupPosition({ x: event.clientX, y: event.clientY });
        }
    };
    
    // Get chart data for visualization
    const getChartData = () => {
        if (!results?.rows || !chartField) return [];
        const counts: Record<string, number> = {};
        results.rows.forEach((row: any) => {
            const key = String(row[chartField] ?? 'NULL');
            counts[key] = (counts[key] || 0) + 1;
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([label, value]) => ({ label, value }));
    };
    
    // Get numeric fields for chart
    const getNumericFields = () => {
        if (!results?.rows?.[0]) return [];
        return results.fields?.filter((f: string) => {
            const val = results.rows[0][f];
            return typeof val === 'number' || !isNaN(parseFloat(val));
        }) || [];
    };
    
    // Execute multiple queries (split by semicolon)
    const handleExecuteAll = async () => {
        const queries = query.split(';').map(q => q.trim()).filter(q => q.length > 0);
        if (queries.length <= 1) {
            handleExecute();
            return;
        }
        setLoading(true);
        setSplitQueryResults([]);
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const allResults: Array<{ query: string; results: any; error?: string }> = [];
        for (const q of queries) {
            try {
                const res = await fetch('/api/query/execute', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ connectionId: selectedConnection, query: q }),
                });
                if (res.ok) {
                    const data = await res.json();
                    allResults.push({ query: q, results: data });
                } else {
                    const errorData = await res.json().catch(() => ({}));
                    allResults.push({ query: q, results: null, error: errorData.message || 'Query failed' });
                }
            } catch (e: any) {
                allResults.push({ query: q, results: null, error: e.message });
            }
        }
        setSplitQueryResults(allResults);
        setLoading(false);
        showToast(`Executed ${queries.length} queries`, 'success');
    };
    
    // Auto-save draft to localStorage
    const saveDraft = useCallback(() => {
        localStorage.setItem('editorQueryTabs', JSON.stringify(queryTabs));
        localStorage.setItem('editorActiveTabId', activeTabId);
        setLastAutoSave(new Date());
    }, [queryTabs, activeTabId]);
    
    // Save selected connection when it changes
    useEffect(() => {
        if (selectedConnection) {
            localStorage.setItem('editorSelectedConnection', selectedConnection);
            // Track recent connections
            const updated = [selectedConnection, ...recentConnections.filter(id => id !== selectedConnection)].slice(0, 5);
            setRecentConnections(updated);
            localStorage.setItem('editorRecentConnections', JSON.stringify(updated));
            
            // Auto-test connection status
            const autoTestConnection = async () => {
                setConnectionStatus('testing');
                const token = localStorage.getItem('token');
                if (!token) return;
                
                try {
                    const res = await fetch('/api/query/execute', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ connectionId: selectedConnection, query: 'SELECT 1' }),
                    });
                    if (res.ok) {
                        setConnectionStatus('connected');
                    } else {
                        setConnectionStatus('disconnected');
                    }
                } catch (e) {
                    setConnectionStatus('disconnected');
                }
            };
            autoTestConnection();
            
            // Auto-fetch schema for autocomplete
            const fetchSchemaForAutocomplete = async () => {
                const token = localStorage.getItem('token');
                if (!token) return;
                try {
                    const res = await fetch('/api/query/execute', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ 
                            connectionId: selectedConnection, 
                            query: `SELECT table_name, column_name, data_type, is_nullable
                                    FROM information_schema.columns 
                                    WHERE table_schema = 'public' 
                                    ORDER BY table_name, ordinal_position` 
                        }),
                    });
                    if (res.ok) {
                        const data = await res.json();
                        const tables: string[] = [];
                        const columns: Record<string, Array<{ name: string; type: string; nullable: string }>> = {};
                        data.rows?.forEach((row: any) => {
                            if (!tables.includes(row.table_name)) {
                                tables.push(row.table_name);
                                columns[row.table_name] = [];
                            }
                            columns[row.table_name].push({
                                name: row.column_name,
                                type: row.data_type,
                                nullable: row.is_nullable
                            });
                        });
                        setSchemaData({ tables, columns: columns as any });
                    }
                } catch (e) {
                    // Silent fail - autocomplete will just not have suggestions
                    console.log('Failed to fetch schema for autocomplete:', e);
                }
            };
            fetchSchemaForAutocomplete();
        }
    }, [selectedConnection]);

    
    // Fetch AI suggested questions when modal opens (새로 열릴 때마다 재생성)
    useEffect(() => {
        if (showAiModal && selectedConnection) {
            fetchSuggestedQuestions();
        }
    }, [showAiModal, selectedConnection]);
    
    // Toggle connection favorite
    const toggleConnectionFavorite = (connectionId: string) => {
        const newFavorites = favoriteConnections.includes(connectionId)
            ? favoriteConnections.filter(id => id !== connectionId)
            : [...favoriteConnections, connectionId].slice(0, 10);
        setFavoriteConnections(newFavorites);
        localStorage.setItem('editorFavoriteConnections', JSON.stringify(newFavorites));
        showToast(favoriteConnections.includes(connectionId) ? 'Removed from favorites' : 'Added to favorites', 'success');
    };
    
    // Fetch schema translations when schema browser opens
    useEffect(() => {
        if (showSchemaBrowser && selectedConnection) {
            fetchSchemaTranslations(selectedConnection);
        }
    }, [showSchemaBrowser, selectedConnection]);
    
    // Log execution stats
    const logExecutionStat = (queryText: string, duration: number) => {
        const stat = { query: queryText.substring(0, 100), duration, timestamp: new Date() };
        const updated = [...executionStats, stat].slice(-20);
        setExecutionStats(updated);
        localStorage.setItem('editorExecutionStats', JSON.stringify(updated));
    };
    
    // Get average execution time
    const getAverageExecutionTime = () => {
        if (executionStats.length === 0) return 0;
        return executionStats.reduce((sum, s) => sum + s.duration, 0) / executionStats.length;
    };
    
    
    // Note: Tabs are already loaded from 'editorQueryTabs' in useState initialization
    // No need for separate editorDraft loading
    
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

    // Analyze query complexity
    useEffect(() => {
        const upperQuery = query.toUpperCase();
        const hasJoin = /\bJOIN\b/.test(upperQuery);
        const hasSubquery = /\(\s*SELECT\b/.test(upperQuery);
        const hasMultipleJoins = (upperQuery.match(/\bJOIN\b/g) || []).length > 2;
        const hasNoLimit = !/\bLIMIT\b/.test(upperQuery) && /\bSELECT\b/.test(upperQuery);
        const hasGroupBy = /\bGROUP BY\b/.test(upperQuery);
        const hasWindow = /\bOVER\s*\(/.test(upperQuery);
        
        if (hasMultipleJoins || (hasSubquery && hasJoin) || (hasWindow && hasGroupBy)) {
            setQueryComplexity('high');
        } else if (hasJoin || hasSubquery || hasGroupBy || hasWindow || hasNoLimit) {
            setQueryComplexity('medium');
        } else {
            setQueryComplexity('low');
        }
    }, [query]);

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
            // F5 or Ctrl+Enter - Execute query by clicking the execute button
            if (e.key === 'F5' || (e.ctrlKey && e.key === 'Enter')) {
                e.preventDefault();
                // Trigger click on execute button instead of calling handleExecute directly
                const executeBtn = document.querySelector('[data-execute-btn]') as HTMLButtonElement;
                if (executeBtn && !executeBtn.disabled) {
                    executeBtn.click();
                }
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
                // Trigger format button
                const formatBtn = document.querySelector('[data-format-btn]') as HTMLButtonElement;
                if (formatBtn) formatBtn.click();
            }
            if (e.ctrlKey && e.key === 't') {
                e.preventDefault();
                // Trigger add tab button
                const addTabBtn = document.querySelector('[data-add-tab-btn]') as HTMLButtonElement;
                if (addTabBtn) addTabBtn.click();
            }
            if (e.key === 'F1') {
                e.preventDefault();
                setShowShortcuts(s => !s);
            }
            // Ctrl+1-9 to switch tabs - use data attributes to find tabs
            if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
                e.preventDefault();
                const tabIndex = parseInt(e.key) - 1;
                const tabBtn = document.querySelector(`[data-tab-index="${tabIndex}"]`) as HTMLButtonElement;
                if (tabBtn) tabBtn.click();
            }
            // Ctrl+W to close current tab
            if (e.ctrlKey && e.key === 'w') {
                e.preventDefault();
                const closeBtn = document.querySelector('[data-close-active-tab]') as HTMLButtonElement;
                if (closeBtn) closeBtn.click();
            }
            if (e.key === 'Escape') {
                setShowSaveModal(false);
                setShowAiModal(false);
                setShowHistory(false);
                setShowTemplates(false);
                setShowShortcuts(false);
                setShowConnectionDropdown(false);
                setShowExportMenu(false);
                setShowSnippets(false);
                setShowColumnSelector(false);
                setShowSchemaBrowser(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

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
    
    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // Don't close if clicking inside a dropdown or on a dropdown trigger button
            if (target.closest('[data-dropdown]') || target.closest('[data-dropdown-trigger]')) return;
            
            // Use setTimeout to let the click event propagate first
            setTimeout(() => {
                setShowExportMenu(false);
                setShowColumnSelector(false);
            }, 10);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ========================================================================
    // API FUNCTIONS
    // ========================================================================

    const fetchConnections = async (token: string) => {
        try {
            const res = await fetch('/api/connections', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401) { router.push('/login'); return; }
            const data = await res.json();
            setConnections(data);
            
            // Restore saved connection from localStorage, or use first if not found
            const savedConnectionId = localStorage.getItem('editorSelectedConnection');
            if (savedConnectionId && data.some((c: Connection) => c.id === savedConnectionId)) {
                setSelectedConnection(savedConnectionId);
                setConnectionStatus('connected');
            } else if (data.length > 0) {
                setSelectedConnection(data[0].id);
            }
        } catch (e) {
            console.error('Failed to fetch connections', e);
        }
    };

    const fetchSavedQueries = async (token: string) => {
        try {
            const res = await fetch('/api/queries', {
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

    // 스키마 번역 불러오기
    const fetchSchemaTranslations = async (connectionId: string) => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch(`/api/schema/${connectionId}/translations`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // 번역 맵 생성
                const translationMap: Record<string, { koreanName: string; columns: Record<string, string> }> = {};
                for (const t of data) {
                    translationMap[t.tableName] = {
                        koreanName: t.koreanName || t.tableName,
                        columns: t.columnTranslations || {}
                    };
                }
                setSchemaTranslations(translationMap);
            }
        } catch (e) {
            console.error('Failed to fetch schema translations', e);
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
            const res = await fetch('/api/query/execute', {
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
            setErrorAnalysis(null);
            showToast(`Query failed: ${e.message}`, 'error');
            const endTime = performance.now();
            setExecutionTime(endTime - startTime);
            const historyItem: QueryHistoryItem = { query: query.trim(), timestamp: new Date(), duration: endTime - startTime, success: false };
            const newHistory = [historyItem, ...queryHistory.slice(0, 49)];
            setQueryHistory(newHistory);
            localStorage.setItem('queryHistory', JSON.stringify(newHistory));
            
            // AI 에러 분석 호출
            if (selectedConnection) {
                setAnalyzingError(true);
                try {
                    const analysisRes = await fetch('/api/ai/analyze-error', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ connectionId: selectedConnection, query, errorMessage: e.message }),
                    });
                    if (analysisRes.ok) {
                        const analysis = await analysisRes.json();
                        setErrorAnalysis(analysis);
                    }
                } catch (aiErr) {
                    console.error('Failed to get AI error analysis', aiErr);
                } finally {
                    setAnalyzingError(false);
                }
            }
        } finally {
            setLoading(false);
            setQueryStartTime(null);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    }, [selectedConnection, query, queryHistory, showToast]);

    // Execute selected query (from Monaco editor selection)
    const handleExecuteSelectedQuery = useCallback(async (selectedQuery: string) => {
        if (!selectedConnection) {
            showToast('Please select a connection first', 'error');
            return;
        }
        if (!selectedQuery.trim()) return;
        
        setLoading(true);
        setError('');
        setResults(null);
        setCurrentPage(1);
        
        const startTime = performance.now();
        setQueryStartTime(startTime);
        setLiveTimer(0);
        timerRef.current = setInterval(() => {
            setLiveTimer(performance.now() - startTime);
        }, 100);

        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch('/api/query/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ connectionId: selectedConnection, query: selectedQuery }),
            });
            const endTime = performance.now();
            setExecutionTime(endTime - startTime);

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Query execution failed');
            }
            const data = await res.json();
            setResults(data);
            showToast(`Selected query: ${data.rowCount} rows in ${formatDuration(endTime - startTime)}`, 'success');
        } catch (e: any) {
            setError(e.message);
            showToast(`Query failed: ${e.message}`, 'error');
        } finally {
            setLoading(false);
            setQueryStartTime(null);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    }, [selectedConnection, showToast]);

    // Listen for executeSelectedQuery custom event
    useEffect(() => {
        const handleSelectedQueryEvent = (e: CustomEvent) => {
            handleExecuteSelectedQuery(e.detail);
        };
        window.addEventListener('executeSelectedQuery', handleSelectedQueryEvent as EventListener);
        return () => window.removeEventListener('executeSelectedQuery', handleSelectedQueryEvent as EventListener);
    }, [handleExecuteSelectedQuery]);

    const handleSaveQuery = async () => {
        if (!saveName) return;
        
        // 중복 이름 확인
        const isDuplicate = savedQueries.some(q => q.name.toLowerCase() === saveName.trim().toLowerCase());
        if (isDuplicate) {
            showToast('이미 같은 이름의 쿼리가 존재합니다. 다른 이름을 사용해주세요.', 'error');
            return;
        }
        
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch('/api/queries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name: saveName.trim(), description: saveDescription, isPublic, query }),
            });
            if (res.ok) {
                setShowSaveModal(false);
                setSaveName('');
                setSaveDescription('');
                setIsPublic(false);
                fetchSavedQueries(token);
                showToast('쿼리가 저장되었습니다', 'success');
            } else {
                const errorData = await res.json().catch(() => ({}));
                if (errorData.message?.includes('duplicate') || errorData.message?.includes('exists')) {
                    showToast('이미 같은 이름의 쿼리가 존재합니다.', 'error');
                } else {
                    showToast(errorData.message || '저장 실패', 'error');
                }
            }
        } catch (e) {
            console.error('Failed to save query', e);
            showToast('저장 실패', 'error');
        }
    };

    // AI로 쿼리명과 설명 자동 생성
    const generateQueryNameAndDescription = useCallback(async (queryText: string) => {
        if (!queryText.trim() || !selectedConnection) return;
        
        setSaveNameGenerating(true);
        const token = localStorage.getItem('token');
        if (!token) {
            setSaveNameGenerating(false);
            return;
        }

        try {
            const res = await fetch('/api/ai/generate-query-name', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ connectionId: selectedConnection, query: queryText }),
            });
            
            if (res.ok) {
                const data = await res.json();
                if (data.name) setSaveName(data.name);
                if (data.description) setSaveDescription(data.description);
            } else {
                // AI 실패 시 쿼리에서 간단히 추출
                const firstLine = queryText.trim().split('\n')[0].replace(/^--\s*/, '').trim();
                const keywords = queryText.match(/\b(SELECT|FROM|WHERE|JOIN|INSERT|UPDATE|DELETE)\s+(\w+)/gi);
                if (keywords && keywords.length > 0) {
                    const tables = queryText.match(/FROM\s+(\w+)/gi);
                    const tableName = tables ? tables[0].replace(/FROM\s+/i, '') : '';
                    setSaveName(tableName ? `${tableName} 조회` : '새 쿼리');
                } else {
                    setSaveName(firstLine.substring(0, 50) || '새 쿼리');
                }
            }
        } catch (e) {
            // 실패 시 기본값
            const timestamp = new Date().toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            setSaveName(`쿼리 ${timestamp}`);
        } finally {
            setSaveNameGenerating(false);
        }
    }, [selectedConnection]);

    // 저장 모달이 열릴 때 AI로 이름 생성
    useEffect(() => {
        if (showSaveModal && query.trim() && !saveName) {
            generateQueryNameAndDescription(query);
        }
    }, [showSaveModal, query, generateQueryNameAndDescription]);

    const handleDeleteQuery = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this query?')) return;
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            await fetch(`/api/queries/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            fetchSavedQueries(token);
        } catch (e) {
            console.error('Failed to delete query', e);
        }
    };

    // AI 추천 질문 불러오기
    const fetchSuggestedQuestions = async () => {
        if (!selectedConnection) return;
        setSuggestionsLoading(true);
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch(`/api/ai/suggest-questions/${selectedConnection}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                if (data.questions && Array.isArray(data.questions)) {
                    setSuggestedQuestions(data.questions);
                }
            }
        } catch (e) {
            console.error('Failed to fetch suggested questions', e);
            // 실패 시 기본 질문 유지
        } finally {
            setSuggestionsLoading(false);
        }
    };

    const handleAiGenerate = async () => {
        if (!selectedConnection || !aiPrompt.trim()) return;
        setAiLoading(true);
        setAiError('');
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch('/api/ai/generate-sql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ connectionId: selectedConnection, userQuery: aiPrompt }),
            });
            if (!res.ok) throw new Error('Failed to generate SQL');
            const data = await res.json();
            if (data.success && data.sql) {
                // 새 탭 생성 (AI 프롬프트 기반 자동 이름)
                const tabName = generateTabNameFromPrompt(aiPrompt);
                const newTabId = `tab-${Date.now()}`;
                const newTab: QueryTab = {
                    id: newTabId,
                    name: tabName,
                    query: data.sql,
                    unsaved: true,
                };
                setQueryTabs(prev => [...prev, newTab]);
                setActiveTabId(newTabId);
                
                setShowAiModal(false);
                setAiPrompt('');
                showToast(`AI 쿼리가 새 탭 "${tabName}"에 생성되었습니다`, 'success');
            } else {
                throw new Error(data.error || 'SQL 생성 실패');
            }
        } catch (e: any) {
            setAiError(e.message);
        } finally {
            setAiLoading(false);
        }
    };

    // AI 프롬프트에서 탭 이름 자동 생성
    const generateTabNameFromPrompt = (prompt: string): string => {
        const trimmed = prompt.trim();
        // 너무 긴 경우 축약
        if (trimmed.length <= 20) return trimmed;
        // 첫 20자 + ...
        return trimmed.substring(0, 18) + '..';
    };

    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================

    const addNewTab = () => {
        const newId = String(Date.now());
        const newTabs = [...queryTabs, { id: newId, name: `Query ${queryTabs.length + 1}`, query: '-- New query\n', unsaved: false }];
        setQueryTabs(newTabs);
        setActiveTabId(newId);
        // Save to localStorage
        localStorage.setItem('editorQueryTabs', JSON.stringify(newTabs));
        localStorage.setItem('editorActiveTabId', newId);
    };

    const closeTab = (tabId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (queryTabs.length === 1) return;
        
        // Check for unsaved changes
        const tabToClose = queryTabs.find(t => t.id === tabId);
        if (tabToClose?.unsaved) {
            if (!confirm(`"${tabToClose.name}"에 저장되지 않은 변경사항이 있습니다. 닫으시겠습니까?`)) {
                return;
            }
        }
        
        const newTabs = queryTabs.filter(t => t.id !== tabId);
        setQueryTabs(newTabs);
        const newActiveId = activeTabId === tabId ? newTabs[newTabs.length - 1].id : activeTabId;
        if (activeTabId === tabId) setActiveTabId(newActiveId);
        // Save to localStorage
        localStorage.setItem('editorQueryTabs', JSON.stringify(newTabs));
        localStorage.setItem('editorActiveTabId', newActiveId);
        showToast('탭이 닫혔습니다', 'info');
    };

    // 탭 복제
    const duplicateTab = (tabId: string) => {
        const tabToDuplicate = queryTabs.find(t => t.id === tabId);
        if (!tabToDuplicate) return;
        
        const newId = String(Date.now());
        const newTab = {
            id: newId,
            name: `${tabToDuplicate.name} (복사)`,
            query: tabToDuplicate.query,
            unsaved: false
        };
        const newTabs = [...queryTabs, newTab];
        setQueryTabs(newTabs);
        setActiveTabId(newId);
        localStorage.setItem('editorQueryTabs', JSON.stringify(newTabs));
        localStorage.setItem('editorActiveTabId', newId);
        showToast('탭이 복제되었습니다', 'success');
    };

    // 다른 탭 모두 닫기
    const closeOtherTabs = (tabId: string) => {
        const unsavedTabs = queryTabs.filter(t => t.id !== tabId && t.unsaved);
        if (unsavedTabs.length > 0) {
            if (!confirm(`${unsavedTabs.length}개의 저장되지 않은 탭이 있습니다. 닫으시겠습니까?`)) {
                return;
            }
        }
        
        const newTabs = queryTabs.filter(t => t.id === tabId);
        setQueryTabs(newTabs);
        setActiveTabId(tabId);
        localStorage.setItem('editorQueryTabs', JSON.stringify(newTabs));
        localStorage.setItem('editorActiveTabId', tabId);
        showToast('다른 탭이 모두 닫혔습니다', 'info');
    };

    // 오른쪽 탭 모두 닫기
    const closeTabsToRight = (tabId: string) => {
        const tabIndex = queryTabs.findIndex(t => t.id === tabId);
        if (tabIndex === -1) return;
        
        const tabsToClose = queryTabs.slice(tabIndex + 1);
        const unsavedTabs = tabsToClose.filter(t => t.unsaved);
        if (unsavedTabs.length > 0) {
            if (!confirm(`${unsavedTabs.length}개의 저장되지 않은 탭이 있습니다. 닫으시겠습니까?`)) {
                return;
            }
        }
        
        const newTabs = queryTabs.slice(0, tabIndex + 1);
        setQueryTabs(newTabs);
        if (!newTabs.find(t => t.id === activeTabId)) {
            setActiveTabId(tabId);
        }
        localStorage.setItem('editorQueryTabs', JSON.stringify(newTabs));
        localStorage.setItem('editorActiveTabId', activeTabId);
        showToast(`${tabsToClose.length}개 탭이 닫혔습니다`, 'info');
    };

    // 탭 우클릭 메뉴 상태
    const [tabContextMenu, setTabContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);

    const handleFormatQuery = () => {
        setQuery(formatSQL(query));
        showToast('Query formatted', 'success');
    };
    
    const handleCopyQuery = () => {
        navigator.clipboard.writeText(query);
        showToast('Query copied to clipboard', 'success');
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
        statusBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', fontSize: 11, color: theme.textMuted, backgroundColor: theme.bgHover, borderTop: `1px solid ${theme.border}`, minHeight: 28 },
    };

    // ========================================================================
    // RENDER
    // ========================================================================

    return (
        <div style={styles.container}>
            {/* Sidebar */}
            <div style={styles.sidebar}>
                <div style={{ padding: 12, borderBottom: `1px solid ${theme.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>📁 Query Library</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 11, color: theme.textMuted }}>{savedQueries.length}</span>
                            <button onClick={() => setShowSidebar(false)} style={{ ...styles.btnIcon, fontSize: 16, padding: 4 }}>×</button>
                        </div>
                    </div>
                    {/* Search Input */}
                    <input 
                        type="text" 
                        placeholder="🔍 Search queries..." 
                        value={librarySearch}
                        onChange={(e) => setLibrarySearch(e.target.value)}
                        style={{ ...styles.input, width: '100%', marginBottom: 8 }}
                    />
                    {/* Sort Options */}
                    <div style={{ display: 'flex', gap: 4, fontSize: 11 }}>
                        <button 
                            onClick={() => setLibrarySortBy('recent')} 
                            style={{ 
                                flex: 1, padding: '4px 8px', border: 'none', borderRadius: 4, cursor: 'pointer',
                                backgroundColor: librarySortBy === 'recent' ? theme.primary : theme.bgHover,
                                color: librarySortBy === 'recent' ? '#fff' : theme.textSecondary
                            }}
                        >
                            🕐 Recent
                        </button>
                        <button 
                            onClick={() => setLibrarySortBy('name')} 
                            style={{ 
                                flex: 1, padding: '4px 8px', border: 'none', borderRadius: 4, cursor: 'pointer',
                                backgroundColor: librarySortBy === 'name' ? theme.primary : theme.bgHover,
                                color: librarySortBy === 'name' ? '#fff' : theme.textSecondary
                            }}
                        >
                            🔤 Name
                        </button>
                    </div>
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
                    {/* Favorites Section */}
                    {savedQueries.filter(sq => favorites.includes(sq.id)).length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: theme.warning, marginBottom: 8, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                                ⭐ Favorites
                            </div>
                            {savedQueries.filter(sq => favorites.includes(sq.id)).map(sq => (
                                <div key={sq.id} onClick={() => openSavedQueryInNewTab(sq)} style={{ padding: 10, borderRadius: 6, marginBottom: 6, cursor: 'pointer', backgroundColor: theme.bgHover, border: `1px solid ${theme.warning}40` }}>
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
                        <div style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, marginBottom: 8, textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                            <span>My Queries</span>
                            <span style={{ color: theme.primary }}>{savedQueries.filter(sq => sq.userId === currentUser?.id && sq.name.toLowerCase().includes(librarySearch.toLowerCase())).length}</span>
                        </div>
                        {savedQueries
                            .filter(sq => sq.userId === currentUser?.id && sq.name.toLowerCase().includes(librarySearch.toLowerCase()))
                            .sort((a, b) => librarySortBy === 'name' ? a.name.localeCompare(b.name) : 0)
                            .slice(0, libraryShowLimit)
                            .map(sq => (
                            <div key={sq.id} onClick={() => openSavedQueryInNewTab(sq)} style={{ padding: 10, borderRadius: 6, marginBottom: 6, cursor: 'pointer', backgroundColor: theme.bgHover, border: `1px solid ${theme.border}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 500, fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sq.name}</span>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        <button onClick={(e) => { e.stopPropagation(); toggleFavorite(sq.id); }} style={{ ...styles.btnIcon, fontSize: 12, color: favorites.includes(sq.id) ? theme.warning : theme.textMuted }}>
                                            {favorites.includes(sq.id) ? '⭐' : '☆'}
                                        </button>
                                        <button onClick={(e) => handleDeleteQuery(sq.id, e)} style={{ ...styles.btnIcon, fontSize: 12, color: theme.error }}>🗑</button>
                                    </div>
                                </div>
                                {sq.description && <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sq.description}</div>}
                            </div>
                        ))}
                        {savedQueries.filter(sq => sq.userId === currentUser?.id && sq.name.toLowerCase().includes(librarySearch.toLowerCase())).length > libraryShowLimit && (
                            <button 
                                onClick={() => setLibraryShowLimit(prev => prev + 20)} 
                                style={{ width: '100%', padding: 8, border: `1px dashed ${theme.border}`, borderRadius: 6, backgroundColor: 'transparent', color: theme.textMuted, cursor: 'pointer', fontSize: 11 }}
                            >
                                📥 Load More ({savedQueries.filter(sq => sq.userId === currentUser?.id && sq.name.toLowerCase().includes(librarySearch.toLowerCase())).length - libraryShowLimit} more)
                            </button>
                        )}
                        {savedQueries.filter(sq => sq.userId === currentUser?.id && sq.name.toLowerCase().includes(librarySearch.toLowerCase())).length === 0 && (
                            <div style={{ fontSize: 12, color: theme.textMuted, padding: 8, textAlign: 'center' }}>
                                {librarySearch ? 'No matching queries' : 'No saved queries yet'}
                            </div>
                        )}
                    </div>
                    
                    {/* Team Queries */}
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, marginBottom: 8, textTransform: 'uppercase' }}>Team Queries</div>
                        {savedQueries.filter(sq => sq.userId !== currentUser?.id).map(sq => (
                            <div key={sq.id} onClick={() => openSavedQueryInNewTab(sq)} style={{ padding: 10, borderRadius: 6, marginBottom: 6, cursor: 'pointer', backgroundColor: theme.bgHover, border: `1px solid ${theme.border}` }}>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {/* Searchable Connection Dropdown */}
                            <div style={{ position: 'relative' }}>
                                <button 
                                    onClick={() => setShowConnectionDropdown(!showConnectionDropdown)}
                                    style={{ 
                                        ...styles.btn, 
                                        ...styles.btnSecondary, 
                                        minWidth: 200, 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center',
                                        gap: 8
                                    }}
                                >
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {selectedConnection 
                                            ? connections.find(c => c.id === selectedConnection)?.name || 'Unknown' 
                                            : `Select Connection (${connections.length})`}
                                    </span>
                                    <span style={{ fontSize: 10 }}>▼</span>
                                </button>
                                {showConnectionDropdown && (
                                    <div style={{ 
                                        position: 'absolute', top: '100%', left: 0, marginTop: 4, width: 320, 
                                        backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, 
                                        borderRadius: 8, boxShadow: '0 12px 40px rgba(0,0,0,0.4)', zIndex: 100, 
                                        maxHeight: 400, display: 'flex', flexDirection: 'column'
                                    }}>
                                        {/* Search Input */}
                                        <div style={{ padding: 8, borderBottom: `1px solid ${theme.border}` }}>
                                            <input 
                                                type="text"
                                                placeholder="🔍 Search connections..."
                                                value={connectionSearch}
                                                onChange={(e) => setConnectionSearch(e.target.value)}
                                                autoFocus
                                                style={{ ...styles.input, width: '100%' }}
                                            />
                                        </div>
                                        {/* Connection List */}
                                        <div style={{ flex: 1, overflowY: 'auto', maxHeight: 300 }}>
                                            {/* Favorites Section */}
                                            {!connectionSearch && favoriteConnections.length > 0 && (
                                                <>
                                                    <div style={{ padding: '6px 12px', fontSize: 10, fontWeight: 600, color: theme.textMuted, backgroundColor: theme.bgHover, textTransform: 'uppercase' }}>
                                                        ⭐ Favorites
                                                    </div>
                                                    {connections.filter(c => favoriteConnections.includes(c.id)).map(c => (
                                                        <button 
                                                            key={`fav-${c.id}`}
                                                            onClick={() => {
                                                                setSelectedConnection(c.id);
                                                                setShowConnectionDropdown(false);
                                                                setConnectionStatus('connected');
                                                            }}
                                                            style={{ 
                                                                display: 'flex', alignItems: 'center', gap: 8,
                                                                width: '100%', padding: '8px 12px', textAlign: 'left', 
                                                                border: 'none', cursor: 'pointer', 
                                                                backgroundColor: c.id === selectedConnection ? `${theme.primary}20` : 'transparent',
                                                                color: theme.text
                                                            }}
                                                        >
                                                            <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600, backgroundColor: c.type === 'postgresql' ? '#336791' : c.type === 'mysql' ? '#4479A1' : theme.accent, color: '#fff' }}>
                                                                {c.type.substring(0, 4).toUpperCase()}
                                                            </span>
                                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>{c.name}</span>
                                                            <span style={{ color: theme.warning }}>⭐</span>
                                                        </button>
                                                    ))}
                                                </>
                                            )}
                                            {/* Recent Section */}
                                            {!connectionSearch && recentConnections.length > 0 && (
                                                <>
                                                    <div style={{ padding: '6px 12px', fontSize: 10, fontWeight: 600, color: theme.textMuted, backgroundColor: theme.bgHover, textTransform: 'uppercase' }}>
                                                        🕐 Recent
                                                    </div>
                                                    {connections.filter(c => recentConnections.includes(c.id) && !favoriteConnections.includes(c.id)).slice(0, 3).map(c => (
                                                        <button 
                                                            key={`recent-${c.id}`}
                                                            onClick={() => {
                                                                setSelectedConnection(c.id);
                                                                setShowConnectionDropdown(false);
                                                                setConnectionStatus('connected');
                                                            }}
                                                            style={{ 
                                                                display: 'flex', alignItems: 'center', gap: 8,
                                                                width: '100%', padding: '8px 12px', textAlign: 'left', 
                                                                border: 'none', cursor: 'pointer', 
                                                                backgroundColor: c.id === selectedConnection ? `${theme.primary}20` : 'transparent',
                                                                color: theme.text, fontSize: 13
                                                            }}
                                                        >
                                                            <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600, backgroundColor: c.type === 'postgresql' ? '#336791' : c.type === 'mysql' ? '#4479A1' : theme.accent, color: '#fff' }}>
                                                                {c.type.substring(0, 4).toUpperCase()}
                                                            </span>
                                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                                                        </button>
                                                    ))}
                                                </>
                                            )}
                                            {/* All Connections Header */}
                                            {!connectionSearch && (favoriteConnections.length > 0 || recentConnections.length > 0) && (
                                                <div style={{ padding: '6px 12px', fontSize: 10, fontWeight: 600, color: theme.textMuted, backgroundColor: theme.bgHover, textTransform: 'uppercase' }}>
                                                    📁 All Connections
                                                </div>
                                            )}
                                            {connections
                                                .filter(c => 
                                                    c.name.toLowerCase().includes(connectionSearch.toLowerCase()) ||
                                                    c.type.toLowerCase().includes(connectionSearch.toLowerCase()) ||
                                                    (c.host || '').toLowerCase().includes(connectionSearch.toLowerCase())
                                                )
                                                .slice(0, 50)
                                                .map(c => (
                                                    <div 
                                                        key={c.id}
                                                        style={{ 
                                                            display: 'flex', alignItems: 'center',
                                                            backgroundColor: c.id === selectedConnection ? `${theme.primary}20` : 'transparent',
                                                            borderLeft: c.id === selectedConnection ? `3px solid ${theme.primary}` : '3px solid transparent'
                                                        }}
                                                    >
                                                        <button 
                                                            onClick={() => {
                                                                setSelectedConnection(c.id);
                                                                setShowConnectionDropdown(false);
                                                                setConnectionStatus('connected');
                                                                setConnectionSearch('');
                                                                showToast(`Connected to ${c.name}`, 'success');
                                                            }}
                                                            style={{ 
                                                                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                                                                flex: 1, padding: '10px 8px 10px 12px', textAlign: 'left', 
                                                                border: 'none', cursor: 'pointer', backgroundColor: 'transparent',
                                                                color: theme.text
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                                                                <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, backgroundColor: c.type === 'postgresql' ? '#336791' : c.type === 'mysql' ? '#4479A1' : theme.accent, color: '#fff' }}>
                                                                    {c.type.toUpperCase()}
                                                                </span>
                                                                <span style={{ fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                                                                {c.id === selectedConnection && <span style={{ color: theme.success }}>✓</span>}
                                                            </div>
                                                            <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                                                                {c.host || 'localhost'}:{c.port || 5432} / {c.database || 'default'}
                                                            </div>
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); toggleConnectionFavorite(c.id); }}
                                                            style={{ padding: 8, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: 14 }}
                                                            title={favoriteConnections.includes(c.id) ? 'Remove from favorites' : 'Add to favorites'}
                                                        >
                                                            {favoriteConnections.includes(c.id) ? '⭐' : '☆'}
                                                        </button>
                                                    </div>
                                                ))
                                            }
                                            {connections.filter(c => 
                                                c.name.toLowerCase().includes(connectionSearch.toLowerCase()) ||
                                                c.type.toLowerCase().includes(connectionSearch.toLowerCase())
                                            ).length === 0 && (
                                                <div style={{ padding: 16, textAlign: 'center', color: theme.textMuted, fontSize: 13 }}>
                                                    No connections found
                                                </div>
                                            )}
                                            {connections.filter(c => 
                                                c.name.toLowerCase().includes(connectionSearch.toLowerCase()) ||
                                                c.type.toLowerCase().includes(connectionSearch.toLowerCase())
                                            ).length > 50 && (
                                                <div style={{ padding: 8, textAlign: 'center', color: theme.textMuted, fontSize: 11, borderTop: `1px solid ${theme.border}` }}>
                                                    Showing 50 of {connections.filter(c => 
                                                        c.name.toLowerCase().includes(connectionSearch.toLowerCase()) ||
                                                        c.type.toLowerCase().includes(connectionSearch.toLowerCase())
                                                    ).length} results. Refine your search.
                                                </div>
                                            )}
                                        </div>
                                        {/* Footer */}
                                        <div style={{ padding: 8, borderTop: `1px solid ${theme.border}`, fontSize: 11, color: theme.textMuted, textAlign: 'center' }}>
                                            {connections.length} total connections
                                        </div>
                                    </div>
                                )}
                            </div>
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
                        {/* Snippets Dropdown */}
                        <div style={{ position: 'relative' }}>
                            <button onClick={() => setShowSnippets(!showSnippets)} style={{ ...styles.btn, ...styles.btnSecondary }}>
                                ⚡ Snippets
                            </button>
                            {showSnippets && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, width: 300, backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', zIndex: 50, overflow: 'hidden', maxHeight: 400, overflowY: 'auto' }}>
                                    <div style={{ padding: '8px 12px', borderBottom: `1px solid ${theme.border}`, fontSize: 12, fontWeight: 600, color: theme.textMuted, textTransform: 'uppercase' }}>SQL Snippets</div>
                                    {SQL_SNIPPETS.map((s, i) => (
                                        <button key={i} onClick={() => insertSnippet(s.snippet)} 
                                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', padding: '10px 12px', textAlign: 'left', border: 'none', backgroundColor: 'transparent', color: theme.text, cursor: 'pointer', borderBottom: `1px solid ${theme.border}20` }}>
                                            <span style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</span>
                                            <span style={{ fontSize: 11, color: theme.textMuted }}>{s.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button onClick={() => setShowHistory(!showHistory)} style={styles.btnIcon} title="History">🕒</button>
                        <button onClick={fetchSchemaData} disabled={schemaLoading} style={{ ...styles.btnIcon, opacity: schemaLoading ? 0.5 : 1 }} title="Schema Browser">
                            {schemaLoading ? '⏳' : '🗄️'}
                        </button>
                        <button data-format-btn onClick={handleFormatQuery} style={styles.btnIcon} title="Format SQL">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 10h16M4 14h10M4 18h6"/></svg>
                        </button>
                        <button onClick={handleCopyQuery} style={styles.btnIcon} title="Copy Query">📋</button>
                        <button onClick={handleShareQuery} style={styles.btnIcon} title="Share Query">🔗</button>
                        <button onClick={() => setWordWrap(!wordWrap)} style={{ ...styles.btnIcon, color: wordWrap ? theme.primary : theme.textSecondary }} title="Word Wrap">↩️</button>
                        {/* Query Complexity Indicator */}
                        <div style={{ 
                            display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 4,
                            backgroundColor: queryComplexity === 'high' ? `${theme.error}20` : queryComplexity === 'medium' ? `${theme.warning}20` : `${theme.success}20`,
                            color: queryComplexity === 'high' ? theme.error : queryComplexity === 'medium' ? theme.warning : theme.success,
                            fontSize: 11, fontWeight: 500
                        }} title={`Query complexity: ${queryComplexity}. ${queryComplexity === 'high' ? 'Consider adding indexes or LIMIT.' : queryComplexity === 'medium' ? 'May be slow on large tables.' : 'Looks efficient!'}`}>
                            <span>{queryComplexity === 'high' ? '🔴' : queryComplexity === 'medium' ? '🟡' : '🟢'}</span>
                            <span>{queryComplexity.toUpperCase()}</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button data-explain-btn onClick={handleExplainQuery} disabled={explainLoading || !selectedConnection || !query.trim()} style={{ ...styles.btn, ...styles.btnSecondary, opacity: explainLoading || !selectedConnection ? 0.5 : 1 }}>
                            {explainLoading ? '⏳' : '📊'} Explain
                        </button>
                        {/* Auto Refresh Toggle */}
                        <div style={{ position: 'relative' }}>
                            <button 
                                onClick={toggleAutoRefresh} 
                                style={{ 
                                    ...styles.btnIcon, 
                                    color: autoRefresh ? theme.success : theme.textSecondary,
                                    animation: autoRefresh ? 'pulse 2s infinite' : 'none'
                                }} 
                                title={autoRefresh ? `Auto-refresh ON (${autoRefreshInterval}s)` : 'Enable auto-refresh'}
                            >
                                🔄
                            </button>
                            {autoRefresh && (
                                <span style={{ 
                                    position: 'absolute', top: -2, right: -2, width: 8, height: 8, 
                                    borderRadius: '50%', backgroundColor: theme.success,
                                    boxShadow: `0 0 4px ${theme.success}`
                                }} />
                            )}
                        </div>
                        <button onClick={() => setShowAiModal(true)} style={{ ...styles.btn, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: '#fff' }}>
                            ✨ AI Assist
                        </button>
                        <button onClick={() => setShowSaveModal(true)} style={{ ...styles.btn, background: 'linear-gradient(135deg, #22c55e, #10b981)', color: '#fff' }}>
                            💾 Save
                        </button>
                        <button onClick={() => setIsDarkMode(!isDarkMode)} style={styles.btnIcon}>{isDarkMode ? '🌞' : '🌙'}</button>
                        <button onClick={toggleFullscreen} style={styles.btnIcon} title="Fullscreen">{isFullscreen ? '🔳' : '⛶'}</button>
                        <button onClick={() => setShowShortcuts(true)} style={styles.btnIcon} title="Keyboard Shortcuts (F1)">⌨️</button>
                        {/* Execute buttons */}
                        {loading ? (
                            <button onClick={handleCancelQuery} style={{ ...styles.btn, backgroundColor: theme.error, color: '#fff' }}>
                                ⏹ Cancel
                            </button>
                        ) : (
                            <>
                                {query.includes(';') && query.split(';').filter(q => q.trim()).length > 1 && (
                                    <button onClick={handleExecuteAll} disabled={!selectedConnection} style={{ ...styles.btn, ...styles.btnSecondary, opacity: !selectedConnection ? 0.5 : 1 }} title="Execute all queries separated by semicolon">
                                        ▶▶ All
                                    </button>
                                )}
                                <button data-execute-btn onClick={handleExecute} disabled={!selectedConnection} style={{ ...styles.btn, ...styles.btnPrimary, opacity: !selectedConnection ? 0.5 : 1 }}>
                                    ▶ Execute
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Query Tabs */}
                <div style={{ ...styles.tabs, position: 'relative' }}>
                    {queryTabs.map((tab, index) => (
                        <div 
                            key={tab.id} 
                            data-tab-index={index}
                            onClick={() => setActiveTabId(tab.id)} 
                            onDoubleClick={() => startEditingTab(tab.id, tab.name)}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                setTabContextMenu({ x: e.clientX, y: e.clientY, tabId: tab.id });
                            }}
                            title={tab.query.substring(0, 100) + (tab.query.length > 100 ? '...' : '')}
                            style={{ 
                                ...styles.tab, 
                                backgroundColor: activeTabId === tab.id ? theme.bgCard : 'transparent', 
                                color: activeTabId === tab.id ? theme.text : theme.textMuted, 
                                cursor: 'pointer',
                                maxWidth: 150,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                position: 'relative',
                                borderBottom: activeTabId === tab.id ? `2px solid ${theme.primary}` : '2px solid transparent',
                            }}
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
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {tab.name}{tab.unsaved && <span style={{ color: theme.warning, marginLeft: 2 }}>•</span>}
                                </span>
                            )}
                            {queryTabs.length > 1 && (
                                <button 
                                    {...(activeTabId === tab.id ? { 'data-close-active-tab': true } : {})}
                                    onClick={(e) => closeTab(tab.id, e)} 
                                    style={{ 
                                        marginLeft: 4, 
                                        background: 'none', 
                                        border: 'none', 
                                        color: theme.textMuted, 
                                        cursor: 'pointer', 
                                        fontSize: 12,
                                        opacity: 0.6,
                                        transition: 'opacity 0.2s',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                                >×</button>
                            )}
                        </div>
                    ))}
                    <button data-add-tab-btn onClick={addNewTab} style={{ ...styles.btnIcon, fontSize: 16 }} title="New Tab (Ctrl+T)">+</button>
                    
                    {/* Tab Context Menu */}
                    {tabContextMenu && (
                        <div 
                            style={{
                                position: 'fixed',
                                left: tabContextMenu.x,
                                top: tabContextMenu.y,
                                backgroundColor: theme.bgCard,
                                border: `1px solid ${theme.border}`,
                                borderRadius: 8,
                                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                                zIndex: 1000,
                                minWidth: 160,
                                overflow: 'hidden',
                            }}
                            onClick={() => setTabContextMenu(null)}
                        >
                            <button
                                onClick={() => duplicateTab(tabContextMenu.tabId)}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    border: 'none',
                                    background: 'transparent',
                                    color: theme.text,
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.bgHover}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                📋 탭 복제
                            </button>
                            <button
                                onClick={() => startEditingTab(tabContextMenu.tabId, queryTabs.find(t => t.id === tabContextMenu.tabId)?.name || '')}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    border: 'none',
                                    background: 'transparent',
                                    color: theme.text,
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.bgHover}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                ✏️ 이름 변경
                            </button>
                            <div style={{ height: 1, backgroundColor: theme.border, margin: '4px 0' }} />
                            {queryTabs.length > 1 && (
                                <>
                                    <button
                                        onClick={() => closeOtherTabs(tabContextMenu.tabId)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            border: 'none',
                                            background: 'transparent',
                                            color: theme.text,
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            fontSize: 13,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.bgHover}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        🗂️ 다른 탭 닫기
                                    </button>
                                    <button
                                        onClick={() => closeTabsToRight(tabContextMenu.tabId)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            border: 'none',
                                            background: 'transparent',
                                            color: theme.text,
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            fontSize: 13,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.bgHover}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        ➡️ 오른쪽 탭 닫기
                                    </button>
                                    <div style={{ height: 1, backgroundColor: theme.border, margin: '4px 0' }} />
                                    <button
                                        onClick={(e) => { closeTab(tabContextMenu.tabId, e as any); setTabContextMenu(null); }}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            border: 'none',
                                            background: 'transparent',
                                            color: theme.error,
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            fontSize: 13,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.bgHover}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        ✕ 탭 닫기
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Click outside to close tab context menu */}
                {tabContextMenu && (
                    <div 
                        style={{ position: 'fixed', inset: 0, zIndex: 999 }}
                        onClick={() => setTabContextMenu(null)}
                    />
                )}

                {/* Editor & Results */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    {/* Editor */}
                    <div style={{ height: `${editorHeight}%`, display: 'flex', flexDirection: 'column', position: 'relative', borderBottom: `1px solid ${theme.border}` }}>
                        <div style={{ flex: 1, minHeight: 0 }}>
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
                        </div>
                        <div style={styles.statusBar}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
                                <span style={{ color: theme.textMuted }}>|</span>
                                <span>{query.split('\n').length} lines, {query.length} chars</span>
                                {queryTabs.find(t => t.id === activeTabId)?.unsaved && (
                                    <>
                                        <span style={{ color: theme.textMuted }}>|</span>
                                        <span style={{ color: theme.warning, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            • 저장되지 않음
                                        </span>
                                    </>
                                )}
                                {lastAutoSave && (
                                    <>
                                        <span style={{ color: theme.textMuted }}>|</span>
                                        <span style={{ color: theme.textMuted, fontSize: 10 }}>
                                            💾 {lastAutoSave.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 저장됨
                                        </span>
                                    </>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {connectionStatus === 'connected' && (
                                    <span style={{ fontSize: 10, color: theme.success, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: theme.success }} />
                                        연결됨
                                    </span>
                                )}
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
                                {/* Chart Toggle */}
                                {results?.rows?.length > 0 && (
                                    <button 
                                        onClick={() => setShowChart(!showChart)} 
                                        style={{ 
                                            ...styles.btnIcon, 
                                            padding: '4px 8px', 
                                            fontSize: 11, 
                                            color: showChart ? theme.primary : theme.textSecondary,
                                            backgroundColor: showChart ? `${theme.primary}20` : 'transparent',
                                            borderRadius: 4
                                        }} 
                                        title="Show/Hide Chart"
                                    >
                                        📈
                                    </button>
                                )}
                                {/* Pin Results */}
                                {results?.rows?.length > 0 && (
                                    <button 
                                        onClick={handlePinResults} 
                                        style={{ ...styles.btnIcon, padding: '4px 8px', fontSize: 11 }} 
                                        title="Pin current results"
                                    >
                                        📌
                                    </button>
                                )}
                                {/* Column Selector */}
                                {results?.fields?.length > 0 && (
                                    <div style={{ position: 'relative' }}>
                                        <button 
                                            onClick={() => setShowColumnSelector(!showColumnSelector)} 
                                            style={{ 
                                                ...styles.btnIcon, 
                                                padding: '4px 8px', 
                                                fontSize: 11,
                                                color: hiddenColumns.size > 0 ? theme.warning : theme.textSecondary
                                            }} 
                                            title={`Columns (${hiddenColumns.size} hidden)`}
                                        >
                                            👁️ {hiddenColumns.size > 0 && <span style={{ fontSize: 10 }}>-{hiddenColumns.size}</span>}
                                        </button>
                                        {showColumnSelector && (
                                            <div style={{ 
                                                position: 'absolute', top: '100%', left: 0, marginTop: 4, width: 220, 
                                                backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, 
                                                borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', zIndex: 50, 
                                                maxHeight: 300, overflow: 'auto'
                                            }}>
                                                <div style={{ padding: '8px 12px', borderBottom: `1px solid ${theme.border}`, fontSize: 12, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>Columns</span>
                                                    <button onClick={() => setHiddenColumns(new Set())} style={{ fontSize: 10, color: theme.primary, background: 'none', border: 'none', cursor: 'pointer' }}>Show All</button>
                                                </div>
                                                {results.fields.map((field: string) => (
                                                    <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 12 }}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={!hiddenColumns.has(field)}
                                                            onChange={() => {
                                                                const newHidden = new Set(hiddenColumns);
                                                                if (hiddenColumns.has(field)) newHidden.delete(field);
                                                                else newHidden.add(field);
                                                                setHiddenColumns(newHidden);
                                                            }}
                                                        />
                                                        <span style={{ color: hiddenColumns.has(field) ? theme.textMuted : theme.text }}>{field}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
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
                        <div style={{ flex: 1, overflow: 'auto', padding: loading || error || !results ? 16 : 0, minHeight: 0 }}>
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
                                    <pre style={{ color: theme.error, fontSize: 13, whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'monospace', marginBottom: 12 }}>{error}</pre>
                                    {getErrorSuggestion(error) && (
                                        <div style={{ padding: 12, backgroundColor: `${theme.warning}15`, border: `1px solid ${theme.warning}30`, borderRadius: 6, marginTop: 8 }}>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: theme.warning, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span>💡</span> Suggestion
                                            </div>
                                            <div style={{ fontSize: 13, color: theme.textSecondary }}>{getErrorSuggestion(error)?.suggestion}</div>
                                            {getErrorSuggestion(error)?.quickFix && (
                                                <button 
                                                    onClick={() => { setQuery(getErrorSuggestion(error)!.quickFix!); showToast('Quick fix query loaded', 'info'); }}
                                                    style={{ ...styles.btn, ...styles.btnSecondary, marginTop: 8, fontSize: 12 }}
                                                >
                                                    🔧 Try: {getErrorSuggestion(error)?.quickFix?.substring(0, 40)}...
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            {results && viewMode === 'table' && (
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th style={{ ...styles.th, width: 36 }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedRows.size === paginatedRows.length && paginatedRows.length > 0}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedRows(new Set(paginatedRows.map((_: any, i: number) => (currentPage - 1) * itemsPerPage + i)));
                                                        } else {
                                                            setSelectedRows(new Set());
                                                        }
                                                    }}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                            </th>
                                            <th style={{ ...styles.th, width: 40 }}>#</th>
                                            {results.fields?.filter((f: string) => !hiddenColumns.has(f)).map((field: string, i: number) => (
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
                                        {paginatedRows.map((row: any, ri: number) => {
                                            const globalIndex = (currentPage - 1) * itemsPerPage + ri;
                                            const isSelected = selectedRows.has(globalIndex);
                                            return (
                                                <tr 
                                                    key={ri} 
                                                    style={{ 
                                                        backgroundColor: isSelected ? `${theme.primary}15` : ri % 2 === 0 ? 'transparent' : theme.bgHover, 
                                                        cursor: 'pointer' 
                                                    }}
                                                    onDoubleClick={() => { setSelectedRow(row); setShowRowDetails(true); }}
                                                >
                                                    <td style={{ ...styles.td, textAlign: 'center' }}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={isSelected}
                                                            onChange={() => {
                                                                const newSet = new Set(selectedRows);
                                                                if (isSelected) newSet.delete(globalIndex);
                                                                else newSet.add(globalIndex);
                                                                setSelectedRows(newSet);
                                                            }}
                                                            style={{ cursor: 'pointer' }}
                                                        />
                                                    </td>
                                                    <td style={{ ...styles.td, color: theme.textMuted }}>{globalIndex + 1}</td>
                                                    {results.fields?.filter((f: string) => !hiddenColumns.has(f)).map((field: string, fi: number) => (
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
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                            {/* JSON View */}
                            {results && viewMode === 'json' && (
                                <div style={{ padding: 16 }}>
                                    <pre style={{ 
                                        backgroundColor: theme.bgHover, padding: 16, borderRadius: 8, 
                                        overflow: 'auto', fontSize: 12, fontFamily: 'monospace', margin: 0,
                                        maxHeight: 400
                                    }}>
                                        {JSON.stringify(paginatedRows, null, 2)}
                                    </pre>
                                </div>
                            )}
                            {/* Card View */}
                            {results && viewMode === 'cards' && (
                                <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                                    {paginatedRows.map((row: any, ri: number) => (
                                        <div 
                                            key={ri} 
                                            style={{ 
                                                backgroundColor: theme.bgHover, borderRadius: 8, padding: 12, 
                                                border: `1px solid ${theme.border}`, cursor: 'pointer' 
                                            }}
                                            onClick={() => { setSelectedRow(row); setShowRowDetails(true); }}
                                        >
                                            <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 8 }}>
                                                Row {(currentPage - 1) * itemsPerPage + ri + 1}
                                            </div>
                                            {results.fields?.filter((f: string) => !hiddenColumns.has(f)).slice(0, 5).map((field: string, fi: number) => (
                                                <div key={fi} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                                                    <span style={{ color: theme.textSecondary, fontWeight: 500 }}>{field}:</span>
                                                    <span style={{ color: theme.text, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {row[field] === null ? <i style={{ color: theme.textMuted }}>NULL</i> : String(row[field]).substring(0, 30)}
                                                    </span>
                                                </div>
                                            ))}
                                            {results.fields?.length > 5 && (
                                                <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 4 }}>
                                                    +{results.fields.length - 5} more fields
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {/* Error Display with AI Analysis */}
                            {error && (
                                <div style={{ padding: 20 }}>
                                    <div style={{ 
                                        backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        borderRadius: 10, 
                                        padding: 16,
                                        marginBottom: 12,
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                            <span style={{ fontSize: 20 }}>❌</span>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, color: '#ef4444', marginBottom: 6 }}>쿼리 실행 실패</div>
                                                <div style={{ fontSize: 13, color: theme.textSecondary, fontFamily: 'monospace' }}>{error}</div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* AI Analysis */}
                                    {analyzingError && (
                                        <div style={{ 
                                            backgroundColor: 'rgba(99, 102, 241, 0.1)', 
                                            border: '1px solid rgba(99, 102, 241, 0.3)',
                                            borderRadius: 10, 
                                            padding: 16,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                        }}>
                                            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>🧠</span>
                                            <span style={{ color: theme.textSecondary }}>AI가 오류를 분석하고 있습니다...</span>
                                        </div>
                                    )}
                                    
                                    {errorAnalysis && !analyzingError && (
                                        <div style={{ 
                                            backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                                            border: '1px solid rgba(16, 185, 129, 0.3)',
                                            borderRadius: 10, 
                                            padding: 16,
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                                                <span style={{ fontSize: 20 }}>🧠</span>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 600, color: '#10b981', marginBottom: 8 }}>AI 분석 결과</div>
                                                    <div style={{ marginBottom: 10 }}>
                                                        <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 4 }}>📍 원인</div>
                                                        <div style={{ fontSize: 13, color: theme.text }}>{errorAnalysis.cause}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 4 }}>💡 해결 방법</div>
                                                        <div style={{ fontSize: 13, color: theme.text }}>{errorAnalysis.solution}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {errorAnalysis.correctedQuery && (
                                                <div style={{ 
                                                    marginTop: 12, 
                                                    paddingTop: 12, 
                                                    borderTop: `1px solid rgba(16, 185, 129, 0.2)` 
                                                }}>
                                                    <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 8 }}>✨ 수정된 쿼리</div>
                                                    <pre style={{ 
                                                        backgroundColor: theme.bg, 
                                                        padding: 12, 
                                                        borderRadius: 6, 
                                                        fontSize: 12, 
                                                        overflow: 'auto',
                                                        marginBottom: 10,
                                                    }}>{errorAnalysis.correctedQuery}</pre>
                                                    <button 
                                                        onClick={() => {
                                                            setQuery(errorAnalysis.correctedQuery!);
                                                            showToast('수정된 쿼리가 적용되었습니다', 'success');
                                                        }}
                                                        style={{ 
                                                            ...styles.btn, 
                                                            background: 'linear-gradient(135deg, #10b981, #059669)',
                                                            color: '#fff',
                                                            fontSize: 12,
                                                        }}
                                                    >
                                                        ✅ 수정된 쿼리 적용
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
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
                                {totalPages > 10 && (
                                    <>
                                        <div style={{ height: 16, width: 1, backgroundColor: theme.border, margin: '0 4px' }} />
                                        <input 
                                            type="text" 
                                            placeholder="Go to..." 
                                            value={pageJumpValue}
                                            onChange={(e) => setPageJumpValue(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handlePageJump(); }}
                                            style={{ ...styles.input, width: 70, textAlign: 'center' }}
                                        />
                                        <button onClick={handlePageJump} style={{ ...styles.btn, ...styles.btnSecondary }}>Go</button>
                                    </>
                                )}
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
                    <div 
                        style={styles.modalContent} 
                        onClick={e => e.stopPropagation()}
                        onKeyDown={(e) => {
                            if (e.ctrlKey && e.key === 's') {
                                e.preventDefault();
                                const isDuplicate = savedQueries.some(q => q.name.toLowerCase() === saveName.trim().toLowerCase());
                                if (saveName && !isDuplicate) handleSaveQuery();
                            }
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontSize: 18 }}>💾 쿼리 저장</h3>
                            <button 
                                onClick={() => generateQueryNameAndDescription(query)} 
                                disabled={saveNameGenerating}
                                style={{ 
                                    ...styles.btnIcon, 
                                    fontSize: 12, 
                                    color: theme.primary,
                                    opacity: saveNameGenerating ? 0.5 : 1,
                                }}
                                title="AI로 다시 생성"
                            >
                                {saveNameGenerating ? '⏳' : '✨'} AI 생성
                            </button>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: theme.textSecondary }}>
                                이름 *
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input 
                                    type="text" 
                                    value={saveName} 
                                    onChange={(e) => setSaveName(e.target.value)} 
                                    style={{ 
                                        ...styles.input, 
                                        width: '100%',
                                        paddingRight: saveNameGenerating ? 32 : 12,
                                        borderColor: saveName && savedQueries.some(q => q.name.toLowerCase() === saveName.trim().toLowerCase()) 
                                            ? theme.error 
                                            : undefined,
                                    }} 
                                    placeholder={saveNameGenerating ? "AI가 이름을 생성 중..." : "쿼리 이름"} 
                                    autoFocus 
                                />
                                {saveNameGenerating && (
                                    <span style={{ 
                                        position: 'absolute', 
                                        right: 10, 
                                        top: '50%', 
                                        transform: 'translateY(-50%)',
                                        animation: 'spin 1s linear infinite',
                                    }}>⏳</span>
                                )}
                            </div>
                            {saveName && savedQueries.some(q => q.name.toLowerCase() === saveName.trim().toLowerCase()) && (
                                <div style={{ 
                                    marginTop: 4, 
                                    fontSize: 11, 
                                    color: theme.error,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                }}>
                                    ⚠️ 이미 같은 이름의 쿼리가 존재합니다
                                </div>
                            )}
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: theme.textSecondary }}>
                                설명
                            </label>
                            <textarea 
                                value={saveDescription} 
                                onChange={(e) => setSaveDescription(e.target.value)} 
                                style={{ 
                                    ...styles.input, 
                                    width: '100%', 
                                    minHeight: 60, 
                                    resize: 'vertical',
                                    fontFamily: 'inherit',
                                }} 
                                placeholder={saveNameGenerating ? "AI가 설명을 생성 중..." : "쿼리에 대한 설명 (선택사항)"} 
                            />
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 16 }}>
                            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
                            <span style={{ fontSize: 13 }}>팀과 공유</span>
                        </label>
                        <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 12, padding: 8, backgroundColor: theme.bgHover, borderRadius: 6 }}>
                            💡 Ctrl+S를 눌러 바로 저장할 수 있습니다
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button onClick={() => setShowSaveModal(false)} style={{ ...styles.btn, ...styles.btnSecondary }}>취소</button>
                            <button 
                                onClick={handleSaveQuery} 
                                disabled={!saveName || saveNameGenerating || savedQueries.some(q => q.name.toLowerCase() === saveName.trim().toLowerCase())} 
                                style={{ 
                                    ...styles.btn, 
                                    ...styles.btnPrimary, 
                                    opacity: (saveName && !saveNameGenerating && !savedQueries.some(q => q.name.toLowerCase() === saveName.trim().toLowerCase())) ? 1 : 0.5 
                                }}
                            >
                                💾 저장 (Ctrl+S)
                            </button>
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
                    <div style={{ ...styles.modalContent, maxWidth: 600 }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 24 }}>✨</span> AI SQL 생성 어시스턴트
                            </h3>
                            <button onClick={() => setShowAiModal(false)} style={{ ...styles.btnIcon, fontSize: 18 }}>×</button>
                        </div>
                        
                        {/* Connection Info */}
                        <div style={{ 
                            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
                            padding: '8px 12px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: 8,
                            fontSize: 12, color: theme.textMuted
                        }}>
                            <span>🔗</span>
                            <span>연결: <strong style={{ color: theme.text }}>{connections.find(c => c.id === selectedConnection)?.name || 'Unknown'}</strong></span>
                            <span style={{ opacity: 0.5 }}>|</span>
                            <span>한글 매핑 활성화됨</span>
                        </div>
                        
                        {/* Suggested Questions */}
                        <div style={{ 
                            padding: 14, 
                            backgroundColor: 'rgba(99, 102, 241, 0.1)', 
                            borderRadius: 10, 
                            marginBottom: 14,
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                        }}>
                            <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span>💡</span>
                                <span style={{ flex: 1 }}>
                                    {suggestionsLoading ? 'AI가 추천 질문 생성 중...' : '이 DB에서 할 수 있는 질문'}
                                </span>
                                <button 
                                    onClick={fetchSuggestedQuestions}
                                    disabled={suggestionsLoading}
                                    style={{ 
                                        fontSize: 11, 
                                        color: suggestionsLoading ? theme.textMuted : '#a5b4fc', 
                                        background: 'rgba(99, 102, 241, 0.15)', 
                                        border: '1px solid rgba(99, 102, 241, 0.3)',
                                        borderRadius: 4,
                                        padding: '4px 8px',
                                        cursor: suggestionsLoading ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                    }}
                                >
                                    <span style={{ 
                                        display: 'inline-block',
                                        animation: suggestionsLoading ? 'spin 1s linear infinite' : 'none',
                                    }}>🔄</span>
                                    새로운 질문
                                </button>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                                {suggestionsLoading ? (
                                    // Skeleton loader - 15개
                                    <>
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(i => (
                                            <div key={i} style={{
                                                padding: '8px 16px',
                                                background: 'rgba(99, 102, 241, 0.08)',
                                                borderRadius: 6,
                                                width: `${60 + Math.random() * 80}px`,
                                                height: 28,
                                                animation: 'pulse 1.5s ease-in-out infinite',
                                            }} />
                                        ))}
                                    </>
                                ) : (suggestedQuestions.length > 0 ? suggestedQuestions : [
                                    '전체 데이터 조회',
                                    '최근 데이터 확인',
                                    '통계 조회',
                                ]).map((example) => (
                                    <button
                                        key={example}
                                        onClick={() => setAiPrompt(example)}
                                        style={{
                                            padding: '8px 14px',
                                            fontSize: 13,
                                            background: aiPrompt === example ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.12)',
                                            border: aiPrompt === example ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid rgba(99, 102, 241, 0.25)',
                                            borderRadius: 8,
                                            color: aiPrompt === example ? '#c4b5fd' : '#a5b4fc',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            fontWeight: aiPrompt === example ? 600 : 400,
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.25)';
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = aiPrompt === example ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.12)';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                        }}
                                    >
                                        {example}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Input Area */}
                        <div style={{ position: 'relative' }}>
                            <textarea 
                                value={aiPrompt} 
                                onChange={(e) => setAiPrompt(e.target.value)} 
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                        e.preventDefault();
                                        handleAiGenerate();
                                    }
                                }}
                                style={{ 
                                    ...styles.input, 
                                    width: '100%', 
                                    height: 100, 
                                    resize: 'none', 
                                    fontFamily: 'inherit',
                                    fontSize: 14,
                                    paddingRight: 100,
                                }} 
                                placeholder="예: 최근 생성된 경력이동 데이터 10건 조회"
                                autoFocus 
                            />
                            <div style={{ 
                                position: 'absolute', 
                                bottom: 10, 
                                right: 10, 
                                fontSize: 10, 
                                color: theme.textMuted,
                                background: theme.bg,
                                padding: '2px 6px',
                                borderRadius: 4,
                            }}>
                                Ctrl+Enter로 생성
                            </div>
                        </div>
                        
                        {aiError && (
                            <div style={{ 
                                color: theme.error, 
                                fontSize: 13, 
                                marginTop: 8,
                                padding: '10px 12px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                borderRadius: 6,
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                            }}>
                                ⚠️ {aiError}
                            </div>
                        )}
                        
                        <div style={{ 
                            fontSize: 11, 
                            color: theme.textMuted, 
                            marginTop: 10,
                            padding: '10px 12px',
                            background: 'rgba(16, 185, 129, 0.08)',
                            borderRadius: 8,
                            border: '1px solid rgba(16, 185, 129, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                        }}>
                            <span>🎯</span>
                            <span><strong>Tip:</strong> 한글 컬럼명으로 질문하세요 - "사용자", "생성일시", "경력이동" 등</span>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                            <button onClick={() => setShowAiModal(false)} style={{ ...styles.btn, ...styles.btnSecondary }}>
                                취소
                            </button>
                            <button 
                                onClick={handleAiGenerate} 
                                disabled={aiLoading || !aiPrompt.trim()} 
                                style={{ 
                                    ...styles.btn, 
                                    background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', 
                                    color: '#fff', 
                                    opacity: aiLoading || !aiPrompt.trim() ? 0.5 : 1,
                                    minWidth: 120,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                }}
                            >
                                {aiLoading ? (
                                    <>
                                        <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
                                        생성 중...
                                    </>
                                ) : (
                                    <>✨ SQL 생성</>
                                )}
                            </button>
                        </div>
                    </div>
                    
                    <style>{`
                        @keyframes spin {
                            from { transform: rotate(0deg); }
                            to { transform: rotate(360deg); }
                        }
                        @keyframes pulse {
                            0%, 100% { opacity: 0.4; }
                            50% { opacity: 0.8; }
                        }
                    `}</style>
                </div>
            )}

            {/* Shortcuts Modal */}
            {showShortcuts && (
                <div style={styles.modal} onClick={() => setShowShortcuts(false)}>
                    <div style={{ ...styles.modalContent, maxWidth: 600 }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>⌨️ Keyboard Shortcuts</h3>
                        
                        {/* Execution */}
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: theme.primary, marginBottom: 8, textTransform: 'uppercase' }}>실행</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {[
                                    ['쿼리 실행', 'F5 / Ctrl+Enter'],
                                    ['선택 영역만 실행', 'Ctrl+Shift+Enter'],
                                    ['실행 계획 (Explain)', 'Ctrl+E'],
                                ].map(([action, keys]) => (
                                    <div key={action} style={{ padding: 10, backgroundColor: theme.bgHover, borderRadius: 6 }}>
                                        <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 2 }}>{action}</div>
                                        <div style={{ fontWeight: 500, fontSize: 13 }}>{keys}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Editing */}
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: theme.success, marginBottom: 8, textTransform: 'uppercase' }}>편집</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {[
                                    ['SQL 포맷팅', 'Ctrl+Shift+F'],
                                    ['주석 토글', 'Ctrl+/'],
                                    ['행 복제', 'Ctrl+D'],
                                    ['줄바꿈 토글', 'Alt+Z'],
                                ].map(([action, keys]) => (
                                    <div key={action} style={{ padding: 10, backgroundColor: theme.bgHover, borderRadius: 6 }}>
                                        <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 2 }}>{action}</div>
                                        <div style={{ fontWeight: 500, fontSize: 13 }}>{keys}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Panels */}
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: theme.accent, marginBottom: 8, textTransform: 'uppercase' }}>패널</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {[
                                    ['쿼리 저장', 'Ctrl+S'],
                                    ['AI 어시스트', 'Ctrl+Shift+A'],
                                    ['히스토리 토글', 'Ctrl+H'],
                                    ['단축키 도움말', 'F1'],
                                ].map(([action, keys]) => (
                                    <div key={action} style={{ padding: 10, backgroundColor: theme.bgHover, borderRadius: 6 }}>
                                        <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 2 }}>{action}</div>
                                        <div style={{ fontWeight: 500, fontSize: 13 }}>{keys}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Tabs */}
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: theme.warning, marginBottom: 8, textTransform: 'uppercase' }}>탭</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {[
                                    ['새 탭', 'Ctrl+T'],
                                    ['탭 닫기', 'Ctrl+W'],
                                    ['탭 전환', 'Ctrl+1~9'],
                                    ['탭 이름 변경', '더블클릭'],
                                    ['탭 메뉴', '우클릭'],
                                    ['모달 닫기', 'Esc'],
                                ].map(([action, keys]) => (
                                    <div key={action} style={{ padding: 10, backgroundColor: theme.bgHover, borderRadius: 6 }}>
                                        <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 2 }}>{action}</div>
                                        <div style={{ fontWeight: 500, fontSize: 13 }}>{keys}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div style={{ padding: 12, backgroundColor: theme.bgHover, borderRadius: 8, marginBottom: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: theme.textSecondary, marginBottom: 6 }}>💡 유용한 팁</div>
                            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: theme.textMuted, lineHeight: 1.6 }}>
                                <li>쿼리 일부를 선택 후 Ctrl+Enter로 선택한 부분만 실행</li>
                                <li>탭을 우클릭하면 복제, 다른 탭 닫기 등 메뉴 사용 가능</li>
                                <li>저장 모달에서 AI가 자동으로 쿼리명을 제안해줍니다</li>
                                <li>탭에 마우스를 올리면 쿼리 미리보기가 표시됩니다</li>
                            </ul>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                            <button onClick={() => setShowShortcuts(false)} style={{ ...styles.btn, ...styles.btnSecondary }}>닫기</button>
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
            
            {/* Schema Browser Panel */}
            {showSchemaBrowser && (
                <div style={{ 
                    position: 'fixed', top: 100, right: 24, width: 420, maxHeight: 'calc(100vh - 150px)',
                    backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: 12,
                    boxShadow: '0 12px 40px rgba(0,0,0,0.4)', zIndex: 60, display: 'flex', flexDirection: 'column'
                }}>
                    <div style={{ padding: 16, borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>🗄️ Schema Browser</span>
                        <button onClick={() => setShowSchemaBrowser(false)} style={styles.btnIcon}>×</button>
                    </div>
                    <div style={{ padding: '8px 12px', borderBottom: `1px solid ${theme.border}` }}>
                        <input 
                            type="text" 
                            placeholder="🔍 Filter tables..." 
                            value={schemaFilter} 
                            onChange={(e) => setSchemaFilter(e.target.value)}
                            style={{ ...styles.input, width: '100%' }}
                        />
                    </div>
                    <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
                        {schemaData.tables
                            .filter(t => !schemaFilter || t.toLowerCase().includes(schemaFilter.toLowerCase()) || 
                                (schemaTranslations[t]?.koreanName || '').toLowerCase().includes(schemaFilter.toLowerCase()))
                            .map(table => {
                                const tableTranslation = schemaTranslations[table];
                                const tableKoreanName = tableTranslation?.koreanName && tableTranslation.koreanName !== table 
                                    ? tableTranslation.koreanName : null;
                                return (
                                <div key={table} style={{ marginBottom: 4 }}>
                                    <div 
                                        onClick={() => setExpandedTables(prev => {
                                            const next = new Set(prev);
                                            if (next.has(table)) next.delete(table);
                                            else next.add(table);
                                            return next;
                                        })}
                                        style={{ 
                                            padding: '8px 12px', borderRadius: 6, cursor: 'pointer', 
                                            backgroundColor: expandedTables.has(table) ? theme.bgHover : 'transparent',
                                            display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, flexWrap: 'wrap'
                                        }}
                                    >
                                        <span>{expandedTables.has(table) ? '📂' : '📁'}</span>
                                        <span style={{ fontWeight: 500 }}>{table}</span>
                                        {tableKoreanName && <span style={{ fontSize: 11, color: theme.textMuted }}>({tableKoreanName})</span>}
                                        <span style={{ fontSize: 11, color: theme.textMuted, marginLeft: 'auto' }}>
                                            {(schemaData.columns[table] || []).length} cols
                                        </span>
                                    </div>
                                    {expandedTables.has(table) && (
                                        <div style={{ marginLeft: 20, borderLeft: `2px solid ${theme.border}`, paddingLeft: 12 }}>
                                            {(schemaData.columns[table] || []).map((col: any, ci: number) => {
                                                const colName = col.name || col;
                                                const colKoreanName = tableTranslation?.columns?.[colName];
                                                const showKorean = colKoreanName && colKoreanName !== colName;
                                                return (
                                                <div 
                                                    key={ci}
                                                    onClick={() => { insertSnippet(colName); }}
                                                    style={{ 
                                                        padding: '6px 8px', fontSize: 12, cursor: 'pointer', 
                                                        borderRadius: 4, display: 'flex', alignItems: 'center', gap: 6
                                                    }}
                                                    title={showKorean ? `${colName} (${colKoreanName})` : colName}
                                                >
                                                    <span style={{ color: theme.textMuted }}>└</span>
                                                    <span style={{ color: theme.text }}>{colName}</span>
                                                    {showKorean && <span style={{ fontSize: 10, color: '#a78bfa' }}>({colKoreanName})</span>}
                                                    {col.type && <span style={{ fontSize: 10, color: theme.accent, marginLeft: 'auto' }}>{col.type}</span>}
                                                </div>
                                            );})}
                                        </div>
                                    )}
                                </div>
                            );})
                        }
                        {schemaData.tables.length === 0 && (
                            <div style={{ padding: 24, textAlign: 'center', color: theme.textMuted, fontSize: 13 }}>
                                No tables found. Click the Schema Browser button to load.
                            </div>
                        )}
                    </div>
                    <div style={{ padding: 8, borderTop: `1px solid ${theme.border}`, fontSize: 11, color: theme.textMuted, textAlign: 'center' }}>
                        {schemaData.tables.length} tables • Click column to insert
                    </div>
                </div>
            )}
            
            {/* Explain Plan Modal */}
            {showExplainModal && (
                <div style={styles.modal} onClick={() => setShowExplainModal(false)}>
                    <div style={{ ...styles.modalContent, maxWidth: 800, maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontSize: 18 }}>📊 Query Execution Plan</h3>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(explainResult, null, 2)); showToast('Plan copied as JSON', 'success'); }} style={{ ...styles.btn, ...styles.btnSecondary }}>📋 Copy</button>
                                <button onClick={() => setShowExplainModal(false)} style={styles.btnIcon}>×</button>
                            </div>
                        </div>
                        {explainResult && (
                            <div>
                                {/* Summary Stats */}
                                {Array.isArray(explainResult) && explainResult[0] && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                                        <div style={{ padding: 12, backgroundColor: theme.bgHover, borderRadius: 8, textAlign: 'center' }}>
                                            <div style={{ fontSize: 20, fontWeight: 700, color: theme.primary }}>{explainResult[0]['Execution Time']?.toFixed(2) || '—'}ms</div>
                                            <div style={{ fontSize: 11, color: theme.textMuted }}>Execution Time</div>
                                        </div>
                                        <div style={{ padding: 12, backgroundColor: theme.bgHover, borderRadius: 8, textAlign: 'center' }}>
                                            <div style={{ fontSize: 20, fontWeight: 700, color: theme.accent }}>{explainResult[0]['Planning Time']?.toFixed(2) || '—'}ms</div>
                                            <div style={{ fontSize: 11, color: theme.textMuted }}>Planning Time</div>
                                        </div>
                                        <div style={{ padding: 12, backgroundColor: theme.bgHover, borderRadius: 8, textAlign: 'center' }}>
                                            <div style={{ fontSize: 20, fontWeight: 700, color: theme.success }}>{explainResult[0].Plan?.['Actual Rows'] || '—'}</div>
                                            <div style={{ fontSize: 11, color: theme.textMuted }}>Actual Rows</div>
                                        </div>
                                        <div style={{ padding: 12, backgroundColor: theme.bgHover, borderRadius: 8, textAlign: 'center' }}>
                                            <div style={{ fontSize: 20, fontWeight: 700, color: theme.warning }}>{explainResult[0].Plan?.['Total Cost']?.toFixed(0) || '—'}</div>
                                            <div style={{ fontSize: 11, color: theme.textMuted }}>Total Cost</div>
                                        </div>
                                    </div>
                                )}
                                {/* Raw Plan */}
                                <div style={{ padding: 12, backgroundColor: theme.bgHover, borderRadius: 8, overflow: 'auto' }}>
                                    <pre style={{ margin: 0, fontSize: 12, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                                        {JSON.stringify(explainResult, null, 2)}
                                    </pre>
                                </div>
                                {/* Tips */}
                                <div style={{ padding: 12, backgroundColor: `${theme.primary}15`, borderRadius: 8, marginTop: 12, fontSize: 12 }}>
                                    <div style={{ fontWeight: 600, marginBottom: 4, color: theme.primary }}>💡 Performance Tips</div>
                                    <ul style={{ margin: 0, paddingLeft: 20, color: theme.textSecondary }}>
                                        <li>Look for <strong>Seq Scan</strong> on large tables — consider adding an index</li>
                                        <li>High <strong>Total Cost</strong> suggests optimization opportunities</li>
                                        <li>Check if <strong>Actual Rows</strong> differs significantly from <strong>Plan Rows</strong></li>
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* Chart Visualization Panel */}
            {showChart && results?.rows?.length > 0 && (
                <div style={{ 
                    position: 'fixed', bottom: 100, right: 24, width: 400, 
                    backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, 
                    borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.4)', zIndex: 60
                }}>
                    <div style={{ padding: 12, borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>📈 Data Visualization</span>
                        <button onClick={() => setShowChart(false)} style={styles.btnIcon}>×</button>
                    </div>
                    <div style={{ padding: 12 }}>
                        {/* Chart Controls */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                            <select 
                                value={chartField || ''} 
                                onChange={(e) => setChartField(e.target.value || null)}
                                style={{ ...styles.select, flex: 1 }}
                            >
                                <option value="">Select Field</option>
                                {results.fields?.map((f: string) => <option key={f} value={f}>{f}</option>)}
                            </select>
                            <select value={chartType} onChange={(e) => setChartType(e.target.value as any)} style={styles.select}>
                                <option value="bar">Bar</option>
                                <option value="pie">Pie</option>
                            </select>
                        </div>
                        {/* Simple Bar Chart */}
                        {chartField && chartType === 'bar' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {getChartData().map((d, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 11, color: theme.textSecondary, width: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
                                        <div style={{ flex: 1, height: 20, backgroundColor: theme.bgHover, borderRadius: 4, overflow: 'hidden' }}>
                                            <div style={{ 
                                                width: `${(d.value / Math.max(...getChartData().map(x => x.value))) * 100}%`, 
                                                height: '100%', 
                                                background: `hsl(${(i * 36) % 360}, 70%, 50%)`,
                                                transition: 'width 0.3s'
                                            }} />
                                        </div>
                                        <span style={{ fontSize: 11, color: theme.textMuted, width: 40, textAlign: 'right' }}>{d.value}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Simple Pie Chart */}
                        {chartField && chartType === 'pie' && (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                                <svg width="180" height="180" viewBox="0 0 100 100">
                                    {(() => {
                                        const data = getChartData();
                                        const total = data.reduce((a, b) => a + b.value, 0);
                                        let accAngle = 0;
                                        return data.map((d, i) => {
                                            const angle = (d.value / total) * 360;
                                            const startAngle = accAngle;
                                            accAngle += angle;
                                            const x1 = 50 + 40 * Math.cos((startAngle - 90) * Math.PI / 180);
                                            const y1 = 50 + 40 * Math.sin((startAngle - 90) * Math.PI / 180);
                                            const x2 = 50 + 40 * Math.cos((startAngle + angle - 90) * Math.PI / 180);
                                            const y2 = 50 + 40 * Math.sin((startAngle + angle - 90) * Math.PI / 180);
                                            const largeArc = angle > 180 ? 1 : 0;
                                            return (
                                                <path 
                                                    key={i}
                                                    d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                                                    fill={`hsl(${(i * 36) % 360}, 70%, 50%)`}
                                                />
                                            );
                                        });
                                    })()}
                                </svg>
                            </div>
                        )}
                        {!chartField && <div style={{ textAlign: 'center', color: theme.textMuted, fontSize: 13, padding: 20 }}>Select a field to visualize</div>}
                    </div>
                </div>
            )}
            
            {/* Pinned Results Panel */}
            {pinnedResults.length > 0 && (
                <div style={{ 
                    position: 'fixed', top: 100, left: showSidebar ? 290 : 24, width: 280, 
                    backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, 
                    borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', zIndex: 55, maxHeight: 400, overflow: 'hidden'
                }}>
                    <div style={{ padding: 12, borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>📌 Pinned Results ({pinnedResults.length})</span>
                        <button onClick={() => setPinnedResults([])} style={{ ...styles.btnIcon, fontSize: 10 }} title="Clear all">🗑</button>
                    </div>
                    <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                        {pinnedResults.map(p => (
                            <div key={p.id} style={{ padding: '10px 12px', borderBottom: `1px solid ${theme.border}20` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <span style={{ fontSize: 12, color: theme.textSecondary }}>{p.results.rowCount} rows</span>
                                    <button onClick={() => handleUnpinResult(p.id)} style={{ ...styles.btnIcon, fontSize: 10 }}>×</button>
                                </div>
                                <div style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.query}</div>
                            </div>
                        ))}
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
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
}
