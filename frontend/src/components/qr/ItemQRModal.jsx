import React, { useState, useEffect } from 'react';
import { X, Printer, QrCode, Boxes, Wrench } from 'lucide-react';
import QRCode from 'qrcode';
import { materialApi, equipmentApi } from '../../api';

export default function ItemQRModal({ isOpen, item, entity = 'material', onClose }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !item) {
      setQrDataUrl('');
      return;
    }

    async function loadQR() {
      setLoading(true);
      try {
        // Try fetching backend QR DataURL
        if (entity === 'material') {
          const res = await materialApi.getQR(item.id);
          setQrDataUrl(res.data?.qr_code);
        } else if (entity === 'equipment') {
          const res = await equipmentApi.getQR(item.id);
          setQrDataUrl(res.data?.qr_code);
        }
      } catch (err) {
        // Client fallback generation
        try {
          const payload = JSON.stringify({
            entity,
            id: item.id,
            projectId: item.project_id,
          });
          const url = await QRCode.toDataURL(payload, { width: 280, margin: 2 });
          setQrDataUrl(url);
        } catch (clientErr) {
          console.error('Failed to generate QR fallback:', clientErr);
        }
      } finally {
        setLoading(false);
      }
    }

    loadQR();
  }, [isOpen, item, entity]);

  if (!isOpen || !item) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1250 }}>
      <div className="modal-dialog" style={{ maxWidth: '420px', width: '92%' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <QrCode size={18} color="var(--primary-600)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Asset QR Sticker Tag</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ textAlign: 'center', padding: '1.75rem 1.25rem' }}>
          {/* Printable Sticker Box */}
          <div
            id="printable-badge"
            style={{
              border: '2px solid #0f172a',
              borderRadius: '12px',
              padding: '1.25rem',
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              margin: '0 auto',
            }}
          >
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#64748b',
                marginBottom: '0.35rem',
              }}
            >
              Jobsite Asset Identification Tag
            </div>

            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.35rem' }}>
              {item.name}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  backgroundColor: entity === 'material' ? '#e0f2fe' : '#fef3c7',
                  color: entity === 'material' ? '#0369a1' : '#b45309',
                }}
              >
                {entity === 'material' ? '📦 Material Bin / Pallet' : '🚜 Machinery & Fleet'}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                }}
              >
                ID #{item.id}
              </span>
            </div>

            {loading ? (
              <div style={{ padding: '3rem 0' }}>
                <div className="spinner" style={{ margin: '0 auto' }}></div>
              </div>
            ) : qrDataUrl ? (
              <div style={{ margin: '0.5rem 0' }}>
                <img
                  src={qrDataUrl}
                  alt={`QR code for ${item.name}`}
                  style={{
                    width: '200px',
                    height: '200px',
                    display: 'block',
                    margin: '0 auto',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}
                />
              </div>
            ) : (
              <p style={{ color: '#ef4444', padding: '2rem 0' }}>Failed to generate QR</p>
            )}

            <div
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#0f172a',
                marginTop: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {entity === 'material' ? 'Scan to Log Usage / Restock' : 'Scan to Check Out / Return'}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              JMS Digital Tagging • Project #{item.project_id}
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePrint}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Printer size={16} /> Print Sticker Tag
          </button>
        </div>
      </div>
    </div>
  );
}

