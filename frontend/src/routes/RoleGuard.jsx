import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RoleGuard({ allowedRoles = [], children }) {
  const { user } = useAuth();

  if (!user) return null;

  const hasAccess = allowedRoles.length === 0 || user.role === 'admin' || allowedRoles.includes(user.role);

  if (!hasAccess) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center',
          padding: '2rem',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--danger-bg)',
            color: 'var(--danger-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.25rem',
          }}
        >
          <ShieldAlert size={36} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Unauthorized Access
        </h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '480px', marginBottom: '1.5rem' }}>
          Your current account role (<strong>{user.role}</strong>) does not have permission to view or manage this section.
        </p>
        <Link to="/" className="btn btn-primary">
          <ArrowLeft size={16} /> Return to Dashboard
        </Link>
      </div>
    );
  }

  return children;
}
