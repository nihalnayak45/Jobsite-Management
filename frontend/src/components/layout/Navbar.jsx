import React, { useState } from 'react';
import { LogOut, Bell, User as UserIcon, Shield, QrCode, Camera } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import QRScannerModal from '../qr/QRScannerModal';
import ScanActionDrawer from '../qr/ScanActionDrawer';
import QRBadgeGeneratorModal from '../qr/QRBadgeGeneratorModal';

export default function Navbar({ toggleSidebar }) {
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [scannedPayload, setScannedPayload] = useState(null);
  const [isActionDrawerOpen, setIsActionDrawerOpen] = useState(false);

  const handleLogout = () => {
    logout();
    showToast('info', 'Logged out successfully');
  };

  const handleScanSuccess = (payload) => {
    setIsScannerOpen(false);
    setScannedPayload(payload);
    setIsActionDrawerOpen(true);
  };

  const handleSimulateScan = (payload) => {
    setIsGeneratorOpen(false);
    setScannedPayload(payload);
    setIsActionDrawerOpen(true);
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'project_manager':
        return 'badge-in_progress';
      case 'site_engineer':
        return 'badge-pending';
      case 'worker':
        return 'badge-completed';
      case 'client':
        return 'badge-role';
      default:
        return 'badge-role';
    }
  };

  return (
    <>
      <header className="top-navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Jobsite Management System
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Construction Operations & Field Intelligence
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {/* Quick Scan & Print Badges Buttons */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, backgroundColor: '#0284c7' }}
            title="Scan site QR code for fast checkout or material deduction"
          >
            <Camera size={15} />
            <span>Scan QR</span>
          </button>

          {['project_manager', 'site_engineer'].includes(user?.role) && (
            <button
              onClick={() => setIsGeneratorOpen(true)}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
              title="Generate and print physical QR label stickers"
            >
              <QrCode size={15} />
              <span>QR Labels</span>
            </button>
          )}

          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '0.85rem' }}>
              <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                <Shield size={12} />
                {user.role?.replace('_', ' ')}
              </span>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user.name}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</span>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="btn btn-secondary btn-sm"
            title="Sign out of system"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* QR Modals */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

      <ScanActionDrawer
        isOpen={isActionDrawerOpen}
        payload={scannedPayload}
        onClose={() => setIsActionDrawerOpen(false)}
        onActionSuccess={() => window.location.reload()}
      />

      <QRBadgeGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        equipment={[
          { id: 1, name: 'Potain Tower Crane 50m Boom', availability: false },
          { id: 2, name: 'CAT 320D Hydraulic Excavator', availability: true },
          { id: 3, name: 'Schwing Stetter Concrete Mixer', availability: true },
          { id: 4, name: 'Diesel Generator 125 kVA', availability: true },
        ]}
        materials={[
          { id: 1, name: 'OPC 53 Grade Portland Cement', quantity: 450, unit: 'Bags' },
          { id: 2, name: '16mm TMT Steel Reinforcement Bars', quantity: 12000, unit: 'Kg' },
          { id: 3, name: 'M25 Ready-Mix Concrete', quantity: 85, unit: 'm³' },
          { id: 4, name: 'Standard Coarse River Sand', quantity: 40, unit: 'Tons' },
        ]}
        onSimulateScan={handleSimulateScan}
      />
    </>
  );
}
