# Jobsite Management System (JMS) - Frontend

Modern React application for the Jobsite Management System (JMS), built with React 18, React Router v6, Axios, Lucide Icons, and Vite.

## Features & Implementation (Phase 6)

1. **API Client & Interceptors** (`src/api/client.js`):
   - Configured with baseURL fallback (`process.env.REACT_APP_API_URL`, `VITE_API_URL`, or `/api`).
   - Request interceptor attaching `Authorization: Bearer <token>` from `localStorage`.
   - Response interceptor handling `401 Unauthorized` by clearing session credentials and redirecting to `/login`.

2. **Authentication & Session Hydration** (`src/context/AuthContext.jsx`):
   - State: `{ user, token, isAuthenticated, loading }`.
   - Token verification on initial mount via `GET /api/auth/me`.
   - `login()`, `register()`, and `logout()` methods.

3. **Routing & Guards** (`src/routes/`):
   - `ProtectedRoute`: Guarantees access only to authenticated users.
   - `RoleGuard`: Enforces role authorization (`admin`, `project_manager`, `site_engineer`, `worker`, `client`) and displays an unauthorized screen if permission is lacking.

4. **Layout & Dynamic Navigation Shell** (`src/components/layout/`):
   - Sticky top navbar with user profile info, role badge pill, and sign out button.
   - Collapsible sidebar with active navigation indicators and role-tailored menus:
     - **Administrator**: System Overview, Projects, Tasks, Users & Roles, Materials, Equipment, Reports, Issues, Safety.
     - **Project Manager**: Project Dashboard, Projects, Tasks, Workforce, Materials, Equipment, Reports, Issues, Safety.
     - **Site Engineer**: Dashboard, Daily Reports, Attendance Logging, Task Execution, Materials Stock, Equipment Status, Issues, Safety.
     - **Worker**: My Assigned Tasks, Report an Issue.
     - **Client**: Progress Dashboard, Approved Daily Reports, Safety Milestones.

5. **Core Application Views** (`src/pages/`):
   - **AuthPage**: Sign In / Registration form with input validation and role picker.
   - **DashboardPage**: Active project selector, KPI cards (Total Tasks, Overdue, Low Stock, Open Issues, Attendance), active real-time operational alerts from `/api/notifications/project/:projectId`, and sanitized client progress dashboard from `/api/client/summary/:projectId`.
   - **TaskManagementPage**: Tasks list with status badges, inline/modal completion slider for assigned workers, and task creation form for managers.
   - **ReportsAndIssuesPage**: Tabbed daily activity logger and defect tracking table with resolution actions.
   - **WorkforcePage**: Field worker registry and interactive daily attendance muster roll (`present`, `half_day`, `absent`).
   - **InventoryEquipmentPage**: Materials inventory highlighting items at or below minimum stock with warning badges, stock adjustment modal, and equipment condition toggles.
   - **ProjectsPage**: Full projects portfolio directory with date timeline validators.
   - **SafetyPage**: Compliance audits, quality inspections, and incident reporting.

## How to Run Locally

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Start Local Development Server
```bash
npm start
# or
npm run dev
```
The application will launch on **http://localhost:3000/** and automatically proxy `/api` requests to the backend server running on `http://localhost:5000`.

### 3. Production Build
```bash
npm run build
```
Build output is generated into the `frontend/dist/` directory.
