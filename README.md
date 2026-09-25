# ER Recall

Emergency-room patient recall prototype: RBAC-gated, multi-provider medical record retrieval, biometric-simulated identity resolution, and a record-grounded AI review assistant. **Prototype only — not for clinical use. All patient data is synthetic.**

## Stack

- **Backend**: FastAPI (Python 3.13) + SQLAlchemy + SQLite (dev) / Postgres-ready, JWT auth, pytest test suite (31 tests, all passing).
- **Frontend**: React + TypeScript + Vite + Tailwind, wired to the backend via axios (`frontend/src/services/api.ts`).
- **AI review assistant**: Retrieval-augmented generation over a patient's own records, with an optional local Ollama model; degrades gracefully to a templated grounded answer when Ollama is unavailable.

## Running locally

### Backend

```bash
cd backend
python -m venv venv && venv\Scripts\activate   # Windows
pip install -r requirements.txt
python -m pytest -v          # 31 passed
uvicorn main:app --reload --port 8000
```

API docs: `http://localhost:8000/docs`. Base path for all endpoints: `/api/v1`.

### Frontend

```bash
cd frontend
npm install
npm run build     # type-checks + production build
npm run dev        # dev server on :5173, proxies to VITE_API_URL
```

Set `VITE_API_URL` (defaults to `http://localhost:8000/api/v1`) in `frontend/.env` if the backend runs elsewhere.

### Demo credentials

| Username      | Password      | Role    |
|---------------|---------------|---------|
| dr_smith      | password123   | CLINICIAN |
| admin         | password123   | ADMIN     |
| staff_jones   | password123   | STAFF     |

### Demo identity-verification fingerprints

Used on the Identity screen (`POST /api/v1/identity/fingerprint/verify`):

- `DEMO-FP-001` … `DEMO-FP-004` — resolve to seeded demo patients.
- `DEMO-FP-TIMEOUT` — simulates a `504` provider timeout.
- `DEMO-FP-UNAVAILABLE` — simulates a `503` provider-unavailable error.

## Flow

1. **Login** (`/login`) — real JWT auth against `POST /api/v1/auth/login` (OAuth2 password form).
2. **Identity verification** (`/identity`) — biometric simulation state machine (IDLE → SCANNING → VERIFYING → SUCCESS/FAILURE/TIMEOUT/ERROR) against `POST /api/v1/identity/fingerprint/verify`. On success, routes to `/dashboard/:id`.
3. **Dashboard** (`/dashboard/:id`) — fetches the real patient (`GET /api/v1/patients/{id}`) and records (`GET /api/v1/patients/{id}/records`), renders critical alerts/allergies/medications/surgeries/timeline from real data, and includes a "Medical Review" chat panel wired to `POST /api/v1/patients/{id}/rag` with quick-question presets (Cardiac History, Medications, Allergies, Surgeries).

## Known limitations

- Provider integrations (ABDM sandbox, hospital EMRs) are mocked — see `backend/app/providers/mock.py`.
- The RAG assistant grounds answers only in the patient's stored records; when Ollama is not running it falls back to a templated, still-grounded answer rather than a generative one.
- No production auth hardening (refresh tokens, rate limiting, password reset) — this is a hackathon-grade prototype.
- Dashboard record editing (add/edit/delete) exists in the reference `PatientDashboard-REDESIGNED.tsx` but is not part of the currently wired `frontend/src/pages/Dashboard.tsx`, which focuses on read + RAG chat per this pass's scope.
- No CI pipeline configured; tests are run manually (`python -m pytest -v` in `backend/`).

See `ARCHITECTURE.md`, `PRD.md`, and `IMPLEMENTATION_PLAN.md` for further detail.
