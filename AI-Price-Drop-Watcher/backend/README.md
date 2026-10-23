# AI Price Drop Watcher Agent - Backend

Autonomous Python & FastAPI backend engine for monitoring e-commerce product price drops with evidence verification, anti-hallucination decision heuristics, and approval-gated simulated cart actions.

## Technology Stack
- **Framework**: Python 3.10+ / FastAPI
- **ORM & Database**: SQLAlchemy 2.0 / SQLite (`price_watcher.db`)
- **Validation**: Pydantic v2
- **Testing**: Pytest & HTTPX TestClient

## Architecture Overview
- `config.py`: Centralized configuration (cooldown periods, evidence max age, extreme drop caps).
- `database.py`: SQLAlchemy database engine and session management.
- `models.py`: Database models for `Product`, `PriceObservation`, `Alert`, `Approval`, `VerificationLog`, and `DatasetImport`.
- `schemas.py`: Pydantic request/response validation schemas.
- `adapters/`:
  - `mock_store_adapter.py`: High-fidelity synthetic store adapter simulating genuine drops and edge-case anomalies.
  - `modular_scraper.py`: Extensible scraper architecture with schema validation.
- `engine/`:
  - `decision_engine.py`: Anti-hallucination rule engine validating price, freshness, variant specs, seller authenticity, and outlier caps.
  - `monitoring_service.py`: Orchestrates probes, observation recording, verification logging, duplicate alert prevention, and approval dispatch.
  - `cart_simulator.py`: Strict approval-gated simulated cart reservation engine.
- `data/`:
  - `products.csv`: Seed synthetic product catalog.
  - `price_history.csv`: Historical price observations.
  - `test_cases.csv`: Edge case test specifications.
  - `importer.py`: Transactional, idempotent CSV importer.
- `routers/`: REST endpoints for `/products`, `/alerts`, `/approvals`, `/verification-logs`, `/dataset`, `/monitoring`, and `/health`.
- `tests/`: 17 comprehensive Pytest test cases.

## Windows Setup & Execution
Open PowerShell or Command Prompt in this folder:

```powershell
# 1. Create and activate a Python virtual environment
python -m venv venv
.\venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run automated Pytest test suite
pytest tests -v

# 4. Start the FastAPI backend server
uvicorn main:app --host 127.0.0.1 --port 8080 --reload
```
Interactive Swagger API documentation will be available at: `http://127.0.0.1:8080/docs`.
