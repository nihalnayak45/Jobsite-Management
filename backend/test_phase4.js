'use strict';

const assert = require('assert');
const {
  validateCreateMaterial,
  validateUpdateStock,
} = require('./src/validators/material.validator');
const {
  validateCreateEquipment,
  validateUpdateEquipment,
} = require('./src/validators/equipment.validator');
const {
  validateCreateDailyReport,
} = require('./src/validators/dailyReport.validator');
const {
  validateCreateIssue,
  validateUpdateIssueStatus,
} = require('./src/validators/issue.validator');
const {
  validateCreateSafetyRecord,
} = require('./src/validators/safety.validator');

const { signToken } = require('./src/services/auth.service');
const User = require('./src/models/user.model');
const Project = require('./src/models/project.model');
const Material = require('./src/models/material.model');
const Equipment = require('./src/models/equipment.model');
const DailyReport = require('./src/models/dailyReport.model');
const Issue = require('./src/models/issue.model');
const Safety = require('./src/models/safety.model');

const materialController = require('./src/controllers/material.controller');
const dailyReportController = require('./src/controllers/dailyReport.controller');
const issueController = require('./src/controllers/issue.controller');
const app = require('./src/app');

async function runTests() {
  console.log('--- 1. Testing Phase 4 Validators ---');

  // 1.1 Material Validators
  const m1 = validateCreateMaterial({});
  assert.ok(m1.errors.some((e) => e.field === 'project_id'));
  assert.ok(m1.errors.some((e) => e.field === 'name'));
  assert.ok(m1.errors.some((e) => e.field === 'unit'));

  const m2 = validateCreateMaterial({
    project_id: 1,
    name: 'Portland Cement',
    quantity: -5,
    unit: 'bags',
    minimum_stock: 50,
  });
  assert.ok(m2.errors.some((e) => e.field === 'quantity'));

  const m3 = validateCreateMaterial({
    project_id: 1,
    name: 'Portland Cement',
    quantity: 100,
    unit: 'bags',
    minimum_stock: 50,
  });
  assert.strictEqual(m3.errors.length, 0);
  assert.strictEqual(m3.value.quantity, 100);

  const m4 = validateUpdateStock({});
  assert.ok(m4.errors.some((e) => e.field === 'quantity'));

  const m5 = validateUpdateStock({ adjustment: -20 });
  assert.strictEqual(m5.errors.length, 0);
  assert.strictEqual(m5.value.adjustment, -20);

  // 1.2 Equipment Validators
  const eq1 = validateCreateEquipment({});
  assert.ok(eq1.errors.some((e) => e.field === 'project_id'));
  assert.ok(eq1.errors.some((e) => e.field === 'name'));

  const eq2 = validateCreateEquipment({
    project_id: 1,
    name: 'Excavator CAT 320',
    condition: 'broken_beyond_repair',
  });
  assert.ok(eq2.errors.some((e) => e.field === 'condition'));

  const eq3 = validateCreateEquipment({
    project_id: 1,
    name: 'Excavator CAT 320',
    condition: 'operational',
    availability: true,
  });
  assert.strictEqual(eq3.errors.length, 0);

  // 1.3 Daily Report Validators
  const dr1 = validateCreateDailyReport({});
  assert.ok(dr1.errors.some((e) => e.field === 'project_id'));
  assert.ok(dr1.errors.some((e) => e.field === 'report_date'));
  assert.ok(dr1.errors.some((e) => e.field === 'work_summary'));

  const dr2 = validateCreateDailyReport({
    project_id: 1,
    report_date: 'invalid-date',
    work_summary: 'Poured foundation concrete',
  });
  assert.ok(dr2.errors.some((e) => e.field === 'report_date'));

  const dr3 = validateCreateDailyReport({
    project_id: 1,
    report_date: '2026-10-22',
    work_summary: 'Poured foundation concrete',
  });
  assert.strictEqual(dr3.errors.length, 0);

  // 1.4 Issue Validators
  const is1 = validateCreateIssue({});
  assert.ok(is1.errors.some((e) => e.field === 'project_id'));
  assert.ok(is1.errors.some((e) => e.field === 'description'));

  const is2 = validateCreateIssue({
    project_id: 1,
    description: 'Cracked beam observed on grid 4',
    priority: 'extreme',
  });
  assert.ok(is2.errors.some((e) => e.field === 'priority'));

  const is3 = validateCreateIssue({
    project_id: 1,
    description: 'Cracked beam observed on grid 4',
    priority: 'critical',
  });
  assert.strictEqual(is3.errors.length, 0);
  assert.strictEqual(is3.value.status, 'open');

  const is4 = validateUpdateIssueStatus({ status: 'not_a_valid_status' });
  assert.ok(is4.errors.some((e) => e.field === 'status'));

  const is5 = validateUpdateIssueStatus({ status: 'resolved' });
  assert.strictEqual(is5.errors.length, 0);

  // 1.5 Safety Record Validators
  const sf1 = validateCreateSafetyRecord({
    project_id: 1,
    record_type: 'random_inspection',
    description: 'Safety harness check',
    date: '2026-10-22',
  });
  assert.ok(sf1.errors.some((e) => e.field === 'record_type'));

  const sf2 = validateCreateSafetyRecord({
    project_id: 1,
    record_type: 'safety_incident',
    description: 'Minor laceration on thumb',
    date: '2026-10-22',
  });
  assert.strictEqual(sf2.errors.length, 0);

  console.log('✓ All Phase 4 validators passed.');

  console.log('--- 2. Testing Controller Business Rules ---');

  const mockRes = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };

  // 2.1 Material Stock: Prevention of negative quantity
  const origFindMaterial = Material.findById;
  const origUpdateMaterial = Material.updateQuantity;

  Material.findById = async () => ({
    id: 10,
    project_id: 1,
    name: 'Rebar 12mm',
    quantity: 20,
    minimum_stock: 15,
  });

  let negativeStockError = null;
  try {
    // Attempting to deduct 25 from stock of 20 -> -5
    await materialController.updateStock(
      {
        params: { id: 10 },
        body: { adjustment: -25 },
        user: { id: 2, role: 'project_manager' },
      },
      mockRes
    );
  } catch (err) {
    negativeStockError = err;
  }
  assert.ok(negativeStockError);
  assert.strictEqual(negativeStockError.statusCode, 400);
  assert.ok(negativeStockError.message.includes('cannot be reduced below 0'));

  // 2.2 Material Stock: Low-stock trigger when quantity <= minimum_stock
  Material.updateQuantity = async (id, newQty) => ({
    id,
    project_id: 1,
    name: 'Rebar 12mm',
    quantity: newQty,
    minimum_stock: 15,
    is_low_stock: newQty <= 15,
  });

  // Deduct 10 -> newQty = 10 (which is <= 15 minimum stock)
  await materialController.updateStock(
    {
      params: { id: 10 },
      body: { adjustment: -10 },
      user: { id: 2, role: 'project_manager' },
    },
    mockRes
  );
  assert.strictEqual(mockRes.statusCode, 200);
  assert.strictEqual(mockRes.body.data.quantity, 10);
  assert.strictEqual(mockRes.body.alert, 'Stock is at or below minimum threshold');

  // Add 50 -> newQty = 70 (which is > 15 minimum stock)
  await materialController.updateStock(
    {
      params: { id: 10 },
      body: { quantity: 70 },
      user: { id: 2, role: 'project_manager' },
    },
    mockRes
  );
  assert.strictEqual(mockRes.statusCode, 200);
  assert.strictEqual(mockRes.body.data.quantity, 70);
  assert.strictEqual(mockRes.body.alert, null);

  Material.findById = origFindMaterial;
  Material.updateQuantity = origUpdateMaterial;

  // 2.3 Daily Report: Auto-populating created_by
  const origProjExists = Project.exists;
  const origReportCreate = DailyReport.create;
  Project.exists = async () => true;

  let savedReportPayload = null;
  DailyReport.create = async (data) => {
    savedReportPayload = data;
    return { id: 1, ...data };
  };

  await dailyReportController.createDailyReport(
    {
      body: {
        project_id: 1,
        report_date: '2026-10-22',
        work_summary: 'Completed pillar reinforcement',
      },
      user: { id: 42, role: 'site_engineer' },
    },
    mockRes
  );
  assert.strictEqual(mockRes.statusCode, 201);
  assert.strictEqual(savedReportPayload.created_by, 42); // Auto-populated from req.user.id

  DailyReport.create = origReportCreate;

  // 2.4 Issue: Auto-populating reported_by
  const origIssueCreate = Issue.create;
  let savedIssuePayload = null;
  Issue.create = async (data) => {
    savedIssuePayload = data;
    return { id: 1, ...data };
  };

  await issueController.createIssue(
    {
      body: {
        project_id: 1,
        description: 'Water leak in basement pump room',
        priority: 'high',
        status: 'open',
      },
      user: { id: 77, role: 'worker' },
    },
    mockRes
  );
  assert.strictEqual(mockRes.statusCode, 201);
  assert.strictEqual(savedIssuePayload.reported_by, 77); // Auto-populated from req.user.id

  Issue.create = origIssueCreate;
  Project.exists = origProjExists;

  console.log('✓ Business rules (low stock alert, negative prevention, auto-populated IDs) passed.');

  console.log('--- 3. Testing HTTP Routes & RBAC Restrictions ---');

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;

  try {
    // 3.1 Unauthenticated requests return 401
    for (const path of ['materials/project/1', 'equipment/project/1', 'reports/project/1', 'issues/project/1', 'safety/project/1']) {
      const res = await fetch(`${baseUrl}/${path}`);
      assert.strictEqual(res.status, 401);
    }

    // Mock User.findById for JWT verification
    const origUserFind = User.findById;
    User.findById = async (id) => {
      const roles = {
        1: 'project_manager',
        2: 'project_manager',
        3: 'site_engineer',
        4: 'worker',
      };
      return {
        id,
        name: `User ${id}`,
        email: `user${id}@example.com`,
        role: roles[id] || 'worker',
        is_active: true,
      };
    };

    const workerToken = signToken({ id: 4, role: 'worker', email: 'worker@test.com' });
    const engineerToken = signToken({ id: 3, role: 'site_engineer', email: 'eng@test.com' });

    // 3.2 Worker CANNOT modify material stock -> 403 Forbidden
    const workerStockRes = await fetch(`${baseUrl}/materials/1/stock`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${workerToken}`,
      },
      body: JSON.stringify({ adjustment: 5 }),
    });
    assert.strictEqual(workerStockRes.status, 403);

    // 3.3 Worker CANNOT resolve/update issue status -> 403 Forbidden
    const workerIssueStatusRes = await fetch(`${baseUrl}/issues/1/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${workerToken}`,
      },
      body: JSON.stringify({ status: 'resolved' }),
    });
    assert.strictEqual(workerIssueStatusRes.status, 403);

    // 3.4 Worker CAN report an issue -> Reaches controller / validation
    // Sending invalid payload to confirm authorization passed and hit validator (400 instead of 403)
    const workerReportIssueRes = await fetch(`${baseUrl}/issues`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${workerToken}`,
      },
      body: JSON.stringify({}),
    });
    assert.strictEqual(workerReportIssueRes.status, 400); // 400 = Authorized, caught by validator!

    // 3.5 Worker CANNOT create daily reports -> 403 Forbidden
    const workerReportRes = await fetch(`${baseUrl}/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${workerToken}`,
      },
      body: JSON.stringify({
        project_id: 1,
        report_date: '2026-10-22',
        work_summary: 'Did some work',
      }),
    });
    assert.strictEqual(workerReportRes.status, 403);

    // 3.6 Worker CANNOT create equipment -> 403 Forbidden
    const workerEquipRes = await fetch(`${baseUrl}/equipment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${workerToken}`,
      },
      body: JSON.stringify({
        project_id: 1,
        name: 'Bulldozer',
      }),
    });
    assert.strictEqual(workerEquipRes.status, 403);

    // 3.7 Site Engineer CAN update issue status -> reaches validator (400 instead of 403)
    const engIssueStatusRes = await fetch(`${baseUrl}/issues/1/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${engineerToken}`,
      },
      body: JSON.stringify({}),
    });
    assert.strictEqual(engIssueStatusRes.status, 400); // Authorized!

    User.findById = origUserFind;
    console.log('✓ HTTP route mounting, auth, and RBAC matrix enforcement passed.');
  } finally {
    server.close();
    const { closeConnection } = require('./src/config/database');
    await closeConnection();
  }

  console.log('\nAll Phase 4 (Materials, Equipment, Reports, Issues, Safety) tests PASSED successfully!');
}

runTests().catch((err) => {
  console.error('Phase 4 Test failed:', err);
  process.exit(1);
});
