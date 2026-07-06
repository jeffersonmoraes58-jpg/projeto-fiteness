# Briefing Completo para Cline/DeepSeek — Projeto FitlyNutri

> Este documento descreve tudo que foi feito até aqui no projeto, o estado atual,
> e o **novo objetivo**: publicar o TWA (Trusted Web Activity) na Play Store.
> O app mobile React Native foi descontinuado para este objetivo.

---

## 1. Visão Geral do Projeto

**Nome:** FitlyNutri / FitSaaS  
**Domínio:** https://fitlynutri.com.br  
**Repositório:** https://github.com/jeffersonmoraes58-jpg/fitsaas (privado)  
**Tipo:** SaaS de personal trainers e nutricionistas — gestão de alunos, treinos, dietas, progresso  

### Stack
| Camada | Tecnologia |
|---|---|
| API | NestJS + Prisma + PostgreSQL 16 + Redis 7 |
| Web | Next.js 14 (App Router, `output: standalone`) |
| Mobile (descontinuado para agora) | React Native + Expo SDK 51 |
| TWA (foco atual) | Android nativo mínimo via `androidbrowserhelper` |
| Infra | Oracle Cloud VM + Docker Compose + Nginx + Let's Encrypt |
| CI/CD | GitHub Actions → ghcr.io → Watchtower |
| Monorepo | pnpm workspaces: `apps/api`, `apps/web`, `apps/mobile`, `apps/twa` |

---

## 2. Infraestrutura — Servidor Oracle Cloud

### Acesso SSH
```
Host:     163.176.136.106
User:     ubuntu
Chave:    ~/.ssh/oracle_key
Comando:  ssh -i ~/.ssh/oracle_key ubuntu@163.176.136.106
```

### Diretório no servidor
```
/home/ubuntu/projeto-fiteness/
```

### Containers Docker (todos rodando)
```
fitsaas-nginx        nginx:1.25-alpine           portas 80+443
fitsaas-web          ghcr.io/.../fitsaas-web     porta 3000 (interno)
fitsaas-api          ghcr.io/.../fitsaas-api     porta 4000 (interno)
fitsaas-postgres     postgres:16-alpine          porta 5432 (127.0.0.1 apenas)
fitsaas-redis        redis:7-alpine              porta 6379 (127.0.0.1 apenas)
fitsaas-certbot      certbot/certbot             renovação auto SSL
fitsaas-watchtower   containrrr/watchtower       auto-deploy via ghcr.io
```

### Comandos úteis no servidor
```bash
# Ver status
docker ps

# Ver logs da API
docker logs fitsaas-api -f

# Reiniciar nginx
docker restart fitsaas-nginx

# Subir/atualizar stack completo
cd /home/ubuntu/projeto-fiteness
docker compose -f docker-compose.prod.yml up -d

# Rodar seed de usuários de demo
docker cp /tmp/seed-prod.js fitsaas-api:/tmp/seed-prod.js
docker exec -e NODE_PATH=/app/node_modules fitsaas-api node /tmp/seed-prod.js
```

### Arquivo .env de produção
Localização: `/home/ubuntu/projeto-fiteness/.env`  
**Não está no git** (está no .gitignore). Já foi recriado manualmente.

Variáveis principais configuradas:
```
NODE_ENV=production
APP_URL=https://fitlynutri.com.br
FRONTEND_URL=https://fitlynutri.com.br
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password123
POSTGRES_DB=fitsaas
REDIS_PASSWORD=redis123
JWT_SECRET=minha-chave-secreta-super-longa-aqui-123456
JWT_REFRESH_SECRET=outra-chave-secreta-super-longa-aqui-789012
CLOUDINARY_CLOUD_NAME=ddcrnfmlm
CLOUDINARY_API_KEY=381992466132183
CLOUDINARY_API_SECRET=VoB3s6THVJOO0VZ3GeA44uh_lYs
MUSCLEWIKI_API_KEY=mw_3TJEkjm6mfz7R0HTi1pknhp62SNu8GVnEyZv_t8zvVw
IMAGE_TAG=latest
```

---

## 3. Credenciais de Acesso ao Sistema

### Usuários Demo (banco de dados já populado)
| Perfil | Email | Senha |
|---|---|---|
| Admin | admin@fitsaas.com | Admin@123 |
| Personal Trainer | trainer@demo.com | Trainer@123 |
| Nutricionista | nutri@demo.com | Nutri@123 |
| Aluno | student@demo.com | Student@123 |

### GitHub Actions / CI
- Workflow em: `.github/workflows/deploy.yml`
- Imagens publicadas em: `ghcr.io/jeffersonmoraes58-jpg/fitsaas-api` e `fitsaas-web`
- Push para `master` → build automático → Watchtower atualiza servidor em ~5 min

---

## 4. O Que Foi Feito (histórico completo)

### 4.1 API (NestJS)
- Integração com MuscleWiki API: proxy em `/api/v1/musclewiki/stream/:type/:filename`
  - Exercícios armazenados com URL `api.musclewiki.com` são redirecionados para o proxy interno
  - Evita CORS e expõe a API key
- Módulos completos: auth, trainers, students, nutritionists, exercises, workouts, diets, appointments, chat, notifications, billing, AI (Claude/OpenAI), musclewiki

### 4.2 Web (Next.js)
- Site rodando em https://fitlynutri.com.br
- `output: 'standalone'` configurado
- Arquivo `apps/web/public/.well-known/assetlinks.json` criado para TWA

### 4.3 Nginx
- Certificado SSL Let's Encrypt válido até 02/10/2026
- Config em: `infra/nginx/nginx.prod.conf`
- **Rota especial adicionada para assetlinks.json** (servida inline, sem depender do Next.js):
```nginx
location = /.well-known/assetlinks.json {
  add_header Content-Type "application/json" always;
  add_header Access-Control-Allow-Origin "*" always;
  add_header Cache-Control "public, max-age=3600" always;
  return 200 '[{"relation":["delegate_permission/common.handle_all_urls"],"target":{"namespace":"android_app","package_name":"com.fitlynutri.app","sha256_cert_fingerprints":["88:6F:7A:63:4E:02:D4:BB:88:05:2B:3C:51:C0:68:41:BD:D2:CC:22:1D:E5:CC:8B:D9:40:99:01:14:CA:F8:65"]}}]';
}
```
- ✅ Testado: https://fitlynutri.com.br/.well-known/assetlinks.json responde corretamente

### 4.4 TWA (Trusted Web Activity) — FOCO ATUAL
O TWA é um APK Android que abre o site https://fitlynutri.com.br dentro do Chrome, **sem barra de URL**, parecendo um app nativo.

#### Projeto TWA criado manualmente em: `apps/twa/android/`
```
apps/twa/android/
├── app/
│   ├── build.gradle           ← packageId, versão, keystore
│   ├── release.keystore       ← chave de assinatura (copiada do mobile)
│   └── src/main/
│       ├── AndroidManifest.xml  ← LauncherActivity + autoVerify
│       └── res/
│           ├── values/
│           │   ├── strings.xml     ← app_name = "FitlyNutri"
│           │   └── colors.xml      ← colorPrimary = #6f5cf0
│           └── mipmap-*/          ← ícones do app (launcher icons)
├── build.gradle               ← classpath android
├── settings.gradle
├── gradle.properties
└── gradlew / gradlew.bat
```

#### Keystore (assinatura do APK)
```
Arquivo:   apps/twa/android/app/release.keystore
           (mesmo que apps/mobile/android/app/release.keystore)
Alias:     release
Senha:     android
```

#### SHA-256 do keystore (para assetlinks.json)
```
88:6F:7A:63:4E:02:D4:BB:88:05:2B:3C:51:C0:68:41:BD:D2:CC:22:1D:E5:CC:8B:D9:40:99:01:14:CA:F8:65
```

#### Package name
```
com.fitlynutri.app
```

#### APK gerado (última build)
```
apps/twa/android/app/build/outputs/apk/release/app-release.apk
Tamanho: ~2.4MB
```

#### Como fazer build do TWA
```bash
cd apps/twa/android
./gradlew assembleRelease
# APK em: app/build/outputs/apk/release/app-release.apk
```

#### Status atual do TWA
- ✅ APK compila e instala no celular
- ✅ Site abre dentro do app
- ✅ assetlinks.json respondendo corretamente em produção
- ✅ **Splash screen personalizada** — tema com gradiente roxo escuro + logo
- ✅ **Ícones HD** — todas as resoluções (mdpi a xxxhdpi) + 512x512 para Play Store
- ✅ **ProGuard configurado** — minify habilitado para release (APK reduzido para ~814 KB)
- ✅ **AAB gerado** — Android App Bundle (~828 KB) pronto para Play Store
- ✅ **Guia Play Store criado** — `apps/twa/PLAYSTORE_GUIDE.md` com passo a passo completo
- ⚠️ **Barra de URL ainda pode aparecer** — Chrome precisa verificar o assetlinks.json na primeira abertura
  - Para forçar: desinstalar o APK, limpar dados do Chrome, reinstalar e abrir
  - Ou aguardar Chrome fazer a verificação automática (~24h após install)

---

## 5. Estado Atual — O Que Está Funcionando

| Funcionalidade | Status |
|---|---|
| Site https://fitlynutri.com.br | ✅ Online |
| API https://fitlynutri.com.br/api/v1 | ✅ Online |
| SSL/HTTPS | ✅ Válido até out/2026 |
| Login/Autenticação | ✅ Funcionando |
| assetlinks.json | ✅ Respondendo corretamente |
| TWA APK (abertura básica) | ✅ Abre o site |
| TWA sem barra de URL | ⚠️ Pendente verificação Chrome |
| GitHub Actions CI/CD | ✅ Funcional |
| Watchtower auto-deploy | ✅ Ativo |
| Banco populado com demo | ✅ 4 usuários + **1.899 exercícios** MuscleWiki (traduzidos PT-BR) |
| Proxy MuscleWiki (vídeos) | ✅ 1.899 URLs convertidas para proxy interno |
| Sincronização MuscleWiki | ✅ Script `infra/scripts/sync-musclewiki.sh` funcional |
| Tradução PT-BR (Claude AI) | ✅ 1.899 exercícios traduzidos via Anthropic Claude |

---

## 6. Novo Objetivo — Publicar TWA na Play Store

### O que precisa ser feito (em ordem)

#### 6.1 Verificar que a barra de URL desaparece
1. Desinstalar o APK atual do celular
2. Reinstalar o APK `apps/twa/android/app/build/outputs/apk/release/app-release.apk`
3. Abrir o app e verificar se a URL bar sumiu
4. Se não sumiu: verificar https://fitlynutri.com.br/.well-known/assetlinks.json no navegador do celular

#### 6.2 Melhorar o TWA para a Play Store ✅ CONCLUÍDO
O APK foi polido para aprovação na Play Store:
- [x] **Splash screen personalizada** — tema com gradiente roxo escuro + logo (`styles.xml` + `splash_screen.xml`)
- [x] **Ícones HD** — todas as resoluções geradas (mdpi a xxxhdpi) + ícone 512x512 para Play Store
- [x] **Versão e versionCode** configurados no `build.gradle` (versionCode=1, versionName=1.0.0)
- [x] **ProGuard** configurado com regras para TWA (minify habilitado)
- [x] **AAB gerado** — `app-release.aab` (~828 KB) pronto para upload
- [x] **Guia Play Store criado** — `apps/twa/PLAYSTORE_GUIDE.md` com passo a passo completo

#### 6.3 Gerar APK/AAB assinado para upload ✅ CONCLUÍDO
- ✅ APK assinado: `app/build/outputs/apk/release/app-release.apk` (~814 KB)
- ✅ AAB gerado: `app/build/outputs/bundle/release/app-release.aab` (~828 KB)
- ✅ Keystore verificado — SHA-256 confere com assetlinks.json

#### 6.4 Criar conta na Play Store e submeter (pendente — manual)
- [ ] Conta Google Play Developer: $25 taxa única (criar em https://play.google.com/console/)
- [ ] Upload do AAB + screenshots + descrição (seguir `PLAYSTORE_GUIDE.md`)
- [ ] Criar política de privacidade em `https://fitlynutri.com.br/privacy-policy`
- [ ] Criar Feature Graphic (1024x500 px) para o listing
- [ ] Capturar screenshots do app no celular (1080x1920 px)

---

## 7. Arquivos Chave do Projeto

### Configuração
- `docker-compose.prod.yml` — stack de produção
- `infra/nginx/nginx.prod.conf` — nginx com SSL + rotas + assetlinks
- `.github/workflows/deploy.yml` — CI/CD

### TWA
- `apps/twa/android/app/build.gradle` — packageId, versão, keystore
- `apps/twa/android/app/src/main/AndroidManifest.xml` — manifest TWA
- `apps/twa/android/app/release.keystore` — chave de assinatura
- `apps/web/public/.well-known/assetlinks.json` — verificação de domínio

### API
- `apps/api/src/` — módulos NestJS
- `apps/api/prisma/schema.prisma` — schema do banco
- `apps/api/prisma/seed.ts` — dados demo

### Web
- `apps/web/src/app/` — rotas Next.js App Router
- `apps/web/next.config.js` — config Next.js

---

## 8. Contexto Técnico Importante

### Por que TWA em vez de app nativo?
O cliente quer publicar na Play Store mas já tem uma web app completa. TWA permite empacotar o site como APK Android sem reescrever tudo em React Native. O Chrome remove a barra de URL quando o `assetlinks.json` está correto, dando aparência de app nativo.

### Como funciona a verificação do assetlinks.json
1. APK instalado no Android com `android:autoVerify="true"` no manifest
2. Chrome/Android verifica https://fitlynutri.com.br/.well-known/assetlinks.json
3. O JSON precisa ter o SHA-256 fingerprint do keystore que assinou o APK
4. Se verificado: Chrome remove a barra de URL → app parece nativo
5. Se não verificado: Chrome mostra barra de URL (Custom Tab normal)

### Proxy MuscleWiki
Exercícios podem ter URLs `api.musclewiki.com/stream/videos/...` — essas URLs precisam de API key e não funcionam direto no browser/app. O proxy da API em `/api/v1/musclewiki/stream/:type/:filename` faz a requisição com a API key e retorna o vídeo.

---

## 9. Comandos Rápidos de Referência

```bash
# SSH no servidor
ssh -i ~/.ssh/oracle_key ubuntu@163.176.136.106

# Build TWA APK
cd apps/twa/android && ./gradlew assembleRelease

# Build TWA AAB (para Play Store)
cd apps/twa/android && ./gradlew bundleRelease

# Ver logs em tempo real
ssh -i ~/.ssh/oracle_key ubuntu@163.176.136.106 "docker logs fitsaas-api -f"

# Testar assetlinks.json
curl https://fitlynutri.com.br/.well-known/assetlinks.json

# Testar login
curl -X POST https://fitlynutri.com.br/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fitsaas.com","password":"Admin@123"}'

# Sincronizar exercícios MuscleWiki (executar no servidor)
ssh -i ~/.ssh/oracle_key ubuntu@163.176.136.106 'bash -s' < infra/scripts/sync-musclewiki.sh

# Verificar distribuição de exercícios no banco
ssh -i ~/.ssh/oracle_key ubuntu@163.176.136.106 'docker exec fitsaas-postgres psql -U postgres -d fitsaas -c "SELECT category, COUNT(*) FROM exercises GROUP BY category ORDER BY category;"'

# Testar proxy de vídeo MuscleWiki
curl -s -o /dev/null -w "%{http_code}" "https://fitlynutri.com.br/api/v1/musclewiki/stream/branded/male-Barbell-barbell-curl-front.mp4"
```

---

## 10. O Que NÃO Fazer

- **Não commitar/pushar no GitHub automaticamente** — o usuário (Jefferson) controla os commits
- **Não modificar o keystore** — está compartilhado com o app mobile e o SHA-256 está no assetlinks.json deployado
- **Não alterar o package name** `com.fitlynutri.app` — quebra a verificação do assetlinks.json
- **Não fazer deploy do mobile** — o foco agora é exclusivamente o TWA

---

## 11. Push Notifications (Web Push API) — NOVO

### O que foi implementado
- **Service Worker** (`apps/web/public/sw.js`) — intercepta push events, mostra notificações, gerencia clique
- **Componente React** (`apps/web/src/components/push-notification-manager.tsx`) — botão para ativar/desativar notificações
- **API Push Module** (`apps/api/src/modules/push/`) — endpoints REST para inscrição/desinscrição
- **Model Prisma** `DeviceToken` — já existia no schema, usado para salvar subscriptions
- **web-push** instalado na API — biblioteca para enviar push notifications via VAPID

### Endpoints da API
| Método | Rota | Autenticação | Descrição |
|---|---|---|---|
| GET | `/api/v1/push/vapid-public-key` | ❌ Público | Retorna a VAPID public key |
| POST | `/api/v1/push/subscribe` | ✅ JWT | Inscreve dispositivo |
| POST | `/api/v1/push/unsubscribe` | ✅ JWT | Remove inscrição |

### VAPID Keys
```
Public Key:  BPmqcDfjdYPSleLu1v2uiN2shi5Cp2wNKVFlUPBSW6dBcYC-dg-RC_8osjRokYINRGeieiiygfPkg5VQZw-bQDA
Private Key: xcTfyEkqlowbpMY8qF_HzQ3YAMjnh5s-VxFQN7u25dM
```

### Como configurar no servidor
Adicionar ao `.env` de produção:
```bash
VAPID_PUBLIC_KEY=BPmqcDfjdYPSleLu1v2uiN2shi5Cp2wNKVFlUPBSW6dBcYC-dg-RC_8osjRokYINRGeieiiygfPkg5VQZw-bQDA
VAPID_PRIVATE_KEY=xcTfyEkqlowbpMY8qF_HzQ3YAMjnh5s-VxFQN7u25dM
VAPID_SUBJECT=mailto:contato@fitlynutri.com.br
```

### Como testar
1. Acessar https://fitlynutri.com.br logado
2. Clicar no botão "Ativar notificações" (ícone de sino)
3. Aceitar permissão no navegador
4. A subscription será salva no banco (tabela `device_tokens`)
5. Para testar envio manual: `ssh -i ~/.ssh/oracle_key ubuntu@163.176.136.106 'docker exec fitsaas-api node -e "const { PushService } = require(\"./dist/modules/push/push.service\"); ..."'`

---

*Gerado em: 05/07/2026 | Por: Cline (DeepSeek)*
