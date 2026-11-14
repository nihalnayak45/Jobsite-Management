import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Printer, QrCode, Tag, ExternalLink } from 'lucide-react';

export default function QRBadgeGeneratorModal({ isOpen, onClose, equipment = [], materials = [], onSimulateScan }) {
  const [activeTab, setActiveTab] = useState('equipment');
  const [qrImages, setQrImages] = useState({});

  const sampleZones = [
    { id: 'zone-1', code: 'Basement-Grid-B', name: 'Zone B - Basement Drainage Pit', type: 'zone' },
    { id: 'zone-2', code: 'Level-1-Slab', name: 'Zone A - Level 1 Concrete Floor Slab', type: 'zone' },
    { id: 'zone-3', code: 'Superstructure-Grid-C', name: 'Zone C - Pillar Reinforcement Grid C', type: 'zone' },
    { id: 'zone-4', code: 'Staging-Yard', name: 'Material Staging Yard & Gate 2', type: 'zone' },
  ];

  // Generate QR data URLs
  useEffect(() => {
    if (!isOpen) return;

    let itemsToGenerate = [];
    if (activeTab === 'equipment') {
      itemsToGenerate = equipment.map((eq) => ({
        key: `eq-${eq.id}`,
        text: JSON.stringify({ type: 'equipment', id: eq.id, name: eq.name }),
      }));
    } else if (activeTab === 'materials') {
      itemsToGenerate = materials.map((m) => ({
        key: `mat-${m.id}`,
        text: JSON.stringify({ type: 'material', id: m.id, name: m.name }),
      }));
    } else {
      itemsToGenerate = sampleZones.map((z) => ({
        key: `zone-${z.id}`,
        text: JSON.stringify({ type: 'zone', code: z.code, name: z.name }),
      }));
    }

    itemsToGenerate.forEach(async (item) => {
      try {
        const url = await QRCode.toDataURL(item.text, {
          width: 140,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' },
        });
        setQrImages((prev) => ({ ...prev, [item.key]: url }));
      } catch (err) {
        console.error('Failed to generate QR for item', item.key, err);
      }
    });
  }, [isOpen, activeTab, equipment, materials]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div className="modal-dialog" style={{ maxWidth: '800px', width: '95%' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <QrCode size={22} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
              Printable Digital Asset & Zone QR Labels
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Affix these weatherproof QR stickers onto physical equipment, pallet bins, or pillar markers on site. 
            Field workers scan them on mobile for instant 1-tap checkout, stock deduction, and geotagged defect reports.
          </p>

          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <button
              className={`btn btn-sm ${activeTab === 'equipment' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('equipment')}
            >
              Equipment & Tools ({equipment.length})
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'materials' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('materials')}
            >
              Material Bins / Pallets ({materials.length})
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'zones' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('zones')}
            >
              Site Zone & Pillar Markers ({sampleZones.length})
            </button>
          </div>

          {/* QR Badges Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '1rem',
              maxHeight: '440px',
              overflowY: 'auto',
              padding: '0.25rem',
            }}
          >
            {activeTab === 'equipment' &&
              equipment.map((eq) => {
                const qrUrl = qrImages[`eq-${eq.id}`];
                const scanPayload = { type: 'equipment', id: eq.id, name: eq.name };
                return (
                  <div
                    key={eq.id}
                    style={{
                      border: '2px dashed var(--border-color)',
                      borderRadius: '8px',
                      padding: '1rem',
                      textAlign: 'center',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      Asset ID: EQ-{eq.id}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', margin: '0.25rem 0 0.5rem 0', color: 'var(--text-main)' }}>
                      {eq.name}
                    </div>
                    {qrUrl ? (
                      <img src={qrUrl} alt={`QR for ${eq.name}`} style={{ width: '130px', height: '130px', margin: '0 auto' }} />
                    ) : (
                      <div style={{ width: '130px', height: '130px', margin: '0 auto', background: '#f1f5f9' }} />
                    )}
                    <div style={{ marginTop: '0.5rem' }}>
                      <span className={`badge ${eq.availability ? 'badge-in_progress' : 'badge-overdue'}`}>
                        {eq.availability ? 'Available' : 'In Use'}
                      </span>
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%', marginTop: '0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                      onClick={() => onSimulateScan(scanPayload)}
                    >
                      <ExternalLink size={12} /> Test Scan Action
                    </button>
                  </div>
                );
              })}

            {activeTab === 'materials' &&
              materials.map((m) => {
                const qrUrl = qrImages[`mat-${m.id}`];
                const scanPayload = { type: 'material', id: m.id, name: m.name };
                return (
                  <div
                    key={m.id}
                    style={{
                      border: '2px dashed var(--border-color)',
                      borderRadius: '8px',
                      padding: '1rem',
                      textAlign: 'center',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      Pallet Tag: MAT-{m.id}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', margin: '0.25rem 0 0.5rem 0', color: 'var(--text-main)' }}>
                      {m.name}
                    </div>
                    {qrUrl ? (
                      <img src={qrUrl} alt={`QR for ${m.name}`} style={{ width: '130px', height: '130px', margin: '0 auto' }} />
                    ) : (
                      <div style={{ width: '130px', height: '130px', margin: '0 auto', background: '#f1f5f9' }} />
                    )}
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Stock: <strong>{m.quantity} {m.unit}</strong>
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%', marginTop: '0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                      onClick={() => onSimulateScan(scanPayload)}
                    >
                      <ExternalLink size={12} /> Test Quick-Deduct
                    </button>
                  </div>
                );
              })}

            {activeTab === 'zones' &&
              sampleZones.map((z) => {
                const qrUrl = qrImages[`zone-${z.id}`];
                const scanPayload = { type: 'zone', code: z.code, name: z.name };
                return (
                  <div
                    key={z.id}
                    style={{
                      border: '2px dashed var(--border-color)',
                      borderRadius: '8px',
                      padding: '1rem',
                      textAlign: 'center',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      Pillar Marker: {z.code}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', margin: '0.25rem 0 0.5rem 0', color: 'var(--text-main)' }}>
                      {z.name}
                    </div>
                    {qrUrl ? (
                      <img src={qrUrl} alt={`QR for ${z.name}`} style={{ width: '130px', height: '130px', margin: '0 auto' }} />
                    ) : (
                      <div style={{ width: '130px', height: '130px', margin: '0 auto', background: '#f1f5f9' }} />
                    )}
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%', marginTop: '0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                      onClick={() => onSimulateScan(scanPayload)}
                    >
                      <ExternalLink size={12} /> Test Defect Report
                    </button>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Tip: Click "Test Scan Action" to preview worker experience without a camera.
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            <button className="btn btn-primary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Printer size={16} /> Print Sticker Sheet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

