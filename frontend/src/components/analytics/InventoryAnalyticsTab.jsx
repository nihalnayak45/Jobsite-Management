import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  AlertTriangle,
  Flame,
  TrendingDown,
  Calendar,
  Layers,
  BarChart3,
  LineChart as LineChartIcon,
  ShieldAlert,
} from 'lucide-react';
import { analyticsApi, materialApi } from '../../api';

export default function InventoryAnalyticsTab({ projectId }) {
  const [days, setDays] = useState(14);
  const [data, setData] = useState(null);
  const [burnRateData, setBurnRateData] = useState(null);
  const [chartType, setChartType] = useState('bar'); // 'bar' or 'line'
  const [selectedMaterialId, setSelectedMaterialId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    let isMounted = true;
    async function fetchAllData() {
      setLoading(true);
      try {
        const [analyticsRes, burnRateRes] = await Promise.all([
          analyticsApi.getMaterialConsumption(projectId, days),
          materialApi.getBurnRate(projectId),
        ]);

        if (isMounted) {
          const aData = analyticsRes.data?.data || null;
          const bData = burnRateRes.data?.data || null;
          setData(aData);
          setBurnRateData(bData);
          if (aData?.analyzed_materials?.length > 0 && !selectedMaterialId) {
            setSelectedMaterialId(aData.analyzed_materials[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching inventory analytics:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchAllData();
    return () => {
      isMounted = false;
    };
  }, [projectId, days]);

  if (loading) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Generating Inventory Analytics & Recharts visualizations...</p>
      </div>
    );
  }

  const materials = data?.analyzed_materials || [];
  // Sort by 14-day consumption to get top 5
  const top5Materials = [...materials]
    .sort((a, b) => (b.consumed_last_14_days || 0) - (a.consumed_last_14_days || 0))
    .slice(0, 5);

  const selectedMaterial =
    top5Materials.find((m) => m.id === Number(selectedMaterialId)) ||
    top5Materials[0] ||
    materials[0];

  const milestoneRisks = burnRateData?.milestone_depletion_risks || [];

  // Match milestone depletion risk for selected material
  const milestoneRiskItem = milestoneRisks.find((r) => r.id === selectedMaterial?.id);

  // Transform timeline points for Recharts
  const chartData = (selectedMaterial?.daily_consumption || []).map((pt) => ({
    date: pt.date.split('-').slice(1).join('/'),
    fullDate: pt.date,
    consumption: pt.consumed,
    minimum_stock: selectedMaterial?.minimum_stock || 0,
  }));

  // Runway styling calculation
  const runwayDays = selectedMaterial?.estimated_days_remaining;
  const isDepletingBeforeMilestone = milestoneRiskItem?.will_deplete_before_milestone;
  const isLowStock = selectedMaterial?.is_low_stock;
  const isCriticalRunway = runwayDays !== null && runwayDays <= 7;

  let runwayBadgeClass = 'badge-completed';
  let runwayColor = '#16a34a';
  let runwayBg = '#f0fdf4';
  let runwayBorder = '#bbf7d0';

  if (isDepletingBeforeMilestone || isCriticalRunway || isLowStock) {
    runwayBadgeClass = 'badge-danger';
    runwayColor = '#dc2626';
    runwayBg = '#fef2f2';
    runwayBorder = '#fecaca';
  } else if (runwayDays !== null && runwayDays <= 14) {
    runwayColor = '#d97706';
    runwayBg = '#fffbeb';
    runwayBorder = '#fde68a';
  }

  return (
    <div>
      {/* Top Controls: Material selector & Chart Type */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
            Inventory Consumption Trends & Depletion Analytics
          </h2>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Visual tracking with Recharts, minimum stock threshold lines, and milestone depletion risk
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Days filter */}
          <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: 'var(--bg-subtle)', padding: '0.2rem', borderRadius: '6px' }}>
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                type="button"
                className={`btn btn-sm ${days === d ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                onClick={() => setDays(d)}
              >
                {d}d
              </button>
            ))}
          </div>

          {/* Chart Type Toggle */}
          <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: 'var(--bg-subtle)', padding: '0.2rem', borderRadius: '6px' }}>
            <button
              type="button"
              className={`btn btn-sm ${chartType === 'bar' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}
              onClick={() => setChartType('bar')}
              title="Bar Chart"
            >
              <BarChart3 size={14} /> Bar
            </button>
            <button
              type="button"
              className={`btn btn-sm ${chartType === 'line' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}
              onClick={() => setChartType('line')}
              title="Line Chart"
            >
              <LineChartIcon size={14} /> Line
            </button>
          </div>
        </div>
      </div>

      {/* Top 5 Material Filter Pills */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, alignSelf: 'center', color: 'var(--text-muted)', marginRight: '0.25rem' }}>
          Top Consumed:
        </span>
        {top5Materials.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setSelectedMaterialId(m.id)}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '20px',
              border: selectedMaterial?.id === m.id ? '2px solid var(--primary-600)' : '1px solid var(--border-subtle)',
              backgroundColor: selectedMaterial?.id === m.id ? 'var(--bg-subtle)' : '#ffffff',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: selectedMaterial?.id === m.id ? 'var(--primary-700)' : 'var(--text-main)',
            }}
          >
            <span>{m.name}</span>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '0.1rem 0.4rem',
                borderRadius: '10px',
                backgroundColor: m.is_low_stock ? '#fee2e2' : '#e0f2fe',
                color: m.is_low_stock ? '#b91c1c' : '#0369a1',
              }}
            >
              {m.quantity} {m.unit}
            </span>
          </button>
        ))}
      </div>

      {/* KPI & Runway Cards Row */}
      {selectedMaterial && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          {/* Current Stock */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Current Physical Stock
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, marginTop: '0.35rem', color: 'var(--text-main)' }}>
              {selectedMaterial.quantity.toLocaleString()} <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{selectedMaterial.unit}</span>
            </div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: isLowStock ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
              Threshold Minimum: {selectedMaterial.minimum_stock.toLocaleString()} {selectedMaterial.unit}
            </div>
          </div>

          {/* Daily Burn Rate */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              14-Day Average Burn Rate ($\bar&#123;B&#125;$)
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, marginTop: '0.35rem', color: '#ea580c' }}>
              {selectedMaterial.average_daily_burn_rate} <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{selectedMaterial.unit}/day</span>
            </div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: 'var(--text-muted)' }}>
              Total consumed: {selectedMaterial.consumed_last_14_days} {selectedMaterial.unit}
            </div>
          </div>

          {/* RUNWAY CARD WITH MILESTONE WARNING */}
          <div
            className="card"
            style={{
              padding: '1.25rem',
              backgroundColor: runwayBg,
              border: `1.5px solid ${runwayBorder}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: runwayColor, textTransform: 'uppercase' }}>
                Estimated Stock Runway
              </span>
              {(isDepletingBeforeMilestone || isCriticalRunway) && (
                <AlertTriangle size={18} color="#dc2626" />
              )}
            </div>

            <div style={{ fontSize: '1.75rem', fontWeight: 900, marginTop: '0.35rem', color: runwayColor }}>
              {runwayDays !== null ? `${runwayDays} Days` : 'Zero Daily Burn'}
            </div>

            <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: runwayColor, fontWeight: 700 }}>
              {isDepletingBeforeMilestone ? (
                <span>⚠️ Depletes before milestone: {milestoneRiskItem?.milestone_target}</span>
              ) : isCriticalRunway ? (
                <span>⚠️ Critical: Projected to reach zero in &lt; 7 days</span>
              ) : isLowStock ? (
                <span>⚠️ Stock at/below minimum threshold</span>
              ) : (
                <span>✓ Healthy supply buffer for upcoming tasks</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RECHARTS VISUALIZATION: Daily Consumption Trend with Threshold Line */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
              Daily Consumption Trend — {selectedMaterial?.name}
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Measured in {selectedMaterial?.unit} • Horizontal dashed line indicates Minimum Stock Safety Threshold ({selectedMaterial?.minimum_stock} {selectedMaterial?.unit})
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', fontWeight: 600 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#0284c7' }}>
              <span style={{ width: '12px', height: '12px', backgroundColor: '#0284c7', borderRadius: '2px', display: 'inline-block' }}></span>
              Daily Usage
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#dc2626' }}>
              <span style={{ width: '16px', height: '2px', borderTop: '2px dashed #dc2626', display: 'inline-block' }}></span>
              Min Stock Line
            </span>
          </div>
        </div>

        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  formatter={(value) => [`${value} ${selectedMaterial?.unit}`, 'Daily Consumption']}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                />
                <ReferenceLine
                  y={selectedMaterial?.minimum_stock}
                  label={{ value: `Min Stock (${selectedMaterial?.minimum_stock})`, fill: '#dc2626', fontSize: 11, position: 'top' }}
                  stroke="#dc2626"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                />
                <Bar dataKey="consumption" name="Consumed Amount" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  formatter={(value) => [`${value} ${selectedMaterial?.unit}`, 'Daily Consumption']}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                />
                <ReferenceLine
                  y={selectedMaterial?.minimum_stock}
                  label={{ value: `Min Stock (${selectedMaterial?.minimum_stock})`, fill: '#dc2626', fontSize: 11, position: 'top' }}
                  stroke="#dc2626"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="consumption"
                  name="Daily Consumption"
                  stroke="#0284c7"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#0284c7' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

