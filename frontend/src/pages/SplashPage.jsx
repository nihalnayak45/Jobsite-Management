import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HardHat,
  QrCode,
  TrendingUp,
  Boxes,
  Wrench,
  ShieldCheck,
  Users,
  Briefcase,
  Building2,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Activity,
  Layers,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import QRScannerModal from '../components/qr/QRScannerModal';
import ScanActionDrawer from '../components/qr/ScanActionDrawer';

export default function SplashPage() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeScanPayload, setActiveScanPayload] = useState(null);
  const [activeRoleTab, setActiveRoleTab] = useState('project_manager');

  const handleScanDetected = (payload) => {
    setIsScannerOpen(false);
    setActiveScanPayload(payload);
  };

  const rolesData = [
    {
      id: 'project_manager',
      title: 'Project Manager',
      icon: Briefcase,
      color: '#d97706',
      badge: 'Project Orchestration',
      tagline: 'Lead milestones, budgets, and operational boundaries',
      features: [
        'Create and configure multi-phase construction projects',
        'Assign and manage certified Site Engineers',
        'Track planned vs. actual project S-Curve progress in real-time',
        'Analyze material burn rates and receive 7-day depletion alerts',
        'Direct access to safety incident distribution heatmaps',
      ],
    },
    {
      id: 'site_engineer',
      title: 'Site Engineer',
      icon: Wrench,
      color: '#0284c7',
      badge: 'Field Supervision',
      tagline: 'Manage daily jobsite execution, equipment, and supplies',
      features: [
        'Single-tap QR scanning to adjust pallet inventory on site',
        'Log machinery operational condition & maintenance schedules',
        'Record workforce daily attendance (Present, Absent, Half-Day)',
        'Submit daily site work logs and verify inspection checklists',
        'Triage, update, and resolve reported site defect issues',
      ],
    },
    {
      id: 'worker',
      title: 'Field Worker',
      icon: HardHat,
      color: '#16a34a',
      badge: 'Field Operations',
      tagline: 'Hands-on task execution, machinery checkouts, and safety',
      features: [
        'Instant mobile access to assigned tasks and priority deadlines',
        'Update task completion percentage directly from the field',
        '1-tap QR check-out / return for power tools and heavy machinery',
        'File geotagged defect reports at specific site pillars or zones',
        'Simplified worker interface optimized for mobile site usage',
      ],
    },
    {
      id: 'client',
      title: 'Client & Stakeholder',
      icon: Building2,
      color: '#7c3aed',
      badge: 'Executive Oversight',
      tagline: 'Transparent progress curves and milestone tracking',
      features: [
        'High-level Area / S-Curve chart showing baseline vs. actual execution',
        'Milestone donut breakdown (Completed vs. Remaining Tasks)',
        'Executive approved daily work summaries without internal noise',
        'Safety incident milestones and quality assurance compliance',
        'Clean read-only access for external investors and owners',
      ],
    },
  ];

  const activeRole = rolesData.find((r) => r.id === activeRoleTab) || rolesData[0];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', overflowX: 'hidden' }}>
      {/* 1. TOP NAVIGATION BAR */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backdropFilter: 'blur(12px)',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          borderBottom: '1px solid rgba(51, 65, 85, 0.6)',
          padding: '0.9rem 1.75rem',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(245, 158, 11, 0.35)',
              }}
            >
              <HardHat size={22} color="#ffffff" />
            </div>
            <div>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#ffffff' }}>
                JMS
              </span>
              <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 700, marginLeft: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Jobsite
              </span>
            </div>
          </div>

          {/* Center Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }} className="hide-on-mobile">
            <a href="#features" style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none', transition: 'color 0.15s' }}>
              Innovations
            </a>
            <a href="#roles" style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none', transition: 'color 0.15s' }}>
              4 Roles Architecture
            </a>
            <a href="#analytics" style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none', transition: 'color 0.15s' }}>
              Depletion Runway
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'rgba(30, 41, 59, 0.8)',
                border: '1px solid #334155',
                color: '#f8fafc',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.825rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Test QR scanner"
            >
              <QrCode size={15} color="#f59e0b" /> Scan QR
            </button>

            {isAuthenticated ? (
              <Link
                to={user?.role === 'worker' ? '/tasks' : '/'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  backgroundColor: '#d97706',
                  color: '#ffffff',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  textDecoration: 'none',
                  boxShadow: '0 2px 8px rgba(217, 119, 6, 0.4)',
                }}
              >
                Dashboard <ArrowRight size={15} />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  style={{
                    color: '#f8fafc',
                    padding: '0.5rem 0.9rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  style={{
                    backgroundColor: '#d97706',
                    color: '#ffffff',
                    padding: '0.5rem 1.1rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(217, 119, 6, 0.35)',
                  }}
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section
        style={{
          padding: '4.5rem 1.5rem 3.5rem',
          textAlign: 'center',
          position: 'relative',
          background: 'radial-gradient(circle at 50% 20%, rgba(245, 158, 11, 0.12) 0%, rgba(15, 23, 42, 0) 70%)',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {/* Eyebrow Pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              padding: '0.35rem 0.9rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 800,
              color: '#fbbf24',
              marginBottom: '1.5rem',
            }}
          >
            <Zap size={14} /> Construction 4.0 Jobsite Intelligence
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.75rem)',
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              marginBottom: '1.25rem',
              color: '#ffffff',
            }}
          >
            Real-Time Jobsite Execution & Asset Intelligence
          </h1>

          <p
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.25rem)',
              color: '#94a3b8',
              lineHeight: 1.6,
              maxWidth: '750px',
              margin: '0 auto 2.25rem',
            }}
          >
            Unify Project Managers, Site Engineers, Workers, and Clients. Track high-level planned vs.
            actual S-Curves, log material burn rates, and execute 1-tap QR machinery checkouts.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '3.5rem' }}>
            <Link
              to="/register"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#d97706',
                color: '#ffffff',
                padding: '0.9rem 1.85rem',
                borderRadius: '10px',
                fontSize: '1rem',
                fontWeight: 800,
                textDecoration: 'none',
                boxShadow: '0 8px 20px rgba(217, 119, 6, 0.35)',
                transition: 'transform 0.15s ease',
              }}
            >
              Start Free Today <ArrowRight size={18} />
            </Link>

            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                color: '#f8fafc',
                padding: '0.9rem 1.85rem',
                borderRadius: '10px',
                fontSize: '1rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Sign In to Jobsite
            </Link>

            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'transparent',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                color: '#fbbf24',
                padding: '0.9rem 1.5rem',
                borderRadius: '10px',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <QrCode size={18} /> Test QR Scanner
            </button>
          </div>

          {/* Interactive Feature Snapshot Strip */}
          <div
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '16px',
              padding: '1.25rem 1.5rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.25rem',
              textAlign: 'left',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(2, 132, 199, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={20} color="#38bdf8" />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Planned vs Actual</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>Live S-Curve Tracking</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(234, 88, 12, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Boxes size={20} color="#fb923c" />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Depletion Forecast</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>14-Day Burn Rate ($\bar&#123;B&#125;$)</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(22, 163, 74, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <QrCode size={20} color="#4ade80" />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Scan-to-Action</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>1-Tap Equipment QR</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. INNOVATIONS SHOWCASE */}
      <section id="features" style={{ padding: '5rem 1.5rem', maxWidth: '1240px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#ffffff', marginBottom: '0.75rem' }}>
            Built for Heavy Construction & Field Operations
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1.05rem', maxWidth: '640px', margin: '0 auto' }}>
            Eliminate paperwork and clipboard delays. Three core technology pillars streamline jobsite delivery.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem' }}>
          {/* Card 1: QR Pipeline */}
          <div
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '16px',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <QrCode size={24} color="#f59e0b" />
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem' }}>
                Digital Asset Tagging & "Scan-to-Action"
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                Print durable QR sticker badges for machinery, bins, and site pillars. Instant 1-tap
                checkouts, quick inventory deductions, and geotagged defect reports.
              </p>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, borderTop: '1px solid #334155', paddingTop: '1rem' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                <CheckCircle2 size={16} color="#10b981" /> 1-Tap Machinery Checkout/Check-in
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                <CheckCircle2 size={16} color="#10b981" /> Pallet Material Deduction Modal
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#cbd5e1', fontSize: '0.85rem' }}>
                <CheckCircle2 size={16} color="#10b981" /> Physical Zone Defect Geotagging
              </li>
            </ul>
          </div>

          {/* Card 2: Burn-Rate Analytics */}
          <div
            id="analytics"
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '16px',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(234, 88, 12, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <Boxes size={24} color="#ea580c" />
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem' }}>
                Burn-Rate Analytics & Depletion Runway
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                Historical daily consumption trends and predictive runway days. Recharts visual graphs
                with safety threshold lines and critical alerts if stock depletes before task milestones.
              </p>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, borderTop: '1px solid #334155', paddingTop: '1rem' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                <CheckCircle2 size={16} color="#10b981" /> 14-Day Rolling Burn Rate Engine
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                <CheckCircle2 size={16} color="#10b981" /> 7-Day Zero Stock Critical Alert
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#cbd5e1', fontSize: '0.85rem' }}>
                <CheckCircle2 size={16} color="#10b981" /> Minimum Stock Reference Thresholds
              </li>
            </ul>
          </div>

          {/* Card 3: Role-Tailored Progress & Heatmaps */}
          <div
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '16px',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(2, 132, 199, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <TrendingUp size={24} color="#0284c7" />
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem' }}>
                Progress S-Curves & Defect Heatmaps
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                Role-tailored dashboards powered by Recharts. Clients view planned vs. actual progress
                curves; Site Engineers analyze defect severity donuts and weekly workforce attendance.
              </p>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, borderTop: '1px solid #334155', paddingTop: '1rem' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                <CheckCircle2 size={16} color="#10b981" /> Cumulative Planned vs. Actual Area S-Curve
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                <CheckCircle2 size={16} color="#10b981" /> Defect Severity Distribution Donut
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#cbd5e1', fontSize: '0.85rem' }}>
                <CheckCircle2 size={16} color="#10b981" /> Weekly Headcount Attendance Trends
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 4. 4-ROLES ARCHITECTURE INTERACTIVE EXPLORER */}
      <section id="roles" style={{ padding: '4.5rem 1.5rem', backgroundColor: '#141e33', borderTop: '1px solid #1e293b', borderBottom: '1px solid #1e293b' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Tailored Role Boundaries
            </span>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 900, color: '#ffffff', marginTop: '0.4rem', letterSpacing: '-0.02em' }}>
              The 4-Role Architecture
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '1rem', maxWidth: '600px', margin: '0.5rem auto 0' }}>
              Click any role to inspect tailored permissions, operational workflows, and sign up directly.
            </p>
          </div>

          {/* Role Navigation Bar Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              backgroundColor: '#0f172a',
              padding: '0.4rem',
              borderRadius: '14px',
              border: '1px solid #334155',
              marginBottom: '2rem',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {rolesData.map((r) => {
              const Icon = r.icon;
              const isSelected = activeRoleTab === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setActiveRoleTab(r.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.75rem 1.25rem',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: isSelected ? r.color : 'transparent',
                    color: isSelected ? '#ffffff' : '#94a3b8',
                    fontWeight: isSelected ? 800 : 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={18} /> {r.title}
                </button>
              );
            })}
          </div>

          {/* Active Role Feature Detail Card */}
          <div
            style={{
              backgroundColor: '#1e293b',
              border: `2px solid ${activeRole.color}`,
              borderRadius: '16px',
              padding: '2.25rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #334155', paddingBottom: '1.25rem' }}>
              <div>
                <span
                  style={{
                    backgroundColor: `${activeRole.color}25`,
                    color: activeRole.color,
                    padding: '0.25rem 0.65rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                  }}
                >
                  {activeRole.badge}
                </span>
                <h3 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff', marginTop: '0.4rem' }}>
                  {activeRole.title}
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>
                  {activeRole.tagline}
                </p>
              </div>

              <Link
                to="/register"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  backgroundColor: activeRole.color,
                  color: '#ffffff',
                  padding: '0.75rem 1.35rem',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                  boxShadow: `0 4px 12px ${activeRole.color}50`,
                }}
              >
                Register as {activeRole.title} <ArrowRight size={16} />
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              {activeRole.features.map((feat, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                  <CheckCircle2 size={18} color={activeRole.color} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.5 }}>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer style={{ padding: '3.5rem 1.5rem 2rem', borderTop: '1px solid #1e293b', backgroundColor: '#090d16' }}>
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HardHat size={18} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ffffff' }}>Jobsite Management System (JMS)</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Construction 4.0 Operating System</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>
            <Link to="/login" style={{ color: '#94a3b8', textDecoration: 'none' }}>Sign In</Link>
            <Link to="/register" style={{ color: '#94a3b8', textDecoration: 'none' }}>Register</Link>
            <button
              onClick={() => setIsScannerOpen(true)}
              style={{ background: 'none', border: 'none', color: '#fbbf24', cursor: 'pointer', padding: 0, fontSize: '0.85rem', fontWeight: 600 }}
            >
              Test QR Scanner
            </button>
          </div>

          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            © 2026 JMS Platform. All rights reserved.
          </div>
        </div>
      </footer>

      {/* QR SCANNER MODAL */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanDetected}
      />

      {/* ACTION DRAWER ON SCAN */}
      <ScanActionDrawer
        isOpen={!!activeScanPayload}
        payload={activeScanPayload}
        onClose={() => setActiveScanPayload(null)}
        onActionSuccess={() => {
          navigate(user?.role === 'worker' ? '/tasks' : '/');
        }}
      />
    </div>
  );
}

