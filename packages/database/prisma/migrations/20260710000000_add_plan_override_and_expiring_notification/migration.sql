-- Add planOverride to users (allows admin to override a user's effective subscription plan)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "planOverride" TEXT;

-- Add lastExpiringNotificationAt to tenant_subscriptions (tracks when expiry email was last sent)
ALTER TABLE "tenant_subscriptions" ADD COLUMN IF NOT EXISTS "lastExpiringNotificationAt" TIMESTAMPTZ;
