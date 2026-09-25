# PROJECT AUDIT & UPGRADE PLAN — ER Recall
**Based on:** Full source inspection of `/home/claude/code hackers`  
**Hackathon time remaining:** ~45 minutes  
**Audit confidence:** HIGH — every finding is verified against actual code

---

## PART 1 — WHAT IS ALREADY IMPLEMENTED (Verified from source)

### Backend — `/backend/`

#### ✅ FastAPI Application (`app/main.py`)
- CORS middleware configured (allows `localhost:5173`)
- Routers registered: `auth`, `identity`, `patients`, `records`, `audit`
- Health check endpoint at `GET /health`
- **⚠️ NOTE:** `description` in `FastAPI()` still says `"ZERO AI. Deterministic retrieval and presentation only."` — needs updating to reflect RAG

#### ✅ Authentication & RBAC (`security/auth.py`, `security/deps.py`)
- JWT-based login via `POST /api/v1/auth/login` (form-encoded)
- `get_current_active_user` dependency for protected routes
- `PermissionChecker` class with three roles:
  - `ADMIN` — full access including delete and audit read
  - `CLINICIAN` — read/create/update patients and records
  - `AUTHORIZED_STAFF` — read-only
- All sensitive endpoints gated behind `PermissionChecker`

#### ✅ Database Models
**ER Recall schema (`models/er_recall.py`):**
- `User` — id, username, password_hash, role (enum: ADMIN/CLINICIAN/AUTHORIZED_STAFF)
- `RecordSource` — provider metadata
- `PatientIdentityMapping` — mock_fingerprint_profile_id → health_id (NOT biometric data)
- `AuditLog` — timestamp, clinician_id, action, target, status, details (JSON)

**Mock Provider schema (`models/mock_provider.py`, schema = `mock_provider`):**
- `MockPatient` — id, health_id, name, date_of_birth, sex, blood_group
- `MockMedicalRecord` — id, patient_id, category, title, details, provider_name, recorded_date, status

#### ✅ Seed Data (`backend/seed.py`)
Three demo users:
| Username | Password | Role |
|----------|----------|------|
| `dr_smith` | `password123` | CLINICIAN |
| `admin` | `password123` | ADMIN |
| `staff` | `password123` | AUTHORIZED_STAFF |

Three mock patients:
| FP ID | Health ID | Patient Name | Blood Group |
|-------|-----------|--------------|-------------|
| DEMO-FP-001 | health-001 | John Doe | O+ |
| DEMO-FP-002 | health-002 | Jane Smith | A- |
| DEMO-FP-003 | health-003 | Bob Johnson | B+ |

12 synthetic records across the 3 patients (allergies, medications, surgeries, cardiac history, lab results, hospitalization).

#### ✅ Fingerprint / Identity Endpoint (`api/v1/identity.py`)
- `POST /api/v1/identity/fingerprint/verify` — accepts `demo_fingerprint_id`
- Looks up `PatientIdentityMapping`, finds patient, returns `patient_id`
- Special failure test IDs: `DEMO-FP-TIMEOUT` (504), `DEMO-FP-UNAVAILABLE` (503)
- All outcomes (success/failure/timeout) are audit-logged
- No biometric data stored ✓

#### ✅ Provider State Simulation (`api/v1/identity.py`)
- `POST /api/v1/identity/provider/simulate?state=<STATE>`
- States: `AVAILABLE`, `UNAVAILABLE`, `TIMEOUT`, `MALFORMED_RECORD`

#### ✅ Patient & Record CRUD (`api/v1/patients.py`, `api/v1/records.py`)
All routed through `MockProvider` service layer:
- `GET /api/v1/patients/{id}` — read patient (permission: `patient:read`)
- `PUT /api/v1/patients/{id}` — update patient (permission: `patient:update`)
- `GET /api/v1/patients/{id}/records` — list records (permission: `record:read`)
- `POST /api/v1/patients/{id}/records` — create record (permission: `record:create`)
- `PUT /api/v1/records/{id}` — update record (permission: `record:update`)
- `DELETE /api/v1/records/{id}` — delete record (permission: `record:delete`)
- Every operation writes an audit log entry

#### ✅ RAG Endpoint (`api/v1/patients.py`)
- `POST /api/v1/patients/{id}/rag` — auth-protected (permission: `record:read`)
- Request body: `{ "query": "string" }`
- Response: `{ "answer": "string", "sources": [{ id, title, category, provider_name, date }] }`
- Verifies patient exists before querying
- Audit-logged as `RAG_QUERY / SUCCESS`

#### ✅ RAG Service (`services/rag.py`)
- Retrieves all patient records via `record_service`
- Intent matching: keywords mapped to intents (cardiac, medication, allergy, surgery, hospitalization)
- Scores records by keyword relevance
- **Primary:** Calls Gemini 2.5 Flash if `GEMINI_API_KEY` env var is set
- **Fallback:** Returns keyword-matched records with bullet-point summary if LLM unavailable
- Gracefully returns `"Insufficient information in the retrieved records."` when nothing matches
- Source attribution always included

#### ✅ Audit Logging (`services/audit.py`)
- `record_event(db, action, status, actor_id, target, details)` helper
- Used in: auth login, fingerprint verify, all CRUD, RAG query, access denied events

#### ✅ Docker Configuration (`docker-compose.yml`)
- `db`: postgres:16-alpine on port 5432
- `backend`: FastAPI on port 8000 with hot-reload
- `frontend`: Vite dev server on port 5173
- DB healthcheck before backend starts
- Env vars set: `DATABASE_URL`, `JWT_SECRET`, `ACCESS_TOKEN_EXPIRE_MINUTES=30`, `CORS_ORIGINS`

---

### Frontend — `/frontend/src/`

#### ✅ Routing (`App.tsx`)
Flow: `/login` → `/fingerprint` → `/patients/:id`
- `ProtectedRoute` wraps `/fingerprint` and `/patients/:id` — JWT token required
- Root `/` redirects to `/fingerprint`
- `/audit` protected route for audit viewer
- `AnimatePresence` (Framer Motion) wraps all routes

#### ✅ Login Page (`pages/Login.tsx`)
- Pre-filled with `dr_smith` / `password123` for demo
- Shows demo credentials panel at bottom
- On success → navigates to `/fingerprint`
- Error handling: expired session, bad credentials, network failure
- Shake animation on wrong credentials
- Dark theme with animated red glow rings

#### ✅ Fingerprint Page (`pages/Fingerprint.tsx`)
- States: `IDLE`, `SCANNING`, `VERIFYING`, `SUCCESS`, `FAILURE`, `ERROR`, `TIMEOUT`
- Dropdown to select fingerprint ID (DEMO-FP-001, DEMO-FP-002, DEMO-FP-003)
- Calls `api.verifyFingerprint(demoId)` → on success navigates to `/patients/${response.patient_id}`
- Animated ring with colour coded to state (red=scanning, blue=verifying, green=success)
- Ambient red glow background
- Clearly labelled as MOCK/SIMULATION ✓

#### ✅ Patient Dashboard (`pages/PatientDashboard.tsx`)
Currently implemented — **light grey theme, needs redesign**:
- Header: grey-900 bar with ER Recall logo, provider state selector, role badge, logout
- Layout: `flex-col lg:flex-row` two columns — LEFT 60% patient+records, RIGHT 40% RAG
- LEFT: Patient identity card (white card), medical history card (white card with scrollable list)
- RIGHT: `<MedicalReviewRag patientId={Number(id)} />` already embedded
- Modals: Patient update, record add/edit, delete confirmation
- CRUD operations fully wired (`canEdit` = ADMIN or CLINICIAN, `canDelete` = ADMIN only)
- Provider state dropdown in header for simulating failures
- Error states: 403, 404, 503/504, 401 all handled

#### ✅ MedicalReviewRag Component (`components/MedicalReviewRag.tsx`)
- Chat-like interface with user and assistant message bubbles
- Quick action buttons: "What is the cardiac history?", "List current medications", "Any known allergies?", "Previous surgeries"
- Calls `api.queryPatientRag(patientId, query)`
- Shows loading spinner ("Analyzing records...")
- Sources displayed inline below each assistant response (FileText icon, title, category badge)
- Error state shown if RAG fails
- Header labels: "MEDICAL REVIEW" + "AI-Assisted • Prototype" badge

#### ✅ API Service (`services/api.ts`)
All endpoints implemented:
- `api.login(username, password)` — form-encoded POST
- `api.getCurrentUser()` — `GET /auth/me`
- `api.verifyFingerprint(demo_fingerprint_id)` — `POST /identity/fingerprint/verify`
- `api.getPatient(id)` — `GET /patients/{id}`
- `api.updatePatient(id, data)` — `PUT /patients/{id}`
- `api.getPatientRecords(id)` — `GET /patients/{id}/records`
- `api.createRecord(patient_id, record)` — `POST /patients/{id}/records`
- `api.updateRecord(record_id, record)` — `PUT /records/{id}`
- `api.deleteRecord(record_id)` — `DELETE /records/{id}`
- `api.setProviderState(state)` — `POST /identity/provider/simulate?state=`
- `api.queryPatientRag(patient_id, query)` — `POST /patients/{id}/rag`
- Auth header (`Bearer token`) on all protected calls
- 401 auto-redirects to `/login?expired=1`

---

## PART 2 — GAP ANALYSIS (Required vs. Actual)

### P0 Gaps — Must Fix Before Pitch

| Gap | Severity | Effort | Details |
|-----|----------|--------|---------|
| Dashboard background is light grey (`bg-gray-100`) | 🔴 HIGH | LOW | Must become black/charcoal emergency terminal |
| Patient card and record cards are white (`bg-white`) | 🔴 HIGH | LOW | Must become dark with border accents |
| No "CRITICAL INFORMATION" section | 🔴 HIGH | LOW | Allergies, meds, cardiac, surgeries must be prominently extracted from records and displayed separately |
| Loading state uses `bg-gray-50` (white) | MEDIUM | LOW | Should be dark with spinner |
| Error state also uses light theme | MEDIUM | LOW | Minor but jarring against dark shell |
| `main.py` FastAPI description still says "ZERO AI" | LOW | TRIVIAL | 1-line fix |
| PRD.md still says "ZERO AI" scope | LOW | 5 mins | Update to reflect AI-ASSISTED prototype |

### P0 Gaps — Routing / Flow (Need to verify, not necessarily fix)

| Item | Status | Notes |
|------|--------|-------|
| Fingerprint FIRST | ✅ Working | Root `/` → `/fingerprint`; protected routes require token |
| No patient selection in flow | ✅ Working | User goes FP → patient ID resolved → dashboard, no selection UI |
| RAG panel on right | ✅ Working | Already embedded as right column |
| Quick action buttons | ✅ Working | Already in MedicalReviewRag.tsx |
| Sources displayed | ✅ Working | Already in MedicalReviewRag.tsx |

### P1 Gaps — Nice to Have

| Gap | Effort | Notes |
|-----|--------|-------|
| WebAuthn / phone biometric | HIGH | Skip for hackathon; existing MOCK works fine |
| Loading/error states (insufficient data) | LOW | Backend already returns correct messages; UI handles errors |
| Animations beyond what exists | LOW | Already has Framer Motion; can add entrance animations |

---

## PART 3 — EXACTLY WHAT TO CHANGE

### Change 1 — `frontend/src/pages/PatientDashboard.tsx`
**This is the only substantial file change needed.**

What to keep (don't touch):
- All state variables and hooks
- All API call logic (`fetchData`, `handleSaveRecord`, `handleUpdatePatient`, `executeDeleteRecord`, `openRecordModal`)
- `canEdit` / `canDelete` RBAC logic
- All modal JSX (patient update, record add/edit, delete confirm)
- `<MedicalReviewRag patientId={Number(id)} />` — already in right column

What to change (styling only):
1. **Root wrapper:** `bg-gray-100` → `background: '#111'` (or Tailwind `bg-[#111]`)
2. **Header:** Keep layout; change from `bg-gray-900 border-b-4 border-red-600` to `bg-black border-b border-red-900/40` — makes it feel calmer, more terminal-like
3. **Synthetic data warning banner:** Currently yellow (`bg-yellow-50 border-yellow-200 text-yellow-900`) → Change to blue-tinted dark: `bg-blue-950/30 border-blue-900/50 text-blue-200`
4. **Patient card:** `bg-white rounded-xl shadow-sm border-gray-200` → `bg-gray-900 border border-gray-800 rounded-xl`; all text from `text-gray-900` → `text-white`/`text-gray-200`
5. **Add Critical Information section** (new JSX, no new logic) between patient card and medical history. Extract from `records` array by category:
   ```tsx
   const allergies = records.filter(r => r.category === 'allergy');
   const medications = records.filter(r => r.category === 'medication');
   const surgeries = records.filter(r => r.category === 'surgery');
   const cardiacRecords = records.filter(r => r.category === 'cardiac history');
   ```
   Render as compact colour-coded rows:
   - Allergies → red-tinted cards
   - Medications → cyan-tinted cards
   - Cardiac history → red-tinted cards
   - Surgeries → yellow-tinted cards
6. **Medical history cards:** `bg-white` inner cards → `bg-gray-900` / `hover:bg-gray-800`; category badges from light colours to dark equivalents (e.g. `bg-red-950 text-red-200 border-red-800`)
7. **Loading state:** `bg-gray-50` → `bg-[#111]` with dark spinner styling
8. **Error state:** `bg-gray-50` → dark with red-tinted error card
9. **Operation error banner:** Currently `bg-red-50 text-red-900` (light) → `bg-red-950/40 border-red-900/50 text-red-200` (dark)
10. **PATIENT VERIFIED badge:** Add `<CheckCircle2>` green badge in header bar next to health ID
11. **Modal backgrounds:** Already use `bg-gray-900/80 backdrop-blur-sm` — fine. Inner modal cards are `bg-white` — change to `bg-gray-900 border border-gray-800 text-gray-100`; form inputs to `bg-gray-800 border-gray-700 text-gray-100`

### Change 2 — `backend/app/main.py`
One-line fix: update the `description` string in `FastAPI()`:
```python
# Before:
description="ZERO AI. Deterministic retrieval and presentation only."
# After:
description="Emergency medical history retrieval with AI-assisted record review prototype."
```

### Change 3 — `PRD.md` (documentation)
Already prepared at `/mnt/user-data/outputs/PRD_UPDATED.md`. Just copy it over.

### What to NOT change at all:
- `frontend/src/components/MedicalReviewRag.tsx` — already dark-themed, well-styled, leave it
- `frontend/src/pages/Login.tsx` — already beautiful dark theme, no changes
- `frontend/src/pages/Fingerprint.tsx` — already dark theme with correct labelling
- `frontend/src/services/api.ts` — all endpoints already implemented
- `frontend/src/App.tsx` — routing is correct
- All backend Python files — logic, RBAC, RAG are all correct
- `docker-compose.yml` — works as-is
- `backend/seed.py` — works as-is

---

## PART 4 — IMPLEMENTATION GUIDE (What to do in order)

### Step 1 — Replace PatientDashboard (20 mins)
Copy the redesigned file:
```bash
cp /mnt/user-data/outputs/PatientDashboard-REDESIGNED.tsx \
   "/home/claude/code hackers/frontend/src/pages/PatientDashboard.tsx"
```
The redesigned file:
- Preserves 100% of the original state management and API logic
- Changes the visual theme to black/charcoal + red + cyan
- Adds the Critical Information section with colour-coded cards
- Keeps the two-column layout with MedicalReviewRag on the right
- Converts all modals to dark theme

### Step 2 — Fix FastAPI description (2 mins)
```bash
cd "/home/claude/code hackers"
sed -i 's/ZERO AI. Deterministic retrieval and presentation only./Emergency medical history retrieval with AI-assisted record review prototype./' backend/app/main.py
```

### Step 3 — Update PRD.md (2 mins)
```bash
cp /mnt/user-data/outputs/PRD_UPDATED.md "/home/claude/code hackers/PRD.md"
```

### Step 4 — Start services (5 mins)
```bash
cd "/home/claude/code hackers"
docker-compose down
docker-compose up --build
```
In a second terminal once db is ready:
```bash
cd "/home/claude/code hackers/backend"
python seed.py
```

### Step 5 — Test end-to-end (10 mins)
Open `http://localhost:5173`

Test checklist:
- Login: `dr_smith` / `password123` → lands on fingerprint
- Fingerprint: select `DEMO-FP-001` → start scan → success → dashboard loads
- Dashboard: dark background ✓, two columns ✓, patient verified badge ✓
- Critical info section: allergies (red), medications (cyan), cardiac + surgeries visible
- Medical history: scrollable dark cards
- RAG panel: right side, sticky; click "What is the cardiac history?" → answer + sources appear
- Logout: returns to login
- Provider failure: set dropdown to "Offline (503)" → records show error gracefully

---

## PART 5 — DEMO FLOW (Practice this once)

**Demo target: 2 minutes 30 seconds**

```
OPEN: http://localhost:5173 (login page visible)

"ER Recall is an emergency medical history retrieval system for clinicians 
treating unconscious or uncommunicative patients."

[Type dr_smith / password123, click Sign In]
→ Fingerprint screen appears

"Step one — clinician authentication. Step two — mandatory patient 
identification. This is a MOCK/SIMULATION of a biometric verification 
for the prototype."

[Select DEMO-FP-001, click Start Scan]
→ Red ring animation → 'Verifying...' → green success

"Patient identified. The system resolves the health identity automatically — 
no manual patient selection."

[Dashboard loads]

"The emergency dashboard has two sections. On the left — patient identity 
confirmed, critical information summarised up front: allergies, current 
medications, cardiac history, and prior surgeries."

[Point to critical info cards]

"And a complete medical history below with full record cards."

[Scroll down slightly]

"On the right — an AI-assisted record review panel. This is clearly marked 
as a prototype. It retrieves and synthesises information from the patient's 
own records only — not a black box, not a diagnostic tool."

[Click "What is the cardiac history?" quick action button]
→ Loading state appears → response + sources show

"Notice the SOURCES panel — it shows exactly which records the answer is 
drawn from. A clinician can verify immediately."

[Point to sources]

"Everything is RBAC-protected and audited. All synthetic data today."

"The path to production: replace mock biometric with WebAuthn or UIDAI, 
replace the mock provider with real FHIR APIs. The architecture is ready."
```

---

## PART 6 — RISK REGISTER

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Gemini API key not available | High | Low | Keyword-based fallback already works — RAG still responds with sources |
| Docker doesn't start first try | Medium | Medium | `docker-compose down && docker-compose up --build`; check `docker ps` |
| Seed fails (already seeded) | Low | None | `seed.py` checks `if db.query(User).first(): return` safely |
| Dashboard doesn't hot-reload after file replace | Low | Low | `docker-compose restart frontend` |
| Modal form inputs look wrong with dark CSS | Low | Low | They're inside fixed-position overlays with their own classes |

---

## PART 7 — TALKING POINTS FOR JUDGES

**Security angle:**
"Every API endpoint is RBAC-gated. Login, fingerprint scan, every record access and every RAG query is written to an append-only audit log with timestamp, actor, and target."

**AI angle:**
"The RAG assistant retrieves relevant records using intent matching, then calls an LLM to synthesise a grounded response. Crucially, it always shows the source records — so a clinician isn't trusting a black box. If the LLM is unavailable, it falls back to keyword matching and still works."

**Privacy angle:**
"No biometric data is stored. The fingerprint maps to a synthetic profile ID, which maps to a health ID. The actual biometric verification would happen on a dedicated government or phone-OS layer in production."

**Production path:**
"Mock fingerprint → WebAuthn/UIDAI biometric. Mock patient DB → ABDM API. Mock records → FHIR APIs. The three integration points are clearly labelled and isolated. The application logic, RBAC and audit layer stay the same."

---

## APPENDIX — ACTUAL CREDENTIALS & TEST DATA

### Login credentials (from seed.py)
- `dr_smith` / `password123` — CLINICIAN (can view, add, edit records; cannot delete)
- `admin` / `password123` — ADMIN (full access including delete)
- `staff` / `password123` — AUTHORIZED_STAFF (read-only)

### Fingerprint demo IDs (from seed.py)
- `DEMO-FP-001` → John Doe (O+) — has allergy to Penicillin, on Lisinopril, cardiac history, appendectomy
- `DEMO-FP-002` → Jane Smith (A-) — peanut allergy, Type 1 Diabetes, on Insulin, HbA1c result
- `DEMO-FP-003` → Bob Johnson (B+) — on Atorvastatin, pneumonia hospitalisation, lipid panel, knee replacement
- `DEMO-FP-TIMEOUT` → triggers 504
- `DEMO-FP-UNAVAILABLE` → triggers 503

### Best demo patient for RAG
**DEMO-FP-001 (John Doe)** — has the richest combination: allergy + medication + cardiac history + surgery.  
Good RAG queries:
- "What is the cardiac history?" → returns Myocardial Infarction record
- "Any known allergies?" → returns Penicillin severe reaction
- "What medications are currently prescribed?" → returns Lisinopril 10mg daily
- "Previous surgeries?" → returns Appendectomy 2010

---

## SUMMARY STATUS TABLE

| Component | Status | Change needed |
|-----------|--------|---------------|
| FastAPI backend | ✅ COMPLETE | 1-line description update |
| JWT auth + RBAC | ✅ COMPLETE | None |
| Fingerprint endpoint | ✅ COMPLETE | None |
| Patient/record CRUD | ✅ COMPLETE | None |
| RAG endpoint + service | ✅ COMPLETE | None |
| Audit logging | ✅ COMPLETE | None |
| Docker setup | ✅ COMPLETE | None |
| Seed data | ✅ COMPLETE | None |
| Login page UI | ✅ COMPLETE | None |
| Fingerprint page UI | ✅ COMPLETE | None |
| MedicalReviewRag component | ✅ COMPLETE | None |
| API service layer | ✅ COMPLETE | None |
| **PatientDashboard UI** | ⚠️ LIGHT THEME | **Replace file — styling only** |
| PRD.md | ⚠️ SAYS ZERO AI | **Copy updated version** |
| ARCHITECTURE.md | ⚠️ OUTDATED | Optional update |

**Bottom line: One file to replace. One doc to copy. Everything else is done.**
