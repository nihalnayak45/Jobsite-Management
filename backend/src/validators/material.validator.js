'use strict';

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

function validateCreateMaterial(body) {
  const errors = [];
  const { project_id, name, quantity, unit, minimum_stock } = body;

  const parsedProjectId = Number(project_id);
  if (!Number.isInteger(parsedProjectId) || parsedProjectId <= 0) {
    errors.push({ field: 'project_id', message: 'Project ID is required and must be a positive integer' });
  }

  if (!isNonEmptyString(name)) {
    errors.push({ field: 'name', message: 'Material name is required' });
  } else if (name.trim().length > 150) {
    errors.push({ field: 'name', message: 'Material name must not exceed 150 characters' });
  }

  let validQuantity = 0;
  if (quantity !== undefined && quantity !== null && quantity !== '') {
    const parsedQty = Number(quantity);
    if (!Number.isInteger(parsedQty) || parsedQty < 0) {
      errors.push({ field: 'quantity', message: 'Quantity must be an integer greater than or equal to 0' });
    } else {
      validQuantity = parsedQty;
    }
  }

  if (!isNonEmptyString(unit)) {
    errors.push({ field: 'unit', message: 'Unit is required (e.g. kg, bags, tons, m3)' });
  } else if (unit.trim().length > 30) {
    errors.push({ field: 'unit', message: 'Unit must not exceed 30 characters' });
  }

  let validMinStock = 0;
  if (minimum_stock !== undefined && minimum_stock !== null && minimum_stock !== '') {
    const parsedMin = Number(minimum_stock);
    if (!Number.isInteger(parsedMin) || parsedMin < 0) {
      errors.push({ field: 'minimum_stock', message: 'Minimum stock must be an integer greater than or equal to 0' });
    } else {
      validMinStock = parsedMin;
    }
  }

  return {
    errors,
    value: {
      project_id: parsedProjectId,
      name: isNonEmptyString(name) ? name.trim() : name,
      quantity: validQuantity,
      unit: isNonEmptyString(unit) ? unit.trim() : unit,
      minimum_stock: validMinStock,
    },
  };
}

function validateUpdateStock(body) {
  const errors = [];
  const { quantity, adjustment } = body;
  const value = {};

  if (quantity === undefined && adjustment === undefined) {
    errors.push({
      field: 'quantity',
      message: 'Either new absolute quantity or adjustment delta must be provided',
    });
  }

  if (quantity !== undefined) {
    const parsedQty = Number(quantity);
    if (!Number.isInteger(parsedQty) || parsedQty < 0) {
      errors.push({ field: 'quantity', message: 'Quantity must be an integer greater than or equal to 0' });
    } else {
      value.quantity = parsedQty;
    }
  }

  if (adjustment !== undefined) {
    const parsedAdj = Number(adjustment);
    if (!Number.isInteger(parsedAdj)) {
      errors.push({ field: 'adjustment', message: 'Adjustment must be a valid integer delta' });
    } else {
      value.adjustment = parsedAdj;
    }
  }

  return { errors, value };
}

module.exports = {
  validateCreateMaterial,
  validateUpdateStock,
};
