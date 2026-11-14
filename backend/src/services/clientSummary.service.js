'use strict';

/**
 * Service for sanitized Client Progress Summary.
 * Strips all internal workforce identities and contractor details.
 */
const { db } = require('../config/database');
const Project = require('../models/project.model');

async function getClientProgressSummary(projectId) {
  const project = await Project.findById(projectId);
  if (!project) return null;

  // Run progress aggregations
  const [taskStats, dailyReports, qualityRecords, safetyIncidents] = await Promise.all([
    // Tasks progress
    db('tasks')
      .where('project_id', projectId)
      .select(
        db.raw('COUNT(*)::integer as total_tasks'),
        db.raw("COUNT(CASE WHEN status = 'completed' THEN 1 END)::integer as completed_tasks"),
        db.raw("COUNT(CASE WHEN status = 'in_progress' THEN 1 END)::integer as in_progress_tasks"),
        db.raw("COUNT(CASE WHEN status = 'pending' THEN 1 END)::integer as pending_tasks"),
        db.raw('COALESCE(AVG(completion_percentage), 0)::numeric(5, 2) as avg_completion_percentage')
      )
      .first(),

    // Recent daily site updates (work summaries only; no internal workforce breakdown)
    db('daily_reports')
      .where('project_id', projectId)
      .select('id', 'report_date', 'work_summary')
      .orderBy('report_date', 'desc')
      .limit(10),

    // Quality inspections
    db('safety_records')
      .where('project_id', projectId)
      .where('record_type', 'quality_inspection')
      .select('id', 'description', 'date', 'status')
      .orderBy('date', 'desc')
      .limit(10),

    // Safety incident count
    db('safety_records')
      .where('project_id', projectId)
      .where('record_type', 'safety_incident')
      .select(db.raw('COUNT(*)::integer as total_incidents'))
      .first(),
  ]);

  const totalTasks = Number(taskStats && taskStats.total_tasks) || 0;
  const completedTasks = Number(taskStats && taskStats.completed_tasks) || 0;
  const inProgressTasks = Number(taskStats && taskStats.in_progress_tasks) || 0;
  const pendingTasks = Number(taskStats && taskStats.pending_tasks) || 0;
  const overallPercentage = parseFloat(taskStats && taskStats.avg_completion_percentage) || 0;

  // Generate S-Curve points for client timeline visualization
  const startDate = project.start_date ? new Date(project.start_date) : new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const endDate = project.end_date ? new Date(project.end_date) : new Date(Date.now() + 120 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const totalDuration = Math.max(1, endDate - startDate);
  const elapsedRatio = Math.min(1, Math.max(0, (now - startDate) / totalDuration));

  const sCurvePoints = [];
  const intervals = 6;
  for (let i = 0; i <= intervals; i++) {
    const t = i / intervals;
    const ptDate = new Date(startDate.getTime() + t * totalDuration);
    const plannedPct = Math.round(100 / (1 + Math.exp(-8 * (t - 0.5))));
    let actualPct = null;
    if (t <= elapsedRatio) {
      const progressT = elapsedRatio > 0 ? (t / elapsedRatio) : 0;
      actualPct = Math.round(overallPercentage * Math.sin((progressT * Math.PI) / 2));
    }
    sCurvePoints.push({
      label: ptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      planned: plannedPct,
      actual: actualPct,
    });
  }

  return {
    project: {
      id: project.id,
      project_name: project.project_name,
      status: project.status,
      location: project.location,
      start_date: project.start_date,
      end_date: project.end_date,
      manager_name: project.manager_name || null,
    },
    s_curve_data: sCurvePoints,
    progress: {
      overall_completion_percentage: overallPercentage,
      milestones: {
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        in_progress_tasks: inProgressTasks,
        pending_tasks: pendingTasks,
      },
    },
    site_updates: (dailyReports || []).map((r) => ({
      id: r.id,
      report_date: r.report_date,
      work_summary: r.work_summary,
    })),
    quality_and_safety: {
      total_quality_inspections: qualityRecords ? qualityRecords.length : 0,
      recent_inspections: qualityRecords || [],
      safety_incidents_recorded: Number(safetyIncidents && safetyIncidents.total_incidents) || 0,
    },
  };
}

module.exports = {
  getClientProgressSummary,
};
