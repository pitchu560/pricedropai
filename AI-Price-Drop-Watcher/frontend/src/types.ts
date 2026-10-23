export interface Product {
  id: number;
  product_id: string;
  name: string;
  url: string;
  variant?: string;
  seller?: string;
  target_price: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  latest_price?: number;
  price_change?: number;
  last_checked_at?: string;
  observation_count: number;
}

export interface PriceObservation {
  id: number;
  product_id: string;
  observed_price: number;
  currency: string;
  variant_observed?: string;
  seller_observed?: string;
  source_url: string;
  timestamp: string;
  is_valid: boolean;
  raw_metadata?: string;
}

export interface Alert {
  id: number;
  product_id: string;
  previous_price: number;
  new_price: number;
  target_price: number;
  drop_amount: number;
  drop_percentage: number;
  status: 'CONFIRMED' | 'MUTED' | 'RESOLVED';
  alert_type: string;
  reason?: string;
  created_at: string;
  product_name?: string;
}

export interface Approval {
  id: number;
  alert_id?: number;
  product_id: string;
  product_name?: string;
  proposed_action: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  decision_reason?: string;
  decided_at?: string;
  execution_result?: string;
  created_at: string;
  alert_details?: {
    id: number;
    previous_price?: number;
    new_price: number;
    target_price: number;
    drop_amount: number;
    drop_percentage?: number;
    reason?: string;
  };
}

export interface VerificationLog {
  id: number;
  product_id?: string;
  run_id: string;
  check_type: string;
  decision:
    | 'CONFIRMED_DROP'
    | 'UNCHANGED'
    | 'WRONG_VARIANT'
    | 'SELLER_MISMATCH'
    | 'STALE_EVIDENCE'
    | 'MISSING_DATA'
    | 'INVALID_PRICE'
    | 'UNCERTAIN'
    | 'ACTION_EXECUTED'
    | 'ACTION_REJECTED';
  confidence_score: number;
  evidence_payload?: string;
  reason: string;
  timestamp: string;
}

export interface DatasetStatus {
  products_count: number;
  observations_count: number;
  alerts_count: number;
  approvals_count: number;
  verification_logs_count: number;
  last_imported_at?: string;
  imports_history: Array<{
    id: number;
    filename: string;
    rows_imported: number;
    status: string;
    error_message?: string;
    imported_at?: string;
  }>;
}

export interface TestCase {
  test_id: string;
  product_id: string;
  scenario_name: string;
  test_price: string;
  test_variant: string;
  test_seller: string;
  test_freshness_seconds: string;
  expected_decision: string;
  expected_alert: string;
  description: string;
}

export interface TestResult {
  test_id: string;
  scenario_name: string;
  expected_decision: string;
  actual_decision: string;
  is_test_passed: boolean;
  decision_reason: string;
  confidence_score: number;
  evidence_analyzed: any;
  alert_triggered: boolean;
}

export interface MonitoringStatus {
  status: string;
  agent_mode: string;
  active_watches: number;
  confirmed_drops_alerted: number;
  pending_cart_approvals: number;
  last_verification_run?: string;
  latest_decision?: string;
  system_time: string;
}

export interface MonitoringRunResult {
  run_id: string;
  timestamp: string;
  scanned_count: number;
  drops_detected: number;
  alerts_created: number;
  approvals_pending: number;
  results: Array<{
    product_id: string;
    decision: string;
    is_confirmed_drop: boolean;
    confidence_score: number;
    reason: string;
    previous_price?: number;
    observed_price?: number;
    target_price?: number;
    drop_amount?: number;
    drop_percentage?: number;
  }>;
}
