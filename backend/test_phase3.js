'use strict';

const assert = require('assert');
const {
  validateCreateProject,
  validateUpdateProject,
} = require('./src/validators/project.validator');
const {
  validateCreateTask,
  validateUpdateTaskStatus,
} = require('./src/validators/task.validator');
const {
  validateCreateWorker,
  validateAttendance,
} = require('./src/validators/workforce.validator');

const { signToken } = require('./src/services/auth.service');
const User = require('./src/models/user.model');
const Project = require('./src/models/project.model');
const Task = require('./src/models/task.model');
const Worker = require('./src/models/worker.model');
const Attendance = require('./src/models/attendance.model');

const projectController = require('./src/controllers/project.controller');
const taskController = require('./src/controllers/task.controller');
const workforceController = require('./src/controllers/workforce.controller');
const app = require('./src/app');

async function runTests() {
  console.log('--- 1. Testing Project Validators ---');

  // Create Project: Missing required fields
  const p1 = validateCreateProject({});
  assert.strictEqual(p1.errors.length, 3); // project_name, location, start_date

  // Create Project: Invalid date format
  const p2 = validateCreateProject({
    project_name: 'Metro Line A',
    location: 'Central Station',
    start_date: 'not-a-date',
  });
  assert.ok(p2.errors.some((e) => e.field === 'start_date'));

  // Create Project: end_date < start_date
  const p3 = validateCreateProject({
    project_name: 'Metro Line A',
    location: 'Central Station',
    start_date: '2026-10-22',
    end_date: '2026-10-20',
  });
  assert.ok(p3.errors.some((e) => e.field === 'end_date' && e.message.includes('greater than or equal')));

  // Create Project: Valid payload with defaults
  const p4 = validateCreateProject({
    project_name: 'Metro Line A',
    location: 'Central Station',
    start_date: '2026-10-22',
    end_date: '2026-12-31',
  });
  assert.strictEqual(p4.errors.length, 0);
  assert.strictEqual(p4.value.status, 'planned');
  assert.strictEqual(p4.value.manager_id, null);

  // Update Project: invalid status
  const p5 = validateUpdateProject({ status: 'invalid_status' });
  assert.ok(p5.errors.some((e) => e.field === 'status'));

  console.log('✓ Project validators passed.');

  console.log('--- 2. Testing Task Validators ---');

  // Create Task: Missing required
  const t1 = validateCreateTask({});
  assert.ok(t1.errors.some((e) => e.field === 'project_id'));
  assert.ok(t1.errors.some((e) => e.field === 'title'));

  // Create Task: Valid with default priority
  const t2 = validateCreateTask({ project_id: 5, title: 'Lay Foundation' });
  assert.strictEqual(t2.errors.length, 0);
  assert.strictEqual(t2.value.priority, 'medium');

  // Update Task Status: Invalid percentage (> 100)
  const t3 = validateUpdateTaskStatus({ completion_percentage: 150 });
  assert.ok(t3.errors.some((e) => e.field === 'completion_percentage'));

  // Update Task Status: Auto status 'completed' when percentage === 100
  const t4 = validateUpdateTaskStatus({ completion_percentage: 100 });
  assert.strictEqual(t4.errors.length, 0);
  assert.strictEqual(t4.value.completion_percentage, 100);
  assert.strictEqual(t4.value.status, 'completed');

  console.log('✓ Task validators passed.');

  console.log('--- 3. Testing Workforce & Attendance Validators ---');

  // Create Worker: Missing name
  const w1 = validateCreateWorker({});
  assert.ok(w1.errors.some((e) => e.field === 'name'));

  // Create Worker: Valid
  const w2 = validateCreateWorker({ name: 'Bob Builder', contact: '+1-555-0199' });
  assert.strictEqual(w2.errors.length, 0);
  assert.strictEqual(w2.value.name, 'Bob Builder');

  // Single attendance record validation
  const a1 = validateAttendance({
    project_id: 1,
    worker_id: 10,
    date: '2026-10-22',
    status: 'present',
  });
  assert.strictEqual(a1.errors.length, 0);
  assert.strictEqual(a1.value.records.length, 1);
  assert.strictEqual(a1.value.records[0].status, 'present');

  // Batch attendance record validation
  const a2 = validateAttendance({
    project_id: 1,
    date: '2026-10-22',
    records: [
      { worker_id: 10, status: 'present' },
      { worker_id: 11, status: 'half_day' },
      { worker_id: 12, status: 'absent' },
    ],
  });
  assert.strictEqual(a2.errors.length, 0);
  assert.strictEqual(a2.value.records.length, 3);

  // Batch attendance with invalid status
  const a3 = validateAttendance({
    project_id: 1,
    date: '2026-10-22',
    records: [{ worker_id: 10, status: 'sleeping' }],
  });
  assert.ok(a3.errors.some((e) => e.field === 'records[0].status'));

  console.log('✓ Workforce & Attendance validators passed.');

  console.log('--- 4. Testing Controller Business Logic & Worker Permission Limits ---');

  // Test Project Controller manager_id defaulting
  let savedProjectData = null;
  const origProjectCreate = Project.create;
  Project.create = async (data) => {
    savedProjectData = data;
    return { id: 101, ...data };
  };

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

  await projectController.createProject(
    {
      body: {
        project_name: 'Highway Overpass',
        location: 'Sector 4',
        start_date: '2026-11-01',
      },
      user: { id: 7, role: 'project_manager' },
    },
    mockRes
  );
  assert.strictEqual(mockRes.statusCode, 201);
  assert.strictEqual(savedProjectData.manager_id, 7); // Defaulted to req.user.id
  Project.create = origProjectCreate;

  // Test Task Status Update: Worker permission limits
  const origTaskFind = Task.findById;
  const origTaskUpdate = Task.updateStatus;

  // Case A: Worker tries to update task assigned to someone else (assigned_user_id = 99, worker.id = 5)
  Task.findById = async () => ({ id: 42, assigned_user_id: 99, status: 'pending' });

  let workerForbiddenError = null;
  try {
    await taskController.updateTaskStatus(
      {
        params: { id: 42 },
        body: { status: 'in_progress', completion_percentage: 50 },
        user: { id: 5, role: 'worker' },
      },
      mockRes
    );
  } catch (err) {
    workerForbiddenError = err;
  }
  assert.ok(workerForbiddenError);
  assert.strictEqual(workerForbiddenError.statusCode, 403);
  assert.ok(workerForbiddenError.message.includes('Forbidden'));

  // Case B: Worker updates their OWN assigned task (assigned_user_id = 5, worker.id = 5)
  Task.findById = async () => ({ id: 42, assigned_user_id: 5, status: 'pending' });
  Task.updateStatus = async (id, updates) => ({ id, ...updates });

  await taskController.updateTaskStatus(
    {
      params: { id: 42 },
      body: { status: 'in_progress', completion_percentage: 50 },
      user: { id: 5, role: 'worker' },
    },
    mockRes
  );
  assert.strictEqual(mockRes.statusCode, 200);
  assert.strictEqual(mockRes.body.task.completion_percentage, 50);

  // Case C: PM can update any task regardless of assigned user
  await taskController.updateTaskStatus(
    {
      params: { id: 42 },
      body: { status: 'completed', completion_percentage: 100 },
      user: { id: 2, role: 'project_manager' },
    },
    mockRes
  );
  assert.strictEqual(mockRes.statusCode, 200);

  Task.findById = origTaskFind;
  Task.updateStatus = origTaskUpdate;

  console.log('✓ Controller business rules & worker self-update limits passed.');

  console.log('--- 5. Testing HTTP Routes & Role-Based Middleware ---');

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;

  try {
    // 5.1 Unauthenticated requests return 401
    const unauthProjects = await fetch(`${baseUrl}/projects`);
    assert.strictEqual(unauthProjects.status, 401);

    const unauthTasks = await fetch(`${baseUrl}/tasks/project/1`);
    assert.strictEqual(unauthTasks.status, 401);

    const unauthWorkforce = await fetch(`${baseUrl}/workforce`);
    assert.strictEqual(unauthWorkforce.status, 401);

    // Mock User.findById so authenticateToken resolves authenticated tokens
    const origUserFind = User.findById;
    User.findById = async (id) => {
      const roles = {
        1: 'project_manager',
        2: 'project_manager',
        3: 'site_engineer',
        4: 'worker',
        5: 'client',
      };
      return {
        id,
        name: `User ${id}`,
        email: `user${id}@example.com`,
        role: roles[id] || 'worker',
        is_active: true,
      };
    };

    const pmToken = signToken({ id: 2, role: 'project_manager', email: 'pm@test.com' });
    const engineerToken = signToken({ id: 3, role: 'site_engineer', email: 'eng@test.com' });
    const workerToken = signToken({ id: 4, role: 'worker', email: 'worker@test.com' });
    const clientToken = signToken({ id: 5, role: 'client', email: 'client@test.com' });

    // 5.2 Worker cannot POST /api/projects -> 403 Forbidden
    const workerCreateProj = await fetch(`${baseUrl}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${workerToken}`,
      },
      body: JSON.stringify({
        project_name: 'Worker Project',
        location: 'Location',
        start_date: '2026-10-22',
      }),
    });
    const workerCreateProjRes = await workerCreateProj.json();
    assert.strictEqual(workerCreateProj.status, 403);
    assert.strictEqual(workerCreateProjRes.message, 'Forbidden: insufficient permissions');

    // 5.3 Client cannot POST /api/projects -> 403 Forbidden
    const clientCreateProj = await fetch(`${baseUrl}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${clientToken}`,
      },
      body: JSON.stringify({
        project_name: 'Client Project',
        location: 'Location',
        start_date: '2026-10-22',
      }),
    });
    assert.strictEqual(clientCreateProj.status, 403);

    // 5.4 Site Engineer cannot POST /api/tasks -> 403 Forbidden
    const engCreateTask = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${engineerToken}`,
      },
      body: JSON.stringify({
        project_id: 1,
        title: 'Survey Site',
      }),
    });
    assert.strictEqual(engCreateTask.status, 403);

    // 5.5 Worker cannot POST /api/workforce -> 403 Forbidden
    const workerCreateWorker = await fetch(`${baseUrl}/workforce`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${workerToken}`,
      },
      body: JSON.stringify({
        name: 'New Worker',
      }),
    });
    assert.strictEqual(workerCreateWorker.status, 403);

    // 5.6 Worker cannot POST /api/workforce/attendance -> 403 Forbidden
    const workerPostAttendance = await fetch(`${baseUrl}/workforce/attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${workerToken}`,
      },
      body: JSON.stringify({
        project_id: 1,
        date: '2026-10-22',
        worker_id: 1,
        status: 'present',
      }),
    });
    assert.strictEqual(workerPostAttendance.status, 403);

    // 5.7 PM validation failure -> 400 with structured validation errors
    const pmBadProject = await fetch(`${baseUrl}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pmToken}`,
      },
      body: JSON.stringify({}),
    });
    const pmBadRes = await pmBadProject.json();
    assert.strictEqual(pmBadProject.status, 400);
    assert.strictEqual(pmBadRes.success, false);
    assert.ok(pmBadRes.message.includes('Validation failed'));

    User.findById = origUserFind;
    console.log('✓ HTTP route mounting, auth, and RBAC enforcement passed.');
  } finally {
    server.close();
    const { closeConnection } = require('./src/config/database');
    await closeConnection();
  }

  console.log('\nAll Phase 3 (Projects, Tasks, Workforce & Attendance) tests PASSED successfully!');
}

runTests().catch((err) => {
  console.error('Phase 3 Test failed:', err);
  process.exit(1);
});
