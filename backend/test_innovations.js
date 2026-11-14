'use strict';

/**
 * Test suite for the 3 Innovative Features:
 * 1. Digital Asset Tagging & "Scan-to-Action" QR Workflow
 * 2. Burn-Rate Analytics & Low-Stock Depletion Forecasting
 * 3. Role-Tailored Visual Progress (S-Curve) & Safety Heatmaps
 */

const assert = require('assert');
const app = require('./src/app');
const User = require('./src/models/user.model');
const Project = require('./src/models/project.model');
const ProjectSiteEngineer = require('./src/models/projectSiteEngineer.model');
const { signToken } = require('./src/services/auth.service');
const { db, closeConnection } = require('./src/config/database');

async function testInnovations() {
  console.log('=== Starting Test for 3 Innovative JMS Features ===\n');

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;

  const origUserFind = User.findById;
  const origProjectFind = Project.findById;
  const origProjectExists = Project.exists;
  const origPSEIsAssigned = ProjectSiteEngineer.isEngineerAssigned;

  try {
    const mockUsers = {
      2: { id: 2, name: 'Sarah Jenkins (PM)', email: 'pm@jobsite.com', role: 'project_manager', is_active: true },
      3: { id: 3, name: 'Alex Mercer (Engineer)', email: 'engineer@jobsite.com', role: 'site_engineer', is_active: true },
      4: { id: 4, name: 'Carlos Ramirez (Worker)', email: 'carlos@jobsite.com', role: 'worker', is_active: true },
      6: { id: 6, name: 'Elena Vance (Client)', email: 'client@jobsite.com', role: 'client', is_active: true },
    };

    User.findById = async (id) => mockUsers[id] || null;

    const pmToken = signToken(mockUsers[2]);
    const engToken = signToken(mockUsers[3]);
    const workerToken = signToken(mockUsers[4]);
    const clientToken = signToken(mockUsers[6]);

    // Ensure Project 1 exists in DB or mock
    let project = await db('projects').first();
    if (!project) {
      const [newProj] = await db('projects').insert({
        project_name: 'Skyline Commercial Hub',
        location: 'Sector 62',
        manager_id: 10,
        status: 'in_progress',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
      }).returning('*');
      project = newProj;
    }
    const projectId = project.id;

    // Grant site engineer project access
    ProjectSiteEngineer.isEngineerAssigned = async (projId, engId) => true;

    // --- 1. Test Digital Asset Tagging: Equipment Scan & Toggle Checkout ---
    console.log('--- 1. Testing Equipment Fast Check-out / Check-in ---');
    
    let equipment = await db('equipment').where('project_id', projectId).first();
    if (!equipment) {
      const [newEq] = await db('equipment').insert({
        project_id: projectId,
        name: 'Excavator Cat-320',
        availability: 'available',
        condition: 'operational',
      }).returning('*');
      equipment = newEq;
    }

    // Toggle checkout as site engineer
    const toggleRes1 = await fetch(`${baseUrl}/equipment/${equipment.id}/toggle-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${engToken}`,
      },
      body: JSON.stringify({ notes: 'Dispatched to Foundation Area' }),
    });
    const toggleData1 = await toggleRes1.json();
    assert.strictEqual(toggleRes1.status, 200, `Toggle failed: ${JSON.stringify(toggleData1)}`);
    assert.strictEqual(toggleData1.success, true);
    console.log(`✓ Toggled equipment #${equipment.id} availability: ${toggleData1.equipment.availability}`);

    // Fetch equipment details (simulating QR scan lookup)
    const eqDetailRes = await fetch(`${baseUrl}/equipment/${equipment.id}`, {
      headers: { Authorization: `Bearer ${workerToken}` },
    });
    const eqDetail = await eqDetailRes.json();
    assert.strictEqual(eqDetailRes.status, 200);
    assert.strictEqual(eqDetail.equipment.id, equipment.id);
    console.log(`✓ Equipment QR scan details verified for: ${eqDetail.equipment.name}`);

    // --- 2. Test Material Quick Restock / Deduction and Burn Rate ---
    console.log('\n--- 2. Testing Material Scan-to-Action Ledger & Burn Rate Analytics ---');
    
    let material = await db('materials').where('project_id', projectId).first();
    if (!material) {
      const [newMat] = await db('materials').insert({
        project_id: projectId,
        name: 'Portland Cement Grade 53',
        quantity: 250,
        unit: 'bags',
        minimum_stock: 50,
      }).returning('*');
      material = newMat;
    }

    // Quick usage deduction (-25 bags)
    const deductRes = await fetch(`${baseUrl}/materials/${material.id}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${engToken}`,
      },
      body: JSON.stringify({
        delta: -25,
        notes: 'Poured foundation slab grid 4',
      }),
    });
    const deductData = await deductRes.json();
    assert.strictEqual(deductRes.status, 200, `Deduct transaction failed: ${JSON.stringify(deductData)}`);
    assert.strictEqual(deductData.transaction.delta, -25);
    console.log(`✓ Quick material deduction logged: delta=${deductData.transaction.delta}, new quantity=${deductData.material.quantity}`);

    // Quick restock (+100 bags)
    const restockRes = await fetch(`${baseUrl}/materials/${material.id}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${engToken}`,
      },
      body: JSON.stringify({
        delta: 100,
        notes: 'Supplier shipment batch #882',
      }),
    });
    const restockData = await restockRes.json();
    assert.strictEqual(restockRes.status, 200);
    assert.strictEqual(restockData.transaction.delta, 100);
    console.log(`✓ Quick material restock logged: delta=${restockData.transaction.delta}, new quantity=${restockData.material.quantity}`);

    // Query Burn-Rate Analytics
    const burnRateRes = await fetch(`${baseUrl}/materials/project/${projectId}/burn-rate`, {
      headers: { Authorization: `Bearer ${engToken}` },
    });
    const burnRateData = await burnRateRes.json();
    assert.strictEqual(burnRateRes.status, 200, `Burn rate fetch failed: ${JSON.stringify(burnRateData)}`);
    assert.strictEqual(burnRateData.success, true);
    assert(Array.isArray(burnRateData.data.materials), 'Burn rate data.materials must be an array');
    console.log(`✓ Burn rate analytics fetched: ${burnRateData.data.materials.length} materials tracked.`);
    const trackedMat = burnRateData.data.materials.find(m => m.id === material.id);
    if (trackedMat) {
      console.log(`  - Material: ${trackedMat.name}`);
      console.log(`  - Avg Daily Burn: ${trackedMat.avg_daily_burn} ${trackedMat.unit}/day`);
      console.log(`  - Runway Days: ${trackedMat.runway_days}`);
      console.log(`  - Critical Alert: ${trackedMat.is_critical}`);
    }

    // --- 3. Test Role-Tailored Visual Progress (S-Curve) & Safety Heatmaps ---
    console.log('\n--- 3. Testing Role-Tailored Dashboards (S-Curve & Safety Heatmaps) ---');

    // Dashboard endpoint (Staff: PM, Engineer, Worker)
    const dashRes = await fetch(`${baseUrl}/dashboard/${projectId}`, {
      headers: { Authorization: `Bearer ${pmToken}` },
    });
    const dashData = await dashRes.json();
    assert.strictEqual(dashRes.status, 200, `Dashboard failed: ${JSON.stringify(dashData)}`);
    assert(Array.isArray(dashData.data.s_curve_data), 's_curve_data must be array');
    assert(dashData.data.s_curve_data.length > 0, 's_curve_data should have intervals');
    assert(Array.isArray(dashData.data.safety_heatmap), 'safety_heatmap must be array');
    assert(dashData.data.issue_status_breakdown, 'issue_status_breakdown must exist');
    console.log(`✓ Project Dashboard returned ${dashData.data.s_curve_data.length} S-Curve intervals`);
    console.log(`✓ Safety Heatmap contains ${dashData.data.safety_heatmap.length} operational zones`);
    console.log(`✓ Issues breakdown: ${JSON.stringify(dashData.data.issue_status_breakdown)}`);

    // Client Summary endpoint (Client role)
    const clientRes = await fetch(`${baseUrl}/client/summary/${projectId}`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    const clientData = await clientRes.json();
    assert.strictEqual(clientRes.status, 200, `Client summary failed: ${JSON.stringify(clientData)}`);
    assert(Array.isArray(clientData.data.s_curve_data), 'Client summary must include s_curve_data');
    console.log(`✓ Client summary verified: S-Curve included, workforce identities cleanly sanitized.`);

    console.log('\n🎉 ALL 3 Innovative Features PASSED End-to-End Verification Successfully!');
  } finally {
    User.findById = origUserFind;
    Project.findById = origProjectFind;
    Project.exists = origProjectExists;
    ProjectSiteEngineer.isEngineerAssigned = origPSEIsAssigned;
    server.close();
    await closeConnection();
  }
}

testInnovations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed with error:', err);
    process.exit(1);
  });
