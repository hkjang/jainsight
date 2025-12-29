
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
    BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function ApiBuilderPage() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [view, setView] = useState<'list' | 'editor'>('list');
    const [currentTemplate, setCurrentTemplate] = useState<any | null>(null);

    // Editor State
    const [name, setName] = useState('');
    const [sql, setSql] = useState('SELECT * FROM users WHERE id = :userId');
    const [params, setParams] = useState<any[]>([]);
    const [visualization, setVisualization] = useState<any>({ type: 'bar', xAxis: '', dataKeys: [] });
    const [cacheTtl, setCacheTtl] = useState<number>(0);
    const [testResult, setTestResult] = useState<any>(null); // Store execution result for preview
    const [connectionId, setConnectionId] = useState('');
    const [connections, setConnections] = useState<any[]>([]);

    useEffect(() => {
        fetchTemplates();
        fetchConnections();
    }, []);

    // Auto-detect params from SQL
    useEffect(() => {
        const regex = /:(\w+)/g;
        const matches = new Set<string>();
        let match;
        while ((match = regex.exec(sql)) !== null) {
            matches.add(match[1]);
        }

        // Merge with existing params config
        const newParams = Array.from(matches).map(p => {
            const existing = params.find(ep => ep.name === p);
            return existing || { name: p, type: 'string', required: true };
        });
        setParams(newParams);
    }, [sql]);

    const fetchTemplates = async () => {
        const res = await fetch('/api/sql-api', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) setTemplates(await res.json());
    };

    const fetchConnections = async () => {
        const res = await fetch('/api/connections', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) setConnections(await res.json());
    };

    const handleSave = async () => {
        const payload = {
            name,
            sql,
            parameters: params,
            connectionId
        };

        const res = await fetch('/api/sql-api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert('API Created!');
            setView('list');
            fetchTemplates();
        } else {
            alert('Error saving API');
        }
    };

    const handleTest = async () => {
        // Mock test params
        const testParams = params.reduce((acc, p) => ({ ...acc, [p.name]: 'test_value' }), {});
        // In a real UI, we'd show a form to input these.
        alert(`Testing with mock params: ${JSON.stringify(testParams)}`);
        // Call executeInternal... needs ID, but we might not have saved yet.
        // The backend execute endpoint expects a saved template ID. 
        // So usually we save first, or we have a "dry-run" endpoint (optional).
        // For now, let's just save.
    };

    const renderChart = () => {
        if (!testResult?.rows) return <div className="text-center opacity-50 p-4">Run Test to see Chart</div>;
        const data = testResult.rows;
        const { type, xAxis, dataKeys } = visualization;

        // Simple default if not configured
        const X = xAxis || Object.keys(data[0] || {})[0];
        const Keys = dataKeys?.length > 0 ? dataKeys : [Object.keys(data[0] || {})[1]];

        const ChartComponent = type === 'line' ? LineChart : type === 'area' ? AreaChart : BarChart;
        const DataComponent = type === 'line' ? Line : type === 'area' ? Area : Bar;

        return (
            <ResponsiveContainer width="100%" height={300}>
                <ChartComponent data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={X} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {Keys.map((key: string, idx: number) => (
                        <DataComponent key={key} type="monotone" dataKey={key} fill="#8884d8" stroke="#8884d8" />
                    ))}
                </ChartComponent>
            </ResponsiveContainer>
        );
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <h1 className="text-2xl font-bold mb-4 text-white">SQL-to-API Gateway</h1>

            {view === 'list' && (
                <div className="flex-1">
                    <button
                        onClick={() => { setView('editor'); setCurrentTemplate(null); }}
                        className="btn btn-primary mb-4"
                    >
                        + Create New API
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {templates.map(t => (
                            <div key={t.id} className="card bg-base-200 shadow-xl border border-base-content/10">
                                <div className="card-body">
                                    <h2 className="card-title text-accent">{t.name}</h2>
                                    <p className="text-sm opacity-70 truncate">{t.sql}</p>
                                    <div className="badge badge-outline mt-2">{t.parameters?.length || 0} Params</div>
                                    <div className="card-actions justify-end mt-4">
                                        <button className="btn btn-sm btn-ghost" onClick={() => window.open(`/api/sql-api/${t.id}/openapi`, '_blank')}>View Docs</button>
                                        <button className="btn btn-sm btn-ghost" onClick={() => alert(`API Key: ${t.apiKey}`)}>Show Key</button>
                                        <button className="btn btn-sm" onClick={() => {
                                            // Pre-fill editor
                                            setName(t.name);
                                            setSql(t.sql);
                                            setParams(t.parameters);
                                            setVisualization(t.visualization || { type: 'bar', xAxis: '', dataKeys: [] });
                                            setCacheTtl(t.cacheTtl || 0);
                                            setConnectionId(t.connectionId);
                                            setView('editor');
                                        }}>Edit</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {view === 'editor' && (
                <div className="flex-1 flex flex-col gap-4">
                    <div className="flex gap-4">
                        <input
                            type="text"
                            placeholder="API Name"
                            className="input input-bordered w-full max-w-xs"
                            value={name} onChange={e => setName(e.target.value)}
                        />
                        <select
                            className="select select-bordered"
                            value={connectionId}
                            onChange={e => setConnectionId(e.target.value)}
                        >
                            <option value="">Select Connection</option>
                            {connections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <div className="flex-1"></div>
                        <button className="btn btn-ghost" onClick={() => setView('list')}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSave}>Save API</button>
                    </div>

                    <div className="flex gap-4 items-center bg-base-200 p-2 rounded">
                        <span className="text-sm font-bold ml-2">Settings:</span>
                        <div className="form-control">
                            <label className="label cursor-pointer gap-2">
                                <span className="label-text">Cache TTL (sec)</span>
                                <input
                                    type="number"
                                    className="input input-sm input-bordered w-20"
                                    value={cacheTtl}
                                    onChange={e => setCacheTtl(Number(e.target.value))}
                                />
                            </label>
                        </div>
                    </div>

                    <div className="flex-1 grid grid-cols-3 gap-4">
                        <div className="col-span-2 border border-base-content/20 rounded-lg overflow-hidden">
                            <MonacoEditor
                                height="100%"
                                defaultLanguage="sql"
                                theme="vs-dark"
                                value={sql}
                                onChange={val => setSql(val || '')}
                            />
                        </div>
                        <div className="bg-base-200 p-4 rounded-lg overflow-auto">
                            <h3 className="font-bold mb-2">Parameters Config</h3>
                            <div className="space-y-2">
                                {params.map((p, idx) => (
                                    <div key={p.name} className="p-2 bg-base-100 rounded border border-base-content/10">
                                        <div className="font-mono text-secondary mb-1">:{p.name}</div>
                                        <div className="flex gap-2 text-sm">
                                            <select
                                                className="select select-xs select-bordered"
                                                value={p.type}
                                                onChange={e => {
                                                    const newP = [...params];
                                                    newP[idx].type = e.target.value;
                                                    setParams(newP);
                                                }}
                                            >
                                                <option value="string">String</option>
                                                <option value="number">Number</option>
                                                <option value="boolean">Boolean</option>
                                            </select>
                                            <label className="label cursor-pointer gap-2">
                                                <span className="label-text">Req</span>
                                                <input
                                                    type="checkbox"
                                                    className="checkbox checkbox-xs"
                                                    checked={p.required}
                                                    onChange={e => {
                                                        const newP = [...params];
                                                        newP[idx].required = e.target.checked;
                                                        setParams(newP);
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                ))}
                                {params.length === 0 && <p className="text-sm opacity-50">No parameters detected. Use :paramName in SQL.</p>}
                            </div>
                        </div>

                        {/* Visualization Config */}
                        <div className="col-span-3 bg-base-200 p-4 rounded-lg">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold">Visualization</h3>
                                <div className="flex gap-2">
                                    <select
                                        className="select select-sm select-bordered"
                                        value={visualization.type}
                                        onChange={e => setVisualization({ ...visualization, type: e.target.value })}
                                    >
                                        <option value="bar">Bar Chart</option>
                                        <option value="line">Line Chart</option>
                                        <option value="area">Area Chart</option>
                                    </select>
                                    <input
                                        type="text" placeholder="X-Axis Key (e.g. month)"
                                        className="input input-sm input-bordered"
                                        value={visualization.xAxis}
                                        onChange={e => setVisualization({ ...visualization, xAxis: e.target.value })}
                                    />
                                    <input
                                        type="text" placeholder="Data Keys (comma sep)"
                                        className="input input-sm input-bordered"
                                        value={visualization.dataKeys?.join(',')}
                                        onChange={e => setVisualization({ ...visualization, dataKeys: e.target.value.split(',') })}
                                    />
                                    <button className="btn btn-sm btn-secondary" onClick={handleTest}>Test Visualization</button>
                                </div>
                            </div>
                            <div className="bg-base-100 rounded-lg border border-base-content/10 p-4 h-[320px]">
                                {renderChart()}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
