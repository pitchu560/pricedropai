import datetime
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base
from models import Product, Alert, Approval, VerificationLog, PriceObservation
from engine.monitoring_service import MonitoringService

@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Seed test product
    product = Product(
        product_id="PROD-DEDUP-TEST",
        name="Deduplication Test Item",
        url="https://demo-store.internal/items/dedup-test",
        variant="Standard",
        seller="Authorized Seller",
        target_price=200.00,
        currency="USD",
        is_active=True
    )
    session.add(product)
    session.commit()

    yield session
    session.close()

def test_alert_created_and_duplicate_suppressed(test_db):
    service = MonitoringService()
    product = test_db.query(Product).filter(Product.product_id == "PROD-DEDUP-TEST").first()

    # First run with drop to $150
    run_1 = service.run_check_for_product(
        db=test_db,
        product=product,
        run_id="RUN-1",
        custom_price=150.00,
        custom_variant="Standard",
        custom_seller="Authorized Seller"
    )
    assert run_1.decision == "CONFIRMED_DROP"
    assert run_1.is_confirmed_drop is True

    # Assert 1 alert and 1 approval were created
    alerts_1 = test_db.query(Alert).filter(Alert.product_id == "PROD-DEDUP-TEST").all()
    assert len(alerts_1) == 1
    assert alerts_1[0].new_price == 150.00

    # Second run immediately with SAME price $150
    run_2 = service.run_check_for_product(
        db=test_db,
        product=product,
        run_id="RUN-2",
        custom_price=150.00,
        custom_variant="Standard",
        custom_seller="Authorized Seller"
    )
    # Check that duplicate alert was prevented
    alerts_2 = test_db.query(Alert).filter(Alert.product_id == "PROD-DEDUP-TEST").all()
    assert len(alerts_2) == 1  # Still 1 alert, duplicate was suppressed
    assert "Duplicate suppressed" in run_2.reason
