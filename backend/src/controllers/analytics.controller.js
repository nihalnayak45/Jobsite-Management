'use strict';

const AppError = require('../utils/AppError');
const { db } = require('../config/database');
const Project = require('../models/project.model');
const MaterialLog = require('../models/materialLog.model');

/**
 * GET /api/analytics/materials/:projectId
 * Returns historical daily consumption and projected runway forecast per material.
 * Query params: ?days=30 (default: 30)
 */
async function getMaterialAnalytics(req, res) {
  const projectId = Number(req.params.projectId);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new AppError(400, 'Invalid project ID');
  }

  const projectExists = await Project.exists(projectId);
  if (!projectExists) {
    throw new AppError(404, `Project with ID ${projectId} not found`);
  }

  const days = Math.min(60, Math.max(7, Number(req.query.days) || 30));

  const analytics = await MaterialLog.getAnalyticsByProject(projectId, { historyDays: days });
  const recentLogs = await MaterialLog.findByProjectId(projectId, { days, limit: 50 });

  res.status(200).json({
    success: true,
    data: {
      ...analytics,
      recent_logs: recentLogs,
    },
  });
}

/**
 * GET /api/analytics/progress/:projectId
 * Returns cumulative expected completion vs. actual completion (S-Curve) by week/milestone,
 * task breakdown for milestone donut charts, and defect/quality breakdown.
 */
async function getProgressAnalytics(req, res) {
  const projectId = Number(req.params.projectId);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new AppError(400, 'Invalid project ID');
  }

  const project = await Project.findById(projectId);
  if (!project) {
    throw new AppError(404, `Project with ID ${projectId} not found`);
  }

  // Run queries in parallel
  const [tasksAgg, allTasks, issuesPriorityAgg, resolvedTimes, weeklyAttendance] = await Promise.all([
    // 1. Task counts
    db('tasks')
      .where('project_id', projectId)
      .select(
        db.raw('COUNT(*)::integer as total_tasks'),
        db.raw("COUNT(CASE WHEN status = 'completed' THEN 1 END)::integer as completed_tasks"),
        db.raw("COUNT(CASE WHEN status = 'in_progress' THEN 1 END)::integer as in_progress_tasks"),
        db.raw("COUNT(CASE WHEN status = 'pending' THEN 1 END)::integer as pending_tasks"),
        db.raw("COUNT(CASE WHEN deadline < CURRENT_DATE AND status != 'completed' THEN 1 END)::integer as overdue_tasks"),
        db.raw('COALESCE(AVG(completion_percentage), 0)::numeric(5, 2) as avg_completion_pct')
      )
      .first(),

    // 2. Key milestone tasks with deadlines
    db('tasks')
      .where('project_id', projectId)
      .select('id', 'title', 'deadline', 'status', 'completion_percentage')
      .orderBy('deadline', 'asc')
      .limit(20),

    // 3. Issue priority breakdown
    db('issues')
      .where('project_id', projectId)
      .whereNot('status', 'resolved')
      .select(
        db.raw("COUNT(CASE WHEN priority = 'critical' THEN 1 END)::integer as critical"),
        db.raw("COUNT(CASE WHEN priority = 'high' THEN 1 END)::integer as high"),
        db.raw("COUNT(CASE WHEN priority = 'medium' THEN 1 END)::integer as medium"),
        db.raw("COUNT(CASE WHEN priority = 'low' THEN 1 END)::integer as low"),
        db.raw('COUNT(*)::integer as total_open')
      )
      .first(),

    // 4. Defect resolution time for resolved issues
    db('issues')
      .where('project_id', projectId)
      .where('status', 'resolved')
      .whereNotNull('created_at')
      .whereNotNull('updated_at')
      .select(
        db.raw('COUNT(*)::integer as resolved_count'),
        db.raw('COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600), 0)::numeric(6, 1) as avg_resolution_hours')
      )
      .first(),

    // 5. Weekly attendance trends (past 14 days)
    db('attendance')
      .where('project_id', projectId)
      .where('date', '>=', db.raw("CURRENT_DATE - INTERVAL '14 days'"))
      .select(
        'date',
        db.raw("COUNT(CASE WHEN status = 'present' THEN 1 END)::integer as present"),
        db.raw("COUNT(CASE WHEN status = 'absent' THEN 1 END)::integer as absent"),
        db.raw("COUNT(CASE WHEN status = 'half_day' THEN 1 END)::integer as half_day")
      )
      .groupBy('date')
      .orderBy('date', 'asc'),
  ]);

  const totalTasks = Number(tasksAgg?.total_tasks) || 0;
  const completedTasks = Number(tasksAgg?.completed_tasks) || 0;
  const inProgressTasks = Number(tasksAgg?.in_progress_tasks) || 0;
  const pendingTasks = Number(tasksAgg?.pending_tasks) || 0;
  const overdueTasks = Number(tasksAgg?.overdue_tasks) || 0;
  const avgCompletionPct = parseFloat(tasksAgg?.avg_completion_pct) || 0;

  // S-Curve timeline calculation (Weekly cumulative progress)
  const startDate = project.start_date ? new Date(project.start_date) : new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
  const endDate = project.end_date ? new Date(project.end_date) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const totalDuration = Math.max(1, endDate - startDate);
  const elapsedRatio = Math.min(1, Math.max(0, (now - startDate) / totalDuration));

  // Actual progress to date
  const effectiveActualPct = totalTasks > 0
    ? Math.min(100, Math.round(((completedTasks + inProgressTasks * 0.5) / totalTasks) * 100))
    : avgCompletionPct;

  const sCurveData = [];
  const intervals = 8; // 8 milestone intervals across timeline
  for (let i = 0; i <= intervals; i++) {
    const t = i / intervals;
    const ptDate = new Date(startDate.getTime() + t * totalDuration);
    // Standard logistic S-curve baseline
    const plannedPct = Math.min(100, Math.max(0, Math.round(100 / (1 + Math.exp(-8 * (t - 0.5))))));

    let actualPct = null;
    if (t <= elapsedRatio) {
      const progressT = elapsedRatio > 0 ? (t / elapsedRatio) : 0;
      actualPct = Math.round(effectiveActualPct * Math.sin((progressT * Math.PI) / 2));
    }

    const weekNum = i + 1;
    sCurveData.push({
      week: `Wk ${weekNum}`,
      date: ptDate.toISOString().split('T')[0],
      display_date: ptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      planned_pct: plannedPct,
      actual_pct: actualPct,
    });
  }

  // Milestone donut breakdown
  const milestoneDonut = [
    { name: 'Completed', value: completedTasks, color: '#16a34a' },
    { name: 'In Progress', value: inProgressTasks, color: '#0284c7' },
    { name: 'Pending', value: pendingTasks, color: '#94a3b8' },
    { name: 'Overdue', value: overdueTasks, color: '#dc2626' },
  ];

  // Defects priority donut breakdown
  const defectDonut = [
    { name: 'Critical', priority: 'critical', count: Number(issuesPriorityAgg?.critical) || 0, color: '#dc2626' },
    { name: 'High', priority: 'high', count: Number(issuesPriorityAgg?.high) || 0, color: '#ea580c' },
    { name: 'Medium', priority: 'medium', count: Number(issuesPriorityAgg?.medium) || 0, color: '#d97706' },
    { name: 'Low', priority: 'low', count: Number(issuesPriorityAgg?.low) || 0, color: '#16a34a' },
  ];

  const avgResolutionHours = parseFloat(resolvedTimes?.avg_resolution_hours) || 0;
  const avgResolutionDays = Number((avgResolutionHours / 24).toFixed(1));

  res.status(200).json({
    success: true,
    data: {
      project: {
        id: project.id,
        project_name: project.project_name,
        start_date: project.start_date,
        end_date: project.end_date,
      },
      s_curve_timeline: sCurveData,
      task_summary: {
        total: totalTasks,
        completed: completedTasks,
        in_progress: inProgressTasks,
        pending: pendingTasks,
        overdue: overdueTasks,
        overall_completion_percentage: effectiveActualPct,
      },
      milestone_donut: milestoneDonut,
      defect_breakdown: {
        total_open: Number(issuesPriorityAgg?.total_open) || 0,
        by_priority: defectDonut,
        resolved_count: Number(resolvedTimes?.resolved_count) || 0,
        avg_resolution_hours: avgResolutionHours,
        avg_resolution_days: avgResolutionDays,
      },
      weekly_attendance: weeklyAttendance.map((a) => {
        const dObj = a.date instanceof Date ? a.date : new Date(a.date);
        const isoDate = !isNaN(dObj) ? dObj.toISOString().split('T')[0] : String(a.date);
        return {
          date: isoDate,
          day: !isNaN(dObj) ? dObj.toLocaleDateString('en-US', { weekday: 'short' }) : '—',
          present: Number(a.present) || 0,
          absent: Number(a.absent) || 0,
          half_day: Number(a.half_day) || 0,
        };
      }),
      milestone_tasks: allTasks,
    },
  });
}

module.exports = {
  getMaterialAnalytics,
  getProgressAnalytics,
};
