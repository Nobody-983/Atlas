export interface BlaaizTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface BlaaizFeeBreakdownRequest {
  from_currency_id: string; // e.g. "NGN"
  to_currency_id: string;   // e.g. "USD"
  from_amount?: number;
  to_amount?: number;
}

export interface BlaaizFeeBreakdownResponse {
  fee: number;
  vat: number;
  total_fee: number;
  rate: number;
  from_amount: number;
  to_amount: number;
  from_currency_id: string;
  to_currency_id: string;
}

export interface BlaaizRateItem {
  id: string;
  from_currency_id: string;
  to_currency_id: string;
  rate: number;
  inverse_rate: number;
  timestamp: string;
}

export interface BlaaizPayoutRequest {
  wallet_id: string;
  customer_id: string;
  method: 'bank_transfer' | 'mobile_money' | 'interac';
  from_currency_id: string;
  to_currency_id: string;
  from_amount: number;
  bank_id?: string;
  account_number: string;
  routing_number?: string;
  reference?: string;
}

export interface BlaaizPayoutResponse {
  id: string;
  reference: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  from_amount: number;
  to_amount: number;
  from_currency: string;
  to_currency: string;
  fee: number;
  created_at: string;
  customer_id?: string;
}

export interface BlaaizWebhookPayload {
  event: 'payout.processing' | 'payout.completed' | 'payout.failed' | 'collection.completed';
  data: {
    id: string;
    reference: string;
    status: string;
    amount: number;
    currency: string;
    customer_id?: string;
    reason?: string;
  };
  timestamp: string;
}

