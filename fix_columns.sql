ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS "lastExpiringNotificationAt" timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "planOverride" text;