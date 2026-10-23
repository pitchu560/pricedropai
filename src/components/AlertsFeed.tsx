import React, { useState } from 'react';
import { Bell, VolumeX, CheckCheck, Clock, ArrowDownRight, ShieldCheck } from 'lucide-react';
import { Alert } from '../types';

interface AlertsFeedProps {
  alerts: Alert[];
  onMuteAlert: (alertId: number) => Promise<void>;
  onResolveAlert: (alertId: number) => Promise<void>;
  onGoToApprovals: () => void;
}

export const AlertsFeed: React.FC<AlertsFeedProps> = ({
  alerts,
  onMuteAlert,
  onResolveAlert,
  onGoToApprovals,
}) => {
  const [filter, setFilter] = useState<string>('ALL');

  const filtered = alerts.filter((a) => {
    if (filter === 'ALL') return true;
    return a.status === filter;
  });

  return (
    <div className="space-y-4">
      {/* Header filter controls */}
      <div className="flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight">Confirmed Price Drop Alerts</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Deduplicated alerts triggered exclusively after multi-factor evidence verification.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs font-medium">
          {['ALL', 'CONFIRMED', 'MUTED', 'RESOLVED'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md transition-colors ${
                filter === f
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f === 'ALL' ? 'All Alerts' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts list */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400 text-xs">
          No price drop alerts matching the selected filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => {
            const isConfirmed = alert.status === 'CONFIRMED';
            const dateStr = new Date(alert.created_at).toLocaleString();

            return (
              <div
                key={alert.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                    <span className="text-white font-bold">#{alert.id}</span>
                    <span>·</span>
                    <span className="text-indigo-400">{alert.product_id}</span>
                    <span>·</span>
                    <span className={`font-semibold ${
                      alert.status === 'CONFIRMED'
                        ? 'text-emerald-400'
                        : alert.status === 'MUTED'
                        ? 'text-slate-400'
                        : 'text-cyan-400'
                    }`}>
                      {alert.status}
                    </span>
                  </div>

                  <h3 className="font-semibold text-sm text-white">
                    {alert.product_name || alert.product_id}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1 text-emerald-400 font-mono font-bold">
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      ${alert.new_price.toFixed(2)} (Target: ${alert.target_price.toFixed(2)})
                    </span>
                    <span>·</span>
                    <span className="text-slate-300 font-mono">
                      Save ${alert.drop_amount.toFixed(2)} (-{alert.drop_percentage.toFixed(1)}%)
                    </span>
                    <span>·</span>
                    <span className="text-slate-500 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {dateStr}
                    </span>
                  </div>

                  {alert.reason && (
                    <p className="text-xs text-slate-400 bg-slate-950/70 p-2 rounded border border-slate-800/80">
                      {alert.reason}
                    </p>
                  )}
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                  {isConfirmed && (
                    <button
                      onClick={onGoToApprovals}
                      className="px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold rounded-md transition-colors"
                    >
                      Review Approval
                    </button>
                  )}

                  {alert.status !== 'MUTED' && (
                    <button
                      onClick={() => onMuteAlert(alert.id)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-md transition-colors flex items-center gap-1"
                      title="Mute further notifications"
                    >
                      <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                      <span>Mute</span>
                    </button>
                  )}

                  {alert.status !== 'RESOLVED' && (
                    <button
                      onClick={() => onResolveAlert(alert.id)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-md transition-colors flex items-center gap-1"
                      title="Mark resolved"
                    >
                      <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                      <span>Resolve</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
