-- ============================================================================
-- ATLAS PLATFORM SEED DATA: DEMO ORGANISATION & WORKFLOW SCENARIOS
-- ============================================================================

-- Fixed UUIDs for predictable testing and sandbox navigation
DO $$
DECLARE
    org_apex_id UUID := 'a1000000-0000-0000-0000-000000000001';
    org_kibo_id UUID := 'a1000000-0000-0000-0000-000000000002';
    
    user_amara_id UUID := 'b1000000-0000-0000-0000-000000000001';
    user_tunde_id UUID := 'b1000000-0000-0000-0000-000000000002';
    user_david_id UUID := 'b1000000-0000-0000-0000-000000000003';
    user_zainab_id UUID := 'b1000000-0000-0000-0000-000000000004';
    
    supp_shenzhen_id UUID := 'c1000000-0000-0000-0000-000000000001';
    supp_global_freight_id UUID := 'c1000000-0000-0000-0000-000000000002';
    supp_nairobi_cloud_id UUID := 'c1000000-0000-0000-0000-000000000003';
    supp_apex_machinery_id UUID := 'c1000000-0000-0000-0000-000000000004';

    recip_shenzhen_id UUID := 'd1000000-0000-0000-0000-000000000001';
    recip_freight_id UUID := 'd1000000-0000-0000-0000-000000000002';
    recip_nairobi_id UUID := 'd1000000-0000-0000-0000-000000000003';
    recip_machinery_id UUID := 'd1000000-0000-0000-0000-000000000004';

    acct_shenzhen_id UUID := 'e1000000-0000-0000-0000-000000000001';
    acct_freight_id UUID := 'e1000000-0000-0000-0000-000000000002';
    acct_nairobi_id UUID := 'e1000000-0000-0000-0000-000000000003';
    acct_machinery_id UUID := 'e1000000-0000-0000-0000-000000000004';

    inv_shenzhen_id UUID := 'f1000000-0000-0000-0000-000000000001';
    inv_freight_id UUID := 'f1000000-0000-0000-0000-000000000002';
    inv_duplicate_id UUID := 'f1000000-0000-0000-0000-000000000003';
    inv_nairobi_id UUID := 'f1000000-0000-0000-0000-000000000004';

    pr_shenzhen_id UUID := '11000000-0000-0000-0000-000000000001';
    pr_freight_id UUID := '11000000-0000-0000-0000-000000000002';
    pr_nairobi_id UUID := '11000000-0000-0000-0000-000000000003';

    quote_shenzhen_id UUID := '21000000-0000-0000-0000-000000000001';
    quote_freight_id UUID := '21000000-0000-0000-0000-000000000002';

    pay_nairobi_id UUID := '31000000-0000-0000-0000-000000000001';
    pay_shenzhen_id UUID := '31000000-0000-0000-0000-000000000002';
BEGIN
    -- 1. INSERT ORGANISATIONS
    INSERT INTO organisations (id, name, slug, business_type, country, base_currency, tax_id, registration_number)
    VALUES 
    (org_apex_id, 'Apex Global Imports & Logistics Ltd', 'apex-global', 'limited_company', 'NGA', 'NGN', 'TIN-09284102-0001', 'RC-1849204'),
    (org_kibo_id, 'Kibo Digital Media & Studios', 'kibo-digital', 'limited_company', 'KEN', 'KES', 'P051829402X', 'CPR-2022-8819')
    ON CONFLICT (id) DO NOTHING;

    -- 2. INSERT USERS (Password is 'StrongPassword123!' bcrypt hash)
    INSERT INTO users (id, email, full_name, password_hash, phone_number, is_email_verified)
    VALUES
    (user_amara_id, 'amara@apeximports.ng', 'Amara Okafor', '$2b$10$7q4AyNVQNKS5fcbSv6pb9ePwORQ1F6ReVp3X7XX9WJ3iv1ho21OGC', '+2348039201928', TRUE),
    (user_tunde_id, 'tunde@apeximports.ng', 'Tunde Bakare', '$2b$10$7q4AyNVQNKS5fcbSv6pb9ePwORQ1F6ReVp3X7XX9WJ3iv1ho21OGC', '+2348028192039', TRUE),
    (user_david_id, 'david@apeximports.ng', 'David Adeleke', '$2b$10$7q4AyNVQNKS5fcbSv6pb9ePwORQ1F6ReVp3X7XX9WJ3iv1ho21OGC', '+2348057281920', TRUE),
    (user_zainab_id, 'zainab@apeximports.ng', 'Zainab Bello', '$2b$10$7q4AyNVQNKS5fcbSv6pb9ePwORQ1F6ReVp3X7XX9WJ3iv1ho21OGC', '+2348098271829', TRUE)
    ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash, is_email_verified = TRUE;

    -- 3. INSERT ORGANISATION MEMBERS
    INSERT INTO organisation_members (organisation_id, user_id, role)
    VALUES
    (org_apex_id, user_amara_id, 'owner'),
    (org_apex_id, user_tunde_id, 'finance_manager'),
    (org_apex_id, user_david_id, 'approver'),
    (org_apex_id, user_zainab_id, 'admin')
    ON CONFLICT (organisation_id, user_id) DO NOTHING;

    -- 4. INSERT POLICIES
    INSERT INTO organisation_policies (
        organisation_id, 
        max_single_payment_minor, 
        max_daily_payment_minor, 
        dual_approval_threshold_minor, 
        require_new_recipient_review, 
        block_unverified_corridors
    ) VALUES (
        org_apex_id, 
        2500000000, -- 25M NGN (~$16,500)
        10000000000, -- 100M NGN (~$66,000)
        750000000,   -- 7.5M NGN (~$5,000 dual approval threshold)
        TRUE, 
        TRUE
    ) ON CONFLICT (organisation_id) DO NOTHING;

    -- 5. INSERT SUPPLIERS
    INSERT INTO suppliers (
        id, organisation_id, name, contact_email, country, business_type, registration_number, tax_id, verification_status, total_paid_minor, outstanding_minor
    ) VALUES
    (supp_shenzhen_id, org_apex_id, 'Shenzhen Microtech Electronics Ltd', 'billing@microtech-sz.cn', 'CHN', 'supplier', '91440300MA5FB1234', '91440300MA5FB', 'verified', 3450000, 1250000),
    (supp_global_freight_id, org_apex_id, 'Global Freight Cargo Logistics Inc', 'accounts@globalfreight.us', 'USA', 'supplier', 'US-DE-829104', 'EIN-84-2910492', 'verified', 1820000, 345000),
    (supp_nairobi_cloud_id, org_apex_id, 'Nairobi Cloud Solutions Ltd', 'invoicing@nairobibyte.co.ke', 'KEN', 'contractor', 'CPR-2021-9921', 'P051928491A', 'verified', 480000, 0),
    (supp_apex_machinery_id, org_apex_id, 'Hamburg Industrial Gears GmbH', 'finance@hamburg-gears.de', 'DEU', 'supplier', 'HRB-19482', 'DE-819284910', 'pending', 0, 890000)
    ON CONFLICT (id) DO NOTHING;

    -- 6. INSERT RECIPIENTS
    INSERT INTO recipients (
        id, organisation_id, supplier_id, display_name, country, currency, payout_method, verification_level, is_flagged, flag_reason
    ) VALUES
    (recip_shenzhen_id, org_apex_id, supp_shenzhen_id, 'Shenzhen Microtech Bank Account', 'HKG', 'USD', 'bank_transfer', 'provider_verified', FALSE, NULL),
    (recip_freight_id, org_apex_id, supp_global_freight_id, 'Global Freight Chase Operating Account', 'USA', 'USD', 'bank_transfer', 'internal_verified', TRUE, 'PROOFRAIL ALERT: Beneficiary bank account changed within 48 hours of invoice creation. Requires secondary security review.'),
    (recip_nairobi_id, org_apex_id, supp_nairobi_cloud_id, 'Nairobi Cloud KES Equity Bank', 'KEN', 'KES', 'bank_transfer', 'provider_verified', FALSE, NULL),
    (recip_machinery_id, org_apex_id, supp_apex_machinery_id, 'Hamburg Gears SEPA Account', 'DEU', 'EUR', 'bank_transfer', 'unverified', FALSE, NULL)
    ON CONFLICT (id) DO NOTHING;

    -- 7. RECIPIENT BANK ACCOUNTS
    INSERT INTO recipient_accounts (
        id, recipient_id, bank_name, bank_code, account_number, routing_number, swift_bic, iban, currency, is_primary
    ) VALUES
    (acct_shenzhen_id, recip_shenzhen_id, 'HSBC Hong Kong Limited', 'HSBC', '848-291049-001', NULL, 'HSBCHKHHXXX', NULL, 'USD', TRUE),
    (acct_freight_id, recip_freight_id, 'Coastal Credit Union (Changed from JPMorgan)', 'CCU', '9912048821', '322271627', 'CCUSUS33', NULL, 'USD', TRUE),
    (acct_nairobi_id, recip_nairobi_id, 'Equity Bank Kenya Ltd', 'EQTY', '0180294829104', NULL, 'EQBLKENXXXX', NULL, 'KES', TRUE),
    (acct_machinery_id, recip_machinery_id, 'Deutsche Bank AG', 'DEUT', 'DE89370400440532013000', NULL, 'DEUTDEDDFXX', 'DE89370400440532013000', 'EUR', TRUE)
    ON CONFLICT (id) DO NOTHING;

    -- 8. RECIPIENT CHANGE HISTORY (PROOFRAIL SECURITY LOG)
    INSERT INTO recipient_change_history (
        recipient_id, changed_by, old_account_data, new_account_data, change_reason, review_status
    ) VALUES (
        recip_freight_id,
        user_david_id,
        '{"bank_name": "JPMorgan Chase Bank N.A.", "account_number": "0238847192", "routing_number": "021000021"}'::jsonb,
        '{"bank_name": "Coastal Credit Union", "account_number": "9912048821", "routing_number": "322271627"}'::jsonb,
        'Supplier sent updated wire instructions via email requesting payment redirect to regional treasury account',
        'pending_review'
    ) ON CONFLICT DO NOTHING;

    -- 9. INVOICES
    INSERT INTO invoices (
        id, organisation_id, supplier_id, recipient_id, invoice_number, issue_date, due_date, currency, amount_minor, description, file_url, file_name, file_size_bytes, file_hash, status, is_duplicate
    ) VALUES
    (inv_shenzhen_id, org_apex_id, supp_shenzhen_id, recip_shenzhen_id, 'INV-2026-8812', '2026-11-01', '2026-11-15', 'USD', 1250000, 'Batch 44 Microcontrollers and IoT Modules', '/invoices/inv_2026_8812.pdf', 'INV-2026-8812.pdf', 148200, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'approved', FALSE),
    (inv_freight_id, org_apex_id, supp_global_freight_id, recip_freight_id, 'INV-2026-9041', '2026-11-03', '2026-11-17', 'USD', 345000, 'Air Cargo Freight Logistics JFK to LOS', '/invoices/inv_2026_9041.pdf', 'INV-2026-9041.pdf', 98400, 'd41d8cd98f00b204e9800998ecf8427e', 'pending_review', FALSE),
    (inv_duplicate_id, org_apex_id, supp_global_freight_id, recip_freight_id, 'INV-2026-9041-DUP', '2026-11-04', '2026-11-18', 'USD', 345000, 'Duplicate submission of Air Cargo Freight Logistics', '/invoices/inv_2026_9041_dup.pdf', 'INV-2026-9041_dup.pdf', 98400, 'd41d8cd98f00b204e9800998ecf8427e', 'rejected', TRUE),
    (inv_nairobi_id, org_apex_id, supp_nairobi_cloud_id, recip_nairobi_id, 'INV-2026-7731', '2026-10-15', '2026-10-30', 'KES', 48000000, 'DevOps Platform Architecture Retainer October', '/invoices/inv_2026_7731.pdf', 'INV-2026-7731.pdf', 112000, '7b52009b64fd0a2a49e6d8a939753077792b0554', 'paid', FALSE)
    ON CONFLICT (id) DO NOTHING;

    -- 10. INVOICE EXTRACTIONS
    INSERT INTO invoice_extractions (
        invoice_id, raw_text, extracted_fields, confidence_scores, review_state
    ) VALUES 
    (
        inv_shenzhen_id,
        'Shenzhen Microtech Electronics Ltd. INVOICE # INV-2026-8812. Date: Nov 1 2026. Due: Nov 15 2026. Amount: $12,500.00 USD. Bank: HSBC Hong Kong. Acct: 848-291049-001.',
        '{"invoice_number": "INV-2026-8812", "supplier_name": "Shenzhen Microtech Electronics Ltd", "amount": 12500, "currency": "USD", "due_date": "2026-11-15", "bank_account": "848-291049-001", "swift_bic": "HSBCHKHHXXX"}'::jsonb,
        '{"invoice_number": 0.99, "supplier_name": 0.98, "amount": 0.99, "bank_account": 0.97}'::jsonb,
        'verified'
    ),
    (
        inv_freight_id,
        'Global Freight Cargo Logistics Inc. INVOICE # INV-2026-9041. Amount: $3,450.00 USD. Remit to: Coastal Credit Union Acct: 9912048821 Routing: 322271627',
        '{"invoice_number": "INV-2026-9041", "supplier_name": "Global Freight Cargo Logistics Inc", "amount": 3450, "currency": "USD", "due_date": "2026-11-17", "bank_account": "9912048821", "routing_number": "322271627"}'::jsonb,
        '{"invoice_number": 0.98, "supplier_name": 0.96, "amount": 0.99, "bank_account": 0.95}'::jsonb,
        'auto_extracted'
    ) ON CONFLICT (invoice_id) DO NOTHING;

    -- 11. INVOICE RISK FINDINGS
    INSERT INTO invoice_risk_findings (
        invoice_id, rule_code, severity, title, description, triggering_data, action_required
    ) VALUES
    (
        inv_freight_id,
        'RECIPIENT_BANK_CHANGED',
        'critical',
        'Recent Recipient Bank Detail Modification',
        'The recipient bank account was modified 24 hours ago from JPMorgan Chase to Coastal Credit Union. Previous payments went to a different routing number.',
        '{"previous_bank": "JPMorgan Chase Bank N.A.", "new_bank": "Coastal Credit Union", "account_suffix": "8821"}'::jsonb,
        'Require phone callback confirmation with supplier vendor coordinator before authorizing payment.'
    ),
    (
        inv_duplicate_id,
        'DUPLICATE_INVOICE_NUMBER',
        'critical',
        'Duplicate Invoice Number Detected',
        'An invoice with number INV-2026-9041 already exists for Global Freight Cargo Logistics with the exact same amount ($3,450.00).',
        '{"existing_invoice_id": "f1000000-0000-0000-0000-000000000002", "invoice_number": "INV-2026-9041", "amount": 3450}'::jsonb,
        'Reject duplicate submission and notify accounts payable team.'
    ) ON CONFLICT DO NOTHING;

    -- 12. PAYMENT REQUESTS
    INSERT INTO payment_requests (
        id, organisation_id, invoice_id, recipient_id, recipient_account_id, created_by, source_currency, destination_currency, source_amount_minor, destination_amount_minor, purpose, risk_level, risk_score, status
    ) VALUES
    (
        pr_shenzhen_id, org_apex_id, inv_shenzhen_id, recip_shenzhen_id, acct_shenzhen_id, user_david_id, 'NGN', 'USD', 1887500000, 1250000, 'Procurement of Microcontroller Units Batch 44', 'clear', 10, 'approved'
    ),
    (
        pr_freight_id, org_apex_id, inv_freight_id, recip_freight_id, acct_freight_id, user_david_id, 'NGN', 'USD', 520950000, 345000, 'Air Cargo Shipment Clearance JFK to LOS', 'review_required', 75, 'awaiting_approval'
    ),
    (
        pr_nairobi_id, org_apex_id, inv_nairobi_id, recip_nairobi_id, acct_nairobi_id, user_david_id, 'NGN', 'KES', 576000000, 48000000, 'DevOps Platform Architecture Retainer October', 'clear', 5, 'approved'
    ) ON CONFLICT (id) DO NOTHING;

    -- 13. PAYMENT QUOTES (BLAAIZ QUOTES)
    INSERT INTO payment_quotes (
        id, payment_request_id, provider, from_currency, to_currency, from_amount_minor, to_amount_minor, exchange_rate, provider_fee_minor, network_fee_minor, total_charge_minor, quote_reference, expires_at, is_executed
    ) VALUES
    (
        quote_shenzhen_id, pr_shenzhen_id, 'blaaiz', 'NGN', 'USD', 1887500000, 1250000, 0.00066225, 1887500, 500000, 1889887500, 'BLZ-Q-2026-98124', NOW() + INTERVAL '2 hours', TRUE
    ),
    (
        quote_freight_id, pr_freight_id, 'blaaiz', 'NGN', 'USD', 520950000, 345000, 0.00066225, 520950, 500000, 521970950, 'BLZ-Q-2026-99381', NOW() + INTERVAL '45 minutes', FALSE
    ) ON CONFLICT (id) DO NOTHING;

    -- 14. PAYMENT APPROVALS
    INSERT INTO payment_approvals (
        payment_request_id, approver_id, step_number, decision, rejection_reason, notes
    ) VALUES
    (pr_shenzhen_id, user_tunde_id, 1, 'approved', NULL, 'Invoice verified against customs manifests. Approved for payout execution.'),
    (pr_nairobi_id, user_amara_id, 1, 'approved', NULL, 'Monthly engineering services retainer confirmed.')
    ON CONFLICT DO NOTHING;

    -- 15. PAYMENTS (RELAY)
    INSERT INTO payments (
        id, organisation_id, payment_request_id, quote_id, recipient_id, recipient_account_id, initiated_by, provider, provider_reference, idempotency_key, source_currency, destination_currency, source_amount_minor, destination_amount_minor, exchange_rate, provider_fee_minor, status, initiated_at, completed_at, reconciled_at
    ) VALUES
    (
        pay_nairobi_id, org_apex_id, pr_nairobi_id, NULL, recip_nairobi_id, acct_nairobi_id, user_tunde_id, 'blaaiz', 'BLZ_PAY_88192048', 'idemp_nairobi_retainer_oct26', 'NGN', 'KES', 576000000, 48000000, 0.08333333, 1500000, 'completed', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '12 minutes', NOW() - INTERVAL '4 days'
    ),
    (
        pay_shenzhen_id, org_apex_id, pr_shenzhen_id, quote_shenzhen_id, recip_shenzhen_id, acct_shenzhen_id, user_tunde_id, 'blaaiz', 'BLZ_PAY_99182941', 'idemp_shenzhen_batch44_nov26', 'NGN', 'USD', 1887500000, 1250000, 0.00066225, 1887500, 'processing', NOW() - INTERVAL '25 minutes', NULL, NULL
    ) ON CONFLICT (id) DO NOTHING;

    -- 16. AUDIT EVENTS
    INSERT INTO payment_audit_events (
        organisation_id, resource_type, resource_id, action, actor_id, actor_name, actor_role, metadata
    ) VALUES
    (org_apex_id, 'invoice', inv_shenzhen_id, 'uploaded', user_david_id, 'David Adeleke', 'approver', '{"filename": "INV-2026-8812.pdf", "amount": 12500, "currency": "USD"}'::jsonb),
    (org_apex_id, 'invoice', inv_shenzhen_id, 'ocr_extracted', user_david_id, 'David Adeleke', 'approver', '{"confidence": 0.98, "fields_extracted": 6}'::jsonb),
    (org_apex_id, 'recipient', recip_freight_id, 'bank_details_changed', user_david_id, 'David Adeleke', 'approver', '{"alert": "PROOFRAIL_RECIPIENT_CHANGED", "previous_bank": "JPMorgan Chase", "new_bank": "Coastal Credit Union"}'::jsonb),
    (org_apex_id, 'payment_request', pr_freight_id, 'risk_evaluated', user_zainab_id, 'Zainab Bello', 'admin', '{"risk_level": "review_required", "risk_score": 75, "findings_count": 1}'::jsonb),
    (org_apex_id, 'payment_request', pr_shenzhen_id, 'approved', user_tunde_id, 'Tunde Bakare', 'finance_manager', '{"step": 1, "approved_amount": 12500, "currency": "USD"}'::jsonb),
    (org_apex_id, 'payment', pay_shenzhen_id, 'payout_initiated', user_tunde_id, 'Tunde Bakare', 'finance_manager', '{"provider": "blaaiz", "provider_reference": "BLZ_PAY_99182941", "dest_amount": 12500, "dest_currency": "USD"}'::jsonb)
    ON CONFLICT DO NOTHING;

    -- 17. NOTIFICATIONS
    INSERT INTO notifications (
        organisation_id, user_id, title, message, category, link_url, is_read
    ) VALUES
    (org_apex_id, user_tunde_id, 'High Risk Payment Review Required', 'Payment request for Global Freight Cargo ($3,450.00 USD) flagged: Beneficiary bank changed.', 'security', '/approvals', FALSE),
    (org_apex_id, user_david_id, 'Invoice Approved', 'Invoice INV-2026-8812 for Shenzhen Microtech ($12,500.00 USD) has been approved by Tunde Bakare.', 'approval', '/invoices', TRUE),
    (org_apex_id, user_amara_id, 'Payout In Progress', 'Payout of $12,500 USD to Shenzhen Microtech dispatched via Blaaiz (Ref: BLZ_PAY_99182941).', 'payment', '/payments', FALSE)
    ON CONFLICT DO NOTHING;

END $$;
