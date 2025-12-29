'use client';

import { useState, useEffect } from 'react';

interface Connection {
    id: string;
    name: string;
    type: string;
}

interface TableInfo {
    name: string;
    type: 'TABLE' | 'VIEW';
}

interface ColumnInfo {
    name: string;
    type: string;
    nullable: boolean;
    primaryKey: boolean;
}

export default function SchemaExplorerPage() {
    const [connections, setConnections] = useState<Connection[]>([]);
    const [selectedConnection, setSelectedConnection] = useState<string>('');
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [columns, setColumns] = useState<ColumnInfo[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchConnections();
    }, []);

    useEffect(() => {
        if (selectedConnection) {
            fetchTables(selectedConnection);
            setSelectedTable('');
            setColumns([]);
        }
    }, [selectedConnection]);

    useEffect(() => {
        if (selectedConnection && selectedTable) {
            fetchColumns(selectedConnection, selectedTable);
        }
    }, [selectedConnection, selectedTable]);

    const fetchConnections = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch('/api/connections', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401) {
                setConnections([]);
                return;
            }
            const data = await res.json();
            if (Array.isArray(data)) {
                setConnections(data);
            } else {
                setConnections([]);
            }
        } catch (e) {
            console.error('Failed to fetch connections', e);
            setConnections([]);
        }
    };

    const fetchTables = async (connId: string) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/schema/${connId}/tables`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401) {
                setTables([]);
                return;
            }
            const data = await res.json();
            if (Array.isArray(data)) {
                setTables(data);
            } else {
                setTables([]);
            }
        } catch (e) {
            console.error('Failed to fetch tables', e);
            setTables([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchColumns = async (connId: string, tableName: string) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/schema/${connId}/tables/${tableName}/columns`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401) {
                setColumns([]);
                return;
            }
            const data = await res.json();
            if (Array.isArray(data)) {
                setColumns(data);
            } else {
                setColumns([]);
            }
        } catch (e) {
            console.error('Failed to fetch columns', e);
            setColumns([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-full border rounded-lg overflow-hidden bg-white shadow">
            {/* Connections & Tables Sidebar */}
            <div className="w-1/3 border-r bg-gray-50 flex flex-col">
                <div className="p-4 border-b bg-white">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Connection</label>
                    <select
                        value={selectedConnection}
                        onChange={(e) => setSelectedConnection(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    >
                        <option value="">-- Choose DB --</option>
                        {connections.map((conn) => (
                            <option key={conn.id} value={conn.id}>
                                {conn.name} ({conn.type})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex-1 overflow-auto p-2">
                    {selectedConnection && (
                        <>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
                                Tables ({tables.length})
                            </h3>
                            <ul className="space-y-1">
                                {tables.map((table) => (
                                    <li
                                        key={table.name}
                                        onClick={() => setSelectedTable(table.name)}
                                        className={`cursor-pointer px-3 py-2 rounded text-sm flex items-center ${selectedTable === table.name
                                            ? 'bg-blue-100 text-blue-700 font-medium'
                                            : 'text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full mr-2 ${table.type === 'VIEW' ? 'bg-yellow-400' : 'bg-green-400'}`}></span>
                                        {table.name}
                                    </li>
                                ))}
                                {tables.length === 0 && !loading && (
                                    <li className="text-sm text-gray-400 px-3">No tables found</li>
                                )}
                            </ul>
                        </>
                    )}
                </div>
            </div>

            {/* Columns Detail View */}
            <div className="flex-1 flex flex-col bg-white">
                <div className="p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">
                        {selectedTable || 'Select a Table'}
                    </h2>
                    {selectedTable && (
                        <p className="text-sm text-gray-500">Schema Details</p>
                    )}
                </div>
                <div className="flex-1 overflow-auto p-4">
                    {selectedTable ? (
                        <div className="border rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PK</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Column Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nullable</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {columns.map((col) => (
                                        <tr key={col.name}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {col.primaryKey && <span className="text-yellow-600 font-bold">🔑</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{col.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{col.type}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {col.nullable ? 'Yes' : 'No'}
                                            </td>
                                        </tr>
                                    ))}
                                    {columns.length === 0 && !loading && (
                                        <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">No columns found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                            Select a table from the left to view its schema
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
