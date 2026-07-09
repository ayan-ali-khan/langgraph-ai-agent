from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routers import interactions, hcps, agent

app = FastAPI(
    title="AI-First CRM – HCP Module",
    description="LangGraph-powered CRM for Life Sciences field reps",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(hcps.router)
app.include_router(interactions.router)
app.include_router(agent.router)


@app.on_event("startup")
def startup():
    init_db()


@app.get("/health")
def health():
    return {"status": "ok", "service": "AI-First CRM HCP Module"}
