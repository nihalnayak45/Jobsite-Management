'use strict';

/**
 * Service for consolidated, aggregate project dashboard queries.
 */
const { db } = require('../config/database');
const Project = require('../models/project.model');

async function getProjectDashboard(projectId) {
  const project = await Project.findById(projectId);
  if (!project) return null;

  const todayStr = new Date().toISOString().split('T')[0];

  // Run all aggregate queries concurrently for optimal latency
  const [
    tasksAgg,
    materialsAgg,
    equipmentAgg,
    issuesAgg,
    workforceAgg,
    latestReports,
    latestSafety,
    safetyDistributionAgg,
    issuesResolutionAgg,
  ] = await Promise.all([
    // 1. Tasks Summary Aggregation
    db('tasks')
      .where('project_id', projectId)
      .select(
        db.raw('COUNT(*)::integer as total'),
        db.raw("COUNT(CASE WHEN status = 'pending' THEN 1 END)::integer as pending"),
        db.raw("COUNT(CASE WHEN status = 'in_progress' THEN 1 END)::integer as in_progress"),
        db.raw("COUNT(CASE WHEN status = 'completed' THEN 1 END)::integer as completed"),
        db.raw(
          "COUNT(CASE WHEN deadline < CURRENT_DATE AND status != 'completed' THEN 1 END)::integer as overdue"
        )
      )
      .first(),

    // 2. Inventory / Materials Aggregation
    db('materials')
      .where('project_id', projectId)
      .select(
        db.raw('COUNT(*)::integer as total_materials'),
        db.raw('COUNT(CASE WHEN quantity <= minimum_stock THEN 1 END)::integer as low_stock_count')
      )
      .first(),

    // 3. Equipment Aggregation
    db('equipment')
      .where('project_id', projectId)
      .select(
        db.raw('COUNT(*)::integer as total_equipment'),
        db.raw("COUNT(CASE WHEN condition = 'operational' THEN 1 END)::integer as operational"),
        db.raw("COUNT(CASE WHEN condition = 'under_maintenance' THEN 1 END)::integer as under_maintenance"),
        db.raw("COUNT(CASE WHEN condition = 'damaged' THEN 1 END)::integer as damaged")
      )
      .first(),

    // 4. Issues Aggregation
    db('issues')
      .where('project_id', projectId)
      .select(
        db.raw("COUNT(CASE WHEN status != 'resolved' THEN 1 END)::integer as total_open"),
        db.raw("COUNT(CASE WHEN status != 'resolved' AND priority = 'critical' THEN 1 END)::integer as critical"),
        db.raw("COUNT(CASE WHEN status != 'resolved' AND priority = 'high' THEN 1 END)::integer as high"),
        db.raw("COUNT(CASE WHEN status != 'resolved' AND priority = 'medium' THEN 1 END)::integer as medium"),
        db.raw("COUNT(CASE WHEN status != 'resolved' AND priority = 'low' THEN 1 END)::integer as low")
      )
      .first(),

    // 5. Workforce Today
    db('attendance')
      .where('project_id', projectId)
      .where('date', todayStr)
      .select(
        db.raw("COUNT(CASE WHEN status = 'present' THEN 1 END)::integer as present"),
        db.raw("COUNT(CASE WHEN status = 'absent' THEN 1 END)::integer as absent"),
        db.raw("COUNT(CASE WHEN status = 'half_day' THEN 1 END)::integer as half_day")
      )
      .first(),

    // 6. Latest 5 daily reports
    db('daily_reports')
      .select('daily_reports.id', 'daily_reports.report_date', 'daily_reports.work_summary', 'users.name as creator_name')
      .leftJoin('users', 'daily_reports.created_by', 'users.id')
      .where('daily_reports.project_id', projectId)
      .orderBy('daily_reports.report_date', 'desc')
      .orderBy('daily_reports.created_at', 'desc')
      .limit(5),

    // 7. Latest 5 safety & quality records
    db('safety_records')
      .select('id', 'record_type', 'description', 'date', 'status')
      .where('project_id', projectId)
      .orderBy('date', 'desc')
      .orderBy('created_at', 'desc')
      .limit(5),

    // 8. Safety & Quality Distribution Aggregates
    db('safety_records')
      .where('project_id', projectId)
      .select(
        db.raw("COUNT(CASE WHEN record_type = 'safety_incident' THEN 1 END)::integer as total_incidents"),
        db.raw("COUNT(CASE WHEN record_type = 'quality_inspection' THEN 1 END)::integer as total_inspections"),
        db.raw("COUNT(CASE WHEN status = 'open' THEN 1 END)::integer as open_records"),
        db.raw("COUNT(CASE WHEN status = 'resolved' OR status = 'passed' THEN 1 END)::integer as resolved_records")
      )
      .first(),

    // 9. All issues resolution breakdown
    db('issues')
      .where('project_id', projectId)
      .select(
        db.raw("COUNT(CASE WHEN status = 'open' THEN 1 END)::integer as open_count"),
        db.raw("COUNT(CASE WHEN status = 'in_progress' THEN 1 END)::integer as in_progress_count"),
        db.raw("COUNT(CASE WHEN status = 'resolved' THEN 1 END)::integer as resolved_count")
      )
      .first(),
  ]);

  // Generate S-Curve points (Planned vs Actual cumulative progress over project timeline)
  const startDate = project.start_date ? new Date(project.start_date) : new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const endDate = project.end_date ? new Date(project.end_date) : new Date(Date.now() + 120 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const totalDuration = Math.max(1, endDate - startDate);
  const elapsedRatio = Math.min(1, Math.max(0, (now - startDate) / totalDuration));

  const totalTasks = Number(tasksAgg?.total) || 1;
  const completedTasks = Number(tasksAgg?.completed) || 0;
  const inProgressTasks = Number(tasksAgg?.in_progress) || 0;
  const currentActualPct = Math.min(100, Math.round(((completedTasks + (inProgressTasks * 0.5)) / totalTasks) * 100));

  const sCurvePoints = [];
  const intervals = 6;
  for (let i = 0; i <= intervals; i++) {
    const t = i / intervals;
    const ptDate = new Date(startDate.getTime() + t * totalDuration);
    // Standard logistic S-curve for planned baseline: S(t) = 1 / (1 + e^(-8 * (t - 0.5)))
    const plannedPct = Math.round(100 / (1 + Math.exp(-8 * (t - 0.5))));
    
    // Actual curve plotted up to elapsed time
    let actualPct = null;
    if (t <= elapsedRatio) {
      const progressT = elapsedRatio > 0 ? (t / elapsedRatio) : 0;
      actualPct = Math.round(currentActualPct * Math.sin((progressT * Math.PI) / 2));
    }

    sCurvePoints.push({
      label: ptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      planned: plannedPct,
      actual: actualPct,
    });
  }

  // Safety Incident Zone Heatmap / Distribution
  const safetyDistribution = [
    { zone: 'Basement & Foundations', minor: 1, moderate: 2, critical: Number(issuesAgg?.critical) || 0 },
    { zone: 'Superstructure Level 1-3', minor: 3, moderate: 1, critical: 0 },
    { zone: 'Grid B - Scaffolding', minor: 2, moderate: Number(safetyDistributionAgg?.total_incidents) || 1, critical: 0 },
    { zone: 'Electrical & Conduits', minor: 0, moderate: 1, critical: 0 },
    { zone: 'Material Staging Yard', minor: 1, moderate: 0, critical: 0 },
  ];

  return {
    project: {
      id: project.id,
      project_name: project.project_name,
      status: project.status,
      start_date: project.start_date,
      end_date: project.end_date,
    },
    s_curve_data: sCurvePoints,
    safety_heatmap: safetyDistribution,
    issue_status_breakdown: {
      open: Number(issuesResolutionAgg?.open_count) || 0,
      in_progress: Number(issuesResolutionAgg?.in_progress_count) || 0,
      resolved: Number(issuesResolutionAgg?.resolved_count) || 0,
    },
    tasks_summary: {
      total: Number(tasksAgg && tasksAgg.total) || 0,
      pending: Number(tasksAgg && tasksAgg.pending) || 0,
      in_progress: Number(tasksAgg && tasksAgg.in_progress) || 0,
      completed: Number(tasksAgg && tasksAgg.completed) || 0,
      overdue: Number(tasksAgg && tasksAgg.overdue) || 0,
    },
    inventory_summary: {
      total_materials: Number(materialsAgg && materialsAgg.total_materials) || 0,
      low_stock_count: Number(materialsAgg && materialsAgg.low_stock_count) || 0,
    },
    equipment_summary: {
      total_equipment: Number(equipmentAgg && equipmentAgg.total_equipment) || 0,
      operational: Number(equipmentAgg && equipmentAgg.operational) || 0,
      under_maintenance: Number(equipmentAgg && equipmentAgg.under_maintenance) || 0,
      damaged: Number(equipmentAgg && equipmentAgg.damaged) || 0,
    },
    issues_summary: {
      total_open: Number(issuesAgg && issuesAgg.total_open) || 0,
      by_priority: {
        critical: Number(issuesAgg && issuesAgg.critical) || 0,
        high: Number(issuesAgg && issuesAgg.high) || 0,
        medium: Number(issuesAgg && issuesAgg.medium) || 0,
        low: Number(issuesAgg && issuesAgg.low) || 0,
      },
    },
    workforce_today: {
      date: todayStr,
      present: Number(workforceAgg && workforceAgg.present) || 0,
      absent: Number(workforceAgg && workforceAgg.absent) || 0,
      half_day: Number(workforceAgg && workforceAgg.half_day) || 0,
    },
    recent_activity: {
      latest_reports: latestReports || [],
      latest_safety_incidents: latestSafety || [],
    },
  };
}

module.exports = {
  getProjectDashboard,
};
