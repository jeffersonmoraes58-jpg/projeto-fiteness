# GitHub Secrets & Variables — Setup Guide

Acesse: **Settings → Secrets and variables → Actions** no seu repositório GitHub.

---

## Secrets (valores sensíveis)

> Settings → Secrets and variables → Actions → **New repository secret**

| Secret | Valor | Como obter |
|--------|-------|------------|
| `DEPLOY_HOST` | IP ou hostname do servidor | IP da sua VPS (ex: `192.168.1.1`) |
| `DEPLOY_USER` | Usuário SSH | Normalmente `ubuntu` ou `root` |
| `DEPLOY_SSH_KEY` | Chave SSH privada completa | `cat ~/.ssh/id_rsa` no seu computador |

### Gerar chave SSH para deploy (se não tiver)

```bash
# No seu computador
ssh-keygen -t ed25519 -C "github-actions-fitsaas" -f ~/.ssh/fitsaas_deploy

# Copiar chave pública para o servidor
ssh-copy-id -i ~/.ssh/fitsaas_deploy.pub usuario@SEU_SERVIDOR

# Conteúdo da chave privada (cole no secret DEPLOY_SSH_KEY)
cat ~/.ssh/fitsaas_deploy
```

---

## Variables (valores públicos de configuração)

> Settings → Secrets and variables → Actions → **Variables** → **New repository variable**

| Variable | Exemplo | Descrição |
|----------|---------|-----------|
| `NEXT_PUBLIC_API_URL` | `https://api.seudominio.com` | URL pública da API |
| `NEXT_PUBLIC_APP_URL` | `https://seudominio.com` | URL pública do frontend |
| `NEXT_PUBLIC_SOCKET_URL` | `https://api.seudominio.com` | URL do WebSocket (geralmente igual à API) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Chave pública do Stripe (dashboard.stripe.com) |
| `NEXT_PUBLIC_STRIPE_PRICE_BASIC` | `price_...` | ID do preço Basic no Stripe |
| `NEXT_PUBLIC_STRIPE_PRICE_PRO` | `price_...` | ID do preço Pro no Stripe |
| `NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE` | `price_...` | ID do preço Enterprise no Stripe |

---

## Environment de produção

O job `deploy` usa `environment: production`. Crie esse ambiente:

1. Vá em **Settings → Environments → New environment**
2. Nome: `production`
3. Opcional: adicione "Required reviewers" para aprovar deploys manualmente

---

## Configuração do servidor (primeira vez)

No servidor, antes do primeiro deploy via CI:

```bash
# Instalar Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER

# Criar pasta do projeto
mkdir -p /opt/fitsaas
cd /opt/fitsaas

# Criar .env de produção
cp .env.example .env
nano .env   # preencher todas as variáveis reais

# Fazer login no GitHub Container Registry
echo "SEU_GITHUB_TOKEN" | docker login ghcr.io -u SEU_USUARIO --password-stdin
```

---

## O que o CI faz em cada push para master

```
push → [test] → [build & push imagens no GHCR] → [deploy via SSH]
         ↓               ↓                              ↓
    npm test ci    docker build api + web         pull + up -d
    (32 testes)    push ghcr.io/...              migrations automáticas
```
