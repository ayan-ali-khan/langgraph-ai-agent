from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/hcps", tags=["hcps"])


@router.post("/", response_model=schemas.HCPResponse, status_code=status.HTTP_201_CREATED)
def create_hcp(payload: schemas.HCPCreate, db: Session = Depends(get_db)):
    db_hcp = models.HCP(**payload.model_dump())
    db.add(db_hcp)
    db.commit()
    db.refresh(db_hcp)
    return db_hcp


@router.get("/", response_model=List[schemas.HCPResponse])
def list_hcps(
    specialty: Optional[str] = None,
    territory: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(models.HCP)
    if specialty:
        query = query.filter(models.HCP.specialty.ilike(f"%{specialty}%"))
    if territory:
        query = query.filter(models.HCP.territory.ilike(f"%{territory}%"))
    if search:
        query = query.filter(models.HCP.name.ilike(f"%{search}%"))
    return query.offset(skip).limit(limit).all()


@router.get("/{hcp_id}", response_model=schemas.HCPResponse)
def get_hcp(hcp_id: int, db: Session = Depends(get_db)):
    hcp = db.query(models.HCP).filter(models.HCP.id == hcp_id).first()
    if not hcp:
        raise HTTPException(status_code=404, detail="HCP not found")
    return hcp


@router.patch("/{hcp_id}", response_model=schemas.HCPResponse)
def update_hcp(hcp_id: int, payload: schemas.HCPCreate, db: Session = Depends(get_db)):
    hcp = db.query(models.HCP).filter(models.HCP.id == hcp_id).first()
    if not hcp:
        raise HTTPException(status_code=404, detail="HCP not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(hcp, field, value)
    db.commit()
    db.refresh(hcp)
    return hcp
