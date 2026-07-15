from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routers import interactions, hcps, agent
from app.config import get_settings

settings = get_settings()

app = FastAPI(
    title="AI-First CRM – HCP Module",
    description="LangGraph-powered CRM for Life Sciences field reps",
    version="1.0.0",
)

# Allow all origins in production (same-domain via Vercel rewrites),
# restrict to localhost in development.
origins = (
    ["*"]
    if settings.environment == "production"
    else ["http://localhost:5173", "http://localhost:3000"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=settings.environment != "production",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(hcps.router, prefix="/api")
app.include_router(interactions.router, prefix="/api")
app.include_router(agent.router, prefix="/api")


@app.on_event("startup")
def startup():
    init_db()


@app.get("/health")
def health():
    return {"status": "ok", "service": "AI-First CRM HCP Module"}
