import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { analyticsRouter } from './routes/analytics.js';
import { approvalsRouter } from './routes/approvals.js';
import { auditRouter } from './routes/audit.js';
import { authRouter } from './routes/auth.js';
import { healthRouter } from './routes/health.js';
import { invoicesRouter } from './routes/invoices.js';
import { onboardingRouter } from './routes/onboarding.js';
import { organisationsRouter } from './routes/organisations.js';
import { paymentsRouter } from './routes/payments.js';
import { payrollRouter } from './routes/payroll.js';
import { quotesRouter } from './routes/quotes.js';
import { recipientsRouter } from './routes/recipients.js';
import { reconciliationRouter } from './routes/reconciliation.js';
import { suppliersRouter } from './routes/suppliers.js';
import { webhooksRouter } from './routes/webhooks.js';
import { authenticateToken, enforceWorkspaceIsolation } from './middleware/auth.js';
import { AppError } from './utils/errors.js';

export const app = express();

// Allowed CORS origins for Vercel production deployment and local development
const allowedOrigins = [
  'https://atlas-ten-ashy-16.vercel.app',
  'http://localhost:5180',
  'http://localhost:3000',
  'http://localhost:3007',
];

// Enable CORS with support for Vercel deployment, preview domains, and local dev
app.use(cors({
  origin: (origin, callback) => {
    // Non-browser or same-origin requests
    if (!origin) return callback(null, true);
    // Explicit production Vercel frontend or preview domains
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }
    // Allow dynamic origins while preserving credentials support
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

// Body parser with raw body buffer preservation for webhook signature verification
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  },
}));

// Apply authentication parser and strict tenant isolation
app.use(authenticateToken);
app.use(enforceWorkspaceIsolation);

// Mount REST API Routes
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/onboarding', onboardingRouter);
app.use('/api/v1/organisations', organisationsRouter);
app.use('/api/v1/suppliers', suppliersRouter);
app.use('/api/v1/recipients', recipientsRouter);
app.use('/api/v1/invoices', invoicesRouter);
app.use('/api/v1/quotes', quotesRouter);
app.use('/api/v1/payments', paymentsRouter);
app.use('/api/v1/payroll', payrollRouter);
app.use('/api/v1/approvals', approvalsRouter);
app.use('/api/v1/webhooks', webhooksRouter);
app.use('/api/v1/reconciliation', reconciliationRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/audit', auditRouter);

// Serve compiled frontend SPA if dist is present (e.g. unified Render Web Service)
const frontendDistPath = path.resolve(process.cwd(), 'frontend/dist');
const altFrontendDistPath = path.resolve(process.cwd(), '../frontend/dist');
const resolvedDistPath = fs.existsSync(frontendDistPath)
  ? frontendDistPath
  : fs.existsSync(altFrontendDistPath)
    ? altFrontendDistPath
    : null;

if (resolvedDistPath) {
  app.use(express.static(resolvedDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(resolvedDistPath, 'index.html'));
  });
}

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      errorCode: err.errorCode,
      error: err.message,
      details: err.details,
    });
  }

  console.error('[Unhandled Express Error]:', err);
  res.status(500).json({
    success: false,
    errorCode: 'INTERNAL_SERVER_ERROR',
    error: err.message || 'An unexpected internal error occurred.',
  });
});

