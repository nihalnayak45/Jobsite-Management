import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import {
  FileText,
  AlertTriangle,
  Plus,
  CheckCircle2,
  Clock,
  CloudSun,
  ShieldAlert,
  X,
} from 'lucide-react';
import { projectApi, reportApi, issueApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function ReportsAndIssuesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryProjectId = searchParams.get('projectId');
  const queryIssueId = searchParams.get('issueId');

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(
    queryProjectId || localStorage.getItem('jms_active_project_id') || ''
  );
  const [activeTab, setActiveTab] = useState(
    location.pathname === '/issues' || queryIssueId ? 'issues' : 'reports'
  );
  const [loading, setLoading] = useState(true);

  // Daily Reports State
  const [reports, setReports] = useState([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [newReport, setNewReport] = useState({
    report_date: new Date().toISOString().split('T')[0],
    work_summary: '',
    weather: 'clear',
    obstacles: '',
  });

  // Issues State
  const [issues, setIssues] = useState([]);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [newIssue, setNewIssue] = useState({
    description: '',
    priority: 'medium',
  });

  // Load Projects
  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await projectApi.list();
        const list = res.data?.data || res.data?.projects || [];
        setProjects(list);
        const saved = localStorage.getItem('jms_active_project_id');
        if (queryProjectId && list.some((p) => String(p.id) === String(queryProjectId))) {
          setSelectedProjectId(queryProjectId);
          localStorage.setItem('jms_active_project_id', queryProjectId);
        } else if (saved && list.some((p) => String(p.id) === String(saved))) {
          setSelectedProjectId(saved);
        } else if (list.length > 0 && !selectedProjectId) {
          setSelectedProjectId(list[0].id);
          localStorage.setItem('jms_active_project_id', list[0].id);
        }
      } catch (err) {
        showToast('error', 'Failed to fetch projects');
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, [showToast, queryProjectId]);

  // Auto-switch tab and scroll when queryIssueId is present
  useEffect(() => {
    if (queryIssueId) {
      setActiveTab('issues');
      setTimeout(() => {
        const rowEl = document.getElementById(`issue-row-${queryIssueId}`);
        if (rowEl) {
          rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [queryIssueId, issues]);

  // Load Reports and Issues
  const loadData = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const [reportsRes, issuesRes] = await Promise.all([
        reportApi.listByProject(selectedProjectId),
        issueApi.listByProject(selectedProjectId),
      ]);
      setReports(reportsRes.data?.data || reportsRes.data?.reports || []);
      setIssues(issuesRes.data?.data || issuesRes.data?.issues || []);
    } catch (err) {
      showToast('error', 'Failed to load reports and issues');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Report Creation
  const handleCreateReport = async (e) => {
    e.preventDefault();
    try {
      const parts = [
        newReport.work_summary.trim(),
        newReport.weather ? `[Weather: ${newReport.weather}]` : '',
        newReport.obstacles ? `[Obstacles: ${newReport.obstacles}]` : '',
      ].filter(Boolean);

      await reportApi.create({
        project_id: Number(selectedProjectId),
        report_date: newReport.report_date || new Date().toISOString().split('T')[0],
        work_summary: parts.join(' | '),
      });
      showToast('success', 'Daily site report submitted successfully');
      setIsReportModalOpen(false);
      setNewReport({
        report_date: new Date().toISOString().split('T')[0],
        work_summary: '',
        weather: 'clear',
        obstacles: '',
      });
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error submitting report';
      showToast('error', msg);
    }
  };

  // Handle Issue Creation (Any authenticated user including workers)
  const handleCreateIssue = async (e) => {
    e.preventDefault();
    try {
      await issueApi.create({
        ...newIssue,
        project_id: Number(selectedProjectId),
      });
      showToast('success', 'Issue logged successfully');
      setIsIssueModalOpen(false);
      setNewIssue({ description: '', priority: 'medium' });
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error logging issue';
      showToast('error', msg);
    }
  };

  // Handle Issue Status Update (Admin / PM / Site Engineer)
  const handleUpdateIssueStatus = async (issueId, newStatus) => {
    try {
      await issueApi.updateStatus(issueId, { status: newStatus });
      showToast('success', `Issue status updated to ${newStatus}`);
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error updating issue';
      showToast('error', msg);
    }
  };

  const canLogDailyReport = ['admin', 'project_manager', 'site_engineer'].includes(user?.role);
  const canManageIssueStatus = ['admin', 'project_manager', 'site_engineer'].includes(user?.role);

  return (
    <div>
      {/* Top Header & Selector */}
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
            Daily Reports & Site Defect Tracking
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Document daily site operations, weather conditions, and log equipment or safety defects.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <select
            className="form-select"
            style={{ minWidth: '220px' }}
            value={selectedProjectId}
            onChange={(e) => {
              setSelectedProjectId(e.target.value);
              localStorage.setItem('jms_active_project_id', e.target.value);
            }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_name}
              </option>
            ))}
          </select>

          {activeTab === 'reports' && canLogDailyReport && (
            <button className="btn btn-primary" onClick={() => setIsReportModalOpen(true)}>
              <Plus size={16} /> Log Daily Report
            </button>
          )}

          {activeTab === 'issues' && (
            <button className="btn btn-primary" onClick={() => setIsIssueModalOpen(true)}>
              <Plus size={16} /> Report New Issue
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
        <button
          onClick={() => setActiveTab('reports')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'reports' ? '3px solid var(--primary-500)' : '3px solid transparent',
            color: activeTab === 'reports' ? 'var(--primary-600)' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <FileText size={18} /> Daily Site Reports ({reports.length})
        </button>

        <button
          onClick={() => setActiveTab('issues')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'issues' ? '3px solid var(--primary-500)' : '3px solid transparent',
            color: activeTab === 'issues' ? 'var(--primary-600)' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertTriangle size={18} /> Site Issues & Defects ({issues.length})
        </button>
      </div>

      {/* TAB 1: Daily Reports */}
      {activeTab === 'reports' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <FileText size={20} /> Historical Daily Site Reports
            </span>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
            </div>
          ) : reports.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              No daily reports logged yet for this project.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Reported By</th>
                    <th>Work Performed</th>
                    <th>Weather</th>
                    <th>Obstacles / Delays</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id}>
                      <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                        {r.report_date?.split('T')[0] || r.report_date}
                      </td>
                      <td>{r.creator_name || `User #${r.created_by}`}</td>
                      <td style={{ maxWidth: '350px' }}>{r.work_summary}</td>
                      <td>
                        <span className="badge badge-in_progress" style={{ textTransform: 'capitalize' }}>
                          <CloudSun size={12} /> {r.weather || 'Clear'}
                        </span>
                      </td>
                      <td style={{ color: r.obstacles ? 'var(--danger-text)' : 'var(--text-muted)' }}>
                        {r.obstacles || 'None'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Issues & Defects */}
      {activeTab === 'issues' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <AlertTriangle size={20} /> Reported Issues & Quality Defects
            </span>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
            </div>
          ) : issues.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              Zero open issues or defects reported.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Issue Description</th>
                    <th>Reporter</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Reported At</th>
                    {canManageIssueStatus && <th>Status Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {issues.map((i) => (
                    <tr
                      key={i.id}
                      id={`issue-row-${i.id}`}
                      className={String(i.id) === String(queryIssueId) ? 'highlight-pulse' : ''}
                      style={
                        String(i.id) === String(queryIssueId)
                          ? { borderLeft: '4px solid var(--primary-500)', backgroundColor: '#fffbeb' }
                          : undefined
                      }
                    >
                      <td style={{ fontWeight: 600, maxWidth: '350px' }}>{i.description}</td>
                      <td>{i.reporter_name || `User #${i.reported_by}`}</td>
                      <td>
                        <span
                          className={`badge ${
                            i.priority === 'critical'
                              ? 'badge-critical'
                              : i.priority === 'high'
                              ? 'badge-pending'
                              : 'badge-in_progress'
                          }`}
                        >
                          {i.priority}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            i.status === 'resolved'
                              ? 'badge-completed'
                              : i.status === 'in_progress'
                              ? 'badge-in_progress'
                              : 'badge-pending'
                          }`}
                        >
                          {i.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                        {i.created_at?.split('T')[0] || 'Today'}
                      </td>
                      {canManageIssueStatus && (
                        <td>
                          {i.status !== 'resolved' ? (
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              {i.status === 'open' && (
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleUpdateIssueStatus(i.id, 'in_progress')}
                                >
                                  In Progress
                                </button>
                              )}
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleUpdateIssueStatus(i.id, 'resolved')}
                              >
                                Resolve
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--success-text)', fontSize: '0.8rem', fontWeight: 600 }}>
                              ✓ Resolved
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Create Daily Report */}
      {isReportModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Log Daily Site Report</h3>
              <button
                onClick={() => setIsReportModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateReport}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Report Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={newReport.report_date}
                    onChange={(e) => setNewReport({ ...newReport, report_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Work Summary (Completed Tasks & Milestones) *</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Describe trades, quantities poured, equipment operated, inspections completed..."
                    value={newReport.work_summary}
                    onChange={(e) => setNewReport({ ...newReport, work_summary: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Weather Condition</label>
                  <select
                    className="form-select"
                    value={newReport.weather}
                    onChange={(e) => setNewReport({ ...newReport, weather: e.target.value })}
                  >
                    <option value="clear">Clear / Sunny</option>
                    <option value="cloudy">Cloudy</option>
                    <option value="rainy">Rainy (Potential work stoppages)</option>
                    <option value="windy">High Winds</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Obstacles / Material Delays (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Concrete truck arrived 2 hours late due to traffic"
                    value={newReport.obstacles}
                    onChange={(e) => setNewReport({ ...newReport, obstacles: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsReportModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Report Issue */}
      {isIssueModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Report Site Issue / Defect</h3>
              <button
                onClick={() => setIsIssueModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateIssue}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Issue Description</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Detail the issue, location, safety hazard, or defect..."
                    value={newIssue.description}
                    onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Priority Level</label>
                  <select
                    className="form-select"
                    value={newIssue.priority}
                    onChange={(e) => setNewIssue({ ...newIssue, priority: e.target.value })}
                  >
                    <option value="low">Low (Cosmetic / non-blocking)</option>
                    <option value="medium">Medium (Standard site defect)</option>
                    <option value="high">High (Delay hazard)</option>
                    <option value="critical">Critical (Immediate safety / structural halt)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsIssueModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
