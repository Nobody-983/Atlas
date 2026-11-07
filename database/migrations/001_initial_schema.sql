-- ============================================================================
-- ATLAS PLATFORM SCHEMA MIGRATION 001
-- Multi-Tenant Cross-Border Commerce, ProofRail Trust & Relay Payments
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ORGANISATIONS
CREATE TABLE IF NOT EXISTS organisations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    business_type VARCHAR(100) NOT NULL DEFAULT 'limited_company',
    country VARCHAR(3) NOT NULL DEFAULT 'NGA', -- ISO 3166-1 alpha-3
    base_currency VARCHAR(3) NOT NULL DEFAULT 'NGN', -- ISO 4217
    tax_id VARCHAR(100),
    registration_number VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. USERS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ORGANISATION MEMBERS (RBAC)
CREATE TYPE org_role AS ENUM ('owner', 'admin', 'finance_manager', 'approver', 'viewer');

CREATE TABLE IF NOT EXISTS organisation_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role org_role NOT NULL DEFAULT 'viewer',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organisation_id, user_id)
);

-- 4. ORGANISATION PAYMENT POLICIES
CREATE TABLE IF NOT EXISTS organisation_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL UNIQUE REFERENCES organisations(id) ON DELETE CASCADE,
    max_single_payment_minor BIGINT NOT NULL DEFAULT 1500000000, -- e.g. 15M NGN in kobo ($10k approx)
    max_daily_payment_minor BIGINT NOT NULL DEFAULT 7500000000,  -- e.g. 75M NGN in kobo
    dual_approval_threshold_minor BIGINT NOT NULL DEFAULT 750000000, -- payments > 7.5M NGN require 2 approvers
    require_new_recipient_review BOOLEAN NOT NULL DEFAULT TRUE,
    block_unverified_corridors BOOLEAN NOT NULL DEFAULT TRUE,
    is_auto_reconciliation_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. SUPPLIERS (COMMERCE)
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    country VARCHAR(3) NOT NULL, -- e.g. CHN, USA, GBR, KEN, NGA
    business_type VARCHAR(100) NOT NULL DEFAULT 'supplier', -- supplier, contractor, marketplace_seller
    registration_number VARCHAR(100),
    tax_id VARCHAR(100),
    verification_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, verified, rejected
    total_paid_minor BIGINT NOT NULL DEFAULT 0,
    outstanding_minor BIGINT NOT NULL DEFAULT 0,
    last_payment_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. RECIPIENTS & PAYOUT PROFILES
CREATE TABLE IF NOT EXISTS recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    display_name VARCHAR(255) NOT NULL,
    country VARCHAR(3) NOT NULL, -- e.g. USA, GBR, CHN, KEN, NGA, CAN
    currency VARCHAR(3) NOT NULL, -- USD, GBP, EUR, KES, NGN, CAD, CNY
    payout_method VARCHAR(50) NOT NULL DEFAULT 'bank_transfer', -- bank_transfer, mobile_money, interac
    verification_level VARCHAR(50) NOT NULL DEFAULT 'unverified', -- unverified, internal_verified, provider_verified
    is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
    flag_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. RECIPIENT BANK ACCOUNTS
CREATE TABLE IF NOT EXISTS recipient_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
    bank_name VARCHAR(255) NOT NULL,
    bank_code VARCHAR(50),
    account_number VARCHAR(100) NOT NULL,
    routing_number VARCHAR(50), -- ACH routing / Fedwire
    swift_bic VARCHAR(20),
    iban VARCHAR(50),
    sort_code VARCHAR(20),
    transit_number VARCHAR(20),
    account_type VARCHAR(50) DEFAULT 'checking', -- checking, savings, business
    currency VARCHAR(3) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. RECIPIENT CHANGE HISTORY (PROOFRAIL PROTECTION)
CREATE TABLE IF NOT EXISTS recipient_change_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    old_account_data JSONB NOT NULL,
    new_account_data JSONB NOT NULL,
    change_reason TEXT NOT NULL,
    review_status VARCHAR(50) NOT NULL DEFAULT 'pending_review', -- pending_review, approved, rejected
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. INVOICES (COMMERCE & INTEL)
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    recipient_id UUID REFERENCES recipients(id) ON DELETE SET NULL,
    invoice_number VARCHAR(100) NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    amount_minor BIGINT NOT NULL, -- e.g. 500000 = $5,000.00
    description TEXT,
    file_url VARCHAR(500),
    file_name VARCHAR(255),
    file_size_bytes INT,
    file_hash VARCHAR(64), -- SHA-256 duplicate detection
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, pending_review, approved, paid, rejected, cancelled
    is_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organisation_id, invoice_number, supplier_id)
);

-- 10. INVOICE EXTRACTIONS (OCR / INTELLIGENCE)
CREATE TABLE IF NOT EXISTS invoice_extractions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL UNIQUE REFERENCES invoices(id) ON DELETE CASCADE,
    raw_text TEXT,
    extracted_fields JSONB NOT NULL, -- { invoice_number, supplier_name, amount, currency, bank_account, etc. }
    confidence_scores JSONB NOT NULL, -- { amount: 0.98, invoice_number: 0.95 }
    review_state VARCHAR(50) NOT NULL DEFAULT 'auto_extracted', -- auto_extracted, user_modified, verified
    extracted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. INVOICE RISK FINDINGS (PROOFRAIL RULES)
CREATE TABLE IF NOT EXISTS invoice_risk_findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    rule_code VARCHAR(100) NOT NULL, -- DUPLICATE_INVOICE, RECIPIENT_CHANGED, UNUSUAL_AMOUNT, etc.
    severity VARCHAR(20) NOT NULL, -- info, warning, critical
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    triggering_data JSONB,
    action_required TEXT,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. PAYMENT REQUESTS
CREATE TABLE IF NOT EXISTS payment_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    recipient_id UUID NOT NULL REFERENCES recipients(id) ON DELETE RESTRICT,
    recipient_account_id UUID NOT NULL REFERENCES recipient_accounts(id) ON DELETE RESTRICT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    source_currency VARCHAR(3) NOT NULL,
    destination_currency VARCHAR(3) NOT NULL,
    source_amount_minor BIGINT NOT NULL,
    destination_amount_minor BIGINT,
    purpose TEXT NOT NULL,
    risk_level VARCHAR(20) NOT NULL DEFAULT 'clear', -- clear, review_required, blocked
    risk_score INT NOT NULL DEFAULT 0, -- 0-100
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, pending_review, awaiting_approval, approved, rejected, cancelled
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. PAYMENT QUOTES (BLAAIZ FX & FEES)
CREATE TABLE IF NOT EXISTS payment_quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_request_id UUID REFERENCES payment_requests(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'blaaiz',
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    from_amount_minor BIGINT NOT NULL,
    to_amount_minor BIGINT NOT NULL,
    exchange_rate NUMERIC(18, 8) NOT NULL,
    provider_fee_minor BIGINT NOT NULL DEFAULT 0,
    network_fee_minor BIGINT NOT NULL DEFAULT 0,
    total_charge_minor BIGINT NOT NULL,
    quote_reference VARCHAR(100) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_executed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. PAYMENT APPROVALS (MULTI-STEP WORKFLOW)
CREATE TABLE IF NOT EXISTS payment_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_request_id UUID NOT NULL REFERENCES payment_requests(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    step_number INT NOT NULL DEFAULT 1,
    decision VARCHAR(20) NOT NULL, -- approved, rejected
    rejection_reason TEXT,
    notes TEXT,
    decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. PAYMENTS (RELAY LIFECYCLE)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    payment_request_id UUID REFERENCES payment_requests(id) ON DELETE SET NULL,
    quote_id UUID REFERENCES payment_quotes(id) ON DELETE SET NULL,
    recipient_id UUID NOT NULL REFERENCES recipients(id) ON DELETE RESTRICT,
    recipient_account_id UUID NOT NULL REFERENCES recipient_accounts(id) ON DELETE RESTRICT,
    initiated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    provider VARCHAR(50) NOT NULL DEFAULT 'blaaiz',
    provider_reference VARCHAR(100),
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    source_currency VARCHAR(3) NOT NULL,
    destination_currency VARCHAR(3) NOT NULL,
    source_amount_minor BIGINT NOT NULL,
    destination_amount_minor BIGINT NOT NULL,
    exchange_rate NUMERIC(18, 8) NOT NULL,
    provider_fee_minor BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'processing', -- processing, completed, failed, cancelled, requires_reconciliation
    error_code VARCHAR(100),
    error_message TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    reconciled_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. PROVIDER WEBHOOK EVENTS
CREATE TABLE IF NOT EXISTS payment_provider_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'blaaiz',
    event_type VARCHAR(100) NOT NULL,
    provider_reference VARCHAR(100),
    payload JSONB NOT NULL,
    signature_header VARCHAR(255),
    is_signature_valid BOOLEAN NOT NULL DEFAULT FALSE,
    processing_status VARCHAR(50) NOT NULL DEFAULT 'processed', -- received, processed, failed
    error_details TEXT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. AUDIT TRAIL (APPEND-ONLY FINANCIAL & SECURITY HISTORY)
CREATE TABLE IF NOT EXISTS payment_audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL, -- invoice, recipient, quote, approval, payment, policy
    resource_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL, -- created, updated, bank_details_changed, quote_requested, approved, payout_initiated, payout_completed, etc.
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_name VARCHAR(255) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. RECONCILIATION RUNS
CREATE TABLE IF NOT EXISTS reconciliation_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    run_type VARCHAR(50) NOT NULL DEFAULT 'automated', -- automated, manual
    records_inspected INT NOT NULL DEFAULT 0,
    discrepancies_detected INT NOT NULL DEFAULT 0,
    discrepancies_resolved INT NOT NULL DEFAULT 0,
    summary_report JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'payment', -- payment, approval, security, policy, invoice
    link_url VARCHAR(255),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERYING & SOLVENCY MONITORING
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_members_org_user ON organisation_members(organisation_id, user_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_org ON suppliers(organisation_id);
CREATE INDEX IF NOT EXISTS idx_recipients_org ON recipients(organisation_id);
CREATE INDEX IF NOT EXISTS idx_recipient_accounts_recipient ON recipient_accounts(recipient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organisation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_hash ON invoices(file_hash);
CREATE INDEX IF NOT EXISTS idx_risk_findings_invoice ON invoice_risk_findings(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_org ON payments(organisation_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_idempotency ON payments(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payments_ref ON payments(provider_reference);
CREATE INDEX IF NOT EXISTS idx_audit_org_created ON payment_audit_events(organisation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON payment_audit_events(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

