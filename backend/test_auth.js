'use strict';

const assert = require('assert');
const { validateRegister, validateLogin } = require('./src/validators/auth.validator');
const { hashPassword, verifyPassword, signToken, verifyToken, toPublicUser } = require('./src/services/auth.service');
const { authorizeRoles } = require('./src/middlewares/auth.middleware');
const ENUMS = require('./src/constants/enums');
const app = require('./src/app');

async function runTests() {
  console.log('--- Testing Validators ---');

  // Register: missing name
  const r1 = validateRegister({ email: 'test@example.com', password: 'password123' });
  assert.strictEqual(r1.errors.length, 1);
  assert.strictEqual(r1.errors[0].field, 'name');

  // Register: invalid email
  const r2 = validateRegister({ name: 'John Doe', email: 'invalid-email', password: 'password123' });
  assert.strictEqual(r2.errors.length, 1);
  assert.strictEqual(r2.errors[0].field, 'email');

  // Register: short password (< 6 chars)
  const r3 = validateRegister({ name: 'John Doe', email: 'john@example.com', password: '123' });
  assert.strictEqual(r3.errors.length, 1);
  assert.strictEqual(r3.errors[0].field, 'password');

  // Register: invalid role
  const r4 = validateRegister({ name: 'John Doe', email: 'john@example.com', password: 'password123', role: 'superhero' });
  assert.strictEqual(r4.errors.length, 1);
  assert.strictEqual(r4.errors[0].field, 'role');

  // Register: admin role must be rejected
  const rAdmin = validateRegister({ name: 'John Doe', email: 'john@example.com', password: 'password123', role: 'admin' });
  assert.strictEqual(rAdmin.errors.length, 1);
  assert.strictEqual(rAdmin.errors[0].field, 'role');

  // Register: valid with default role
  const r5 = validateRegister({ name: 'John Doe', email: 'JOHN@EXAMPLE.COM', password: 'password123' });
  assert.strictEqual(r5.errors.length, 0);
  assert.strictEqual(r5.value.role, 'worker');
  assert.strictEqual(r5.value.email, 'john@example.com');

  // Register: valid with explicit role
  for (const role of ENUMS.USER_ROLE) {
    const rRole = validateRegister({ name: 'John Doe', email: 'john@example.com', password: 'password123', role });
    assert.strictEqual(rRole.errors.length, 0);
    assert.strictEqual(rRole.value.role, role);
  }

  // Login validator
  const l1 = validateLogin({});
  assert.strictEqual(l1.errors.length, 2);

  const l2 = validateLogin({ email: 'test@example.com', password: 'secret' });
  assert.strictEqual(l2.errors.length, 0);

  console.log('✓ Validators passed.');

  console.log('--- Testing AuthService (Bcrypt & JWT) ---');

  // Hash & verify
  const rawPw = 'MySecurePass123!';
  const hashed = await hashPassword(rawPw);
  assert.ok(hashed.startsWith('$2'));
  const match = await verifyPassword(rawPw, hashed);
  assert.strictEqual(match, true);
  const mismatch = await verifyPassword('wrongpassword', hashed);
  assert.strictEqual(mismatch, false);

  // JWT signing & verification
  const user = { id: 42, role: 'project_manager', email: 'pm@example.com', name: 'Bob' };
  const token = signToken(user);
  assert.ok(typeof token === 'string' && token.length > 20);

  const decoded = verifyToken(token);
  assert.strictEqual(decoded.id, 42);
  assert.strictEqual(decoded.role, 'project_manager');
  assert.strictEqual(decoded.email, 'pm@example.com');

  console.log('✓ AuthService passed.');

  console.log('--- Testing authorizeRoles Middleware ---');

  // Test authorizeRoles rejecting invalid roles at creation
  assert.throws(() => authorizeRoles('invalid_role'), /invalid role/);

  // Test authorizeRoles passing with 4-role model
  const middleware = authorizeRoles('project_manager', 'site_engineer');
  let nextCalled = false;
  let errorReceived = null;
  const mockNext = (err) => {
    if (err) errorReceived = err;
    else nextCalled = true;
  };

  // Case 1: unauthenticated (req.user missing)
  const reqUnauth = {};
  middleware(reqUnauth, {}, mockNext);
  assert.strictEqual(errorReceived.statusCode, 401);

  // Case 2: forbidden role (worker)
  nextCalled = false;
  errorReceived = null;
  const reqForbidden = { user: { id: 1, role: 'worker' } };
  middleware(reqForbidden, {}, mockNext);
  assert.strictEqual(errorReceived.statusCode, 403);
  assert.strictEqual(errorReceived.message, 'Forbidden: insufficient permissions');

  // Case 3: admin role rejected
  nextCalled = false;
  errorReceived = null;
  const reqAdmin = { user: { id: 99, role: 'admin' } };
  middleware(reqAdmin, {}, mockNext);
  assert.strictEqual(errorReceived.statusCode, 403);
  assert.strictEqual(errorReceived.message, 'Forbidden: insufficient permissions');

  // Case 4: authorized role
  nextCalled = false;
  errorReceived = null;
  const reqAllowed = { user: { id: 2, role: 'project_manager' } };
  middleware(reqAllowed, {}, mockNext);
  assert.strictEqual(nextCalled, true);
  assert.strictEqual(errorReceived, null);

  console.log('✓ authorizeRoles passed.');

  console.log('--- Testing Express App Endpoints & Validation Handling ---');
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/auth`;

  try {
    // 1. Register with bad payload -> 400
    const resBadRegister = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'A', email: 'bad' })
    });
    const badRegBody = await resBadRegister.json();
    assert.strictEqual(resBadRegister.status, 400);
    assert.strictEqual(badRegBody.success, false);
    assert.ok(badRegBody.message.includes('Validation failed'));

    // 2. Login with bad payload -> 400
    const resBadLogin = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const badLoginBody = await resBadLogin.json();
    assert.strictEqual(resBadLogin.status, 400);
    assert.strictEqual(badLoginBody.success, false);

    // 3. /me without token -> 401
    const resMeNoToken = await fetch(`${baseUrl}/me`);
    const meNoTokenBody = await resMeNoToken.json();
    assert.strictEqual(resMeNoToken.status, 401);
    assert.strictEqual(meNoTokenBody.success, false);

    // 4. /me with invalid token -> 401
    const resMeBadToken = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: 'Bearer thisisnotarealtoken' }
    });
    const meBadTokenBody = await resMeBadToken.json();
    assert.strictEqual(resMeBadToken.status, 401);
    assert.strictEqual(meBadTokenBody.success, false);

    console.log('✓ Express App route tests passed.');
  } finally {
    server.close();
    const { closeConnection } = require('./src/config/database');
    await closeConnection();
  }

  console.log('\nAll Auth & RBAC unit tests PASSED successfully!');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
