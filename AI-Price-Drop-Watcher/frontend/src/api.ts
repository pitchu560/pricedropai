import {
  Product,
  PriceObservation,
  Alert,
  Approval,
  VerificationLog,
  DatasetStatus,
  TestCase,
  TestResult,
  MonitoringStatus,
  MonitoringRunResult
} from './types';

const API_BASE = import.meta.env.VITE_API_URL || '';

export async function fetchHealth(): Promise<{ status: string; service: string }> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Backend health check failed');
  return res.json();
}

export async function fetchProducts(activeOnly = false): Promise<Product[]> {
  const res = await fetch(`${API_BASE}/products${activeOnly ? '?active_only=true' : ''}`);
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export async function createProduct(payload: {
  product_id: string;
  name: string;
  url: string;
  variant?: string;
  seller?: string;
  target_price: number;
  currency?: string;
}): Promise<Product> {
  const res = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create product');
  }
  return res.json();
}

export async function deleteProduct(productId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/products/${productId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete product');
}

export async function fetchProductHistory(productId: string): Promise<PriceObservation[]> {
  const res = await fetch(`${API_BASE}/products/${productId}/history`);
  if (!res.ok) throw new Error('Failed to fetch price history');
  return res.json();
}

export async function fetchAlerts(statusFilter?: string): Promise<Alert[]> {
  const url = statusFilter ? `${API_BASE}/alerts?status_filter=${statusFilter}` : `${API_BASE}/alerts`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function muteAlert(alertId: number): Promise<Alert> {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/mute`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to mute alert');
  return res.json();
}

export async function resolveAlert(alertId: number): Promise<Alert> {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/resolve`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to resolve alert');
  return res.json();
}

export async function fetchApprovals(statusFilter?: string): Promise<Approval[]> {
  const url = statusFilter ? `${API_BASE}/approvals?status_filter=${statusFilter}` : `${API_BASE}/approvals`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch approvals');
  return res.json();
}

export async function approveAction(approvalId: number, reason?: string): Promise<Approval> {
  const res = await fetch(`${API_BASE}/approvals/${approvalId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision_reason: reason || 'Approved by operator' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to approve action');
  }
  return res.json();
}

export async function rejectAction(approvalId: number, reason?: string): Promise<Approval> {
  const res = await fetch(`${API_BASE}/approvals/${approvalId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision_reason: reason || 'Rejected by user' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to reject action');
  }
  return res.json();
}

export async function fetchVerificationLogs(decision?: string): Promise<VerificationLog[]> {
  const url = decision ? `${API_BASE}/verification-logs?decision=${decision}` : `${API_BASE}/verification-logs`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch verification logs');
  return res.json();
}

export async function fetchDatasetStatus(): Promise<DatasetStatus> {
  const res = await fetch(`${API_BASE}/dataset/status`);
  if (!res.ok) throw new Error('Failed to fetch dataset status');
  return res.json();
}

export async function reimportDataset(): Promise<any> {
  const res = await fetch(`${API_BASE}/dataset/import`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to import dataset');
  return res.json();
}

export async function resetDatabase(): Promise<any> {
  const res = await fetch(`${API_BASE}/dataset/reset`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset database');
  return res.json();
}

export async function fetchTestCases(): Promise<TestCase[]> {
  const res = await fetch(`${API_BASE}/dataset/test-cases`);
  if (!res.ok) throw new Error('Failed to fetch test cases');
  return res.json();
}

export async function fetchMonitoringStatus(): Promise<MonitoringStatus> {
  const res = await fetch(`${API_BASE}/monitoring/status`);
  if (!res.ok) throw new Error('Failed to fetch monitoring status');
  return res.json();
}

export async function runMonitoringSweep(forceSimulatedDrop = false): Promise<MonitoringRunResult> {
  const res = await fetch(`${API_BASE}/monitoring/run-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ force_simulated_drop: forceSimulatedDrop }),
  });
  if (!res.ok) throw new Error('Failed to run monitoring sweep');
  return res.json();
}

export async function runSingleCheck(productId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/monitoring/run-check/${productId}`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to run price check');
  return res.json();
}

export async function simulateScenario(testId: string): Promise<TestResult> {
  const res = await fetch(`${API_BASE}/monitoring/simulate-scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test_id: testId }),
  });
  if (!res.ok) throw new Error(`Failed to simulate scenario ${testId}`);
  return res.json();
}
