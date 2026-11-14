# JMS Backend

Node.js + Express + PostgreSQL (Knex) API for the Jobsite Management System.
Targets a hosted **Supabase** Postgres database (any standard PostgreSQL also works).

## Setup (Supabase)

1. Supabase Dashboard → **Connect** → copy the connection strings.
2. In `backend/.env` set:
   - `SUPABASE_DB_URL` = Transaction pooler string (port 6543) — used by the API.
   - `SUPABASE_MIGRATION_DB_URL` = Session pooler string (port 5432) — used by migrations (optional, recommended).
   - URL-encode special characters in the password (`@` → `%40`).
3. Run:

```bash
cd backend
npm install
npm run db:check              # verify connectivity (SSL auto-enabled for Supabase)
npm run migrate               # create all tables on Supabase
npm run dev                   # http://localhost:5000/api/health -> 200 {"status":"ok"}
```

SSL is enabled automatically for `*.supabase.co` / `*.supabase.com` hosts
(`rejectUnauthorized: false`; set `DB_SSL_CA_PATH` for strict verification).
Migration `..._enable_row_level_security` turns on RLS so Supabase's public Data API
(anon key) cannot read JMS tables; the backend connects as the table owner and is unaffected.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` / `npm start` | Run with nodemon / node |
| `npm run migrate` | Apply pending migrations |
| `npm run migrate:rollback` | Roll back last batch |
| `npm run migrate:reset` | Roll back everything |
| `npm run migrate:status` | Show migration status |
| `npm run migrate:make <name>` | Create a new migration |

## Structure

```
src/
  app.js              Express app (middleware, routes, error handling)
  server.js           Bootstrap + graceful shutdown
  config/             env loader, pooled Knex instance
  constants/enums.js  Enum values shared by DB + validators
  controllers/        Request handlers
  middlewares/        asyncHandler, notFound, errorHandler
  migrations/         Knex migrations (schema source of truth)
  routes/             Routers (mounted under API_PREFIX)
  seeds/              Knex seed files
  utils/              Migration helpers
```

## Referential rules

| FK | On delete |
| --- | --- |
| `*.project_id` → projects | CASCADE |
| `attendance.worker_id` → workers | CASCADE |
| `tasks.assigned_user_id` → users | SET NULL |
| `projects.manager_id`, `daily_reports.created_by`, `issues.reported_by`, `documents.uploaded_by` → users | RESTRICT |

All FKs use `ON UPDATE CASCADE` and are indexed. Every table has `created_at`/`updated_at`
(timestamptz), with `updated_at` maintained by a DB trigger.

## Authentication & RBAC

- **JWT Configuration**: `JWT_SECRET` and `JWT_EXPIRES_IN` (default `1d`).
- **Roles**: `'admin'`, `'project_manager'`, `'site_engineer'`, `'worker'`, `'client'`.

### Endpoints

| Method | Endpoint | Access | Body / Params | Description |
| --- | --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | `{ name, email, password, role? }` | Registers user (default role: `worker`). Returns sanitized user. |
| `POST` | `/api/auth/login` | Public | `{ email, password }` | Authenticates credentials. Returns `{ success: true, token, user }`. |
| `GET` | `/api/auth/me` | Protected | Bearer `<token>` | Returns `{ success: true, user: { id, name, email, role } }`. |

### Middleware Usage

```javascript
const { authenticateToken, authorizeRoles } = require('../middlewares/auth.middleware');

// Protect route (authenticated only)
router.get('/protected', authenticateToken, handler);

// Role-based authorization
router.post('/projects', authenticateToken, authorizeRoles('admin', 'project_manager'), handler);
```

## Projects, Tasks & Workforce API

All endpoints require `Authorization: Bearer <token>`.

### Projects (`/api/projects`)

| Method | Endpoint | Allowed Roles | Description |
| --- | --- | --- | --- |
| `POST` | `/api/projects` | `admin`, `project_manager` | Create project (`manager_id` defaults to current user). Validates `end_date >= start_date`. |
| `GET` | `/api/projects` | All roles | List projects. Filters: `?status=...&manager_id=...`. Clients see active projects by default. |
| `GET` | `/api/projects/:id` | All roles | Project details with manager name & email. |
| `PUT/PATCH` | `/api/projects/:id` | `admin`, `project_manager` | Update project fields. Validates dates and enums. |

### Tasks (`/api/tasks`)

| Method | Endpoint | Allowed Roles | Description |
| --- | --- | --- | --- |
| `POST` | `/api/tasks` | `admin`, `project_manager` | Create task. Verifies `project_id` exists. |
| `GET` | `/api/tasks/project/:projectId` | All roles | List tasks for project. Filters: `?status=...&priority=...&assigned_user_id=...`. Includes assignee name & email. |
| `PATCH` | `/api/tasks/:id/status` | `admin`, `project_manager`, `site_engineer`, `worker` | Update task status & completion percentage. **Worker restriction**: A worker can only update tasks assigned to them (`assigned_user_id === req.user.id`). Auto sets status to `completed` if `completion_percentage === 100`. |

### Workforce & Attendance (`/api/workforce`)

| Method | Endpoint | Allowed Roles | Description |
| --- | --- | --- | --- |
| `POST` | `/api/workforce` | `admin`, `project_manager`, `site_engineer` | Register worker (`name`, `contact`, `contractor_details`). |
| `GET` | `/api/workforce` | All roles | List workers. Optional search filter: `?search=...`. |
| `POST` | `/api/workforce/attendance` | `admin`, `project_manager`, `site_engineer` | Record attendance (single or batch `{ project_id, date, records: [{ worker_id, status }] }`). Upserts on conflict. |
| `GET` | `/api/workforce/attendance/:projectId` | All roles | List attendance for project. Optional date filter: `?date=YYYY-MM-DD`. Includes worker names. |

### Materials & Inventory (`/api/materials`)

| Method | Endpoint | Allowed Roles | Description |
| --- | --- | --- | --- |
| `POST` | `/api/materials` | `admin`, `project_manager`, `site_engineer` | Register material. Validates `quantity >= 0`, `minimum_stock >= 0`. Enforces unique name per project. |
| `GET` | `/api/materials/project/:projectId` | All roles | List materials for project. Includes computed `is_low_stock` flag. |
| `PATCH` | `/api/materials/:id/stock` | `admin`, `project_manager`, `site_engineer` | Update stock via absolute `quantity` or relative `adjustment`. Prevents negative inventory. Returns `alert` if low stock. |

### Equipment Management (`/api/equipment`)

| Method | Endpoint | Allowed Roles | Description |
| --- | --- | --- | --- |
| `POST` | `/api/equipment` | `admin`, `project_manager`, `site_engineer` | Register equipment (`name`, `availability`, `condition`). |
| `GET` | `/api/equipment/project/:projectId` | All roles | List equipment for project. Filters: `?condition=...&availability=...`. |
| `PATCH` | `/api/equipment/:id` | `admin`, `project_manager`, `site_engineer` | Update equipment condition or availability. |

### Daily Site Reports (`/api/reports`)

| Method | Endpoint | Allowed Roles | Description |
| --- | --- | --- | --- |
| `POST` | `/api/reports` | `admin`, `project_manager`, `site_engineer` | Create daily report. Automatically sets `created_by` = current user. |
| `GET` | `/api/reports/project/:projectId` | All roles | List daily reports ordered by date DESC. Joined with creator details. Filters: `?date=...&page=...&limit=...`. |

### Site Issues & Defect Tracking (`/api/issues`)

| Method | Endpoint | Allowed Roles | Description |
| --- | --- | --- | --- |
| `POST` | `/api/issues` | `admin`, `project_manager`, `site_engineer`, `worker` | Report an issue. Automatically sets `reported_by` = current user. |
| `GET` | `/api/issues/project/:projectId` | All roles | List issues for project with reporter name. Filters: `?status=...&priority=...`. |
| `PATCH` | `/api/issues/:id/status` | `admin`, `project_manager`, `site_engineer` | Update issue status (`open`, `in_progress`, `resolved`). (Workers cannot resolve issues). |

### Safety & Quality Records (`/api/safety`)

| Method | Endpoint | Allowed Roles | Description |
| --- | --- | --- | --- |
| `POST` | `/api/safety` | `admin`, `project_manager`, `site_engineer` | Log safety incident or quality inspection. |
| `GET` | `/api/safety/project/:projectId` | All roles | List safety and quality records for project. Filters: `?record_type=...`. |



