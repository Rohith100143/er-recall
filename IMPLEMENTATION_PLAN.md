# Implementation Plan — Status

This tracks what was built and the state as of the final wiring pass (2026-09-25).

## Phase 0 — Backend foundation (done)

- FastAPI app, SQLAlchemy models, JWT auth, RBAC (`PermissionChecker`), append-only audit log.
- Mock provider layer with configurable failure simulation.
- 31 pytest tests covering auth, RBAC, identity, patient/record retrieval, audit, RAG. All passing.

## Phase 1 — RAG assistant (done)

- `app/services/rag.py`: retrieves a patient's own records as context, optionally generates via local Ollama, falls back to a templated grounded answer if Ollama is unreachable.
- `POST /api/v1/patients/{id}/rag` returns `{ answer, sources[], grounded }`.

## Phase 2 — Frontend wiring (done, this pass)

- `frontend/src/services/api.ts` rewritten: single axios client, bearer-token interceptor, normalized error handling (`HTTP_<status>`), typed helper functions for every endpoint used by the UI.
- `Login.tsx`: real `POST /api/v1/auth/login` (OAuth2 form-encoded), stores real JWT, visible error state for bad credentials / network failure, demo-credential hint text.
- `Identity.tsx`: full IDLE → SCANNING → VERIFYING → SUCCESS/FAILURE/TIMEOUT/ERROR state machine against `POST /api/v1/identity/fingerprint/verify`; fingerprint ID selectable (DEMO-FP-001..004, plus DEMO-FP-TIMEOUT / DEMO-FP-UNAVAILABLE to exercise failure paths); routes to `/dashboard/:id` on success.
- `Dashboard.tsx`: fetches real patient + records (`GET /api/v1/patients/{id}`, `GET /api/v1/patients/{id}/records`); renders critical alerts, allergies, medications, conditions, surgeries, and a record timeline from live data; "Medical Review" chat panel wired to `POST /api/v1/patients/{id}/rag` with quick-question presets and per-answer source citations; kept the "MEDICAL REVIEW · AI-ASSISTED · PROTOTYPE" labeling and the non-diagnostic disclaimer text.
- `App.tsx`: route updated to `/dashboard/:id` to carry the resolved patient id from identity verification through to the dashboard.
- Compared `PatientDashboard-REDESIGNED.tsx` (root) against the shipped `Dashboard.tsx`: the redesigned file has a more complete record-CRUD UI (add/edit/delete records, edit patient) built against a differently-shaped `api` client, but was not the basis for this pass's dashboard — the existing glass-panel dashboard was kept and wired to real data plus real RAG chat, since a working wired dashboard was prioritized over a prettier disconnected one. Record CRUD remains a follow-up if needed.
- `npm run build` (tsc -b && vite build) verified clean after wiring — no TypeScript errors.

## Verification (this pass)

- `cd backend && python -m pytest -v` → 31 passed.
- `cd frontend && npm run build` → clean build, no TS errors.
- `frontend/Dockerfile` reviewed: multi-stage build (Node 20 alpine → `npm ci && npm run build`, then nginx:alpine serving `dist/` with SPA fallback `try_files ... /index.html`) — correct and consistent with the Vite app.

## Remaining follow-ups (not done in this pass, out of requested scope)

- Dashboard record CRUD (add/edit/delete) wiring.
- `docker compose up` end-to-end verification.
- CI pipeline for automated test runs on push.
- Production auth hardening (refresh tokens, rate limiting).
