import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  ShieldAlert,
  Clock,
  Ticket,
  ExternalLink,
  X,
  FileCheck2
} from 'lucide-react';
import { Approval } from '../types';

interface ApprovalsViewProps {
  approvals: Approval[];
  onApprove: (approvalId: number, reason?: string) => Promise<void>;
  onReject: (approvalId: number, reason?: string) => Promise<void>;
}

export const ApprovalsView: React.FC<ApprovalsViewProps> = ({
  approvals,
  onApprove,
  onReject,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [activeVoucher, setActiveVoucher] = useState<any | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('Price target reached but waiting for deeper discounts');
  const [processingId, setProcessingId] = useState<number | null>(null);

  const filtered = approvals.filter((a) => {
    if (filter === 'ALL') return true;
    return a.status === filter;
  });

  const handleApproveClick = async (id: number) => {
    try {
      setProcessingId(id);
      await onApprove(id, 'User confirmed simulated cart reservation');
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingId) return;
    try {
      setProcessingId(rejectingId);
      await onReject(rejectingId, rejectReason);
      setRejectingId(null);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Banner explaining approval gating */}
      <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-start gap-3 text-xs text-amber-200">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-300">
            Approval-Gated Safety Architecture
          </p>
          <p className="text-amber-200/80 leading-relaxed">
            Autonomous cart actions are <strong>never executed automatically</strong>. Every confirmed price drop enters this queue requiring explicit user consent. In addition, all executed operations remain strictly simulated (generating synthetic session reservation tokens with zero real-world financial liability).
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight">Cart Action Approval Queue</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {approvals.filter((a) => a.status === 'PENDING').length} actions waiting for operator authorization.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs font-medium">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md transition-colors ${
                filter === f
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f === 'ALL' ? 'All Records' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Approvals list */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400 text-xs">
          No approval requests in '{filter}' state.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isPending = item.status === 'PENDING';
            const isApproved = item.status === 'APPROVED';
            const isRejected = item.status === 'REJECTED';
            const executionData = item.execution_result ? JSON.parse(item.execution_result) : null;

            return (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-slate-400">APPR #{item.id}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-indigo-400">{item.product_id}</span>
                    <span className="text-slate-600">·</span>
                    <span
                      className={`font-semibold ${
                        isPending
                          ? 'text-amber-400'
                          : isApproved
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <h3 className="font-semibold text-sm text-white">
                    {item.product_name || item.product_id}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="text-slate-300">
                      Action: <strong className="text-white font-mono">{item.proposed_action}</strong>
                    </span>
                    {item.alert_details && (
                      <>
                        <span>·</span>
                        <span className="text-emerald-400 font-mono font-bold">
                          ${item.alert_details.new_price.toFixed(2)}
                        </span>
                        <span>·</span>
                        <span className="text-slate-300 font-mono">
                          Drop: -${item.alert_details.drop_amount.toFixed(2)}
                        </span>
                      </>
                    )}
                    <span>·</span>
                    <span className="text-slate-500 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>

                  {item.decision_reason && (
                    <p className="text-xs text-slate-400 bg-slate-950 p-2 rounded border border-slate-800/80">
                      Reason: {item.decision_reason}
                    </p>
                  )}
                </div>

                {/* Right side controls */}
                <div className="flex items-center gap-2 shrink-0">
                  {isPending && (
                    <>
                      <button
                        onClick={() => handleApproveClick(item.id)}
                        disabled={processingId === item.id}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>{processingId === item.id ? 'Reserving...' : 'Approve Simulated Cart'}</span>
                      </button>

                      <button
                        onClick={() => setRejectingId(item.id)}
                        disabled={processingId === item.id}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </>
                  )}

                  {isApproved && executionData && (
                    <button
                      onClick={() => setActiveVoucher(executionData)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 border border-emerald-500/20"
                    >
                      <Ticket className="w-3.5 h-3.5 text-emerald-400" />
                      <span>View Cart Voucher</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal dialog */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 text-slate-100 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-white">Decline Simulated Cart Action</h3>
            <p className="text-xs text-slate-400">
              Provide an audit reason for rejecting this price drop opportunity:
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-md p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectingId(null)}
                className="px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-md transition-colors"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voucher detail modal */}
      {activeVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 text-slate-100 shadow-2xl relative space-y-4">
            <button
              onClick={() => setActiveVoucher(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-emerald-400">
              <FileCheck2 className="w-5 h-5" />
              <h3 className="font-bold text-base text-white">Simulated Cart Reservation Voucher</h3>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Product:</span>
                <span className="font-semibold text-white">{activeVoucher.product_name}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">Reservation Token:</span>
                <span className="text-emerald-400 font-bold">{activeVoucher.cart_reservation_token}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">Session ID:</span>
                <span className="text-indigo-400">{activeVoucher.simulated_session_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Unit Price:</span>
                <span className="font-mono text-white">${activeVoucher.unit_price_usd}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Estimated Tax (8.25%):</span>
                <span className="font-mono text-slate-300">${activeVoucher.simulated_tax}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between font-bold">
                <span className="text-white">Simulated Total:</span>
                <span className="font-mono text-emerald-400 text-sm">${activeVoucher.simulated_grand_total} USD</span>
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-md border border-slate-800/80 text-xs text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-slate-300">
                <span>Provenance Disclaimer:</span>
              </div>
              <p className="font-mono text-[11px] text-slate-400">
                {activeVoucher.disclaimer}
              </p>
              <p className="text-[11px] text-slate-500 pt-1">
                Expires at: {activeVoucher.reservation_expiry}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveVoucher(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-md transition-colors"
              >
                Close Voucher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
