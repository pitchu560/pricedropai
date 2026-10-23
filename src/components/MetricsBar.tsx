import React from 'react';
import { Eye, Bell, ShoppingCart, CheckCircle2, Database } from 'lucide-react';
import { MonitoringStatus, DatasetStatus } from '../types';

interface MetricsBarProps {
  status: MonitoringStatus | null;
  datasetStatus: DatasetStatus | null;
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({
  status,
  datasetStatus,
  activeTab,
  onSelectTab
}) => {
  const cards = [
    {
      id: 'products',
      label: 'Active Watches',
      value: status?.active_watches ?? datasetStatus?.products_count ?? 0,
      subtext: 'Monitored catalog items',
      icon: Eye,
      accent: 'border-l-indigo-500',
    },
    {
      id: 'alerts',
      label: 'Confirmed Drops',
      value: status?.confirmed_drops_alerted ?? datasetStatus?.alerts_count ?? 0,
      subtext: 'Deduplicated price drops',
      icon: Bell,
      accent: 'border-l-emerald-500',
    },
    {
      id: 'approvals',
      label: 'Pending Approvals',
      value: status?.pending_cart_approvals ?? datasetStatus?.approvals_count ?? 0,
      subtext: 'Gated simulated cart actions',
      icon: ShoppingCart,
      accent: (status?.pending_cart_approvals ?? 0) > 0 ? 'border-l-amber-500' : 'border-l-slate-700',
    },
    {
      id: 'logs',
      label: 'Audit Probes',
      value: datasetStatus?.verification_logs_count ?? 0,
      subtext: 'Decision engine decisions',
      icon: CheckCircle2,
      accent: 'border-l-cyan-500',
    },
    {
      id: 'dataset',
      label: 'Synthetic Dataset',
      value: datasetStatus?.observations_count ?? 0,
      subtext: 'Observations in SQLite',
      icon: Database,
      accent: 'border-l-violet-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        const isSelected = activeTab === c.id;
        return (
          <button
            key={c.id}
            onClick={() => onSelectTab(c.id)}
            className={`text-left p-4 rounded-lg bg-slate-900 border transition-all ${
              isSelected
                ? 'border-slate-500 ring-1 ring-slate-400 bg-slate-800/80'
                : 'border-slate-800 hover:border-slate-700 hover:bg-slate-850'
            } border-l-4 ${c.accent}`}
          >
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-xs font-medium uppercase tracking-wider">{c.label}</span>
              <Icon className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-white font-mono">{c.value}</div>
            <div className="text-xs text-slate-400 mt-1 truncate">{c.subtext}</div>
          </button>
        );
      })}
    </div>
  );
};
