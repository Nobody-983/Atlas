import crypto from 'crypto';

/**
 * Validates the HMAC-SHA256 signature provided in the `x-blaaiz-signature` header.
 * 
 * @param signatureHeader The header value from `x-blaaiz-signature`
 * @param payload Raw request body string or Buffer
 * @param secret The webhook signing secret configured in Blaaiz Dashboard
 */
export function verifyBlaaizWebhookSignature(
  signatureHeader: string | undefined,
  payload: string | Buffer,
  secret: string
): boolean {
  if (!signatureHeader || !secret) {
    return false;
  }

  try {
    const rawString = typeof payload === 'string' ? payload : payload.toString('utf8');
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawString)
      .digest('hex');

    // Constant-time buffer comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signatureHeader, 'hex');
    const compBuffer = Buffer.from(computedSignature, 'hex');

    if (sigBuffer.length !== compBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, compBuffer);
  } catch (err) {
    console.error('[Blaaiz Webhook] Signature verification error:', err);
    return false;
  }
}

/**
 * Helper to generate a valid test signature for development and unit testing.
 */
export function generateBlaaizWebhookSignature(payload: string | object, secret: string): string {
  const rawString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(rawString).digest('hex');
}

