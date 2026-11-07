import { Router } from 'express';
import { blaaizClient } from '../blaaiz/client.js';
import { config } from '../config.js';
import { checkDatabaseHealth } from '../db.js';

export const healthRouter = Router();

// GET /api/v1/health
healthRouter.get('/', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();

    res.json({
      status: 'healthy',
      platform: 'ATLAS — Global Commerce & Verified Payments Operating System',
      version: '1.0.0',
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
      database: {
        status: dbHealth.status,
        latencyMs: dbHealth.latencyMs,
      },
      blaaiz: {
        baseUrl: config.blaaiz.baseUrl,
        mode: blaaizClient.isUsingEmulator() ? 'sandbox_emulator' : 'live_sandbox_api',
        isEmulatorActive: blaaizClient.isUsingEmulator(),
        credentialsConfigured: Boolean(config.blaaiz.clientId && config.blaaiz.clientSecret),
        walletId: config.blaaiz.businessWalletId,
        webhookSecretConfigured: Boolean(config.blaaiz.webhookSecret),
      },
      modules: {
        commerce: 'online',
        proofrail: 'online',
        relay: 'online',
      },
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'degraded',
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

