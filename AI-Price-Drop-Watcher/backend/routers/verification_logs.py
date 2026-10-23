from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from typing import List, Optional
import csv
import io
from database import get_db
from models import VerificationLog
from schemas import VerificationLogOut

router = APIRouter(prefix="/verification-logs", tags=["Verification Logs"])

@router.get("", response_model=List[VerificationLogOut])
def list_logs(
    decision: Optional[str] = Query(None, description="Filter by decision enum"),
    product_id: Optional[str] = Query(None, description="Filter by product_id"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    List verification logs with audit trail evidence and decision reasons.
    """
    query = db.query(VerificationLog)
    if decision:
        query = query.filter(VerificationLog.decision == decision.upper())
    if product_id:
        query = query.filter(VerificationLog.product_id == product_id)

    logs = query.order_by(VerificationLog.timestamp.desc()).offset(offset).limit(limit).all()
    return logs

@router.get("/export/csv")
def export_logs_csv(db: Session = Depends(get_db)):
    """
    Export all verification audit logs as CSV.
    """
    logs = db.query(VerificationLog).order_by(VerificationLog.timestamp.desc()).limit(1000).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "product_id", "run_id", "check_type", "decision", "confidence_score", "reason", "timestamp"])

    for log in logs:
        writer.writerow([
            log.id,
            log.product_id or "",
            log.run_id,
            log.check_type,
            log.decision,
            log.confidence_score,
            log.reason,
            log.timestamp.isoformat() if log.timestamp else ""
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=verification_logs.csv"}
    )
