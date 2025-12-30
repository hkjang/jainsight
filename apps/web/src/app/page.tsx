'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QueryTooltip, CurrentTime, DurationBadge } from '../components/DashboardUtils';

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

// Animated number component
const AnimatedNumber = ({ value, duration = 1000 }: { value: number; duration?: number }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setDisplayValue(0);
      return;
    }
    
    const startTime = Date.now();
    const startValue = displayValue;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out-cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(startValue + (value - startValue) * eased);
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <>{displayValue.toLocaleString()}</>;
};

// Mini sparkline component
const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - (v / max) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="80" height="24" viewBox="0 0 100 100" style={{ opacity: 0.7 }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// Progress bar for success rate
const SuccessRateBar = ({ success, total }: { success: number; total: number }) => {
  const rate = total > 0 ? (success / total) * 100 : 0;
  const color = rate >= 80 ? '#10b981' : rate >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ marginTop: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>성공률</span>
        <span style={{ fontSize: '12px', fontWeight: 600, color }}>{rate.toFixed(1)}%</span>
      </div>
      <div style={{
        height: '6px',
        background: 'rgba(99, 102, 241, 0.1)',
        borderRadius: '3px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${rate}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${color}, ${color}90)`,
          borderRadius: '3px',
          transition: 'width 1s ease-out',
        }} />
      </div>
    </div>
  );
};

// Relative time formatting
const getRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  return `${diffDays}일 전`;
};

// Get greeting based on time
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 6) return '늦은 밤이에요 🌙';
  if (hour < 12) return '좋은 아침이에요 ☀️';
  if (hour < 18) return '좋은 오후예요 🌤️';
  return '좋은 저녁이에요 🌆';
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const router = useRouter();

  // Mock sparkline data (in real app, this would come from API)
  const [trendData] = useState(() => 
    Array.from({ length: 7 }, () => Math.floor(Math.random() * 50) + 10)
  );

  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Get username from token
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserName(payload.username || 'User');
      } catch (e) {
        console.error('Invalid token');
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

  const handleCopyQuery = useCallback((id: string, query: string) => {
    navigator.clipboard.writeText(query);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const StatCard = ({ 
    title, 
    value, 
    icon, 
    bgColor, 
    index,
    sparkline,
    extra 
  }: { 
    title: string; 
    value: number; 
    icon: string; 
    bgColor: string;
    index: number;
    sparkline?: number[];
    extra?: React.ReactNode;
  }) => {
    const isHovered = hoveredCard === index;
    
    return (
      <div 
        style={{
          padding: '24px',
          background: isHovered 
            ? 'rgba(40, 37, 90, 0.7)' 
            : 'rgba(30, 27, 75, 0.5)',
          borderRadius: '16px',
          border: isHovered 
            ? '1px solid rgba(99, 102, 241, 0.4)' 
            : '1px solid rgba(99, 102, 241, 0.2)',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
          boxShadow: isHovered 
            ? '0 20px 40px rgba(99, 102, 241, 0.15), 0 0 30px rgba(99, 102, 241, 0.1)' 
            : 'none',
          cursor: 'default',
          animation: 'fadeSlideUp 0.5s ease-out forwards',
          animationDelay: `${index * 0.1}s`,
          opacity: 0,
        }}
        onMouseEnter={() => setHoveredCard(index)}
        onMouseLeave={() => setHoveredCard(null)}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>{title}</p>
            <p style={{ fontSize: '32px', fontWeight: 700, color: '#e2e8f0' }}>
              <AnimatedNumber value={value} />
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: bgColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              transition: 'transform 0.3s ease',
              transform: isHovered ? 'scale(1.1) rotate(5deg)' : 'scale(1)',
            }}>
              {icon}
            </div>
            {sparkline && <Sparkline data={sparkline} color="#6366f1" />}
          </div>
        </div>
        {extra}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Skeleton Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ 
            width: '300px', 
            height: '36px', 
            background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.2), rgba(99, 102, 241, 0.1))',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            borderRadius: '8px',
            marginBottom: '12px',
          }} />
          <div style={{ 
            width: '200px', 
            height: '20px', 
            background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.2), rgba(99, 102, 241, 0.1))',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            borderRadius: '4px',
          }} />
        </div>
        
        {/* Skeleton Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              height: '140px',
              background: 'linear-gradient(90deg, rgba(30, 27, 75, 0.5), rgba(49, 46, 129, 0.3), rgba(30, 27, 75, 0.5))',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite',
              animationDelay: `${i * 0.2}s`,
              borderRadius: '16px',
            }} />
          ))}
        </div>

        {/* Skeleton Table */}
        <div style={{
          background: 'rgba(30, 27, 75, 0.5)',
          borderRadius: '16px',
          padding: '20px',
        }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{
              height: '48px',
              background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.05))',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite',
              animationDelay: `${i * 0.1}s`,
              borderRadius: '8px',
              marginBottom: i < 4 ? '8px' : 0,
            }} />
          ))}
        </div>

        <style>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    );
  }

  const successCount = (stats?.queriesCount || 0) - (stats?.failedQueriesCount || 0);

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Welcome Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        marginBottom: '32px',
        animation: 'fadeSlideUp 0.5s ease-out forwards',
      }}>
        <div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 700,
            background: 'linear-gradient(90deg, #e0e7ff, #c7d2fe)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '8px',
          }}>
            {getGreeting()}, {userName}!
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Enterprise DB Hub 현황을 한눈에 확인하세요
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              background: 'rgba(16, 185, 129, 0.15)',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#10b981',
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#10b981',
                animation: 'pulse 2s infinite',
              }} />
              시스템 정상
            </span>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CurrentTime />
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
            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
            transition: 'all 0.3s ease',
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
            transition: 'all 0.3s ease',
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
          bgColor="rgba(99, 102, 241, 0.2)"
          index={0}
        />
        <StatCard
          title="실행된 쿼리"
          value={stats?.queriesCount || 0}
          icon="📊"
          bgColor="rgba(139, 92, 246, 0.2)"
          index={1}
          sparkline={trendData}
          extra={
            <SuccessRateBar 
              success={successCount} 
              total={stats?.queriesCount || 0} 
            />
          }
        />
        <StatCard
          title="실패한 쿼리"
          value={stats?.failedQueriesCount || 0}
          icon="⚠️"
          bgColor="rgba(239, 68, 68, 0.2)"
          index={2}
        />
      </div>

      {/* Recent Activity */}
      <div style={{
        background: 'rgba(30, 27, 75, 0.5)',
        borderRadius: '16px',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        overflow: 'hidden',
        animation: 'fadeSlideUp 0.5s ease-out forwards',
        animationDelay: '0.3s',
        opacity: 0,
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
            transition: 'color 0.2s',
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
                <th style={{ padding: '14px 24px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>액션</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(stats?.recentActivity) && stats.recentActivity.map((log) => (
                <tr 
                  key={log.id} 
                  style={{ 
                    borderBottom: '1px solid rgba(99, 102, 241, 0.05)',
                    transition: 'background 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <td style={{ padding: '14px 24px', fontSize: '14px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    <span title={new Date(log.executedAt).toLocaleString('ko-KR')}>
                      {getRelativeTime(log.executedAt)}
                    </span>
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
                    <QueryTooltip query={log.query}>
                      <span style={{ cursor: 'help' }}>{log.query}</span>
                    </QueryTooltip>
                  </td>
                  <td style={{ padding: '14px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                      {log.durationMs && <DurationBadge ms={log.durationMs} />}
                    </div>
                  </td>
                  <td style={{ padding: '14px 24px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleCopyQuery(log.id, log.query)}
                      title="쿼리 복사"
                      style={{
                        padding: '6px 10px',
                        background: copiedId === log.id ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.1)',
                        border: 'none',
                        borderRadius: '6px',
                        color: copiedId === log.id ? '#10b981' : '#a5b4fc',
                        cursor: 'pointer',
                        fontSize: '12px',
                        transition: 'all 0.2s',
                      }}
                    >
                      {copiedId === log.id ? '✓ 복사됨' : '📋 복사'}
                    </button>
                  </td>
                </tr>
              ))}
              {(!stats?.recentActivity || stats.recentActivity.length === 0) && (
                <tr>
                  <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}>📭</div>
                    <div style={{ fontSize: '16px', marginBottom: '8px' }}>최근 활동이 없습니다</div>
                    <div style={{ fontSize: '14px', color: '#475569' }}>SQL 에디터에서 첫 쿼리를 실행해보세요</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginTop: '32px', animation: 'fadeSlideUp 0.5s ease-out forwards', animationDelay: '0.4s', opacity: 0 }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#e2e8f0', marginBottom: '16px' }}>빠른 작업</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {[
            { name: 'DB 연결 추가', icon: '🔗', path: '/connections/create', desc: '새 데이터베이스 연결', shortcut: 'N' },
            { name: 'SQL 에디터', icon: '⚡', path: '/editor', desc: '쿼리 작성 및 실행', shortcut: 'E' },
            { name: '스키마 탐색', icon: '🗂️', path: '/schemas', desc: '테이블 구조 분석', shortcut: 'S' },
            { name: 'API Gateway', icon: '🌐', path: '/api-builder', desc: 'REST API 생성', shortcut: 'A' },
          ].map((action, index) => (
            <Link 
              key={action.path} 
              href={action.path} 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                background: 'rgba(30, 27, 75, 0.4)',
                borderRadius: '12px',
                border: '1px solid rgba(99, 102, 241, 0.15)',
                textDecoration: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                const target = e.currentTarget;
                target.style.background = 'rgba(40, 37, 90, 0.6)';
                target.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                target.style.transform = 'translateY(-2px)';
                target.style.boxShadow = '0 10px 30px rgba(99, 102, 241, 0.15)';
                const icon = target.querySelector('.action-icon') as HTMLElement;
                if (icon) icon.style.transform = 'scale(1.2) rotate(10deg)';
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget;
                target.style.background = 'rgba(30, 27, 75, 0.4)';
                target.style.borderColor = 'rgba(99, 102, 241, 0.15)';
                target.style.transform = 'translateY(0)';
                target.style.boxShadow = 'none';
                const icon = target.querySelector('.action-icon') as HTMLElement;
                if (icon) icon.style.transform = 'scale(1)';
              }}
            >
              <span 
                className="action-icon"
                style={{ 
                  fontSize: '24px',
                  transition: 'transform 0.3s ease',
                }}
              >
                {action.icon}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#e2e8f0' }}>{action.name}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{action.desc}</div>
              </div>
              <kbd style={{
                padding: '4px 8px',
                background: 'rgba(99, 102, 241, 0.1)',
                borderRadius: '4px',
                fontSize: '11px',
                color: '#64748b',
                border: '1px solid rgba(99, 102, 241, 0.2)',
              }}>
                {action.shortcut}
              </kbd>
            </Link>
          ))}
        </div>
      </div>

      {/* Global Styles */}
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
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.9);
          }
        }
        
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        
        a:hover {
          filter: brightness(1.05);
        }
        
        button:hover:not(:disabled) {
          filter: brightness(1.1);
        }
      `}</style>
    </div>
  );
}
