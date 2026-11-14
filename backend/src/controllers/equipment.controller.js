'use strict';

const AppError = require('../utils/AppError');
const Equipment = require('../models/equipment.model');
const Project = require('../models/project.model');
const EquipmentLog = require('../models/equipmentLog.model');
const { generateQRDataURL, generateQRSVG } = require('../utils/qr');

/**
 * POST /api/equipment
 * Allowed roles: 'admin', 'project_manager', 'site_engineer'
 */
async function createEquipment(req, res) {
  const { project_id, name, availability, condition } = req.body;

  const projectExists = await Project.exists(project_id);
  if (!projectExists) {
    throw new AppError(404, `Project with ID ${project_id} not found`);
  }

  const equipment = await Equipment.create({
    project_id,
    name,
    availability,
    condition,
  });

  res.status(201).json({
    success: true,
    message: 'Equipment registered successfully',
    equipment,
  });
}

/**
 * GET /api/equipment/project/:projectId
 * Allowed roles: all authenticated roles
 * Filters: ?condition=...&availability=...
 */
async function getEquipmentByProject(req, res) {
  const projectId = Number(req.params.projectId);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new AppError(400, 'Invalid project ID');
  }

  const projectExists = await Project.exists(projectId);
  if (!projectExists) {
    throw new AppError(404, `Project with ID ${projectId} not found`);
  }

  const { condition, availability } = req.query;

  let parsedAvailability = undefined;
  if (availability !== undefined && availability !== null && availability !== '') {
    if (['true', '1'].includes(String(availability).toLowerCase())) {
      parsedAvailability = true;
    } else if (['false', '0'].includes(String(availability).toLowerCase())) {
      parsedAvailability = false;
    }
  }

  const equipment = await Equipment.findByProjectId(projectId, {
    condition,
    availability: parsedAvailability,
  });

  res.status(200).json({
    success: true,
    count: equipment.length,
    equipment,
  });
}

/**
 * PATCH /api/equipment/:id
 * Allowed roles: 'admin', 'project_manager', 'site_engineer'
 */
async function updateEquipment(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'Invalid equipment ID');
  }

  const existing = await Equipment.findById(id);
  if (!existing) {
    throw new AppError(404, 'Equipment not found');
  }

  const updated = await Equipment.update(id, req.body);

  res.status(200).json({
    success: true,
    message: 'Equipment updated successfully',
    equipment: updated,
  });
}

/**
 * GET /api/equipment/:id
 * Allowed roles: all authenticated roles
 */
async function getEquipmentById(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'Invalid equipment ID');
  }

  const equipment = await Equipment.findById(id);
  if (!equipment) {
    throw new AppError(404, 'Equipment not found');
  }

  const logs = await EquipmentLog.findByEquipmentId(id, 10);

  res.status(200).json({
    success: true,
    equipment,
    recent_logs: logs,
  });
}

/**
 * POST /api/equipment/:id/toggle-checkout
 * Single-tap QR checkout / check-in for workers & site engineers.
 * Allowed roles: 'project_manager', 'site_engineer', 'worker'
 */
async function toggleCheckout(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'Invalid equipment ID');
  }

  const existing = await Equipment.findById(id);
  if (!existing) {
    throw new AppError(404, 'Equipment not found');
  }

  const isCheckingOut = existing.availability === true;
  const newAvailability = !existing.availability;
  const action = isCheckingOut ? 'check_out' : 'check_in';

  const updated = await Equipment.update(id, { availability: newAvailability });
  const log = await EquipmentLog.create({
    equipment_id: id,
    project_id: existing.project_id,
    user_id: req.user.id,
    action,
    notes: req.body.notes || (isCheckingOut ? `Checked out by ${req.user.name}` : `Checked in by ${req.user.name}`),
  });

  res.status(200).json({
    success: true,
    message: isCheckingOut
      ? `Equipment '${existing.name}' checked out successfully`
      : `Equipment '${existing.name}' checked in and marked available`,
    equipment: updated,
    action,
    log,
  });
}

/**
 * GET /api/equipment/:id/qr
 * Generates QR code for equipment asset tag.
 */
async function getEquipmentQR(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'Invalid equipment ID');
  }

  const existing = await Equipment.findById(id);
  if (!existing) {
    throw new AppError(404, 'Equipment not found');
  }

  const payload = {
    entity: 'equipment',
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
    entity: 'equipment',
    id: existing.id,
    name: existing.name,
    project_id: existing.project_id,
    payload,
    qr_code: qrDataURL,
  });
}

module.exports = {
  createEquipment,
  getEquipmentByProject,
  getEquipmentById,
  updateEquipment,
  toggleCheckout,
  getEquipmentQR,
};
