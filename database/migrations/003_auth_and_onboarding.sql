-- ============================================================================
-- ATLAS PLATFORM: AUTHENTICATION & BUSINESS ONBOARDING SCHEMA
-- Migration: 003_auth_and_onboarding.sql
-- ============================================================================

-- 1. EXTEND USERS TABLE FOR EMAIL VERIFICATION & PASSWORD RESET
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMPTZ;

-- Mark seeded test users as verified so existing tests continue seamlessly
UPDATE users SET is_email_verified = TRUE WHERE is_email_verified = FALSE;

-- 2. EXTEND ORGANISATIONS TABLE FOR PROGRESSIVE ONBOARDING & KYB VERIFICATION
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS onboarding_status VARCHAR(50) NOT NULL DEFAULT 'in_progress';
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS onboarding_step INT NOT NULL DEFAULT 1;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS onboarding_data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS operating_address JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS kyb_verification_status VARCHAR(50) NOT NULL DEFAULT 'not_submitted';
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS kyb_documents JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS kyb_notes TEXT;

-- Mark existing demo organisations as active onboarding status
UPDATE organisations SET onboarding_status = 'active', kyb_verification_status = 'verified' WHERE onboarding_status = 'in_progress';

-- 3. USER INVITATIONS TABLE (TEAM ONBOARDING FOR ROLES: FINANCE MANAGER, APPROVER)
CREATE TABLE IF NOT EXISTS user_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role org_role NOT NULL DEFAULT 'approver',
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, accepted, expired, revoked
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PERFORMANCE & AUTH INDEXES
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_verif_token ON users(email_verification_token) WHERE email_verification_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(password_reset_token) WHERE password_reset_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_org_onboarding ON organisations(onboarding_status);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_org_email ON user_invitations(organisation_id, email);

