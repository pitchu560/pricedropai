import pytest
from fastapi.testclient import TestClient
from main import app
from database import Base, engine, SessionLocal
from data.importer import dataset_importer

@pytest.fixture(scope="module")
def client():
    # Setup database with initial dataset
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    dataset_importer.import_all(db)
    db.close()
    
    with TestClient(app) as test_client:
        yield test_client

def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["decision_engine"] == "operational"

def test_list_products_endpoint(client):
    response = client.get("/products")
    assert response.status_code == 200
    products = response.json()
    assert isinstance(products, list)
    assert len(products) >= 5

def test_register_and_delete_product_flow(client):
    new_prod_payload = {
        "product_id": "TEST-ENDPOINT-REG-01",
        "name": "Integration Test Product",
        "url": "https://demo-store.internal/items/endpoint-test",
        "variant": "Black / 128GB",
        "seller": "Official Store",
        "target_price": 99.50,
        "currency": "USD",
        "is_active": True
    }
    # Create
    create_res = client.post("/products", json=new_prod_payload)
    assert create_res.status_code == 201
    created_data = create_res.json()
    assert created_data["product_id"] == "TEST-ENDPOINT-REG-01"

    # Fetch
    get_res = client.get("/products/TEST-ENDPOINT-REG-01")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Integration Test Product"

    # Delete
    del_res = client.delete("/products/TEST-ENDPOINT-REG-01")
    assert del_res.status_code == 200

def test_dataset_status_endpoint(client):
    response = client.get("/dataset/status")
    assert response.status_code == 200
    data = response.json()
    assert data["products_count"] >= 5
    assert data["observations_count"] >= 10

def test_monitoring_simulate_scenario_endpoint(client):
    # Test TC-01: Confirmed Drop
    res = client.post("/monitoring/simulate-scenario", json={"test_id": "TC-01"})
    assert res.status_code == 200
    data = res.json()
    assert data["is_test_passed"] is True
    assert data["actual_decision"] == "CONFIRMED_DROP"

    # Test TC-02: Wrong Variant
    res2 = client.post("/monitoring/simulate-scenario", json={"test_id": "TC-02"})
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["is_test_passed"] is True
    assert data2["actual_decision"] == "WRONG_VARIANT"

def test_approvals_workflow_endpoint(client):
    # Ensure there's at least one pending approval (triggered by TC-01 above)
    approvals_res = client.get("/approvals")
    assert approvals_res.status_code == 200
    approvals = approvals_res.json()
    pending = [a for a in approvals if a["status"] == "PENDING"]
    if pending:
        target_id = pending[0]["id"]
        # Approve
        appr_res = client.post(f"/approvals/{target_id}/approve", json={"decision_reason": "Automated test verification"})
        assert appr_res.status_code == 200
        approved_data = appr_res.json()
        assert approved_data["status"] == "APPROVED"
        assert "SIM-SESSION-" in approved_data["execution_result"]
