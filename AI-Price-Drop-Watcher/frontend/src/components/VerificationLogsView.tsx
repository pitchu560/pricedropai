import React, { useState } from 'react';
import {
  FileText,
  Download,
  Search,
  Code,
  X,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { VerificationLog } from '../types';

interface VerificationLogsViewProps {
  logs: VerificationLog[];
  onRefresh: () => void;
}

export const VerificationLogsView: React.FC<VerificationLogsViewProps> = ({
  logs,
  onRefresh,
}) => {
  const [filter, setFilter] = useState<string>('ALL');
  const [selectedPayload, setSelectedPayload] = useState<{
    run_id: string;
    decision: string;
    payload: any;
  } | null>(null);

  const decisionsList = [
    'ALL',
    'CONFIRMED_DROP',
    'UNCHANGED',
    'WRONG_VARIANT',
    'SELLER_MISMATCH',
    'STALE_EVIDENCE',
    'INVALID_PRICE',
    'MISSING_DATA',
    'UNCERTAIN',
    'ACTION_EXECUTED',
  ];

  const filtered = logs.filter((log) => {
    if (filter === 'ALL') return true;
    return log.decision === filter;
  });

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'CONFIRMED_DROP':
      case 'ACTION_EXECUTED':
        return 'text-emerald-400 font-semibold';
      case 'UNCERTAIN':
      case 'STALE_EVIDENCE':
        return 'text-amber-400 font-semibold';
      case 'WRONG_VARIANT':
      case 'SELLER_MISMATCH':
      case 'INVALID_PRICE':
      case 'ACTION_REJECTED':
        return 'text-rose-400 font-semibold';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Bar with Filter & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight">Decision Engine Audit Trail</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable log of all probes, heuristic decisions, confidence scores, and raw payloads.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Decision dropdown */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {decisionsList.map((d) => (
              <option key={d} value={d}>
                {d === 'ALL' ? 'All Decisions' : d}
              </option>
            ))}
          </select>

          {/* Export CSV button */}
          <a
            href="/verification-logs/export/csv"
            download="verification_logs.csv"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors border border-slate-700/60"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Table view */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400 text-xs">
          No audit logs matching '{filter}'.
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-mono tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Run ID / Check</th>
                  <th className="py-3 px-4">Product SKU</th>
                  <th className="py-3 px-4">Decision</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Reason & Heuristic Explanation</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filtered.map((log) => {
                  const dateStr = new Date(log.timestamp).toLocaleString();
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                        <div className="font-semibold text-slate-200">{log.run_id}</div>
                        <div className="text-[11px] text-slate-500">{log.check_type}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-indigo-300 whitespace-nowrap">
                        {log.product_id || 'SYSTEM'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={getDecisionBadge(log.decision)}>{log.decision}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                        {(log.confidence_score * 100).toFixed(0)}%
                      </td>
                      <td className="py-3 px-4 text-slate-300 max-w-md">
                        <p className="line-clamp-2 leading-relaxed">{log.reason}</p>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap text-[11px]">
                        {dateStr}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {log.evidence_payload ? (
                          <button
                            onClick={() =>
                              setSelectedPayload({
                                run_id: log.run_id,
                                decision: log.decision,
                                payload: JSON.parse(log.evidence_payload || '{}'),
                              })
                            }
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors inline-flex items-center gap-1 font-mono text-[11px]"
                            title="Inspect parsed evidence JSON"
                          >
                            <Code className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Inspect</span>
                          </button>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* JSON Payload Inspector Modal */}
      {selectedPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 text-slate-100 shadow-2xl relative space-y-4">
            <button
              onClick={() => setSelectedPayload(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 font-mono text-xs text-slate-400 mb-1">
                <span>{selectedPayload.run_id}</span>
                <span>·</span>
                <span className="text-emerald-400 font-bold">{selectedPayload.decision}</span>
              </div>
              <h3 className="font-bold text-base text-white">Parsed Evidence Payload Snapshot</h3>
            </div>

            <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-96">
              {JSON.stringify(selectedPayload.payload, null, 2)}
            </pre>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedPayload(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-md transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
