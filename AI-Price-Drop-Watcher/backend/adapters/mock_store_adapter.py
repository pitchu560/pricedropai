import datetime
import random
from typing import Optional, Dict, Any
from schemas import EvidencePayload

class MockStoreAdapter:
    """
    Adapter simulating multi-vendor e-commerce store APIs and probe endpoints.
    Provides verified synthetic signals for testing all edge cases:
    - Legitimate price drops
    - Stale cache returns
    - Merchant seller discrepancies
    - Incorrect product sub-variants
    - Scraping anomalies (zero prices, missing fields)
    """

    def __init__(self):
        # Baseline catalog of synthetic store inventory
        self.catalog = {
            "PROD-SNY-WH1000XM5": {
                "name": "Sony WH-1000XM5 Wireless Headphones",
                "current_price": 319.99,  # Genuine drop below 329.99 target
                "currency": "USD",
                "variant": "Silver / Over-Ear",
                "seller": "Sony Direct Store",
                "in_stock": True,
            },
            "PROD-APL-MBP14-M3": {
                "name": "Apple MacBook Pro 14\" M3 Pro",
                "current_price": 1899.00,  # Unchanged / above 1849.00 target
                "currency": "USD",
                "variant": "Space Black / 18GB / 512GB",
                "seller": "Apple Authorized",
                "in_stock": True,
            },
            "PROD-LOG-MXMSTR3S": {
                "name": "Logitech MX Master 3S Performance Mouse",
                "current_price": 79.99,  # Genuine drop below 89.99 target
                "currency": "USD",
                "variant": "Graphite / Ergonomic",
                "seller": "Logitech Official",
                "in_stock": True,
            },
            "PROD-DEL-U2723QE": {
                "name": "Dell UltraSharp 27\" 4K USB-C Hub Monitor",
                "current_price": 509.00,  # Above 499.00 target
                "currency": "USD",
                "variant": "Platinum Silver / 4K IPS",
                "seller": "Dell Official Partner",
                "in_stock": True,
            },
            "PROD-KIN-PW11TH": {
                "name": "Kindle Paperwhite 16GB Waterproof",
                "current_price": 119.99,  # Genuine drop below 129.99 target
                "currency": "USD",
                "variant": "Black / 16GB / Without Lockscreen Ads",
                "seller": "Demo Merchant Retail",
                "in_stock": True,
            },
            "PROD-BOS-QCULTRA": {
                "name": "Bose QuietComfort Ultra Noise Cancelling",
                "current_price": 369.00,  # Genuine drop below 379.00 target
                "currency": "USD",
                "variant": "Black / Spatial Audio",
                "seller": "Bose Direct",
                "in_stock": True,
            },
        }

    def fetch_product_evidence(
        self,
        product_id: str,
        target_url: str,
        override_price: Optional[float] = None,
        override_variant: Optional[str] = None,
        override_seller: Optional[str] = None,
        override_timestamp: Optional[datetime.datetime] = None,
        simulated_anomaly: Optional[str] = None
    ) -> EvidencePayload:
        """
        Gathers evidence for the specified product.
        """
        now = datetime.datetime.utcnow()
        item = self.catalog.get(product_id, {
            "name": "Generic Item",
            "current_price": 99.99,
            "currency": "USD",
            "variant": "Standard",
            "seller": "Generic Seller",
            "in_stock": True,
        })

        price = override_price if override_price is not None else item["current_price"]
        variant = override_variant if override_variant is not None else item["variant"]
        seller = override_seller if override_seller is not None else item["seller"]
        timestamp = override_timestamp or now

        # Anomaly simulation hooks
        if simulated_anomaly == "WRONG_VARIANT":
            variant = f"Refurbished {variant} Grade-B"
        elif simulated_anomaly == "SELLER_MISMATCH":
            seller = "ThirdParty_Unauthorized_Dealz"
        elif simulated_anomaly == "STALE_EVIDENCE":
            timestamp = now - datetime.timedelta(days=3)
        elif simulated_anomaly == "ZERO_PRICE":
            price = 0.0
        elif simulated_anomaly == "NEGATIVE_PRICE":
            price = -15.00
        elif simulated_anomaly == "MISSING_DATA":
            variant = ""
            price = None
        elif simulated_anomaly == "UNCERTAIN_EXTREME_DROP":
            price = round(price * 0.05, 2)  # 95% crash from unknown source
            seller = "FlashLiquidationOutlet_NoRating"

        return EvidencePayload(
            product_id=product_id,
            source_url=target_url,
            observed_price=price,
            currency="USD",
            variant_observed=variant,
            seller_observed=seller,
            evidence_timestamp=timestamp,
            confidence=0.98 if price and price > 0 else 0.2,
            raw_data={
                "adapter": "MockStoreAdapter",
                "simulated_sku": f"SKU-{product_id}",
                "storefront_response_code": 200,
                "in_stock": item.get("in_stock", True),
                "extracted_fields": ["price", "variant", "seller", "availability"]
            }
        )

mock_store_adapter = MockStoreAdapter()
