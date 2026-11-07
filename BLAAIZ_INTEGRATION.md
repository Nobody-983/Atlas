# BLAAIZ PLATFORM API INTEGRATION RUNBOOK

This document details the official integration between **ATLAS** and the **Blaaiz Platform API**, adhering strictly to the official documentation at [docs.blaaiz.com](https://docs.blaaiz.com/).

---

## 1. Environments & Base URLs

| Environment | API Base URL | Dashboard URL | Purpose |
| :--- | :--- | :--- | :--- |
| **Development / Sandbox** | `https://api-dev.blaaiz.com` | `business-dev.blaaiz.com` | Sandbox testing & developer validation |
| **Production** | `https://api-prod.blaaiz.com` | `business.blaaiz.com` | Live commercial settlement & fiat wire rails |

---

## 2. Authentication: OAuth 2.0 Client Credentials

Blaaiz uses OAuth 2.0 client credentials for external platform access. Legacy static API keys are deprecated.

### 2.1 Token Exchange Request
```http
POST /oauth/token
Host: api-dev.blaaiz.com
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&scope=payout:create%20fees:read%20currency:read%20wallet:read
```

### 2.2 Token Response
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "payout:create fees:read currency:read wallet:read"
}
```

### 2.3 Token Lifecycle in ATLAS
The `BlaaizClient` (`backend/src/blaaiz/client.ts`) handles token acquisition and caching:
- Tokens are held in-memory and attached as `Authorization: Bearer <access_token>` to all downstream requests.
- Tokens are refreshed automatically 60 seconds before their expiration (`expires_in`).

---

## 3. FX Rate & Fee Calculation

Before initiating a payment, ATLAS queries Blaaiz to calculate fee breakdowns and obtain executable exchange rates.

### 3.1 Endpoint: `POST /api/external/fees/breakdown`
**Scope Required**: `fees:read`

#### Request Payload:
```json
{
  "from_currency_id": "NGN",
  "to_currency_id": "USD",
  "to_amount": 5000
}
```

#### Response:
```json
{
  "rate": 0.00066225,
  "from_amount": 7550000.00,
  "to_amount": 5000.00,
  "fee": 26425.00,
  "vat": 1981.88,
  "total_fee": 28406.88,
  "from_currency_id": "NGN",
  "to_currency_id": "USD"
}
```

---

## 4. International Payout Initiation

### 4.1 Endpoint: `POST /api/external/payout`
**Scope Required**: `payout:create`

#### Request Payload:
```json
{
  "wallet_id": "b18ed308-5ac5-4e9e-bb16-8c03ec2d3c01",
  "customer_id": "9d4c4ec5-59ea-4130-bf8a-6a5edec401ee",
  "method": "bank_transfer",
  "from_currency_id": "NGN",
  "to_currency_id": "USD",
  "from_amount": 7550000,
  "bank_id": "HSBC",
  "account_number": "848291049001",
  "reference": "idemp_20261106_88192a"
}
```

#### Response:
```json
{
  "id": "payout_981249",
  "reference": "BLZ_PAY_MW5CPDDX_1940",
  "status": "processing",
  "from_amount": 7550000,
  "to_amount": 5000,
  "from_currency": "NGN",
  "to_currency": "USD",
  "fee": 28406.88,
  "created_at": "2026-11-06T19:20:00Z"
}
```

---

## 5. Webhook Ingestion & Signature Verification

Blaaiz signs outgoing webhook events using HMAC SHA-256.

### 5.1 Verification Header: `x-blaaiz-signature`
The backend computes:
$$\text{Expected Signature} = \text{HMAC-SHA256}(\text{Raw Payload Body}, \text{BLAAIZ\_WEBHOOK\_SECRET})$$

```typescript
export function verifyBlaaizWebhookSignature(header: string, rawBody: string | Buffer, secret: string): boolean {
  const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(header, 'hex'), Buffer.from(computed, 'hex'));
}
```

### 5.2 Handled Event Types:
- `payout.processing`: Transaction submitted to partner clearing network.
- `payout.completed`: Funds confirmed delivered to beneficiary account.
- `payout.failed`: Payout rejected by intermediary or destination bank.

---

## 6. High-Fidelity Sandbox Emulator

When running in local development or if sandbox credentials are not yet provisioned, ATLAS activates `BlaaizSandboxEmulator` (`backend/src/blaaiz/emulator.ts`):
- Implements the identical REST API contracts of Blaaiz.
- Uses real-world FX rate matrices (NGN, USD, KES, EUR, GBP, CAD).
- Generates realistic provider references (`BLZ_PAY_...`).
- The health endpoint (`GET /api/v1/health`) and UI clearly report whether live API or sandbox emulator is in use.

