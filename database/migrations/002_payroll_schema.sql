-- ============================================================================
-- ATLAS PLATFORM: PAYROLL & CROSS-BORDER WORKFORCE SCHEMA
-- Migration: 002_payroll_schema.sql
-- ============================================================================

-- 1. EXTEND RECIPIENTS WITH WORKFORCE ATTRIBUTES
ALTER TABLE recipients ADD COLUMN IF NOT EXISTS recipient_type VARCHAR(50) NOT NULL DEFAULT 'contractor';
ALTER TABLE recipients ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE recipients ADD COLUMN IF NOT EXISTS job_title VARCHAR(150);
ALTER TABLE recipients ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE recipients ADD COLUMN IF NOT EXISTS default_salary_minor BIGINT DEFAULT 0;
ALTER TABLE recipients ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'active';

-- Update existing recipients to be classified as suppliers if they have a supplier_id
UPDATE recipients SET recipient_type = 'supplier' WHERE supplier_id IS NOT NULL AND recipient_type = 'contractor';

-- 2. PAYROLL RUNS (BATCH PAYROLL CYCLES)
CREATE TABLE IF NOT EXISTS payroll_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    pay_date DATE NOT NULL,
    funding_currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, pending_approval, approved, processing, completed, failed, cancelled
    total_funding_minor BIGINT NOT NULL DEFAULT 0,
    total_payout_minor BIGINT NOT NULL DEFAULT 0,
    total_fee_minor BIGINT NOT NULL DEFAULT 0,
    recipient_count INT NOT NULL DEFAULT 0,
    risk_status VARCHAR(50) NOT NULL DEFAULT 'clear', -- clear, review_required, blocked
    risk_details JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PAYROLL ITEMS (INDIVIDUAL EMPLOYEE / CONTRACTOR PAYOUTS IN A BATCH)
CREATE TABLE IF NOT EXISTS payroll_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES recipients(id) ON DELETE RESTRICT,
    recipient_account_id UUID REFERENCES recipient_accounts(id) ON DELETE RESTRICT,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    payment_request_id UUID REFERENCES payment_requests(id) ON DELETE SET NULL,
    item_type VARCHAR(50) NOT NULL DEFAULT 'salary', -- salary, contractor_fee, bonus, reimbursement
    destination_currency VARCHAR(3) NOT NULL,
    destination_amount_minor BIGINT NOT NULL,
    source_currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    source_amount_minor BIGINT NOT NULL DEFAULT 0,
    exchange_rate NUMERIC(18, 8) NOT NULL DEFAULT 1.0,
    provider_fee_minor BIGINT NOT NULL DEFAULT 0,
    quote_reference VARCHAR(100),
    quote_expires_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, processing, completed, failed
    error_message TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PERFORMANCE & WORKFORCE INDEXES
CREATE INDEX IF NOT EXISTS idx_payroll_runs_org ON payroll_runs(organisation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_status ON payroll_runs(status);
CREATE INDEX IF NOT EXISTS idx_payroll_items_run ON payroll_items(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_recip ON payroll_items(recipient_id);
CREATE INDEX IF NOT EXISTS idx_recipients_type ON recipients(organisation_id, recipient_type);

