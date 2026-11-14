import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TrendingUp, CheckCircle2, Clock, Calendar } from 'lucide-react';

export default function SCurveRecharts({ points = [], taskSummary = null, milestoneDonut = [] }) {
  // Process timeline data for Recharts
  const chartData = points.map((pt) => ({
    week: pt.week || pt.label || pt.display_date,
    date: pt.date || pt.display_date,
    Planned: pt.planned_pct ?? pt.planned ?? 0,
    Actual: pt.actual_pct !== null && pt.actual_pct !== undefined ? pt.actual_pct : (pt.actual !== null ? pt.actual : null),
  }));

  const pieData = milestoneDonut && milestoneDonut.length > 0
    ? milestoneDonut.filter((d) => d.value > 0)
    : [
        { name: 'Completed', value: taskSummary?.completed || 0, color: '#16a34a' },
        { name: 'In Progress', value: taskSummary?.in_progress || 0, color: '#0284c7' },
        { name: 'Pending', value: taskSummary?.pending || 0, color: '#94a3b8' },
        { name: 'Overdue', value: taskSummary?.overdue || 0, color: '#dc2626' },
      ].filter((d) => d.value > 0);

  const totalTasks = taskSummary?.total || pieData.reduce((acc, d) => acc + d.value, 0) || 1;
  const completedTasks = taskSummary?.completed || pieData.find(d => d.name === 'Completed')?.value || 0;
  const completionPercentage = Math.round((completedTasks / totalTasks) * 100);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
      {/* S-CURVE AREA / LINE CHART */}
      <div className="card" style={{ padding: '1.5rem', gridColumn: 'span 2' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={20} color="var(--primary-600)" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                Project S-Curve: Planned Baseline vs. Actual Execution
              </h3>
            </div>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Cumulative expected progress curve vs. real task completion trajectory
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', fontWeight: 700 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#6366f1' }}>
              <span style={{ width: '12px', height: '3px', borderTop: '2px dashed #6366f1', display: 'inline-block' }}></span>
              Planned Baseline
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#10b981' }}>
              <span style={{ width: '12px', height: '3px', backgroundColor: '#10b981', display: 'inline-block' }}></span>
              Actual Progress
            </span>
          </div>
        </div>

        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 15, right: 25, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="plannedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" stroke="#64748b" fontSize={11} />
              <YAxis domain={[0, 100]} unit="%" stroke="#64748b" fontSize={11} />
              <Tooltip
                formatter={(value, name) => [`${value}%`, name]}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                }}
              />
              <Area
                type="monotone"
                dataKey="Planned"
                stroke="#6366f1"
                strokeDasharray="5 5"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#plannedGradient)"
              />
              <Area
                type="monotone"
                dataKey="Actual"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#actualGradient)"
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* MILESTONE TASKS DONUT CHART */}
      <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <CheckCircle2 size={18} color="#16a34a" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Milestone Completion</h3>
          </div>
          <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            Completed vs. Remaining Tasks
          </p>
        </div>

        <div style={{ width: '100%', height: 210, position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                innerRadius={60}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || '#0284c7'} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val, name) => [`${val} tasks`, name]}
                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Center text in donut */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>
              {completionPercentage}%
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
              Done
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
          {pieData.map((d) => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
              <span style={{ width: '10px', height: '10px', backgroundColor: d.color, borderRadius: '50%', display: 'inline-block' }}></span>
              <span style={{ color: 'var(--text-muted)' }}>{d.name}:</span>
              <strong style={{ color: 'var(--text-main)' }}>{d.value}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

