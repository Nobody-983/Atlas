# HACKATHON DEMO & PRESENTATION RUNBOOK — ATLAS

This runbook guides presenters through a 5-minute end-to-end demonstration of **ATLAS**, showcasing how **Commerce**, **ProofRail Trust**, and **Relay Payments (Blaaiz)** solve cross-border payment challenges for African enterprises.

---

## 1. Setup & Environment Verification

1. Ensure the development server is running:
   - Web Client: [http://localhost:5180](http://localhost:5180)
   - Backend API: [http://localhost:3007/api/v1/health](http://localhost:3007/api/v1/health)
2. Confirm the top status bar displays:
   - `BLAAIZ SANDBOX (EMULATOR ACTIVE)` or `(LIVE API)`
   - Organisation: `Apex Global Imports & Logistics Ltd (NGA • NGN)`
   - Active Persona: `Tunde Bakare (Finance Manager)`

---

## 2. 5-Minute Pitch & Demo Script

### Scene 1: The Problem & Executive Dashboard (0:00 – 1:00)
- **Narrative**:
  > "African enterprises lose millions every year to international wire fraud, hidden FX markups, and duplicate invoice billing. Most payment apps just give you a 'Send Money' button. ATLAS is different: we built an operating system that connects Commerce, Trust, and Payments."
- **Action**:
  - Show the **Overview Dashboard** ([http://localhost:5180](http://localhost:5180)).
  - Point out the active **Settlement Corridors** (USD, KES, EUR, GBP), **Total Settled**, and the **ProofRail Critical Risk Banner**.

---

### Scene 2: Intelligent Invoice Ingestion & Duplicate Protection (1:00 – 2:00)
- **Narrative**:
  > "Let's look at Module One: ATLAS Commerce. An accounts payable team receives dozens of supplier invoices weekly."
- **Action**:
  - Click **Invoices** tab in top nav.
  - Click **Upload Invoice** button.
  - Click **"Sample 2: Duplicate Invoice Test (INV-2026-9041)"**.
  - Click **Process & Extract Intelligence**.
- **The Wow Moment**:
  - Point out the **DUPLICATE DETECTED** badge: ProofRail instantly caught that an invoice with number `INV-2026-9041` for $3,450 USD was already in the database, preventing double billing!

---

### Scene 3: ProofRail Recipient Change Protection (Anti-BEC) (2:00 – 3:15)
- **Narrative**:
  > "Now, here is our key security differentiator: ProofRail Recipient Change Protection. In Business Email Compromise attacks, scammers compromise a vendor's email and tell you: 'Our bank has changed, wire the money to this new routing number.' Most platforms blindly send the wire. ProofRail stops it."
- **Action**:
  - Click **ProofRail** tab.
  - Show the **Active Recipient Change Protection Alert**: Global Freight Chase Operating Account was recently modified from JPMorgan Chase to Coastal Credit Union.
  - Click **Review & Clear Flag**: explain how ATLAS enforces an out-of-band telephone callback with the vendor before clearing the security hold.
  - Click **Confirm Callback & Clear Flag** to demonstrate clearing the hold.

---

### Scene 4: Blaaiz Live FX Quote & Fee Transparency (3:15 – 4:00)
- **Narrative**:
  > "Now let's execute a payment through Module Three: Relay, powered by Blaaiz."
- **Action**:
  - Click **Initiate Payout** button.
  - Select **Shenzhen Microtech Bank Account (USD Wire)**.
  - Enter **$5,000 USD**.
  - Show the **Blaaiz Quote Breakdown**:
    - Real-time exchange rate: `1 NGN = 0.00066225 USD`
    - Transparent provider fee: `0.35% + flat charge`
    - Guaranteed 15-minute quote expiration.
  - Click **Submit for Authorization**.

---

### Scene 5: Multi-Step Approval & Relay Payout Dispatch (4:00 – 5:00)
- **Narrative**:
  > "Notice that the payment was not immediately sent. In ATLAS, no AI or script can move money without authorized human approval."
- **Action**:
  - Switch tab to **Approvals**.
  - Show the pending payment request with risk score and purpose.
  - Click **Authorize Payout**.
  - Show the payment transition into **Relay Payments**:
    - Provider Reference: `BLZ_PAY_...`
    - Lifecycle status: `processing` -> `completed`.
  - Click **Inspect** to reveal the complete lifecycle timeline, Blaaiz payload, and cryptographic audit events!

---

## 3. Persona Switcher Walkthrough

In the top right banner, use the **Persona Switcher** to demonstrate role-based access control:
- **Amara Okafor (Owner)**: Has full executive authority and dual-approval rights for payments over ₦7.5M.
- **Tunde Bakare (Finance Manager)**: Daily AP operations and payout authorization.
- **David Adeleke (Approver)**: Prepares invoices and procurement agreements.
- **Zainab Bello (Compliance Admin)**: Manages policy thresholds and recipient change audits.

