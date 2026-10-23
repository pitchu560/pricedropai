import json
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base
from models import Product, Alert, Approval
from engine.cart_simulator import CartSimulator

@pytest.fixture
def sample_entities():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    product = Product(
        product_id="PROD-CART-01",
        name="Cart Simulation Specimen",
        url="https://demo-store.internal/items/cart-specimen",
        variant="Midnight / 256GB",
        seller="Flagship Official Store",
        target_price=500.00,
        currency="USD",
        is_active=True
    )
    session.add(product)
    session.commit()

    alert = Alert(
        product_id=product.product_id,
        previous_price=600.00,
        new_price=420.00,
        target_price=500.00,
        drop_amount=180.00,
        drop_percentage=30.0,
        status="CONFIRMED",
        alert_type="TARGET_DROP_CONFIRMED"
    )
    session.add(alert)
    session.commit()

    approval = Approval(
        alert_id=alert.id,
        product_id=product.product_id,
        proposed_action="SIMULATED_ADD_TO_CART",
        status="PENDING"
    )
    session.add(approval)
    session.commit()

    return session, product, alert, approval

def test_simulated_cart_execution_structure(sample_entities):
    session, product, alert, approval = sample_entities
    result = CartSimulator.execute_simulated_add_to_cart(product, alert, approval, quantity=1)

    assert result["simulation_status"] == "SUCCESSFUL_SIMULATED_RESERVATION"
    assert result["is_simulation"] is True
    assert "SIM-SESSION-" in result["simulated_session_id"]
    assert "RSV-" in result["cart_reservation_token"]
    assert result["unit_price_usd"] == 420.00
    assert result["savings_usd"] == 180.00
    assert "SYNTHETIC SIMULATION ONLY" in result["disclaimer"]
    assert result["simulated_cart_subtotal"] == 420.00
    assert result["simulated_grand_total"] > 420.00  # includes simulated tax
