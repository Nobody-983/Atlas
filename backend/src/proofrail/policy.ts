import { query } from '../db.js';
import { RiskFinding } from './rules.js';

export interface OrganisationPolicy {
  organisationId: string;
  maxSinglePaymentMinor: bigint;
  maxDailyPaymentMinor: bigint;
  dualApprovalThresholdMinor: bigint;
  requireNewRecipientReview: boolean;
  blockUnverifiedCorridors: boolean;
}

export interface PolicyEvaluationResult {
  isAllowed: boolean;
  requiresDualApproval: boolean;
  findings: RiskFinding[];
}

export class ProofRailPolicy {
  public static async getPolicy(organisationId: string): Promise<OrganisationPolicy> {
    const res = await query(
      `SELECT max_single_payment_minor, max_daily_payment_minor, dual_approval_threshold_minor,
              require_new_recipient_review, block_unverified_corridors
       FROM organisation_policies WHERE organisation_id = $1`,
      [organisationId]
    );

    if (res.rows.length === 0) {
      // Default policy
      return {
        organisationId,
        maxSinglePaymentMinor: 2500000000n, // 25M NGN
        maxDailyPaymentMinor: 10000000000n, // 100M NGN
        dualApprovalThresholdMinor: 750000000n, // 7.5M NGN
        requireNewRecipientReview: true,
        blockUnverifiedCorridors: true,
      };
    }

    const row = res.rows[0];
    return {
      organisationId,
      maxSinglePaymentMinor: BigInt(row.max_single_payment_minor),
      maxDailyPaymentMinor: BigInt(row.max_daily_payment_minor),
      dualApprovalThresholdMinor: BigInt(row.dual_approval_threshold_minor),
      requireNewRecipientReview: row.require_new_recipient_review,
      blockUnverifiedCorridors: row.block_unverified_corridors,
    };
  }

  public static async evaluatePolicy(
    organisationId: string,
    amountMinor: bigint,
    recipientVerificationLevel: string
  ): Promise<PolicyEvaluationResult> {
    const policy = await this.getPolicy(organisationId);
    const findings: RiskFinding[] = [];
    let isAllowed = true;
    let requiresDualApproval = false;

    // Check Single Payment Limit
    if (amountMinor > policy.maxSinglePaymentMinor) {
      isAllowed = false;
      findings.push({
        ruleCode: 'POLICY_SINGLE_LIMIT_EXCEEDED',
        severity: 'critical',
        title: 'Single Payment Policy Limit Exceeded',
        description: `Payment amount (${amountMinor}) exceeds organisation max limit of ${policy.maxSinglePaymentMinor}.`,
        triggeringData: {
          amountMinor: amountMinor.toString(),
          limitMinor: policy.maxSinglePaymentMinor.toString(),
        },
        actionRequired: 'Request an executive policy limit adjustment from the organisation owner.',
      });
    }

    // Check Daily Cumulative Volume
    const todayRes = await query(
      `SELECT COALESCE(SUM(source_amount_minor), 0) as daily_total
       FROM payments
       WHERE organisation_id = $1 
         AND initiated_at >= CURRENT_DATE
         AND status IN ('processing', 'completed')`,
      [organisationId]
    );
    const currentDailyTotal = BigInt(todayRes.rows[0].daily_total);
    if (currentDailyTotal + amountMinor > policy.maxDailyPaymentMinor) {
      isAllowed = false;
      findings.push({
        ruleCode: 'POLICY_DAILY_LIMIT_EXCEEDED',
        severity: 'critical',
        title: 'Daily Aggregate Payment Limit Exceeded',
        description: `Adding this payment will push total 24h payments to ${currentDailyTotal + amountMinor}, exceeding the daily cap of ${policy.maxDailyPaymentMinor}.`,
        triggeringData: {
          currentDailyTotal: currentDailyTotal.toString(),
          limitMinor: policy.maxDailyPaymentMinor.toString(),
        },
        actionRequired: 'Defer payout execution until the next calendar day or adjust daily limits.',
      });
    }

    // Check Dual Approval Requirement
    if (amountMinor >= policy.dualApprovalThresholdMinor) {
      requiresDualApproval = true;
      findings.push({
        ruleCode: 'POLICY_DUAL_APPROVAL_REQUIRED',
        severity: 'info',
        title: 'Dual Approval Threshold Reached',
        description: `Payments equal to or exceeding ${policy.dualApprovalThresholdMinor} require multi-step authorization by two independent approvers.`,
        actionRequired: 'Must be approved by both a Finance Manager and an Executive.',
      });
    }

    // Check Unverified Corridor Restriction
    if (policy.blockUnverifiedCorridors && recipientVerificationLevel === 'unverified') {
      findings.push({
        ruleCode: 'UNVERIFIED_CORRIDOR_POLICY',
        severity: 'warning',
        title: 'Payment to Unverified Recipient Profile',
        description: 'Organisation policy restricts automated payouts to unverified recipient corridors.',
        actionRequired: 'Complete internal compliance verification of recipient bank credentials.',
      });
    }

    return {
      isAllowed,
      requiresDualApproval,
      findings,
    };
  }
}

