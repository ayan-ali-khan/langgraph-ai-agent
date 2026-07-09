@echo off
echo Setting up AI-First CRM HCP Backend...
python -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt
echo.
echo Backend setup complete.
echo.
echo Next steps:
echo 1. Copy .env.example to .env and fill in your GROQ_API_KEY and DATABASE_URL
echo 2. Make sure PostgreSQL is running with database 'crm_hcp'
echo 3. Run: python seed.py  (to seed sample HCPs)
echo 4. Run: uvicorn app.main:app --reload --port 8000
