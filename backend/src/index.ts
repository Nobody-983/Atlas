import { app } from './app.js';
import { blaaizClient } from './blaaiz/client.js';
import { config } from './config.js';
import { checkDatabaseHealth } from './db.js';

async function startServer() {
  try {
    const dbHealth = await checkDatabaseHealth();
    console.log(`[Database] Connected successfully (${dbHealth.latencyMs}ms)`);

    const isEmulator = blaaizClient.isUsingEmulator();
    console.log(`[Blaaiz Adapter] Running mode: ${isEmulator ? 'Sandbox Emulator' : 'Live Sandbox API'}`);
    if (isEmulator) {
      console.log(`[Blaaiz Adapter] Using simulated FX quotes and payouts conforming to docs.blaaiz.com`);
    }

    app.listen(config.port, () => {
      console.log(`=======================================================`);
      console.log(`🚀 ATLAS Backend API running on port ${config.port}`);
      console.log(`📡 Network: ${config.nodeEnv}`);
      console.log(`🔗 Health Check: http://localhost:${config.port}/api/v1/health`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('[Fatal Startup Error]:', err);
    process.exit(1);
  }
}

startServer();

