# AI-First CRM — HCP Module

A production-ready, AI-first Customer Relationship Management system built for **Life Sciences field representatives**. The HCP (Healthcare Professional) module centres on a **Log Interaction screen** that lets reps capture visits, calls, and meetings either through a structured form or a natural-language AI chat that extracts data and pre-fills the form automatically.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Features](#features)
- [LangGraph AI Agent](#langgraph-ai-agent)
  - [Agent Graph Flow](#agent-graph-flow)
  - [Tool 1 — log\_interaction](#tool-1--log_interaction)
  - [Tool 2 — edit\_interaction](#tool-2--edit_interaction)
  - [Tool 3 — search\_hcp\_profile](#tool-3--search_hcp_profile)
  - [Tool 4 — schedule\_follow\_up](#tool-4--schedule_follow_up)
  - [Tool 5 — get\_sales\_insights](#tool-5--get_sales_insights)
- [AI Enrichment Pipeline](#ai-enrichment-pipeline)
- [AI Form Pre-fill Flow](#ai-form-pre-fill-flow)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Frontend State Management](#frontend-state-management)
- [Setup & Running](#setup--running)
- [Environment Variables](#environment-variables)

---

## Overview

Pharmaceutical field reps spend a significant portion of their day manually logging details after HCP visits. This system eliminates that friction by allowing the rep to describe an interaction in plain English — the AI agent extracts every relevant field (HCP identity, products discussed, objections raised, sentiment, next steps) and pre-fills the form. The rep reviews, makes any corrections, and clicks **Log Interaction** to save.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Redux Toolkit, React Router v6, Vite, CSS Modules |
| **Font** | Google Inter (loaded via CDN) |
| **Backend** | Python 3.13, FastAPI, Uvicorn |
| **AI Agent** | LangGraph 1.2+ |
| **LLM** | Groq — `llama-3.3-70b-versatile` (primary & secondary) |
| **LangChain** | langchain 1.3+, langchain-groq 1.1+, langchain-core 1.4+ |
| **Database** | PostgreSQL (Neon serverless) via SQLAlchemy 2.0 |
| **ORM** | SQLAlchemy + Alembic |
| **HTTP Client** | Axios (frontend), HTTPX (backend) |
| **Validation** | Pydantic v2, pydantic-settings |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (React)                         │
│                                                             │
│  ┌──────────────────────┐  │  ┌──────────────────────────┐  │
│  │   Interaction Form   │  │  │     AI Side Panel        │  │
│  │  (structured input)  │  │  │  (conversational chat)   │  │
│  └──────────┬───────────┘  │  └────────────┬─────────────┘  │
│             │ Redux store  │               │                 │
│        interactionSlice    │          agentSlice             │
│     prefillData ←──────────┼──── prefillForm() dispatch     │
└─────────────┼──────────────┼───────────────┼────────────────┘
              │              │               │
              │  POST /interactions/   POST /agent/chat
              │                             │
┌─────────────▼─────────────────────────────▼────────────────┐
│                      FastAPI Backend                        │
│                                                             │
│   /hcps/          /interactions/          /agent/chat       │
│                         │                      │            │
│              AI Enrichment (Groq LLM)    LangGraph Agent    │
│              • Summarise notes           • 5 tools          │
│              • Extract entities          • Tool routing     │
│              • Score sentiment           • HCP resolution   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                ┌─────────▼──────────┐
                │  PostgreSQL (Neon)  │
                │  hcps              │
                │  interactions      │
                │  reps              │
                └────────────────────┘
```

---

## Project Structure

```
langgraph-ai-agent/
│
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, startup
│   │   ├── config.py            # Pydantic settings (reads .env)
│   │   ├── database.py          # SQLAlchemy engine with pool_pre_ping
│   │   ├── models.py            # ORM models: HCP, Interaction, Rep
│   │   ├── schemas.py           # Pydantic request/response schemas
│   │   │
│   │   ├── agent/
│   │   │   ├── state.py         # AgentState TypedDict
│   │   │   ├── tools.py         # 5 LangGraph @tool functions
│   │   │   ├── graph.py         # StateGraph definition + compilation
│   │   │   └── enrichment.py   # LLM summarisation + entity extraction
│   │   │
│   │   └── routers/
│   │       ├── hcps.py          # CRUD for HCP profiles
│   │       ├── interactions.py  # CRUD + AI enrichment for interactions
│   │       └── agent.py        # /agent/chat — LangGraph execution
│   │
│   ├── seed.py                  # Dev data seeder (7 HCPs, 2 reps)
│   ├── setup.bat                # One-click venv + dependency install
│   ├── run.bat                  # Start uvicorn dev server
│   ├── seed.bat                 # Run seeder via venv Python
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── main.jsx             # React + Redux Provider entry point
    │   ├── App.jsx              # Router with two routes
    │   │
    │   ├── styles/
    │   │   └── globals.css      # CSS custom properties + resets
    │   │
    │   ├── services/
    │   │   └── api.js           # Axios instance proxied to /api
    │   │
    │   ├── store/
    │   │   ├── store.js         # Redux configureStore
    │   │   ├── interactionSlice.js  # Interactions + prefillData state
    │   │   ├── agentSlice.js    # Chat messages + loading state
    │   │   └── hcpSlice.js      # HCP list
    │   │
    │   ├── components/
    │   │   ├── Layout/
    │   │   │   ├── Layout.jsx   # Sidebar nav + main area shell
    │   │   │   └── Layout.module.css
    │   │   │
    │   │   └── LogInteraction/
    │   │       ├── InteractionForm.jsx      # Structured form
    │   │       ├── InteractionForm.module.css
    │   │       ├── AISidePanel.jsx          # Chat panel
    │   │       ├── AISidePanel.module.css
    │   │       ├── ChatInterface.jsx        # (legacy, unused)
    │   │       └── ChatMessage.jsx          # (legacy, unused)
    │   │
    │   └── pages/
    │       ├── LogInteractionPage.jsx       # Split-panel layout
    │       ├── LogInteractionPage.module.css
    │       ├── InteractionsListPage.jsx     # Expandable cards list
    │       └── InteractionsListPage.module.css
    │
    ├── index.html               # Google Inter font link
    ├── vite.config.js           # Vite + /api proxy to :8000
    └── package.json
```

---

## Features

### Log Interaction Screen — Split Panel

The screen is split into two permanently visible panes separated by a 1px divider:

**Left pane — Structured Form**
- HCP Name searchable dropdown (live filter by name + specialty)
- Interaction Type select (Face-to-Face, Phone Call, Virtual Meeting, Email, Conference)
- Date + Time pickers side by side
- Attendees free text
- Topics Discussed textarea with voice note placeholder button
- Materials Shared / Samples Distributed section with tag management
- Products Discussed chip picker (toggle multi-select)
- Objections / Concerns Raised inline tag input
- Interaction Notes textarea (marked with AI auto-summarises hint)
- Next Steps + Follow-Up Date side by side
- Status select (Completed / Draft / Follow-Up Required)
- Submit button: **Log Interaction** / **Update Interaction**

**Right pane — AI Assistant**
- Always visible alongside the form, no tab switching required
- Welcome bubble with usage example on empty state
- Conversational message history (user = blue bubble, assistant = grey bubble)
- Typing indicator with animated dots during LLM processing
- Pre-fill confirmation chip with purple arrow pointing left after form fill
- `A / Log` send button styled to match the original design reference
- Clear chat button

### AI Form Pre-fill
When a rep describes an interaction conversationally (e.g. *"Met Dr. Sarah Chen today, discussed OncoClear dosing, she raised concerns about the side effect profile, gave her a brochure"*):
1. Agent extracts all structured fields
2. Backend resolves the HCP by name if no ID is provided
3. Returns `prefill_form: true` — does **not** save anything
4. Frontend populates every form field with a purple pulse highlight animation
5. Purple AI banner appears at the top of the form
6. Rep reviews, edits if needed, clicks **Log Interaction** to save manually

### Interactions List
- Expandable card list ordered by date descending
- Each card shows: HCP name, specialty, interaction type icon, date, duration
- Sentiment indicator: ↑ positive / → neutral / ↓ negative with colour coding
- Status badge (Completed / Draft / Follow-Up Required)
- Expanded view shows: AI-generated summary, product tags, objection tags, next steps, raw notes
- Edit button loads interaction back into the form (edit mode)
- Delete with confirmation

### Sidebar Navigation
- Dark sidebar with PharmaAI CRM branding
- Active route highlight
- AI Agent Active pulse indicator
- Logged-in rep info (name, territory)

---

## LangGraph AI Agent

The agent is a compiled `StateGraph` that routes between an LLM node and a tool execution node in a loop until the LLM decides to stop calling tools.

### Agent Graph Flow

```
User message
     │
     ▼
┌─────────────┐
│  agent_node │  ← ChatGroq (llama-3.3-70b-versatile) with 5 bound tools
│  (LLM)      │
└──────┬──────┘
       │
       ├─── has tool_calls? ──► tools_node (ToolNode executes the tool)
       │                              │
       │                              ▼
       │                    process_results node
       │                    (parses tool output → updates state)
       │                              │
       │◄─────────────────────────────┘
       │
       └─── no tool_calls? ──► END
```

### State

```python
class AgentState(TypedDict):
    messages: List[BaseMessage]   # full conversation + tool messages
    hcp_id: Optional[int]         # context HCP id from the request
    interaction_id: Optional[int] # context interaction id
    interaction_data: Optional[Dict]  # last extracted tool payload
    action_taken: Optional[str]   # which tool was last called
    requires_confirmation: bool
    db_session: Any
    error: Optional[str]
```

### System Prompt Highlights

The LLM is instructed to:
- **Never invent an `hcp_id`** — always call `search_hcp_profile` first if only a name is given
- Extract products, objections, sentiment from free-text automatically
- Map natural language visit descriptions to `log_interaction` tool calls
- Use `schedule_follow_up` whenever next-step language is detected
- Be clinically aware and professionally concise

---

### Tool 1 — `log_interaction`

**Purpose:** Extract and structure a new HCP interaction from free-text rep notes.

**Inputs:**
| Parameter | Type | Description |
|---|---|---|
| `hcp_id` | int \| str | Database ID of the HCP |
| `interaction_type` | str | `face_to_face` \| `phone_call` \| `virtual_meeting` \| `email` \| `conference` |
| `raw_notes` | str | Free-text notes from the rep |
| `interaction_date` | str | ISO datetime string |
| `products_discussed` | list[str] | Product names mentioned |
| `topics_covered` | list[str] | Clinical topics (dosing, efficacy, side effects…) |
| `duration_minutes` | int | How long the interaction lasted |
| `samples_provided` | list[str] | Drug samples handed to the HCP |
| `objections_raised` | list[str] | HCP objections or concerns |
| `rep_id` | int | Rep logging the interaction |

**What happens after the tool returns:**
- The backend router intercepts the tool result
- It resolves the HCP by numeric ID or by fuzzy name match against the database
- Builds a clean `prefill` dict and returns `prefill_form: true` to the frontend
- **Nothing is saved to the database at this point** — the rep is in control

---

### Tool 2 — `edit_interaction`

**Purpose:** Modify specific fields on an existing saved interaction. Only provided fields are updated; omitted fields stay unchanged.

**Inputs:**
| Parameter | Type | Description |
|---|---|---|
| `interaction_id` | int | ID of the interaction to edit |
| `raw_notes` | str | Updated notes (triggers LLM re-enrichment) |
| `products_discussed` | list[str] | Replacement product list |
| `topics_covered` | list[str] | Replacement topic list |
| `duration_minutes` | int | Corrected duration |
| `next_steps` | str | Updated next steps |
| `follow_up_date` | str | ISO datetime for follow-up |
| `samples_provided` | list[str] | Updated samples list |
| `objections_raised` | list[str] | Updated objections list |
| `status` | str | `draft` \| `completed` \| `follow_up_required` |

**What happens after the tool returns:**
- Backend applies only the provided fields via a safe allowlist
- If `raw_notes` changed, the AI enrichment pipeline re-runs automatically
- New `ai_summary`, `ai_extracted_entities`, and `sentiment_score` are written back
- The updated interaction ID is returned to the frontend

---

### Tool 3 — `search_hcp_profile`

**Purpose:** Look up HCP profiles by ID, partial name, or specialty. Used by the agent before calling `log_interaction` when only a doctor name is known.

**Inputs:**
| Parameter | Type | Description |
|---|---|---|
| `hcp_id` | int | Exact database ID |
| `hcp_name` | str | Partial or full name (case-insensitive ILIKE) |
| `specialty` | str | Filter by specialty (e.g. Oncology, Cardiology) |

**Returns:** Up to 5 matching HCP profiles with:
- `hcp_id`, `name`, `specialty`, `institution`, `territory`, `prescribing_potential`

The agent uses this result to obtain a real numeric `hcp_id` before calling `log_interaction`.

---

### Tool 4 — `schedule_follow_up`

**Purpose:** Attach a follow-up date and next steps to a logged interaction, marking it as `follow_up_required`.

**Inputs:**
| Parameter | Type | Description |
|---|---|---|
| `interaction_id` | int | The interaction to attach follow-up to |
| `follow_up_date` | str | ISO datetime for the scheduled follow-up |
| `next_steps` | str | What the rep needs to do (e.g. "Send Phase III study PDF") |
| `reminder_note` | str | Optional additional context |

**What it does:** Sets the interaction status to `follow_up_required` and records the agreed action items so they appear on the rep's dashboard.

---

### Tool 5 — `get_sales_insights`

**Purpose:** Generate AI-powered engagement analytics for an HCP, territory, or product. Surfaces actionable recommendations based on past interaction patterns, sentiment trends, and prescribing potential.

**Inputs:**
| Parameter | Type | Description |
|---|---|---|
| `hcp_id` | int | Analyse a specific HCP |
| `territory` | str | Analyse all HCPs in a territory |
| `product` | str | Filter to a specific product discussion |
| `time_period_days` | int | How far back to look (default: 90 days) |

---

## AI Enrichment Pipeline

Every time an interaction is **saved** (via the form submit, not the chat), the backend runs an enrichment call using the Groq LLM:

```
raw_notes + products_discussed
        │
        ▼
  ChatGroq (llama-3.3-70b-versatile, temp=0.1)
        │
        ▼
  Structured JSON response:
  {
    "summary": "2-3 sentence professional summary",
    "entities": {
      "products_mentioned": [...],
      "objections": [...],
      "clinical_topics": [...],
      "samples_given": [...],
      "sentiment": "positive | neutral | negative",
      "sentiment_score": 0.0–1.0,
      "next_steps_mentioned": "..."
    }
  }
        │
        ▼
  Stored in: ai_summary, ai_extracted_entities, sentiment_score
```

The enrichment also re-runs automatically on `edit_interaction` whenever `raw_notes` changes.

---

## AI Form Pre-fill Flow

```
Rep types in chat:
  "Met Dr. Sarah Chen today, discussed OncoClear dosing,
   she raised concerns about side effects, gave her a brochure"
         │
         ▼
  AISidePanel.handleSend()
  → dispatch(addUserMessage)
  → dispatch(sendAgentMessage) → POST /agent/chat
         │
         ▼
  Backend: LangGraph graph.invoke()
  → agent_node calls search_hcp_profile("Dr. Sarah Chen")
  → gets hcp_id = 1
  → agent_node calls log_interaction(hcp_id=1, ...)
  → process_results extracts payload
         │
         ▼
  agent.py router:
  → resolves HCP from hcp_id or name
  → builds prefill dict
  → returns { prefill_form: true, interaction_data: {...} }
  → does NOT write to DB
         │
         ▼
  AISidePanel receives response:
  → payload.prefill_form === true
  → dispatch(prefillForm(payload.interaction_data))
         │
         ▼
  InteractionForm useEffect detects prefillData change:
  → populates all form fields
  → sets hcpSearch to resolved HCP name
  → sets aiFilled = true
  → purple pulse animation on filled fields
  → purple AI banner shown at top of form
         │
         ▼
  Rep reviews → edits if needed → clicks "Log Interaction"
         │
         ▼
  POST /interactions/ → saved with AI enrichment
  → dispatch(clearPrefill())
  → banner dismissed
```

---

## API Endpoints

### HCPs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/hcps/` | List all HCPs (filter by specialty, territory, search) |
| `POST` | `/hcps/` | Create a new HCP |
| `GET` | `/hcps/{id}` | Get HCP by ID |
| `PATCH` | `/hcps/{id}` | Update HCP fields |

### Interactions

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/interactions/` | List interactions (filter by hcp_id, rep_id, pagination) |
| `POST` | `/interactions/` | Create + AI-enrich a new interaction |
| `GET` | `/interactions/{id}` | Get single interaction |
| `PATCH` | `/interactions/{id}` | Partial update (re-enriches if notes changed) |
| `DELETE` | `/interactions/{id}` | Delete interaction |

### Agent

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/agent/chat` | Send message to LangGraph agent. Returns AI reply + optional `prefill_form` data |

**`POST /agent/chat` request body:**
```json
{
  "message": "string",
  "conversation_history": [{ "role": "user|assistant", "content": "string" }],
  "hcp_id": 1,
  "interaction_id": null,
  "rep_id": 1
}
```

**`POST /agent/chat` response:**
```json
{
  "message": "I've pre-filled the form for Dr. Sarah Chen...",
  "action_taken": "log_interaction",
  "interaction_data": { "hcp_id": 1, "hcp_name": "Dr. Sarah Chen", ... },
  "interaction_id": null,
  "requires_confirmation": false,
  "prefill_form": true
}
```

---

## Database Schema

### `hcps`
| Column | Type | Notes |
|---|---|---|
| `id` | integer PK | Auto-increment |
| `name` | varchar(200) | Required |
| `specialty` | varchar(100) | e.g. Oncology, Cardiology |
| `institution` | varchar(200) | Hospital/clinic |
| `email` | varchar(150) | Unique |
| `phone` | varchar(30) | |
| `territory` | varchar(100) | Sales territory |
| `npi_number` | varchar(20) | Unique NPI identifier |
| `prescribing_potential` | varchar(20) | `low` / `medium` / `high` |
| `created_at` | timestamptz | Server default |

### `interactions`
| Column | Type | Notes |
|---|---|---|
| `id` | integer PK | Auto-increment |
| `hcp_id` | integer FK | → hcps.id |
| `rep_id` | integer FK | → reps.id (nullable) |
| `interaction_type` | enum | `face_to_face`, `phone_call`, `virtual_meeting`, `email`, `conference` |
| `status` | enum | `draft`, `completed`, `follow_up_required` |
| `interaction_date` | timestamptz | Required |
| `duration_minutes` | integer | |
| `products_discussed` | JSON | `[]` |
| `topics_covered` | JSON | `[]` |
| `raw_notes` | text | Rep's original free-text |
| `ai_summary` | text | LLM-generated summary |
| `ai_extracted_entities` | JSON | Products, objections, clinical topics, sentiment |
| `sentiment_score` | float | 0.0 (negative) – 1.0 (positive) |
| `next_steps` | text | |
| `follow_up_date` | timestamptz | |
| `samples_provided` | JSON | `[]` |
| `objections_raised` | JSON | `[]` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | Auto on update |

### `reps`
| Column | Type | Notes |
|---|---|---|
| `id` | integer PK | |
| `name` | varchar(200) | |
| `email` | varchar(150) | Unique |
| `territory` | varchar(100) | |
| `region` | varchar(100) | |
| `created_at` | timestamptz | |

---

## Frontend State Management

### Redux Store

```
store
├── hcps
│   ├── list: HCP[]
│   ├── loading: bool
│   └── selectedHcpId: int | null
│
├── interactions
│   ├── list: Interaction[]
│   ├── selected: Interaction | null    ← edit mode target
│   ├── formMode: 'create' | 'edit'
│   ├── prefillData: object | null      ← AI-extracted data for form fill
│   └── loading: bool
│
└── agent
    ├── messages: Message[]             ← { role, content, meta }
    │   meta: {
    │     action_taken: string,
    │     interaction_id: int,
    │     interaction_data: object,
    │     prefill_form: bool            ← triggers form population
    │   }
    ├── loading: bool
    ├── lastAction: string
    └── lastInteractionId: int
```

### Key Actions

| Action | Slice | Effect |
|---|---|---|
| `prefillForm(data)` | interactions | Sets `prefillData` → form populates via `useEffect` |
| `clearPrefill()` | interactions | Clears `prefillData` after save or dismiss |
| `setSelected(interaction)` | interactions | Loads interaction into form for editing |
| `sendAgentMessage(...)` | agent | `POST /agent/chat` → on response dispatches `prefillForm` if `prefill_form: true` |
| `addUserMessage(text)` | agent | Adds user bubble immediately before API response |
| `clearChat()` | agent | Resets conversation history |

---

## Setup & Running

### Prerequisites
- Python 3.11+ (tested on 3.13)
- Node.js 18+
- PostgreSQL database (local or Neon serverless)
- Groq API key — [console.groq.com](https://console.groq.com)

### Backend

```bat
cd backend

# 1. Create venv and install all dependencies
setup.bat

# 2. Configure environment
copy .env.example .env
# Edit .env: set DATABASE_URL and GROQ_API_KEY

# 3. Seed sample data (7 HCPs, 2 reps)
seed.bat

# 4. Start the API server (port 8000)
run.bat
```

API will be available at `http://localhost:8000`  
Interactive docs: `http://localhost:8000/docs`

### Frontend

```bat
cd frontend
npm install
npm run dev
```

App will be available at `http://localhost:5173`

The Vite dev server proxies all `/api/*` requests to `http://localhost:8000`, so no CORS configuration is needed during development.

---

## Environment Variables

Create `backend/.env` from `.env.example`:

```env
# PostgreSQL connection string
# For Neon: include ?sslmode=require&channel_binding=require
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require

# Groq API key — get from https://console.groq.com
GROQ_API_KEY=gsk_...

# App secret (used for future auth)
SECRET_KEY=your-secret-key-here

# Environment
ENVIRONMENT=development
```

### Notes on Neon Serverless PostgreSQL

The database engine is configured with:
- `pool_pre_ping=True` — reconnects automatically if the serverless instance suspended
- `pool_recycle=300` — recycles connections older than 5 minutes
- `connect_args={"sslmode": "require", "connect_timeout": 10}` — enforces SSL

This prevents the `SSL connection has been closed unexpectedly` errors common with Neon's auto-suspend behaviour.

---

## Seeded Sample Data

Running `seed.bat` inserts:

**Reps:**
- Alex Johnson — Northeast / US East
- Maria Garcia — Southwest / US West

**HCPs:**
| Name | Specialty | Institution | Prescribing Potential |
|---|---|---|---|
| Dr. Sarah Chen | Oncology | Mass General Hospital | High |
| Dr. James Patel | Cardiology | Cleveland Clinic | Medium |
| Dr. Lisa Wong | Rheumatology | UCSF Medical Center | High |
| Dr. Michael Torres | Neurology | Mayo Clinic | Low |
| Dr. Emily Roberts | Hematology | Johns Hopkins | High |
| Dr. David Kim | Oncology | MD Anderson Cancer Center | High |
| Dr. Rachel Foster | Cardiology | Stanford Medical Center | Medium |
