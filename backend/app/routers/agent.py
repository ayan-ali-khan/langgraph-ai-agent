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
    messages = []
    for msg in history:
        if msg.role == "user":
            messages.append(HumanMessage(content=msg.content))
        else:
            messages.append(AIMessage(content=msg.content))
    return messages


def _resolve_hcp_by_name(db: Session, name: str):
    """Fuzzy-find an HCP by partial name match."""
    if not name:
        return None
    name_lower = name.lower().strip()
    hcps = db.query(models.HCP).all()
    # Exact match first
    for h in hcps:
        if h.name.lower() == name_lower:
            return h
    # Partial match
    for h in hcps:
        if name_lower in h.name.lower() or h.name.lower() in name_lower:
            return h
    return None


@router.post("/chat", response_model=schemas.AgentResponse)
async def agent_chat(payload: schemas.AgentRequest, db: Session = Depends(get_db)):
    """
    Conversational chat endpoint.

    When the agent calls log_interaction:
      - We do NOT auto-save to the DB.
      - We return prefill_form=True with extracted interaction_data so the
        frontend can populate the form for the user to review and submit.

    When the agent calls edit_interaction:
      - We apply the update to an existing saved interaction.
    """
    graph = get_graph()

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

    # Extract the last AI text response
    final_message = ""
    for msg in reversed(result["messages"]):
        if isinstance(msg, AIMessage) and msg.content:
            final_message = msg.content
            break

    action = result.get("action_taken")
    raw_data = result.get("interaction_data") or {}

    # ── log_interaction → PRE-FILL FORM, do NOT save ──────────────────────
    if action == "log_interaction":
        # Try to resolve the HCP from the data
        hcp_id = raw_data.get("hcp_id") or payload.hcp_id
        hcp_obj = None

        # First try by id
        if hcp_id:
            try:
                hcp_obj = db.query(models.HCP).filter(
                    models.HCP.id == int(hcp_id)
                ).first()
            except (ValueError, TypeError):
                pass

        # If not found by id, try by name extracted in notes/tool payload
        if not hcp_obj:
            hcp_name_hint = raw_data.get("hcp_name") or ""
            # Also scan the user message for a doctor name
            if not hcp_name_hint:
                user_msg = payload.message
                hcp_obj = _resolve_hcp_by_name(db, user_msg)
            else:
                hcp_obj = _resolve_hcp_by_name(db, hcp_name_hint)

        # Build a clean prefill payload for the frontend
        prefill = {
            "hcp_id": hcp_obj.id if hcp_obj else None,
            "hcp_name": hcp_obj.name if hcp_obj else None,
            "interaction_type": raw_data.get("interaction_type", "face_to_face"),
            "interaction_date": raw_data.get("interaction_date", datetime.utcnow().isoformat()),
            "duration_minutes": raw_data.get("duration_minutes"),
            "products_discussed": raw_data.get("products_discussed", []),
            "topics_covered": raw_data.get("topics_covered", []),
            "raw_notes": raw_data.get("raw_notes", ""),
            "next_steps": raw_data.get("next_steps", ""),
            "samples_provided": raw_data.get("samples_provided", []),
            "objections_raised": raw_data.get("objections_raised", []),
        }

        reply = final_message or (
            f"I've pre-filled the form based on your description"
            + (f" for {hcp_obj.name}" if hcp_obj else "")
            + ". Please review the details on the left and click **Log Interaction** to save."
        )

        return schemas.AgentResponse(
            message=reply,
            action_taken="log_interaction",
            interaction_data=prefill,
            interaction_id=None,
            requires_confirmation=False,
            prefill_form=True,
        )

    # ── edit_interaction → apply update to DB ─────────────────────────────
    interaction_id = result.get("interaction_id")
    if action == "edit_interaction" and raw_data:
        iid = result.get("interaction_id") or payload.interaction_id
        if iid:
            try:
                obj = db.query(models.Interaction).filter(
                    models.Interaction.id == int(iid)
                ).first()
                if obj:
                    allowed = {
                        "interaction_type", "interaction_date", "duration_minutes",
                        "products_discussed", "topics_covered", "raw_notes",
                        "next_steps", "follow_up_date", "samples_provided",
                        "objections_raised", "status",
                    }
                    for k, v in raw_data.items():
                        if k in allowed:
                            setattr(obj, k, v)
                    if "raw_notes" in raw_data:
                        enrichment = enrich_interaction(
                            raw_notes=raw_data["raw_notes"],
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
                logger.error(f"edit_interaction DB error: {e}")

    return schemas.AgentResponse(
        message=final_message or "Done.",
        action_taken=action,
        interaction_data=raw_data or None,
        interaction_id=interaction_id,
        requires_confirmation=result.get("requires_confirmation", False),
        prefill_form=False,
    )
