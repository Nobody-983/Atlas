import { app } from './app.js';
import { blaaizClient } from './blaaiz/client.js';
import { config } from './config.js';
import { checkDatabaseHealth, ensureDatabaseSchema, pool } from './db.js';

async function startServer() {
  try {
    // 1. Deliberately ensure database migrations & baseline schemas are applied
    await ensureDatabaseSchema();

    // 2. Database health verification before accepting traffic
    const dbHealth = await checkDatabaseHealth();
    console.log(`[Database] Connected successfully (${dbHealth.latencyMs}ms)`);

    // 3. Report Blaaiz payment integration status
    const isEmulator = blaaizClient.isUsingEmulator();
    console.log(`[Blaaiz Adapter] Running mode: ${isEmulator ? 'Sandbox Emulator' : 'Live Sandbox API'}`);
    if (isEmulator) {
      console.log(`[Blaaiz Adapter] Using simulated FX quotes and payouts conforming to docs.blaaiz.com`);
    }

    // 4. Start HTTP server binding explicitly to 0.0.0.0 and process.env.PORT
    const server = app.listen(config.port, '0.0.0.0', () => {
      console.log(`=======================================================`);
      console.log(`🚀 ATLAS Backend API running on http://0.0.0.0:${config.port}`);
      console.log(`📡 Network: ${config.nodeEnv}`);
      console.log(`🔗 Health Check: http://0.0.0.0:${config.port}/api/v1/health`);
      console.log(`=======================================================`);
    });

    // 4. Handle graceful shutdown for containerized deployment (e.g., Render SIGTERM)
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n[Shutdown] Received ${signal}. Closing HTTP server...`);
      server.close(async () => {
        console.log('[Shutdown] HTTP server closed.');
        try {
          await pool.end();
          console.log('[Shutdown] Database pool closed.');
        } catch (err) {
          console.error('[Shutdown Error] Failed to close database pool:', err);
        }
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (err) {
    console.error('[Fatal Startup Error]:', err);
    process.exit(1);
  }
}

startServer();
