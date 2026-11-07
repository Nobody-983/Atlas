-- ============================================================================
-- ATLAS PLATFORM: BASELINE DEMO WORKSPACE & EVALUATOR PERSONAS
-- Migration: 005_demo_workspace_sync.sql
-- ============================================================================

DO $$
DECLARE
    org_apex_id UUID := 'a1000000-0000-0000-0000-000000000001';
    user_amara_id UUID := 'b1000000-0000-0000-0000-000000000001';
    user_tunde_id UUID := 'b1000000-0000-0000-0000-000000000002';
    user_david_id UUID := 'b1000000-0000-0000-0000-000000000003';
    user_zainab_id UUID := 'b1000000-0000-0000-0000-000000000004';
    -- Bcrypt hash for 'StrongPassword123!' (cost 10)
    pw_hash VARCHAR(255) := '$2b$10$7q4AyNVQNKS5fcbSv6pb9ePwORQ1F6ReVp3X7XX9WJ3iv1ho21OGC';
BEGIN
    -- 1. Ensure Demo Organisation Exists
    INSERT INTO organisations (id, name, slug, business_type, country, base_currency, tax_id, registration_number, onboarding_status, kyb_verification_status)
    VALUES (
        org_apex_id,
        'Apex Global Imports & Logistics Ltd',
        'apex-global',
        'limited_company',
        'NGA',
        'NGN',
        'TIN-09284102-0001',
        'RC-1849204',
        'active',
        'verified'
    )
    ON CONFLICT (id) DO UPDATE SET
        onboarding_status = 'active',
        kyb_verification_status = 'verified';

    -- 2. Ensure Evaluator Demo Users Exist with valid credentials
    INSERT INTO users (id, email, full_name, password_hash, phone_number, is_email_verified)
    VALUES
    (user_amara_id, 'amara@apeximports.ng', 'Amara Okafor', pw_hash, '+2348039201928', TRUE),
    (user_tunde_id, 'tunde@apeximports.ng', 'Tunde Bakare', pw_hash, '+2348028192039', TRUE),
    (user_david_id, 'david@apeximports.ng', 'David Adeleke', pw_hash, '+2348057281920', TRUE),
    (user_zainab_id, 'zainab@apeximports.ng', 'Zainab Bello', pw_hash, '+2348098271829', TRUE)
    ON CONFLICT (id) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        is_email_verified = TRUE;

    -- 3. Ensure Organisation Memberships (RBAC)
    INSERT INTO organisation_members (organisation_id, user_id, role)
    VALUES
    (org_apex_id, user_amara_id, 'owner'),
    (org_apex_id, user_tunde_id, 'finance_manager'),
    (org_apex_id, user_david_id, 'approver'),
    (org_apex_id, user_zainab_id, 'admin')
    ON CONFLICT (organisation_id, user_id) DO NOTHING;

    -- 4. Ensure Policy Thresholds
    INSERT INTO organisation_policies (
        organisation_id,
        max_single_payment_minor,
        max_daily_payment_minor,
        dual_approval_threshold_minor,
        require_new_recipient_review,
        block_unverified_corridors
    ) VALUES (
        org_apex_id,
        2500000000,
        10000000000,
        750000000,
        TRUE,
        TRUE
    ) ON CONFLICT (organisation_id) DO NOTHING;
END $$;
