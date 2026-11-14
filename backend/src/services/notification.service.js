'use strict';

/**
 * Service for dynamic system alerts & notifications.
 */
const { db } = require('../config/database');
const Project = require('../models/project.model');

async function getProjectAlerts(projectId) {
  const projectExists = await Project.exists(projectId);
  if (!projectExists) return null;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const in48HoursStr = in48Hours.toISOString().split('T')[0];

  const [overdueTasks, dueSoonTasks, lowStockMaterials, urgentIssues] = await Promise.all([
    // Overdue tasks: deadline < today AND status != 'completed'
    db('tasks')
      .where('project_id', projectId)
      .whereNot('status', 'completed')
      .whereNotNull('deadline')
      .where('deadline', '<', todayStr)
      .select('id', 'title', 'deadline'),

    // Due in next 48h: deadline >= today AND deadline <= in48Hours AND status != 'completed'
    db('tasks')
      .where('project_id', projectId)
      .whereNot('status', 'completed')
      .whereNotNull('deadline')
      .where('deadline', '>=', todayStr)
      .where('deadline', '<=', in48HoursStr)
      .select('id', 'title', 'deadline'),

    // Low stock materials: quantity <= minimum_stock
    db('materials')
      .where('project_id', projectId)
      .whereRaw('quantity <= minimum_stock')
      .select('id', 'name', 'quantity', 'unit', 'minimum_stock'),

    // Urgent open issues: status != 'resolved' AND priority IN ('critical', 'high')
    db('issues')
      .where('project_id', projectId)
      .whereNot('status', 'resolved')
      .whereIn('priority', ['critical', 'high'])
      .select('id', 'description', 'priority'),
  ]);

  const alerts = [];

  const formatDeadline = (dl) => {
    if (!dl) return 'N/A';
    const dObj = dl instanceof Date ? dl : new Date(dl);
    if (!isNaN(dObj.getTime())) {
      return dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return String(dl).split('T')[0];
  };

  // Overdue task alerts (Critical)
  for (const t of overdueTasks) {
    alerts.push({
      type: 'task',
      severity: 'critical',
      title: t.title,
      message: `Task '${t.title}' is overdue (deadline was ${formatDeadline(t.deadline)})`,
      reference_id: t.id,
      project_id: projectId,
      action_url: `/tasks?projectId=${projectId}&taskId=${t.id}`,
      action_label: 'Resolve Task',
    });
  }

  // Critical/High priority issue alerts (Critical)
  for (const issue of urgentIssues) {
    alerts.push({
      type: 'issue',
      severity: 'critical',
      title: issue.description,
      message: `${issue.priority.toUpperCase()} priority issue: '${issue.description}' requires resolution`,
      reference_id: issue.id,
      project_id: projectId,
      action_url: `/issues?projectId=${projectId}&issueId=${issue.id}`,
      action_label: 'Resolve Issue',
    });
  }

  // Due soon task alerts (Warning)
  for (const t of dueSoonTasks) {
    alerts.push({
      type: 'task',
      severity: 'warning',
      title: t.title,
      message: `Task '${t.title}' is due within 48 hours (deadline: ${formatDeadline(t.deadline)})`,
      reference_id: t.id,
      project_id: projectId,
      action_url: `/tasks?projectId=${projectId}&taskId=${t.id}`,
      action_label: 'View Task',
    });
  }

  // Low stock inventory alerts (Warning)
  for (const m of lowStockMaterials) {
    alerts.push({
      type: 'inventory',
      severity: 'warning',
      title: m.name,
      message: `Material '${m.name}' is low on stock (${m.quantity} ${m.unit} remaining, minimum: ${m.minimum_stock})`,
      reference_id: m.id,
      project_id: projectId,
      action_url: `/materials?projectId=${projectId}&materialId=${m.id}`,
      action_label: 'Restock Material',
    });
  }

  return alerts;
}

module.exports = {
  getProjectAlerts,
};
