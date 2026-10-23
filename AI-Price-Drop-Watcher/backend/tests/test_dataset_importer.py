import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base
from models import Product, PriceObservation, DatasetImport
from data.importer import dataset_importer

@pytest.fixture
def memory_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

def test_importer_idempotency_and_transactional_safety(memory_db):
    # First import
    res1 = dataset_importer.import_all(memory_db)
    assert res1["status"] == "SUCCESS"
    assert res1["products_upserted"] >= 5
    assert res1["observations_imported"] >= 10

    initial_products_count = memory_db.query(Product).count()
    initial_obs_count = memory_db.query(PriceObservation).count()

    # Second import (idempotent run)
    res2 = dataset_importer.import_all(memory_db)
    assert res2["status"] == "SUCCESS"

    # Products count should remain exactly identical (upserted, not duplicated)
    second_products_count = memory_db.query(Product).count()
    second_obs_count = memory_db.query(PriceObservation).count()

    assert second_products_count == initial_products_count
    assert second_obs_count == initial_obs_count  # Deduplicated on timestamp & price
