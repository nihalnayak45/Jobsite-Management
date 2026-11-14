import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, RefreshCw, Zap, Wrench, Boxes, MapPin } from 'lucide-react';

export default function QRScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  // Quick simulated scan options for desktop environment
  const quickTestTags = [
    { label: 'EQ-1: Potain Tower Crane', payload: { type: 'equipment', id: 1, name: 'Potain Tower Crane 50m Boom' } },
    { label: 'EQ-2: CAT 320D Excavator', payload: { type: 'equipment', id: 2, name: 'CAT 320D Hydraulic Excavator' } },
    { label: 'MAT-1: Portland Cement', payload: { type: 'material', id: 1, name: 'OPC 53 Grade Portland Cement' } },
    { label: 'MAT-2: 16mm TMT Steel Rebar', payload: { type: 'material', id: 2, name: '16mm TMT Steel Reinforcement Bars' } },
    { label: 'Zone: Basement Grid B-2', payload: { type: 'zone', code: 'Basement-Grid-B', name: 'Zone B - Basement Drainage Pit B-2' } },
    { label: 'Zone: Level 1 Floor Slab', payload: { type: 'zone', code: 'Level-1-Slab', name: 'Zone A - Level 1 Concrete Floor Slab' } },
  ];

  useEffect(() => {
    if (!isOpen) {
      if (html5QrCodeRef.current && scannerActive) {
        html5QrCodeRef.current.stop().catch(() => {}).finally(() => {
          setScannerActive(false);
        });
      }
      return;
    }

    let isMounted = true;
    const elementId = 'jms-reader-box';

    async function startScanner() {
      try {
        setCameraError(null);
        const html5QrCode = new Html5Qrcode(elementId);
        html5QrCodeRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            try {
              let parsed;
              try {
                parsed = JSON.parse(decodedText);
              } catch {
                parsed = { raw: decodedText };
              }
              if (html5QrCode.isScanning) {
                html5QrCode.stop().catch(() => {});
              }
              onScanSuccess(parsed);
            } catch (err) {
              console.error('Error handling scanned text', err);
            }
          },
          () => {} // frame error handler (no-op)
        );

        if (isMounted) setScannerActive(true);
      } catch (err) {
        if (isMounted) {
          setCameraError('Camera access unavailable or declined. You can test scan actions using the quick-tag simulators below.');
        }
      }
    }

    // Small delay to ensure modal DOM is mounted
    const timer = setTimeout(() => {
      startScanner();
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, [isOpen, onScanSuccess]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1250 }}>
      <div className="modal-dialog" style={{ maxWidth: '480px', width: '95%' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Camera size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
              Scan Jobsite QR Code
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ textAlign: 'center' }}>
          {/* Camera Viewer Container */}
          <div
            id="jms-reader-box"
            ref={scannerRef}
            style={{
              width: '100%',
              minHeight: '260px',
              backgroundColor: '#0f172a',
              borderRadius: '8px',
              overflow: 'hidden',
              marginBottom: '1rem',
              position: 'relative',
            }}
          />

          {cameraError && (
            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'left' }}>
              {cameraError}
            </div>
          )}

          {/* Quick Simulation Options */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              <Zap size={16} color="var(--primary)" />
              Simulate Live Field Scan (Instant Test):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {quickTestTags.map((tag, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ textAlign: 'left', fontSize: '0.75rem', padding: '0.4rem 0.6rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  onClick={() => onScanSuccess(tag.payload)}
                >
                  {tag.payload.type === 'equipment' && <Wrench size={12} style={{ marginRight: '4px' }} />}
                  {tag.payload.type === 'material' && <Boxes size={12} style={{ marginRight: '4px' }} />}
                  {tag.payload.type === 'zone' && <MapPin size={12} style={{ marginRight: '4px' }} />}
                  {tag.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

