# PRD.md — ER Recall: Emergency Medical History Retrieval
## Version 2.0 — AI-ASSISTED PROTOTYPE UPDATE

| Field | Value |
|---|---|
| Document | Product Requirements Document |
| Companion documents | `ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md` |
| Version | 2.0 |
| Scope | Emergency medical record retrieval + AI-ASSISTED record review (prototype) |
| Last Updated | September 25, 2026 |

### Label Legend
- **KNOWN**: Verified fact or established standard.
- **UNKNOWN**: Information pending research or decision.
- **REQUIRES VERIFICATION**: Assumption or dependency that must be verified.
- **PROPOSED**: Suggested approach pending approval.
- **MOCK/SIMULATION**: Feature simulated for prototype purposes (e.g., biometrics).
- **AI-ASSISTED PROTOTYPE**: LLM-powered feature for demonstration; not production-ready.
- **SYNTHETIC DATA**: Generated data for demonstration purposes only.

---

## 1. Problem Statement
Emergency healthcare professionals often treat unconscious or uncommunicative patients. Without immediate access to the patient's medical history (allergies, medications, conditions, surgeries), providing optimal care is challenging and risky. Medical records are often distributed across multiple unlinked providers and systems. Additionally, quickly **synthesizing complex medical information** from fragmented records can be time-consuming in critical moments.

## 2. Emergency Scenario & Goal
**Scenario:** An unidentified, unresponsive patient arrives at the emergency room.
**Goal:** The treating clinician must rapidly:
1. Verify the patient's identity via a secure biometric process
2. Resolve their health identity
3. Pull existing medical records from authorized networks
4. **Quickly review and synthesize key information** to inform immediate emergency care

## 3. Users
1. **Emergency Clinician (Primary User):** Authorized medical professional who retrieves, views, and queries records. Can perform authorized CRUD operations.
2. **Patient (Subject):** The individual whose identity is verified and whose records are retrieved. (Not a direct user of the system).
3. **System Administrator (Setup User):** Manages clinician accounts and configures mock identities for the prototype.

## 4. Responsibilities
ER Recall is a **secure emergency medical-history retrieval, presentation, and AI-assisted review system**.
- It **does** fetch, display, and facilitate CRUD operations for authorized medical records via external providers.
- It **does** provide AI-assisted record review to help clinicians synthesize information. [**NEW in v2.0**]
- It **does not** own or permanently store medical records.
- It **does not** prescribe treatment, diagnose independently, or claim clinical authority.
- It **does not** invent or fabricate medical history.

---

## 5. Functional Requirements (FR)

### Core Retrieval & Identity
| ID | Requirement |
|---|---|
| FR-001 | The system SHALL require clinicians to authenticate (login) before accessing any records. |
| FR-002 | The application journey SHALL begin with a MOCK/SIMULATION Fingerprint Access Screen (primary entry point). |
| FR-003 | The Fingerprint workflow SHALL include a 3D scan animation, scanning state, and verification states (success/fail/timeout/retry). |
| FR-004 | Upon mock verification, the system SHALL deterministically map the fingerprint to a synthetic patient identity. |
| FR-005 | The system SHALL resolve the patient's health identity (e.g., MOCK ABHA). |
| FR-006 | The system SHALL retrieve medical records from authorized providers (MOCK integrations) based on the resolved health identity. |
| FR-007 | The system SHALL allow authorized clinicians to Create, Read, Update, and Delete (CRUD) medical records. These operations MUST be routed through the MockMedicalRecordProvider. |
| FR-008 | The system SHALL display retrieved records grouped by standard categories (Allergies, Medications, Conditions, Surgeries) with source provider and timestamp. |
| FR-009 | Deletion of a medical record SHALL require explicit user confirmation. |
| FR-010 | The clinician SHALL be able to explicitly close a patient session. |

### AI-Assisted Review [**NEW in v2.0**]
| ID | Requirement |
|---|---|
| FR-011 | The system SHALL provide an AI-ASSISTED PROTOTYPE query interface for clinicians to ask questions about patient records. |
| FR-012 | The AI-assisted review MUST retrieve relevant records from the patient's medical history. |
| FR-013 | The AI-assisted review SHALL synthesize and present information grounded in retrieved records only. |
| FR-014 | The AI-assisted response SHALL NOT: diagnose, prescribe treatment, recommend specific therapies, or invent records. |
| FR-015 | The AI-assisted response SHALL attribute sources (which records were used to generate the answer). |
| FR-016 | If insufficient information exists to answer a query, the system SHALL state: "Insufficient information in the retrieved records." |
| FR-017 | The AI-assisted interface SHALL provide quick-action buttons (Cardiac history, Medications, Allergies, Surgeries) for common queries. |
| FR-018 | The AI-assisted response SHALL be grounded in retrieved records; fallback to keyword-based matching if LLM unavailable. |

---

## 6. Non-Functional Requirements (NFR)
| ID | Requirement |
|---|---|
| NFR-001 | Retrieval and presentation SHALL be deterministic (no generative responses without grounding). |
| NFR-002 | The system SHALL be available as a local prototype using Docker. |
| NFR-003 | The backend SHALL respond to API requests within acceptable REST timeouts (< 2 seconds). |
| NFR-004 | The frontend SHALL render data responsively for desktop dashboard viewing. |
| NFR-005 | The AI-assisted review SHALL display results and source attribution within 5 seconds. |

---

## 7. Security (SEC)
| ID | Requirement |
|---|---|
| SEC-001 | All API endpoints SHALL enforce Role-Based Access Control (RBAC). |
| SEC-002 | Passwords SHALL be securely hashed (e.g., bcrypt). |
| SEC-003 | All clinical actions, record retrievals, CRUD operations, and RAG queries SHALL be logged in an append-only audit trail. |
| SEC-004 | Audit logs SHALL record who accessed what, when, and the source of the data. |
| SEC-005 | RAG queries SHALL only access the currently authorized patient; no cross-patient queries allowed. |
| SEC-006 | RAG endpoint authentication requires valid JWT and role-based authorization. |

---

## 8. Privacy / Data Minimization (PRV)
| ID | Requirement |
|---|---|
| PRV-001 | The system SHALL NOT permanently store Aadhaar/Biometric data (fingerprints/iris/templates/hashes). |
| PRV-002 | ER Recall SHALL NOT store medical records permanently. Records are owned by the MockMedicalRecordProvider. |
| PRV-003 | All presented prototype data SHALL be SYNTHETIC (MOCK/SIMULATION). |
| PRV-004 | A session timeout SHALL automatically clear retrieved patient data from active view. |
| PRV-005 | AI-assisted queries SHALL NOT log full medical record content; only query metadata and outcome. |

---

## 9. Failure Scenarios (FS)
| ID | Scenario | System Behavior |
|---|---|---|
| FS-01 | Biometric mismatch / ID failure | Reject access, log failure, display error to clinician, allow retry. |
| FS-02 | Provider API unavailable | Display "Provider Offline" for that specific source; show other available records. |
| FS-03 | Patient has no records | Display "No Records Found" cleanly. |
| FS-04 | Session timeout | Expire token, purge session data, redirect to login. |
| FS-05 | LLM API unavailable (new) | Fallback to keyword-based matching; return grounded answer or "Insufficient information." |
| FS-06 | Insufficient records for query (new) | Return "Insufficient information in the retrieved records." |

---

## 10. Dashboard Design (NEW in v2.0)

### Aesthetic
- **Feel:** Emergency medical digital access terminal
- **NOT:** Cyberpunk, gaming, neon, generic admin dashboard

### Color Palette
- **Primary Background:** Black/Charcoal (#0f0f0f, #1a1a1a)
- **Emergency Accent:** Subtle red (#dc2626, #991b1b)
- **AI/Assist Accent:** Controlled cyan (#06b6d4)
- **Borders & Dividers:** Gray with red emergency highlights

### Layout
**Two-Column Structure:**
- **LEFT:** Patient identity + critical information + medical history
- **RIGHT:** AI-assisted medical review panel

### Patient Information Section
- "PATIENT VERIFIED" badge (green checkmark)
- Name, Health ID, DOB, Sex, Blood Group

### Critical Information Display
- **Allergies:** Red-highlighted cards
- **Medications:** Cyan-highlighted cards
- **Cardiac History:** Red-highlighted cards
- **Surgeries:** Yellow-highlighted cards
- Each critical item shows title, details (if any), date

### Medical History
- Clean cards grouped by category
- Shows: category label, date, title, details (truncated), provider name
- Hover state reveals Edit/Delete buttons (if authorized)

### AI-Assisted Review Panel (Right)
- Header: "MEDICAL REVIEW / AI-ASSISTED • PROTOTYPE"
- Input field: "Ask about this patient's records..."
- Quick action buttons: Cardiac history, Medications, Allergies, Surgeries
- Chat-like interface showing:
  - User questions (red-tinted bubbles)
  - AI responses (gray bubbles)
  - Loading state (spinner)
  - Sources section (which records were used)
  - Error states

---

## 11. AI-Assisted Review Rules (NEW in v2.0)

### What the AI CAN do:
✓ Synthesize information from retrieved medical records  
✓ Answer questions grounded in patient history  
✓ Provide source attribution (which records were used)  
✓ Summarize key medical information  
✓ Help clinicians quickly review complex histories  

### What the AI MUST NOT do:
✗ Diagnose patients  
✗ Prescribe medications or treatments  
✗ Recommend specific therapies or interventions  
✗ Invent or fabricate medical records  
✗ Make clinical decisions or take responsibility  
✗ Claim real UIDAI/ABDM/biometric integrations without verification  

### AI Response Quality:
- Answers MUST be grounded in retrieved records only
- Sources MUST be explicitly listed
- If insufficient records: "Insufficient information in the retrieved records."
- Tone: Clinical, professional, cautious

### Fallback Mechanism:
- If Gemini API unavailable → keyword-based matching
- Keyword matching returns matching records + simple synthesis
- Both methods grounded in patient data only

---

## 12. Prototype vs Production
| Feature | Prototype (MOCK/SIMULATION) | Production |
|---|---|---|
| Biometrics | Hardcoded synthetic credentials + 3D UI Simulation | Government/Authorized Biometric integration |
| Health ID | Hardcoded MOCK ABHA resolution | Genuine ABDM / ABHA API |
| Providers | Internal MOCK JSON APIs with isolated DB schema | Genuine Hospital EHR / FHIR APIs |
| Database | Local PostgreSQL with synthetic data | Secure Cloud/On-Premise compliant database |
| AI Assistant | Optional Gemini API + keyword fallback | Production LLM + specialized medical models |
| Data | Synthetic only | Real patient data (encrypted, compliant) |

---

## 13. Non-Goals
- NOT a centralized medical record storage system
- NOT a diagnostic tool
- NOT a treatment recommendation engine
- Aadhaar is NOT used as a medical record database

---

## 14. Acceptance Criteria (AC)
- **AC-01:** Clinician can log in and out successfully.
- **AC-02:** Clinician starts at the Fingerprint Access screen; deterministic patient identification occurs.
- **AC-03:** Dashboard displays records retrieved from the MockMedicalRecordProvider.
- **AC-04:** Patient information is clearly organized: critical info prominently displayed, medical history accessible.
- **AC-05:** AI-assisted panel allows clinicians to query patient records.
- **AC-06:** AI responses are grounded in retrieved records; sources are displayed.
- **AC-07:** Quick action buttons (Cardiac, Meds, Allergies, Surgeries) work and return relevant information.
- **AC-08:** If AI API unavailable, system falls back to keyword matching gracefully.
- **AC-09:** All MOCK/SIMULATION/AI-ASSISTED labels are visible and clear.
- **AC-10:** Demo flow (Login → Fingerprint → Dashboard → RAG Query) completes in <2 minutes.

---

## 15. Data Privacy & Consent Notes (NEW)
- All data presented is SYNTHETIC
- No real patient information is used
- AI-assisted responses are stored minimally (query metadata only, not full medical record content)
- Audit trails record WHO queried WHAT and WHEN, but not the full query content
- Session data cleared on logout

---

## APPENDIX A: Example AI-Assisted Query

**Clinician Question:**
"What previous cardiac history does this patient have?"

**System Process:**
1. Retrieve all patient records
2. Identify relevant records (keyword matching: "cardiac", "heart", "cardiology", etc.)
3. If LLM available: send records + question to Gemini → get AI synthesis
4. If LLM unavailable: return matching records with simple summary

**Example Response:**
"The retrieved records document a previous myocardial infarction in 2023, followed by coronary angioplasty. An ECG from June 2024 shows normal sinus rhythm."

**Sources Shown:**
- Cardiology Record — 2023–10–15
- Hospitalization Record — 2023–10–20
- Investigation (ECG) — 2024–06–10

---

## APPENDIX B: Clearly Labelled Distinctions in UI

Every screen/component SHALL include ONE OR MORE of these labels:
- `MOCK / SIMULATION` — For fingerprint, patient data, provider responses
- `AI-ASSISTED • PROTOTYPE` — For RAG responses
- `SYNTHETIC DATA` — For all displayed medical information
- `REQUIRES VERIFICATION` — For features that need production integration

---

**Status: READY FOR IMPLEMENTATION**  
**Scope: Emergency medical record retrieval + AI-assisted review (prototype)**  
**Data: Synthetic only**  
**Target Deployment: Hackathon demo (local Docker)**
