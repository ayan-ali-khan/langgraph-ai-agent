from typing import TypedDict, List, Optional, Annotated, Any, Dict
from langchain_core.messages import BaseMessage
import operator


class AgentState(TypedDict):
    """State maintained throughout the LangGraph agent execution."""
    messages: Annotated[List[BaseMessage], operator.add]
    hcp_id: Optional[int]
    interaction_id: Optional[int]
    interaction_data: Optional[Dict[str, Any]]
    action_taken: Optional[str]
    requires_confirmation: bool
    db_session: Any  # SQLAlchemy session passed through state
    error: Optional[str]
