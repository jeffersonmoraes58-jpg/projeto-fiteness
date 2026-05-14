# Deploy Guide

## Prerequisites

- VPS/server with Docker + Docker Compose v2 installed
- Domain pointed to server IP
- GitHub repository with secrets configured

## GitHub Secrets Required

In **Settings → Secrets and variables → Actions**:

| Secret | Description |
|---|---|
| `DEPLOY_HOST` | Server IP or hostname |
| `DEPLOY_USER` | SSH user (e.g. `ubuntu`) |
| `DEPLOY_SSH_KEY` | Private SSH key (PEM format) |

In **Settings → Secrets and variables → Actions → Variables** (not secrets — these are public):

| Variable | Example |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://yourdomain.com` |
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.com` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` |
| `NEXT_PUBLIC_SOCKET_URL` | `https://yourdomain.com` |

## First-time server setup

```bash
# 1. SSH into your server
ssh user@your-server

# 2. Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 3. Clone repository
git clone https://github.com/YOUR_ORG/fitsaas.git /opt/fitsaas
cd /opt/fitsaas

# 4. Create production .env from example
cp .env.example .env
# Edit .env with real values — especially JWT secrets, DB passwords, API keys
nano .env

# 5. Create SSL directory
mkdir -p infra/nginx/ssl

# 6. Start nginx on HTTP only first (for ACME challenge)
docker compose -f docker-compose.prod.yml up -d nginx

# 7. Obtain SSL certificate
docker compose -f docker-compose.prod.yml run --rm certbot \
  certonly --webroot -w /var/www/certbot \
  -d yourdomain.com \
  --email you@email.com \
  --agree-tos --no-eff-email

# 8. Start full stack
docker compose -f docker-compose.prod.yml up -d

# 9. Run initial migrations
docker compose -f docker-compose.prod.yml run --rm api \
  sh -c "npx prisma migrate deploy"

# 10. Seed initial data (optional)
docker compose -f docker-compose.prod.yml run --rm api \
  sh -c "node dist/prisma/seed"
```

## Required .env values for production

```env
NODE_ENV=production
APP_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com

POSTGRES_USER=fitsaas
POSTGRES_PASSWORD=<strong-random-password>
POSTGRES_DB=fitsaas

REDIS_PASSWORD=<strong-random-password>

JWT_SECRET=<64-char-random-string>
JWT_REFRESH_SECRET=<64-char-random-string>

# ... all other keys from .env.example
```

Generate strong secrets with:
```bash
openssl rand -hex 32
```

## CI/CD Flow

On every push to `main`:
1. **Test** — runs `jest` unit tests for the API
2. **Build** — builds Docker images and pushes to `ghcr.io`
3. **Deploy** — SSHes into the server, pulls new images, runs migrations, restarts containers

## SSL Renewal

The `certbot` service in docker-compose.prod.yml automatically renews certificates every 12 hours. No manual action needed.

## Useful commands

```bash
# View logs
make prod.logs

# Restart services
make prod.restart

# Run migrations after deploy
make migrate.prod

# Rebuild images locally
make prod.build
```
