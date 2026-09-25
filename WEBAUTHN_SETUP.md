# SINGLE PHONE / 4 FINGERPRINTS SETUP (WEBAUTHN)

You want to use **ONE single smartphone** during the demo, but have 4 different team members touch it, and pull up 4 different patient records.

### 🛑 The Technical Reality (Important for the pitch!)
Apple (FaceID/TouchID) and Google (Android Biometrics) **STRICTLY PROHIBIT** websites from knowing *which* specific finger was scanned. For privacy, the phone only tells the website: *"A valid owner of this phone scanned their finger."*

**HOWEVER**, we can achieve exactly what you want for the demo using **Passkey Profiles** (Discoverable Credentials).

Here is what the demo will look like on your one phone:
1. You click "Verify Device Biometric".
2. The phone pops up a native Apple/Android sheet asking: **"Which patient profile are you verifying?"** showing Member 1, Member 2, Member 3, and Member 4.
3. The specific team member taps their name, then scans their fingerprint.
4. The system automatically routes to that specific patient's medical record!

This looks incredibly professional, uses real biometrics, and maps to the correct records.

---

### Step 1: Start Ngrok (REQUIRED)
Real biometrics will **NOT WORK** on `http://192.168...`. You must use HTTPS.
1. Download ngrok (https://ngrok.com) on your laptop.
2. Run: `ngrok http 5173`
3. Note the Forwarding URL (e.g., `https://a1b2-c3d4.ngrok-free.app`)

### Step 2: Update Your `.env` Files
In your backend `.env` (or docker-compose.yml):
```env
RP_ID="a1b2-c3d4.ngrok-free.app"  # NO https://, JUST THE DOMAIN
ORIGIN="https://a1b2-c3d4.ngrok-free.app" # FULL URL
```
In your frontend `.env`:
```env
VITE_API_URL="https://a1b2-c3d4.ngrok-free.app/api/v1"
```
*Restart Docker after changing this (`docker compose down && docker compose up -d --build`).*

### Step 3: Register The 4 Profiles on Your ONE Phone
1. Open the Ngrok HTTPS URL on the **Single Phone** you will use for the demo.
2. Log in with `dr_smith` / `password123`.
3. Open the "⚙️ Demo Controls" menu on the fingerprint page.
4. Check the box **"Use Real Device Biometric (WebAuthn)"**.
5. Click **"Reg Member 1 (John)"**. Your phone will ask you to save a Passkey. Scan your finger to save it.
6. Click **"Reg Member 2 (Jane)"**. Save the passkey.
7. Click **"Reg Member 3 (Bob)"**. Save the passkey.
8. Click **"Reg Member 4 (Alice)"**. Save the passkey.

*You now have 4 biometric passkeys stored on your phone for this website!*

### Step 4: The Live Demo!
During the pitch:
1. Log in on the phone.
2. Ensure **"Use Real Device Biometric (WebAuthn)"** is checked.
3. Click **"Verify Device Biometric"**.
4. **The Magic:** Your phone will show a native popup asking you to choose between Member 1, 2, 3, or 4.
5. Have the correct team member select their profile and scan their finger.
6. The dashboard will instantly load the correct medical record!
