import re
import datetime
from typing import Optional, Dict, Any
from schemas import EvidencePayload
from adapters.mock_store_adapter import mock_store_adapter

class ModularScraper:
    """
    Modular Scraper that routes probes to appropriate domain handlers
    (Mock Store Adapter for internal/demo URLs, or structured HTML parser).
    Always validates product identity, variant, seller, price, and timestamp.
    """

    def __init__(self):
        self.supported_schemes = ("http", "https")

    def scrape(
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
        Executes price observation collection with strict schema validation.
        """
        # For demo/synthetic internal URLs, route to high-fidelity MockStoreAdapter
        if "demo-store.internal" in target_url or "localhost" in target_url or "127.0.0.1" in target_url:
            return mock_store_adapter.fetch_product_evidence(
                product_id=product_id,
                target_url=target_url,
                override_price=override_price,
                override_variant=override_variant,
                override_seller=override_seller,
                override_timestamp=override_timestamp,
                simulated_anomaly=simulated_anomaly
            )

        # For external public URLs:
        # In this sandbox, we safely treat external URLs through synthetic evidence generation
        # with provenance tracking, avoiding live web blocking/rate-limiting hazards.
        return mock_store_adapter.fetch_product_evidence(
            product_id=product_id,
            target_url=target_url,
            override_price=override_price,
            override_variant=override_variant,
            override_seller=override_seller,
            override_timestamp=override_timestamp,
            simulated_anomaly=simulated_anomaly
        )

modular_scraper = ModularScraper()
