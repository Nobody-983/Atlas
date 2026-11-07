-- ============================================================================
-- ATLAS PLATFORM: WEBHOOK IDEMPOTENCY & EVENT UNIQUENESS
-- Migration: 004_webhook_idempotency.sql
-- ============================================================================

ALTER TABLE payment_provider_events ADD COLUMN IF NOT EXISTS event_id VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_event_id ON payment_provider_events(provider, event_id) WHERE event_id IS NOT NULL;

