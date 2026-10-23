import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any

# Product schemas
class ProductBase(BaseModel):
    product_id: str = Field(..., min_length=2, max_length=64, description="Stable unique product identifier")
    name: str = Field(..., min_length=2, max_length=255, description="Product title")
    url: str = Field(..., description="Product destination URL")
    variant: Optional[str] = Field(default="", description="Target variant (color, capacity, tier)")
    seller: Optional[str] = Field(default="", description="Authorized primary seller")
    target_price: float = Field(..., gt=0, description="Target price trigger")
    currency: str = Field(default="USD", max_length=10)
    is_active: bool = True

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    variant: Optional[str] = None
    seller: Optional[str] = None
    target_price: Optional[float] = Field(None, gt=0)
    currency: Optional[str] = None
    is_active: Optional[bool] = None

class PriceObservationOut(BaseModel):
    id: int
    product_id: str
    observed_price: float
    currency: str
    variant_observed: Optional[str] = None
    seller_observed: Optional[str] = None
    source_url: str
    timestamp: datetime.datetime
    is_valid: bool
    raw_metadata: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ProductOut(ProductBase):
    id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime
    latest_price: Optional[float] = None
    price_change: Optional[float] = None
    last_checked_at: Optional[datetime.datetime] = None
    observation_count: int = 0

    model_config = ConfigDict(from_attributes=True)

# Evidence & Observation Schemas
class EvidencePayload(BaseModel):
    product_id: str
    source_url: str
    observed_price: Optional[float] = None
    currency: str = "USD"
    variant_observed: Optional[str] = None
    seller_observed: Optional[str] = None
    evidence_timestamp: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)
    confidence: float = 1.0
    raw_data: Optional[Dict[str, Any]] = None

# Decision result
class DecisionResult(BaseModel):
    product_id: str
    decision: str  # CONFIRMED_DROP, UNCHANGED, WRONG_VARIANT, SELLER_MISMATCH, STALE_EVIDENCE, MISSING_DATA, INVALID_PRICE, UNCERTAIN
    is_confirmed_drop: bool
    confidence_score: float
    reason: str
    previous_price: Optional[float] = None
    observed_price: Optional[float] = None
    target_price: Optional[float] = None
    drop_amount: Optional[float] = None
    drop_percentage: Optional[float] = None
    evidence: Dict[str, Any]

# Alert Schemas
class AlertOut(BaseModel):
    id: int
    product_id: str
    previous_price: float
    new_price: float
    target_price: float
    drop_amount: float
    drop_percentage: float
    status: str
    alert_type: str
    reason: Optional[str] = None
    created_at: datetime.datetime
    product_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class AlertStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(CONFIRMED|MUTED|RESOLVED)$")

# Approval Schemas
class ApprovalOut(BaseModel):
    id: int
    alert_id: Optional[int]
    product_id: str
    product_name: Optional[str] = None
    proposed_action: str
    status: str
    decision_reason: Optional[str] = None
    decided_at: Optional[datetime.datetime] = None
    execution_result: Optional[str] = None
    created_at: datetime.datetime
    alert_details: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)

class ApprovalDecisionRequest(BaseModel):
    decision_reason: Optional[str] = "Approved by operator"

# Verification Log Schemas
class VerificationLogOut(BaseModel):
    id: int
    product_id: Optional[str]
    run_id: str
    check_type: str
    decision: str
    confidence_score: float
    evidence_payload: Optional[str]
    reason: str
    timestamp: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

# Monitoring Schemas
class MonitoringRunRequest(BaseModel):
    product_ids: Optional[List[str]] = None
    force_simulated_drop: Optional[bool] = False
    custom_price: Optional[float] = None

class MonitoringRunResponse(BaseModel):
    run_id: str
    timestamp: datetime.datetime
    scanned_count: int
    drops_detected: int
    alerts_created: int
    approvals_pending: int
    results: List[DecisionResult]

# Dataset Schemas
class DatasetStatus(BaseModel):
    products_count: int
    observations_count: int
    alerts_count: int
    approvals_count: int
    verification_logs_count: int
    last_imported_at: Optional[datetime.datetime] = None
    imports_history: List[Dict[str, Any]] = []

class SimulateScenarioRequest(BaseModel):
    test_id: str
