import React from 'react';
import {
  Activity,
  Play,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { MonitoringStatus, TestCase } from '../types';

interface NavbarProps {
  status: MonitoringStatus | null;
  testCases: TestCase[];
  onRunSweep: () => void;
  onSimulateScenario: (testId: string) => void;
  onReset: () => void;
  isScanning: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  status,
  testCases,
  onRunSweep,
  onSimulateScenario,
  onReset,
  isScanning
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base tracking-tight text-white">AI Price Drop Watcher</h1>
              <span className="text-xs text-slate-400 font-mono">v1.0.0</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                FastAPI + SQLite Active
              </span>
              <span>·</span>
              <span>Anti-Hallucination Verified</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Quick Scenario Runner */}
          <div className="hidden md:flex items-center gap-1.5">
            <label htmlFor="scenario-select" className="text-xs text-slate-400 font-medium">Scenario:</label>
            <select
              id="scenario-select"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  onSimulateScenario(e.target.value);
                  e.target.value = '';
                }
              }}
              className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="" disabled>Simulate Edge Case Probes...</option>
              {testCases.map((tc) => (
                <option key={tc.test_id} value={tc.test_id}>
                  {tc.test_id}: {tc.scenario_name} ({tc.expected_decision})
                </option>
              ))}
            </select>
          </div>

          {/* Monitoring Sweep Button */}
          <button
            onClick={onRunSweep}
            disabled={isScanning}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all shadow-sm ${
              isScanning
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-emerald-900/30'
            }`}
          >
            <Play className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Probing...' : 'Run Sweep'}</span>
          </button>

          {/* Reset Baseline button */}
          <button
            onClick={onReset}
            title="Reset to clean baseline dataset"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Swagger /docs link */}
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-md transition-colors"
          >
            <span className="font-mono">API /docs</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </div>
    </header>
  );
};
