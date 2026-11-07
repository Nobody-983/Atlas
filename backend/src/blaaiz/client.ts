import { config } from '../config.js';
import { ProviderError } from '../utils/errors.js';
import { BlaaizSandboxEmulator } from './emulator.js';
import {
  BlaaizFeeBreakdownRequest,
  BlaaizFeeBreakdownResponse,
  BlaaizPayoutRequest,
  BlaaizPayoutResponse,
  BlaaizRateItem,
  BlaaizTokenResponse,
} from './types.js';

export const BLAIIZ_USER_AGENT = 'Atlas-Platform/1.0';

export class BlaaizClient {
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  // Scope-aware token caching: maps normalized scope string to access token & expiration
  private tokenCache: Map<string, { token: string; expiresAt: number }> = new Map();
  private useEmulator: boolean;

  constructor() {
    this.baseUrl = config.blaaiz.baseUrl;
    this.clientId = config.blaaiz.clientId;
    this.clientSecret = config.blaaiz.clientSecret;
    // Explicit emulator mode: never silently fall back if emulator is disabled
    this.useEmulator = config.blaaiz.enableEmulator;
  }

  public isUsingEmulator(): boolean {
    return this.useEmulator;
  }

  /**
   * Helper to normalize scope strings so permutations match the same cached token.
   */
  private normalizeScope(scope: string): string {
    return scope.trim().split(/\s+/).filter(Boolean).sort().join(' ');
  }

  /**
   * Retrieves OAuth 2.0 Bearer access token via Client Credentials grant.
   * Tokens are cached strictly by requested scope set to prevent scope pollution.
   */
  public async getAccessToken(scope = 'payout:create fees:read wallet:read'): Promise<string> {
    if (this.useEmulator) {
      return 'blaaiz_dev_emulator_bearer_token_atlas';
    }

    if (!this.clientId || !this.clientSecret) {
      throw new ProviderError(
        'Blaaiz Client ID and Client Secret must be configured when emulator mode is disabled.'
      );
    }

    const normalizedScope = this.normalizeScope(scope);
    const now = Date.now();
    const cached = this.tokenCache.get(normalizedScope);

    if (cached && cached.expiresAt > now + 60000) {
      return cached.token;
    }

    try {
      const bodyParams = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope,
      });

      const res = await fetch(`${this.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': BLAIIZ_USER_AGENT,
        },
        body: bodyParams.toString(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new ProviderError(`OAuth Authentication failed (${res.status}): ${errorText}`);
      }

      const data = (await res.json()) as BlaaizTokenResponse;
      const expiresAt = now + (data.expires_in || 3600) * 1000;

      this.tokenCache.set(normalizedScope, {
        token: data.access_token,
        expiresAt,
      });

      return data.access_token;
    } catch (err: any) {
      if (err instanceof ProviderError) throw err;
      throw new ProviderError(`OAuth token request network error: ${err.message}`);
    }
  }

  /**
   * Fetches the official fee breakdown and FX rate between two currencies.
   * Endpoint: POST /api/external/fees/breakdown
   */
  public async getFeeBreakdown(req: BlaaizFeeBreakdownRequest): Promise<BlaaizFeeBreakdownResponse> {
    if (this.useEmulator) {
      return BlaaizSandboxEmulator.calculateFeeBreakdown(req);
    }

    try {
      const token = await this.getAccessToken('fees:read');
      const res = await fetch(`${this.baseUrl}/api/external/fees/breakdown`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': BLAIIZ_USER_AGENT,
        },
        body: JSON.stringify(req),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new ProviderError(`Failed to fetch fee breakdown (${res.status}): ${errorText}`);
      }

      return (await res.json()) as BlaaizFeeBreakdownResponse;
    } catch (err: any) {
      if (err instanceof ProviderError) throw err;
      throw new ProviderError(`Fee breakdown network error: ${err.message}`);
    }
  }

  /**
   * Lists available market rates.
   * Endpoint: GET /api/external/rates
   */
  public async getRates(searchTerm?: string): Promise<BlaaizRateItem[]> {
    if (this.useEmulator) {
      const all = BlaaizSandboxEmulator.listRates();
      if (searchTerm) {
        return all.filter(
          (r) =>
            r.from_currency_id.includes(searchTerm.toUpperCase()) ||
            r.to_currency_id.includes(searchTerm.toUpperCase())
        );
      }
      return all;
    }

    try {
      const token = await this.getAccessToken('fees:read');
      const url = new URL(`${this.baseUrl}/api/external/rates`);
      if (searchTerm) url.searchParams.set('search_term', searchTerm);

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': BLAIIZ_USER_AGENT,
        },
      });

      if (!res.ok) {
        throw new ProviderError(`Failed to fetch rates (${res.status}): ${await res.text()}`);
      }

      return (await res.json()) as BlaaizRateItem[];
    } catch (err: any) {
      if (err instanceof ProviderError) throw err;
      throw new ProviderError(`Rates network error: ${err.message}`);
    }
  }

  /**
   * Initiates a fiat payout through the Blaaiz Payout API.
   * Endpoint: POST /api/external/payout
   * 
   * CRITICAL SAFETY: Never falls back to the sandbox emulator on remote failure or timeout.
   */
  public async createPayout(req: BlaaizPayoutRequest): Promise<BlaaizPayoutResponse> {
    if (this.useEmulator) {
      return BlaaizSandboxEmulator.createPayout(req);
    }

    try {
      const token = await this.getAccessToken('payout:create');
      const res = await fetch(`${this.baseUrl}/api/external/payout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': BLAIIZ_USER_AGENT,
        },
        body: JSON.stringify(req),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new ProviderError(`Payout initiation rejected by Blaaiz (${res.status}): ${errText}`);
      }

      return (await res.json()) as BlaaizPayoutResponse;
    } catch (err: any) {
      if (err instanceof ProviderError) throw err;
      // Do NOT fall back to emulator; rethrow for upstream reconciliation handling
      throw new ProviderError(`Payout initiation network error or timeout: ${err.message}`);
    }
  }

  /**
   * Fetches payout status.
   * Endpoint: GET /api/external/payout/:id
   */
  public async getPayoutStatus(payoutId: string): Promise<{ status: string; reference: string }> {
    if (this.useEmulator) {
      return { status: 'completed', reference: payoutId };
    }

    try {
      const token = await this.getAccessToken('payout:create');
      const res = await fetch(`${this.baseUrl}/api/external/payout/${payoutId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': BLAIIZ_USER_AGENT,
        },
      });

      if (!res.ok) {
        throw new ProviderError(`Failed to fetch payout status (${res.status}): ${await res.text()}`);
      }

      return (await res.json()) as { status: string; reference: string };
    } catch (err: any) {
      if (err instanceof ProviderError) throw err;
      throw new ProviderError(`Status inquiry network error: ${err.message}`);
    }
  }
}

export const blaaizClient = new BlaaizClient();
