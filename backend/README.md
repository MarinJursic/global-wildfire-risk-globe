# EMBER API

The FastAPI service exposes deterministic, typed demonstration contracts for the
frontend. It runs without credentials and intentionally avoids presenting synthetic
values as live observations.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
uvicorn app.main:app --reload --port 8000
```

Interactive OpenAPI documentation is available at
`http://localhost:8000/docs`.
