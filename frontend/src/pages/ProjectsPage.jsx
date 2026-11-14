import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  Plus,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  X,
  AlertCircle,
  MapPin,
  Sliders,
  Users,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { projectApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function ProjectsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    project_name: '',
    location: '',
    description: '',
    status: 'in_progress',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
  });

  // Edit Project State
  const [editingProject, setEditingProject] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Manage Engineers Modal State
  const [engineersModalProject, setEngineersModalProject] = useState(null);
  const [assignedEngineers, setAssignedEngineers] = useState([]);
  const [loadingEngineers, setLoadingEngineers] = useState(false);
  const [targetEngineerId, setTargetEngineerId] = useState('');

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await projectApi.list(params);
      setProjects(res.data?.data || res.data?.projects || []);
    } catch (err) {
      showToast('error', 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showToast]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      if (!newProject.location.trim()) {
        throw new Error('Location is required');
      }
      if (newProject.end_date && newProject.end_date < newProject.start_date) {
        throw new Error('End date cannot precede start date');
      }

      const res = await projectApi.create({
        ...newProject,
        manager_id: user.id,
      });

      const createdProj = res.data?.project || res.data?.data;
      if (createdProj?.id) {
        localStorage.setItem('jms_active_project_id', createdProj.id);
      }

      showToast('success', `Project "${newProject.project_name}" created successfully`);
      setIsCreateOpen(false);
      setNewProject({
        project_name: '',
        location: '',
        description: '',
        status: 'in_progress',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
      });
      loadProjects();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error creating project';
      showToast('error', msg);
    }
  };

  // Open Edit Project Modal
  const handleOpenEdit = (project) => {
    setEditingProject({
      ...project,
      start_date: project.start_date ? project.start_date.split('T')[0] : '',
      end_date: project.end_date ? project.end_date.split('T')[0] : '',
    });
  };

  // Submit Edit Project
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingProject) return;
    setSavingEdit(true);
    try {
      if (editingProject.end_date && editingProject.end_date < editingProject.start_date) {
        throw new Error('End date cannot precede start date');
      }
      await projectApi.update(editingProject.id, {
        project_name: editingProject.project_name,
        location: editingProject.location,
        description: editingProject.description,
        status: editingProject.status,
        start_date: editingProject.start_date,
        end_date: editingProject.end_date || null,
      });
      showToast('success', `Project "${editingProject.project_name}" updated successfully`);
      setEditingProject(null);
      loadProjects();
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Error updating project');
    } finally {
      setSavingEdit(false);
    }
  };

  // Open Manage Site Engineers Modal
  const handleOpenEngineers = async (project) => {
    setEngineersModalProject(project);
    setLoadingEngineers(true);
    setTargetEngineerId('');
    try {
      const res = await projectApi.getEngineers(project.id);
      setAssignedEngineers(res.data?.engineers || []);
    } catch (err) {
      showToast('error', 'Failed to load assigned engineers');
    } finally {
      setLoadingEngineers(false);
    }
  };

  // Assign Engineer to Project
  const handleAssignEngineer = async (e) => {
    e.preventDefault();
    if (!engineersModalProject || !targetEngineerId) return;
    try {
      await projectApi.assignEngineer(engineersModalProject.id, {
        site_engineer_id: Number(targetEngineerId),
      });
      showToast('success', 'Site engineer assigned to project');
      setTargetEngineerId('');
      const res = await projectApi.getEngineers(engineersModalProject.id);
      setAssignedEngineers(res.data?.engineers || []);
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Failed to assign engineer');
    }
  };

  // Remove Engineer from Project
  const handleRemoveEngineer = async (engineerId) => {
    if (!engineersModalProject) return;
    try {
      await projectApi.removeEngineer(engineersModalProject.id, engineerId);
      showToast('success', 'Site engineer unassigned from project');
      const res = await projectApi.getEngineers(engineersModalProject.id);
      setAssignedEngineers(res.data?.engineers || []);
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Failed to remove engineer');
    }
  };

  const canCreate = ['admin', 'project_manager'].includes(user?.role);

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
            Jobsite Construction Projects
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Manage commercial and infrastructure project portfolios, milestones, and timelines.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <select
            className="form-select"
            style={{ width: '170px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {canCreate && (
            <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
              <Plus size={16} /> New Project
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <FolderKanban size={20} /> Projects Directory ({projects.length})
          </span>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            No construction projects found.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Manager</th>
                  <th>Timeline</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{p.project_name}</div>
                      {p.location && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.2rem' }}>
                          <MapPin size={12} /> {p.location}
                        </div>
                      )}
                      {p.description && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {p.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <User size={14} color="var(--text-muted)" />
                        {p.manager_name || `Manager #${p.manager_id}`}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      <div>Start: {p.start_date?.split('T')[0]}</div>
                      <div style={{ color: 'var(--text-muted)' }}>
                        End: {p.end_date ? p.end_date.split('T')[0] : 'Open-ended'}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          p.status === 'completed'
                            ? 'badge-completed'
                            : p.status === 'in_progress'
                            ? 'badge-in_progress'
                            : 'badge-pending'
                        }`}
                      >
                        {p.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <Link to={`/dashboard?projectId=${p.id}`} className="btn btn-secondary btn-sm">
                          Dashboard
                        </Link>
                        {canCreate && (
                          <>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenEdit(p)}
                              title="Edit project details"
                            >
                              <Sliders size={13} /> Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenEngineers(p)}
                              title="Manage assigned site engineers"
                            >
                              <Users size={13} /> Engineers
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Create Project */}
      {isCreateOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Register New Project</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Project Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Skyline Tower Phase 2"
                    value={newProject.project_name}
                    onChange={(e) =>
                      setNewProject({ ...newProject, project_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Jobsite Location / Address *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 742 Evergreen Terrace, Sector 4"
                    value={newProject.location}
                    onChange={(e) =>
                      setNewProject({ ...newProject, location: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Scope & Description</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Commercial high-rise construction, steel framing, electrical rough-in..."
                    value={newProject.description}
                    onChange={(e) =>
                      setNewProject({ ...newProject, description: e.target.value })
                    }
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={newProject.start_date}
                      onChange={(e) =>
                        setNewProject({ ...newProject, start_date: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date (Estimated)</label>
                    <input
                      type="date"
                      className="form-control"
                      value={newProject.end_date}
                      onChange={(e) =>
                        setNewProject({ ...newProject, end_date: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Initial Project Status</label>
                  <select
                    className="form-select"
                    value={newProject.status}
                    onChange={(e) =>
                      setNewProject({ ...newProject, status: e.target.value })
                    }
                  >
                    <option value="in_progress">In Progress</option>
                    <option value="planned">Planned</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Project */}
      {editingProject && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                Edit Project: {editingProject.project_name}
              </h3>
              <button
                onClick={() => setEditingProject(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Project Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editingProject.project_name}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, project_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Jobsite Location / Address *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editingProject.location || ''}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, location: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Scope & Description</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={editingProject.description || ''}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, description: e.target.value })
                    }
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={editingProject.start_date || ''}
                      onChange={(e) =>
                        setEditingProject({ ...editingProject, start_date: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={editingProject.end_date || ''}
                      onChange={(e) =>
                        setEditingProject({ ...editingProject, end_date: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={editingProject.status}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, status: e.target.value })
                    }
                  >
                    <option value="in_progress">In Progress</option>
                    <option value="planned">Planned</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingProject(null)}
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingEdit}>
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Manage Site Engineers */}
      {engineersModalProject && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                  Assigned Site Engineers
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Project: {engineersModalProject.project_name}
                </div>
              </div>
              <button
                onClick={() => setEngineersModalProject(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {/* Assign Form */}
              <form onSubmit={handleAssignEngineer} style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Assign Site Engineer by User ID
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    placeholder="Enter site engineer user ID (e.g. 2, 3)"
                    value={targetEngineerId}
                    onChange={(e) => setTargetEngineerId(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }}>
                    <UserPlus size={15} /> Assign
                  </button>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  User must have the role 'site_engineer' in the system.
                </div>
              </form>

              {/* Current List */}
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  Currently Assigned ({assignedEngineers.length})
                </div>
                {loadingEngineers ? (
                  <div className="spinner" style={{ display: 'block', margin: '1rem auto' }}></div>
                ) : assignedEngineers.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No site engineers currently assigned to this project.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {assignedEngineers.map((eng) => (
                      <div
                        key={eng.id || eng.site_engineer_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.6rem 0.85rem',
                          backgroundColor: 'var(--surface-muted)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                            {eng.engineer_name || eng.name || `Engineer #${eng.site_engineer_id || eng.id}`}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            ID: #{eng.site_engineer_id || eng.id} {eng.email ? `• ${eng.email}` : ''}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{
                            color: 'var(--danger-text)',
                            backgroundColor: 'transparent',
                            border: 'none',
                            padding: '0.35rem',
                          }}
                          onClick={() => handleRemoveEngineer(eng.site_engineer_id || eng.id)}
                          title="Remove engineer from project"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEngineersModalProject(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
