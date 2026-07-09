# AI-First CRM – HCP Module (Log Interaction Screen)

## Tech Stack
- **Frontend**: React + Redux + Google Inter font
- **Backend**: Python + FastAPI
- **AI Agent**: LangGraph
- **LLM**: Groq (gemma2-9b-it / llama-3.3-70b-versatile)
- **Database**: PostgreSQL

## Project Structure
```
langgraph-ai-agent/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── routers/
│   │   │   ├── interactions.py
│   │   │   └── agent.py
│   │   └── agent/
│   │       ├── graph.py
│   │       ├── state.py
│   │       └── tools.py
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── store/
    │   ├── pages/
    │   └── App.jsx
    ├── package.json
    └── index.html
```

## Setup
See backend/README.md and frontend/README.md for setup instructions.
