'use strict';

const { db } = require('../config/database');

const TABLE = 'equipment_logs';

/**
 * Logs an equipment checkout or check-in action.
 */
async function create({ equipment_id, project_id, user_id, action, notes = null }) {
  const [record] = await db(TABLE)
    .insert({
      equipment_id,
      project_id,
      user_id,
      action,
      notes,
    })
    .returning('*');
  return record;
}

/**
 * Gets recent logs for an equipment item with user info.
 */
async function findByEquipmentId(equipmentId, limit = 20) {
  return db(TABLE)
    .select('equipment_logs.*', 'users.name as user_name', 'users.role as user_role')
    .join('users', 'equipment_logs.user_id', 'users.id')
    .where('equipment_logs.equipment_id', equipmentId)
    .orderBy('equipment_logs.created_at', 'desc')
    .limit(limit);
}

module.exports = {
  create,
  findByEquipmentId,
};

