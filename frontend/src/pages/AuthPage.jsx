import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  HardHat,
  LogIn,
  UserPlus,
  AlertCircle,
  Briefcase,
  Wrench,
  Building2,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const ROLES = [
  {
    id: 'project_manager',
    label: 'Project Manager',
    icon: Briefcase,
    badge: 'Project Lead',
    description: 'Creates projects, assigns site engineers, manages tasks, milestones, and monitors project S-Curves.',
  },
  {
    id: 'site_engineer',
    label: 'Site Engineer',
    icon: Wrench,
    badge: 'Field Ops',
    description: 'Supervises daily site ops, logs material stock via QR scan, tracks machinery, and manages workforce attendance.',
  },
  {
    id: 'worker',
    label: 'Field Worker',
    icon: HardHat,
    badge: 'Workforce',
    description: 'Views assigned tasks, updates progress %, single-tap equipment check-out via QR, and files defect issues.',
  },
  {
    id: 'client',
    label: 'Client',
    icon: Building2,
    badge: 'Stakeholder',
    description: 'Executive transparent read-only access to progress S-Curves, milestone donuts, and approved daily reports.',
  },
];

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const { showToast } = useToast();

  const [isRegister, setIsRegister] = useState(location.pathname === '/register');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'worker',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    setIsRegister(location.pathname === '/register');
  }, [location.pathname]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (error) setError('');
  };

  const handleSelectRole = (roleId) => {
    setFormData((prev) => ({ ...prev, role: roleId }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        if (!formData.name.trim()) throw new Error('Full Name is required');
        if (!formData.email.trim()) throw new Error('Email address is required');
        if (formData.password.length < 6) throw new Error('Password must be at least 6 characters');

        await register(formData);
        showToast('success', 'Registration successful! Signing you in...');
        const user = await login(formData.email, formData.password);
        navigate(user.role === 'worker' ? '/tasks' : from, { replace: true });
      } else {
        if (!formData.email.trim()) throw new Error('Email address is required');
        if (!formData.password) throw new Error('Password is required');

        const user = await login(formData.email, formData.password);
        showToast('success', `Welcome back, ${user.name}!`);
        navigate(user.role === 'worker' ? '/tasks' : from, { replace: true });
      }
    } catch (err) {
      let msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.message ||
        err.message ||
        'Authentication failed';

      if (err.response?.status === 500 && (!err.response?.data || typeof err.response?.data === 'string')) {
        msg = 'Backend server error (500). Please ensure backend is running.';
      } else if (err.code === 'ERR_NETWORK') {
        msg = 'Cannot connect to backend server on port 5000.';
      }

      setError(msg);
      showToast('error', msg);
    } finally {
      setLoading(false);
    }
  };

  const activeRoleMeta = ROLES.find((r) => r.id === formData.role) || ROLES[2];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at top, #1e293b 0%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.25rem',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: isRegister ? '520px' : '440px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid #334155',
          borderRadius: 'var(--radius-xl)',
          padding: '2.25rem',
          backgroundColor: '#ffffff',
          transition: 'max-width 0.2s ease',
        }}
      >
        {/* Back to Splash Link */}
        <div style={{ marginBottom: '1.25rem' }}>
          <Link
            to="/splash"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'var(--text-muted)',
              fontSize: '0.825rem',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-600)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <ArrowLeft size={14} /> Back to Overview
          </Link>
        </div>

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              margin: '0 auto 1rem auto',
              background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
            }}
          >
            <HardHat size={28} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', margin: 0 }}>
            Jobsite Management System
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.35rem' }}>
            {isRegister
              ? 'Select your role and create your jobsite account'
              : 'Sign in to access your project dashboard'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger-text)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Full Name</label>
              <input
                type="text"
                name="name"
                className="form-control"
                placeholder="e.g. Alex Mercer"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label" style={{ fontWeight: 700 }}>Email Address</label>
            <input
              type="email"
              name="email"
              className="form-control"
              placeholder="name@jobsite.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ fontWeight: 700 }}>Password</label>
            <input
              type="password"
              name="password"
              className="form-control"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          {/* REGISTER ONLY: ROLE SELECTION NAVIGATION BAR */}
          {isRegister && (
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>
                  Account Role
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary-700)', fontWeight: 700 }}>
                  Selected: {activeRoleMeta.label}
                </span>
              </div>

              {/* Horizontal / Segmented Nav Bar */}
              <nav
                aria-label="Account Role Selection Navigation Bar"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.45rem',
                  backgroundColor: '#f1f5f9',
                  padding: '0.4rem',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                }}
              >
                {ROLES.map((r) => {
                  const Icon = r.icon;
                  const isSelected = formData.role === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleSelectRole(r.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.65rem 0.65rem',
                        borderRadius: '8px',
                        border: isSelected ? '1px solid #d97706' : '1px solid transparent',
                        backgroundColor: isSelected ? '#d97706' : '#ffffff',
                        color: isSelected ? '#ffffff' : '#334155',
                        fontWeight: isSelected ? 800 : 600,
                        fontSize: '0.825rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 2px 4px rgba(217, 119, 6, 0.3)' : 'none',
                        textAlign: 'left',
                      }}
                    >
                      <Icon size={16} color={isSelected ? '#ffffff' : '#d97706'} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.label}
                      </span>
                    </button>
                  );
                })}
              </nav>

              {/* Role Scope Description Card */}
              <div
                style={{
                  marginTop: '0.65rem',
                  padding: '0.75rem 0.85rem',
                  borderRadius: '8px',
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fef3c7',
                  fontSize: '0.8rem',
                  color: '#92400e',
                  lineHeight: 1.45,
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: '0.15rem' }}>
                  {activeRoleMeta.badge} Responsibility:
                </div>
                <div>{activeRoleMeta.description}</div>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.85rem',
              fontSize: '0.95rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
            disabled={loading}
          >
            {loading ? (
              <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
            ) : isRegister ? (
              <>
                <UserPlus size={18} /> Complete Registration
              </>
            ) : (
              <>
                <LogIn size={18} /> Sign In
              </>
            )}
          </button>
        </form>

        {/* Toggle Login vs Register */}
        <div style={{ marginTop: '1.5rem', textAlign: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
          <button
            type="button"
            onClick={() => {
              const target = !isRegister;
              setIsRegister(target);
              navigate(target ? '/register' : '/login');
              setError('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary-600)',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {isRegister
              ? 'Already have an account? Sign In'
              : "Don't have an account? Register here"}
          </button>
        </div>
      </div>
    </div>
  );
}
