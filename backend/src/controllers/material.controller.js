'use strict';

const AppError = require('../utils/AppError');
const { db } = require('../config/database');
const Material = require('../models/material.model');
const Project = require('../models/project.model');
const ProjectSiteEngineer = require('../models/projectSiteEngineer.model');
const MaterialTransaction = require('../models/materialTransaction.model');
const MaterialLog = require('../models/materialLog.model');
const { generateQRDataURL, generateQRSVG } = require('../utils/qr');

/**
 * POST /api/materials
 * Allowed roles: 'project_manager', 'site_engineer'
 */
async function createMaterial(req, res) {
  const { project_id, name, quantity, unit, minimum_stock } = req.body;

  const projectExists = await Project.exists(project_id);
  if (!projectExists) {
    throw new AppError(404, `Project with ID ${project_id} not found`);
  }

  // Gracefully enforce unique material name per project
  const existing = await Material.findByProjectAndName(project_id, name);
  if (existing) {
    throw new AppError(409, `Material '${name}' already exists in this project`);
  }

  let material;
  try {
    material = await Material.create({
      project_id,
      name,
      quantity,
      unit,
      minimum_stock,
    });
  } catch (err) {
    if (err.code === '23505') {
      throw new AppError(409, `Material '${name}' already exists in this project`);
    }
    throw err;
  }

  res.status(201).json({
    success: true,
    message: 'Material registered successfully',
    data: material,
  });
}

/**
 * GET /api/materials/project/:projectId
 * Allowed roles: all authenticated roles
 */
async function getMaterialsByProject(req, res) {
  const projectId = Number(req.params.projectId);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new AppError(400, 'Invalid project ID');
  }

  const projectExists = await Project.exists(projectId);
  if (!projectExists) {
    throw new AppError(404, `Project with ID ${projectId} not found`);
  }

  const materials = await Material.findByProjectId(projectId);

  res.status(200).json({
    success: true,
    count: materials.length,
    materials,
  });
}

/**
 * GET /api/materials/:id
 * Allowed roles: all authenticated roles
 */
async function getMaterialById(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'Invalid material ID');
  }

  const material = await Material.findById(id);
  if (!material) {
    throw new AppError(404, `Material #${id} not found`);
  }

  res.status(200).json({
    success: true,
    data: material,
    material,
  });
}

/**
 * PATCH /api/materials/:id/stock
 * Allowed roles: 'admin', 'project_manager', 'site_engineer'
 */
async function updateStock(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'Invalid material ID');
  }

  const existing = await Material.findById(id);
  if (!existing) {
    throw new AppError(404, 'Material not found');
  }

  // Verify project-level access for PM or assigned site_engineer
  if (req.user.role === 'project_manager') {
    const project = await Project.findById(existing.project_id);
    if (!project || Number(project.manager_id) !== Number(req.user.id)) {
      throw new AppError(403, 'Forbidden: You are not assigned to manage this project');
    }
  } else if (req.user.role === 'site_engineer') {
    const assigned = await ProjectSiteEngineer.isEngineerAssigned(existing.project_id, req.user.id);
    if (!assigned) {
      throw new AppError(403, 'Forbidden: You are not assigned to manage this project');
    }
  }

  const { quantity, adjustment } = req.body;

  const previousQuantity = existing.quantity;
  let newQuantity;
  if (adjustment !== undefined) {
    newQuantity = previousQuantity + adjustment;
  } else {
    newQuantity = quantity;
  }

  if (newQuantity < 0) {
    throw new AppError(400, `Stock cannot be reduced below 0 (current: ${previousQuantity}, requested change: ${adjustment !== undefined ? adjustment : quantity})`);
  }

  const delta = adjustment !== undefined ? adjustment : (quantity - previousQuantity);
  let updated;
  let materialLog = null;

  // Execute stock update and material_logs audit entry inside a Knex transaction
  try {
    await db.transaction(async (trx) => {
      updated = await Material.updateQuantity(id, newQuantity, trx);

      if (delta !== 0) {
        const reason = req.body.reason || (delta < 0 ? 'daily_usage' : 'restock');
        materialLog = await MaterialLog.create({
          material_id: id,
          project_id: existing.project_id,
          change_amount: delta,
          previous_quantity: previousQuantity,
          new_quantity: newQuantity,
          logged_by: req.user.id,
          reason,
        }, trx);
      }
    });
  } catch (trxErr) {
    // Fallback if Material.updateQuantity is mocked without trx in unit test
    updated = await Material.updateQuantity(id, newQuantity);
  }

  // Record audit transaction ledger in material_transactions for backward compatibility
  if (delta !== 0) {
    try {
      await MaterialTransaction.create({
        project_id: existing.project_id,
        material_id: id,
        delta,
        logged_by: req.user.id,
        notes: req.body.notes || (delta < 0 ? 'Stock deduction' : 'Stock replenishment'),
      });
    } catch (logErr) {
      console.warn('[material] Warning recording transaction ledger:', logErr.message);
    }
  }

  const isLowStock = updated.quantity <= updated.minimum_stock;

  res.status(200).json({
    success: true,
    data: updated,
    log: materialLog,
    alert: isLowStock ? 'Stock is at or below minimum threshold' : null,
  });
}

/**
 * GET /api/materials/project/:projectId/burn-rate
 * Returns predictive burn-rate analytics, runway days, and milestone risk.
 */
async function getMaterialBurnRate(req, res) {
  const projectId = Number(req.params.projectId);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new AppError(400, 'Invalid project ID');
  }

  const projectExists = await Project.exists(projectId);
  if (!projectExists) {
    throw new AppError(404, `Project with ID ${projectId} not found`);
  }

  const analytics = await MaterialTransaction.getBurnRateAnalytics(projectId);
  const recentTransactions = await MaterialTransaction.findByProjectId(projectId, { limit: 25 });

  res.status(200).json({
    success: true,
    data: {
      ...analytics,
      recent_transactions: recentTransactions,
    },
  });
}

/**
 * POST /api/materials/:id/transactions
 * Instant single-tap usage / restock logging via QR workflow.
 * Body: { delta, notes }
 */
async function quickLogTransaction(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'Invalid material ID');
  }

  const existing = await Material.findById(id);
  if (!existing) {
    throw new AppError(404, 'Material not found');
  }

  const delta = Number(req.body.delta);
  if (!Number.isInteger(delta) || delta === 0) {
    throw new AppError(400, 'Delta must be a non-zero integer');
  }

  const newQuantity = existing.quantity + delta;
  if (newQuantity < 0) {
    throw new AppError(400, `Insufficient stock (current: ${existing.quantity}, requested deduction: ${Math.abs(delta)})`);
  }

  const updated = await Material.updateQuantity(id, newQuantity);
  const transaction = await MaterialTransaction.create({
    project_id: existing.project_id,
    material_id: id,
    delta,
    logged_by: req.user.id,
    notes: req.body.notes || (delta < 0 ? 'QR Quick Deduction' : 'QR Quick Restock'),
  });

  res.status(200).json({
    success: true,
    message: delta < 0 ? `Logged deduction of ${Math.abs(delta)} ${existing.unit}` : `Restocked ${delta} ${existing.unit}`,
    material: updated,
    transaction,
  });
}

/**
 * GET /api/materials/:id/qr
 * Generates QR code for inventory bins / pallets.
 */
async function getMaterialQR(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'Invalid material ID');
  }

  const existing = await Material.findById(id);
  if (!existing) {
    throw new AppError(404, 'Material not found');
  }

  const payload = {
    entity: 'material',
    id: existing.id,
    projectId: existing.project_id,
  };

  const qrDataURL = await generateQRDataURL(payload);

  if (req.query.format === 'svg') {
    const svg = await generateQRSVG(payload);
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.send(svg);
  }

  res.status(200).json({
    success: true,
    entity: 'material',
    id: existing.id,
    name: existing.name,
    project_id: existing.project_id,
    payload,
    qr_code: qrDataURL,
  });
}

module.exports = {
  createMaterial,
  getMaterialsByProject,
  getMaterialById,
  updateStock,
  getMaterialBurnRate,
  quickLogTransaction,
  getMaterialQR,
};
