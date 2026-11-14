import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Boxes,
  Wrench,
  FileText,
  AlertTriangle,
  ShieldCheck,
  HardHat,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ isCollapsed, toggleSidebar }) {
  const { user } = useAuth();
  const role = user?.role || 'worker';

  // Navigation configurations tailored by 4-role model
  const getNavItems = () => {
    switch (role) {
      case 'admin':
      case 'project_manager':
        return [
          { to: '/dashboard', label: role === 'admin' ? 'Admin Dashboard' : 'Project Dashboard', icon: LayoutDashboard },
          { to: '/projects', label: 'Projects', icon: FolderKanban },
          { to: '/tasks', label: 'Tasks', icon: CheckSquare },
          { to: '/workforce', label: 'Workforce', icon: Users },
          { to: '/materials', label: 'Materials Inventory', icon: Boxes },
          { to: '/equipment', label: 'Equipment', icon: Wrench },
          { to: '/reports', label: 'Daily Reports', icon: FileText },
          { to: '/issues', label: 'Site Issues', icon: AlertTriangle },
          { to: '/safety', label: 'Safety & Quality', icon: ShieldCheck },
        ];

      case 'site_engineer':
        return [
          { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { to: '/reports', label: 'Daily Reports', icon: FileText },
          { to: '/workforce', label: 'Attendance Logging', icon: Users },
          { to: '/tasks', label: 'Task Execution', icon: CheckSquare },
          { to: '/materials', label: 'Materials Stock', icon: Boxes },
          { to: '/equipment', label: 'Equipment Status', icon: Wrench },
          { to: '/issues', label: 'Issues & Defects', icon: AlertTriangle },
          { to: '/safety', label: 'Safety Inspections', icon: ShieldCheck },
        ];

      case 'worker':
        return [
          { to: '/tasks', label: 'My Assigned Tasks', icon: CheckSquare },
          { to: '/issues', label: 'Report an Issue', icon: AlertTriangle },
        ];

      case 'client':
        return [
          { to: '/dashboard', label: 'Progress Dashboard', icon: TrendingUp },
          { to: '/reports', label: 'Approved Reports', icon: FileText },
          { to: '/safety', label: 'Safety Milestones', icon: ShieldCheck },
        ];

      default:
        return [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }];
    }
  };

  const navItems = getNavItems();

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        {!isCollapsed && (
          <div className="brand-logo-text">
            <div className="brand-icon-box">
              <HardHat size={22} />
            </div>
            <span>JMS Portal</span>
          </div>
        )}
        {isCollapsed && (
          <div className="brand-icon-box" style={{ margin: '0 auto' }}>
            <HardHat size={22} />
          </div>
        )}
        <button
          onClick={toggleSidebar}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
          }}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {!isCollapsed && <div className="nav-section-title">Operations Menu</div>}
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon size={19} />
              {!isCollapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-user">
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary-600)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.85rem',
            flexShrink: 0,
          }}
        >
          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
        {!isCollapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div
              style={{
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
              }}
            >
              {user?.name || 'User'}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'capitalize' }}>
              {user?.role?.replace('_', ' ')}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
