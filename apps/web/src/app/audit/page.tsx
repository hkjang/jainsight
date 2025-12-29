'use client';

import { useState, useEffect } from 'react';

interface AuditLog {
    id: string;
    connectionId: string;
    connectionName: string;
    query: string;
    status: 'SUCCESS' | 'FAILURE';
    rowCount: number | null;
    durationMs: number;
    errorMessage: string | null;
    executedBy: string;
    executedAt: string;
}

export default function AuditPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, []);

    const fetchLogs = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                // Redirect if needed, or just don't fetch
                return;
            }

            const res = await fetch('/api/audit', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.status === 401) {
                console.warn('Unauthorized access to audit logs');
                setLogs([]); // Clear logs
                return;
            }

            if (!res.ok) {
                console.error('Error fetching logs:', res.statusText);
                return;
            }

            const data = await res.json();
            if (Array.isArray(data)) {
                setLogs(data);
            } else {
                setLogs([]);
            }
        } catch (e) {
            console.error('Failed to fetch audit logs', e);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white p-6 shadow-sm rounded-lg m-4 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Query Audit Logs</h1>
                <button
                    onClick={fetchLogs}
                    className="px-4 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                >
                    Refresh
                </button>
            </div>

            <div className="flex-1 overflow-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Connection</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Query Snippet</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {logs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(log.executedAt).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                    {log.executedBy}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                    {log.connectionName}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600 font-mono truncate max-w-xs" title={log.query}>
                                    {log.query.length > 50 ? log.query.substring(0, 50) + '...' : log.query}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${log.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                        {log.status}
                                    </span>
                                    {log.errorMessage && (
                                        <div className="text-xs text-red-600 mt-1 max-w-[200px] truncate" title={log.errorMessage}>
                                            {log.errorMessage}
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {log.durationMs}ms
                                </td>
                            </tr>
                        ))}
                        {logs.length === 0 && !loading && (
                            <tr>
                                <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                                    No query logs found. Execute some queries first.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
