from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from langchain_core.messages import HumanMessage, AIMessage
from app.database import get_db
from app import models, schemas
from app.agent.graph import get_graph
from app.agent.enrichment import enrich_interaction
from app.agent.state import AgentState
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agent", tags=["agent"])


def _build_lc_messages(history: list):
    """Convert chat history schema to LangChain message objects."""
    messages = []
    for msg in history:
        if msg.role == "user":
            messages.append(HumanMessage(content=msg.content))
        else:
            messages.append(AIMessage(content=msg.content))
    return messages


@router.post("/chat", response_model=schemas.AgentResponse)
async def agent_chat(payload: schemas.AgentRequest, db: Session = Depends(get_db)):
    """
    Conversational endpoint. Routes user message through the LangGraph agent,
    which decides whether to call tools (log, edit, search, etc.) or just chat.
    """
    graph = get_graph()

    # Build initial state
    history_messages = _build_lc_messages(payload.conversation_history or [])
    initial_state: AgentState = {
        "messages": history_messages + [HumanMessage(content=payload.message)],
        "hcp_id": payload.hcp_id,
        "interaction_id": payload.interaction_id,
        "interaction_data": None,
        "action_taken": None,
        "requires_confirmation": False,
        "db_session": db,
        "error": None,
    }

    try:
        result = graph.invoke(initial_state)
    except Exception as e:
        logger.error(f"Agent graph error: {e}")
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")

    # Extract final AI response
    final_message = ""
    for msg in reversed(result["messages"]):
        if isinstance(msg, AIMessage) and msg.content:
            final_message = msg.content
            break

    # If agent called log_interaction tool, persist the interaction to DB
    interaction_id = result.get("interaction_id")
    if result.get("action_taken") == "log_interaction" and result.get("interaction_data"):
        data = result["interaction_data"]
        try:
            hcp_id = data.get("hcp_id") or payload.hcp_id
            if hcp_id:
                enrichment = enrich_interaction(
                    raw_notes=data.get("raw_notes", ""),
                    products_discussed=data.get("products_discussed", []),
                )
                interaction_date_raw = data.get("interaction_date", datetime.utcnow().isoformat())
                try:
                    interaction_date = datetime.fromisoformat(interaction_date_raw)
                except Exception:
                    interaction_date = datetime.utcnow()

                db_obj = models.Interaction(
                    hcp_id=hcp_id,
                    rep_id=data.get("rep_id"),
                    interaction_type=data.get("interaction_type", "face_to_face"),
                    interaction_date=interaction_date,
                    duration_minutes=data.get("duration_minutes"),
                    products_discussed=data.get("products_discussed", []),
                    topics_covered=data.get("topics_covered", []),
                    raw_notes=data.get("raw_notes", ""),
                    ai_summary=enrichment["summary"],
                    ai_extracted_entities=enrichment["entities"],
                    sentiment_score=enrichment["sentiment_score"],
                    samples_provided=data.get("samples_provided", []),
                    objections_raised=data.get("objections_raised", []),
                    status="completed",
                )
                db.add(db_obj)
                db.commit()
                db.refresh(db_obj)
                interaction_id = db_obj.id
        except Exception as e:
            logger.error(f"DB persist error after agent log_interaction: {e}")

    # If agent called edit_interaction tool, update DB
    if result.get("action_taken") == "edit_interaction" and result.get("interaction_data"):
        iid = result.get("interaction_id") or payload.interaction_id
        if iid:
            try:
                obj = db.query(models.Interaction).filter(models.Interaction.id == iid).first()
                if obj:
                    for k, v in (result["interaction_data"] or {}).items():
                        setattr(obj, k, v)
                    if "raw_notes" in (result["interaction_data"] or {}):
                        enrichment = enrich_interaction(
                            raw_notes=result["interaction_data"]["raw_notes"],
                            products_discussed=obj.products_discussed or [],
                        )
                        obj.ai_summary = enrichment["summary"]
                        obj.ai_extracted_entities = enrichment["entities"]
                        obj.sentiment_score = enrichment["sentiment_score"]
                    obj.updated_at = datetime.utcnow()
                    db.commit()
                    db.refresh(obj)
                    interaction_id = obj.id
            except Exception as e:
                logger.error(f"DB update error after agent edit_interaction: {e}")

    return schemas.AgentResponse(
        message=final_message or "Done.",
        action_taken=result.get("action_taken"),
        interaction_data=result.get("interaction_data"),
        interaction_id=interaction_id,
        requires_confirmation=result.get("requires_confirmation", False),
    )
