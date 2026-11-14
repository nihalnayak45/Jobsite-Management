'use strict';

const assert = require('assert');
const app = require('./src/app');
const User = require('./src/models/user.model');
const Project = require('./src/models/project.model');
const { signToken } = require('./src/services/auth.service');
const { db, closeConnection } = require('./src/config/database');

async function testFeatureC() {
  console.log('=== Starting Test for Feature Prompt C (Progress S-Curve & Defect Analytics) ===\n');

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;

  const origUserFind = User.findById;

  try {
    const mockUsers = {
      2: { id: 2, name: 'Sarah Jenkins (PM)', email: 'pm@jobsite.com', role: 'project_manager', is_active: true },
      6: { id: 6, name: 'Elena Vance (Client)', email: 'client@jobsite.com', role: 'client', is_active: true },
    };

    User.findById = async (id) => mockUsers[id] || null;

    const pmToken = signToken(mockUsers[2]);
    const clientToken = signToken(mockUsers[6]);

    const project = await db('projects').first();
    const projectId = project.id;

    // 1. Test GET /api/analytics/progress/:projectId as Client
    console.log('--- 1. Testing Progress Analytics Endpoint as Client ---');
    const clientRes = await fetch(`${baseUrl}/analytics/progress/${projectId}`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    const clientData = await clientRes.json();
    assert.strictEqual(clientRes.status, 200, `Client fetch failed: ${JSON.stringify(clientData)}`);
    assert.strictEqual(clientData.success, true);
    assert(Array.isArray(clientData.data.s_curve_timeline), 's_curve_timeline must be an array');
    assert(clientData.data.s_curve_timeline.length > 0, 's_curve_timeline must have intervals');
    assert(Array.isArray(clientData.data.milestone_donut), 'milestone_donut must be an array');
    console.log(`✓ Client accessed /api/analytics/progress/${projectId}:`);
    console.log(`  - S-Curve intervals: ${clientData.data.s_curve_timeline.length}`);
    console.log(`  - Sample point: ${JSON.stringify(clientData.data.s_curve_timeline[0])}`);
    console.log(`  - Milestone donut tasks: ${JSON.stringify(clientData.data.milestone_donut)}`);

    // 2. Test GET /api/analytics/progress/:projectId as Project Manager (Defects & Attendance)
    console.log('\n--- 2. Testing Quality Defects Breakdown & Weekly Attendance ---');
    const pmRes = await fetch(`${baseUrl}/analytics/progress/${projectId}`, {
      headers: { Authorization: `Bearer ${pmToken}` },
    });
    const pmData = await pmRes.json();
    assert.strictEqual(pmRes.status, 200);

    const defectBreakdown = pmData.data.defect_breakdown;
    assert(defectBreakdown, 'defect_breakdown must exist');
    assert('total_open' in defectBreakdown, 'Must contain total_open');
    assert('avg_resolution_hours' in defectBreakdown, 'Must contain avg_resolution_hours');
    assert(Array.isArray(defectBreakdown.by_priority), 'by_priority must be an array');

    console.log(`✓ Defect Breakdown verified:`);
    console.log(`  - Total open defects: ${defectBreakdown.total_open}`);
    console.log(`  - Resolved defects count: ${defectBreakdown.resolved_count}`);
    console.log(`  - Average resolution time: ${defectBreakdown.avg_resolution_hours} hours (${defectBreakdown.avg_resolution_days} days)`);
    console.log(`  - Severity distribution: ${JSON.stringify(defectBreakdown.by_priority)}`);

    assert(Array.isArray(pmData.data.weekly_attendance), 'weekly_attendance must be an array');
    console.log(`✓ Weekly attendance trends verified (${pmData.data.weekly_attendance.length} days logged)`);

    console.log('\n🎉 Feature Prompt C Analytics Endpoints PASSED Successfully!');
  } finally {
    User.findById = origUserFind;
    server.close();
    await closeConnection();
  }
}

testFeatureC()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed with error:', err);
    process.exit(1);
  });

