@echo off
echo Setting up AI-First CRM HCP Backend...

if not exist "venv\Scripts\activate.bat" (
    python -m venv venv
    echo Created virtual environment.
)

call venv\Scripts\activate.bat

echo Upgrading pip...
python -m pip install --upgrade pip

echo Installing psycopg2-binary (pre-built wheel only)...
python -m pip install --only-binary=psycopg2-binary psycopg2-binary

echo Installing all dependencies...
python -m pip install fastapi "uvicorn[standard]" sqlalchemy alembic ^
    python-dotenv pydantic pydantic-settings httpx python-multipart ^
    groq "langchain>=0.3.0" "langchain-groq>=0.2.0" ^
    "langgraph>=0.2.0" "langchain-core>=0.3.0" --prefer-binary

echo.
echo Backend setup complete.
echo.
echo Next steps:
echo 1. Copy .env.example to .env and set GROQ_API_KEY + DATABASE_URL
echo 2. Start PostgreSQL and create database 'crm_hcp'
echo 3. Run: python seed.py
echo 4. Run: run.bat
