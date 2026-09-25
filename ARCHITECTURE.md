# Architecture

## Overview

Single consolidated backend (FastAPI) + single frontend (React/Vite), no other runtime services required for the demo besides an optional local Ollama instance for generative RAG answers.

```
frontend (React/TS, Vite, Tailwind)
   |  axios (frontend/src/services/api.ts), JWT bearer
   v
backend (FastAPI, /api/v1)
   |  SQLAlchemy ORM
   v
SQLite (dev) — database/ (Postgres-compatible schema, docker-compose available)
   |
   +-- mock provider layer (app/providers/mock.py) simulating external record sources
   +-- RAG service (app/services/rag.py) — retrieval over a patient's own records,
       optional Ollama generation, graceful templated fallback
```

## Backend layout (`backend/`)

- `main.py` — FastAPI app, CORS, router registration (`/api/v1/auth`, `/patients`, `/records`, `/identity`, `/audit`, `/providers`).
- `app/api/v1/` — route handlers: `auth.py`, `patients.py`, `records.py`, `identity.py`, `audit.py`, `providers.py`.
- `app/models/er_recall.py` — SQLAlchemy models (User, Patient, Record, PatientIdentityMapping, AuditEvent, Provider).
- `app/schemas/api_models.py` — Pydantic request/response models.
- `app/security/` — password hashing, JWT creation/validation (`auth.py`), `PermissionChecker`/`get_current_active_user` dependency-injection RBAC gate (`deps.py`).
- `app/services/` — business logic: `patient.py`, `record.py`, `audit.py` (append-only audit log, no update/delete endpoints), `rag.py`.
- `app/providers/mock.py` — simulated external provider with configurable failure states (`AVAILABLE`, `UNAVAILABLE`, `TIMEOUT`, `MALFORMED_RECORD`), and the identity-verification demo sentinels (`DEMO-FP-TIMEOUT`, `DEMO-FP-UNAVAILABLE`).
- `tests/` — pytest suite, 31 tests covering auth, RBAC, identity verification, patient/record retrieval, audit logging, and RAG.

## RBAC model

Roles: `ADMIN`, `CLINICIAN`, `STAFF`. Permissions (`patient:read`, `patient:create`, `patient:update`, `patient:delete`, `record:read`, `record:create`, `audit:read`, …) are checked per-endpoint via `PermissionChecker`. Every state-changing action and every patient/record view is written to the append-only audit log (`app/services/audit.py`); `test_audit.py` specifically asserts there is no way to mutate or delete audit entries via the API.

## Identity verification

`POST /api/v1/identity/fingerprint/verify` takes a `demo_fingerprint_id`, looks it up in `PatientIdentityMapping`, and resolves to a patient. Two sentinel IDs (`DEMO-FP-TIMEOUT` → 504, `DEMO-FP-UNAVAILABLE` → 503) let the frontend exercise its TIMEOUT/ERROR UI states without needing a real biometric device or provider outage.

## RAG assistant

`POST /api/v1/patients/{id}/rag` retrieves the patient's own records as context, optionally calls a local Ollama model for a generated answer, and always returns `sources` (record id/title/category/provider) alongside the answer so responses are traceable to specific records. If Ollama is unreachable, the service degrades to a templated, still record-grounded answer instead of failing (`test_rag_degrades_gracefully_when_ollama_down`).

## Frontend (`frontend/src/`)

- `services/api.ts` — single axios client with request/response interceptors (bearer token injection, 401 → redirect to `/login`, normalized `HTTP_<status>` error messages). Exposes typed helpers: `login`, `getCurrentUser`, `verifyFingerprint`, `getPatient`, `getPatientRecords`, `updatePatient`, `createRecord`, `updateRecord`, `deleteRecord`, `queryRag`.
- `pages/Login.tsx` — real login against `/auth/login`, stores the JWT, shows a visible error state on failure.
- `pages/Identity.tsx` — IDLE → SCANNING → VERIFYING → SUCCESS/FAILURE/TIMEOUT/ERROR state machine against `/identity/fingerprint/verify`; routes to `/dashboard/:id` on success.
- `pages/Dashboard.tsx` — fetches patient + records, renders critical alerts/allergies/medications/conditions/surgeries/timeline, and hosts the "Medical Review" RAG chat panel (quick-question presets + free-text query, sources shown per answer).
- `App.tsx` — routes: `/login`, `/identity`, `/dashboard/:id`.

## Data

`database/` holds the schema/seed scripts; the dev backend uses SQLite by default (see `backend/app/db/database.py`) and is Postgres-compatible for the `docker-compose.yml` stack. Seed data includes demo users (`dr_smith`/`admin`/`staff_jones`, all `password123`) and demo patients mapped to `DEMO-FP-001`..`004`.

## Known architectural limitations

- Single mock provider, not multiple real integrations — multi-provider retrieval is simulated by tagging records with different `provider_name` values.
- No token refresh/rotation; JWTs are short-lived and re-login is required after expiry.
- No background job runner — RAG calls are synchronous request/response.
