import os
import csv
import datetime
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from models import Product, PriceObservation, DatasetImport

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

def parse_iso_datetime(dt_str: str) -> datetime.datetime:
    dt_str = dt_str.strip().replace("Z", "+00:00")
    try:
        return datetime.datetime.fromisoformat(dt_str).replace(tzinfo=None)
    except Exception:
        return datetime.datetime.utcnow()

class DatasetImporter:
    """
    Transactional, idempotent CSV dataset importer.
    Handles upserts for products and deduplication for historical price points.
    """

    def __init__(self, data_dir: str = CURRENT_DIR):
        self.data_dir = data_dir
        self.products_csv = os.path.join(data_dir, "products.csv")
        self.price_history_csv = os.path.join(data_dir, "price_history.csv")
        self.test_cases_csv = os.path.join(data_dir, "test_cases.csv")

    def import_all(self, db: Session) -> Dict[str, Any]:
        """
        Executes an idempotent, transactional import of all CSV dataset files.
        """
        total_products_upserted = 0
        total_observations_imported = 0
        error_msg = None

        try:
            # 1. Import Products transactionally
            if os.path.exists(self.products_csv):
                with open(self.products_csv, mode="r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        pid = row["product_id"].strip()
                        name = row["name"].strip()
                        url = row["url"].strip()
                        variant = row.get("variant", "").strip()
                        seller = row.get("seller", "").strip()
                        target_price = float(row["target_price"])
                        currency = row.get("currency", "USD").strip()
                        is_active = bool(int(row.get("is_active", 1)))

                        existing = db.query(Product).filter(Product.product_id == pid).first()
                        if existing:
                            existing.name = name
                            existing.url = url
                            existing.variant = variant
                            existing.seller = seller
                            existing.target_price = target_price
                            existing.currency = currency
                            existing.is_active = is_active
                            existing.updated_at = datetime.datetime.utcnow()
                        else:
                            new_prod = Product(
                                product_id=pid,
                                name=name,
                                url=url,
                                variant=variant,
                                seller=seller,
                                target_price=target_price,
                                currency=currency,
                                is_active=is_active,
                                created_at=datetime.datetime.utcnow(),
                                updated_at=datetime.datetime.utcnow()
                            )
                            db.add(new_prod)
                        total_products_upserted += 1

                db.flush()

            # 2. Import Price History idempotently
            if os.path.exists(self.price_history_csv):
                with open(self.price_history_csv, mode="r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        pid = row["product_id"].strip()
                        price = float(row["observed_price"])
                        currency = row.get("currency", "USD").strip()
                        variant = row.get("variant_observed", "").strip()
                        seller = row.get("seller_observed", "").strip()
                        source_url = row.get("source_url", "").strip()
                        ts = parse_iso_datetime(row["timestamp"])
                        is_valid = bool(int(row.get("is_valid", 1)))
                        notes = row.get("notes", "").strip()

                        # Deduplication check: same product, timestamp, price
                        existing_obs = (
                            db.query(PriceObservation)
                            .filter(
                                PriceObservation.product_id == pid,
                                PriceObservation.timestamp == ts,
                                PriceObservation.observed_price == price
                            )
                            .first()
                        )
                        if not existing_obs:
                            obs = PriceObservation(
                                product_id=pid,
                                observed_price=price,
                                currency=currency,
                                variant_observed=variant,
                                seller_observed=seller,
                                source_url=source_url,
                                timestamp=ts,
                                is_valid=is_valid,
                                raw_metadata=f'{{"notes": "{notes}", "synthetic": true}}'
                            )
                            db.add(obs)
                            total_observations_imported += 1

                db.flush()

            # 3. Record DatasetImport log
            import_log = DatasetImport(
                filename="products.csv,price_history.csv",
                rows_imported=total_products_upserted + total_observations_imported,
                status="SUCCESS",
                error_message=None,
                imported_at=datetime.datetime.utcnow()
            )
            db.add(import_log)
            db.commit()

            return {
                "status": "SUCCESS",
                "products_upserted": total_products_upserted,
                "observations_imported": total_observations_imported,
                "imported_at": datetime.datetime.utcnow().isoformat() + "Z"
            }

        except Exception as e:
            db.rollback()
            error_msg = str(e)
            fail_log = DatasetImport(
                filename="dataset_bundle",
                rows_imported=0,
                status="FAILED",
                error_message=error_msg,
                imported_at=datetime.datetime.utcnow()
            )
            db.add(fail_log)
            db.commit()
            raise RuntimeError(f"CSV Import Failed: {error_msg}")

dataset_importer = DatasetImporter()
