import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root or backend
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const isProduction = (process.env.NODE_ENV || (process.env.RENDER ? 'production' : 'development')) === 'production';
const rawDatabaseUrl = process.env.DATABASE_URL?.trim();

export const config = {
  port: parseInt(process.env.PORT || '3007', 10),
  nodeEnv: process.env.NODE_ENV || (process.env.RENDER ? 'production' : 'development'),
  databaseUrl: rawDatabaseUrl || (isProduction ? '' : 'postgres:///atlas?host=/var/run/postgresql'),
  testDatabaseUrl: process.env.TEST_DATABASE_URL || 'postgres:///atlas_test?host=/var/run/postgresql',
  
  // Blaaiz API Settings
  blaaiz: {
    baseUrl: process.env.BLAAIZ_BASE_URL || 'https://api-dev.blaaiz.com',
    clientId: process.env.BLAAIZ_CLIENT_ID || '',
    clientSecret: process.env.BLAAIZ_CLIENT_SECRET || '',
    webhookSecret: process.env.BLAAIZ_WEBHOOK_SECRET || 'atlas_blaaiz_dev_webhook_secret_key_123',
    businessWalletId: process.env.BLAAIZ_BUSINESS_WALLET_ID || 'b18ed308-5ac5-4e9e-bb16-8c03ec2d3c01',
    // Priority 1: In production, emulator defaults strictly to false unless explicitly opted in
    enableEmulator: isProduction
      ? process.env.ENABLE_BLAAIZ_EMULATOR === 'true'
      : process.env.ENABLE_BLAAIZ_EMULATOR !== 'false',
  },

  // Security & JWT
  jwtSecret: process.env.APP_SECRET || 'atlas_jwt_secret_key_minimum_32_characters_long_123',
};
