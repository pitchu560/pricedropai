# AI Price Drop Watcher Agent

Autonomous full-stack e-commerce price monitoring agent with evidence verification, anti-hallucination decision heuristics, and approval-gated simulated cart reservations.

## Key Features & Architecture

1. **Product Registration & Catalog**:
   - Register items with stable Product SKU, descriptive title, variant specifications (color, capacity, tier), authorized merchant seller, and target price threshold.
2. **Multi-Adapter Price Monitoring**:
   - High-fidelity `MockStoreAdapter` and extensible `ModularScraper` collecting price, variant, merchant identity, source URL, and observation timestamp.
3. **Anti-Hallucination Decision Engine**:
   - Strict rule-based heuristics evaluating:
     - Missing data & zero-price scraper bugs (`MISSING_DATA`, `INVALID_PRICE`)
     - Evidence staleness barriers (`STALE_EVIDENCE`)
     - Variant drift & condition downgrades (`WRONG_VARIANT`)
     - Unauthorized third-party merchants (`SELLER_MISMATCH`)
     - Extreme price flash crashes / outlier discount caps (`UNCERTAIN`)
     - True target threshold breaches (`CONFIRMED_DROP`)
4. **Duplicate Alert Prevention**:
   - Prevents repetitive notification spam through exact-price deduplication and configurable cooldown windows.
5. **Approval-Gated Simulated Cart Actions**:
   - Autonomous purchasing or real cart alterations are strictly forbidden. Confirmed price drops enter an approval queue requiring explicit user approval/rejection.
   - Approved actions generate synthetic cart reservation tokens with session IDs, subtotal, tax math, and 30-minute reservation expiry.
6. **Immutable Audit Verification Logs**:
   - Full audit trail recording every probe, confidence score, raw evidence snapshot, and decision reason, with instant JSON payload inspection and CSV export.
7. **Transactional & Idempotent Dataset Importer**:
   - Pre-loaded with synthetic benchmark data: `products.csv`, `price_history.csv`, and `test_cases.csv` inside `backend/data/`.
8. **Interactive Test Runner & Pytest Suite**:
   - 17 automated Pytest unit and integration tests passing with 100% success rate.
   - Live UI test runner executing test case scenarios directly in the browser against the backend.

---

## Complete Project Directory Structure

```text
AI-Price-Drop-Watcher/
├── backend/
│   ├── adapters/
│   │   ├── __init__.py
│   │   ├── mock_store_adapter.py    # Multi-vendor synthetic probe adapter
│   │   └── modular_scraper.py       # Extensible scraper & schema validator
│   ├── data/
│   │   ├── __init__.py
│   │   ├── importer.py              # Transactional, idempotent CSV importer
│   │   ├── products.csv             # Synthetic demo product catalog
│   │   ├── price_history.csv        # Historical price observations
│   │   ├── test_cases.csv           # 8 edge-case scenario specifications
│   │   └── README.txt               # Dataset provenance & schema specification
│   ├── engine/
│   │   ├── __init__.py
│   │   ├── cart_simulator.py        # Approval-gated synthetic cart dispatcher
│   │   ├── decision_engine.py       # Anti-hallucination verification engine
│   │   └── monitoring_service.py    # Probe coordinator & alert deduplicator
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── alerts.py                # Alert management & mute/resolve endpoints
│   │   ├── approvals.py             # User approval & simulated cart execution
│   │   ├── dataset.py               # Dataset status, re-import & reset
│   │   ├── monitoring.py            # Sweep & scenario simulation endpoints
│   │   ├── products.py              # Product CRUD & price history
│   │   └── verification_logs.py     # Audit log queries & CSV export
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_alerts_and_duplicates.py
│   │   ├── test_api_endpoints.py
│   │   ├── test_approvals_and_cart.py
│   │   ├── test_dataset_importer.py
│   │   └── test_decision_engine.py
│   ├── __init__.py
│   ├── config.py                    # App configuration & settings
│   ├── database.py                  # SQLAlchemy engine & session maker
│   ├── main.py                      # FastAPI application assembly & CORS
│   ├── models.py                    # SQLAlchemy ORM database models
│   ├── requirements.txt             # Backend Python dependencies
│   ├── schemas.py                   # Pydantic v2 validation schemas
│   └── README.md                    # Backend documentation
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AlertsFeed.tsx
│   │   │   ├── ApprovalsView.tsx
│   │   │   ├── DatasetTestingView.tsx
│   │   │   ├── MetricsBar.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── PriceHistoryModal.tsx
│   │   │   ├── ProductList.tsx
│   │   │   ├── ProductModal.tsx
│   │   │   ├── SimulationModal.tsx
│   │   │   └── VerificationLogsView.tsx
│   │   ├── api.ts                   # Typed REST API service functions
│   │   ├── App.tsx                  # Main reactive dashboard container
│   │   ├── index.css                # Tailwind CSS v4 stylesheets
│   │   ├── main.tsx                 # React DOM root entrypoint
│   │   └── types.ts                 # TypeScript model definitions
│   ├── index.html                   # HTML entrypoint
│   ├── package.json                 # Frontend dependencies
│   ├── tsconfig.json                # TypeScript compiler config
│   ├── vite.config.ts               # Vite bundler & reverse-proxy configuration
│   └── README.md                    # Frontend documentation
├── .gitignore
├── package.json
├── requirements.txt
└── README.md
```

---

## Windows Installation & Execution Commands

### Prerequisites
- Python 3.10+ (ensure "Add Python to PATH" is checked during installation)
- Node.js 18+ & npm

### Terminal 1: Backend (FastAPI + SQLite)
Open PowerShell or Command Prompt:

```powershell
# Navigate to the backend folder
cd AI-Price-Drop-Watcher\backend

# Create and activate Python virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install Python requirements
pip install -r requirements.txt

# Run automated test suite (all 17 tests will execute)
pytest tests -v

# Start the FastAPI backend server
uvicorn main:app --host 127.0.0.1 --port 8080 --reload
```

FastAPI will start on `http://127.0.0.1:8080`.
Interactive Swagger UI will be available at: `http://127.0.0.1:8080/docs`.

### Terminal 2: Frontend (React + Vite)
Open a second PowerShell or Command Prompt:

```powershell
# Navigate to the frontend folder (or workspace root)
cd AI-Price-Drop-Watcher\frontend

# Install Node dependencies
npm install

# Start the Vite development server
npm run dev
```

The Vite dev server will start on `http://localhost:3000` (and proxy all API requests to the FastAPI backend).

---

## Actual Automated Test Results

Ran with `pytest AI-Price-Drop-Watcher/backend/tests -v`:

```text
============================= test session starts ==============================
collected 17 items

test_alerts_and_duplicates.py::test_alert_created_and_duplicate_suppressed PASSED [  5%]
test_api_endpoints.py::test_health_endpoint PASSED [ 11%]
test_api_endpoints.py::test_list_products_endpoint PASSED [ 17%]
test_api_endpoints.py::test_register_and_delete_product_flow PASSED [ 23%]
test_api_endpoints.py::test_dataset_status_endpoint PASSED [ 29%]
test_api_endpoints.py::test_monitoring_simulate_scenario_endpoint PASSED [ 35%]
test_api_endpoints.py::test_approvals_workflow_endpoint PASSED [ 41%]
test_approvals_and_cart.py::test_simulated_cart_execution_structure PASSED [ 47%]
test_dataset_importer.py::test_importer_idempotency_and_transactional_safety PASSED [ 52%]
test_decision_engine.py::test_confirmed_genuine_price_drop PASSED [ 58%]
test_decision_engine.py::test_unchanged_price_above_target PASSED [ 64%]
test_decision_engine.py::test_wrong_variant_downgrade_rejected PASSED [ 70%]
test_decision_engine.py::test_unauthorized_seller_mismatch PASSED [ 76%]
test_decision_engine.py::test_stale_evidence_rejection PASSED [ 82%]
test_decision_engine.py::test_invalid_zero_price_flagged PASSED [ 88%]
test_decision_engine.py::test_missing_data_flagged PASSED [ 94%]
test_decision_engine.py::test_extreme_flash_drop_marked_uncertain PASSED [100%]

======================== 17 passed in 1.01s =========================
```

---

## Safety & Real-World Boundaries
- **Synthetic Data**: All merchant names and store URLs (`demo-store.internal`) are synthetic demo fixtures to allow zero-risk verification.
- **Simulated Cart Actions**: Real financial transactions or modifying live external carts is strictly disabled. The system produces cryptographic session reservation vouchers for simulated checkout sessions.
