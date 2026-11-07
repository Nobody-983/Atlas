# SECURITY MODEL & FINANCIAL CONTROLS — ATLAS

This document details the trust assumptions, privileged roles, attack surface mitigations, and financial safety guarantees engineered into **ATLAS**.

---

## 1. Access Control Matrix & Privileged Roles

ATLAS enforces strict Role-Based Access Control (RBAC) at the server API layer:

| Role | Organization Scope | Invoices & Suppliers | Prepare Payments | Authorize Payments | Configure Policies | View Audit Trail |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`owner`** | Complete | Read / Write | Yes | Yes | Yes | Yes |
| **`admin`** | Complete | Read / Write | Yes | Yes | Yes | Yes |
| **`finance_manager`** | Tenant Private | Read / Write | Yes | Yes | No | Yes |
| **`approver`** | Tenant Private | Read Only | No | Yes | No | Yes |
| **`viewer`** | Tenant Private | Read Only | No | No | No | Read Only |

### Server-Side Authorization Boundary
The frontend UI adapts to roles, but **the server is the sole security boundary**:
- Calling `POST /api/v1/approvals/decide` without an approver/manager/admin role immediately aborts with `403 Forbidden`.
- Direct attempts to execute `POST /api/v1/payments/initiate` without prior approval record in `payment_approvals` revert with `422 PolicyViolationError`.

---

## 2. Invariant Financial Guarantees

### Invariant 1: Human-in-the-Loop Authorization
No financial payout can be executed autonomously by background jobs, OCR engines, or AI assistants. Every payout must have a corresponding record in `payment_approvals` signed by an authorized human actor.

### Invariant 2: Anti-Double-Payment Idempotency
Every payment initiation requires a unique `idempotency_key`. The PostgreSQL database enforces `UNIQUE(idempotency_key)`. If a duplicate network call arrives, the existing payment record is returned without re-executing against Blaaiz.

### Invariant 3: Precision Integer Minor Units
All monetary quantities are converted to integer minor units (kobo, cents, cents) upon entering the application and stored as `BIGINT` in PostgreSQL. Floating-point arithmetic is never used for balance or fee calculations.

### Invariant 4: Recipient Change Protection
If a recipient's bank name, routing number, or account number is altered, the system:
1. Records old and new values in `recipient_change_history`.
2. Sets `is_flagged = TRUE`.
3. Rejects payment requests with `422 RiskBlockedError` until out-of-band telephone verification is logged.

---

## 3. Threat Mitigation Summary

| Threat | Exploit Vector | Atlas Mitigation |
| :--- | :--- | :--- |
| **Business Email Compromise (BEC)** | Attacker emails fake vendor bank account redirect. | Recipient Change Protection + Out-of-band callback requirement. |
| **Duplicate Invoicing** | Vendor submits invoice twice or employee double-pays. | SHA-256 file hash checking + Unique invoice # constraint. |
| **Unauthorized Payout** | Malicious insider attempts direct payout dispatch. | Dual-approval requirement on high-value wires + RBAC gate. |
| **Webhook Spoofing** | Adversary attempts to fake payment completion event. | HMAC SHA-256 signature verification (`x-blaaiz-signature`). |
| **Replay / Network Retry Glitch** | Connection timeout triggers duplicate wire creation. | Unique idempotency keys + provider reference reconciliation. |
| **Cross-Tenant Data Leak** | User attempts to read rival firm's invoices or payments. | Strict `organisation_id` query scoping across all tables. |

