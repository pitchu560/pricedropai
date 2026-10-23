import os
import csv
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from database import get_db
from models import Product, PriceObservation, Alert, Approval, VerificationLog, DatasetImport
from schemas import DatasetStatus
from data.importer import dataset_importer

router = APIRouter(prefix="/dataset", tags=["Dataset"])

@router.get("/status", response_model=DatasetStatus)
def get_dataset_status(db: Session = Depends(get_db)):
    """
    Returns counts and status of imported synthetic demo records.
    """
    products_c = db.query(Product).count()
    observations_c = db.query(PriceObservation).count()
    alerts_c = db.query(Alert).count()
    approvals_c = db.query(Approval).count()
    logs_c = db.query(VerificationLog).count()

    last_import = (
        db.query(DatasetImport)
        .order_by(DatasetImport.imported_at.desc())
        .first()
    )

    recent_imports = (
        db.query(DatasetImport)
        .order_by(DatasetImport.imported_at.desc())
        .limit(10)
        .all()
    )

    history = [
        {
            "id": imp.id,
            "filename": imp.filename,
            "rows_imported": imp.rows_imported,
            "status": imp.status,
            "error_message": imp.error_message,
            "imported_at": imp.imported_at.isoformat() if imp.imported_at else None
        }
        for imp in recent_imports
    ]

    return DatasetStatus(
        products_count=products_c,
        observations_count=observations_c,
        alerts_count=alerts_c,
        approvals_count=approvals_c,
        verification_logs_count=logs_c,
        last_imported_at=last_import.imported_at if last_import else None,
        imports_history=history
    )

@router.post("/import", status_code=status.HTTP_200_OK)
def trigger_import(db: Session = Depends(get_db)):
    """
    Manually triggers transactional, idempotent CSV re-import.
    """
    try:
        result = dataset_importer.import_all(db)
        return {
            "success": True,
            "message": "Synthetic dataset imported successfully",
            "details": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reset", status_code=status.HTTP_200_OK)
def reset_database(db: Session = Depends(get_db)):
    """
    Resets dynamic alerts, approvals, and logs, then reloads initial synthetic demo dataset.
    """
    try:
        db.query(Approval).delete()
        db.query(Alert).delete()
        db.query(VerificationLog).delete()
        db.query(PriceObservation).delete()
        db.query(Product).delete()
        db.commit()

        # Re-import
        result = dataset_importer.import_all(db)
        return {
            "success": True,
            "message": "Database reset and re-seeded with synthetic demo records",
            "details": result
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/test-cases", response_model=List[Dict[str, Any]])
def get_test_cases():
    """
    Reads and returns test_cases.csv definitions for edge-case test simulation.
    """
    test_cases_path = dataset_importer.test_cases_csv
    if not os.path.exists(test_cases_path):
        return []

    results = []
    with open(test_cases_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            results.append(row)
    return results
