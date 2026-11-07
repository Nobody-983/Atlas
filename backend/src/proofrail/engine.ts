import { ProofRailPolicy } from './policy.js';
import { ProofRailRules, RiskEvaluationContext, RiskFinding } from './rules.js';

export interface ProofRailEvaluationReport {
  riskScore: number; // 0 to 100
  riskLevel: 'clear' | 'review_required' | 'blocked';
  isExecutionAllowed: boolean;
  requiresDualApproval: boolean;
  findings: RiskFinding[];
  evaluatedAt: string;
}

export class ProofRailEngine {
  public static async evaluate(ctx: RiskEvaluationContext): Promise<ProofRailEvaluationReport> {
    const findings: RiskFinding[] = [];

    // 1. Evaluate Deterministic Heuristic Rules
    const r1 = ProofRailRules.checkDuplicateInvoiceNumber(ctx);
    if (r1) findings.push(r1);

    const r2 = ProofRailRules.checkRecipientBankChanged(ctx);
    if (r2) findings.push(r2);

    const r3 = ProofRailRules.checkInvoiceAccountMismatch(ctx);
    if (r3) findings.push(r3);

    const r4 = ProofRailRules.checkRepeatedAmount(ctx);
    if (r4) findings.push(r4);

    const r5 = ProofRailRules.checkUnusualAmount(ctx);
    if (r5) findings.push(r5);

    const r6 = ProofRailRules.checkCurrencyMismatch(ctx);
    if (r6) findings.push(r6);

    const r7 = ProofRailRules.checkNewRecipient(ctx);
    if (r7) findings.push(r7);

    // 2. Evaluate Organisation Payment Policies
    const policyResult = await ProofRailPolicy.evaluatePolicy(
      ctx.organisationId,
      ctx.invoiceAmountMinor,
      ctx.recipientAccount.isPrimary ? 'internal_verified' : 'unverified'
    );
    findings.push(...policyResult.findings);

    // 3. Compute Cumulative Risk Score
    let score = 0;
    for (const f of findings) {
      if (f.severity === 'critical') score += 45;
      else if (f.severity === 'warning') score += 20;
      else if (f.severity === 'info') score += 5;
    }
    score = Math.min(100, score);

    // 4. Determine Risk Level & Execution Clearance
    let riskLevel: 'clear' | 'review_required' | 'blocked' = 'clear';
    let isExecutionAllowed = policyResult.isAllowed;

    if (!policyResult.isAllowed || score >= 70) {
      riskLevel = 'blocked';
      isExecutionAllowed = false;
    } else if (score >= 20 || findings.some((f) => f.severity === 'warning')) {
      riskLevel = 'review_required';
    }

    return {
      riskScore: score,
      riskLevel,
      isExecutionAllowed,
      requiresDualApproval: policyResult.requiresDualApproval,
      findings,
      evaluatedAt: new Date().toISOString(),
    };
  }
}

