# Jobsite Management System (JMS)

A full-stack, enterprise-grade construction jobsite intelligence and workflow management system. Built with Node.js, Express, Knex, Supabase PostgreSQL, and React (Vite).

---

## 🏗️ Core Modules & Features

1. **Role-Based Access Control (RBAC):**
   - **Project Manager:** Project creation, site engineer assignment, full task lifecycle management, cross-module oversight.
   - **Site Engineer:** Workforce attendance logging, material inventory management, equipment status tracking, daily reporting, issue resolution.
   - **Worker:** My Assigned Tasks, milestone progress reporting, issue & defect reporting.
   - **Client:** Read-only access to high-level progress curves (S-Curves), milestones, approved work summaries, and safety compliance records.

2. **Site Intelligence & Real-Time Analytics:**
   - **Project S-Curve Progress:** Planned vs. Actual progress curves over time.
   - **Inventory Depletion & Burn-Rate Forecasts:** Daily material consumption tracking with threshold warnings and estimated runway days.
   - **Defect Distribution & Resolution Timelines:** Breakdown by severity (critical, high, medium, low) and mean time to resolution.
   - **Interactive Operational Alerts:** Actionable, clickable dashboard alerts with 1-click task and issue resolution.

3. **Digital Asset Tagging & QR Workflows:**
   - Deterministic QR payload generation for equipment asset tags and material pallets.
   - Camera-based HTML5 scanner with quick single-tap check-in/out and stock adjustments.

4. **Safety & Quality Management:**
   - OSHA safety incident logging, quality inspections, audit trails, and compliance milestones.

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js, Knex.js, PostgreSQL (Supabase pooler)
- **Frontend:** React 18, Vite, React Router v6, Lucide Icons, Recharts
- **Security & Auth:** JWT authentication, bcrypt password hashing, project-level access guards
- **QR Utilities:** `qrcode`, `html5-qrcode`

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or pnpm
- Supabase PostgreSQL instance (or local PostgreSQL)

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env and supply your Supabase DB connection string and JWT_SECRET
npm run migrate
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Running Concurrently from Root
```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Frontend
npm run dev:frontend
```

---

## 🧪 Testing

Run automated unit and integration test suites:
```bash
cd backend
npm test
```
All Phase 3, Phase 4, Phase 5 RBAC, Feature A/B QR action pipelines, and Feature C progress analytics tests are verified.
