import uuid
import datetime
import json
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from models import Product, PriceObservation, Alert, Approval, VerificationLog
from schemas import EvidencePayload, DecisionResult, MonitoringRunResponse
from adapters.modular_scraper import modular_scraper
from engine.decision_engine import decision_engine
from config import settings

class MonitoringService:
    """
    Monitoring Service orchestrating probe collection, anti-hallucination decision evaluation,
    verification audit trails, duplicate alert prevention, and approval gating.
    """

    def __init__(self):
        self.cooldown_minutes = settings.ALERT_COOLDOWN_MINUTES

    def _is_duplicate_alert(self, db: Session, product_id: str, new_price: float) -> Tuple[bool, Optional[str]]:
        """
        Deduplication rule:
        Checks if an alert for this product was already triggered with the same price,
        or if an active CONFIRMED alert was created within the alert cooldown window.
        """
        now = datetime.datetime.utcnow()
        cooldown_window = now - datetime.timedelta(minutes=self.cooldown_minutes)

        # 1. Exact price duplicate
        exact_match = (
            db.query(Alert)
            .filter(
                Alert.product_id == product_id,
                Alert.new_price == new_price,
                Alert.status.in_(["CONFIRMED", "MUTED"])
            )
            .first()
        )
        if exact_match:
            return True, f"Duplicate suppressed: active alert #{exact_match.id} already exists for ${new_price:.2f}."

        # 2. Cooldown window duplicate
        recent_alert = (
            db.query(Alert)
            .filter(
                Alert.product_id == product_id,
                Alert.created_at >= cooldown_window,
                Alert.status == "CONFIRMED"
            )
            .first()
        )
        if recent_alert:
            return True, f"Cooldown active: alert #{recent_alert.id} was created {int((now - recent_alert.created_at).total_seconds()/60)}m ago (window: {self.cooldown_minutes}m)."

        return False, None

    def run_check_for_product(
        self,
        db: Session,
        product: Product,
        run_id: str,
        custom_price: Optional[float] = None,
        custom_variant: Optional[str] = None,
        custom_seller: Optional[str] = None,
        custom_timestamp: Optional[datetime.datetime] = None,
        simulated_anomaly: Optional[str] = None
    ) -> DecisionResult:
        """
        Gathers evidence and runs decision verification for a single product.
        """
        # 1. Fetch previous known valid price
        prev_obs = (
            db.query(PriceObservation)
            .filter(PriceObservation.product_id == product.product_id, PriceObservation.is_valid == True)
            .order_by(PriceObservation.timestamp.desc())
            .first()
        )
        previous_price = prev_obs.observed_price if prev_obs else product.target_price

        # 2. Collect evidence via modular scraper / adapter
        evidence = modular_scraper.scrape(
            product_id=product.product_id,
            target_url=product.url,
            override_price=custom_price,
            override_variant=custom_variant,
            override_seller=custom_seller,
            override_timestamp=custom_timestamp,
            simulated_anomaly=simulated_anomaly
        )

        # 3. Evaluate evidence with DecisionEngine
        decision = decision_engine.evaluate(product, evidence, previous_price=previous_price)

        # 4. Save observation if price is valid
        is_valid_obs = decision.decision not in ["INVALID_PRICE", "MISSING_DATA"]
        if decision.observed_price is not None and is_valid_obs:
            obs = PriceObservation(
                product_id=product.product_id,
                observed_price=decision.observed_price,
                currency=product.currency,
                variant_observed=evidence.variant_observed,
                seller_observed=evidence.seller_observed,
                source_url=product.url,
                timestamp=evidence.evidence_timestamp,
                is_valid=is_valid_obs,
                raw_metadata=json.dumps(evidence.raw_data or {})
            )
            db.add(obs)

        # 5. Record Verification Log entry
        log_entry = VerificationLog(
            product_id=product.product_id,
            run_id=run_id,
            check_type="MOCK_STORE",
            decision=decision.decision,
            confidence_score=decision.confidence_score,
            evidence_payload=json.dumps(decision.evidence, default=str),
            reason=decision.reason,
            timestamp=datetime.datetime.utcnow()
        )
        db.add(log_entry)

        # 6. If confirmed drop -> process Alert and Approval with deduplication
        if decision.is_confirmed_drop and decision.observed_price is not None:
            is_dup, dup_reason = self._is_duplicate_alert(db, product.product_id, decision.observed_price)
            if not is_dup:
                alert = Alert(
                    product_id=product.product_id,
                    previous_price=decision.previous_price or product.target_price,
                    new_price=decision.observed_price,
                    target_price=product.target_price,
                    drop_amount=decision.drop_amount or (product.target_price - decision.observed_price),
                    drop_percentage=decision.drop_percentage or 0.0,
                    status="CONFIRMED",
                    alert_type="TARGET_DROP_CONFIRMED",
                    reason=decision.reason
                )
                db.add(alert)
                db.flush()  # obtain alert.id

                # Create pending approval for simulated cart action
                approval = Approval(
                    alert_id=alert.id,
                    product_id=product.product_id,
                    proposed_action="SIMULATED_ADD_TO_CART",
                    status="PENDING",
                    decision_reason="Awaiting user authorization before initiating simulated cart reservation.",
                    created_at=datetime.datetime.utcnow()
                )
                db.add(approval)
            else:
                decision.reason = f"{decision.reason} [{dup_reason}]"

        db.commit()
        return decision

    def run_all(
        self,
        db: Session,
        product_ids: Optional[List[str]] = None,
        force_simulated_drop: bool = False,
        custom_price: Optional[float] = None
    ) -> MonitoringRunResponse:
        """
        Executes a monitoring sweep across registered products.
        """
        run_id = f"RUN-{uuid.uuid4().hex[:8].upper()}"
        query = db.query(Product).filter(Product.is_active == True)
        if product_ids:
            query = query.filter(Product.product_id.in_(product_ids))
        products = query.all()

        results: List[DecisionResult] = []
        drops_detected = 0
        alerts_created_count = 0

        for prod in products:
            price_override = custom_price
            if force_simulated_drop and price_override is None:
                # Force drop 10% below target
                price_override = round(prod.target_price * 0.90, 2)

            decision = self.run_check_for_product(
                db=db,
                product=prod,
                run_id=run_id,
                custom_price=price_override
            )
            results.append(decision)
            if decision.is_confirmed_drop:
                drops_detected += 1

        # Count pending approvals
        pending_count = db.query(Approval).filter(Approval.status == "PENDING").count()
        alerts_count = db.query(Alert).filter(Alert.status == "CONFIRMED").count()

        return MonitoringRunResponse(
            run_id=run_id,
            timestamp=datetime.datetime.utcnow(),
            scanned_count=len(products),
            drops_detected=drops_detected,
            alerts_created=alerts_count,
            approvals_pending=pending_count,
            results=results
        )

monitoring_service = MonitoringService()
