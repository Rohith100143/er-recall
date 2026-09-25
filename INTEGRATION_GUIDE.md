# ER RECALL — INTEGRATION GUIDE FOR HACKATHON UPGRADES
**Time Allocated:** ~50 minutes  
**Complexity:** LOW (mostly styling + layout changes; RAG already implemented)

---

## QUICK START: What You Need to Do

### Option A: Fast Integration (30 mins)
1. Replace `PatientDashboard.tsx` with the redesigned version
2. Verify RAG endpoint is working
3. Test end-to-end flow
4. Update PRD.md with AI-ASSISTED note
5. Demo

### Option B: Incremental Integration (45 mins)
1. Follow Option A
2. Additional testing of RAG fallback modes
3. Polish UI colors/spacing
4. Update ARCHITECTURE.md

---

## SECTION 1: FILE REPLACEMENTS

### Step 1.1: Replace PatientDashboard.tsx

**Location:** `/frontend/src/pages/PatientDashboard.tsx`

**Action:**
- Backup original: `cp /frontend/src/pages/PatientDashboard.tsx /frontend/src/pages/PatientDashboard.tsx.bak`
- Copy redesigned version from `/mnt/user-data/outputs/PatientDashboard-REDESIGNED.tsx` to `/frontend/src/pages/PatientDashboard.tsx`

**Why This Works:**
- Imports remain identical (`api`, `useParams`, `useNavigate`, `MedicalReviewRag`)
- All CRUD functions preserved
- Only styling + layout changed
- MedicalReviewRag component already exists (no new dependencies)

**What Changes:**
- Two-column layout (grid `lg:col-span-2` + `lg:col-span-1`)
- Black/charcoal background with red/cyan accents
- Critical information section (allergies, meds, cardiac, surgeries) prominently displayed
- Medical history cards with visual hierarchy improvements
- MedicalReviewRag positioned as sticky right panel
- Improved typography and spacing for emergency terminal aesthetic

**Test After:**
```bash
# From project root
npm run dev  # Frontend dev server
# Navigate to http://localhost:5173/fingerprint
# Test flow: Login → Fingerprint → Dashboard
# Verify layout is two-column
# Verify RAG panel appears on right
```

---

### Step 1.2: Verify MedicalReviewRag Component (Already Exists)

**Location:** `/frontend/src/components/MedicalReviewRag.tsx`

**Status:** ✓ Already implemented and working

**Verify It Works:**
1. Check file exists: `ls -la frontend/src/components/MedicalReviewRag.tsx`
2. Check imports: Should have `Sparkles, AlertCircle, FileText` from lucide-react
3. Check hook call in Dashboard: Should have `<MedicalReviewRag patientId={Number(id)} />`

**No Changes Needed** — Component is well-designed and integrates seamlessly.

---

### Step 1.3: Verify API Service (Already Exists)

**Location:** `/frontend/src/services/api.ts`

**Check for:**
- `queryPatientRag(patientId: number, query: string)` function

**If Missing:**
Add this function to `api.ts`:
```typescript
export async function queryPatientRag(patientId: number, query: string): Promise<RagQueryResponse> {
  const response = await fetch(`${API_BASE_URL}/patients/${patientId}/rag`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  return response.json();
}
```

**Types to Add:**
```typescript
interface RagSource {
  id: number;
  title: string;
  category: string;
  provider_name: string;
  date: string | null;
}

interface RagQueryResponse {
  answer: string;
  sources: RagSource[];
}
```

---

## SECTION 2: BACKEND VERIFICATION

### Step 2.1: Verify RAG Endpoint Exists

**Location:** `/backend/app/api/v1/patients.py`

**Command to Check:**
```bash
cd backend && grep -n "def query_patient_rag\|@router.post.*rag" app/api/v1/patients.py
```

**Expected Output:**
```
Line XX: @router.post("/{patient_id}/rag", response_model=RagQueryResponse)
Line YY: def query_patient_rag(...)
```

**If Missing:**
Copy this endpoint to `patients.py`:
```python
from app.services import rag as rag_service

@router.post("/{patient_id}/rag", response_model=RagQueryResponse)
def query_patient_rag(
    patient_id: int,
    request: RagQueryRequest,  # { query: str }
    db: Session = Depends(get_db),
    current_user: User = Depends(check_current_user)
):
    """Query patient records with AI-assisted synthesis."""
    # Verify authorization (RBAC)
    if current_user.role not in ['DOCTOR', 'ADMIN']:
        record_event(db, "RAG_QUERY", "DENIED", actor_id=current_user.id, target=f"patient:{patient_id}")
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Get RAG response
    response = rag_service.get_rag_response(db, patient_id, request.query)
    
    # Audit log
    record_event(db, "RAG_QUERY", "SUCCESS", actor_id=current_user.id, target=f"patient:{patient_id}")
    
    return response
```

---

### Step 2.2: Verify RAG Service Exists

**Location:** `/backend/app/services/rag.py`

**Command:**
```bash
cd backend && ls -la app/services/rag.py
```

**Expected:** File exists with ~115 lines of code

**If Missing:** The project backup from previous session should have it. If not, create it (but this is unlikely—RAG already implemented).

**Key Features:**
- Keyword-based intent matching (cardiac, medication, allergy, surgery, hospitalization)
- LLM fallback: Tries Gemini API if `GEMINI_API_KEY` env var set
- Graceful fallback to keyword matching if LLM fails
- Source attribution (returns which records were used)

---

### Step 2.3: Verify Database Schema (No Changes Needed)

**Check:**
```bash
cd backend && grep -r "medical_record\|patient" alembic/versions/ | head -20
```

**Expected:** Schema already supports records + patients

**No Migration Needed** — Existing schema is sufficient.

---

## SECTION 3: ENVIRONMENT VARIABLES

### Step 3.1: Set Up Environment Variables

**For RAG with Gemini:**

Create `.env` in project root:
```env
# Backend
DATABASE_URL=postgresql://postgres:postgres@db:5432/er_recall
JWT_SECRET=your-secret-key-here
JWT_ALGORITHM=HS256

# Optional: Gemini API (for AI-assisted responses)
GEMINI_API_KEY=your-gemini-api-key  # Leave empty to use keyword fallback

# Frontend
VITE_API_BASE_URL=http://localhost:8000
```

**If GEMINI_API_KEY Not Available:**
- Leave it empty or omit it
- RAG will automatically fall back to keyword-based matching
- Responses will still be grounded in records

**Testing Fallback:**
```bash
# Unset GEMINI_API_KEY to test keyword fallback
unset GEMINI_API_KEY
# RAG should still work, just use keyword matching
```

---

## SECTION 4: RUNNING THE UPDATED SYSTEM

### Step 4.1: Start Services

```bash
# From project root
docker-compose down  # If containers already running
docker-compose up --build

# Wait for:
# - db: PostgreSQL ready
# - backend: "Application startup complete" at http://localhost:8000
# - frontend: "ready in XXXms" at http://localhost:5173
```

### Step 4.2: Seed Demo Data

```bash
# In another terminal
cd backend
python seed.py

# Output: "✓ Seeded 3 demo patients with 10+ records each"
```

### Step 4.3: Test End-to-End Flow

1. **Open browser:** http://localhost:5173
2. **Login:** 
   - Username: `demo`
   - Password: `demo`
3. **Fingerprint:**
   - Select dropdown: `DEMO-FP-001`
   - Click "Start Scan"
   - Wait for animation
   - Should succeed and navigate to dashboard
4. **Dashboard:**
   - Verify two-column layout (patient info left, RAG right)
   - Verify critical info displayed prominently
   - Verify medical history cards show
5. **RAG Query:**
   - Click "What is the cardiac history?" button
   - Verify response appears with sources
   - Try custom query: "What medications are recorded?"

---

## SECTION 5: DOCUMENTATION UPDATES

### Step 5.1: Update PRD.md

**Location:** `/PRD.md`

**Changes:**
1. Update Version from 1.1 to 2.0
2. Change scope from "ZERO AI" to "Emergency medical record retrieval + AI-ASSISTED record review (prototype)"
3. Add Section 11: AI-Assisted Review Rules
4. Add FR-011 through FR-018 (AI requirements)
5. Update AC (acceptance criteria) to include RAG
6. Add APPENDIX A: Example AI-Assisted Query
7. Add APPENDIX B: Labeling Distinctions

**Use:** The `/mnt/user-data/outputs/PRD_UPDATED.md` as reference

**Quick Command:**
```bash
cp /mnt/user-data/outputs/PRD_UPDATED.md /path/to/project/PRD.md
```

---

### Step 5.2: Update ARCHITECTURE.md

**Location:** `/ARCHITECTURE.md`

**Add New Section (after Section 8):**

```markdown
## 10. AI-Assisted Medical Review (NEW in v2.0)

### Overview
ER Recall now includes an AI-ASSISTED PROTOTYPE that helps clinicians synthesize medical information from retrieved records.

### Mechanism
1. **Retrieval**: Keyword-based intent matching identifies relevant records from patient history
2. **Synthesis**: 
   - If GEMINI_API_KEY available: Send records + question to Gemini 2.5 Flash → get synthesis
   - If unavailable: Return matching records + keyword-based summary
3. **Attribution**: Always return which records were used (sources)

### Query Processing
- User submits query via RAG panel
- Backend retrieves patient records
- Scores records by relevance (keyword + intent matching)
- Sends top records to LLM with system prompt
- Returns answer + sources

### Safety Constraints
- Response must be grounded in retrieved records only
- System prompt explicitly forbids diagnosis, prescription, treatment recommendation
- If insufficient records: Return "Insufficient information in the retrieved records."
- All RAG queries audited with metadata (not full content)

### Fallback Strategy
```
Query → Keyword Matching (always works)
      ↓
      → LLM API (if available)
      ↓
      → Return synthesis or keyword-based response
```

### Source Attribution
Each response includes sources:
```json
{
  "answer": "The retrieved records document a previous myocardial infarction in 2023.",
  "sources": [
    {
      "id": 42,
      "title": "Myocardial Infarction",
      "category": "investigation",
      "provider_name": "Mock ABDM",
      "date": "2023-10-15"
    }
  ]
}
```
```

---

### Step 5.3: Update IMPLEMENTATION_PLAN.md

**Add New Phase:**

```markdown
## Phase 12: Dashboard Redesign & RAG UI Integration (COMPLETED)
- **Objective:** Implement emergency medical terminal aesthetic + integrate RAG panel
- **Changes:**
  - Two-column dashboard layout (patient info + medical history LEFT, RAG RIGHT)
  - Color scheme: Black/charcoal + red emergency + cyan accents
  - Critical information section (allergies, meds, cardiac, surgeries)
  - MedicalReviewRag component positioned as sticky right panel
  - Updated typography and spacing
- **Files Modified:**
  - `frontend/src/pages/PatientDashboard.tsx` (major redesign)
  - `frontend/src/components/MedicalReviewRag.tsx` (styling alignment, no logic changes)
  - PRD.md (added AI-ASSISTED sections)
  - ARCHITECTURE.md (added RAG section)
- **Status:** Ready for demo
```

---

## SECTION 6: TESTING CHECKLIST

### Pre-Demo Testing (30 mins before pitch)

- [ ] **Backend Health**
  ```bash
  curl http://localhost:8000/docs
  # Should show Swagger UI
  ```

- [ ] **Frontend Load**
  ```
  http://localhost:5173
  # Should show login page (no crashes)
  ```

- [ ] **Login Flow**
  - [ ] Log in with demo/demo
  - [ ] Successfully redirected to /fingerprint

- [ ] **Fingerprint Flow**
  - [ ] Fingerprint screen shows with dropdown
  - [ ] Select DEMO-FP-001
  - [ ] Click "Start Scan"
  - [ ] 3D animation plays (~2 seconds)
  - [ ] Verification animation (~1 second)
  - [ ] Success state
  - [ ] Auto-navigate to dashboard

- [ ] **Dashboard Layout**
  - [ ] Two-column layout visible (LEFT wider, RIGHT narrower)
  - [ ] LEFT side: Patient verified badge + name + health ID + blood group + critical info + medical history
  - [ ] RIGHT side: RAG panel with "MEDICAL REVIEW / AI-ASSISTED • PROTOTYPE" header
  - [ ] Colors are dark (black/charcoal), not white
  - [ ] Red accents visible (emergency theme)
  - [ ] Cyan accents visible (AI theme)

- [ ] **Critical Information Display**
  - [ ] Allergies section visible (if records exist)
  - [ ] Medications section visible (if records exist)
  - [ ] Cardiac history section visible (if applicable)
  - [ ] Surgeries section visible (if records exist)

- [ ] **Medical History Cards**
  - [ ] Cards show category (badge), title, details snippet, date, provider
  - [ ] Hover state reveals Edit/Delete buttons
  - [ ] Scrolling works (max-h-[500px])

- [ ] **RAG Panel (Critical)**
  - [ ] Panel positioned on right side, sticky (stays visible while scrolling left)
  - [ ] Header visible: "MEDICAL REVIEW" + "AI-ASSISTED • PROTOTYPE"
  - [ ] Warning label visible (record-grounded, not diagnosis, check sources)
  - [ ] Input field works (type query)
  - [ ] Quick action buttons visible: "What is the cardiac history?", "List current medications", etc.
  - [ ] Click quick action button → query submitted
  - [ ] Loading state appears (spinner + "Analyzing records...")
  - [ ] Response appears in chat-like format
  - [ ] **SOURCES DISPLAYED:** Show which records were used (critical for demo!)
  - [ ] Error handling: If fails, shows error message

- [ ] **RAG Functionality**
  - [ ] Test query: "What is the cardiac history?"
  - [ ] Verify response is grounded in records
  - [ ] Verify sources list shows
  - [ ] Test query: "List medications"
  - [ ] Verify response includes medication records
  - [ ] Test query: "Any allergies?"
  - [ ] Verify response mentions allergies if present

- [ ] **Labels & Disclaimers**
  - [ ] "MOCK PROTOTYPE" label visible in header
  - [ ] "SYNTHETIC DATA" warning visible on dashboard
  - [ ] "AI-ASSISTED • PROTOTYPE" label visible on RAG header
  - [ ] RAG warning: "Provides record-grounded assistance for clinician review. Not a diagnosis..."

- [ ] **CRUD Operations** (if time permits)
  - [ ] Click "Add Record" button → modal appears
  - [ ] Fill form + submit → record added
  - [ ] Edit record → modal appears → update → saved
  - [ ] Delete record → confirmation modal → deleted

- [ ] **Error Handling**
  - [ ] Provider offline (select "Offline (503)" in dropdown) → shows provider error gracefully
  - [ ] Network delay (test by throttling) → shows loading state
  - [ ] Insufficient records → RAG says "Insufficient information..."

- [ ] **Performance**
  - [ ] Dashboard loads in <2 seconds
  - [ ] RAG query returns in <5 seconds (or shows error gracefully)
  - [ ] No console errors (open DevTools)
  - [ ] Responsive on desktop (tested)

---

## SECTION 7: DEMO SCRIPT

### 2-3 Minute Demo Narrative

```
"Good morning. I'm presenting ER Recall, an emergency medical history retrieval 
and clinician-assistance system.

[Point to login screen]

The problem: During an emergency, a patient may be unconscious or unable to 
provide their medical history. Doctors need fast access to allergies, medications, 
previous surgeries, and relevant medical information.

[Click login]

ER Recall begins with clinician authentication.

[Enter demo/demo, login]

Next, we have MANDATORY PATIENT IDENTIFICATION using a simulated biometric scan. 
This is a MOCK/SIMULATION for the hackathon prototype.

[Navigate to fingerprint screen, select DEMO-FP-001]

[Click "Start Scan"]

[Watch 3D animation]

The system verifies the patient identity deterministically...

[Success animation]

Patient identified. Now the emergency dashboard loads automatically with the 
patient's medical information.

[Dashboard appears]

On the LEFT, we see the patient's critical information:
- Verified identity (name, health ID, blood group)
- Allergies [point to section] — critical for emergency response
- Current medications [point] — important for interactions
- Cardiac history [point] — relevant for cardiac emergencies
- Previous surgeries [point]
- Complete medical history with dates and sources

On the RIGHT, we have an AI-ASSISTED PROTOTYPE that helps clinicians quickly 
synthesize complex medical information.

[Point to RAG panel]

This is AI-ASSISTED — meaning it retrieves and synthesizes information, but it's 
grounded strictly in the patient's records. It does NOT diagnose, prescribe, or 
make clinical decisions.

[Ask RAG: "What is the cardiac history?"]

[Show loading state]

The AI retrieves relevant records from the patient history...

[Response appears with sources]

Notice: The answer is grounded in the retrieved records, and we show EXACTLY 
which records were used to generate this answer. A clinician can immediately 
verify the information.

[Point to sources]

All access is logged for audit and compliance.

This is a SYNTHETIC DATA demonstration — all information is generated for 
prototype purposes. In production, this would integrate with real medical 
provider networks.

The key innovation: Emergency access + AI-assisted information synthesis = faster, 
safer emergency care.

Thank you."
```

**Demo Duration:** 2 minutes 30 seconds  
**Critical Moments:**
1. Fingerprint scan (shows biometric identity first)
2. Dashboard loads (shows two-column layout)
3. RAG query (shows AI-assisted response + sources)

---

## SECTION 8: TROUBLESHOOTING

### Issue: Dashboard shows white background instead of dark

**Solution:**
- Ensure `/frontend/src/pages/PatientDashboard.tsx` is replaced with redesigned version
- Check Tailwind CSS is properly configured
- Clear browser cache: Ctrl+Shift+Del → Cache

### Issue: RAG panel not visible on right side

**Solution:**
- Verify responsive layout: Dashboard grid includes `lg:col-span-2` + `lg:col-span-1`
- If on narrow screen, RAG may wrap below (expected behavior)
- Ensure window width >1024px for desktop layout

### Issue: RAG queries return empty / no sources

**Solution:**
- Verify patient has records: Check medical history section
- Check backend logs for errors: `docker logs backend`
- If Gemini API key invalid → fallback to keyword matching
- Try different query: e.g., "What medications are recorded?"

### Issue: Fingerprint scan fails

**Solution:**
- Check backend is running: `docker ps | grep backend`
- Try different demo ID: DEMO-FP-002, DEMO-FP-003
- Check logs: `docker logs backend | grep -i fingerprint`

### Issue: Can't log in

**Solution:**
- Verify database is running: `docker ps | grep db`
- Check credentials: `demo` / `demo`
- Check seed data: `cd backend && python seed.py`

---

## SECTION 9: FINAL CHECKLIST BEFORE PITCH

**Week of Hackathon:**
- [ ] All files replaced/verified
- [ ] Environment variables set
- [ ] Docker-compose working
- [ ] End-to-end flow tested (Login → Fingerprint → Dashboard → RAG)
- [ ] PRD.md updated
- [ ] ARCHITECTURE.md updated
- [ ] Demo script rehearsed
- [ ] Screenshots taken (backup)
- [ ] No console errors in browser DevTools
- [ ] RAG responds within 5 seconds (or shows error gracefully)

**Day of Pitch (1 hour before):**
- [ ] `docker-compose up --build` → all services running
- [ ] Test full flow once (login → fingerprint → dashboard → ask RAG)
- [ ] Take screenshot of dashboard layout
- [ ] Open browser DevTools → ensure no errors
- [ ] Have backup slides/presentation ready
- [ ] Have talking points memorized

**During Pitch:**
- [ ] Narrate clearly (speak to judges, not to screen)
- [ ] Emphasize: "This is a PROTOTYPE with SYNTHETIC DATA"
- [ ] Point out: "AI responses are grounded in records + sources shown"
- [ ] Point out: "Biometric is mocked for demo; production would use WebAuthn/phone"
- [ ] Highlight: "All access is audited and RBAC-protected"
- [ ] Keep demo under 3 minutes

---

**Status: READY FOR INTEGRATION**  
**Estimated Integration Time: 30–50 minutes**  
**Risk Level: LOW** (all components exist; mostly layout changes)  
**Go-Live: Hackathon pitch in <1 hour ✓**
