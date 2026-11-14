'use strict';

const assert = require('assert');
const app = require('./src/app');
const User = require('./src/models/user.model');
const Project = require('./src/models/project.model');
const ProjectSiteEngineer = require('./src/models/projectSiteEngineer.model');
const { signToken } = require('./src/services/auth.service');
const { db, closeConnection } = require('./src/config/database');

async function runTestFeaturesAB() {
  console.log('=== Starting Test for Feature Prompts A & B ===\n');

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;

  const origUserFind = User.findById;
  const origPSEIsAssigned = ProjectSiteEngineer.isEngineerAssigned;

  try {
    const mockUsers = {
      2: { id: 2, name: 'Sarah Jenkins (PM)', email: 'pm@jobsite.com', role: 'project_manager', is_active: true },
      3: { id: 3, name: 'Alex Mercer (Engineer)', email: 'engineer@jobsite.com', role: 'site_engineer', is_active: true },
      4: { id: 4, name: 'Carlos Ramirez (Worker)', email: 'carlos@jobsite.com', role: 'worker', is_active: true },
      6: { id: 6, name: 'Elena Vance (Client)', email: 'client@jobsite.com', role: 'client', is_active: true },
    };

    User.findById = async (id) => mockUsers[id] || null;
    ProjectSiteEngineer.isEngineerAssigned = async () => true;

    const pmToken = signToken(mockUsers[2]);
    const engToken = signToken(mockUsers[3]);
    const workerToken = signToken(mockUsers[4]);
    const clientToken = signToken(mockUsers[6]);

    const project = await db('projects').first();
    const projectId = project.id;
    const material = await db('materials').where('project_id', projectId).first();
    const equipment = await db('equipment').where('project_id', projectId).first();

    // ==========================================
    // FEATURE A: QR Code Generation & Scanning Pipeline
    // ==========================================
    console.log('--- Feature A: QR Endpoints & Action Pipeline ---');

    // 1. GET /api/equipment/:id/qr
    const eqQRRes = await fetch(`${baseUrl}/equipment/${equipment.id}/qr`, {
      headers: { Authorization: `Bearer ${engToken}` },
    });
    const eqQRData = await eqQRRes.json();
    assert.strictEqual(eqQRRes.status, 200, `Equipment QR failed: ${JSON.stringify(eqQRData)}`);
    assert(eqQRData.qr_code && eqQRData.qr_code.startsWith('data:image/png;base64,'), 'QR code must be a base64 DataURL');
    assert.strictEqual(eqQRData.payload.entity, 'equipment');
    assert.strictEqual(eqQRData.payload.id, equipment.id);
    console.log(`✓ GET /api/equipment/${equipment.id}/qr generated base64 DataURL: ${eqQRData.qr_code.substring(0, 35)}...`);

    // 2. GET /api/materials/:id/qr
    const matQRRes = await fetch(`${baseUrl}/materials/${material.id}/qr`, {
      headers: { Authorization: `Bearer ${engToken}` },
    });
    const matQRData = await matQRRes.json();
    assert.strictEqual(matQRRes.status, 200, `Material QR failed: ${JSON.stringify(matQRData)}`);
    assert(matQRData.qr_code && matQRData.qr_code.startsWith('data:image/png;base64,'), 'QR code must be a base64 DataURL');
    assert.strictEqual(matQRData.payload.entity, 'material');
    assert.strictEqual(matQRData.payload.id, material.id);
    console.log(`✓ GET /api/materials/${material.id}/qr generated base64 DataURL: ${matQRData.qr_code.substring(0, 35)}...`);

    // 3. POST /api/scan/action for Material (Worker should get 403 Forbidden)
    const workerScanRes = await fetch(`${baseUrl}/scan/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${workerToken}`,
      },
      body: JSON.stringify({
        entity: 'material',
        id: material.id,
        adjustment: -5,
      }),
    });
    assert.strictEqual(workerScanRes.status, 403, 'Workers must be forbidden from adjusting material stock via scan');
    console.log('✓ POST /api/scan/action rejected worker material adjustment with 403 Forbidden.');

    // 4. POST /api/scan/action for Material (Engineer adjusts -10)
    const currentMat = await db('materials').where('id', material.id).first();
    const engScanRes = await fetch(`${baseUrl}/scan/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${engToken}`,
      },
      body: JSON.stringify({
        entity: 'material',
        id: material.id,
        adjustment: -10,
        reason: 'daily_usage',
        notes: 'Quick scanned at foundation pouring',
      }),
    });
    const engScanData = await engScanRes.json();
    assert.strictEqual(engScanRes.status, 200, `Engineer scan action failed: ${JSON.stringify(engScanData)}`);
    assert.strictEqual(engScanData.material.quantity, currentMat.quantity - 10);
    assert.strictEqual(engScanData.log.change_amount, -10);
    assert.strictEqual(engScanData.log.reason, 'daily_usage');
    console.log(`✓ POST /api/scan/action executed material adjustment: new quantity = ${engScanData.material.quantity}, logged in material_logs.`);

    // 5. POST /api/scan/action for Equipment (Worker CAN check out / check in equipment)
    const eqScanRes = await fetch(`${baseUrl}/scan/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${workerToken}`,
      },
      body: JSON.stringify({
        entity: 'equipment',
        id: equipment.id,
        action: 'toggle',
        notes: 'Checked out by Carlos Worker for morning shift',
      }),
    });
    const eqScanData = await eqScanRes.json();
    assert.strictEqual(eqScanRes.status, 200, `Worker equipment scan failed: ${JSON.stringify(eqScanData)}`);
    console.log(`✓ POST /api/scan/action allowed worker equipment toggle: action = ${eqScanData.action}, availability = ${eqScanData.equipment.availability}.`);

    // ==========================================
    // FEATURE B: Inventory Consumption & Stock Depletion Graphs
    // ==========================================
    console.log('\n--- Feature B: Material Logs & Analytics Endpoints ---');

    // 1. Test PATCH /api/materials/:id/stock creates material_logs in Knex transaction
    const beforePatchMat = await db('materials').where('id', material.id).first();
    const patchRes = await fetch(`${baseUrl}/materials/${material.id}/stock`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pmToken}`,
      },
      body: JSON.stringify({
        adjustment: 50,
        reason: 'restock',
      }),
    });
    const patchData = await patchRes.json();
    assert.strictEqual(patchRes.status, 200, `PATCH stock failed: ${JSON.stringify(patchData)}`);
    assert.strictEqual(patchData.data.quantity, beforePatchMat.quantity + 50);

    // Verify material_logs row exists
    const latestLog = await db('material_logs')
      .where('material_id', material.id)
      .orderBy('id', 'desc')
      .first();
    assert(latestLog, 'material_logs entry must exist');
    assert.strictEqual(latestLog.change_amount, 50);
    assert.strictEqual(latestLog.previous_quantity, beforePatchMat.quantity);
    assert.strictEqual(latestLog.new_quantity, beforePatchMat.quantity + 50);
    assert.strictEqual(latestLog.reason, 'restock');
    console.log(`✓ PATCH /api/materials/${material.id}/stock recorded material_logs entry within Knex transaction: change = +50, reason = restock.`);

    // 2. Test GET /api/analytics/materials/:projectId
    const analyticsRes = await fetch(`${baseUrl}/analytics/materials/${projectId}?days=30`, {
      headers: { Authorization: `Bearer ${engToken}` },
    });
    const analyticsData = await analyticsRes.json();
    assert.strictEqual(analyticsRes.status, 200, `Analytics fetch failed: ${JSON.stringify(analyticsData)}`);
    assert(Array.isArray(analyticsData.data.analyzed_materials), 'analyzed_materials must be an array');
    console.log(`✓ GET /api/analytics/materials/${projectId} returned ${analyticsData.data.analyzed_materials.length} analyzed materials.`);

    const sampleMat = analyticsData.data.analyzed_materials.find(m => m.id === material.id);
    assert(sampleMat, 'Target material must be present in analyzed materials');
    assert('average_daily_burn_rate' in sampleMat, 'Must have average_daily_burn_rate');
    assert('estimated_days_remaining' in sampleMat, 'Must have estimated_days_remaining');
    assert('reaches_zero_within_7_days' in sampleMat, 'Must have reaches_zero_within_7_days flag');
    assert(Array.isArray(sampleMat.daily_consumption), 'Must have daily_consumption timeline');
    console.log(`  - Target Material: ${sampleMat.name}`);
    console.log(`  - 14-Day Consumption: ${sampleMat.consumed_last_14_days} ${sampleMat.unit}`);
    console.log(`  - Avg Daily Burn: ${sampleMat.average_daily_burn_rate} ${sampleMat.unit}/day`);
    console.log(`  - Estimated Days Remaining: ${sampleMat.estimated_days_remaining}`);
    console.log(`  - Reaches Zero in 7 Days: ${sampleMat.reaches_zero_within_7_days}`);
    console.log(`  - Daily timeline data points: ${sampleMat.daily_consumption.length}`);

    console.log('\n🎉 ALL Requirements for Feature Prompts A & B PASSED Successfully!');
  } finally {
    User.findById = origUserFind;
    ProjectSiteEngineer.isEngineerAssigned = origPSEIsAssigned;
    server.close();
    await closeConnection();
  }
}

runTestFeaturesAB()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed with error:', err);
    process.exit(1);
  });

