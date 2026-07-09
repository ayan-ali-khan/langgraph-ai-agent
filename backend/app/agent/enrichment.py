"""
LLM-powered enrichment utilities.
- Summarize raw interaction notes
- Extract entities (products, objections, sentiment)
"""

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from app.config import get_settings
import json
import logging

logger = logging.getLogger(__name__)
settings = get_settings()


def get_llm():
    return ChatGroq(
        model=settings.groq_model_primary,
        api_key=settings.groq_api_key,
        temperature=0.1,
    )


SUMMARIZE_PROMPT = """You are a Life Sciences CRM AI. Given raw notes from a pharmaceutical 
field rep's interaction with a Healthcare Professional, produce:
1. A concise professional summary (2-3 sentences).
2. JSON with extracted entities.

Return ONLY valid JSON in this format:
{
  "summary": "...",
  "entities": {
    "products_mentioned": [],
    "objections": [],
    "clinical_topics": [],
    "samples_given": [],
    "sentiment": "positive|neutral|negative",
    "sentiment_score": 0.0,
    "next_steps_mentioned": "..."
  }
}"""


def enrich_interaction(raw_notes: str, products_discussed: list = None) -> dict:
    """
    Use Groq LLM to summarize notes and extract entities from an interaction.
    Returns dict with 'summary', 'entities', and 'sentiment_score'.
    """
    if not raw_notes or not raw_notes.strip():
        return {"summary": "", "entities": {}, "sentiment_score": 0.5}

    context = f"Products discussed: {', '.join(products_discussed or [])}\n\nRaw Notes:\n{raw_notes}"

    try:
        llm = get_llm()
        response = llm.invoke([
            SystemMessage(content=SUMMARIZE_PROMPT),
            HumanMessage(content=context),
        ])
        content = response.content.strip()

        # Strip markdown code fences if present
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:-1]) if lines[-1] == "```" else "\n".join(lines[1:])

        parsed = json.loads(content)
        entities = parsed.get("entities", {})
        sentiment_map = {"positive": 0.8, "neutral": 0.5, "negative": 0.2}
        sentiment_score = entities.get(
            "sentiment_score",
            sentiment_map.get(entities.get("sentiment", "neutral"), 0.5),
        )

        return {
            "summary": parsed.get("summary", ""),
            "entities": entities,
            "sentiment_score": float(sentiment_score),
        }
    except Exception as e:
        logger.error(f"LLM enrichment failed: {e}")
        return {"summary": raw_notes[:200], "entities": {}, "sentiment_score": 0.5}
