import React from 'react';
import { TrendingUp, Target, Activity } from 'lucide-react';

export default function ProjectSCurveChart({ points = [] }) {
  if (!points || points.length === 0) return null;

  const width = 640;
  const height = 240;
  const padding = { top: 25, right: 30, bottom: 40, left: 45 };

  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Compute coordinate mapping
  const numPoints = points.length;
  const getX = (index) => padding.left + (index / (numPoints - 1)) * graphWidth;
  const getY = (val) => padding.top + (1 - val / 100) * graphHeight;

  // Build SVG path strings
  let plannedPath = '';
  let actualPath = '';

  points.forEach((pt, idx) => {
    const x = getX(idx);
    const yPlanned = getY(pt.planned);
    if (idx === 0) {
      plannedPath += `M ${x} ${yPlanned}`;
    } else {
      plannedPath += ` L ${x} ${yPlanned}`;
    }

    if (pt.actual !== null && pt.actual !== undefined) {
      const yActual = getY(pt.actual);
      if (!actualPath) {
        actualPath += `M ${x} ${yActual}`;
      } else {
        actualPath += ` L ${x} ${yActual}`;
      }
    }
  });

  return (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <TrendingUp size={20} color="var(--primary)" />
          <span className="card-title" style={{ margin: 0 }}>
            Planned vs. Actual Progress S-Curve
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', fontWeight: 600 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748b' }}>
            <span style={{ width: '12px', height: '3px', backgroundColor: '#94a3b8', display: 'inline-block' }} />
            Planned Baseline (S-Curve)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#2563eb' }}>
            <span style={{ width: '12px', height: '3px', backgroundColor: '#2563eb', display: 'inline-block' }} />
            Actual Work Executed
          </span>
        </div>
      </div>

      <div style={{ padding: '1rem', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', minWidth: '480px', display: 'block' }}
        >
          {/* Horizontal Grid lines */}
          {[0, 25, 50, 75, 100].map((val) => {
            const y = getY(val);
            return (
              <g key={val}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray={val === 0 || val === 100 ? 'none' : '3,3'}
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  fill="#94a3b8"
                  fontSize="10"
                  textAnchor="end"
                  fontWeight="600"
                >
                  {val}%
                </text>
              </g>
            );
          })}

          {/* Planned Line */}
          <path d={plannedPath} fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="5,4" />

          {/* Actual Line */}
          {actualPath && (
            <path d={actualPath} fill="none" stroke="#2563eb" strokeWidth="3.5" strokeLinecap="round" />
          )}

          {/* Data Points */}
          {points.map((pt, idx) => {
            const x = getX(idx);
            const yPlanned = getY(pt.planned);
            const hasActual = pt.actual !== null && pt.actual !== undefined;
            const yActual = hasActual ? getY(pt.actual) : null;

            return (
              <g key={idx}>
                {/* Planned point marker */}
                <circle cx={x} cy={yPlanned} r="3" fill="#ffffff" stroke="#94a3b8" strokeWidth="2" />

                {/* Actual point marker with tooltip text */}
                {hasActual && (
                  <>
                    <circle cx={x} cy={yActual} r="5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                    <text
                      x={x}
                      y={yActual - 10}
                      fill="#1e3a8a"
                      fontSize="11"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      {pt.actual}%
                    </text>
                  </>
                )}

                {/* X-axis date label */}
                <text
                  x={x}
                  y={height - 12}
                  fill="#64748b"
                  fontSize="10"
                  textAnchor="middle"
                  fontWeight="600"
                >
                  {pt.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

