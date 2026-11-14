'use strict';

const { db } = require('../config/database');

const TABLE = 'material_logs';

class MaterialLog {
  /**
   * Insert a log entry, optionally within a Knex transaction.
   */
  static async create(data, trx = null) {
    const query = (trx || db)(TABLE).insert({
      material_id: data.material_id,
      project_id: data.project_id,
      change_amount: data.change_amount,
      previous_quantity: data.previous_quantity,
      new_quantity: data.new_quantity,
      logged_by: data.logged_by || null,
      reason: data.reason || 'adjustment',
    }).returning('*');

    const [row] = await query;
    return row;
  }

  /**
   * Find recent logs for a material or project.
   */
  static async findByProjectId(projectId, { days = 30, limit = 100 } = {}) {
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return db(TABLE)
      .select(
        'material_logs.*',
        'materials.name as material_name',
        'materials.unit as material_unit',
        'users.name as logged_by_name'
      )
      .leftJoin('materials', 'material_logs.material_id', 'materials.id')
      .leftJoin('users', 'material_logs.logged_by', 'users.id')
      .where('material_logs.project_id', projectId)
      .where('material_logs.created_at', '>=', sinceDate)
      .orderBy('material_logs.created_at', 'desc')
      .limit(limit);
  }

  /**
   * Aggregate daily consumption and calculate projected runway for all materials in a project.
   */
  static async getAnalyticsByProject(projectId, { historyDays = 30 } = {}) {
    // 1. Fetch all materials in project
    const materials = await db('materials')
      .where('project_id', projectId)
      .orderBy('name', 'asc');

    if (materials.length === 0) {
      return {
        project_id: projectId,
        materials: [],
        critical_depletion_materials: [],
        timeline: [],
      };
    }

    const sinceDate = new Date(Date.now() - historyDays * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    // 2. Fetch all consumption records in the history window
    const logs = await db(TABLE)
      .where('project_id', projectId)
      .where('created_at', '>=', sinceDate)
      .orderBy('created_at', 'asc');

    // 3. Aggregate daily consumption per material
    // Map: material_id -> { dateStr: totalConsumed }
    const dailyMap = {};
    // 14-day consumption sum per material
    const fourteenDayConsumption = {};

    materials.forEach((m) => {
      dailyMap[m.id] = {};
      fourteenDayConsumption[m.id] = 0;
    });

    logs.forEach((log) => {
      if (log.change_amount < 0) {
        const consumed = Math.abs(log.change_amount);
        const dateStr = new Date(log.created_at).toISOString().split('T')[0];

        if (!dailyMap[log.material_id]) dailyMap[log.material_id] = {};
        dailyMap[log.material_id][dateStr] = (dailyMap[log.material_id][dateStr] || 0) + consumed;

        if (new Date(log.created_at) >= fourteenDaysAgo) {
          fourteenDayConsumption[log.material_id] = (fourteenDayConsumption[log.material_id] || 0) + consumed;
        }
      }
    });

    // 4. Generate daily timeline array (e.g. last 14 to 30 days)
    const timelineDates = [];
    for (let d = historyDays - 1; d >= 0; d--) {
      const dt = new Date(Date.now() - d * 24 * 60 * 60 * 1000);
      timelineDates.push(dt.toISOString().split('T')[0]);
    }

    const criticalList = [];

    const analyzedMaterials = materials.map((m) => {
      const consumed14d = fourteenDayConsumption[m.id] || 0;
      // Average daily burn rate = (Total units consumed in last 14 days) / 14
      const avgDailyBurnRate = Number((consumed14d / 14).toFixed(2));

      // Estimated days remaining = Current Quantity / Average Daily Burn Rate
      let estimatedDaysRemaining = null;
      let reachesZeroWithin7Days = false;

      if (avgDailyBurnRate > 0) {
        estimatedDaysRemaining = Math.max(0, Math.round(m.quantity / avgDailyBurnRate));
        if (estimatedDaysRemaining <= 7) {
          reachesZeroWithin7Days = true;
        }
      } else if (m.quantity <= m.minimum_stock) {
        reachesZeroWithin7Days = true;
        estimatedDaysRemaining = 0;
      }

      // Daily trend points for chart
      const dailyTrend = timelineDates.map((dateStr) => ({
        date: dateStr,
        consumed: dailyMap[m.id]?.[dateStr] || 0,
      }));

      const materialAnalysis = {
        id: m.id,
        name: m.name,
        quantity: m.quantity,
        unit: m.unit,
        minimum_stock: m.minimum_stock,
        is_low_stock: m.quantity <= m.minimum_stock,
        consumed_last_14_days: consumed14d,
        average_daily_burn_rate: avgDailyBurnRate,
        estimated_days_remaining: estimatedDaysRemaining,
        reaches_zero_within_7_days: reachesZeroWithin7Days,
        daily_consumption: dailyTrend,
      };

      if (reachesZeroWithin7Days) {
        criticalList.push(materialAnalysis);
      }

      return materialAnalysis;
    });

    return {
      project_id: projectId,
      analyzed_materials: analyzedMaterials,
      critical_depletion_materials: criticalList,
      timeline_dates: timelineDates,
    };
  }
}

module.exports = MaterialLog;

