import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
)
from sqlalchemy.orm import relationship
from database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    url = Column(String(1024), nullable=False)
    variant = Column(String(255), nullable=True, default="")
    seller = Column(String(255), nullable=True, default="")
    target_price = Column(Float, nullable=False)
    currency = Column(String(10), default="USD")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    observations = relationship("PriceObservation", back_populates="product", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="product", cascade="all, delete-orphan")
    approvals = relationship("Approval", back_populates="product", cascade="all, delete-orphan")
    verification_logs = relationship("VerificationLog", back_populates="product", cascade="all, delete-orphan")


class PriceObservation(Base):
    __tablename__ = "price_observations"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(String(64), ForeignKey("products.product_id"), index=True, nullable=False)
    observed_price = Column(Float, nullable=False)
    currency = Column(String(10), default="USD")
    variant_observed = Column(String(255), nullable=True)
    seller_observed = Column(String(255), nullable=True)
    source_url = Column(String(1024), nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    is_valid = Column(Boolean, default=True)
    raw_metadata = Column(Text, nullable=True)  # JSON-encoded extra metadata

    product = relationship("Product", back_populates="observations")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(String(64), ForeignKey("products.product_id"), index=True, nullable=False)
    previous_price = Column(Float, nullable=False)
    new_price = Column(Float, nullable=False)
    target_price = Column(Float, nullable=False)
    drop_amount = Column(Float, nullable=False)
    drop_percentage = Column(Float, nullable=False)
    status = Column(String(32), default="CONFIRMED")  # CONFIRMED, MUTED, RESOLVED
    alert_type = Column(String(64), default="TARGET_DROP_CONFIRMED")
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    product = relationship("Product", back_populates="alerts")
    approvals = relationship("Approval", back_populates="alert", cascade="all, delete-orphan")


class Approval(Base):
    __tablename__ = "approvals"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"), index=True, nullable=True)
    product_id = Column(String(64), ForeignKey("products.product_id"), index=True, nullable=False)
    proposed_action = Column(String(64), default="SIMULATED_ADD_TO_CART")
    status = Column(String(32), default="PENDING")  # PENDING, APPROVED, REJECTED
    decision_reason = Column(Text, nullable=True)
    decided_at = Column(DateTime, nullable=True)
    execution_result = Column(Text, nullable=True)  # JSON-encoded outcome of simulated cart action
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    alert = relationship("Alert", back_populates="approvals")
    product = relationship("Product", back_populates="approvals")


class VerificationLog(Base):
    __tablename__ = "verification_logs"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(String(64), ForeignKey("products.product_id"), index=True, nullable=True)
    run_id = Column(String(64), index=True, nullable=False)
    check_type = Column(String(64), default="MOCK_STORE")  # MOCK_STORE, SCRAPER_PUBLIC, TEST_CASE
    decision = Column(String(64), nullable=False)
    # Decisions: CONFIRMED_DROP, UNCHANGED, WRONG_VARIANT, SELLER_MISMATCH, STALE_EVIDENCE, MISSING_DATA, INVALID_PRICE, UNCERTAIN
    confidence_score = Column(Float, default=1.0)
    evidence_payload = Column(Text, nullable=True)  # JSON-encoded probe snapshot
    reason = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    product = relationship("Product", back_populates="verification_logs")


class DatasetImport(Base):
    __tablename__ = "dataset_imports"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    rows_imported = Column(Integer, default=0)
    status = Column(String(32), default="SUCCESS")  # SUCCESS, FAILED
    error_message = Column(Text, nullable=True)
    imported_at = Column(DateTime, default=datetime.datetime.utcnow)
