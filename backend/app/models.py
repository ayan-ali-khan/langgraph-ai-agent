from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, JSON, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class InteractionType(str, enum.Enum):
    face_to_face = "face_to_face"
    phone_call = "phone_call"
    virtual_meeting = "virtual_meeting"
    email = "email"
    conference = "conference"


class InteractionStatus(str, enum.Enum):
    draft = "draft"
    completed = "completed"
    follow_up_required = "follow_up_required"


class HCP(Base):
    __tablename__ = "hcps"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    specialty = Column(String(100))
    institution = Column(String(200))
    email = Column(String(150), unique=True)
    phone = Column(String(30))
    territory = Column(String(100))
    npi_number = Column(String(20), unique=True)
    prescribing_potential = Column(String(20))  # low/medium/high
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    interactions = relationship("Interaction", back_populates="hcp")


class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    hcp_id = Column(Integer, ForeignKey("hcps.id"), nullable=False)
    rep_id = Column(Integer, ForeignKey("reps.id"), nullable=True)
    interaction_type = Column(Enum(InteractionType), nullable=False)
    status = Column(Enum(InteractionStatus), default=InteractionStatus.draft)
    interaction_date = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer)
    products_discussed = Column(JSON, default=list)
    topics_covered = Column(JSON, default=list)
    raw_notes = Column(Text)
    ai_summary = Column(Text)
    ai_extracted_entities = Column(JSON, default=dict)
    sentiment_score = Column(Float)
    next_steps = Column(Text)
    follow_up_date = Column(DateTime(timezone=True))
    samples_provided = Column(JSON, default=list)
    objections_raised = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    hcp = relationship("HCP", back_populates="interactions")
    rep = relationship("Rep", back_populates="interactions")


class Rep(Base):
    __tablename__ = "reps"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    email = Column(String(150), unique=True)
    territory = Column(String(100))
    region = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    interactions = relationship("Interaction", back_populates="rep")
