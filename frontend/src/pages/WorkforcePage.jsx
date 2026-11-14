import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  X,
  Search,
} from 'lucide-react';
import { projectApi, workforceApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function WorkforcePage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(
    () => localStorage.getItem('jms_active_project_id') || ''
  );
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [workers, setWorkers] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Register Worker Modal
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [newWorker, setNewWorker] = useState({
    name: '',
    contact: '',
    contractor_details: '',
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

  // Load Workers and Attendance
  const loadData = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const [workersRes, attendanceRes] = await Promise.all([
        workforceApi.listWorkers(),
        workforceApi.getAttendance(selectedProjectId, { date }),
      ]);

      const wList = workersRes.data?.data || workersRes.data?.workers || [];
      const attList = attendanceRes.data?.data || attendanceRes.data?.attendance || [];

      setWorkers(wList);

      // Map attendance by worker_id
      const map = {};
      attList.forEach((a) => {
        map[a.worker_id] = a.status;
      });
      setAttendanceMap(map);
    } catch (err) {
      showToast('error', 'Failed to load workforce & attendance');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, date, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Set status in state for a worker
  const handleStatusChange = (workerId, status) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [workerId]: status,
    }));
  };

  // Save all marked attendance
  const handleSaveAttendance = async () => {
    if (!selectedProjectId) return;
    setSavingAttendance(true);
    try {
      const records = Object.entries(attendanceMap).map(([workerId, status]) => ({
        worker_id: Number(workerId),
        status,
      }));

      if (records.length === 0) {
        showToast('info', 'No attendance changes to record');
        return;
      }

      await workforceApi.recordAttendance({
        project_id: Number(selectedProjectId),
        date,
        records,
      });

      showToast('success', `Attendance recorded successfully for ${records.length} workers`);
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error recording attendance';
      showToast('error', msg);
    } finally {
      setSavingAttendance(false);
    }
  };

  // Register a new worker
  const handleRegisterWorker = async (e) => {
    e.preventDefault();
    try {
      await workforceApi.registerWorker(newWorker);
      showToast('success', `Worker "${newWorker.name}" registered`);
      setIsRegisterOpen(false);
      setNewWorker({ name: '', contact: '', contractor_details: '' });
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error registering worker';
      showToast('error', msg);
    }
  };

  const canManageWorkforce = ['admin', 'project_manager', 'site_engineer'].includes(user?.role);

  const filteredWorkers = workers.filter((w) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (w.name && w.name.toLowerCase().includes(q)) ||
      (w.contact && w.contact.toLowerCase().includes(q)) ||
      (w.contractor_details && w.contractor_details.toLowerCase().includes(q))
    );
  });

  const presentCount = Object.values(attendanceMap).filter((s) => s === 'present').length;
  const halfDayCount = Object.values(attendanceMap).filter((s) => s === 'half_day').length;
  const absentCount = Object.values(attendanceMap).filter((s) => s === 'absent').length;

  return (
    <div>
      {/* Top Header */}
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
            Workforce & Attendance Logging
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Daily worker muster roll, contractor assignments, and presence tracking.
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

          <input
            type="date"
            className="form-control"
            style={{ width: '160px' }}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          {canManageWorkforce && (
            <button className="btn btn-secondary" onClick={() => setIsRegisterOpen(true)}>
              <UserPlus size={16} /> Register Worker
            </button>
          )}

          {canManageWorkforce && (
            <button
              className="btn btn-primary"
              onClick={handleSaveAttendance}
              disabled={savingAttendance}
            >
              <CalendarCheck size={16} /> {savingAttendance ? 'Saving...' : 'Save Attendance'}
            </button>
          )}
        </div>
      </div>

      {/* Attendance Table */}
      <div className="card">
        <div
          className="card-header"
          style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}
        >
          <div>
            <span className="card-title">
              <Users size={20} /> Field Workforce ({workers.length} registered) - {date}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
              <span className="badge badge-completed" style={{ fontSize: '0.75rem' }}>
                Present: {presentCount}
              </span>
              <span className="badge badge-pending" style={{ fontSize: '0.75rem' }}>
                Half-Day: {halfDayCount}
              </span>
              <span className="badge badge-overdue" style={{ fontSize: '0.75rem' }}>
                Absent: {absentCount}
              </span>
              <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#475569', fontSize: '0.75rem' }}>
                Total Marked: {presentCount + halfDayCount + absentCount} / {workers.length}
              </span>
            </div>
          </div>

          <div style={{ position: 'relative', width: '240px' }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              className="form-control"
              placeholder="Search worker / trade..."
              style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading workforce registry...</p>
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <p>{searchQuery ? 'No workers match your search query.' : 'No workers registered in the system yet.'}</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Worker Name</th>
                  <th>Contact Info</th>
                  <th>Contractor / Trade</th>
                  <th>Attendance Status for {date}</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.map((w) => {
                  const currentStatus = attendanceMap[w.id] || 'absent';
                  return (
                    <tr key={w.id}>
                      <td style={{ fontWeight: 600 }}>{w.name}</td>
                      <td>{w.contact || '—'}</td>
                      <td>{w.contractor_details || 'General Labor'}</td>
                      <td>
                        {canManageWorkforce ? (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              className={`btn btn-sm ${
                                currentStatus === 'present' ? 'btn-primary' : 'btn-secondary'
                              }`}
                              onClick={() => handleStatusChange(w.id, 'present')}
                            >
                              <CheckCircle2 size={13} /> Present
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${
                                currentStatus === 'half_day' ? 'btn-primary' : 'btn-secondary'
                              }`}
                              style={
                                currentStatus === 'half_day'
                                  ? { backgroundColor: '#d97706', borderColor: '#d97706' }
                                  : {}
                              }
                              onClick={() => handleStatusChange(w.id, 'half_day')}
                            >
                              <Clock size={13} /> Half-Day
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${
                                currentStatus === 'absent' ? 'btn-danger' : 'btn-secondary'
                              }`}
                              onClick={() => handleStatusChange(w.id, 'absent')}
                            >
                              <XCircle size={13} /> Absent
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`badge badge-${
                              currentStatus === 'present'
                                ? 'completed'
                                : currentStatus === 'half_day'
                                ? 'pending'
                                : 'overdue'
                            }`}
                          >
                            {currentStatus}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Register Worker */}
      {isRegisterOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Register New Worker</h3>
              <button
                onClick={() => setIsRegisterOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleRegisterWorker}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Marcus Vance"
                    value={newWorker.name}
                    onChange={(e) => setNewWorker({ ...newWorker, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone / Contact Details</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. +1 555-0199"
                    value={newWorker.contact}
                    onChange={(e) => setNewWorker({ ...newWorker, contact: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Contractor / Trade Agency</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Apex Electrical Subcontractors"
                    value={newWorker.contractor_details}
                    onChange={(e) =>
                      setNewWorker({ ...newWorker, contractor_details: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsRegisterOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Register Worker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
