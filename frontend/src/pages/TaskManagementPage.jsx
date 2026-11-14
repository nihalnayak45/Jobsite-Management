import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckSquare,
  Plus,
  Filter,
  User,
  Calendar,
  Sliders,
  CheckCircle2,
  Clock,
  X,
  AlertCircle,
} from 'lucide-react';
import { projectApi, taskApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function TaskManagementPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const queryProjectId = searchParams.get('projectId');
  const queryTaskId = searchParams.get('taskId');

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(
    queryProjectId || localStorage.getItem('jms_active_project_id') || ''
  );
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  // Modal state for Task Creation
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assigned_user_id: '',
    deadline: '',
  });

  // Modal state for Progress Update
  const [editingTask, setEditingTask] = useState(null);
  const [editStatus, setEditStatus] = useState('in_progress');
  const [editPercentage, setEditPercentage] = useState(0);
  const [savingProgress, setSavingProgress] = useState(false);

  // Load projects list
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
        showToast('error', 'Failed to fetch projects list');
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, [showToast, queryProjectId]);

  // Load tasks for selected project
  const loadTasks = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await taskApi.listByProject(selectedProjectId, params);
      setTasks(res.data?.data || res.data?.tasks || []);
    } catch (err) {
      showToast('error', 'Failed to load project tasks');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, statusFilter, showToast]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Open progress update modal
  const openProgressModal = useCallback((task) => {
    setEditingTask(task);
    setEditStatus(task.status);
    setEditPercentage(task.completion_percentage || 0);
  }, []);

  // Auto-focus and open modal if queryTaskId is present
  useEffect(() => {
    if (!queryTaskId || tasks.length === 0 || hasAutoOpened) return;
    const matched = tasks.find((t) => String(t.id) === String(queryTaskId));
    if (matched) {
      openProgressModal(matched);
      setHasAutoOpened(true);
      setTimeout(() => {
        const rowEl = document.getElementById(`task-row-${queryTaskId}`);
        if (rowEl) {
          rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [tasks, queryTaskId, hasAutoOpened, openProgressModal]);

  // Handle Create Task (Admin / PM)
  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await taskApi.create({
        ...newTask,
        project_id: Number(selectedProjectId),
        assigned_user_id: newTask.assigned_user_id ? Number(newTask.assigned_user_id) : null,
      });
      showToast('success', 'Task created successfully');
      setIsCreateOpen(false);
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        assigned_user_id: '',
        deadline: '',
      });
      loadTasks();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error creating task';
      showToast('error', msg);
    }
  };

  // Submit progress update
  const handleSaveProgress = async () => {
    if (!editingTask) return;
    setSavingProgress(true);
    try {
      const payload = {
        completion_percentage: Number(editPercentage),
        status: editStatus,
      };
      // Auto set completed if 100%
      if (Number(editPercentage) === 100) {
        payload.status = 'completed';
      }

      await taskApi.updateStatus(editingTask.id, payload);
      showToast('success', `Progress updated for "${editingTask.title}"`);
      setEditingTask(null);
      loadTasks();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error updating task';
      showToast('error', msg);
    } finally {
      setSavingProgress(false);
    }
  };

  const canCreateTask = ['admin', 'project_manager'].includes(user?.role);

  return (
    <div>
      {/* Top Controls */}
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
            Task Management & Execution
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {user?.role === 'worker'
              ? 'View your assigned jobsite tasks and update progress milestones.'
              : 'Assign, monitor, and update construction work packages.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            style={{ minWidth: '200px' }}
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
            style={{ width: '150px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          {canCreateTask && (
            <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
              <Plus size={16} /> New Task
            </button>
          )}
        </div>
      </div>

      {/* Task List Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <CheckSquare size={20} /> Tasks ({tasks.length})
          </span>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <p>No tasks found matching your filter criteria.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Title & Description</th>
                  <th>Assignee</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Deadline</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const isAssignedToMe = user && Number(task.assigned_user_id) === Number(user.id);
                  const canEditThisTask =
                    ['admin', 'project_manager', 'site_engineer'].includes(user?.role) ||
                    (user?.role === 'worker' && isAssignedToMe);

                  const isOverdue =
                    task.deadline &&
                    new Date(task.deadline) < new Date() &&
                    task.status !== 'completed';

                  return (
                    <tr
                      key={task.id}
                      id={`task-row-${task.id}`}
                      className={String(task.id) === String(queryTaskId) ? 'highlight-pulse' : ''}
                      style={
                        String(task.id) === String(queryTaskId)
                          ? { borderLeft: '4px solid var(--primary-500)', backgroundColor: '#fffbeb' }
                          : undefined
                      }
                    >
                      <td style={{ maxWidth: '280px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{task.title}</div>
                        {task.description && (
                          <div
                            style={{
                              fontSize: '0.785rem',
                              color: 'var(--text-muted)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {task.description}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                          <User size={14} color="var(--text-muted)" />
                          {task.assignee_name || (task.assigned_user_id ? `User #${task.assigned_user_id}` : 'Unassigned')}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            task.priority === 'urgent'
                              ? 'badge-critical'
                              : task.priority === 'high'
                              ? 'badge-pending'
                              : 'badge-in_progress'
                          }`}
                        >
                          {task.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${isOverdue ? 'overdue' : task.status}`}>
                          {isOverdue ? 'Overdue' : task.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ minWidth: '130px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div className="progress-bar-container" style={{ flex: 1 }}>
                            <div
                              className="progress-bar-fill"
                              style={{ width: `${task.completion_percentage || 0}%` }}
                            />
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, width: '32px' }}>
                            {task.completion_percentage || 0}%
                          </span>
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                        {task.deadline ? task.deadline.split('T')[0] : '—'}
                      </td>
                      <td>
                        {canEditThisTask ? (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => openProgressModal(task)}
                          >
                            <Sliders size={14} /> Update
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>View Only</span>
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

      {/* MODAL: Create Task (Admin / PM) */}
      {isCreateOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Create New Task</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateTask}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Task Title</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Concrete Pouring - Foundation Grid B"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description / Work Scope</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Provide details on specs, batch mix, or team assignments..."
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select
                      className="form-select"
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Deadline</label>
                    <input
                      type="date"
                      className="form-control"
                      value={newTask.deadline}
                      onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Assignee User ID (Optional)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 1"
                    value={newTask.assigned_user_id}
                    onChange={(e) => setNewTask({ ...newTask, assigned_user_id: e.target.value })}
                  />
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
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Update Progress (Workers & Supervisors) */}
      {editingTask && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                Update Task: {editingTask.title}
              </h3>
              <button
                onClick={() => setEditingTask(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">
                  Completion Percentage: <strong>{editPercentage}%</strong>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  className="form-control"
                  style={{ padding: '0.2rem' }}
                  value={editPercentage}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setEditPercentage(val);
                    if (val === 100) setEditStatus('completed');
                    else if (val > 0 && editStatus === 'pending') setEditStatus('in_progress');
                  }}
                />
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                    onClick={() => {
                      setEditPercentage(25);
                      setEditStatus('in_progress');
                    }}
                  >
                    25%
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                    onClick={() => {
                      setEditPercentage(50);
                      setEditStatus('in_progress');
                    }}
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                    onClick={() => {
                      setEditPercentage(75);
                      setEditStatus('in_progress');
                    }}
                  >
                    75%
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.2rem 0.5rem',
                      backgroundColor: '#ecfdf5',
                      color: '#065f46',
                      borderColor: '#a7f3d0',
                      fontWeight: 700,
                    }}
                    onClick={() => {
                      setEditPercentage(100);
                      setEditStatus('completed');
                    }}
                  >
                    100% (Complete)
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Current Status</label>
                <select
                  className="form-select"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed (100%)</option>
                </select>
              </div>

              {Number(editPercentage) === 100 && (
                <div
                  style={{
                    backgroundColor: 'var(--success-bg)',
                    color: 'var(--success-text)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>Marking as 100% will automatically mark this task as Completed.</span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditingTask(null)}
                disabled={savingProgress}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveProgress}
                disabled={savingProgress}
              >
                {savingProgress ? 'Saving...' : 'Save Progress'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
