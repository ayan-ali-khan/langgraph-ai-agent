"""
LangGraph Agent Tools for HCP CRM Sales Activities.

5 Tools:
1. log_interaction     – Capture + AI-enrich a new HCP interaction
2. edit_interaction    – Modify an existing logged interaction
3. search_hcp_profile  – Retrieve HCP details, history & prescribing trends
4. schedule_follow_up  – Set next-steps / follow-up date for an interaction
5. get_sales_insights  – AI-generated territory & HCP engagement insights
"""

from langchain_core.tools import tool
from typing import Optional, List, Union
from datetime import datetime
import json
from app.database import SessionLocal
from app import models


@tool
def log_interaction(
    hcp_id: Union[int, str],
    interaction_type: str,
    raw_notes: str,
    interaction_date: str,
    products_discussed: Optional[List[str]] = None,
    topics_covered: Optional[List[str]] = None,
    duration_minutes: Optional[int] = None,
    samples_provided: Optional[List[str]] = None,
    objections_raised: Optional[List[str]] = None,
    rep_id: Optional[Union[int, str]] = None,
) -> dict:
    """
    Log a new interaction with an HCP. Uses LLM to auto-summarize raw notes,
    extract named entities (products, objections, sentiment), and classify the
    interaction for CRM entry. Returns the structured interaction payload ready
    for database persistence.

    Args:
        hcp_id: Database ID of the Healthcare Professional.
        interaction_type: One of face_to_face | phone_call | virtual_meeting | email | conference.
        raw_notes: Free-text notes captured by the rep during/after the interaction.
        interaction_date: ISO datetime string of when the interaction occurred.
        products_discussed: List of product names discussed.
        topics_covered: Key topics (e.g. clinical data, side effects, dosing).
        duration_minutes: How long the interaction lasted.
        samples_provided: Drug samples handed to the HCP.
        objections_raised: Any objections or concerns the HCP expressed.
        rep_id: ID of the field rep logging this interaction.
    """
    return {
        "tool": "log_interaction",
        "payload": {
            # "interaction_id": new_interaction_id,
            "hcp_id": hcp_id,
            "rep_id": rep_id,
            "interaction_type": interaction_type,
            "interaction_date": interaction_date,
            "duration_minutes": duration_minutes,
            "products_discussed": products_discussed or [],
            "topics_covered": topics_covered or [],
            "raw_notes": raw_notes,
            "samples_provided": samples_provided or [],
            "objections_raised": objections_raised or [],
        },
    }


@tool
def edit_interaction(
    interaction_id: Union[int, str],
    raw_notes: Optional[str] = None,
    products_discussed: Optional[List[str]] = None,
    topics_covered: Optional[List[str]] = None,
    duration_minutes: Optional[int] = None,
    next_steps: Optional[str] = None,
    follow_up_date: Optional[str] = None,
    samples_provided: Optional[List[str]] = None,
    objections_raised: Optional[List[str]] = None,
    status: Optional[str] = None,
) -> dict:
    """
    Edit/update an existing logged HCP interaction. Only provided fields are
    updated; omitted fields are left unchanged. The LLM re-generates the
    AI summary and re-extracts entities after the edit to keep AI metadata fresh.

    Args:
        interaction_id: The ID of the interaction to modify.
        raw_notes: Updated free-text notes.
        products_discussed: Updated product list.
        topics_covered: Updated topics list.
        duration_minutes: Corrected duration.
        next_steps: Agreed next steps after the interaction.
        follow_up_date: ISO datetime for the follow-up.
        samples_provided: Updated samples list.
        objections_raised: Updated objections list.
        status: New status: draft | completed | follow_up_required.
    """
    try:
        interaction_id = int(interaction_id)
    except (ValueError, TypeError):
        return {
            "tool": "edit_interaction",
            "error": f"Invalid interaction_id '{interaction_id}': must be a real integer ID, not a placeholder.",
        }
    updates = {}
    if raw_notes is not None:
        updates["raw_notes"] = raw_notes
    if products_discussed is not None:
        updates["products_discussed"] = products_discussed
    if topics_covered is not None:
        updates["topics_covered"] = topics_covered
    if duration_minutes is not None:
        updates["duration_minutes"] = duration_minutes
    if next_steps is not None:
        updates["next_steps"] = next_steps
    if follow_up_date is not None:
        updates["follow_up_date"] = follow_up_date
    if samples_provided is not None:
        updates["samples_provided"] = samples_provided
    if objections_raised is not None:
        updates["objections_raised"] = objections_raised
    if status is not None:
        updates["status"] = status

    return {
        "tool": "edit_interaction",
        "interaction_id": interaction_id,
        "updates": updates,
    }


@tool
def search_hcp_profile(
    hcp_id: Optional[int] = None,
    hcp_name: Optional[str] = None,
    specialty: Optional[str] = None,
) -> dict:
    """
    Search and retrieve detailed HCP profile information including contact details,
    specialty, institution, prescribing potential, territory, and recent
    interaction history. Used by the rep before or during an HCP visit.

    Args:
        hcp_id: Exact database ID of the HCP.
        hcp_name: Partial or full name to search by.
        specialty: Filter by medical specialty (e.g. Oncology, Cardiology).
    """
    db = SessionLocal()
    try:
        query = db.query(models.HCP)
        if hcp_id:
            query = query.filter(models.HCP.id == hcp_id)
        if hcp_name:
            query = query.filter(models.HCP.name.ilike(f"%{hcp_name}%"))
        if specialty:
            query = query.filter(models.HCP.specialty.ilike(f"%{specialty}%"))
        results = query.limit(5).all()

        if not results:
            return {
                "tool": "search_hcp_profile",
                "matches": [],
                "message": "No matching HCP found. Ask the user to confirm the spelling of the name.",
            }
        return {
            "tool": "search_hcp_profile",
            "matches": [
                {
                    "hcp_id": h.id,
                    "name": h.name,
                    "specialty": h.specialty,
                    "institution": h.institution,
                    "territory": h.territory,
                    "prescribing_potential": h.prescribing_potential,
                }
                for h in results
            ],
        }
    finally:
        db.close()


@tool
def schedule_follow_up(
    interaction_id: Union[int, str],
    follow_up_date: str,
    next_steps: str,
    reminder_note: Optional[str] = None,
) -> dict:
    """
    Set a follow-up date and define next steps for a completed or pending HCP
    interaction. Marks the interaction as 'follow_up_required' and logs the
    agreed action items so the rep sees them on their dashboard.

    Args:
        interaction_id: The interaction to attach the follow-up to.
        follow_up_date: ISO datetime string for the scheduled follow-up.
        next_steps: Description of what the rep needs to do (e.g. send clinical study).
        reminder_note: Optional additional note for the reminder.
    """
    try:
        interaction_id = int(interaction_id)
    except (ValueError, TypeError):
        return {
            "tool": "schedule_follow_up",
            "error": f"Invalid interaction_id '{interaction_id}': must be real integer ID returned from log_interaction, not a placeholder."
        }
    return {
        "tool": "schedule_follow_up",
        "interaction_id": interaction_id,
        "follow_up_date": follow_up_date,
        "next_steps": next_steps,
        "reminder_note": reminder_note,
        "status_update": "follow_up_required",
    }


@tool
def get_sales_insights(
    hcp_id: Optional[int] = None,
    territory: Optional[str] = None,
    product: Optional[str] = None,
    time_period_days: int = 90,
) -> dict:
    """
    Generate AI-powered sales insights for a specific HCP, territory, or product.
    Analyzes past interaction data, sentiment trends, prescribing potential,
    and engagement frequency to surface actionable recommendations for the rep.

    Args:
        hcp_id: Analyze insights for a specific HCP.
        territory: Analyze all HCPs in a territory.
        product: Filter insights to a specific product discussion.
        time_period_days: How many days back to analyze (default 90 days).
    """
    return {
        "tool": "get_sales_insights",
        "query": {
            "hcp_id": hcp_id,
            "territory": territory,
            "product": product,
            "time_period_days": time_period_days,
        },
    }


ALL_TOOLS = [
    log_interaction,
    edit_interaction,
    search_hcp_profile,
    schedule_follow_up,
    get_sales_insights,
]
