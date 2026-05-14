.PHONY: dev prod up down logs migrate seed test build clean ssl help

# ── Development ──────────────────────────────────────────────────────────────
dev:
	docker compose up -d postgres redis
	pnpm dev

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

# ── Production ────────────────────────────────────────────────────────────────
prod.up:
	docker compose -f docker-compose.prod.yml up -d

prod.down:
	docker compose -f docker-compose.prod.yml down

prod.logs:
	docker compose -f docker-compose.prod.yml logs -f

prod.build:
	docker compose -f docker-compose.prod.yml build --no-cache

prod.restart:
	docker compose -f docker-compose.prod.yml restart api web

# ── Database ──────────────────────────────────────────────────────────────────
migrate:
	pnpm db:migrate

migrate.prod:
	docker compose -f docker-compose.prod.yml run --rm api sh -c "npx prisma migrate deploy"

seed:
	pnpm db:seed

# ── SSL (Let's Encrypt) ───────────────────────────────────────────────────────
ssl:
	@echo "Run: docker compose -f docker-compose.prod.yml run --rm certbot certonly --webroot -w /var/www/certbot -d $(DOMAIN) --email $(EMAIL) --agree-tos --no-eff-email"

# ── Testing ───────────────────────────────────────────────────────────────────
test:
	pnpm --filter api test

test.cov:
	pnpm --filter api test:cov

# ── Build ─────────────────────────────────────────────────────────────────────
build:
	pnpm build

# ── Cleanup ───────────────────────────────────────────────────────────────────
clean:
	docker image prune -f
	docker volume prune -f

# ── Help ─────────────────────────────────────────────────────────────────────
help:
	@echo "FitSaaS - Available commands:"
	@echo ""
	@echo "  make dev          Start infra + dev servers"
	@echo "  make up           Start all services (dev)"
	@echo "  make down         Stop all services"
	@echo "  make logs         Tail logs"
	@echo ""
	@echo "  make prod.up      Start production stack"
	@echo "  make prod.down    Stop production stack"
	@echo "  make prod.build   Rebuild production images"
	@echo "  make prod.logs    Tail production logs"
	@echo ""
	@echo "  make migrate      Run DB migrations (dev)"
	@echo "  make migrate.prod Run DB migrations (prod)"
	@echo "  make seed         Seed database"
	@echo ""
	@echo "  make test         Run unit tests"
	@echo "  make test.cov     Run tests with coverage"
	@echo "  make build        Build all apps"
	@echo "  make clean        Remove unused Docker images/volumes"
	@echo ""
	@echo "  make ssl DOMAIN=yourdomain.com EMAIL=you@email.com"
