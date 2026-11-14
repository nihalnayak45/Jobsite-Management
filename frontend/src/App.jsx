import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleGuard from './routes/RoleGuard';
import Layout from './components/layout/Layout';

import SplashPage from './pages/SplashPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import TaskManagementPage from './pages/TaskManagementPage';
import WorkforcePage from './pages/WorkforcePage';
import InventoryEquipmentPage from './pages/InventoryEquipmentPage';
import ReportsAndIssuesPage from './pages/ReportsAndIssuesPage';
import SafetyPage from './pages/SafetyPage';

// Smart Root Route:
// - If unauthenticated: renders SplashPage
// - If authenticated worker: redirects to /tasks
// - If authenticated others: redirects to /dashboard
function SmartRootRoute() {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '100vh', backgroundColor: '#0f172a' }}>
        <div className="spinner"></div>
      </div>
    );
  }
  if (!isAuthenticated) {
    return <SplashPage />;
  }
  if (user?.role === 'worker') {
    return <Navigate to="/tasks" replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

// Smart Home Redirect within protected shell:
function SmartHomeRedirect() {
  const { user } = useAuth();
  if (user?.role === 'worker') {
    return <Navigate to="/tasks" replace />;
  }
  return <DashboardPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Landing & Splash Page */}
            <Route path="/" element={<SmartRootRoute />} />
            <Route path="/splash" element={<SplashPage />} />

            {/* Public Auth Routes */}
            <Route path="/login" element={<AuthPage />} />
            <Route path="/register" element={<AuthPage />} />

            {/* Protected Application Routes inside Layout */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<SmartHomeRedirect />} />

              <Route
                path="/projects"
                element={
                  <RoleGuard allowedRoles={['admin', 'project_manager']}>
                    <ProjectsPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/tasks"
                element={
                  <RoleGuard
                    allowedRoles={[
                      'admin',
                      'project_manager',
                      'site_engineer',
                      'worker',
                      'client',
                    ]}
                  >
                    <TaskManagementPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/workforce"
                element={
                  <RoleGuard allowedRoles={['admin', 'project_manager', 'site_engineer']}>
                    <WorkforcePage />
                  </RoleGuard>
                }
              />

              <Route
                path="/materials"
                element={
                  <RoleGuard allowedRoles={['admin', 'project_manager', 'site_engineer']}>
                    <InventoryEquipmentPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/equipment"
                element={
                  <RoleGuard allowedRoles={['admin', 'project_manager', 'site_engineer']}>
                    <InventoryEquipmentPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/reports"
                element={
                  <RoleGuard
                    allowedRoles={[
                      'admin',
                      'project_manager',
                      'site_engineer',
                      'client',
                    ]}
                  >
                    <ReportsAndIssuesPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/issues"
                element={
                  <RoleGuard
                    allowedRoles={[
                      'admin',
                      'project_manager',
                      'site_engineer',
                      'worker',
                    ]}
                  >
                    <ReportsAndIssuesPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/safety"
                element={
                  <RoleGuard
                    allowedRoles={[
                      'admin',
                      'project_manager',
                      'site_engineer',
                      'client',
                    ]}
                  >
                    <SafetyPage />
                  </RoleGuard>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
