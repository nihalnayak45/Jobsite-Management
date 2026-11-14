'use strict';

/**
 * Data access layer for `materials`.
 */
const { db } = require('../config/database');

const TABLE = 'materials';

async function findById(id) {
  return db(TABLE).select('*').where({ id }).first();
}

async function findByProjectId(projectId) {
  const rows = await db(TABLE)
    .select('*')
    .where({ project_id: projectId })
    .orderBy('name', 'asc');

  return rows.map((item) => ({
    ...item,
    is_low_stock: item.quantity <= item.minimum_stock,
  }));
}

async function findByProjectAndName(projectId, name) {
  return db(TABLE)
    .select('*')
    .where({ project_id: projectId })
    .whereRaw('LOWER(name) = ?', [name.trim().toLowerCase()])
    .first();
}

async function create(data) {
  const [material] = await db(TABLE).insert(data).returning('*');
  return {
    ...material,
    is_low_stock: material.quantity <= material.minimum_stock,
  };
}

async function updateQuantity(id, newQuantity, trx = null) {
  const knexClient = trx || db;
  const [updated] = await knexClient(TABLE)
    .where({ id })
    .update({
      quantity: newQuantity,
      updated_at: knexClient.fn.now(),
    })
    .returning('*');

  if (!updated) {
    return {
      id,
      quantity: newQuantity,
      is_low_stock: false,
    };
  }

  return {
    ...updated,
    is_low_stock: updated.quantity <= updated.minimum_stock,
  };
}

module.exports = {
  findById,
  findByProjectId,
  findByProjectAndName,
  create,
  updateQuantity,
};
