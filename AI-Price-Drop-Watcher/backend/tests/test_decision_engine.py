import datetime
import pytest
from engine.decision_engine import DecisionEngine
from models import Product
from schemas import EvidencePayload

@pytest.fixture
def test_product():
    return Product(
        id=1,
        product_id="TEST-HEADPHONES-01",
        name="Noise Cancelling Wireless Headphones",
        url="https://demo-store.internal/items/headphones",
        variant="Silver / Over-Ear",
        seller="Sony Direct Store",
        target_price=300.00,
        currency="USD",
        is_active=True
    )

@pytest.fixture
def engine():
    return DecisionEngine(max_age_seconds=86400, max_drop_pct_cap=85.0)

def test_confirmed_genuine_price_drop(engine, test_product):
    evidence = EvidencePayload(
        product_id=test_product.product_id,
        source_url=test_product.url,
        observed_price=249.99,
        currency="USD",
        variant_observed="Silver / Over-Ear",
        seller_observed="Sony Direct Store",
        evidence_timestamp=datetime.datetime.utcnow(),
        confidence=0.98
    )
    result = engine.evaluate(test_product, evidence, previous_price=350.00)
    assert result.decision == "CONFIRMED_DROP"
    assert result.is_confirmed_drop is True
    assert result.observed_price == 249.99
    assert result.drop_amount == pytest.approx(100.01, 0.01)

def test_unchanged_price_above_target(engine, test_product):
    evidence = EvidencePayload(
        product_id=test_product.product_id,
        source_url=test_product.url,
        observed_price=320.00,
        currency="USD",
        variant_observed="Silver / Over-Ear",
        seller_observed="Sony Direct Store",
        evidence_timestamp=datetime.datetime.utcnow()
    )
    result = engine.evaluate(test_product, evidence, previous_price=350.00)
    assert result.decision == "UNCHANGED"
    assert result.is_confirmed_drop is False

def test_wrong_variant_downgrade_rejected(engine, test_product):
    evidence = EvidencePayload(
        product_id=test_product.product_id,
        source_url=test_product.url,
        observed_price=199.99,  # Looks like a steal, but wrong variant
        currency="USD",
        variant_observed="Refurbished Black / On-Ear",
        seller_observed="Sony Direct Store",
        evidence_timestamp=datetime.datetime.utcnow()
    )
    result = engine.evaluate(test_product, evidence, previous_price=350.00)
    assert result.decision == "WRONG_VARIANT"
    assert result.is_confirmed_drop is False

def test_unauthorized_seller_mismatch(engine, test_product):
    evidence = EvidencePayload(
        product_id=test_product.product_id,
        source_url=test_product.url,
        observed_price=220.00,
        currency="USD",
        variant_observed="Silver / Over-Ear",
        seller_observed="ShadyDiscounts-Global-Outlet",
        evidence_timestamp=datetime.datetime.utcnow()
    )
    result = engine.evaluate(test_product, evidence, previous_price=350.00)
    assert result.decision == "SELLER_MISMATCH"
    assert result.is_confirmed_drop is False

def test_stale_evidence_rejection(engine, test_product):
    stale_time = datetime.datetime.utcnow() - datetime.timedelta(days=3)
    evidence = EvidencePayload(
        product_id=test_product.product_id,
        source_url=test_product.url,
        observed_price=240.00,
        currency="USD",
        variant_observed="Silver / Over-Ear",
        seller_observed="Sony Direct Store",
        evidence_timestamp=stale_time
    )
    result = engine.evaluate(test_product, evidence, previous_price=350.00)
    assert result.decision == "STALE_EVIDENCE"
    assert result.is_confirmed_drop is False

def test_invalid_zero_price_flagged(engine, test_product):
    evidence = EvidencePayload(
        product_id=test_product.product_id,
        source_url=test_product.url,
        observed_price=0.00,
        currency="USD",
        variant_observed="Silver / Over-Ear",
        seller_observed="Sony Direct Store",
        evidence_timestamp=datetime.datetime.utcnow()
    )
    result = engine.evaluate(test_product, evidence, previous_price=350.00)
    assert result.decision == "INVALID_PRICE"
    assert result.is_confirmed_drop is False

def test_missing_data_flagged(engine, test_product):
    evidence = EvidencePayload(
        product_id=test_product.product_id,
        source_url=test_product.url,
        observed_price=None,
        currency="USD",
        variant_observed="Silver / Over-Ear",
        seller_observed="Sony Direct Store",
        evidence_timestamp=datetime.datetime.utcnow()
    )
    result = engine.evaluate(test_product, evidence, previous_price=350.00)
    assert result.decision == "MISSING_DATA"
    assert result.is_confirmed_drop is False

def test_extreme_flash_drop_marked_uncertain(engine, test_product):
    # A 95% price crash from $350 down to $15 is suspicious
    evidence = EvidencePayload(
        product_id=test_product.product_id,
        source_url=test_product.url,
        observed_price=15.00,
        currency="USD",
        variant_observed="Silver / Over-Ear",
        seller_observed="Sony Direct Store",
        evidence_timestamp=datetime.datetime.utcnow()
    )
    result = engine.evaluate(test_product, evidence, previous_price=350.00)
    assert result.decision == "UNCERTAIN"
    assert result.is_confirmed_drop is False
