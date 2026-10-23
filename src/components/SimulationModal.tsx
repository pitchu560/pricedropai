import React from 'react';
import { X, CheckCircle2, XCircle, ShieldCheck, ArrowRight, Bell } from 'lucide-react';
import { TestResult } from '../types';

interface SimulationModalProps {
  result: TestResult | null;
  onClose: () => void;
  onGoToApprovals: () => void;
}

export const SimulationModal: React.FC<SimulationModalProps> = ({
  result,
  onClose,
  onGoToApprovals,
}) => {
  if (!result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 text-slate-100 shadow-2xl relative space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
          <span>{result.test_id}</span>
          <span>·</span>
          <span>Probe Verification</span>
        </div>

        <h3 className="font-bold text-base text-white">
          {result.scenario_name}
        </h3>

        {/* Pass/Fail banner */}
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
            result.is_test_passed
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {result.is_test_passed ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <div className="font-bold font-mono text-sm">
              {result.is_test_passed ? 'Decision Engine Verified' : 'Engine Mismatch'}
            </div>
            <p className="text-slate-200 leading-relaxed">
              {result.decision_reason}
            </p>
          </div>
        </div>

        {/* Comparison grid */}
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Expected Decision:</span>
            <span className="font-mono font-semibold text-amber-300">{result.expected_decision}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Actual Engine Output:</span>
            <span className="font-mono font-semibold text-emerald-400">{result.actual_decision}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Confidence Score:</span>
            <span className="font-mono text-white">{(result.confidence_score * 100).toFixed(0)}%</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Alert Triggered:</span>
            <span className="font-mono text-white">{result.alert_triggered ? 'YES' : 'NO (Suppressed)'}</span>
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center justify-between pt-2">
          {result.alert_triggered ? (
            <button
              onClick={() => {
                onClose();
                onGoToApprovals();
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Review Pending Approval</span>
            </button>
          ) : (
            <div className="text-[11px] text-slate-500 font-mono">
              Heuristic safely prevented false positive
            </div>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
