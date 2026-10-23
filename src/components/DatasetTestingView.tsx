import React, { useState } from 'react';
import {
  Database,
  RefreshCw,
  RotateCcw,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Clock,
  Sparkles
} from 'lucide-react';
import { DatasetStatus, TestCase, TestResult } from '../types';

interface DatasetTestingViewProps {
  status: DatasetStatus | null;
  testCases: TestCase[];
  onReimport: () => Promise<void>;
  onReset: () => Promise<void>;
  onRunTest: (testId: string) => Promise<TestResult>;
}

export const DatasetTestingView: React.FC<DatasetTestingViewProps> = ({
  status,
  testCases,
  onReimport,
  onReset,
  onRunTest,
}) => {
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [runningTestId, setRunningTestId] = useState<string | null>(null);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleRunSingle = async (testId: string) => {
    try {
      setRunningTestId(testId);
      const res = await onRunTest(testId);
      setTestResults((prev) => ({ ...prev, [testId]: res }));
    } finally {
      setRunningTestId(null);
    }
  };

  const handleRunAll = async () => {
    try {
      setIsRunningAll(true);
      for (const tc of testCases) {
        setRunningTestId(tc.test_id);
        const res = await onRunTest(tc.test_id);
        setTestResults((prev) => ({ ...prev, [tc.test_id]: res }));
      }
    } finally {
      setRunningTestId(null);
      setIsRunningAll(false);
    }
  };

  const handleReimport = async () => {
    try {
      setIsImporting(true);
      await onReimport();
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsResetting(true);
      await onReset();
      setTestResults({});
    } finally {
      setIsResetting(false);
    }
  };

  const passedCount = Object.values(testResults).filter((r) => r.is_test_passed).length;
  const totalRun = Object.values(testResults).length;

  return (
    <div className="space-y-4">
      {/* Synthetic Demo Data Notice */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-start gap-3 text-xs">
        <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="font-semibold text-slate-200">
            Synthetic Benchmark Dataset & Test Harness
          </h3>
          <p className="text-slate-400 leading-relaxed">
            All registered products, URLs (<code>https://demo-store.internal/...</code>), and merchants in this environment are <strong>synthetic demo data</strong> designed to rigorously validate edge cases (seller mismatches, variant drift, zero prices, stale caches, and extreme drops).
          </p>
        </div>
      </div>

      {/* Dataset Importer Status Card */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Database className="w-4 h-4 text-emerald-400" />
            <span>SQLite Storage: <strong>price_watcher.db</strong></span>
            <span>·</span>
            <span className="text-emerald-400 font-semibold">Idempotent Upsert Enabled</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-300 pt-1">
            <span>{status?.products_count ?? 0} Products</span>
            <span>·</span>
            <span>{status?.observations_count ?? 0} Price Observations</span>
            <span>·</span>
            <span className="text-slate-500 font-mono">
              Last import: {status?.last_imported_at ? new Date(status.last_imported_at).toLocaleString() : 'System Boot'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReimport}
            disabled={isImporting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors border border-slate-700/60 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isImporting ? 'animate-spin' : ''}`} />
            <span>{isImporting ? 'Importing...' : 'Re-import CSVs'}</span>
          </button>

          <button
            onClick={handleReset}
            disabled={isResetting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium rounded-lg transition-colors border border-rose-500/30 disabled:opacity-50"
            title="Wipe database and reload baseline synthetic records"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>{isResetting ? 'Resetting...' : 'Reset Database'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Edge-Case Test Suite */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">Decision Engine Verification Suite</h3>
              {totalRun > 0 && (
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {passedCount}/{totalRun} Passed
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live scenario probes executed against the real FastAPI decision engine.
            </p>
          </div>

          <button
            onClick={handleRunAll}
            disabled={isRunningAll}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isRunningAll ? 'animate-spin' : ''}`} />
            <span>{isRunningAll ? 'Running All...' : 'Run All Test Probes'}</span>
          </button>
        </div>

        <div className="divide-y divide-slate-800/80">
          {testCases.map((tc) => {
            const result = testResults[tc.test_id];
            const isRunning = runningTestId === tc.test_id;

            return (
              <div
                key={tc.test_id}
                className="p-4 hover:bg-slate-850 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-white">{tc.test_id}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-indigo-400">{tc.product_id}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-400">Expect: <strong className="text-amber-300">{tc.expected_decision}</strong></span>
                  </div>

                  <div className="font-semibold text-slate-200">
                    {tc.scenario_name}
                  </div>

                  <p className="text-slate-400 text-xs leading-relaxed">
                    {tc.description}
                  </p>

                  {/* Test probe details */}
                  <div className="flex flex-wrap items-center gap-2 text-slate-500 font-mono text-[11px] pt-1">
                    <span>Probe Price: ${tc.test_price || 'null'}</span>
                    <span>·</span>
                    <span>Variant: "{tc.test_variant || 'None'}"</span>
                    <span>·</span>
                    <span>Seller: "{tc.test_seller || 'None'}"</span>
                  </div>

                  {/* Execution result feedback if run */}
                  {result && (
                    <div className={`mt-2 p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                      result.is_test_passed
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}>
                      {result.is_test_passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-0.5">
                        <div className="font-semibold font-mono">
                          {result.is_test_passed ? 'TEST PASSED' : 'TEST FAILED'}: Output = {result.actual_decision}
                        </div>
                        <div className="text-[11px] text-slate-300">
                          {result.decision_reason}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Run button */}
                <div className="shrink-0">
                  <button
                    onClick={() => handleRunSingle(tc.test_id)}
                    disabled={isRunning}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
                    <span>{isRunning ? 'Probing...' : 'Run Probe'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
