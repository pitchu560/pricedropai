import datetime
from typing import Optional, Tuple
from schemas import EvidencePayload, DecisionResult
from config import settings
from models import Product

class DecisionEngine:
    """
    Anti-Hallucination Price Drop Decision Engine.
    Evaluates evidence against strict business integrity rules:
    - Validity & data completeness
    - Evidence freshness (staleness barrier)
    - Variant fidelity (prevents refurbished or different specs from triggering false drops)
    - Merchant/Seller integrity (filters unauthorized 3rd parties)
    - Extreme anomaly heuristic (marks suspicious flash anomalies as UNCERTAIN)
    - Target threshold delta verification
    """

    def __init__(
        self,
        max_age_seconds: int = settings.EVIDENCE_MAX_AGE_SECONDS,
        max_drop_pct_cap: float = settings.MAX_PRICE_DROP_PERCENTAGE_CAP
    ):
        self.max_age_seconds = max_age_seconds
        self.max_drop_pct_cap = max_drop_pct_cap

    def _normalize(self, text: Optional[str]) -> str:
        if not text:
            return ""
        return " ".join(text.lower().strip().replace("/", " ").replace("-", " ").split())

    def _check_variant_match(self, expected_variant: Optional[str], observed_variant: Optional[str]) -> Tuple[bool, str]:
        if not expected_variant or not expected_variant.strip():
            # If product doesn't specify a variant, any reasonable observed variant is acceptable
            return True, "No specific variant constraint registered."

        if not observed_variant or not observed_variant.strip():
            return False, f"Missing observed variant (expected: '{expected_variant}')."

        exp_norm = self._normalize(expected_variant)
        obs_norm = self._normalize(observed_variant)

        # Flag obvious downgrades/refurbished when not requested
        downgrade_words = {"refurbished", "used", "grade b", "open box", "parts only"}
        has_downgrade_in_obs = any(w in obs_norm for w in downgrade_words)
        has_downgrade_in_exp = any(w in exp_norm for w in downgrade_words)
        if has_downgrade_in_obs and not has_downgrade_in_exp:
            return False, f"Observed variant indicates downgraded condition ('{observed_variant}') while target requires '{expected_variant}'."

        # Token set overlap
        exp_tokens = set(exp_norm.split())
        obs_tokens = set(obs_norm.split())

        # Check if key spec tokens exist
        missing_tokens = exp_tokens - obs_tokens
        # Allow tiny connector tokens to differ
        ignorable = {"and", "with", "the", "in", "for"}
        crucial_missing = [t for t in missing_tokens if t not in ignorable]

        if crucial_missing:
            return False, f"Variant mismatch: missing expected attributes {crucial_missing}. (Observed: '{observed_variant}' vs Expected: '{expected_variant}')"

        return True, "Variant matched expected specifications."

    def _check_seller_match(self, expected_seller: Optional[str], observed_seller: Optional[str]) -> Tuple[bool, str]:
        if not expected_seller or not expected_seller.strip():
            return True, "No specific seller constraint registered."

        if not observed_seller or not observed_seller.strip():
            return False, f"Missing observed seller name (expected: '{expected_seller}')."

        exp_norm = self._normalize(expected_seller)
        obs_norm = self._normalize(observed_seller)

        if exp_norm in obs_norm or obs_norm in exp_norm:
            return True, "Seller verified as authorized."

        # If both contain common brand root
        exp_words = set(exp_norm.split())
        obs_words = set(obs_norm.split())
        common = exp_words.intersection(obs_words) - {"store", "official", "direct", "shop", "authorized", "partner"}
        if common:
            return True, f"Seller matched primary identity: {common}"

        return False, f"Seller mismatch: observed '{observed_seller}' does not match authorized seller '{expected_seller}'."

    def evaluate(
        self,
        product: Product,
        evidence: EvidencePayload,
        previous_price: Optional[float] = None
    ) -> DecisionResult:
        """
        Runs the full verification rules pipeline on collected price evidence.
        """
        now = datetime.datetime.utcnow()
        obs_price = evidence.observed_price
        target_price = product.target_price

        # 1. Missing Data Check
        if obs_price is None:
            return DecisionResult(
                product_id=product.product_id,
                decision="MISSING_DATA",
                is_confirmed_drop=False,
                confidence_score=0.0,
                reason="Observed price payload was null or omitted.",
                previous_price=previous_price,
                observed_price=None,
                target_price=target_price,
                evidence=evidence.model_dump()
            )

        # 2. Invalid Price Check
        if obs_price <= 0.0:
            return DecisionResult(
                product_id=product.product_id,
                decision="INVALID_PRICE",
                is_confirmed_drop=False,
                confidence_score=0.0,
                reason=f"Observed price ${obs_price:.2f} is non-positive, representing an invalid price error.",
                previous_price=previous_price,
                observed_price=obs_price,
                target_price=target_price,
                evidence=evidence.model_dump()
            )

        # 3. Freshness / Stale Evidence Check
        age_seconds = (now - evidence.evidence_timestamp).total_seconds()
        if age_seconds > self.max_age_seconds:
            return DecisionResult(
                product_id=product.product_id,
                decision="STALE_EVIDENCE",
                is_confirmed_drop=False,
                confidence_score=0.3,
                reason=f"Evidence timestamp is stale ({int(age_seconds)}s old, threshold is {self.max_age_seconds}s).",
                previous_price=previous_price,
                observed_price=obs_price,
                target_price=target_price,
                evidence=evidence.model_dump()
            )

        # 4. Variant Verification
        variant_matched, variant_reason = self._check_variant_match(product.variant, evidence.variant_observed)
        if not variant_matched:
            return DecisionResult(
                product_id=product.product_id,
                decision="WRONG_VARIANT",
                is_confirmed_drop=False,
                confidence_score=0.4,
                reason=variant_reason,
                previous_price=previous_price,
                observed_price=obs_price,
                target_price=target_price,
                evidence=evidence.model_dump()
            )

        # 5. Seller Verification
        seller_matched, seller_reason = self._check_seller_match(product.seller, evidence.seller_observed)
        if not seller_matched:
            return DecisionResult(
                product_id=product.product_id,
                decision="SELLER_MISMATCH",
                is_confirmed_drop=False,
                confidence_score=0.4,
                reason=seller_reason,
                previous_price=previous_price,
                observed_price=obs_price,
                target_price=target_price,
                evidence=evidence.model_dump()
            )

        # Baseline previous price if none provided
        baseline_price = previous_price if previous_price and previous_price > 0 else target_price

        # 6. Unchanged / Above Target Check
        if obs_price >= target_price:
            return DecisionResult(
                product_id=product.product_id,
                decision="UNCHANGED",
                is_confirmed_drop=False,
                confidence_score=1.0,
                reason=f"Observed price ${obs_price:.2f} is at or above target threshold ${target_price:.2f}.",
                previous_price=baseline_price,
                observed_price=obs_price,
                target_price=target_price,
                drop_amount=0.0,
                drop_percentage=0.0,
                evidence=evidence.model_dump()
            )

        # 7. Price Drop Calculation
        drop_amount = round(baseline_price - obs_price, 2)
        drop_percentage = round((drop_amount / baseline_price) * 100.0, 2) if baseline_price > 0 else 0.0

        # 8. Anomaly Check for Suspicious / Flash Liquidation (UNCERTAIN)
        if drop_percentage > self.max_drop_pct_cap or evidence.confidence < 0.6:
            return DecisionResult(
                product_id=product.product_id,
                decision="UNCERTAIN",
                is_confirmed_drop=False,
                confidence_score=0.5,
                reason=f"Price dropped {drop_percentage:.1f}% (${obs_price:.2f} from ${baseline_price:.2f}), exceeding {self.max_drop_pct_cap}% credibility cap. Flagged as UNCERTAIN.",
                previous_price=baseline_price,
                observed_price=obs_price,
                target_price=target_price,
                drop_amount=drop_amount,
                drop_percentage=drop_percentage,
                evidence=evidence.model_dump()
            )

        # 9. Confirmed Drop!
        return DecisionResult(
            product_id=product.product_id,
            decision="CONFIRMED_DROP",
            is_confirmed_drop=True,
            confidence_score=0.98,
            reason=f"Confirmed genuine price drop: ${obs_price:.2f} (Target: ${target_price:.2f}, Saved: ${drop_amount:.2f} / -{drop_percentage:.1f}%).",
            previous_price=baseline_price,
            observed_price=obs_price,
            target_price=target_price,
            drop_amount=drop_amount,
            drop_percentage=drop_percentage,
            evidence=evidence.model_dump()
        )

decision_engine = DecisionEngine()
