from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime
from database import get_db
from models import Product, PriceObservation, Alert
from schemas import ProductCreate, ProductUpdate, ProductOut, PriceObservationOut

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("", response_model=List[ProductOut])
def list_products(
    active_only: bool = False,
    db: Session = Depends(get_db)
):
    """
    List registered monitored products with latest observed pricing and metric stats.
    """
    query = db.query(Product)
    if active_only:
        query = query.filter(Product.is_active == True)
    products = query.order_by(Product.created_at.desc()).all()

    result = []
    for prod in products:
        # Get latest observation
        latest_obs = (
            db.query(PriceObservation)
            .filter(PriceObservation.product_id == prod.product_id)
            .order_by(PriceObservation.timestamp.desc())
            .first()
        )
        obs_count = (
            db.query(PriceObservation)
            .filter(PriceObservation.product_id == prod.product_id)
            .count()
        )

        latest_price = latest_obs.observed_price if latest_obs else prod.target_price
        price_change = round(latest_price - prod.target_price, 2)

        prod_out = ProductOut(
            id=prod.id,
            product_id=prod.product_id,
            name=prod.name,
            url=prod.url,
            variant=prod.variant,
            seller=prod.seller,
            target_price=prod.target_price,
            currency=prod.currency,
            is_active=prod.is_active,
            created_at=prod.created_at,
            updated_at=prod.updated_at,
            latest_price=latest_price,
            price_change=price_change,
            last_checked_at=latest_obs.timestamp if latest_obs else prod.updated_at,
            observation_count=obs_count
        )
        result.append(prod_out)

    return result

@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def register_product(
    payload: ProductCreate,
    db: Session = Depends(get_db)
):
    """
    Register a new product to monitor with stable product_id, variant, seller, and target price.
    """
    existing = db.query(Product).filter(Product.product_id == payload.product_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product with ID '{payload.product_id}' is already registered."
        )

    product = Product(
        product_id=payload.product_id.strip(),
        name=payload.name.strip(),
        url=payload.url.strip(),
        variant=payload.variant.strip() if payload.variant else "",
        seller=payload.seller.strip() if payload.seller else "",
        target_price=payload.target_price,
        currency=payload.currency.upper(),
        is_active=payload.is_active,
        created_at=datetime.datetime.utcnow(),
        updated_at=datetime.datetime.utcnow()
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    return ProductOut(
        id=product.id,
        product_id=product.product_id,
        name=product.name,
        url=product.url,
        variant=product.variant,
        seller=product.seller,
        target_price=product.target_price,
        currency=product.currency,
        is_active=product.is_active,
        created_at=product.created_at,
        updated_at=product.updated_at,
        latest_price=product.target_price,
        price_change=0.0,
        last_checked_at=product.created_at,
        observation_count=0
    )

@router.get("/{product_id}", response_model=ProductOut)
def get_product(
    product_id: str,
    db: Session = Depends(get_db)
):
    """
    Retrieve single product details by product_id.
    """
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    latest_obs = (
        db.query(PriceObservation)
        .filter(PriceObservation.product_id == product.product_id)
        .order_by(PriceObservation.timestamp.desc())
        .first()
    )
    obs_count = (
        db.query(PriceObservation)
        .filter(PriceObservation.product_id == product.product_id)
        .count()
    )

    return ProductOut(
        id=product.id,
        product_id=product.product_id,
        name=product.name,
        url=product.url,
        variant=product.variant,
        seller=product.seller,
        target_price=product.target_price,
        currency=product.currency,
        is_active=product.is_active,
        created_at=product.created_at,
        updated_at=product.updated_at,
        latest_price=latest_obs.observed_price if latest_obs else product.target_price,
        price_change=round((latest_obs.observed_price - product.target_price), 2) if latest_obs else 0.0,
        last_checked_at=latest_obs.timestamp if latest_obs else product.updated_at,
        observation_count=obs_count
    )

@router.get("/{product_id}/history", response_model=List[PriceObservationOut])
def get_product_price_history(
    product_id: str,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """
    Retrieve chronological price observation history for a product.
    """
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    observations = (
        db.query(PriceObservation)
        .filter(PriceObservation.product_id == product_id)
        .order_by(PriceObservation.timestamp.asc())
        .limit(limit)
        .all()
    )
    return observations

@router.delete("/{product_id}", status_code=status.HTTP_200_OK)
def delete_product(
    product_id: str,
    db: Session = Depends(get_db)
):
    """
    Delete a monitored product and all cascade associated data.
    """
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    db.delete(product)
    db.commit()
    return {"message": f"Product '{product_id}' deleted successfully"}
