import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  X,
} from 'lucide-react';
import { projectApi, safetyApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function SafetyPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(
    () => localStorage.getItem('jms_active_project_id') || ''
  );
  const [records, setRecords] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRecord, setNewRecord] = useState({
    record_type: 'quality_inspection',
    description: '',
    date: new Date().toISOString().split('T')[0],
    status: 'passed',
  });

  // Load Projects
  useEffect(() => {
    async function fetchProjects() {
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
      }
    }
    fetchProjects();
  }, [showToast]);

  // Load Safety / Quality Records
  const loadRecords = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const params = {};
      if (typeFilter) params.record_type = typeFilter;
      const res = await safetyApi.listByProject(selectedProjectId, params);
      setRecords(res.data?.data || res.data?.records || []);
    } catch (err) {
      showToast('error', 'Failed to load safety and quality records');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, typeFilter, showToast]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Create Record
  const handleCreateRecord = async (e) => {
    e.preventDefault();
    try {
      await safetyApi.create({
        ...newRecord,
        project_id: Number(selectedProjectId),
      });
      showToast('success', 'Safety/Quality record logged successfully');
      setIsModalOpen(false);
      setNewRecord({
        record_type: 'quality_inspection',
        description: '',
        date: new Date().toISOString().split('T')[0],
        status: 'passed',
      });
      loadRecords();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error logging record';
      showToast('error', msg);
    }
  };

  const canCreate = ['admin', 'project_manager', 'site_engineer'].includes(user?.role);

  return (
    <div>
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
            Safety Incidents & Quality Inspections
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Maintain compliance audits, OSHA/safety milestone records, and structural QA passes.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
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

          <select
            className="form-select"
            style={{ width: '190px' }}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Record Types</option>
            <option value="quality_inspection">Quality Inspections</option>
            <option value="safety_incident">Safety Incidents</option>
          </select>

          {canCreate && (
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={16} /> Log Record
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <ShieldCheck size={20} /> Field Safety & Quality Log ({records.length})
          </span>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading compliance audit log...</p>
          </div>
        ) : records.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            Zero safety incidents or inspection reports recorded.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Record Type</th>
                  <th>Audit / Incident Description</th>
                  <th>Status / Outcome</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {r.date?.split('T')[0] || r.date}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          r.record_type === 'safety_incident' ? 'badge-critical' : 'badge-in_progress'
                        }`}
                      >
                        {r.record_type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ maxWidth: '400px' }}>{r.description}</td>
                    <td>
                      <span
                        className={`badge ${
                          r.status === 'passed'
                            ? 'badge-completed'
                            : r.status === 'failed'
                            ? 'badge-critical'
                            : 'badge-pending'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Log Record */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Log Safety or Quality Record</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateRecord}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Record Type</label>
                  <select
                    className="form-select"
                    value={newRecord.record_type}
                    onChange={(e) =>
                      setNewRecord({ ...newRecord, record_type: e.target.value })
                    }
                  >
                    <option value="quality_inspection">Quality Inspection</option>
                    <option value="safety_incident">Safety Incident</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Record Description / Findings</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Detail the inspection results, standard reference, or incident narrative..."
                    value={newRecord.description}
                    onChange={(e) =>
                      setNewRecord({ ...newRecord, description: e.target.value })
                    }
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={newRecord.date}
                      onChange={(e) =>
                        setNewRecord({ ...newRecord, date: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status / Outcome</label>
                    <select
                      className="form-select"
                      value={newRecord.status}
                      onChange={(e) =>
                        setNewRecord({ ...newRecord, status: e.target.value })
                      }
                    >
                      <option value="passed">Passed</option>
                      <option value="failed">Failed</option>
                      <option value="investigating">Under Investigation</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
