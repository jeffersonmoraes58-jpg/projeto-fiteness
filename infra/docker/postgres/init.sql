-- FitSaaS initial database setup
-- This runs only on first container start (empty volume)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
