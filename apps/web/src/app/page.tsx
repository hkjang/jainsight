'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface DashboardStats {
  connectionsCount: number;
  queriesCount: number;
  failedQueriesCount: number;
  recentActivity: Array<{
    id: string;
    query: string;
    executedAt: string;
    status: 'SUCCESS' | 'FAILURE';
    durationMs: number;
    connectionName: string;
    executedBy: string;
  }>;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const res = await fetch('/api/dashboard/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        setStats(data);
      } catch (e) {
        console.error('Failed to fetch dashboard stats', e);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [router]);

  const StatCard = ({ title, value, icon, color, bgColor }: { title: string; value: number; icon: string; color: string; bgColor: string }) => (
    <div style={{
      padding: '24px',
      background: 'rgba(30, 27, 75, 0.5)',
      borderRadius: '16px',
      border: '1px solid rgba(99, 102, 241, 0.2)',
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>{title}</p>
          <p style={{ fontSize: '32px', fontWeight: 700, color: '#e2e8f0' }}>{value}</p>
        </div>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
        }}>
          {icon}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
          <div>대시보드 로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 700,
            background: 'linear-gradient(90deg, #e0e7ff, #c7d2fe)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '8px',
          }}>
            대시보드
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '15px' }}>
            Enterprise DB Hub 현황을 한눈에 확인하세요
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/connections/create" style={{
            padding: '10px 20px',
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            borderRadius: '10px',
            color: '#fff',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <span>+</span> 새 연결
          </Link>
          <Link href="/editor" style={{
            padding: '10px 20px',
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '10px',
            color: '#a5b4fc',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <span>⚡</span> SQL 에디터
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <StatCard
          title="전체 연결"
          value={stats?.connectionsCount || 0}
          icon="🔗"
          color="#6366f1"
          bgColor="rgba(99, 102, 241, 0.2)"
        />
        <StatCard
          title="실행된 쿼리"
          value={stats?.queriesCount || 0}
          icon="📊"
          color="#8b5cf6"
          bgColor="rgba(139, 92, 246, 0.2)"
        />
        <StatCard
          title="실패한 쿼리"
          value={stats?.failedQueriesCount || 0}
          icon="⚠️"
          color="#ef4444"
          bgColor="rgba(239, 68, 68, 0.2)"
        />
      </div>

      {/* Recent Activity */}
      <div style={{
        background: 'rgba(30, 27, 75, 0.5)',
        borderRadius: '16px',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid rgba(99, 102, 241, 0.15)',
          background: 'rgba(15, 23, 42, 0.5)',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#e2e8f0' }}>최근 활동</h2>
          <Link href="/audit" style={{
            color: '#a5b4fc',
            textDecoration: 'none',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            전체 보기 →
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(99, 102, 241, 0.1)' }}>
                <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>시간</th>
                <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>사용자</th>
                <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>연결</th>
                <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>쿼리</th>
                <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(stats?.recentActivity) && stats.recentActivity.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(99, 102, 241, 0.05)' }}>
                  <td style={{ padding: '14px 24px', fontSize: '14px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {new Date(log.executedAt).toLocaleTimeString('ko-KR')}
                  </td>
                  <td style={{ padding: '14px 24px', fontSize: '14px', color: '#e2e8f0', fontWeight: 500 }}>
                    {log.executedBy}
                  </td>
                  <td style={{ padding: '14px 24px' }}>
                    <span style={{
                      padding: '4px 10px',
                      background: 'rgba(99, 102, 241, 0.15)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#a5b4fc',
                    }}>
                      {log.connectionName}
                    </span>
                  </td>
                  <td style={{ padding: '14px 24px', fontSize: '13px', color: '#94a3b8', fontFamily: 'monospace', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.query}
                  </td>
                  <td style={{ padding: '14px 24px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 500,
                      background: log.status === 'SUCCESS' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: log.status === 'SUCCESS' ? '#10b981' : '#ef4444',
                    }}>
                      {log.status === 'SUCCESS' ? '✓ 성공' : '✗ 실패'}
                    </span>
                  </td>
                </tr>
              ))}
              {(!stats?.recentActivity || stats.recentActivity.length === 0) && (
                <tr>
                  <td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
                    최근 활동이 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginTop: '32px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#e2e8f0', marginBottom: '16px' }}>빠른 작업</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {[
            { name: 'DB 연결 추가', icon: '🔗', path: '/connections/create', desc: '새 데이터베이스 연결' },
            { name: 'SQL 에디터', icon: '⚡', path: '/editor', desc: '쿼리 작성 및 실행' },
            { name: '스키마 탐색', icon: '🗂️', path: '/schemas', desc: '테이블 구조 분석' },
            { name: 'API Gateway', icon: '🌐', path: '/api-builder', desc: 'REST API 생성' },
          ].map((action) => (
            <Link key={action.path} href={action.path} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px',
              background: 'rgba(30, 27, 75, 0.4)',
              borderRadius: '12px',
              border: '1px solid rgba(99, 102, 241, 0.15)',
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}>
              <span style={{ fontSize: '24px' }}>{action.icon}</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#e2e8f0' }}>{action.name}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{action.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
