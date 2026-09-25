# PRD — ER Recall

## Problem

Emergency clinicians treating an unresponsive or unidentified patient need fast, trustworthy access to that patient's critical medical history (allergies, medications, conditions, prior surgeries) from whatever providers hold it, without waiting on manual record requests — while every access stays auditable and role-gated.

## Scope (this prototype)

1. **Authenticated clinical access** — providers log in with a role (ADMIN / CLINICIAN / STAFF); every subsequent action is permission-checked and audit-logged.
2. **Simulated biometric identity resolution** — a fingerprint-scan step resolves an unidentified patient to a record, standing in for a real biometric device/provider integration.
3. **Consolidated record view** — patient demographics, critical alerts, allergies, medications, conditions, surgeries, and a record timeline, aggregated as if pulled from multiple providers (currently mocked).
4. **AI-assisted record review** — a chat-style assistant that answers clinician questions strictly grounded in that patient's own records, citing sources, explicitly labeled as assistive/non-diagnostic.
5. **Auditability** — every login, patient view, record view/create, identity verification, and RAG query is written to an append-only audit log.

## Out of scope (explicitly not built)

- Real biometric hardware or provider integrations (ABDM sandbox, hospital EMR APIs) — mocked only.
- Clinical decision support / diagnosis generation — the assistant is explicitly restricted to grounded summarization of existing records.
- Patient-facing consent flows, multi-tenant hospital administration, production-grade auth (MFA, refresh tokens, password reset).

## User flow

1. **Login** — clinician authenticates (`dr_smith` / `admin` / `staff_jones`, password `password123` for demo). Wired to `POST /api/v1/auth/login`, JWT stored client-side.
2. **Identity verification** — clinician scans/selects a demo fingerprint ID; system resolves to a patient or reports failure/timeout/provider-error. Wired to `POST /api/v1/identity/fingerprint/verify`, with dedicated demo sentinels to exercise timeout and error paths.
3. **Dashboard** — clinician sees the resolved patient's record set immediately (`GET /api/v1/patients/{id}`, `GET /api/v1/patients/{id}/records`) and can ask the "Medical Review" assistant free-text or preset questions (Cardiac History / Medications / Allergies / Surgeries), each answer grounded and source-cited (`POST /api/v1/patients/{id}/rag`).

## Success criteria (status)

| Criterion | Status |
|---|---|
| Real JWT auth, no mock tokens | Done — frontend calls the real login endpoint |
| RBAC enforced server-side per endpoint | Done — `PermissionChecker`, covered by `test_rbac.py` |
| Identity verification exercises success/failure/timeout/error | Done — `Identity.tsx` state machine + backend sentinels |
| Dashboard shows real patient data, not hardcoded demo text | Done |
| RAG answers are grounded and source-cited | Done — `test_rag.py`, sources rendered in the chat panel |
| Every sensitive action audit-logged | Done — `test_audit.py` |
| Audit log is append-only (no edit/delete surface) | Done — asserted by `test_audit_log_has_no_create_or_delete_endpoints` |
| Automated test coverage | 31/31 backend tests passing |
| Frontend production build is clean | Done — `npm run build` (tsc -b && vite build) succeeds with no errors |

## Known limitations / non-goals for this pass

- Dashboard record CRUD (add/edit/delete records, edit patient) is present in the design reference (`PatientDashboard-REDESIGNED.tsx`) but not wired into the shipped `Dashboard.tsx` — this pass prioritized real read access + real RAG chat over full CRUD UI.
- RAG generation quality depends on an optional local Ollama model; without it, answers are templated but still grounded in real records (no hallucinated content).
- No production deployment hardening; `docker-compose.yml` exists for local multi-service runs but was not exercised in this pass (not requested).
