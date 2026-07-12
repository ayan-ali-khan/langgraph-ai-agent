from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any, Dict
from datetime import datetime
from enum import Enum


class InteractionType(str, Enum):
    face_to_face = "face_to_face"
    phone_call = "phone_call"
    virtual_meeting = "virtual_meeting"
    email = "email"
    conference = "conference"


class InteractionStatus(str, Enum):
    draft = "draft"
    completed = "completed"
    follow_up_required = "follow_up_required"


# HCP Schemas
class HCPBase(BaseModel):
    name: str
    specialty: Optional[str] = None
    institution: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    territory: Optional[str] = None
    npi_number: Optional[str] = None
    prescribing_potential: Optional[str] = None


class HCPCreate(HCPBase):
    pass


class HCPResponse(HCPBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Interaction Schemas
class InteractionCreate(BaseModel):
    hcp_id: int
    rep_id: Optional[int] = None
    interaction_type: InteractionType
    interaction_date: datetime
    duration_minutes: Optional[int] = None
    products_discussed: Optional[List[str]] = []
    topics_covered: Optional[List[str]] = []
    raw_notes: Optional[str] = None
    next_steps: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    samples_provided: Optional[List[str]] = []
    objections_raised: Optional[List[str]] = []
    status: Optional[InteractionStatus] = InteractionStatus.draft


class InteractionUpdate(BaseModel):
    interaction_type: Optional[InteractionType] = None
    interaction_date: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    products_discussed: Optional[List[str]] = None
    topics_covered: Optional[List[str]] = None
    raw_notes: Optional[str] = None
    next_steps: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    samples_provided: Optional[List[str]] = None
    objections_raised: Optional[List[str]] = None
    status: Optional[InteractionStatus] = None


class InteractionResponse(BaseModel):
    id: int
    hcp_id: int
    rep_id: Optional[int]
    interaction_type: InteractionType
    status: InteractionStatus
    interaction_date: datetime
    duration_minutes: Optional[int]
    products_discussed: List[str]
    topics_covered: List[str]
    raw_notes: Optional[str]
    ai_summary: Optional[str]
    ai_extracted_entities: Optional[Dict[str, Any]]
    sentiment_score: Optional[float]
    next_steps: Optional[str]
    follow_up_date: Optional[datetime]
    samples_provided: List[str]
    objections_raised: List[str]
    created_at: datetime
    updated_at: Optional[datetime]
    hcp: Optional[HCPResponse]

    class Config:
        from_attributes = True


# Agent/Chat Schemas
class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class AgentRequest(BaseModel):
    message: str
    conversation_history: Optional[List[ChatMessage]] = []
    hcp_id: Optional[int] = None
    interaction_id: Optional[int] = None
    rep_id: Optional[int] = None


class AgentResponse(BaseModel):
    message: str
    action_taken: Optional[str] = None
    interaction_data: Optional[Dict[str, Any]] = None
    interaction_id: Optional[int] = None
    requires_confirmation: bool = False
    prefill_form: bool = False  # True when agent wants to pre-fill the form
