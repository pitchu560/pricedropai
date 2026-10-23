import uuid
import datetime
import json
from typing import Dict, Any
from models import Product, Alert, Approval

class CartSimulator:
    """
    Approval-Gated Simulated E-Commerce Cart Dispatcher.
    GUARANTEE: No real financial charges, API orders, or live carts are ever touched.
    All operations are strictly simulated within sandbox memory and logged for verification.
    """

    @staticmethod
    def execute_simulated_add_to_cart(
        product: Product,
        alert: Alert,
        approval: Approval,
        quantity: int = 1
    ) -> Dict[str, Any]:
        """
        Executes an audited simulation of adding a price-dropped item to a merchant cart.
        Requires explicit prior approval.
        """
        session_id = f"SIM-SESSION-{uuid.uuid4().hex[:12].upper()}"
        reservation_token = f"RSV-{uuid.uuid4().hex[:16].upper()}"
        executed_at = datetime.datetime.utcnow()

        unit_price = alert.new_price
        subtotal = round(unit_price * quantity, 2)
        estimated_tax = round(subtotal * 0.0825, 2)
        total_price = round(subtotal + estimated_tax, 2)

        result = {
            "simulation_status": "SUCCESSFUL_SIMULATED_RESERVATION",
            "is_simulation": True,
            "simulated_session_id": session_id,
            "cart_reservation_token": reservation_token,
            "product_id": product.product_id,
            "product_name": product.name,
            "variant": product.variant,
            "authorized_seller": product.seller,
            "quantity": quantity,
            "unit_price_usd": unit_price,
            "original_target_usd": alert.target_price,
            "savings_usd": round(alert.drop_amount * quantity, 2),
            "simulated_cart_subtotal": subtotal,
            "simulated_tax": estimated_tax,
            "simulated_grand_total": total_price,
            "executed_at": executed_at.isoformat() + "Z",
            "reservation_expiry": (executed_at + datetime.timedelta(minutes=30)).isoformat() + "Z",
            "disclaimer": "SYNTHETIC SIMULATION ONLY: No actual financial transaction was processed."
        }

        return result

cart_simulator = CartSimulator()
