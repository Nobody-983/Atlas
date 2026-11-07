import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

// Load .env if present
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const { Client } = pg;

async function runSeeds() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('[Seed Error]: DATABASE_URL environment variable is required.');
    process.exit(1);
  }

  const isLocal = connectionString.includes('/var/run/postgresql') || connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const isExplicitSslDisable = connectionString.includes('sslmode=disable') || process.env.PGSSLMODE === 'disable';
  const ssl = (isLocal || isExplicitSslDisable) ? undefined : { rejectUnauthorized: false };

  console.log('[Seed] Connecting to database...');
  const client = new Client({ connectionString, ssl });
  await client.connect();
  console.log('[Seed] Database connected successfully.');

  const seedsDir = path.resolve(process.cwd(), 'database/seeds');
  if (!fs.existsSync(seedsDir)) {
    console.error(`[Seed Error]: Seeds directory not found at ${seedsDir}`);
    await client.end();
    process.exit(1);
  }

  const files = fs.readdirSync(seedsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`[Seed] Found ${files.length} seed file(s).`);

  for (const file of files) {
    const filePath = path.join(seedsDir, file);
    console.log(`[Seed] Applying ${file}...`);
    const sql = fs.readFileSync(filePath, 'utf-8');
    try {
      await client.query(sql);
      console.log(`[Seed] ✓ Applied ${file}`);
    } catch (err) {
      console.error(`[Seed Error] Failed applying ${file}:`, err);
      await client.end();
      process.exit(1);
    }
  }

  console.log('[Seed] All seed files completed successfully.');
  await client.end();
}

runSeeds().catch(err => {
  console.error('[Seed Fatal Error]:', err);
  process.exit(1);
});

