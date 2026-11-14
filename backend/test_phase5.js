'use strict';

/**
 * Phase 5 Test Suite:
 * Validates the 4-role operational boundaries:
 *   - Project Manager: creates projects, assigns site engineers, manages tasks.
 *   - Site Engineer: records attendance, logs daily reports, manages inventory/materials, tracks equipment, and resolves issues on assigned projects.
 *   - Worker: views assigned tasks, updates progress, logs issues/defects.
 *   - Client: read-only access to progress summaries.
 */

const assert = require('assert');
const app = require('./src/app');
const User = require('./src/models/user.model');
const Project = require('./src/models/project.model');
const ProjectSiteEngineer = require('./src/models/projectSiteEngineer.model');
const Material = require('./src/models/material.model');
const Issue = require('./src/models/issue.model');
const Worker = require('./src/models/worker.model');
const Attendance = require('./src/models/attendance.model');
const DailyReport = require('./src/models/dailyReport.model');
const Safety = require('./src/models/safety.model');
const { signToken } = require('./src/services/auth.service');
const { closeConnection } = require('./src/config/database');

async function runPhase5Tests() {
  console.log('=== Starting Phase 5 Operational Boundaries & 4-Role RBAC Tests ===\n');

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;

  // Mock User.findById for authentication
  const origUserFind = User.findById;
  const mockUsers = {
    10: { id: 10, name: 'Alice PM', email: 'pm@example.com', role: 'project_manager', is_active: true },
    11: { id: 11, name: 'Other PM', email: 'otherpm@example.com', role: 'project_manager', is_active: true },
    20: { id: 20, name: 'Bob Engineer', email: 'bob@example.com', role: 'site_engineer', is_active: true },
    21: { id: 21, name: 'Unassigned Engineer', email: 'unassigned@example.com', role: 'site_engineer', is_active: true },
    30: { id: 30, name: 'Charlie Worker', email: 'charlie@example.com', role: 'worker', is_active: true },
    40: { id: 40, name: 'Diana Client', email: 'diana@example.com', role: 'client', is_active: true },
  };

  User.findById = async (id) => mockUsers[id] || null;

  // Mock Project.findById & exists
  const origProjectFind = Project.findById;
  const origProjectExists = Project.exists;
  const origProjectCreate = Project.create;
  const origProjectUpdate = Project.update;

  const mockProject = {
    id: 1,
    project_name: 'Metro Line Phase 2',
    location: 'Central Station',
    start_date: '2026-05-01',
    end_date: '2027-05-01',
    manager_id: 10,
    status: 'in_progress',
  };

  Project.findById = async (id) => (id === 1 ? mockProject : null);
  Project.exists = async (id) => id === 1;
  Project.create = async (data) => ({ id: 2, ...data });
  Project.update = async (id, data) => ({ ...mockProject, ...data });

  // Mock ProjectSiteEngineer
  const origPSEAssign = ProjectSiteEngineer.assignEngineer;
  const origPSERemove = ProjectSiteEngineer.removeEngineer;
  const origPSEGet = ProjectSiteEngineer.getEngineersByProject;
  const origPSEIsAssigned = ProjectSiteEngineer.isEngineerAssigned;

  const assignedEngineers = new Set(['1:20']); // project 1 -> engineer 20

  ProjectSiteEngineer.assignEngineer = async (projId, engId) => {
    assignedEngineers.add(`${projId}:${engId}`);
    return { id: 101, project_id: projId, site_engineer_id: engId, created_at: new Date() };
  };
  ProjectSiteEngineer.removeEngineer = async (projId, engId) => {
    assignedEngineers.delete(`${projId}:${engId}`);
    return true;
  };
  ProjectSiteEngineer.getEngineersByProject = async (projId) => {
    return Array.from(assignedEngineers)
      .filter((k) => k.startsWith(`${projId}:`))
      .map((k) => ({
        assignment_id: 101,
        project_id: projId,
        site_engineer_id: Number(k.split(':')[1]),
        name: 'Bob Engineer',
        email: 'bob@example.com',
        role: 'site_engineer',
      }));
  };
  ProjectSiteEngineer.isEngineerAssigned = async (projId, engId) => {
    return assignedEngineers.has(`${projId}:${engId}`);
  };

  // Mock Models for site operations
  Worker.create = async (d) => ({ id: 50, ...d });
  Worker.exists = async () => true;
  Attendance.upsertRecords = async (recs) => recs.map((r, i) => ({ id: i + 1, ...r }));
  Material.findById = async (id) => (id === 1 ? { id: 1, project_id: 1, name: 'Cement', quantity: 100 } : null);
  Material.findByProjectAndName = async () => null;
  Material.create = async (d) => ({ id: 99, ...d });
  Material.updateQuantity = async (id, q) => ({ id, quantity: q });
  Issue.findById = async (id) => (id === 1 ? { id: 1, project_id: 1, status: 'open' } : null);
  Issue.create = async (d) => ({ id: 88, ...d });
  Issue.updateStatus = async (id, s) => ({ id, status: s });
  DailyReport.create = async (d) => ({ id: 77, ...d });
  Safety.create = async (d) => ({ id: 66, ...d });

  // Generate tokens
  const pmToken = signToken(mockUsers[10]);
  const otherPmToken = signToken(mockUsers[11]);
  const engToken = signToken(mockUsers[20]);
  const unassignedEngToken = signToken(mockUsers[21]);
  const workerToken = signToken(mockUsers[30]);
  const clientToken = signToken(mockUsers[40]);

  try {
    // --------------------------------------------------------------------------
    // 1. Projects Routes & RBAC
    // --------------------------------------------------------------------------
    console.log('--- 1. Testing Project Management Boundaries (/api/projects) ---');

    // 1.1 Worker cannot create a project -> 403
    const workerProjRes = await fetch(`${baseUrl}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${workerToken}` },
      body: JSON.stringify({ project_name: 'Worker Project', location: 'X', start_date: '2026-06-01' }),
    });
    assert.strictEqual(workerProjRes.status, 403);

    // 1.2 Site Engineer cannot create a project -> 403
    const engProjRes = await fetch(`${baseUrl}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${engToken}` },
      body: JSON.stringify({ project_name: 'Eng Project', location: 'X', start_date: '2026-06-01' }),
    });
    assert.strictEqual(engProjRes.status, 403);

    // 1.3 Client cannot create a project -> 403
    const clientProjRes = await fetch(`${baseUrl}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientToken}` },
      body: JSON.stringify({ project_name: 'Client Project', location: 'X', start_date: '2026-06-01' }),
    });
    assert.strictEqual(clientProjRes.status, 403);

    // 1.4 Project Manager CAN create a project -> 201
    const pmProjRes = await fetch(`${baseUrl}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pmToken}` },
      body: JSON.stringify({ project_name: 'Valid Project', location: 'City', start_date: '2026-06-01' }),
    });
    assert.strictEqual(pmProjRes.status, 201);

    // 1.5 Assign Engineer: Only PM allowed
    const workerAssign = await fetch(`${baseUrl}/projects/1/assign-engineer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${workerToken}` },
      body: JSON.stringify({ site_engineer_id: 20 }),
    });
    assert.strictEqual(workerAssign.status, 403);

    // 1.6 Assign Engineer: Reject non-site-engineer user -> 400
    const pmAssignWorker = await fetch(`${baseUrl}/projects/1/assign-engineer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pmToken}` },
      body: JSON.stringify({ site_engineer_id: 30 }), // user 30 is worker
    });
    assert.strictEqual(pmAssignWorker.status, 400);

    // 1.7 Assign Engineer: Valid assignment -> 201
    const pmAssignEng = await fetch(`${baseUrl}/projects/1/assign-engineer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pmToken}` },
      body: JSON.stringify({ site_engineer_id: 20 }),
    });
    assert.strictEqual(pmAssignEng.status, 201);

    // 1.8 GET assigned engineers -> 200
    const getEngRes = await fetch(`${baseUrl}/projects/1/engineers`, {
      headers: { Authorization: `Bearer ${pmToken}` },
    });
    assert.strictEqual(getEngRes.status, 200);
    const engData = await getEngRes.json();
    assert.strictEqual(engData.count >= 1, true);

    // 1.9 DELETE assign-engineer: PM allowed -> 200
    const delEngRes = await fetch(`${baseUrl}/projects/1/assign-engineer/20`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${pmToken}` },
    });
    assert.strictEqual(delEngRes.status, 200);

    console.log('✓ Project routes & engineer assignment passed.');

    // --------------------------------------------------------------------------
    // 2. Site Operations Modules
    // --------------------------------------------------------------------------
    console.log('--- 2. Testing Site Operations (Workforce, Materials, Issues, Reports, Safety) ---');

    // 2.1 Workforce Attendance: Worker rejected -> 403
    const workerAtt = await fetch(`${baseUrl}/workforce/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${workerToken}` },
      body: JSON.stringify({ project_id: 1, date: '2026-05-10', records: [{ worker_id: 1, status: 'present' }] }),
    });
    assert.strictEqual(workerAtt.status, 403);

    // 2.2 Workforce Attendance: PM of this project -> 200
    const pmAtt = await fetch(`${baseUrl}/workforce/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pmToken}` },
      body: JSON.stringify({ project_id: 1, date: '2026-05-10', records: [{ worker_id: 1, status: 'present' }] }),
    });
    assert.strictEqual(pmAtt.status, 200);

    // 2.3 Materials: Worker cannot register material -> 403
    const workerMat = await fetch(`${baseUrl}/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${workerToken}` },
      body: JSON.stringify({ project_id: 1, name: 'Steel', quantity: 50, unit: 'Tons' }),
    });
    assert.strictEqual(workerMat.status, 403);

    // 2.4 Materials: Worker cannot update stock -> 403
    const workerStock = await fetch(`${baseUrl}/materials/1/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${workerToken}` },
      body: JSON.stringify({ adjustment: 10 }),
    });
    assert.strictEqual(workerStock.status, 403);

    // 2.5 Materials: PM of this project CAN update stock -> 200
    const pmStock = await fetch(`${baseUrl}/materials/1/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pmToken}` },
      body: JSON.stringify({ adjustment: 10 }),
    });
    assert.strictEqual(pmStock.status, 200);

    // 2.6 Issues: Worker CAN report an issue -> 201
    const workerIssue = await fetch(`${baseUrl}/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${workerToken}` },
      body: JSON.stringify({ project_id: 1, description: 'Safety hazard at grid 4', priority: 'high' }),
    });
    assert.strictEqual(workerIssue.status, 201);

    // 2.7 Issues: Worker CANNOT update issue status -> 403
    const workerIssueStatus = await fetch(`${baseUrl}/issues/1/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${workerToken}` },
      body: JSON.stringify({ status: 'resolved' }),
    });
    assert.strictEqual(workerIssueStatus.status, 403);

    // 2.8 Issues: PM of this project CAN update issue status -> 200
    const pmIssueStatus = await fetch(`${baseUrl}/issues/1/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pmToken}` },
      body: JSON.stringify({ status: 'resolved' }),
    });
    assert.strictEqual(pmIssueStatus.status, 200);

    // 2.9 Daily Reports: Worker cannot create report -> 403
    const workerReport = await fetch(`${baseUrl}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${workerToken}` },
      body: JSON.stringify({ project_id: 1, report_date: '2026-05-10', work_summary: 'Summary' }),
    });
    assert.strictEqual(workerReport.status, 403);

    // 2.10 Daily Reports: PM of this project CAN create report -> 201
    const pmReport = await fetch(`${baseUrl}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pmToken}` },
      body: JSON.stringify({ project_id: 1, report_date: '2026-05-10', work_summary: 'Summary' }),
    });
    assert.strictEqual(pmReport.status, 201);

    // 2.11 Safety: Worker cannot create safety record -> 403
    const workerSafety = await fetch(`${baseUrl}/safety`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${workerToken}` },
      body: JSON.stringify({ project_id: 1, record_type: 'quality_inspection', description: 'Inspection', date: '2026-05-10' }),
    });
    assert.strictEqual(workerSafety.status, 403);

    // 2.12 Safety: PM of this project CAN create safety record -> 201
    const pmSafety = await fetch(`${baseUrl}/safety`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pmToken}` },
      body: JSON.stringify({ project_id: 1, record_type: 'quality_inspection', description: 'Inspection', date: '2026-05-10' }),
    });
    assert.strictEqual(pmSafety.status, 201);

    console.log('✓ Site operations RBAC and operational boundaries passed.');

    console.log('\nAll Phase 5 Operational Boundaries and 4-Role RBAC Tests PASSED successfully!');
  } finally {
    server.close();
    User.findById = origUserFind;
    Project.findById = origProjectFind;
    Project.exists = origProjectExists;
    Project.create = origProjectCreate;
    Project.update = origProjectUpdate;
    ProjectSiteEngineer.assignEngineer = origPSEAssign;
    ProjectSiteEngineer.removeEngineer = origPSERemove;
    ProjectSiteEngineer.getEngineersByProject = origPSEGet;
    ProjectSiteEngineer.isEngineerAssigned = origPSEIsAssigned;
    await closeConnection();
  }
}

runPhase5Tests().catch((err) => {
  console.error('Phase 5 Test failed:', err);
  process.exit(1);
});

