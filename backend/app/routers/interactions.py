from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app import models, schemas
from app.agent.enrichment import enrich_interaction

router = APIRouter(prefix="/interactions", tags=["interactions"])


@router.post("/", response_model=schemas.InteractionResponse, status_code=status.HTTP_201_CREATED)
def create_interaction(payload: schemas.InteractionCreate, db: Session = Depends(get_db)):
    """Create and AI-enrich a new HCP interaction."""
    hcp = db.query(models.HCP).filter(models.HCP.id == payload.hcp_id).first()
    if not hcp:
        raise HTTPException(status_code=404, detail="HCP not found")

    # AI enrichment
    enrichment = enrich_interaction(
        raw_notes=payload.raw_notes or "",
        products_discussed=payload.products_discussed or [],
    )

    db_interaction = models.Interaction(
        hcp_id=payload.hcp_id,
        rep_id=payload.rep_id,
        interaction_type=payload.interaction_type,
        status=payload.status,
        interaction_date=payload.interaction_date,
        duration_minutes=payload.duration_minutes,
        products_discussed=payload.products_discussed or [],
        topics_covered=payload.topics_covered or [],
        raw_notes=payload.raw_notes,
        ai_summary=enrichment["summary"],
        ai_extracted_entities=enrichment["entities"],
        sentiment_score=enrichment["sentiment_score"],
        next_steps=payload.next_steps,
        follow_up_date=payload.follow_up_date,
        samples_provided=payload.samples_provided or [],
        objections_raised=payload.objections_raised or [],
    )
    db.add(db_interaction)
    db.commit()
    db.refresh(db_interaction)
    return db_interaction


@router.get("/", response_model=List[schemas.InteractionResponse])
def list_interactions(
    hcp_id: Optional[int] = None,
    rep_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    query = db.query(models.Interaction)
    if hcp_id:
        query = query.filter(models.Interaction.hcp_id == hcp_id)
    if rep_id:
        query = query.filter(models.Interaction.rep_id == rep_id)
    return query.order_by(models.Interaction.interaction_date.desc()).offset(skip).limit(limit).all()


@router.get("/{interaction_id}", response_model=schemas.InteractionResponse)
def get_interaction(interaction_id: int, db: Session = Depends(get_db)):
    interaction = db.query(models.Interaction).filter(models.Interaction.id == interaction_id).first()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    return interaction


@router.patch("/{interaction_id}", response_model=schemas.InteractionResponse)
def update_interaction(
    interaction_id: int,
    payload: schemas.InteractionUpdate,
    db: Session = Depends(get_db),
):
    interaction = db.query(models.Interaction).filter(models.Interaction.id == interaction_id).first()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(interaction, field, value)

    # Re-enrich if notes changed
    if "raw_notes" in update_data:
        enrichment = enrich_interaction(
            raw_notes=update_data["raw_notes"],
            products_discussed=interaction.products_discussed or [],
        )
        interaction.ai_summary = enrichment["summary"]
        interaction.ai_extracted_entities = enrichment["entities"]
        interaction.sentiment_score = enrichment["sentiment_score"]

    interaction.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(interaction)
    return interaction


@router.delete("/{interaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_interaction(interaction_id: int, db: Session = Depends(get_db)):
    interaction = db.query(models.Interaction).filter(models.Interaction.id == interaction_id).first()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    db.delete(interaction)
    db.commit()
