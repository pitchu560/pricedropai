from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Alert, Product
from schemas import AlertOut, AlertStatusUpdate

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("", response_model=List[AlertOut])
def list_alerts(
    status_filter: Optional[str] = Query(None, description="Filter by CONFIRMED, MUTED, RESOLVED"),
    db: Session = Depends(get_db)
):
    """
    List price drop alerts with product relationship details.
    """
    query = db.query(Alert)
    if status_filter:
        query = query.filter(Alert.status == status_filter.upper())
    alerts = query.order_by(Alert.created_at.desc()).all()

    result = []
    for a in alerts:
        prod = db.query(Product).filter(Product.product_id == a.product_id).first()
        result.append(AlertOut(
            id=a.id,
            product_id=a.product_id,
            previous_price=a.previous_price,
            new_price=a.new_price,
            target_price=a.target_price,
            drop_amount=a.drop_amount,
            drop_percentage=a.drop_percentage,
            status=a.status,
            alert_type=a.alert_type,
            reason=a.reason,
            created_at=a.created_at,
            product_name=prod.name if prod else a.product_id
        ))

    return result

@router.post("/{alert_id}/mute", response_model=AlertOut)
def mute_alert(
    alert_id: int,
    db: Session = Depends(get_db)
):
    """
    Mute an alert notification.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = "MUTED"
    db.commit()
    db.refresh(alert)

    prod = db.query(Product).filter(Product.product_id == alert.product_id).first()
    return AlertOut(
        id=alert.id,
        product_id=alert.product_id,
        previous_price=alert.previous_price,
        new_price=alert.new_price,
        target_price=alert.target_price,
        drop_amount=alert.drop_amount,
        drop_percentage=alert.drop_percentage,
        status=alert.status,
        alert_type=alert.alert_type,
        reason=alert.reason,
        created_at=alert.created_at,
        product_name=prod.name if prod else alert.product_id
    )

@router.post("/{alert_id}/resolve", response_model=AlertOut)
def resolve_alert(
    alert_id: int,
    db: Session = Depends(get_db)
):
    """
    Mark an alert as resolved.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = "RESOLVED"
    db.commit()
    db.refresh(alert)

    prod = db.query(Product).filter(Product.product_id == alert.product_id).first()
    return AlertOut(
        id=alert.id,
        product_id=alert.product_id,
        previous_price=alert.previous_price,
        new_price=alert.new_price,
        target_price=alert.target_price,
        drop_amount=alert.drop_amount,
        drop_percentage=alert.drop_percentage,
        status=alert.status,
        alert_type=alert.alert_type,
        reason=alert.reason,
        created_at=alert.created_at,
        product_name=prod.name if prod else alert.product_id
    )
