'use client';

import { useState, useEffect } from 'react';

export function Footer() {
    const [year] = useState(new Date().getFullYear());
    const [showShortcuts, setShowShortcuts] = useState(false);

    const shortcuts = [
        { key: 'Ctrl+K', action: '검색 / 커맨드 팔레트' },
        { key: 'Ctrl+P', action: '커맨드 팔레트' },
        { key: 'G D', action: '대시보드로 이동' },
        { key: 'G S', action: '설정으로 이동' },
        { key: 'ESC', action: '닫기' },
    ];

    return (
        <footer style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(99, 102, 241, 0.1)',
            background: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            color: '#64748b'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <span>© {year} Jainsight. Enterprise DB Hub</span>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" style={{ color: '#64748b', textDecoration: 'none', transition: 'color 0.2s' }}>
                    GitHub
                </a>
                <a href="/docs" style={{ color: '#64748b', textDecoration: 'none', transition: 'color 0.2s' }}>
                    문서
                </a>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Shortcuts Button */}
                <button
                    onClick={() => setShowShortcuts(!showShortcuts)}
                    style={{
                        padding: '4px 10px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        borderRadius: '6px',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                    }}
                >
                    ⌨️ 단축키
                </button>

                {/* Version */}
                <span style={{ 
                    padding: '4px 8px', 
                    background: 'rgba(99, 102, 241, 0.1)', 
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: '#64748b'
                }}>
                    v1.0.0
                </span>
            </div>

            {/* Shortcuts Modal */}
            {showShortcuts && (
                <div 
                    style={{
                        position: 'fixed',
                        bottom: '60px',
                        right: '24px',
                        background: 'rgba(20, 17, 50, 0.98)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderRadius: '12px',
                        padding: '16px',
                        minWidth: '220px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                        zIndex: 1000,
                        animation: 'slideUp 0.2s ease-out'
                    }}
                >
                    <div style={{ fontWeight: '500', color: '#e2e8f0', marginBottom: '12px', fontSize: '13px' }}>
                        ⌨️ 키보드 단축키
                    </div>
                    {shortcuts.map((s, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                            <kbd style={{
                                padding: '3px 8px',
                                background: 'rgba(99, 102, 241, 0.15)',
                                borderRadius: '4px',
                                color: '#a5b4fc',
                                fontFamily: 'monospace'
                            }}>{s.key}</kbd>
                            <span style={{ color: '#94a3b8' }}>{s.action}</span>
                        </div>
                    ))}
                </div>
            )}

            <style>{`
                @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                footer a:hover { color: #a5b4fc !important; }
                footer button:hover { background: rgba(99, 102, 241, 0.2) !important; color: #a5b4fc !important; }
            `}</style>
        </footer>
    );
}

export default Footer;
