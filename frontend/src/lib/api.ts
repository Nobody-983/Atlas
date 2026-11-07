const API_BASE = '/api/v1';

export const authStorage = {
  getToken: (): string | null => {
    try {
      return localStorage.getItem('atlas_auth_token');
    } catch {
      return null;
    }
  },
  setToken: (token: string): void => {
    try {
      localStorage.setItem('atlas_auth_token', token);
    } catch {}
  },
  removeToken: (): void => {
    try {
      localStorage.removeItem('atlas_auth_token');
      localStorage.removeItem('atlas_active_org_id');
    } catch {}
  },
  getActiveOrgId: (): string | null => {
    try {
      return localStorage.getItem('atlas_active_org_id');
    } catch {
      return null;
    }
  },
  setActiveOrgId: (orgId: string): void => {
    try {
      localStorage.setItem('atlas_active_org_id', orgId);
    } catch {}
  },
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  
  const token = authStorage.getToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errMessage = `Request failed (${res.status})`;
    try {
      const errJson = await res.json();
      errMessage = errJson.error || errJson.message || errMessage;
    } catch {
      // Ignore text parse failure
    }
    throw new Error(errMessage);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Authentication
  signup: (data: { email: string; password: string; fullName: string; phoneNumber?: string }) =>
    request<any>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  verifyEmail: (data: { email?: string; token: string }) =>
    request<any>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  resendVerification: (data: { email: string }) =>
    request<any>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  forgotPassword: (data: { email: string }) =>
    request<any>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  resetPassword: (data: { email?: string; token: string; newPassword: string }) =>
    request<any>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () => {
    authStorage.removeToken();
    return request<any>('/auth/logout', { method: 'POST' });
  },

  getSession: (orgId?: string, userId?: string) => {
    const params = new URLSearchParams();
    if (orgId) params.set('orgId', orgId);
    if (userId) params.set('userId', userId);
    return request<any>(`/auth/session?${params.toString()}`);
  },

  // Onboarding
  getOnboardingDraft: () => request<any>('/onboarding/draft'),

  saveOnboardingDraft: (data: { step: number; draftData: any; organisationId?: string }) =>
    request<any>('/onboarding/save-draft', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  completeOnboarding: (data: any) =>
    request<any>('/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Health
  getHealth: () => request<any>('/health'),

  // Organisations
  getOrganisation: (id: string) => request<any>(`/organisations/${id}`),
  updatePolicy: (id: string, data: any) =>
    request<any>(`/organisations/${id}/policy`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Suppliers
  getSuppliers: (orgId: string) => request<any>(`/suppliers?orgId=${orgId}`),
  getSupplier: (id: string) => request<any>(`/suppliers/${id}`),
  createSupplier: (data: any) =>
    request<any>('/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Recipients
  getRecipients: (orgId: string) => request<any>(`/recipients?orgId=${orgId}`),
  createRecipient: (data: any) =>
    request<any>('/recipients', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateRecipientBank: (id: string, data: any) =>
    request<any>(`/recipients/${id}/bank-details`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  approveRecipientChange: (id: string, data: any) =>
    request<any>(`/recipients/${id}/approve-change`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Invoices
  getInvoices: (orgId: string, status?: string) => {
    const params = new URLSearchParams({ orgId });
    if (status) params.set('status', status);
    return request<any>(`/invoices?${params.toString()}`);
  },
  getInvoice: (id: string) => request<any>(`/invoices/${id}`),
  uploadInvoice: (data: any) =>
    request<any>('/invoices/upload', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  correctInvoice: (id: string, data: any) =>
    request<any>(`/invoices/${id}/correct`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Quotes
  getQuote: (data: { fromCurrency: string; toCurrency: string; fromAmount?: number; toAmount?: number }) =>
    request<any>('/quotes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getRates: (search?: string) => {
    const url = search ? `/quotes/rates?search=${encodeURIComponent(search)}` : '/quotes/rates';
    return request<any>(url);
  },

  // Payments & Relay
  getPayments: (orgId: string, status?: string, search?: string) => {
    const params = new URLSearchParams({ orgId });
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    return request<any>(`/payments?${params.toString()}`);
  },
  getPayment: (id: string) => request<any>(`/payments/${id}`),
  createPaymentRequest: (data: any) =>
    request<any>('/payments/request', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  initiatePayment: (data: any) =>
    request<any>('/payments/initiate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Approvals
  getPendingApprovals: (orgId: string) => request<any>(`/approvals/pending?orgId=${orgId}`),
  decideApproval: (data: any) =>
    request<any>('/approvals/decide', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Analytics & Reconciliation
  getAnalytics: (orgId: string) => request<any>(`/analytics/overview?orgId=${orgId}`),
  runReconciliation: (orgId: string) =>
    request<any>('/reconciliation/run', {
      method: 'POST',
      body: JSON.stringify({ organisationId: orgId }),
    }),
  getAuditEvents: (orgId: string, resourceType?: string) => {
    const params = new URLSearchParams({ orgId });
    if (resourceType) params.set('resourceType', resourceType);
    return request<any>(`/audit?${params.toString()}`);
  },

  // Payroll
  getPayrollOverview: (orgId: string) => request<any>(`/payroll/overview?orgId=${encodeURIComponent(orgId)}`),
  getPayrollRecipients: (orgId: string) => request<any>(`/payroll/recipients?orgId=${encodeURIComponent(orgId)}`),
  getPayrollRuns: (orgId: string) => request<any>(`/payroll/runs?orgId=${encodeURIComponent(orgId)}`),
  getPayrollRunDetail: (runId: string) => request<any>(`/payroll/runs/${runId}`),
  createPayrollRecipient: (data: any) =>
    request<any>('/payroll/recipients', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  createPayrollRun: (data: any) =>
    request<any>('/payroll/runs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  submitPayrollRun: (runId: string, notes?: string) =>
    request<any>(`/payroll/runs/${runId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),
  approvePayrollRun: (runId: string, approverId?: string, notes?: string) =>
    request<any>(`/payroll/runs/${runId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approverId, notes }),
    }),
  executePayrollRun: (runId: string) =>
    request<any>(`/payroll/runs/${runId}/execute`, {
      method: 'POST',
    }),
  retryFailedPayrollItem: (runId: string, itemId: string) =>
    request<any>(`/payroll/runs/${runId}/retry-failed`, {
      method: 'POST',
      body: JSON.stringify({ itemId }),
    }),
};
