export interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  role?: string;
  is_email_verified?: boolean;
}

export interface Organisation {
  id: string;
  name: string;
  slug: string;
  business_type: string;
  country: string;
  base_currency: string;
  registration_number?: string;
  tax_id?: string;
  onboarding_status?: 'in_progress' | 'pending_verification' | 'verified' | 'rejected' | 'active';
  onboarding_step?: number;
  onboarding_data?: Record<string, any>;
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  operating_address?: Record<string, any>;
  kyb_verification_status?: 'not_submitted' | 'pending_review' | 'verified' | 'action_required';
  kyb_documents?: Array<{ documentType: string; fileName: string; referenceNumber?: string }>;
  kyb_notes?: string;
  created_at?: string;
}

export interface OrganisationPolicy {
  id: string;
  organisation_id: string;
  max_single_payment_minor: string;
  max_daily_payment_minor: string;
  dual_approval_threshold_minor: string;
  require_new_recipient_review: boolean;
  block_unverified_corridors: boolean;
}

export interface Supplier {
  id: string;
  organisation_id: string;
  name: string;
  contact_email: string;
  contact_phone?: string;
  country: string;
  business_type: string;
  registration_number?: string;
  tax_id?: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  total_paid_minor: string;
  outstanding_minor: string;
  invoice_count?: number;
  recipient_count?: number;
  created_at: string;
}

export interface RecipientAccount {
  id: string;
  recipient_id: string;
  bank_name: string;
  bank_code?: string;
  account_number: string;
  routing_number?: string;
  swift_bic?: string;
  iban?: string;
  sort_code?: string;
  transit_number?: string;
  currency: string;
  is_primary: boolean;
}

export interface Recipient {
  id: string;
  organisation_id: string;
  supplier_id?: string;
  supplier_name?: string;
  display_name: string;
  country: string;
  currency: string;
  payout_method: string;
  verification_level: 'unverified' | 'internal_verified' | 'provider_verified';
  is_flagged: boolean;
  flag_reason?: string;
  account_id?: string;
  bank_name?: string;
  account_number?: string;
  routing_number?: string;
  swift_bic?: string;
  iban?: string;
  pending_change_count?: number;
  recipient_type?: 'employee' | 'contractor' | 'supplier' | 'beneficiary';
  department?: string;
  job_title?: string;
  email?: string;
  default_salary_minor?: string | number;
  status?: 'active' | 'on_leave' | 'terminated';
  paid_cycles_count?: string | number;
  total_received_minor?: string;
  created_at: string;
}

export interface PayrollRun {
  id: string;
  organisation_id: string;
  title: string;
  pay_period_start: string;
  pay_period_end: string;
  pay_date: string;
  funding_currency: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'processing' | 'completed' | 'failed' | 'cancelled';
  total_funding_minor: string;
  total_payout_minor: string;
  total_fee_minor: string;
  recipient_count: number;
  risk_status: 'clear' | 'review_required' | 'blocked';
  risk_details?: Array<{ recipientId: string; recipientName: string; reason: string }>;
  created_by?: string;
  creator_name?: string;
  approved_by?: string;
  approver_name?: string;
  approved_at?: string;
  executed_at?: string;
  completed_at?: string;
  notes?: string;
  item_count?: number;
  failed_item_count?: number;
  created_at: string;
  updated_at: string;
}

export interface PayrollItem {
  id: string;
  payroll_run_id: string;
  recipient_id: string;
  recipient_account_id?: string;
  recipient_name: string;
  recipient_country: string;
  recipient_type: 'employee' | 'contractor';
  department?: string;
  job_title?: string;
  recipient_email?: string;
  verification_level: string;
  is_flagged: boolean;
  flag_reason?: string;
  bank_name?: string;
  account_number?: string;
  routing_number?: string;
  swift_bic?: string;
  iban?: string;
  item_type: 'salary' | 'contractor_fee' | 'bonus' | 'reimbursement';
  destination_currency: string;
  destination_amount_minor: string;
  source_currency: string;
  source_amount_minor: string;
  exchange_rate: string | number;
  provider_fee_minor: string;
  quote_reference?: string;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  payment_id?: string;
  provider_reference?: string;
  payment_status?: string;
  notes?: string;
  created_at: string;
}

export interface PayrollOverviewData {
  upcomingRun: PayrollRun | null;
  settledStats: {
    completed_runs: string | number;
    total_funding_paid_minor: string;
    total_fees_paid_minor?: string;
    total_disbursements_count: string | number;
  };
  workforce: {
    employee_count: string | number;
    contractor_count: string | number;
    total_active_workers: string | number;
    monthly_ngn_base?: string;
    monthly_usd_base?: string;
    monthly_kes_base?: string;
    monthly_gbp_base?: string;
    monthly_cad_base?: string;
  };
  currencyExposure: Array<{
    destination_currency: string;
    recipient_count: string | number;
    total_destination_minor: string;
    total_source_minor: string;
    total_fee_minor: string;
  }>;
  recentRuns: PayrollRun[];
}

export interface Invoice {
  id: string;
  organisation_id: string;
  supplier_id?: string;
  supplier_name?: string;
  recipient_id?: string;
  recipient_name?: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  currency: string;
  amount_minor: string;
  description?: string;
  file_url?: string;
  file_name?: string;
  status: 'draft' | 'pending_review' | 'approved' | 'paid' | 'rejected' | 'cancelled';
  is_duplicate: boolean;
  risk_count?: number;
  max_severity?: 'info' | 'warning' | 'critical';
  created_at: string;
}

export interface InvoiceExtraction {
  id: string;
  invoice_id: string;
  raw_text: string;
  extracted_fields: Record<string, any>;
  confidence_scores: Record<string, number>;
  review_state: 'auto_extracted' | 'user_modified' | 'verified';
  extracted_at: string;
}

export interface InvoiceRiskFinding {
  id: string;
  invoice_id: string;
  rule_code: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  triggering_data?: Record<string, any>;
  action_required?: string;
  is_resolved: boolean;
  created_at: string;
}

export interface PaymentRequest {
  id: string;
  organisation_id: string;
  invoice_id?: string;
  invoice_number?: string;
  recipient_id: string;
  recipient_name?: string;
  recipient_country?: string;
  is_flagged?: boolean;
  flag_reason?: string;
  bank_name?: string;
  account_number?: string;
  supplier_name?: string;
  creator_name?: string;
  source_currency: string;
  destination_currency: string;
  source_amount_minor: string;
  destination_amount_minor: string;
  purpose: string;
  risk_level: 'clear' | 'review_required' | 'blocked';
  risk_score: number;
  status: 'draft' | 'pending_review' | 'awaiting_approval' | 'approved' | 'rejected' | 'cancelled';
  exchange_rate?: string | number;
  provider_fee_minor?: string;
  total_charge_minor?: string;
  expires_at?: string;
  current_approvals_count?: number;
  created_at: string;
}

export interface Payment {
  id: string;
  organisation_id: string;
  payment_request_id?: string;
  recipient_id: string;
  recipient_name?: string;
  recipient_country?: string;
  is_flagged?: boolean;
  bank_name?: string;
  account_number?: string;
  supplier_name?: string;
  initiator_name?: string;
  provider: string;
  provider_reference: string;
  idempotency_key: string;
  source_currency: string;
  destination_currency: string;
  source_amount_minor: string;
  destination_amount_minor: string;
  exchange_rate: string | number;
  provider_fee_minor: string;
  status: 'processing' | 'completed' | 'failed' | 'cancelled' | 'requires_reconciliation';
  error_code?: string;
  error_message?: string;
  purpose?: string;
  risk_level?: string;
  risk_score?: number;
  initiated_at: string;
  completed_at?: string;
  reconciled_at?: string;
}

export interface AuditEvent {
  id: string;
  organisation_id: string;
  resource_type: string;
  resource_id: string;
  action: string;
  actor_name: string;
  actor_role: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface AnalyticsOverview {
  paymentStatus: Array<{
    status: string;
    count: string | number;
    total_source_minor: string;
    total_dest_minor: string;
    total_fees_minor: string;
  }>;
  pendingApprovals: {
    count: string | number;
    total_minor: string;
  };
  invoices: {
    total_invoices: string | number;
    pending_review: string | number;
    approved_unpaid: string | number;
    outstanding_minor: string;
  };
  corridors: Array<{
    destination_currency: string;
    tx_count: string | number;
    total_volume_minor: string;
  }>;
  topSuppliers: Array<{
    id: string;
    name: string;
    country: string;
    total_volume_minor: string;
    payment_count: string | number;
  }>;
  risks: {
    total_warnings: string | number;
    critical_count: string | number;
    warning_count: string | number;
  };
}

