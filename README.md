# ATLAS — GLOBAL COMMERCE. VERIFIED PAYMENTS. ONE PLATFORM.

> Cross-border commerce and payments operating system helping African businesses manage international suppliers, contractors, marketplace sellers, invoices, payment approvals, foreign exchange, and international payouts through one connected experience.

---

## 1. Executive Summary

Most fintech applications focus solely on helping people send money. **ATLAS** focuses on helping businesses confidently manage the entire trust and verification process surrounding international money movement:
- **Why is this payment being made?**
- **Who is receiving it?**
- **Is the invoice genuine or an accidental duplicate?**
- **Have recipient bank details changed since prior payouts?**
- **What live exchange rate and fees are being applied?**
- **Who authorized the transaction?**
- **Was the payout actually completed on the provider rail?**
- **Can we cryptographically prove what happened?**

ATLAS bridges **Commerce**, **Trust**, and **Payments** into one controlled workflow powered by **Blaaiz** payment infrastructure.

---

## 2. The Three Interconnected Modules

```
+---------------------------------------------------------------------------------------------------------+
|                                             ATLAS PLATFORM                                              |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|  1. ATLAS COMMERCE        2. ATLAS PAYROLL            3. PROOFRAIL TRUST          4. RELAY ENGINE       |
|  - Multi-Tenant Orgs      - Global Workforce Hub      - Deterministic Risk Rules  - Blaaiz Provider API |
|  - Supplier Directory     - Employee vs Contractor    - Recipient Change Lock     - Live FX Rates & Fees|
|  - Recipient Profiles     - Guided Batch Wizard       - Duplicate Detection       - Payout Lifecycle    |
|  - OCR Ingestion          - Multi-Currency Exposure   - Multi-Step Approvals      - Webhook Verifier    |
|  - Invoice Workspace      - Retry Failed Payouts      - Immutable Audit Trail     - Auto-Reconciliation |
|                                                                                                         |
+---------------------------------------------------------------------------------------------------------+
|                          Shared PostgreSQL Engine & High-Precision Money Types                          |
+---------------------------------------------------------------------------------------------------------+
```

### Module 1: REAL AUTHENTICATION & BUSINESS ONBOARDING
- **Cryptographic User Authentication**: Secure sign up and login with bcryptjs password hashing (salt rounds: 10) and signed JWT sessions (24-hour expiry).
- **Email Verification Flow**: 6-digit verification token dispatch with expiration guards and resend throttling.
- **Progressive Business Onboarding**: 5-step guided wizard (Account Role, Legal Entity, Operating Office, KYB Credentials, Rail Activation) with save-progress draft persistence (`POST /api/v1/onboarding/save-draft`).
- **Honest Non-Fabricated KYB Status**: Newly registered enterprises receive realistic `pending_verification` / `pending_review` compliance status without fabricated approvals or simulated instant verifications.
- **Strict Tenant Isolation**: Server-enforced workspace boundary (`enforceWorkspaceIsolation` middleware) ensuring users only access organizations they actively belong to.
- **RBAC Role Authorization**: Granular backend permissions for `owner`, `finance_manager`, `approver`, and `admin`.

### Module 2: ATLAS COMMERCE
- **Multi-Tenant Organisations**: Granular data isolation for African enterprises and subsidiaries with base currencies (NGN, KES, USD).
- **Suppliers & Contractors**: Global directory tracking company registrations, tax IDs, contact channels, and historical volumes.
- **Invoice Workspace**: Drag-and-drop document upload, automated OCR field extraction (amounts, currencies, due dates, bank routing), split-pane manual correction, and duplicate tracking.

### Module 3: ATLAS PAYROLL & WORKFORCE DISBURSEMENTS
- **International Workforce Roster**: Distinct classification between full-time employees and international contractors across Nigeria, Kenya, the UK, Canada, and the US.
- **Guided Batch Creation Wizard**: 4-step guided creation for scheduling month-end cycles, configuring compensation per recipient, and calculating aggregate corporate funding liability.
- **Live FX Pricing via Blaaiz**: Live quote integration fetching verified rates and fee breakdowns without fabricated estimates or hardcoded numbers.
- **Currency Exposure Breakdown**: Real-time liability visibility across payout corridors (NGN, KES, GBP, CAD, USD).
- **Executive Dual Authorization**: Integrated multi-signature sign-off and ProofRail compliance pre-flight checks before batch execution.
- **Disbursement Tracking & Failure Recovery**: Granular status per recipient transfer with dedicated retry controls for failed line items.

### Module 4: PROOFRAIL TRUST ENGINE
- **Deterministic Heuristic Rules**: Transparent risk engine that evaluates invoices and beneficiaries against verified financial criteria (no ungrounded AI hallucinations).
- **Recipient Bank Change Protection**: Automatically detects when a vendor's bank details or routing numbers are altered, immediately flags the beneficiary, and halts automated execution until out-of-band telephone callback verification is logged.
- **Organisation Payment Policies**: Enforces single transaction ceilings, daily volume caps, and dual-approval thresholds at the server boundary.
- **Multi-Step Approval Workflows**: Human-in-the-loop authorization where authorized roles (`owner`, `finance_manager`, `approver`, `admin`) inspect risk findings before signing.
- **Cryptographic Audit Trail**: Append-only immutable log for all sensitive actions.

### Module 5: RELAY PAYMENT ENGINE
- **Blaaiz Provider Adapter**: Official integration conforming to [docs.blaaiz.com](https://docs.blaaiz.com/) (`https://api-dev.blaaiz.com`).
- **OAuth 2.0 Client Credentials**: Automated Bearer token lifecycle management with in-memory caching and renewal.
- **Fee & FX Transparency**: Fetches fees breakdown (`POST /api/external/fees/breakdown`) and live rates (`GET /api/external/rates`) displaying exact fees, VAT, and guaranteed exchange rates.
- **Payout Execution**: Initiates fiat bank transfers (`POST /api/external/payout`) with strict idempotency keys (`idempotency_key`) and provider reference tracking (`provider_reference`).
- **Webhook Processing**: Validates incoming events using HMAC SHA-256 signature verification (`x-blaaiz-signature`).
- **Reconciliation Engine**: Compares internal payment records vs provider status vs received webhook events to flag and heal discrepancies.

---

## 3. Technology Stack

- **Backend**: Node.js 22 + TypeScript + Express.js + `pg` (Port: `3007`)
- **Database**: PostgreSQL (`atlas`, `atlas_test`) with relational integrity and transactions
- **Payment Infrastructure**: Blaaiz Platform API (`api-dev.blaaiz.com`) & High-Fidelity Sandbox Emulator
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 + Lucide Icons (Port: `5180`)
- **Testing**: Vitest across backend API, ProofRail rules, Blaaiz adapter, and frontend components
- **Monorepo**: Clean npm workspaces (`backend`, `frontend`)

---

## 4. Quick Start & Setup Guide

### Prerequisites
- Node.js v20+ (v22 recommended)
- PostgreSQL running locally on UNIX domain socket `/var/run/postgresql` or standard connection string

### 1. Clone & Install Dependencies
```bash
cd /home/acknowlege/Desktop/atlas
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `.env` configuration:
```env
PORT=3007
FRONTEND_PORT=5180
DATABASE_URL=postgres:///atlas?host=/var/run/postgresql
TEST_DATABASE_URL=postgres:///atlas_test?host=/var/run/postgresql
BLAAIZ_BASE_URL=https://api-dev.blaaiz.com
BLAAIZ_CLIENT_ID=your_blaaiz_client_id
BLAAIZ_CLIENT_SECRET=your_blaaiz_client_secret
BLAAIZ_WEBHOOK_SECRET=atlas_blaaiz_dev_webhook_secret_key_123
ENABLE_BLAAIZ_EMULATOR=true
```

### 3. Database Migration & Seed
```bash
psql -h /var/run/postgresql -U $(whoami) -d atlas -f database/migrations/001_initial_schema.sql
psql -h /var/run/postgresql -U $(whoami) -d atlas -f database/migrations/002_payroll_schema.sql
psql -h /var/run/postgresql -U $(whoami) -d atlas -f database/migrations/003_auth_and_onboarding.sql
psql -h /var/run/postgresql -U $(whoami) -d atlas -f database/seeds/001_seed_atlas_demo.sql
psql -h /var/run/postgresql -U $(whoami) -d atlas -f database/seeds/002_seed_payroll.sql
```

### 4. Run Automated Test Suites
```bash
npm test
```
*Executes all 40 tests across authentication & session verification, progressive onboarding, cross-workspace isolation, payroll APIs, ProofRail heuristics, and Blaaiz adapter.*

### 5. Start Development Servers
```bash
npm run dev
```
- **Backend API**: [http://localhost:3007](http://localhost:3007)
- **Frontend Web**: [http://localhost:5180](http://localhost:5180)
- **API Health Check**: [http://localhost:3007/api/v1/health](http://localhost:3007/api/v1/health)

---

## 5. Repository Structure

```
atlas/
├── package.json               # Root workspaces configuration
├── .env.example               # Environment template
├── README.md                  # Executive overview & quickstart
├── ARCHITECTURE.md            # System architecture & component design
├── PROOFRAIL_SPECIFICATION.md # Trust engine, risk rules & policies
├── BLAAIZ_INTEGRATION.md      # Official Blaaiz API integration runbook
├── SECURITY_MODEL.md          # Security & trust boundaries
├── DATABASE_SCHEMA.md         # PostgreSQL schema & ER diagrams
├── DEMO_GUIDE.md              # Hackathon demonstration runbook
├── FINAL_REPORT.md            # Comprehensive engineering completion report
│
├── backend/
│   ├── src/
│   │   ├── app.ts             # Express application & route mounts
│   │   ├── config.ts          # Environment variables & constants
│   │   ├── db.ts              # PostgreSQL pool & transaction helper
│   │   ├── index.ts           # Server bootstrap (Port 3007)
│   │   ├── blaaiz/            # Blaaiz provider adapter & webhook verifier
│   │   ├── proofrail/         # ProofRail risk heuristics & policy engine
│   │   ├── ocr/               # Structured invoice extraction
│   │   ├── reconciliation/    # Payout reconciliation worker
│   │   ├── routes/            # REST API endpoints
│   │   └── utils/             # Money, audit, and standardized errors
│   └── test/                  # 25 automated backend tests
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Main application workspace
│   │   ├── components/        # Component system (layout, dashboard, commerce, relay)
│   │   └── lib/               # Types, formatters, and typed API client
│   └── test/                  # 4 automated frontend tests
│
└── database/
    ├── migrations/            # SQL migration scripts
    └── seeds/                 # Realistic African enterprise demo seed
```

# Atlas
