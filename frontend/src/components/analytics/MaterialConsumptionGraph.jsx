import React, { useState, useEffect } from 'react';
import {
  TrendingDown,
  AlertTriangle,
  Calendar,
  Flame,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import { analyticsApi } from '../../api';

export default function MaterialConsumptionGraph({ projectId }) {
  const [days, setDays] = useState(14);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState(null);

  useEffect(() => {
    if (!projectId) return;

    let isMounted = true;
    async function fetchAnalytics() {
      setLoading(true);
      setError(null);
      try {
        const res = await analyticsApi.getMaterialConsumption(projectId, days);
        if (isMounted) {
          const resData = res.data?.data || null;
          setData(resData);
          if (resData?.analyzed_materials?.length > 0 && !selectedMaterialId) {
            setSelectedMaterialId(resData.analyzed_materials[0].id);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || 'Failed to load material analytics');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchAnalytics();
    return () => {
      isMounted = false;
    };
  }, [projectId, days]);

  if (loading) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 0.75rem' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Calculating daily burn rates and depletion runway...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card" style={{ padding: '1.5rem', color: 'var(--text-muted)' }}>
        <p>{error || 'No inventory data available for forecasting.'}</p>
      </div>
    );
  }

  const materials = data.analyzed_materials || [];
  const criticalMaterials = data.critical_depletion_materials || [];
  const selectedMaterial = materials.find((m) => m.id === Number(selectedMaterialId)) || materials[0];

  // Daily points for selected material
  const dailyPoints = selectedMaterial?.daily_consumption || [];
  const maxConsumption = Math.max(10, ...dailyPoints.map((p) => p.consumed));

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      {/* Header */}
      <div
        className="card-header"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Flame size={22} color="#ea580c" />
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              Historical Material Consumption & Depletion Forecast
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              14-day rolling burn rate ($\bar&#123;B&#125;$), runway days, and 7-day zero-stock alert
            </p>
          </div>
        </div>

        {/* Days Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              type="button"
              className={`btn btn-sm ${days === d ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setDays(d)}
              style={{ fontWeight: 600, padding: '0.35rem 0.75rem' }}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '1.25rem' }}>
        {/* CRITICAL 7-DAY ZERO STOCK WARNING BANNER */}
        {criticalMaterials.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.25rem',
              color: '#991b1b',
            }}
          >
            <AlertTriangle size={22} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ fontSize: '0.95rem' }}>
                Stock Depletion Warning: {criticalMaterials.length} material(s) projected to deplete within 7 days!
              </strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                {criticalMaterials.map((cm) => (
                  <span
                    key={cm.id}
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      backgroundColor: '#fee2e2',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '4px',
                      color: '#b91c1c',
                    }}
                  >
                    ⚠️ {cm.name}: {cm.estimated_days_remaining} day(s) left ({cm.quantity} {cm.unit} in stock)
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Material Selector Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {materials.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMaterialId(m.id)}
              style={{
                border: selectedMaterial?.id === m.id ? '2px solid var(--primary-600)' : '1px solid var(--border-subtle)',
                backgroundColor: selectedMaterial?.id === m.id ? 'var(--bg-subtle)' : '#ffffff',
                borderRadius: '20px',
                padding: '0.4rem 0.85rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: selectedMaterial?.id === m.id ? 'var(--primary-700)' : 'var(--text-main)',
              }}
            >
              <span>{m.name}</span>
              {m.reaches_zero_within_7_days && (
                <span
                  style={{
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    borderRadius: '10px',
                    fontSize: '0.7rem',
                    padding: '0.1rem 0.4rem',
                    fontWeight: 700,
                  }}
                >
                  {m.estimated_days_remaining}d
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Selected Material KPI Cards */}
        {selectedMaterial && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <div
              style={{
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '1rem',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Current Stock</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)', marginTop: '0.25rem' }}>
                {selectedMaterial.quantity.toLocaleString()} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{selectedMaterial.unit}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: selectedMaterial.is_low_stock ? '#dc2626' : '#16a34a', marginTop: '0.2rem' }}>
                Min Threshold: {selectedMaterial.minimum_stock.toLocaleString()} {selectedMaterial.unit}
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '1rem',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>14-Day Average Burn</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ea580c', marginTop: '0.25rem' }}>
                {selectedMaterial.average_daily_burn_rate} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{selectedMaterial.unit}/day</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Total consumed (14d): {selectedMaterial.consumed_last_14_days} {selectedMaterial.unit}
              </div>
            </div>

            <div
              style={{
                backgroundColor: selectedMaterial.reaches_zero_within_7_days ? '#fef2f2' : 'var(--bg-subtle)',
                border: `1px solid ${selectedMaterial.reaches_zero_within_7_days ? '#fca5a5' : 'var(--border-subtle)'}`,
                borderRadius: '8px',
                padding: '1rem',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: selectedMaterial.reaches_zero_within_7_days ? '#b91c1c' : 'var(--text-muted)', fontWeight: 600 }}>
                Projected Runway
              </div>
              <div
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 900,
                  color: selectedMaterial.reaches_zero_within_7_days ? '#dc2626' : 'var(--primary-600)',
                  marginTop: '0.25rem',
                }}
              >
                {selectedMaterial.estimated_days_remaining !== null
                  ? `${selectedMaterial.estimated_days_remaining} Days`
                  : 'Stable / No Burn'}
              </div>
              <div style={{ fontSize: '0.75rem', color: selectedMaterial.reaches_zero_within_7_days ? '#b91c1c' : '#16a34a', marginTop: '0.2rem' }}>
                {selectedMaterial.reaches_zero_within_7_days ? '⚠️ Depletes in < 7 Days' : '✓ Above Safe Runway'}
              </div>
            </div>
          </div>
        )}

        {/* Daily Consumption Trend Bar Chart (SVG) */}
        {selectedMaterial && (
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
              Daily Consumption Timeline ({selectedMaterial.name})
            </div>

            <div
              style={{
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '1rem',
                backgroundColor: '#ffffff',
              }}
            >
              <svg width="100%" height="160" viewBox="0 0 600 160" preserveAspectRatio="none">
                {/* Horizontal gridlines */}
                <line x1="40" y1="20" x2="580" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="70" x2="580" y2="70" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="120" x2="580" y2="120" stroke="#e2e8f0" strokeWidth="1" />

                {/* Bars */}
                {dailyPoints.map((pt, idx) => {
                  const barWidth = Math.max(6, Math.floor(520 / dailyPoints.length) - 4);
                  const x = 50 + idx * Math.floor(520 / dailyPoints.length);
                  const barHeight = Math.round((pt.consumed / maxConsumption) * 100);
                  const y = 120 - barHeight;

                  return (
                    <g key={pt.date}>
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        rx="3"
                        fill={pt.consumed > 0 ? '#0284c7' : '#e2e8f0'}
                      >
                        <title>{`${pt.date}: ${pt.consumed} ${selectedMaterial.unit}`}</title>
                      </rect>
                      {/* Date label for every 3rd or 5th point */}
                      {(idx % Math.ceil(dailyPoints.length / 6) === 0 || idx === dailyPoints.length - 1) && (
                        <text
                          x={x + barWidth / 2}
                          y="140"
                          fontSize="9"
                          fill="#64748b"
                          textAnchor="middle"
                        >
                          {pt.date.split('-').slice(1).join('/')}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

