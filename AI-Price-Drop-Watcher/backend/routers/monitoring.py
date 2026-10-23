import os
import csv
import datetime
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from database import get_db
from models import Product, Alert, Approval, VerificationLog
from schemas import (
    MonitoringRunRequest,
    MonitoringRunResponse,
    SimulateScenarioRequest,
    DecisionResult
)
from engine.monitoring_service import monitoring_service
from data.importer import dataset_importer

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])

@router.get("/status")
def get_monitoring_status(db: Session = Depends(get_db)):
    """
    Returns live monitoring agent status and quick counters.
    """
    total_active = db.query(Product).filter(Product.is_active == True).count()
    total_alerts = db.query(Alert).filter(Alert.status == "CONFIRMED").count()
    pending_approvals = db.query(Approval).filter(Approval.status == "PENDING").count()
    recent_log = db.query(VerificationLog).order_by(VerificationLog.timestamp.desc()).first()

    return {
        "status": "ONLINE",
        "agent_mode": "EVIDENCE_VERIFIED_AUTONOMOUS",
        "active_watches": total_active,
        "confirmed_drops_alerted": total_alerts,
        "pending_cart_approvals": pending_approvals,
        "last_verification_run": recent_log.timestamp.isoformat() if recent_log else None,
        "latest_decision": recent_log.decision if recent_log else None,
        "system_time": datetime.datetime.utcnow().isoformat() + "Z"
    }

@router.post("/run-all", response_model=MonitoringRunResponse)
def run_monitoring_sweep(
    payload: MonitoringRunRequest = MonitoringRunRequest(),
    db: Session = Depends(get_db)
):
    """
    Triggers an on-demand verification monitoring sweep across registered products.
    """
    return monitoring_service.run_all(
        db=db,
        product_ids=payload.product_ids,
        force_simulated_drop=bool(payload.force_simulated_drop),
        custom_price=payload.custom_price
    )

@router.post("/run-check/{product_id}", response_model=DecisionResult)
def run_single_product_check(
    product_id: str,
    db: Session = Depends(get_db)
):
    """
    Runs verification check on an individual product.
    """
    prod = db.query(Product).filter(Product.product_id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")

    run_id = f"SINGLE-{uuid.uuid4().hex[:8].upper()}"
    return monitoring_service.run_check_for_product(
        db=db,
        product=prod,
        run_id=run_id
    )

@router.post("/simulate-scenario")
def simulate_test_scenario(
    payload: SimulateScenarioRequest,
    db: Session = Depends(get_db)
):
    """
    Runs a designated edge-case test scenario from test_cases.csv
    to demonstrate decision engine verification in real-time.
    """
    test_cases_path = dataset_importer.test_cases_csv
    matched_case = None

    if os.path.exists(test_cases_path):
        with open(test_cases_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row["test_id"].strip() == payload.test_id.strip():
                    matched_case = row
                    break

    if not matched_case:
        raise HTTPException(status_code=404, detail=f"Test case '{payload.test_id}' not found in test_cases.csv")

    pid = matched_case["product_id"].strip()
    product = db.query(Product).filter(Product.product_id == pid).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"Product '{pid}' required for test case not found in database")

    # Parse simulation params
    test_price = float(matched_case["test_price"]) if matched_case["test_price"] != "" else None
    test_variant = matched_case.get("test_variant")
    test_seller = matched_case.get("test_seller")
    freshness_s = int(matched_case.get("test_freshness_seconds", 60))
    sim_timestamp = datetime.datetime.utcnow() - datetime.timedelta(seconds=freshness_s)

    run_id = f"SCENARIO-{matched_case['test_id']}-{uuid.uuid4().hex[:6].upper()}"

    decision = monitoring_service.run_check_for_product(
        db=db,
        product=product,
        run_id=run_id,
        custom_price=test_price,
        custom_variant=test_variant,
        custom_seller=test_seller,
        custom_timestamp=sim_timestamp
    )

    passed = (decision.decision == matched_case["expected_decision"])

    return {
        "test_id": matched_case["test_id"],
        "scenario_name": matched_case["scenario_name"],
        "expected_decision": matched_case["expected_decision"],
        "actual_decision": decision.decision,
        "is_test_passed": passed,
        "decision_reason": decision.reason,
        "confidence_score": decision.confidence_score,
        "evidence_analyzed": decision.evidence,
        "alert_triggered": decision.is_confirmed_drop
    }
