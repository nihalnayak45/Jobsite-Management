'use strict';

const AppError = require('../utils/AppError');
const { db } = require('../config/database');
const Material = require('../models/material.model');
const Equipment = require('../models/equipment.model');
const MaterialLog = require('../models/materialLog.model');
const MaterialTransaction = require('../models/materialTransaction.model');
const EquipmentLog = require('../models/equipmentLog.model');
const ProjectSiteEngineer = require('../models/projectSiteEngineer.model');

/**
 * POST /api/scan/action
 * Handles quick-actions triggered from QR code scanning.
 * - Materials: Rapid stock decrement/increment (restricted to project_manager & site_engineer)
 * - Equipment: Availability toggle (check-out / return) or condition update (open to worker, site_engineer, project_manager)
 */
async function handleScanAction(req, res) {
  const { entity, id, adjustment, action, condition, notes, reason } = req.body;

  if (!entity || !id) {
    throw new AppError(400, "Both 'entity' ('material' | 'equipment') and 'id' are required");
  }

  const itemId = Number(id);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    throw new AppError(400, 'Invalid item ID');
  }

  // ==========================================
  // 1. MATERIAL QUICK ACTION
  // ==========================================
  if (entity === 'material') {
    // RBAC: Workers and Clients cannot modify stock
    if (req.user.role === 'worker' || req.user.role === 'client') {
      throw new AppError(403, 'Forbidden: Only Project Managers and Site Engineers can adjust material stock via QR scan');
    }

    const material = await Material.findById(itemId);
    if (!material) {
      throw new AppError(404, `Material #${itemId} not found`);
    }

    // Project-level access check for Site Engineer
    if (req.user.role === 'site_engineer') {
      const assigned = await ProjectSiteEngineer.isEngineerAssigned(material.project_id, req.user.id);
      if (!assigned) {
        throw new AppError(403, 'Forbidden: You are not assigned to manage this project');
      }
    }

    const delta = Number(adjustment);
    if (!Number.isInteger(delta) || delta === 0) {
      throw new AppError(400, "Field 'adjustment' must be a non-zero integer (e.g., -5, 10)");
    }

    const previousQuantity = material.quantity;
    const newQuantity = previousQuantity + delta;
    if (newQuantity < 0) {
      throw new AppError(400, `Stock cannot be reduced below 0 (current: ${previousQuantity}, requested change: ${delta})`);
    }

    let updatedMaterial;
    let logRecord;

    await db.transaction(async (trx) => {
      // 1. Update quantity
      const [row] = await trx('materials')
        .where({ id: itemId })
        .update({ quantity: newQuantity, updated_at: trx.fn.now() })
        .returning('*');

      updatedMaterial = {
        ...row,
        is_low_stock: row.quantity <= row.minimum_stock,
      };

      // 2. Insert into material_logs
      const logReason = reason || (delta < 0 ? 'daily_usage' : 'restock');
      logRecord = await MaterialLog.create({
        material_id: itemId,
        project_id: material.project_id,
        change_amount: delta,
        previous_quantity: previousQuantity,
        new_quantity: newQuantity,
        logged_by: req.user.id,
        reason: logReason,
      }, trx);
    });

    // Also record into material_transactions ledger
    try {
      await MaterialTransaction.create({
        project_id: material.project_id,
        material_id: itemId,
        delta,
        logged_by: req.user.id,
        notes: notes || (delta < 0 ? `QR Scan deduction (${delta})` : `QR Scan restock (+${delta})`),
      });
    } catch (e) {
      console.warn('[scan] Note: material_transactions record error', e.message);
    }

    return res.status(200).json({
      success: true,
      message: delta < 0
        ? `Successfully consumed ${Math.abs(delta)} ${material.unit} of ${material.name}`
        : `Successfully restocked ${delta} ${material.unit} of ${material.name}`,
      entity: 'material',
      material: updatedMaterial,
      log: logRecord,
    });
  }

  // ==========================================
  // 2. EQUIPMENT QUICK ACTION
  // ==========================================
  if (entity === 'equipment') {
    if (req.user.role === 'client') {
      throw new AppError(403, 'Forbidden: Clients cannot operate equipment check-out');
    }

    const equipment = await Equipment.findById(itemId);
    if (!equipment) {
      throw new AppError(404, `Equipment #${itemId} not found`);
    }

    // Project-level access check for Site Engineer
    if (req.user.role === 'site_engineer') {
      const assigned = await ProjectSiteEngineer.isEngineerAssigned(equipment.project_id, req.user.id);
      if (!assigned) {
        throw new AppError(403, 'Forbidden: You are not assigned to manage this project');
      }
    }

    let updatedEquipment = equipment;
    let equipmentAction = action || 'toggle';
    let newAvailability = equipment.availability;

    // Handle toggle / check_out / check_in
    if (equipmentAction === 'toggle' || equipmentAction === 'check_out' || equipmentAction === 'check_in') {
      if (equipmentAction === 'toggle') {
        newAvailability = !equipment.availability;
        equipmentAction = equipment.availability ? 'check_out' : 'check_in';
      } else if (equipmentAction === 'check_out') {
        newAvailability = false;
      } else if (equipmentAction === 'check_in') {
        newAvailability = true;
      }

      updatedEquipment = await Equipment.update(itemId, { availability: newAvailability });
    }

    // Handle condition update (e.g. reporting maintenance)
    if (condition) {
      const validConditions = ['operational', 'under_maintenance', 'damaged'];
      if (!validConditions.includes(condition)) {
        throw new AppError(400, `Invalid condition. Must be one of: ${validConditions.join(', ')}`);
      }
      updatedEquipment = await Equipment.update(itemId, { condition });
    }

    // Insert equipment_logs audit entry
    const log = await EquipmentLog.create({
      equipment_id: itemId,
      project_id: equipment.project_id,
      user_id: req.user.id,
      action: equipmentAction,
      notes: notes || (equipmentAction === 'check_out'
        ? `Checked out via QR scan by ${req.user.name || req.user.email}`
        : `Checked in via QR scan by ${req.user.name || req.user.email}`),
    });

    return res.status(200).json({
      success: true,
      message: equipmentAction === 'check_out'
        ? `Equipment '${equipment.name}' checked out successfully`
        : `Equipment '${equipment.name}' checked in and marked available`,
      entity: 'equipment',
      equipment: updatedEquipment,
      action: equipmentAction,
      log,
    });
  }

  throw new AppError(400, `Unsupported entity type: '${entity}'. Supported types: 'material', 'equipment'`);
}

module.exports = {
  handleScanAction,
};

