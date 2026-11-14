import React, { useState, useEffect } from 'react';
import {
  X,
  Wrench,
  Boxes,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Check,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { equipmentApi, materialApi, scanApi, issueApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function ScanActionDrawer({ isOpen, payload, onClose, onActionSuccess }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  // Material quick-adjust state
  const [materialDelta, setMaterialDelta] = useState(-5);
  const [notes, setNotes] = useState('');

  // Issue state for zone scanning
  const [issueDesc, setIssueDesc] = useState('');
  const [issuePriority, setIssuePriority] = useState('medium');

  const entityType = payload?.entity || payload?.type;
  const canAdjustMaterial = ['project_manager', 'site_engineer'].includes(user?.role);

  // Load contextual item data
  useEffect(() => {
    if (!isOpen || !payload) {
      setData(null);
      return;
    }

    async function loadItem() {
      setLoading(true);
      try {
        if (entityType === 'equipment' && payload.id) {
          const res = await equipmentApi.getById(payload.id);
          setData(res.data?.equipment || null);
        } else if (entityType === 'material' && payload.id) {
          try {
            const res = await materialApi.getById(payload.id);
            setData(res.data?.material || res.data?.data || payload);
          } catch {
            setData(payload);
          }
        } else if (entityType === 'zone') {
          setData(payload);
          setIssueDesc(`Inspection / defect identified at ${payload.name || payload.code || payload.zone}: `);
        }
      } catch (err) {
        showToast('error', 'Failed to retrieve asset details for scanned tag');
      } finally {
        setLoading(false);
      }
    }

    loadItem();
  }, [isOpen, payload, entityType, showToast]);

  if (!isOpen || !payload) return null;

  // Equipment Single-Tap Toggle via POST /api/scan/action
  const handleToggleEquipment = async (customAction = 'toggle') => {
    if (!data?.id) return;
    setLoading(true);
    try {
      const res = await scanApi.executeAction({
        entity: 'equipment',
        id: data.id,
        action: customAction,
        notes: notes || `Single-tap QR check by ${user?.name || user?.email}`,
      });
      showToast('success', res.data?.message || 'Equipment status updated');
      setData(res.data?.equipment);
      if (onActionSuccess) onActionSuccess();
      onClose();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to update equipment');
    } finally {
      setLoading(false);
    }
  };

  // Equipment Condition Update via POST /api/scan/action
  const handleReportCondition = async (condition) => {
    if (!data?.id) return;
    setLoading(true);
    try {
      const res = await scanApi.executeAction({
        entity: 'equipment',
        id: data.id,
        condition,
        notes: notes || `Condition updated to ${condition} via QR`,
      });
      showToast('success', `Equipment marked as ${condition}`);
      setData(res.data?.equipment);
      if (onActionSuccess) onActionSuccess();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to update condition');
    } finally {
      setLoading(false);
    }
  };

  // Material Single-Tap Quick Deduct / Restock via POST /api/scan/action
  const handleLogMaterial = async (deltaToApply) => {
    const finalDelta = deltaToApply !== undefined ? deltaToApply : materialDelta;
    if (!data?.id || finalDelta === 0) return;

    if (!canAdjustMaterial) {
      showToast('error', 'Forbidden: Only Project Managers and Site Engineers can adjust material stock');
      return;
    }

    setLoading(true);
    try {
      const res = await scanApi.executeAction({
        entity: 'material',
        id: data.id,
        adjustment: Number(finalDelta),
        reason: finalDelta < 0 ? 'daily_usage' : 'restock',
        notes: notes || (finalDelta < 0 ? 'QR Mobile deduction' : 'QR Mobile restock'),
      });
      showToast('success', res.data?.message || 'Inventory updated successfully');
      if (onActionSuccess) onActionSuccess();
      onClose();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to update material stock');
    } finally {
      setLoading(false);
    }
  };

  // Zone Geotagged Defect Reporting
  const handleReportZoneIssue = async (e) => {
    e.preventDefault();
    if (!issueDesc.trim()) {
      showToast('error', 'Please provide a description of the defect');
      return;
    }
    setLoading(true);
    try {
      const zoneTag = payload.name || payload.code || payload.zone || 'Site Zone';
      await issueApi.create({
        project_id: payload.projectId || 1,
        description: `[${zoneTag}] ${issueDesc.trim()}`,
        priority: issuePriority,
        status: 'open',
      });
      showToast('success', `Issue reported and geotagged at ${zoneTag}`);
      if (onActionSuccess) onActionSuccess();
      onClose();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to file defect report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1300 }}>
      <div className="modal-dialog" style={{ maxWidth: '520px', width: '95%', borderTop: '4px solid var(--primary-500)' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {entityType === 'equipment' && <Wrench size={20} color="var(--primary-600)" />}
            {entityType === 'material' && <Boxes size={20} color="#0284c7" />}
            {entityType === 'zone' && <MapPin size={20} color="#e11d48" />}
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
              {entityType === 'equipment' && 'Equipment Fast Check-Out'}
              {entityType === 'material' && 'Material Scan-to-Action'}
              {entityType === 'zone' && 'Geotagged Zone Inspection'}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.25rem' }}>
          {loading && !data ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner" style={{ margin: '0 auto 0.75rem' }}></div>
              <p style={{ color: 'var(--text-muted)' }}>Fetching asset details from jobsite ledger...</p>
            </div>
          ) : (
            <>
              {/* EQUIPMENT FAST TOGGLE */}
              {entityType === 'equipment' && (
                <div>
                  <div
                    style={{
                      backgroundColor: 'var(--bg-subtle, #f8fafc)',
                      border: '1px solid var(--border-subtle, #e2e8f0)',
                      padding: '1rem',
                      borderRadius: '8px',
                      marginBottom: '1.25rem',
                    }}
                  >
                    <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                      {data?.name || `Equipment #${payload.id}`}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                      <span>
                        Status:{' '}
                        <strong className={`badge ${data?.availability ? 'badge-in_progress' : 'badge-overdue'}`}>
                          {data?.availability ? 'Available for Checkout' : 'Currently In Use'}
                        </strong>
                      </span>
                      <span>
                        Condition: <strong style={{ textTransform: 'capitalize' }}>{data?.condition || 'operational'}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="form-label">Optional Checkout Note / Task Ref:</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Assigned to Foundation Grid A"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  {/* 1-Tap Check Out / Return Button */}
                  <button
                    className={`btn ${data?.availability ? 'btn-primary' : 'btn-secondary'}`}
                    style={{
                      width: '100%',
                      padding: '0.85rem',
                      fontSize: '1rem',
                      fontWeight: 700,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '1.25rem',
                    }}
                    onClick={() => handleToggleEquipment('toggle')}
                    disabled={loading}
                  >
                    {data?.availability ? (
                      <>
                        <Check size={18} /> Single-Tap Check Out (Assign to Me)
                      </>
                    ) : (
                      <>
                        <RotateCcw size={18} /> Return Equipment & Mark Available
                      </>
                    )}
                  </button>

                  {/* Report condition */}
                  <div>
                    <label className="form-label" style={{ fontSize: '0.85rem' }}>Update Condition:</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${data?.condition === 'operational' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => handleReportCondition('operational')}
                        disabled={loading}
                      >
                        Operational
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${data?.condition === 'under_maintenance' ? 'btn-primary' : 'btn-secondary'}`}
                        style={data?.condition === 'under_maintenance' ? { backgroundColor: '#d97706', borderColor: '#d97706' } : {}}
                        onClick={() => handleReportCondition('under_maintenance')}
                        disabled={loading}
                      >
                        Maintenance
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${data?.condition === 'damaged' ? 'btn-danger' : 'btn-secondary'}`}
                        onClick={() => handleReportCondition('damaged')}
                        disabled={loading}
                      >
                        Damaged
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MATERIAL FAST USAGE / RESTOCK */}
              {entityType === 'material' && (
                <div>
                  <div
                    style={{
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      padding: '1rem',
                      borderRadius: '8px',
                      marginBottom: '1.25rem',
                    }}
                  >
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#166534' }}>
                      {payload.name || `Material #${payload.id}`}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#15803d', marginTop: '0.25rem' }}>
                      Pallet Tag MAT-{payload.id} • Quick Usage Logger
                    </div>
                  </div>

                  {!canAdjustMaterial ? (
                    <div
                      style={{
                        padding: '1rem',
                        backgroundColor: '#fffbeb',
                        border: '1px solid #fef3c7',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        color: '#92400e',
                        fontSize: '0.9rem',
                        lineHeight: 1.4,
                      }}
                    >
                      <ShieldAlert size={24} color="#d97706" style={{ flexShrink: 0 }} />
                      <div>
                        <strong>Worker Read-Only View:</strong> Material inventory adjustments via QR scan require
                        Site Engineer or Project Manager permissions.
                      </div>
                    </div>
                  ) : (
                    <>
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        Quick Consumption (Deduct from Pallet):
                      </label>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: '0.5rem',
                          marginBottom: '1.25rem',
                        }}
                      >
                        {[-1, -5, -10, -25].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontWeight: 700, color: '#dc2626' }}
                            onClick={() => handleLogMaterial(amt)}
                            disabled={loading}
                          >
                            {amt}
                          </button>
                        ))}
                      </div>

                      <label className="form-label" style={{ fontWeight: 600 }}>
                        Quick Restock (Add to Pallet):
                      </label>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '0.5rem',
                          marginBottom: '1.25rem',
                        }}
                      >
                        {[+10, +50, +100].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontWeight: 700, color: '#16a34a' }}
                            onClick={() => handleLogMaterial(amt)}
                            disabled={loading}
                          >
                            +{amt}
                          </button>
                        ))}
                      </div>

                      <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label className="form-label">
                          Or Custom Amount (Negative to consume, Positive to restock):
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input
                            type="number"
                            className="form-control"
                            value={materialDelta}
                            onChange={(e) => setMaterialDelta(Number(e.target.value))}
                          />
                          <button
                            className="btn btn-primary"
                            onClick={() => handleLogMaterial(materialDelta)}
                            disabled={loading || materialDelta === 0}
                          >
                            Apply Delta
                          </button>
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Audit Notes (Optional):</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Poured foundation slab block B"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ZONE GEOTAGGED DEFECT REPORTING */}
              {entityType === 'zone' && (
                <form onSubmit={handleReportZoneIssue}>
                  <div
                    style={{
                      backgroundColor: '#fff1f2',
                      border: '1px solid #fecdd3',
                      padding: '1rem',
                      borderRadius: '8px',
                      marginBottom: '1.25rem',
                    }}
                  >
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#9f1239' }}>
                      📍 {payload.name || payload.code || payload.zone || 'Jobsite Pillar / Zone'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#be123c', marginTop: '0.25rem' }}>
                      Geotagged physical location automatically stamped to defect report
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Issue Priority:</label>
                    <select
                      className="form-select"
                      value={issuePriority}
                      onChange={(e) => setIssuePriority(e.target.value)}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High - Action Required</option>
                      <option value="critical">Critical - Safety Hazard</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label">Defect / Inspection Notes:</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="e.g. Honeycombing detected on beam junction, requires grouting..."
                      value={issueDesc}
                      onChange={(e) => setIssueDesc(e.target.value)}
                      required
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-danger"
                    style={{ width: '100%', padding: '0.8rem', fontWeight: 700 }}
                    disabled={loading}
                  >
                    Submit Geotagged Defect
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
