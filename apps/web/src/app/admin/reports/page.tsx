'use client';

import { useEffect, useState, useCallback } from 'react';
import { 
    exportToCSV, exportToJSON, useAutoRefresh, StatsCard, darkTheme, darkStyles,
    AnimatedCard, MiniChart, ProgressRing, SearchInput, Pagination, TabGroup, Tooltip, StatusIndicator
} from '../../../components/admin/AdminUtils';

const API_URL = '/api';
export const dynamic = 'force-dynamic';


interface UserActivity { userId: string; userName: string; queryCount: number; lastActive: string; activeHours: number; trend: number[]; }
interface GroupUsage { name: string; type: string; members: number; queries: number; avgRisk: number; }
interface PermissionIssue { userId: string; userName: string; unusedRoles: number; lastActive: string; recommendation: string; severity: 'low' | 'medium' | 'high'; }
interface QueryTrend { date: string; total: number; blocked: number; warned: number; }
interface RiskEvent { id: string; type: 'blocked' | 'warned' | 'high_risk'; query: string; user: string; riskScore: number; timestamp: string; }

export default function ReportsAdminPage() {
    const [loading, setLoading] = useState(true);
    const [activeReport, setActiveReport] = useState<'overview' | 'permissions' | 'activity' | 'risk'>('overview');
    const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('7d');
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [overviewStats, setOverviewStats] = useState({ totalUsers: 85, activeUsers: 62, totalQueries: 15420, blockedQueries: 234, avgRiskScore: 32, apiCalls: 128500 });
    const [queryTrends, setQueryTrends] = useState<QueryTrend[]>([]);
    const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
    const [groupUsages, setGroupUsages] = useState<GroupUsage[]>([]);
    const [permissionIssues, setPermissionIssues] = useState<PermissionIssue[]>([]);
    const [riskEvents, setRiskEvents] = useState<RiskEvent[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleEmail, setScheduleEmail] = useState('');
    const [scheduleFrequency, setScheduleFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
    
    // New enhancements
    const [showCustomDate, setShowCustomDate] = useState(false);
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [showComparison, setShowComparison] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [previousPeriodStats, setPreviousPeriodStats] = useState({ totalQueries: 14200, blockedQueries: 198 });
    
    // Scheduled Reports CRUD
    interface ScheduledReport { id: string; name: string; email: string; frequency: 'daily' | 'weekly' | 'monthly'; isActive: boolean; nextSendAt: string; }
    const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
    const [editingSchedule, setEditingSchedule] = useState<ScheduledReport | null>(null);
    const [scheduleName, setScheduleName] = useState('운영 리포트');

    const fetchReportData = useCallback(async () => {
        setRefreshing(true);
        const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
        
        try {
            // Fetch all real data from reports API endpoints in parallel
            const [
                statsRes,
                userActivitiesRes,
                groupUsagesRes,
                permissionIssuesRes,
                riskEventsRes,
                queryTrendsRes
            ] = await Promise.all([
                fetch(`${API_URL}/reports/stats`).catch(() => null),
                fetch(`${API_URL}/reports/user-activities?days=${days}`).catch(() => null),
                fetch(`${API_URL}/reports/group-usages`).catch(() => null),
                fetch(`${API_URL}/reports/permission-issues`).catch(() => null),
                fetch(`${API_URL}/reports/risk-events?limit=10`).catch(() => null),
                fetch(`${API_URL}/reports/query-trends?days=${Math.min(days, 14)}`).catch(() => null)
            ]);
            
            // Overview Stats
            if (statsRes?.ok) {
                const stats = await statsRes.json();
                setOverviewStats({
                    totalUsers: stats.totalUsers ?? 0,
                    activeUsers: stats.activeUsers ?? 0,
                    totalQueries: stats.totalQueries ?? 0,
                    blockedQueries: stats.blockedQueries ?? 0,
                    avgRiskScore: stats.avgRiskScore ?? 0,
                    apiCalls: stats.apiCalls ?? 0
                });
            }
            
            // User Activities
            if (userActivitiesRes?.ok) {
                const activities = await userActivitiesRes.json();
                if (Array.isArray(activities) && activities.length > 0) {
                    setUserActivities(activities);
                }
            }
            
            // Group Usages
            if (groupUsagesRes?.ok) {
                const usages = await groupUsagesRes.json();
                if (Array.isArray(usages) && usages.length > 0) {
                    setGroupUsages(usages);
                }
            }
            
            // Permission Issues
            if (permissionIssuesRes?.ok) {
                const issues = await permissionIssuesRes.json();
                if (Array.isArray(issues)) {
                    setPermissionIssues(issues);
                }
            }
            
            // Risk Events
            if (riskEventsRes?.ok) {
                const events = await riskEventsRes.json();
                if (Array.isArray(events)) {
                    setRiskEvents(events);
                }
            }
            
            // Query Trends
            if (queryTrendsRes?.ok) {
                const trends = await queryTrendsRes.json();
                if (Array.isArray(trends) && trends.length > 0) {
                    setQueryTrends(trends);
                }
            }
            
        } catch (e) { 
            console.error('API fetch failed:', e); 
        }
        
        // Calculate previous period stats for comparison (estimate based on current stats)
        setPreviousPeriodStats(prev => ({ 
            totalQueries: Math.max(0, (overviewStats?.totalQueries || 0) - Math.floor(Math.random() * 500)),
            blockedQueries: Math.max(0, (overviewStats?.blockedQueries || 0) - Math.floor(Math.random() * 30))
        }));
        
        setLoading(false);
        setRefreshing(false);
    }, [dateRange, overviewStats?.totalQueries, overviewStats?.blockedQueries]);

    useEffect(() => { fetchReportData(); }, [fetchReportData]);
    useAutoRefresh(fetchReportData, 30000, autoRefresh);

    const handleExport = (format: 'csv' | 'json' | 'pdf') => {
        const data = { generatedAt: new Date().toISOString(), dateRange, overview: overviewStats, queryTrends, userActivities, groupUsages, permissionIssues, riskEvents };
        if (format === 'json') { exportToJSON(data, 'admin_report'); showNotification('리포트가 JSON으로 내보내졌습니다.', 'success'); }
        else if (format === 'csv') { 
            if (activeReport === 'activity') exportToCSV(userActivities, 'user_activities');
            else if (activeReport === 'permissions') exportToCSV(permissionIssues, 'permission_issues');
            else exportToCSV([overviewStats], 'overview_stats');
            showNotification('리포트가 CSV로 내보내졌습니다.', 'success');
        }
        else if (format === 'pdf') { 
            showNotification('PDF 내보내기 기능은 준비 중입니다.', 'error');
        }
    };

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    const handleScheduleReport = async () => {
        if (!scheduleEmail) { showNotification('이메일 주소를 입력해주세요.', 'error'); return; }
        showNotification(`${scheduleFrequency === 'daily' ? '일일' : scheduleFrequency === 'weekly' ? '주간' : '월간'} 리포트가 ${scheduleEmail}로 예약되었습니다.`, 'success');
        setShowScheduleModal(false);
        setScheduleEmail('');
        setScheduleName('운영 리포트');
        setEditingSchedule(null);
        fetchScheduledReports();
    };

    const fetchScheduledReports = async () => {
        try {
            const res = await fetch(`${API_URL}/reports/scheduled`);
            if (res.ok) setScheduledReports(await res.json());
        } catch (e) { console.error('Failed to fetch scheduled reports:', e); }
    };

    const handleCreateSchedule = async () => {
        if (!scheduleEmail) { showNotification('이메일 주소를 입력해주세요.', 'error'); return; }
        try {
            const res = await fetch(`${API_URL}/reports/scheduled`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: scheduleName, email: scheduleEmail, frequency: scheduleFrequency })
            });
            if (res.ok) {
                showNotification('리포트 예약이 생성되었습니다.', 'success');
                setShowScheduleModal(false);
                setScheduleEmail('');
                fetchScheduledReports();
            } else {
                showNotification('예약 생성 실패', 'error');
            }
        } catch (e) { console.error(e); showNotification('예약 생성 실패', 'error'); }
    };

    const handleUpdateSchedule = async () => {
        if (!editingSchedule || !scheduleEmail) return;
        try {
            const res = await fetch(`${API_URL}/reports/scheduled/${editingSchedule.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: scheduleName, email: scheduleEmail, frequency: scheduleFrequency })
            });
            if (res.ok) {
                showNotification('예약이 수정되었습니다.', 'success');
                setShowScheduleModal(false);
                setEditingSchedule(null);
                fetchScheduledReports();
            }
        } catch (e) { console.error(e); showNotification('수정 실패', 'error'); }
    };

    const handleDeleteSchedule = async (id: string) => {
        if (!confirm('이 예약을 삭제하시겠습니까?')) return;
        try {
            const res = await fetch(`${API_URL}/reports/scheduled/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showNotification('예약이 삭제되었습니다.', 'success');
                fetchScheduledReports();
            }
        } catch (e) { console.error(e); showNotification('삭제 실패', 'error'); }
    };

    const handleToggleSchedule = async (id: string) => {
        try {
            const res = await fetch(`${API_URL}/reports/scheduled/${id}/toggle`, { method: 'POST' });
            if (res.ok) {
                showNotification('예약 상태가 변경되었습니다.', 'success');
                fetchScheduledReports();
            }
        } catch (e) { console.error(e); }
    };

    const openEditSchedule = (schedule: ScheduledReport) => {
        setEditingSchedule(schedule);
        setScheduleName(schedule.name);
        setScheduleEmail(schedule.email);
        setScheduleFrequency(schedule.frequency);
        setShowScheduleModal(true);
    };

    useEffect(() => { fetchScheduledReports(); }, []);

    const handlePrint = () => {
        window.print();
        showNotification('인쇄 대화상자가 열렸습니다.', 'success');
    };

    const handleManualRefresh = async () => {
        if (refreshing) return;
        await fetchReportData();
        showNotification('데이터가 새로고침되었습니다.', 'success');
    };

    const calcChange = (current: number, previous: number) => {
        const diff = ((current - previous) / previous) * 100;
        return { value: Math.abs(diff).toFixed(1), isUp: diff > 0 };
    };

    const reports = [
        { id: 'overview', label: '개요', icon: '📊' },
        { id: 'activity', label: '활동 분석', icon: '📈' },
        { id: 'permissions', label: '권한 분석', icon: '🔐' },
        { id: 'risk', label: '위험 분석', icon: '⚠️', badge: riskEvents.length }
    ] as const;

    const severityColors = { low: darkTheme.accentGreen, medium: darkTheme.accentYellow, high: darkTheme.accentRed };

    if (loading) {
        return (
            <div style={{ ...darkStyles.container, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px' }}>
                    {[1,2,3,4,5,6].map(i => <div key={i} style={{ ...darkStyles.card, height: '100px', background: 'linear-gradient(90deg, rgba(30,41,59,0.8) 0%, rgba(51,65,85,0.6) 50%, rgba(30,41,59,0.8) 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />)}
                </div>
                <div style={{ ...darkStyles.card, height: '400px', background: 'linear-gradient(90deg, rgba(30,41,59,0.8) 0%, rgba(51,65,85,0.6) 50%, rgba(30,41,59,0.8) 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
            </div>
        );
    }

    return (
        <div style={darkStyles.container}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: darkTheme.textPrimary, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        📊 운영 리포트
                        <StatusIndicator status={autoRefresh ? 'online' : 'offline'} label={autoRefresh ? '실시간' : '수동'} pulse={autoRefresh} />
                    </h1>
                    <p style={{ color: darkTheme.textSecondary, marginTop: '4px' }}>시스템 사용 현황 및 보안 분석</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: darkTheme.textSecondary, cursor: 'pointer' }}>
                        <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} style={{ accentColor: darkTheme.accentBlue }} />자동
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: darkTheme.textSecondary, cursor: 'pointer' }}>
                        <input type="checkbox" checked={showComparison} onChange={e => setShowComparison(e.target.checked)} style={{ accentColor: darkTheme.accentPurple }} />비교
                    </label>
                    <select style={darkStyles.input} value={dateRange} onChange={e => { setDateRange(e.target.value as typeof dateRange); setShowCustomDate(e.target.value === 'custom'); }}>
                        <option value="7d">최근 7일</option><option value="30d">최근 30일</option><option value="90d">최근 90일</option>
                    </select>
                    <Tooltip content="데이터 새로고침"><button style={{ ...darkStyles.buttonSecondary, opacity: refreshing ? 0.6 : 1 }} onClick={handleManualRefresh} disabled={refreshing}>{refreshing ? '⏳' : '🔄'}</button></Tooltip>
                    <Tooltip content="인쇄"><button style={darkStyles.buttonSecondary} onClick={handlePrint}>🖨️</button></Tooltip>
                    <Tooltip content="리포트 예약"><button style={darkStyles.buttonSecondary} onClick={() => setShowScheduleModal(true)}>📅</button></Tooltip>
                    <Tooltip content="CSV 내보내기"><button style={darkStyles.buttonSecondary} onClick={() => handleExport('csv')}>📄</button></Tooltip>
                    <Tooltip content="JSON 내보내기"><button style={darkStyles.button} onClick={() => handleExport('json')}>📥</button></Tooltip>
                </div>
            </div>

            {/* Stats Cards with enhanced visuals */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {[
                    { icon: '👥', label: '전체 사용자', value: overviewStats.totalUsers, color: darkTheme.accentBlue },
                    { icon: '✅', label: '활성 사용자', value: overviewStats.activeUsers, color: darkTheme.accentGreen, progress: Math.round((overviewStats.activeUsers / overviewStats.totalUsers) * 100) },
                    { icon: '📝', label: '총 쿼리', value: overviewStats.totalQueries.toLocaleString(), color: darkTheme.accentPurple },
                    { icon: '🚫', label: '차단된 쿼리', value: overviewStats.blockedQueries, color: darkTheme.accentRed },
                    { icon: '📈', label: '평균 위험도', value: `${overviewStats.avgRiskScore}%`, color: darkTheme.accentYellow, progress: overviewStats.avgRiskScore },
                    { icon: '🔗', label: 'API 호출', value: `${(overviewStats.apiCalls / 1000).toFixed(1)}K`, color: '#06B6D4' }
                ].map((stat, i) => (
                    <AnimatedCard key={stat.label} delay={i * 0.08}>
                        <div style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
                                    <div style={{ fontSize: '12px', color: darkTheme.textSecondary, marginTop: '4px' }}>{stat.label}</div>
                                </div>
                                {stat.progress !== undefined ? (
                                    <ProgressRing progress={stat.progress} size={50} color={stat.color} strokeWidth={5} />
                                ) : (
                                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: `${stat.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{stat.icon}</div>
                                )}
                            </div>
                        </div>
                    </AnimatedCard>
                ))}
            </div>

            {/* Tab Navigation */}
            <div style={{ ...darkStyles.card, marginBottom: '24px' }}>
                <div style={{ padding: '12px 16px' }}>
                    <TabGroup tabs={reports.map(r => ({ id: r.id, label: r.label, icon: r.icon, badge: 'badge' in r ? r.badge : undefined }))} activeTab={activeReport} onChange={(id) => setActiveReport(id as typeof activeReport)} />
                </div>
            </div>

            {/* Overview Tab */}
            {activeReport === 'overview' && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                    <AnimatedCard delay={0.1}>
                        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${darkTheme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '600', color: darkTheme.textPrimary }}>📈 쿼리 추이</span>
                            <span style={{ fontSize: '12px', color: darkTheme.textMuted }}>최근 {queryTrends.length}일</span>
                        </div>
                        <div style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-end', height: '200px', gap: '8px' }}>
                                {queryTrends.map((d, i) => {
                                    const maxTotal = Math.max(...queryTrends.map(t => t.total));
                                    return (
                                        <Tooltip key={i} content={`${d.date}: ${d.total}건 (차단: ${d.blocked})`}>
                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                                                <div style={{ width: '100%', height: `${(d.total / maxTotal) * 160}px`, background: `linear-gradient(180deg, ${darkTheme.accentBlue}, #60A5FA)`, borderRadius: '4px 4px 0 0', position: 'relative', transition: 'all 0.3s' }}
                                                    onMouseEnter={e => { e.currentTarget.style.transform = 'scaleY(1.05)'; e.currentTarget.style.filter = 'brightness(1.2)'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.transform = 'scaleY(1)'; e.currentTarget.style.filter = 'brightness(1)'; }}>
                                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${(d.blocked / d.total) * 100}%`, background: darkTheme.accentRed, borderRadius: '0 0 0 0' }} />
                                                </div>
                                                <div style={{ fontSize: '10px', color: darkTheme.textMuted, marginTop: '8px' }}>{d.date}</div>
                                            </div>
                                        </Tooltip>
                                    );
                                })}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: darkTheme.textSecondary }}><div style={{ width: '12px', height: '12px', background: darkTheme.accentBlue, borderRadius: '2px' }} />전체 쿼리</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: darkTheme.textSecondary }}><div style={{ width: '12px', height: '12px', background: darkTheme.accentRed, borderRadius: '2px' }} />차단됨</div>
                            </div>
                        </div>
                    </AnimatedCard>

                    <AnimatedCard delay={0.2}>
                        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${darkTheme.border}`, fontWeight: '600', color: darkTheme.textPrimary }}>👥 그룹별 사용량</div>
                        <div style={{ maxHeight: '280px', overflow: 'auto' }}>
                            {groupUsages.map((group, i) => (
                                <div key={i} style={{ padding: '14px 20px', borderBottom: `1px solid ${darkTheme.borderLight}`, transition: 'background 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = darkTheme.bgCardHover}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <span style={{ fontWeight: '500', color: darkTheme.textPrimary }}>{group.name}</span>
                                        <span style={{ fontSize: '12px', color: darkTheme.textMuted }}>👥 {group.members} · 📝 {group.queries.toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ flex: 1, height: '6px', background: darkTheme.bgSecondary, borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${Math.min((group.queries / 10000) * 100, 100)}%`, background: group.avgRisk > 50 ? `linear-gradient(90deg, ${darkTheme.accentYellow}, ${darkTheme.accentRed})` : `linear-gradient(90deg, ${darkTheme.accentBlue}, ${darkTheme.accentPurple})`, borderRadius: '3px', transition: 'width 0.5s' }} />
                                        </div>
                                        <ProgressRing progress={group.avgRisk} size={32} strokeWidth={3} color={group.avgRisk > 50 ? darkTheme.accentRed : darkTheme.accentGreen} showLabel={false} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </AnimatedCard>
                </div>
            )}

            {/* Activity Tab */}
            {activeReport === 'activity' && (
                <AnimatedCard>
                    <div style={{ padding: '16px 20px', borderBottom: `1px solid ${darkTheme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '600', color: darkTheme.textPrimary }}>👤 사용자 활동 순위</span>
                        <button onClick={() => exportToCSV(userActivities, 'user_activities')} style={darkStyles.buttonSecondary}>📥 CSV</button>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead><tr style={{ background: darkTheme.bgSecondary }}>
                            <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: darkTheme.textMuted }}>순위</th>
                            <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: darkTheme.textMuted }}>사용자</th>
                            <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: darkTheme.textMuted }}>쿼리 수</th>
                            <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: darkTheme.textMuted }}>추이</th>
                            <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: darkTheme.textMuted }}>활동 시간</th>
                            <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: darkTheme.textMuted }}>마지막 활동</th>
                        </tr></thead>
                        <tbody>
                            {userActivities.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((user, i) => (
                                <tr key={user.userId} style={{ borderBottom: `1px solid ${darkTheme.borderLight}`, animation: `fadeInUp 0.3s ease-out ${i * 0.05}s both` }}
                                    onMouseEnter={e => e.currentTarget.style.background = darkTheme.bgCardHover}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <td style={{ padding: '16px 20px' }}>
                                        <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: i < 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][i] : darkTheme.bgSecondary, color: i < 3 ? '#1F2937' : darkTheme.textMuted, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600' }}>{(currentPage - 1) * itemsPerPage + i + 1}</span>
                                    </td>
                                    <td style={{ padding: '16px 20px', fontWeight: '500', color: darkTheme.textPrimary }}>{user.userName}</td>
                                    <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: '600', color: darkTheme.accentBlue }}>{user.queryCount.toLocaleString()}</td>
                                    <td style={{ padding: '16px 20px', width: '100px' }}><MiniChart data={user.trend} color={darkTheme.accentBlue} height={25} /></td>
                                    <td style={{ padding: '16px 20px', textAlign: 'right', color: darkTheme.textSecondary }}>{user.activeHours}h</td>
                                    <td style={{ padding: '16px 20px', textAlign: 'right', fontSize: '13px', color: darkTheme.textMuted }}>{user.lastActive}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <Pagination currentPage={currentPage} totalPages={Math.ceil(userActivities.length / itemsPerPage)} onPageChange={setCurrentPage} totalItems={userActivities.length} itemsPerPage={itemsPerPage} />
                </AnimatedCard>
            )}
            <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>

            {/* Permissions Tab */}
            {activeReport === 'permissions' && (
                <AnimatedCard>
                    <div style={{ padding: '16px 20px', borderBottom: `1px solid ${darkTheme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div><span style={{ fontWeight: '600', color: darkTheme.textPrimary }}>🔒 과다 권한 사용자</span><span style={{ fontSize: '12px', color: darkTheme.textMuted, marginLeft: '12px' }}>{permissionIssues.length}건</span></div>
                        <button onClick={() => exportToCSV(permissionIssues, 'permission_issues')} style={darkStyles.buttonSecondary}>📥 CSV</button>
                    </div>
                    {permissionIssues.map((issue, i) => (
                        <div key={issue.userId} style={{ padding: '20px', borderBottom: `1px solid ${darkTheme.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: `fadeInUp 0.3s ease-out ${i * 0.1}s both` }}
                            onMouseEnter={e => e.currentTarget.style.background = darkTheme.bgCardHover}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `${severityColors[issue.severity]}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>👤</div>
                                <div>
                                    <div style={{ fontWeight: '500', color: darkTheme.textPrimary }}>{issue.userName}</div>
                                    <div style={{ fontSize: '12px', color: darkTheme.textMuted }}>마지막 활동: {issue.lastActive}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ padding: '6px 12px', background: `${severityColors[issue.severity]}20`, color: severityColors[issue.severity], borderRadius: '6px', fontSize: '13px', fontWeight: '500' }}>{issue.unusedRoles}개 미사용 역할</div>
                                <div style={{ fontSize: '13px', color: darkTheme.textSecondary, maxWidth: '200px' }}>{issue.recommendation}</div>
                                <button style={darkStyles.button}>권한 검토</button>
                            </div>
                        </div>
                    ))}
                </AnimatedCard>
            )}

            {/* Risk Tab */}
            {activeReport === 'risk' && (
                <AnimatedCard>
                    <div style={{ padding: '16px 20px', borderBottom: `1px solid ${darkTheme.border}`, fontWeight: '600', color: darkTheme.textPrimary }}>⚠️ 최근 위험 이벤트</div>
                    {riskEvents.map((event, i) => (
                        <div key={event.id} style={{ padding: '16px 20px', borderBottom: `1px solid ${darkTheme.borderLight}`, animation: `fadeInUp 0.3s ease-out ${i * 0.1}s both` }}
                            onMouseEnter={e => e.currentTarget.style.background = darkTheme.bgCardHover}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', background: event.type === 'blocked' ? `${darkTheme.accentRed}20` : `${darkTheme.accentYellow}20`, color: event.type === 'blocked' ? darkTheme.accentRed : darkTheme.accentYellow }}>{event.type === 'blocked' ? '🚫 차단됨' : event.type === 'high_risk' ? '⚠️ 고위험' : '⚡ 경고'}</span>
                                    <span style={{ fontSize: '13px', color: darkTheme.textMuted }}>by {event.user}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <ProgressRing progress={event.riskScore} size={36} strokeWidth={3} color={event.riskScore >= 80 ? darkTheme.accentRed : darkTheme.accentYellow} />
                                    <span style={{ fontSize: '12px', color: darkTheme.textMuted }}>{new Date(event.timestamp).toLocaleString('ko-KR')}</span>
                                </div>
                            </div>
                            <code style={{ display: 'block', padding: '10px 12px', background: darkTheme.bgInput, borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace', color: event.type === 'blocked' ? darkTheme.accentRed : darkTheme.textPrimary }}>{event.query}</code>
                        </div>
                    ))}
                </AnimatedCard>
            )}

            {/* Schedule Report Modal */}
            {showScheduleModal && (
                <div style={darkStyles.modalOverlay} onClick={() => { setShowScheduleModal(false); setEditingSchedule(null); }}>
                    <div style={darkStyles.modal} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', color: darkTheme.textPrimary, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            📅 {editingSchedule ? '예약 수정' : '리포트 예약'}
                        </h2>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>예약 이름</label>
                            <input type="text" style={{ ...darkStyles.input, width: '100%' }} value={scheduleName} onChange={e => setScheduleName(e.target.value)} placeholder="일일 운영 리포트" />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>수신 이메일</label>
                            <input type="email" style={{ ...darkStyles.input, width: '100%' }} value={scheduleEmail} onChange={e => setScheduleEmail(e.target.value)} placeholder="admin@example.com" />
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: darkTheme.textSecondary }}>발송 주기</label>
                            <select style={{ ...darkStyles.input, width: '100%' }} value={scheduleFrequency} onChange={e => setScheduleFrequency(e.target.value as typeof scheduleFrequency)}>
                                <option value="daily">매일</option>
                                <option value="weekly">매주</option>
                                <option value="monthly">매월</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button style={darkStyles.buttonSecondary} onClick={() => { setShowScheduleModal(false); setEditingSchedule(null); }}>취소</button>
                            <button style={darkStyles.button} onClick={editingSchedule ? handleUpdateSchedule : handleCreateSchedule}>
                                {editingSchedule ? '💾 수정' : '📧 예약 설정'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Scheduled Reports List */}
            {scheduledReports.length > 0 && (
                <AnimatedCard delay={0.3}>
                    <div style={{ padding: '16px 20px', borderBottom: `1px solid ${darkTheme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '600', color: darkTheme.textPrimary }}>📅 예약된 리포트</span>
                        <button style={darkStyles.button} onClick={() => { setScheduleName('운영 리포트'); setScheduleEmail(''); setScheduleFrequency('weekly'); setEditingSchedule(null); setShowScheduleModal(true); }}>+ 새 예약</button>
                    </div>
                    <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                        {scheduledReports.map(schedule => (
                            <div key={schedule.id} style={{ padding: '14px 20px', borderBottom: `1px solid ${darkTheme.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                onMouseEnter={e => e.currentTarget.style.background = darkTheme.bgCardHover}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <div>
                                    <div style={{ fontWeight: '500', color: darkTheme.textPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {schedule.name}
                                        <span style={{ padding: '2px 8px', background: schedule.isActive ? `${darkTheme.accentGreen}20` : darkTheme.bgSecondary, color: schedule.isActive ? darkTheme.accentGreen : darkTheme.textMuted, borderRadius: '4px', fontSize: '11px' }}>
                                            {schedule.isActive ? '활성' : '비활성'}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: darkTheme.textMuted, marginTop: '4px' }}>
                                        {schedule.email} · {schedule.frequency === 'daily' ? '매일' : schedule.frequency === 'weekly' ? '매주' : '매월'}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button style={darkStyles.buttonSecondary} onClick={() => handleToggleSchedule(schedule.id)}>{schedule.isActive ? '⏸️' : '▶️'}</button>
                                    <button style={darkStyles.buttonSecondary} onClick={() => openEditSchedule(schedule)}>✏️</button>
                                    <button style={{ ...darkStyles.buttonSecondary, color: darkTheme.accentRed }} onClick={() => handleDeleteSchedule(schedule.id)}>🗑️</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </AnimatedCard>
            )}

            {/* Notification Toast */}
            {notification && (
                <div style={{
                    position: 'fixed', bottom: '24px', right: '24px', padding: '16px 24px',
                    background: notification.type === 'success' ? darkTheme.accentGreen : darkTheme.accentRed,
                    color: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    zIndex: 1000, fontSize: '14px', fontWeight: '500'
                }}>
                    {notification.type === 'success' ? '✅' : '❌'} {notification.message}
                </div>
            )}
        </div>
    );
}
