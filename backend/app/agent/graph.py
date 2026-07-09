"""
LangGraph Agent Graph for HCP CRM.

Flow:
  user message → agent_node (LLM with tools) → tool_node (execute tools) → agent_node → ...
  until the LLM stops calling tools → END
"""

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from app.agent.state import AgentState
from app.agent.tools import ALL_TOOLS
from app.config import get_settings
from typing import Literal
import json
import logging

logger = logging.getLogger(__name__)
settings = get_settings()

SYSTEM_PROMPT = """You are an AI assistant embedded in a Life Sciences CRM system, 
helping pharmaceutical field representatives manage their HCP (Healthcare Professional) interactions.

You have access to the following tools:
1. log_interaction      – Log a new interaction with an HCP
2. edit_interaction     – Edit an existing interaction
3. search_hcp_profile   – Look up HCP details and history
4. schedule_follow_up   – Set a follow-up date and next steps
5. get_sales_insights   – Get AI-powered insights on HCP engagement and territory

Guidelines:
- Be concise, professional, and clinically aware.
- Always confirm key details (HCP name, product, date) before logging.
- Extract products, objections, and sentiment from free-text notes automatically.
- When the user describes a visit or call in natural language, map it to a log_interaction call.
- When follow-up actions are mentioned, use schedule_follow_up.
- Provide brief summaries after each action to confirm what was recorded.
- Today's date context: use the interaction_date from the user or default to today.
"""


def build_llm():
    return ChatGroq(
        model=settings.groq_model_primary,
        api_key=settings.groq_api_key,
        temperature=0.2,
    ).bind_tools(ALL_TOOLS)


def agent_node(state: AgentState) -> AgentState:
    """Main LLM reasoning node — decides what tool to call (or to respond)."""
    llm = build_llm()
    messages = [SystemMessage(content=SYSTEM_PROMPT)] + state["messages"]

    try:
        response = llm.invoke(messages)
    except Exception as e:
        logger.error(f"LLM error: {e}")
        from langchain_core.messages import AIMessage
        response = AIMessage(content=f"I encountered an error: {str(e)}")

    return {"messages": [response]}


def should_continue(state: AgentState) -> Literal["tools", "__end__"]:
    """Route: if last message has tool calls → run tools, else → end."""
    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return "__end__"


def process_tool_results(state: AgentState) -> AgentState:
    """
    After ToolNode executes, parse tool results and update state fields
    (interaction_data, action_taken, interaction_id).
    """
    updates = {}
    for msg in reversed(state["messages"]):
        if isinstance(msg, ToolMessage):
            try:
                result = json.loads(msg.content)
                tool_name = result.get("tool", "")
                if tool_name == "log_interaction":
                    updates["action_taken"] = "log_interaction"
                    updates["interaction_data"] = result.get("payload", {})
                elif tool_name == "edit_interaction":
                    updates["action_taken"] = "edit_interaction"
                    updates["interaction_id"] = result.get("interaction_id")
                    updates["interaction_data"] = result.get("updates", {})
                elif tool_name == "schedule_follow_up":
                    updates["action_taken"] = "schedule_follow_up"
                elif tool_name == "search_hcp_profile":
                    updates["action_taken"] = "search_hcp_profile"
                elif tool_name == "get_sales_insights":
                    updates["action_taken"] = "get_sales_insights"
            except Exception:
                pass
            break
    return updates


def build_graph():
    """Build and compile the LangGraph agent graph."""
    tool_node = ToolNode(ALL_TOOLS)

    graph = StateGraph(AgentState)
    graph.add_node("agent", agent_node)
    graph.add_node("tools", tool_node)
    graph.add_node("process_results", process_tool_results)

    graph.set_entry_point("agent")
    graph.add_conditional_edges(
        "agent",
        should_continue,
        {"tools": "tools", "__end__": END},
    )
    graph.add_edge("tools", "process_results")
    graph.add_edge("process_results", "agent")

    return graph.compile()


# Singleton compiled graph
_graph = None


def get_graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph
