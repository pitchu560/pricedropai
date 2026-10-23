import json
import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Approval, Alert, Product, VerificationLog
from schemas import ApprovalOut, ApprovalDecisionRequest
from engine.cart_simulator import cart_simulator

router = APIRouter(prefix="/approvals", tags=["Approvals"])

@router.get("", response_model=List[ApprovalOut])
def list_approvals(
    status_filter: Optional[str] = Query(None, description="PENDING, APPROVED, REJECTED"),
    db: Session = Depends(get_db)
):
    """
    List pending and historic approval requests.
    """
    query = db.query(Approval)
    if status_filter:
        query = query.filter(Approval.status == status_filter.upper())
    approvals = query.order_by(Approval.created_at.desc()).all()

    result = []
    for app in approvals:
        prod = db.query(Product).filter(Product.product_id == app.product_id).first()
        alert = db.query(Alert).filter(Alert.id == app.alert_id).first() if app.alert_id else None

        alert_dict = None
        if alert:
            alert_dict = {
                "id": alert.id,
                "previous_price": alert.previous_price,
                "new_price": alert.new_price,
                "target_price": alert.target_price,
                "drop_amount": alert.drop_amount,
                "drop_percentage": alert.drop_percentage,
                "reason": alert.reason
            }

        result.append(ApprovalOut(
            id=app.id,
            alert_id=app.alert_id,
            product_id=app.product_id,
            product_name=prod.name if prod else app.product_id,
            proposed_action=app.proposed_action,
            status=app.status,
            decision_reason=app.decision_reason,
            decided_at=app.decided_at,
            execution_result=app.execution_result,
            created_at=app.created_at,
            alert_details=alert_dict
        ))

    return result

@router.post("/{approval_id}/approve", response_model=ApprovalOut)
def approve_action(
    approval_id: int,
    payload: ApprovalDecisionRequest = ApprovalDecisionRequest(),
    db: Session = Depends(get_db)
):
    """
    Approve the simulated cart action. Executes simulated reservation and records full audit log.
    """
    approval = db.query(Approval).filter(Approval.id == approval_id).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval request not found")

    if approval.status != "PENDING":
        raise HTTPException(
            status_code=400,
            detail=f"Approval request #{approval_id} is already in state '{approval.status}'."
        )

    product = db.query(Product).filter(Product.product_id == approval.product_id).first()
    alert = db.query(Alert).filter(Alert.id == approval.alert_id).first() if approval.alert_id else None

    if not product or not alert:
        raise HTTPException(status_code=400, detail="Cannot execute cart simulation: product or alert missing.")

    # Execute approval-gated simulated cart reservation
    cart_outcome = cart_simulator.execute_simulated_add_to_cart(product, alert, approval)

    approval.status = "APPROVED"
    approval.decision_reason = payload.decision_reason or "Approved by operator"
    approval.decided_at = datetime.datetime.utcnow()
    approval.execution_result = json.dumps(cart_outcome)

    # Log to verification audit trail
    vlog = VerificationLog(
        product_id=product.product_id,
        run_id=f"APPR-{approval.id}",
        check_type="APPROVAL_SIMULATED_CART",
        decision="ACTION_EXECUTED",
        confidence_score=1.0,
        evidence_payload=json.dumps(cart_outcome),
        reason=f"Operator approved simulated cart reservation. Token {cart_outcome['cart_reservation_token']}.",
        timestamp=datetime.datetime.utcnow()
    )
    db.add(vlog)

    db.commit()
    db.refresh(approval)

    return ApprovalOut(
        id=approval.id,
        alert_id=approval.alert_id,
        product_id=approval.product_id,
        product_name=product.name,
        proposed_action=approval.proposed_action,
        status=approval.status,
        decision_reason=approval.decision_reason,
        decided_at=approval.decided_at,
        execution_result=approval.execution_result,
        created_at=approval.created_at,
        alert_details={
            "id": alert.id,
            "previous_price": alert.previous_price,
            "new_price": alert.new_price,
            "target_price": alert.target_price,
            "drop_amount": alert.drop_amount,
            "drop_percentage": alert.drop_percentage,
            "reason": alert.reason
        }
    )

@router.post("/{approval_id}/reject", response_model=ApprovalOut)
def reject_action(
    approval_id: int,
    payload: ApprovalDecisionRequest = ApprovalDecisionRequest(decision_reason="Rejected by user"),
    db: Session = Depends(get_db)
):
    """
    Reject the proposed simulated cart action.
    """
    approval = db.query(Approval).filter(Approval.id == approval_id).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval request not found")

    if approval.status != "PENDING":
        raise HTTPException(
            status_code=400,
            detail=f"Approval request #{approval_id} is already in state '{approval.status}'."
        )

    product = db.query(Product).filter(Product.product_id == approval.product_id).first()
    alert = db.query(Alert).filter(Alert.id == approval.alert_id).first() if approval.alert_id else None

    approval.status = "REJECTED"
    approval.decision_reason = payload.decision_reason or "Rejected by user"
    approval.decided_at = datetime.datetime.utcnow()
    approval.execution_result = json.dumps({"rejected": True, "reason": approval.decision_reason})

    vlog = VerificationLog(
        product_id=approval.product_id,
        run_id=f"REJ-{approval.id}",
        check_type="APPROVAL_REJECTED",
        decision="ACTION_REJECTED",
        confidence_score=1.0,
        evidence_payload=approval.execution_result,
        reason=f"Operator explicitly declined simulated cart addition: {approval.decision_reason}",
        timestamp=datetime.datetime.utcnow()
    )
    db.add(vlog)

    db.commit()
    db.refresh(approval)

    return ApprovalOut(
        id=approval.id,
        alert_id=approval.alert_id,
        product_id=approval.product_id,
        product_name=product.name if product else approval.product_id,
        proposed_action=approval.proposed_action,
        status=approval.status,
        decision_reason=approval.decision_reason,
        decided_at=approval.decided_at,
        execution_result=approval.execution_result,
        created_at=approval.created_at,
        alert_details={
            "id": alert.id,
            "new_price": alert.new_price,
            "target_price": alert.target_price,
            "drop_amount": alert.drop_amount
        } if alert else None
    )
