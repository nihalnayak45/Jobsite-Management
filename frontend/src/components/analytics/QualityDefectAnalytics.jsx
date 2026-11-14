import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  AlertOctagon,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

export default function QualityDefectAnalytics({
  defectBreakdown = null,
  weeklyAttendance = [],
}) {
  const issuesByPriority = defectBreakdown?.by_priority || [
    { name: 'Critical', count: 0, color: '#dc2626' },
    { name: 'High', count: 0, color: '#ea580c' },
    { name: 'Medium', count: 0, color: '#d97706' },
    { name: 'Low', count: 0, color: '#16a34a' },
  ];

  const totalOpenIssues = defectBreakdown?.total_open || 0;
  const avgResolutionHours = defectBreakdown?.avg_resolution_hours || 0;
  const avgResolutionDays = defectBreakdown?.avg_resolution_days || 0;
  const resolvedCount = defectBreakdown?.resolved_count || 0;

  // Pie chart data
  const pieData = issuesByPriority.map((item) => ({
    name: item.name,
    value: item.count || 0,
    color: item.color,
  }));

  const hasIssueData = pieData.some((p) => p.value > 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
      {/* 1. ISSUE SEVERITY BREAKDOWN DONUT */}
      <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertOctagon size={18} color="#dc2626" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                Defect Severity Distribution
              </h3>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.2rem 0.55rem',
                borderRadius: '12px',
                backgroundColor: totalOpenIssues > 0 ? '#fee2e2' : '#f0fdf4',
                color: totalOpenIssues > 0 ? '#b91c1c' : '#16a34a',
              }}
            >
              {totalOpenIssues} Active Defects
            </span>
          </div>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            Open site issues categorized by urgency level
          </p>
        </div>

        <div style={{ width: '100%', height: 210, position: 'relative' }}>
          {hasIssueData ? (
            <>
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
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, name) => [`${val} issues`, `${name} Priority`]}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
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
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#dc2626' }}>
                  {totalOpenIssues}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Open
                </div>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#16a34a' }}>
              <CheckCircle size={36} />
              <p style={{ marginTop: '0.5rem', fontWeight: 700, fontSize: '0.9rem' }}>All defects resolved!</p>
            </div>
          )}
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

        {/* Resolution Time KPI Footer */}
        <div
          style={{
            marginTop: '1rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.825rem',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)' }}>
            <Clock size={14} /> Avg Resolution Time:
          </span>
          <strong style={{ color: 'var(--text-main)' }}>
            {avgResolutionHours > 0 ? `${avgResolutionHours} hrs (${avgResolutionDays} days)` : 'Instant / Pending'}
          </strong>
        </div>
      </div>

      {/* 2. WEEKLY ATTENDANCE BAR CHART */}
      <div className="card" style={{ padding: '1.5rem', gridColumn: 'span 2' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} color="var(--primary-600)" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                Weekly Workforce Attendance Trends
              </h3>
            </div>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Headcount breakdown: Present vs. Absent vs. Half-day workers over the last 14 days
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', fontWeight: 700 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#10b981' }}>
              <span style={{ width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '2px', display: 'inline-block' }}></span>
              Present
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#ef4444' }}>
              <span style={{ width: '12px', height: '12px', backgroundColor: '#ef4444', borderRadius: '2px', display: 'inline-block' }}></span>
              Absent
            </span>
          </div>
        </div>

        <div style={{ width: '100%', height: 260 }}>
          {weeklyAttendance.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyAttendance} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  formatter={(val, name) => [`${val} workers`, name]}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                />
                <Bar dataKey="present" name="Present Workers" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" name="Absent Workers" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              <p>No workforce attendance logged for this period.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

