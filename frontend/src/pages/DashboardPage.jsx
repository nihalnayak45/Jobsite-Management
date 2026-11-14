import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  AlertOctagon,
  Boxes,
  Users,
  AlertTriangle,
  FolderKanban,
  FileText,
  ShieldCheck,
  Calendar,
  Clock,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import {
  projectApi,
  dashboardApi,
  notificationApi,
  clientSummaryApi,
  analyticsApi,
  taskApi,
  issueApi,
} from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ProjectSCurveChart from '../components/analytics/ProjectSCurveChart';
import SCurveRecharts from '../components/analytics/SCurveRecharts';
import QualityDefectAnalytics from '../components/analytics/QualityDefectAnalytics';
import MaterialBurnRateCard from '../components/analytics/MaterialBurnRateCard';
import MaterialConsumptionGraph from '../components/analytics/MaterialConsumptionGraph';
import SafetyHeatmapCard from '../components/analytics/SafetyHeatmapCard';

export default function DashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(
    () => localStorage.getItem('jms_active_project_id') || ''
  );
  const [dashboardData, setDashboardData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [clientSummary, setClientSummary] = useState(null);
  const [progressAnalytics, setProgressAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);

  // Helper to format timestamps inside alert message strings into clean dates
  const formatAlertText = (msg) => {
    if (!msg) return '';
    return msg.replace(/\(deadline was ([^)]+)\)/i, (match, rawDate) => {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        const formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return `(deadline was ${formatted})`;
      }
      return match;
    });
  };

  // Fetch projects list for dropdown
  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await projectApi.list();
        const list = res.data?.data || res.data?.projects || [];
        setProjects(list);
        const saved = localStorage.getItem('jms_active_project_id');
        if (saved && list.some((p) => String(p.id) === String(saved))) {
          setSelectedProjectId(saved);
        } else if (list.length > 0) {
          setSelectedProjectId(list[0].id);
          localStorage.setItem('jms_active_project_id', list[0].id);
        }
      } catch (err) {
        showToast('error', 'Failed to fetch projects');
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, [showToast]);

  // Fetch dashboard and notifications when project selection changes
  const fetchProjectData = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      if (user?.role === 'client') {
        const [summaryRes, progRes] = await Promise.all([
          clientSummaryApi.get(selectedProjectId),
          analyticsApi.getProgress(selectedProjectId).catch(() => ({ data: { data: null } })),
        ]);
        setClientSummary(summaryRes.data?.data || null);
        setProgressAnalytics(progRes.data?.data || null);
      } else {
        const [dashRes, notifRes, progRes] = await Promise.all([
          dashboardApi.get(selectedProjectId),
          notificationApi.getByProject(selectedProjectId),
          analyticsApi.getProgress(selectedProjectId).catch(() => ({ data: { data: null } })),
        ]);
        setDashboardData(dashRes.data?.data || null);
        setNotifications(notifRes.data?.alerts || []);
        setProgressAnalytics(progRes.data?.data || null);
      }
    } catch (err) {
      showToast('error', 'Failed to load project metrics');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, user?.role, showToast]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  // Handle clicking on an alert item
  const handleAlertClick = (alert) => {
    const projId = alert.project_id || selectedProjectId;
    if (alert.type === 'task') {
      navigate(`/tasks?projectId=${projId}&taskId=${alert.reference_id}`);
    } else if (alert.type === 'issue') {
      navigate(`/issues?projectId=${projId}&issueId=${alert.reference_id}`);
    } else if (alert.type === 'inventory') {
      navigate(`/materials?projectId=${projId}&materialId=${alert.reference_id}`);
    } else if (alert.action_url) {
      navigate(alert.action_url);
    }
  };

  // Quick 1-Click Complete for Tasks
  const handleQuickCompleteTask = async (e, alert) => {
    e.stopPropagation();
    setResolvingId(alert.reference_id);
    try {
      await taskApi.updateStatus(alert.reference_id, {
        status: 'completed',
        completion_percentage: 100,
      });
      showToast('success', `Task marked completed (100%)!`);
      await fetchProjectData();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to update task');
    } finally {
      setResolvingId(null);
    }
  };

  // Quick 1-Click Resolve for Issues
  const handleQuickResolveIssue = async (e, alert) => {
    e.stopPropagation();
    setResolvingId(alert.reference_id);
    try {
      await issueApi.updateStatus(alert.reference_id, { status: 'resolved' });
      showToast('success', 'Issue marked as resolved!');
      await fetchProjectData();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to resolve issue');
    } finally {
      setResolvingId(null);
    }
  };

  if (loading && projects.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading projects & operational metrics...</p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
        <FolderKanban size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
        <h3>No Projects Registered Yet</h3>
        <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 1.5rem 0' }}>
          Get started by registering your first jobsite project.
        </p>
        {['admin', 'project_manager'].includes(user?.role) && (
          <a href="/projects" className="btn btn-primary">
            Create Project
          </a>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Top Header & Project Selector */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {user?.role === 'client' ? 'Client Progress Overview' : 'Project Intelligence Dashboard'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Live status metrics, real-time alerts, and field operation tracking.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Active Project:
          </label>
          <select
            className="form-select"
            style={{ minWidth: '240px', fontWeight: 600 }}
            value={selectedProjectId}
            onChange={(e) => {
              setSelectedProjectId(e.target.value);
              localStorage.setItem('jms_active_project_id', e.target.value);
            }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_name} ({p.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* High-Priority Active Alerts Banner */}
      {notifications.length > 0 && (
        <div style={{ marginBottom: '1.75rem' }}>
          <div
            style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem 1.5rem',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.08)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div
                  style={{
                    backgroundColor: '#fef3c7',
                    padding: '0.4rem',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AlertTriangle size={20} color="#d97706" />
                </div>
                <div>
                  <strong style={{ color: '#92400e', fontSize: '1rem' }}>
                    Operational Alerts & Attention Items ({notifications.length})
                  </strong>
                  <div style={{ fontSize: '0.8rem', color: '#b45309' }}>
                    Click any alert to navigate directly to resolution, or use 1-click actions below.
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {notifications.map((alert, idx) => {
                const isTask = alert.type === 'task';
                const isIssue = alert.type === 'issue';
                const isInventory = alert.type === 'inventory';
                const isResolving = resolvingId === alert.reference_id;

                return (
                  <div
                    key={idx}
                    className="alert-interactive-card"
                    onClick={() => handleAlertClick(alert)}
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      padding: '0.85rem 1.15rem',
                      backgroundColor: '#ffffff',
                      borderRadius: 'var(--radius-md)',
                      border: alert.severity === 'critical' ? '1px solid #fca5a5' : '1px solid #fed7aa',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: '1 1 320px' }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor:
                            alert.severity === 'critical' ? 'var(--danger-bg)' : 'var(--warning-bg)',
                          color:
                            alert.severity === 'critical' ? 'var(--danger-text)' : 'var(--warning-text)',
                          flexShrink: 0,
                        }}
                      >
                        {isTask ? (
                          <CheckSquare size={17} />
                        ) : isIssue ? (
                          <AlertTriangle size={17} />
                        ) : (
                          <Boxes size={17} />
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                          {formatAlertText(alert.message)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                          <span
                            className={`badge badge-${alert.severity === 'critical' ? 'overdue' : 'pending'}`}
                            style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}
                          >
                            {alert.severity}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            ID: #{alert.reference_id} &bull; Type: {alert.type}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        flexShrink: 0,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* 1-Click Quick Resolve Action */}
                      {isTask && ['admin', 'project_manager', 'site_engineer'].includes(user?.role) && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={isResolving}
                          onClick={(e) => handleQuickCompleteTask(e, alert)}
                          style={{
                            backgroundColor: '#ecfdf5',
                            color: '#065f46',
                            borderColor: '#a7f3d0',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.35rem 0.65rem',
                          }}
                          title="Instantly mark this overdue task 100% completed"
                        >
                          <CheckCircle2 size={14} />
                          {isResolving ? 'Completing...' : '1-Click Complete'}
                        </button>
                      )}

                      {isIssue && ['admin', 'project_manager', 'site_engineer'].includes(user?.role) && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={isResolving}
                          onClick={(e) => handleQuickResolveIssue(e, alert)}
                          style={{
                            backgroundColor: '#ecfdf5',
                            color: '#065f46',
                            borderColor: '#a7f3d0',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.35rem 0.65rem',
                          }}
                          title="Instantly mark this defect resolved"
                        >
                          <CheckCircle2 size={14} />
                          {isResolving ? 'Resolving...' : '1-Click Resolve'}
                        </button>
                      )}

                      {/* Primary Navigation Button */}
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => handleAlertClick(alert)}
                        style={{
                          fontSize: '0.8rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.35rem 0.75rem',
                        }}
                      >
                        {alert.action_label || (isTask ? 'Resolve Task' : isIssue ? 'Resolve Issue' : 'Address')}
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CLIENT SPECIFIC VIEW */}
      {user?.role === 'client' && clientSummary && (
        <div>
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div className="card-header">
              <span className="card-title">
                <TrendingUp size={20} /> Overall Project Progress
              </span>
              <span className="badge badge-in_progress">
                {clientSummary.progress?.average_completion_percentage || 0}% Completed
              </span>
            </div>
            <div className="progress-bar-container" style={{ height: '14px', marginBottom: '1.5rem' }}>
              <div
                className="progress-bar-fill"
                style={{
                  width: `${clientSummary.progress?.average_completion_percentage || 0}%`,
                }}
              />
            </div>
            <div className="kpi-grid">
              <div className="kpi-card">
                <div>
                  <div className="kpi-label">Total Milestones / Tasks</div>
                  <div className="kpi-value">{clientSummary.progress?.total_tasks || 0}</div>
                  <div className="kpi-subtext">
                    {clientSummary.progress?.completed_tasks || 0} completed
                  </div>
                </div>
                <div className="kpi-icon-box" style={{ background: 'var(--info-bg)', color: 'var(--info-text)' }}>
                  <CheckSquare size={22} />
                </div>
              </div>
              <div className="kpi-card">
                <div>
                  <div className="kpi-label">Safety Milestones</div>
                  <div className="kpi-value">
                    {clientSummary.safety_and_quality?.total_safety_incidents === 0
                      ? 'Zero Incidents'
                      : `${clientSummary.safety_and_quality?.total_safety_incidents} Logged`}
                  </div>
                  <div className="kpi-subtext">Clean safety record priority</div>
                </div>
                <div className="kpi-icon-box" style={{ background: 'var(--success-bg)', color: 'var(--success-text)' }}>
                  <ShieldCheck size={22} />
                </div>
              </div>
            </div>
          </div>

          {/* Client Planned vs Actual S-Curve & Milestone Completion Donut (Recharts) */}
          <SCurveRecharts
            points={progressAnalytics?.s_curve_timeline || clientSummary?.s_curve_data || []}
            taskSummary={progressAnalytics?.task_summary}
            milestoneDonut={progressAnalytics?.milestone_donut}
          />

          <div className="card">
            <div className="card-header">
              <span className="card-title">
                <FileText size={20} /> Approved Daily Work Summaries
              </span>
            </div>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Work Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {(clientSummary.recent_updates || []).map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>{u.report_date?.split('T')[0] || u.report_date}</td>
                      <td>{u.work_summary}</td>
                    </tr>
                  ))}
                  {(!clientSummary.recent_updates || clientSummary.recent_updates.length === 0) && (
                    <tr>
                      <td colSpan={2} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        No daily reports recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* OPERATIONS / STAFF VIEW */}
      {user?.role !== 'client' && dashboardData && (
        <div>
          {/* KPI Cards Grid */}
          <div className="kpi-grid">
            {/* Total Tasks */}
            <div className="kpi-card">
              <div>
                <div className="kpi-label">Total Tasks</div>
                <div className="kpi-value">{dashboardData.tasks?.total || 0}</div>
                <div className="kpi-subtext">
                  {dashboardData.tasks?.completed || 0} completed ({dashboardData.tasks?.in_progress || 0} in progress)
                </div>
              </div>
              <div className="kpi-icon-box" style={{ background: 'var(--info-bg)', color: 'var(--info-text)' }}>
                <CheckSquare size={22} />
              </div>
            </div>

            {/* Overdue Tasks */}
            <div className="kpi-card">
              <div>
                <div className="kpi-label">Overdue Tasks</div>
                <div
                  className="kpi-value"
                  style={{ color: dashboardData.tasks?.overdue > 0 ? 'var(--danger-text)' : 'inherit' }}
                >
                  {dashboardData.tasks?.overdue || 0}
                </div>
                <div className="kpi-subtext">Require immediate schedule adjustment</div>
              </div>
              <div className="kpi-icon-box" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)' }}>
                <Clock size={22} />
              </div>
            </div>

            {/* Low Stock Items */}
            <div className="kpi-card">
              <div>
                <div className="kpi-label">Low Stock Items</div>
                <div
                  className="kpi-value"
                  style={{
                    color: dashboardData.inventory?.low_stock_count > 0 ? '#b45309' : 'inherit',
                  }}
                >
                  {dashboardData.inventory?.low_stock_count || 0}
                </div>
                <div className="kpi-subtext">
                  out of {dashboardData.inventory?.total_materials || 0} registered materials
                </div>
              </div>
              <div className="kpi-icon-box" style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)' }}>
                <Boxes size={22} />
              </div>
            </div>

            {/* Open Issues */}
            <div className="kpi-card">
              <div>
                <div className="kpi-label">Open Issues</div>
                <div className="kpi-value">{dashboardData.issues?.open || 0}</div>
                <div className="kpi-subtext">
                  {dashboardData.issues?.critical_or_high || 0} critical/high priority
                </div>
              </div>
              <div className="kpi-icon-box" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)' }}>
                <AlertOctagon size={22} />
              </div>
            </div>

            {/* Today's Attendance */}
            <div className="kpi-card">
              <div>
                <div className="kpi-label">Today's Attendance</div>
                <div className="kpi-value">{dashboardData.workforce_today?.present || 0}</div>
                <div className="kpi-subtext">
                  {dashboardData.workforce_today?.total_logged || 0} total workers logged
                </div>
              </div>
              <div className="kpi-icon-box" style={{ background: 'var(--success-bg)', color: 'var(--success-text)' }}>
                <Users size={22} />
              </div>
            </div>
          </div>

          {/* Planned vs. Actual S-Curve Progress & Milestone Completion Donut */}
          <SCurveRecharts
            points={progressAnalytics?.s_curve_timeline || dashboardData?.s_curve_data || []}
            taskSummary={progressAnalytics?.task_summary}
            milestoneDonut={progressAnalytics?.milestone_donut}
          />

          {/* Defect Severity Distribution & Weekly Attendance Trends (Recharts) */}
          <QualityDefectAnalytics
            defectBreakdown={progressAnalytics?.defect_breakdown}
            weeklyAttendance={progressAnalytics?.weekly_attendance || []}
          />

          {/* Historical Material Consumption & Depletion Runway Forecasting */}
          <MaterialConsumptionGraph projectId={selectedProjectId} />

          {/* Material Burn-Rate Table */}
          <MaterialBurnRateCard projectId={selectedProjectId} />

          {/* Safety & Incident Heatmap */}
          <SafetyHeatmapCard
            heatmap={dashboardData.safety_heatmap || []}
            resolutionBreakdown={dashboardData.issue_status_breakdown || {}}
          />

          {/* Operational Details Sections */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
            {/* Recent Daily Reports Feed */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">
                  <FileText size={20} /> Recent Daily Reports
                </span>
                <a href="/reports" className="btn btn-secondary btn-sm">
                  View All <ArrowRight size={14} />
                </a>
              </div>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Work Summary</th>
                      <th>Weather</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboardData.recent_reports || []).map((r) => (
                      <tr key={r.id}>
                        <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                          {r.report_date?.split('T')[0] || r.report_date}
                        </td>
                        <td>{r.work_summary}</td>
                        <td style={{ textTransform: 'capitalize' }}>{r.weather || '—'}</td>
                      </tr>
                    ))}
                    {(!dashboardData.recent_reports || dashboardData.recent_reports.length === 0) && (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                          No daily reports logged yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Equipment & Safety Status */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">
                  <ShieldCheck size={20} /> Safety & Quality Highlights
                </span>
                <a href="/safety" className="btn btn-secondary btn-sm">
                  Full Log <ArrowRight size={14} />
                </a>
              </div>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Status / Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboardData.recent_safety || []).map((s) => (
                      <tr key={s.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {s.date?.split('T')[0] || s.date}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              s.record_type === 'safety_incident' ? 'badge-critical' : 'badge-in_progress'
                            }`}
                          >
                            {s.record_type?.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              s.status === 'passed' ? 'badge-completed' : 'badge-pending'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!dashboardData.recent_safety || dashboardData.recent_safety.length === 0) && (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                          Zero incidents or inspections logged.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
