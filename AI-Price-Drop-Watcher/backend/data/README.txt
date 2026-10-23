========================================================================
AI Price Drop Watcher Agent - Synthetic Demo Dataset Specification
========================================================================

NOTICE:
All data records contained within this directory (products.csv, price_history.csv,
and test_cases.csv) are SYNTHETIC DEMO DATA engineered specifically for testing
the price monitoring decision engine, verification pipeline, and approval workflows.
URLs such as "https://demo-store.internal/items/..." are simulated endpoints.

Files Included:
------------------------------------------------------------------------
1. products.csv:
   - product_id: Unique stable alphanumeric string identifier (e.g., PROD-SNY-WH1000XM5)
   - name: Product descriptive title
   - url: Synthetic source page URL
   - variant: Target item variant spec (e.g., "Silver / Wireless Over-Ear")
   - seller: Authorized primary seller or marketplace merchant (e.g., "Sony Direct Store")
   - target_price: Float threshold below which an alert is triggered
   - currency: 3-letter currency code (USD)
   - is_active: 1 for actively monitored, 0 for paused

2. price_history.csv:
   - product_id: Foreign key to products.csv
   - observed_price: Recorded price point
   - currency: USD
   - variant_observed: Actual variant scraped or reported
   - seller_observed: Actual merchant seller name
   - source_url: Observation provenance URL
   - timestamp: ISO 8601 UTC timestamp
   - is_valid: 1 if verified valid, 0 if flagged
   - notes: Descriptive context (e.g., "Baseline MSRP", "Weekend promotional drop")

3. test_cases.csv:
   - test_id: Unique test scenario identifier
   - product_id: Target product under test
   - scenario_name: High-level scenario description
   - test_price: Price returned in synthetic probe
   - test_variant: Variant returned in probe
   - test_seller: Seller returned in probe
   - test_freshness_seconds: Simulated age of evidence
   - expected_decision: CONFIRMED_DROP | UNCHANGED | WRONG_VARIANT | SELLER_MISMATCH | STALE_EVIDENCE | INVALID_PRICE | UNCERTAIN
   - expected_alert: TRUE | FALSE
   - description: Reasoning for expectation

Importer Design:
The dataset importer reads these files transactionally into SQLite with idempotency
guards (upsert on product_id, deduplication on observation signatures).
========================================================================
