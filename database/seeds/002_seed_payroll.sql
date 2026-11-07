-- ============================================================================
-- ATLAS PLATFORM: REAL WORKFORCE & PAYROLL SEED DATA
-- Seed: 002_seed_payroll.sql
-- ============================================================================

DO $$
DECLARE
    org_apex_id UUID := 'a1000000-0000-0000-0000-000000000001';
    user_tunde_id UUID := 'b1000000-0000-0000-0000-000000000002';
    user_amara_id UUID := 'b1000000-0000-0000-0000-000000000001';

    recip_emeka_id UUID := 'd2000000-0000-0000-0000-000000000001';
    recip_fatima_id UUID := 'd2000000-0000-0000-0000-000000000002';
    recip_chidi_id UUID := 'd2000000-0000-0000-0000-000000000003';
    recip_elena_id UUID := 'd2000000-0000-0000-0000-000000000004';
    recip_marcus_id UUID := 'd2000000-0000-0000-0000-000000000005';

    acct_emeka_id UUID := 'e2000000-0000-0000-0000-000000000001';
    acct_fatima_id UUID := 'e2000000-0000-0000-0000-000000000002';
    acct_chidi_id UUID := 'e2000000-0000-0000-0000-000000000003';
    acct_elena_id UUID := 'e2000000-0000-0000-0000-000000000004';
    acct_marcus_id UUID := 'e2000000-0000-0000-0000-000000000005';

    run_oct_id UUID := '71000000-0000-0000-0000-000000000001';
    run_nov_id UUID := '71000000-0000-0000-0000-000000000002';
BEGIN
    -- 1. INSERT REAL EMPLOYEES & CONTRACTORS
    INSERT INTO recipients (
        id, organisation_id, display_name, country, currency, payout_method, verification_level,
        recipient_type, department, job_title, email, default_salary_minor, status
    ) VALUES
    (recip_chidi_id, org_apex_id, 'Chidi Eze', 'NGA', 'NGN', 'bank_transfer', 'provider_verified',
     'employee', 'Operations', 'Senior Operations Manager', 'chidi.eze@apeximports.ng', 250000000, 'active'),
    (recip_emeka_id, org_apex_id, 'Emeka Obi', 'KEN', 'KES', 'bank_transfer', 'provider_verified',
     'contractor', 'Engineering', 'Lead Platform Architect', 'emeka.obi@apeximports.ng', 42000000, 'active'),
    (recip_fatima_id, org_apex_id, 'Fatima Al-Mansoor', 'GBR', 'GBP', 'bank_transfer', 'provider_verified',
     'employee', 'Compliance & Legal', 'Head of Regulatory Affairs', 'fatima.al-mansoor@apeximports.ng', 380000, 'active'),
    (recip_elena_id, org_apex_id, 'Elena Rostova', 'CAN', 'CAD', 'bank_transfer', 'internal_verified',
     'contractor', 'Logistics', 'Global Customs Specialist', 'elena.rostova@apeximports.ng', 420000, 'active'),
    (recip_marcus_id, org_apex_id, 'Marcus Vance', 'USA', 'USD', 'bank_transfer', 'provider_verified',
     'contractor', 'Trade Strategy', 'Principal Trade Consultant', 'marcus.vance@apeximports.ng', 650000, 'active')
    ON CONFLICT (id) DO NOTHING;

    -- 2. INSERT ACCOUNTS FOR WORKFORCE
    INSERT INTO recipient_accounts (
        id, recipient_id, bank_name, bank_code, account_number, routing_number, swift_bic, iban, currency, is_primary
    ) VALUES
    (acct_chidi_id, recip_chidi_id, 'Guaranty Trust Bank (GTBank)', '058', '0129847291', NULL, 'GTBINGLAXXX', NULL, 'NGN', TRUE),
    (acct_emeka_id, recip_emeka_id, 'Equity Bank Kenya', 'EQTY', '028941029482', NULL, 'EQBLKENXXXX', NULL, 'KES', TRUE),
    (acct_fatima_id, recip_fatima_id, 'Barclays Bank UK', 'BARC', '92841029', '20-00-00', 'BARCGB22', 'GB29BARC20000092841029', 'GBP', TRUE),
    (acct_elena_id, recip_elena_id, 'Royal Bank of Canada (RBC)', 'RBC', '003-9182-491', '000300002', 'ROYCCAT2', NULL, 'CAD', TRUE),
    (acct_marcus_id, recip_marcus_id, 'JPMorgan Chase Bank N.A.', 'CHAS', '8492048192', '021000021', 'CHASUS33', NULL, 'USD', TRUE)
    ON CONFLICT (id) DO NOTHING;

    -- 3. INSERT OCTOBER SETTLED PAYROLL RUN
    INSERT INTO payroll_runs (
        id, organisation_id, title, pay_period_start, pay_period_end, pay_date, funding_currency,
        status, total_funding_minor, total_payout_minor, total_fee_minor, recipient_count,
        risk_status, created_by, approved_by, approved_at, executed_at, completed_at, notes
    ) VALUES (
        run_oct_id, org_apex_id, 'October 2026 Global Workforce Payroll',
        '2026-10-01', '2026-10-31', '2026-10-31', 'NGN',
        'completed', 2145000000, 1850000, 12500000, 5,
        'clear', user_tunde_id, user_amara_id, '2026-10-30 14:00:00+01', '2026-10-31 09:30:00+01', '2026-10-31 09:45:00+01',
        'Successfully dispatched 5 international payouts across NGA, KEN, GBR, CAN, USA via Blaaiz Relay.'
    ) ON CONFLICT (id) DO NOTHING;

    -- 4. INSERT OCTOBER PAYROLL ITEMS
    INSERT INTO payroll_items (
        payroll_run_id, recipient_id, recipient_account_id, item_type,
        destination_currency, destination_amount_minor,
        source_currency, source_amount_minor, exchange_rate, provider_fee_minor,
        status, notes
    ) VALUES
    (run_oct_id, recip_chidi_id, acct_chidi_id, 'salary', 'NGN', 250000000, 'NGN', 250000000, 1.0, 50000, 'completed', 'October net salary'),
    (run_oct_id, recip_emeka_id, acct_emeka_id, 'contractor_fee', 'KES', 42000000, 'NGN', 504000000, 0.08333333, 1200000, 'completed', 'Platform architecture retainer'),
    (run_oct_id, recip_fatima_id, acct_fatima_id, 'salary', 'GBP', 380000, 'NGN', 760000000, 0.00050000, 1800000, 'completed', 'October salary & legal compliance allowance'),
    (run_oct_id, recip_elena_id, acct_elena_id, 'contractor_fee', 'CAD', 420000, 'NGN', 462000000, 0.00090909, 1100000, 'completed', 'October trade facilitation services'),
    (run_oct_id, recip_marcus_id, acct_marcus_id, 'contractor_fee', 'USD', 650000, 'NGN', 981500000, 0.00066225, 2000000, 'completed', 'Global supply chain optimization milestone')
    ON CONFLICT DO NOTHING;

    -- 5. INSERT NOVEMBER PENDING APPROVAL RUN
    INSERT INTO payroll_runs (
        id, organisation_id, title, pay_period_start, pay_period_end, pay_date, funding_currency,
        status, total_funding_minor, total_payout_minor, total_fee_minor, recipient_count,
        risk_status, created_by, approved_by, notes
    ) VALUES (
        run_nov_id, org_apex_id, 'November 2026 Core Workforce Payroll',
        '2026-11-01', '2026-11-30', '2026-11-28', 'NGN',
        'pending_approval', 2957500000, 2150000, 14200000, 5,
        'clear', user_tunde_id, NULL,
        'Scheduled month-end payroll for full-time employees and international contractors.'
    ) ON CONFLICT (id) DO NOTHING;

    -- 6. INSERT NOVEMBER PAYROLL ITEMS
    INSERT INTO payroll_items (
        payroll_run_id, recipient_id, recipient_account_id, item_type,
        destination_currency, destination_amount_minor,
        source_currency, source_amount_minor, exchange_rate, provider_fee_minor,
        quote_reference, status, notes
    ) VALUES
    (run_nov_id, recip_chidi_id, acct_chidi_id, 'salary', 'NGN', 250000000, 'NGN', 250000000, 1.0, 50000, 'BLZ-Q-NOV-01', 'pending', 'November net salary'),
    (run_nov_id, recip_emeka_id, acct_emeka_id, 'contractor_fee', 'KES', 42000000, 'NGN', 504000000, 0.08333333, 1200000, 'BLZ-Q-NOV-02', 'pending', 'Platform architecture retainer'),
    (run_nov_id, recip_fatima_id, acct_fatima_id, 'salary', 'GBP', 380000, 'NGN', 760000000, 0.00050000, 1800000, 'BLZ-Q-NOV-03', 'pending', 'November salary'),
    (run_nov_id, recip_elena_id, acct_elena_id, 'contractor_fee', 'CAD', 420000, 'NGN', 462000000, 0.00090909, 1100000, 'BLZ-Q-NOV-04', 'pending', 'Customs and logistics fee'),
    (run_nov_id, recip_marcus_id, acct_marcus_id, 'contractor_fee', 'USD', 650000, 'NGN', 981500000, 0.00066225, 2000000, 'BLZ-Q-NOV-05', 'pending', 'Trade consultancy retainer')
    ON CONFLICT DO NOTHING;

END $$;

