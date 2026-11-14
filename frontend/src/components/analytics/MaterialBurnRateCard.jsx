import React, { useEffect, useState } from 'react';
import { Flame, AlertTriangle, TrendingDown, Clock, CheckCircle2, Calendar, AlertOctagon } from 'lucide-react';
import { materialApi } from '../../api';

export default function MaterialBurnRateCard({ projectId }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!projectId) return;
    let isSubscribed = true;

    async function fetchBurnRate() {
      setLoading(true);
      try {
        const res = await materialApi.getBurnRate(projectId);
        if (isSubscribed) {
          setData(res.data?.data || null);
        }
      } catch (err) {
        console.error('Failed to load burn-rate analytics', err);
      } finally {
        if (isSubscribed) setLoading(false);
      }
    }

    fetchBurnRate();
    return () => {
      isSubscribed = false;
    };
  }, [projectId]);

  if (loading) {
    return (
      <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 0.5rem auto' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Calculating material burn rate & runway days...</p>
      </div>
    );
  }

  if (!data || !data.materials || data.materials.length === 0) {
    return null;
  }

  const { materials, summary } = data;

  return (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Flame size={20} color="#ea580c" />
          <span className="card-title" style={{ margin: 0 }}>
            Burn-Rate Analytics & Low-Stock Depletion Runway
          </span>
        </div>
        {summary?.critical_count > 0 ? (
          <span className="badge badge-overdue" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <AlertOctagon size={13} /> {summary.critical_count} Critical Depletion Warning
          </span>
        ) : (
          <span className="badge badge-in_progress" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <CheckCircle2 size={13} /> Adequate Stock Runway
          </span>
        )}
      </div>

      {summary?.next_milestone && (
        <div
          style={{
            backgroundColor: '#fff7ed',
            borderBottom: '1px solid #ffedd5',
            padding: '0.75rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#9a3412' }}>
            <Calendar size={15} />
            Target Milestone: <strong>{summary.next_milestone.title}</strong>
          </div>
          <span style={{ color: '#c2410c', fontWeight: 600 }}>
            Deadline: {summary.next_milestone.deadline?.split('T')[0]} ({summary.days_to_milestone} days away)
          </span>
        </div>
      )}

      {/* Materials Runway Table */}
      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Material Name</th>
              <th>Current Stock</th>
              <th>Avg. Daily Burn</th>
              <th>Runway Days Left</th>
              <th>Milestone Risk Status</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((m) => {
              const isDepletingBeforeMilestone =
                m.runway_days !== null &&
                summary?.days_to_milestone &&
                m.runway_days < summary.days_to_milestone;

              return (
                <tr key={m.id} style={m.is_critical ? { backgroundColor: '#fff1f2' } : {}}>
                  <td style={{ fontWeight: 600 }}>
                    <div style={{ color: 'var(--text-main)' }}>{m.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Min buffer threshold: {m.minimum_stock} {m.unit}
                    </div>
                  </td>
                  <td>
                    <strong>
                      {m.quantity} {m.unit}
                    </strong>
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#b45309' }}>
                      <TrendingDown size={14} />
                      {m.avg_daily_burn > 0 ? `${m.avg_daily_burn} ${m.unit}/day` : 'Stable (Low activity)'}
                    </span>
                  </td>
                  <td>
                    {m.runway_days !== null ? (
                      <span
                        className={`badge ${
                          m.runway_days <= 3 || isDepletingBeforeMilestone ? 'badge-overdue' : 'badge-in_progress'
                        }`}
                        style={{ fontSize: '0.825rem', fontWeight: 700 }}
                      >
                        <Clock size={12} style={{ marginRight: '3px' }} />
                        {m.runway_days} Days
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>&gt; 90 Days</span>
                    )}
                  </td>
                  <td>
                    {isDepletingBeforeMilestone ? (
                      <span
                        style={{
                          color: '#b91c1c',
                          fontWeight: 700,
                          fontSize: '0.785rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <AlertTriangle size={14} /> Will deplete before milestone!
                      </span>
                    ) : m.quantity <= m.minimum_stock ? (
                      <span style={{ color: '#d97706', fontWeight: 600, fontSize: '0.785rem' }}>
                        Low Stock Alert (&lt; min buffer)
                      </span>
                    ) : (
                      <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.785rem' }}>
                        ✓ Sufficient through milestone
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

