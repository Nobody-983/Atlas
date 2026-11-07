# PROOFRAIL TRUST ENGINE — TECHNICAL SPECIFICATION

This specification outlines the algorithmic rules, risk classification heuristics, recipient change protection mechanisms, and policy enforcement engines powering **ProofRail** within the ATLAS platform.

---

## 1. Product Philosophy & Deterministic Verification

Unlike conventional applications that rely on opaque AI models or probabilistic scoring to approve financial actions, ProofRail is engineered around strict **deterministic financial controls**:

1. **AI assists decisions but never receives authority to move money.**
2. **Every financial finding must explain**:
   - What was detected.
   - Why it matters.
   - Which specific data triggered the rule.
   - What corrective action is required from the operator.
3. **Trust levels are explicitly separated**:
   - Level 1: User-supplied information.
   - Level 2: OCR-extracted invoice information.
   - Level 3: System deterministic checks.
   - Level 4: Provider-verified bank records (Blaaiz).

---

## 2. Deterministic Verification Rules Matrix

| Rule Code | Trigger Condition | Severity | Risk Points | Default Enforcement Action |
| :--- | :--- | :--- | :--- | :--- |
| **`DUPLICATE_INVOICE_NUMBER`** | Existing invoice with same vendor and invoice # in database. | `critical` | +45 | Blocks payment creation; alerts accounts payable. |
| **`RECIPIENT_BANK_CHANGED`** | Beneficiary bank details altered within 7 days or since last payment. | `critical` | +45 | Flags recipient; blocks automated execution; requires phone callback. |
| **`INVOICE_RECIPIENT_MISMATCH`** | Account # printed on invoice does not match selected recipient account. | `critical` | +45 | Suspends payment; requires vendor remittance confirmation. |
| **`UNUSUAL_AMOUNT`** | Payment amount exceeds 200% of vendor's historical moving average. | `warning` | +20 | Requires executive approval note. |
| **`REPEATED_AMOUNT_SUPPLIER`** | Identical payment amount executed for vendor within past 30 days. | `warning` | +20 | Warns of possible double billing. |
| **`CURRENCY_MISMATCH`** | Invoice currency diverges from recipient account currency. | `info` | +5 | Informs operator of currency conversion. |
| **`NEW_RECIPIENT_PROBATION`** | Zero completed historical payouts to this beneficiary. | `info` | +5 | Prompts initial KYC/KYB check. |
| **`POLICY_SINGLE_LIMIT_EXCEEDED`** | Amount exceeds organisation max single payment limit. | `critical` | +50 | Hard block enforced at backend API boundary. |
| **`POLICY_DAILY_LIMIT_EXCEEDED`** | Cumulative 24h volume exceeds organisation daily limit. | `critical` | +50 | Hard block enforced at backend API boundary. |
| **`POLICY_DUAL_APPROVAL_REQUIRED`** | Amount exceeds dual approval threshold. | `info` | 0 | Enforces requirement for 2 independent signatures. |

---

## 3. Cumulative Risk Score & Level Classification

$$\text{Risk Score} = \min\left(100, \sum_{i=1}^{N} \text{Points}(Rule_i)\right)$$

### Risk Levels:
- **`CLEAR` (Score 0 – 19)**:
  - All automated checks passed.
  - Standard single-approver workflow enabled.
- **`REVIEW_REQUIRED` (Score 20 – 69)**:
  - Non-critical findings detected (e.g. unusual amount, recurring identical amount).
  - Approver must acknowledge specific risk warnings in the UI before authorizing.
- **`BLOCKED` (Score 70 – 100, or any Critical Policy Violation)**:
  - Immediate execution prohibited.
  - The API rejects payout dispatch calls with `422 Unprocessable Entity (RISK_BLOCKED)`.
  - Can only be cleared by addressing the root cause (e.g. approving a verified recipient change, modifying policy limits).

---

## 4. Recipient Change Protection (Anti-BEC Engine)

Business Email Compromise (BEC) is the leading cause of international wire fraud in cross-border trade: attackers compromise a vendor's email and request an "urgent redirect" of pending invoice payments to a new bank account.

### ProofRail Mitigation Architecture:
1. **Change Tracking**: Whenever a recipient's bank name, account number, routing number, or IBAN is modified, the previous state is snapshot into `recipient_change_history`.
2. **Immediate Flagging**: The recipient's `is_flagged` attribute is toggled to `TRUE`, displaying a prominent security warning across all views.
3. **Execution Freeze**: Any payment request associated with a flagged recipient is classified as `review_required` or `blocked`.
4. **Out-of-Band Callback Verification**:
   - The compliance officer must contact the vendor via a pre-established, verified telephone number (never using phone numbers provided in the change email).
   - Once verified, the operator submits `POST /api/v1/recipients/:id/approve-change` with callback notes, clearing the flag and restoring normal payment capability.

