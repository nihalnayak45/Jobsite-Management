'use strict';

const { db } = require('../config/database');

const TABLE = 'material_transactions';

/**
 * Logs a material delta transaction (consumption or restock).
 */
async function create({ project_id, material_id, delta, logged_by, notes = null }) {
  const [record] = await db(TABLE)
    .insert({
      project_id,
      material_id,
      delta,
      logged_by,
      notes,
    })
    .returning('*');
  return record;
}

/**
 * Returns recent transactions for a project with material and user names.
 */
async function findByProjectId(projectId, { limit = 50 } = {}) {
  return db(TABLE)
    .select(
      'material_transactions.*',
      'materials.name as material_name',
      'materials.unit',
      'users.name as logged_by_name'
    )
    .join('materials', 'material_transactions.material_id', 'materials.id')
    .join('users', 'material_transactions.logged_by', 'users.id')
    .where('material_transactions.project_id', projectId)
    .orderBy('material_transactions.created_at', 'desc')
    .limit(limit);
}

/**
 * Computes predictive burn rate & runway days for all materials in a project.
 */
async function getBurnRateAnalytics(projectId) {
  // 1. Get all materials in this project
  const materials = await db('materials')
    .select('*')
    .where({ project_id: projectId })
    .orderBy('name', 'asc');

  if (materials.length === 0) {
    return { materials: [], summary: { critical_count: 0, next_milestone: null } };
  }

  // 2. Find nearest upcoming task milestone deadline
  const todayStr = new Date().toISOString().split('T')[0];
  const nextTask = await db('tasks')
    .select('id', 'title', 'deadline')
    .where('project_id', projectId)
    .whereIn('status', ['pending', 'in_progress'])
    .whereNotNull('deadline')
    .where('deadline', '>=', todayStr)
    .orderBy('deadline', 'asc')
    .first();

  let daysToMilestone = null;
  if (nextTask && nextTask.deadline) {
    const diffMs = new Date(nextTask.deadline) - new Date();
    daysToMilestone = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  // 3. Aggregate 14-day consumption per material
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const consumptionAgg = await db(TABLE)
    .select('material_id')
    .sum('delta as net_delta')
    .where('project_id', projectId)
    .where('delta', '<', 0) // only consumption
    .where('created_at', '>=', fourteenDaysAgo)
    .groupBy('material_id');

  const consumptionMap = {};
  consumptionAgg.forEach((r) => {
    consumptionMap[r.material_id] = Math.abs(Number(r.net_delta) || 0);
  });

  let criticalCount = 0;

  const analyzedMaterials = materials.map((m) => {
    const totalConsumed = consumptionMap[m.id] || 0;
    // Daily average over 14 days window (or minimum default for demo if zero)
    const avgDailyBurn = totalConsumed > 0 ? Number((totalConsumed / 14).toFixed(1)) : 0;
    
    let runwayDays = null;
    let isCritical = false;

    if (avgDailyBurn > 0) {
      runwayDays = Math.max(0, Math.round(m.quantity / avgDailyBurn));
      if (runwayDays <= 3 || (daysToMilestone && runwayDays < daysToMilestone)) {
        isCritical = true;
        criticalCount++;
      }
    } else if (m.quantity <= m.minimum_stock) {
      isCritical = true;
      criticalCount++;
    }

    return {
      id: m.id,
      name: m.name,
      quantity: m.quantity,
      unit: m.unit,
      minimum_stock: m.minimum_stock,
      total_consumed_14d: totalConsumed,
      avg_daily_burn: avgDailyBurn,
      runway_days: runwayDays,
      is_critical: isCritical,
      next_milestone_target: nextTask ? nextTask.title : null,
      days_to_milestone: daysToMilestone,
    };
  });

  return {
    materials: analyzedMaterials,
    summary: {
      critical_count: criticalCount,
      next_milestone: nextTask || null,
      days_to_milestone: daysToMilestone,
    },
  };
}

module.exports = {
  create,
  findByProjectId,
  getBurnRateAnalytics,
};

