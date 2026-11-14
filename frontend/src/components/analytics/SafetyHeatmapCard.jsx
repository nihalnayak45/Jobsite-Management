import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export default function SafetyHeatmapCard({ heatmap = [], resolutionBreakdown = {} }) {
  if (!heatmap || heatmap.length === 0) return null;

  return (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <ShieldAlert size={20} color="#dc2626" />
          <span className="card-title" style={{ margin: 0 }}>
            Safety Incident Distribution & Site Area Heatmap
          </span>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Targeted Briefing Matrix for Site Engineers & PMs
        </span>
      </div>

      <div style={{ padding: '1.25rem' }}>
        {/* Site Zone Heatmap Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {heatmap.map((zone, idx) => {
            const total = (zone.minor || 0) + (zone.moderate || 0) + (zone.critical || 0);
            const severityColor =
              zone.critical > 0
                ? '#fef2f2' // Red
                : zone.moderate > 0
                ? '#fffbeb' // Amber
                : '#f0fdf4'; // Green
            const borderColor =
              zone.critical > 0
                ? '#f87171'
                : zone.moderate > 0
                ? '#fbbf24'
                : '#86efac';

            return (
              <div
                key={idx}
                style={{
                  backgroundColor: severityColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '8px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    {zone.zone}
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.25rem 0', color: zone.critical > 0 ? '#b91c1c' : '#1e293b' }}>
                    {total} {total === 1 ? 'Notice' : 'Notices'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.5rem', fontSize: '0.75rem' }}>
                  {zone.critical > 0 && (
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>
                      • {zone.critical} Critical
                    </span>
                  )}
                  {zone.moderate > 0 && (
                    <span style={{ color: '#d97706', fontWeight: 600 }}>
                      • {zone.moderate} Moderate
                    </span>
                  )}
                  {zone.minor > 0 && (
                    <span style={{ color: '#65a30d', fontWeight: 500 }}>
                      • {zone.minor} Minor
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Resolution Breakdown Bar */}
        {resolutionBreakdown && (
          <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
              <strong>Issue Lifecycle & Ground Resolution Status:</strong>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
                <span style={{ color: '#dc2626' }}>● Open: {resolutionBreakdown.open || 0}</span>
                <span style={{ color: '#d97706' }}>● In Progress: {resolutionBreakdown.in_progress || 0}</span>
                <span style={{ color: '#16a34a' }}>● Resolved: {resolutionBreakdown.resolved || 0}</span>
              </div>
            </div>
            {/* Visual ratio progress */}
            {(() => {
              const total = (resolutionBreakdown.open || 0) + (resolutionBreakdown.in_progress || 0) + (resolutionBreakdown.resolved || 0);
              if (total === 0) return null;
              const openPct = ((resolutionBreakdown.open || 0) / total) * 100;
              const inProgPct = ((resolutionBreakdown.in_progress || 0) / total) * 100;
              const resPct = ((resolutionBreakdown.resolved || 0) / total) * 100;

              return (
                <div style={{ height: '8px', width: '100%', display: 'flex', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${openPct}%`, backgroundColor: '#ef4444' }} />
                  <div style={{ width: `${inProgPct}%`, backgroundColor: '#f59e0b' }} />
                  <div style={{ width: `${resPct}%`, backgroundColor: '#22c55e' }} />
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

