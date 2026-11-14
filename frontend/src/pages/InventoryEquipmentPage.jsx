import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Boxes,
  Wrench,
  AlertTriangle,
  Plus,
  Sliders,
  CheckCircle2,
  X,
  PackagePlus,
  QrCode,
  BarChart3,
} from 'lucide-react';
import { projectApi, materialApi, equipmentApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import MaterialBurnRateCard from '../components/analytics/MaterialBurnRateCard';
import MaterialConsumptionGraph from '../components/analytics/MaterialConsumptionGraph';
import InventoryAnalyticsTab from '../components/analytics/InventoryAnalyticsTab';
import QRBadgeGeneratorModal from '../components/qr/QRBadgeGeneratorModal';
import ItemQRModal from '../components/qr/ItemQRModal';

export default function InventoryEquipmentPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const queryProjectId = searchParams.get('projectId');
  const queryMaterialId = searchParams.get('materialId');

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(
    queryProjectId || localStorage.getItem('jms_active_project_id') || ''
  );
  const [activeTab, setActiveTab] = useState('materials'); // 'materials' or 'equipment'
  const [materials, setMaterials] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasAutoOpenedModal, setHasAutoOpenedModal] = useState(false);

  // Material Creation Modal
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    quantity: 0,
    unit: 'units',
    minimum_stock: 10,
  });

  // Material Stock Adjustment Modal
  const [stockModalItem, setStockModalItem] = useState(null);
  const [stockAdjustment, setStockAdjustment] = useState(0);

  // Equipment Creation Modal
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [isQRGeneratorOpen, setIsQRGeneratorOpen] = useState(false);
  const [qrModalItem, setQrModalItem] = useState(null);
  const [qrModalEntity, setQrModalEntity] = useState('material');
  const [newEquipment, setNewEquipment] = useState({
    name: '',
    availability: 'available',
    condition: 'operational',
  });

  // Load Projects
  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await projectApi.list();
        const list = res.data?.data || res.data?.projects || [];
        setProjects(list);
        const saved = localStorage.getItem('jms_active_project_id');
        if (queryProjectId && list.some((p) => String(p.id) === String(queryProjectId))) {
          setSelectedProjectId(queryProjectId);
          localStorage.setItem('jms_active_project_id', queryProjectId);
        } else if (saved && list.some((p) => String(p.id) === String(saved))) {
          setSelectedProjectId(saved);
        } else if (list.length > 0 && !selectedProjectId) {
          setSelectedProjectId(list[0].id);
          localStorage.setItem('jms_active_project_id', list[0].id);
        }
      } catch (err) {
        showToast('error', 'Failed to load projects');
      }
    }
    fetchProjects();
  }, [showToast, queryProjectId]);

  // Auto-open stock adjustment modal if queryMaterialId is present
  useEffect(() => {
    if (!queryMaterialId || materials.length === 0 || hasAutoOpenedModal) return;
    const targetMat = materials.find((m) => String(m.id) === String(queryMaterialId));
    if (targetMat) {
      setStockModalItem(targetMat);
      setStockAdjustment(0);
      setHasAutoOpenedModal(true);
      setTimeout(() => {
        const rowEl = document.getElementById(`material-row-${queryMaterialId}`);
        if (rowEl) {
          rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [materials, queryMaterialId, hasAutoOpenedModal]);

  // Load Materials and Equipment
  const loadData = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const [matRes, eqRes] = await Promise.all([
        materialApi.listByProject(selectedProjectId),
        equipmentApi.listByProject(selectedProjectId),
      ]);
      setMaterials(matRes.data?.data || matRes.data?.materials || []);
      setEquipmentList(eqRes.data?.data || eqRes.data?.equipment || []);
    } catch (err) {
      showToast('error', 'Failed to load inventory & equipment');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Create Material
  const handleCreateMaterial = async (e) => {
    e.preventDefault();
    try {
      await materialApi.create({
        ...newMaterial,
        project_id: Number(selectedProjectId),
        quantity: Number(newMaterial.quantity),
        minimum_stock: Number(newMaterial.minimum_stock),
      });
      showToast('success', `Material "${newMaterial.name}" registered successfully`);
      setIsMaterialModalOpen(false);
      setNewMaterial({ name: '', quantity: 0, unit: 'units', minimum_stock: 10 });
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error registering material';
      showToast('error', msg);
    }
  };

  // Adjust Material Stock
  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!stockModalItem) return;
    try {
      const res = await materialApi.updateStock(stockModalItem.id, {
        adjustment: Number(stockAdjustment),
      });
      if (res.data?.alert) {
        showToast('error', `Low Stock Alert: ${res.data.alert}`);
      } else {
        showToast('success', 'Material inventory updated successfully');
      }
      setStockModalItem(null);
      setStockAdjustment(0);
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error updating stock';
      showToast('error', msg);
    }
  };

  // Create Equipment
  const handleCreateEquipment = async (e) => {
    e.preventDefault();
    try {
      await equipmentApi.create({
        ...newEquipment,
        availability: newEquipment.availability === 'available' || newEquipment.availability === true,
        project_id: Number(selectedProjectId),
      });
      showToast('success', `Equipment "${newEquipment.name}" added`);
      setIsEquipmentModalOpen(false);
      setNewEquipment({ name: '', availability: 'available', condition: 'operational' });
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error adding equipment';
      showToast('error', msg);
    }
  };

  // Toggle Equipment Checkout Status
  const handleToggleCheckout = async (item) => {
    try {
      const res = await equipmentApi.toggleCheckout(item.id);
      showToast('success', res.data?.message || 'Equipment status updated');
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error toggling equipment status';
      showToast('error', msg);
    }
  };

  // Toggle Equipment Condition
  const handleToggleCondition = async (item, newCondition) => {
    try {
      await equipmentApi.update(item.id, { condition: newCondition });
      showToast('success', `Condition updated to ${newCondition}`);
      loadData();
    } catch (err) {
      showToast('error', 'Error updating equipment condition');
    }
  };

  const canManageSite = ['project_manager', 'site_engineer'].includes(user?.role);

  return (
    <div>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Materials Inventory & Equipment Assets
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Track bulk construction supplies, low-stock alerts, and machinery operational status.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            style={{ minWidth: '220px' }}
            value={selectedProjectId}
            onChange={(e) => {
              setSelectedProjectId(e.target.value);
              localStorage.setItem('jms_active_project_id', e.target.value);
            }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_name}
              </option>
            ))}
          </select>

          {canManageSite && (
            <button
              className="btn btn-secondary"
              onClick={() => setIsQRGeneratorOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              title="Print QR Asset Badges for Equipment, Pallets, and Site Zones"
            >
              <QrCode size={16} /> QR Sticker Labels
            </button>
          )}

          {canManageSite && activeTab === 'materials' && (
            <button className="btn btn-primary" onClick={() => setIsMaterialModalOpen(true)}>
              <Plus size={16} /> Add Material
            </button>
          )}

          {canManageSite && activeTab === 'equipment' && (
            <button className="btn btn-primary" onClick={() => setIsEquipmentModalOpen(true)}>
              <Plus size={16} /> Add Equipment
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
        <button
          onClick={() => setActiveTab('materials')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'materials' ? '3px solid var(--primary-500)' : '3px solid transparent',
            color: activeTab === 'materials' ? 'var(--primary-600)' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Boxes size={18} /> Materials Inventory ({materials.length})
        </button>

        <button
          onClick={() => setActiveTab('equipment')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'equipment' ? '3px solid var(--primary-500)' : '3px solid transparent',
            color: activeTab === 'equipment' ? 'var(--primary-600)' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Wrench size={18} /> Heavy Machinery & Equipment ({equipmentList.length})
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'analytics' ? '3px solid var(--primary-500)' : '3px solid transparent',
            color: activeTab === 'analytics' ? 'var(--primary-600)' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <BarChart3 size={18} /> Inventory Analytics
        </button>
      </div>

      {/* TAB 1: Materials */}
      {activeTab === 'materials' && (
        <>
          <div style={{ marginBottom: '1.5rem' }}>
            <MaterialConsumptionGraph projectId={selectedProjectId} />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <MaterialBurnRateCard projectId={selectedProjectId} />
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">
                <Boxes size={20} /> Current Stock on Jobsite
              </span>
            </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
            </div>
          ) : materials.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              No materials registered for this project yet.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Material Name</th>
                    <th>Current Quantity</th>
                    <th>Unit</th>
                    <th>Minimum Stock</th>
                    <th>Stock Status</th>
                    <th>Item Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m) => {
                    const isLowStock = Number(m.quantity) <= Number(m.minimum_stock);
                    return (
                      <tr
                        key={m.id}
                        id={`material-row-${m.id}`}
                        className={String(m.id) === String(queryMaterialId) ? 'highlight-pulse' : ''}
                        style={
                          String(m.id) === String(queryMaterialId)
                            ? { borderLeft: '4px solid var(--primary-500)', backgroundColor: '#fffbeb' }
                            : undefined
                        }
                      >
                        <td style={{ fontWeight: 600 }}>{m.name}</td>
                        <td
                          style={{
                            fontWeight: 700,
                            fontSize: '1rem',
                            color: isLowStock ? 'var(--danger-text)' : 'inherit',
                          }}
                        >
                          {m.quantity}
                        </td>
                        <td>{m.unit}</td>
                        <td>{m.minimum_stock}</td>
                        <td>
                          {isLowStock ? (
                            <span className="badge badge-low-stock">
                              <AlertTriangle size={12} /> Low Stock Alert
                            </span>
                          ) : (
                            <span className="badge badge-completed">Adequate</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setQrModalItem(m);
                                setQrModalEntity('material');
                              }}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                              title="View and Print QR asset sticker"
                            >
                              <QrCode size={13} /> View QR
                            </button>
                            {canManageSite && (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setStockModalItem(m);
                                  setStockAdjustment(0);
                                }}
                              >
                                <Sliders size={13} /> Adjust Stock
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>
      )}

      {/* TAB 2: Equipment */}
      {activeTab === 'equipment' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <Wrench size={20} /> Site Equipment Fleet & Tools
            </span>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
            </div>
          ) : equipmentList.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              No equipment or machinery registered on site.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Equipment Name</th>
                    <th>Availability</th>
                    <th>Condition</th>
                    <th>Asset Tag & Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {equipmentList.map((eq) => {
                    const isAvailable = eq.availability === true || eq.availability === 'available' || eq.availability === 'true';
                    return (
                      <tr key={eq.id}>
                        <td style={{ fontWeight: 600 }}>{eq.name}</td>
                        <td>
                          <span
                            className={`badge ${isAvailable ? 'badge-completed' : 'badge-pending'}`}
                          >
                            {isAvailable ? 'Available' : 'In-Use'}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              eq.condition === 'operational'
                                ? 'badge-completed'
                                : eq.condition === 'under_maintenance'
                                ? 'badge-pending'
                                : 'badge-damaged'
                            }`}
                          >
                            {eq.condition?.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setQrModalItem(eq);
                                setQrModalEntity('equipment');
                              }}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                              title="View and Print QR asset sticker"
                            >
                              <QrCode size={13} /> View QR
                            </button>
                            {canManageSite && (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleToggleCheckout(eq)}
                                  title="Check out or check in equipment"
                                >
                                  {isAvailable ? 'Check Out' : 'Check In'}
                                </button>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${
                                    eq.condition === 'operational' ? 'btn-primary' : 'btn-secondary'
                                  }`}
                                  onClick={() => handleToggleCondition(eq, 'operational')}
                                >
                                  Operational
                                </button>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${
                                    eq.condition === 'under_maintenance' ? 'btn-primary' : 'btn-secondary'
                                  }`}
                                  style={
                                    eq.condition === 'under_maintenance'
                                      ? { backgroundColor: '#d97706', borderColor: '#d97706' }
                                      : {}
                                  }
                                  onClick={() => handleToggleCondition(eq, 'under_maintenance')}
                                >
                                  Maintenance
                                </button>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${
                                    eq.condition === 'damaged' ? 'btn-danger' : 'btn-secondary'
                                  }`}
                                  onClick={() => handleToggleCondition(eq, 'damaged')}
                                >
                                  Damaged
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Inventory Analytics */}
      {activeTab === 'analytics' && (
        <InventoryAnalyticsTab projectId={selectedProjectId} />
      )}

      {/* MODAL: Add Material */}
      {isMaterialModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Add Project Material</h3>
              <button
                onClick={() => setIsMaterialModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateMaterial}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Material Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Portland Cement Type I"
                    value={newMaterial.name}
                    onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Initial Quantity</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={newMaterial.quantity}
                      onChange={(e) =>
                        setNewMaterial({ ...newMaterial, quantity: Number(e.target.value) })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit of Measure</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. bags, tons, meters"
                      value={newMaterial.unit}
                      onChange={(e) => setNewMaterial({ ...newMaterial, unit: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Minimum Stock Alert Threshold</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={newMaterial.minimum_stock}
                    onChange={(e) =>
                      setNewMaterial({ ...newMaterial, minimum_stock: Number(e.target.value) })
                    }
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsMaterialModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Adjust Stock */}
      {stockModalItem && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                Adjust Stock: {stockModalItem.name}
              </h3>
              <button
                onClick={() => setStockModalItem(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAdjustStock}>
              <div className="modal-body">
                <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  Current inventory level:{' '}
                  <strong>
                    {stockModalItem.quantity} {stockModalItem.unit}
                  </strong>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Stock Adjustment (+ for incoming delivery, - for consumption)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 50 or -20"
                    value={stockAdjustment}
                    onChange={(e) => setStockAdjustment(Number(e.target.value))}
                    required
                  />
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Projected stock after adjustment:{' '}
                  <strong style={{ color: 'var(--text-main)' }}>
                    {Number(stockModalItem.quantity) + Number(stockAdjustment)} {stockModalItem.unit}
                  </strong>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStockModalItem(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Apply Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Equipment */}
      {isEquipmentModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Add Equipment Asset</h3>
              <button
                onClick={() => setIsEquipmentModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateEquipment}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Equipment Name / Model</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Caterpillar 320 Hydraulic Excavator"
                    value={newEquipment.name}
                    onChange={(e) =>
                      setNewEquipment({ ...newEquipment, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Availability</label>
                    <select
                      className="form-select"
                      value={newEquipment.availability}
                      onChange={(e) =>
                        setNewEquipment({ ...newEquipment, availability: e.target.value })
                      }
                    >
                      <option value="available">Available</option>
                      <option value="in_use">In Use</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Initial Condition</label>
                    <select
                      className="form-select"
                      value={newEquipment.condition}
                      onChange={(e) =>
                        setNewEquipment({ ...newEquipment, condition: e.target.value })
                      }
                    >
                      <option value="operational">Operational</option>
                      <option value="under_maintenance">Under Maintenance</option>
                      <option value="damaged">Damaged</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEquipmentModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Equipment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Badge Generator Sheet Modal */}
      <QRBadgeGeneratorModal
        isOpen={isQRGeneratorOpen}
        onClose={() => setIsQRGeneratorOpen(false)}
        projectId={selectedProjectId}
      />

      {/* Individual Printable QR Asset Tag Modal */}
      <ItemQRModal
        isOpen={!!qrModalItem}
        item={qrModalItem}
        entity={qrModalEntity}
        onClose={() => setQrModalItem(null)}
      />
    </div>
  );
}
