# FitlyNutri — Briefing Completo para IA Colaboradora

> **Gerado em:** 08/07/2026  
> **Checkpoint git atual:** `7b201ebb` — palavra-chave de recuperação: **PAGAMENTO-BLOQUEADO**  
> **Para voltar a este estado se algo quebrar:** `git reset --hard 7b201ebb`

---

## 1. VISÃO GERAL DO PRODUTO

**FitlyNutri** é uma plataforma SaaS multi-tenant para gestão de fitness e nutrição.

**Domínio de produção:** https://fitlynutri.com.br  
**Repositório:** GitHub (branch `master` = produção)  
**Deploy automático:** push no `master` → GitHub Actions → Docker → Oracle Cloud (~5 min)

### Personas da plataforma

| Perfil | O que faz |
|--------|-----------|
| **TRAINER** | Cria treinos, atribui a alunos, acompanha progresso, cobra mensalidade |
| **NUTRITIONIST** | Cria dietas, atribui a pacientes, anamnese nutricional, notas clínicas |
| **STUDENT** | Visualiza treino/dieta, registra execuções, mede progresso, participa de desafios |
| **STUDIO_OWNER** | Gerencia academia, equipe de trainers, relatórios consolidados |
| **ADMIN** | Administra toda a plataforma SaaS (super-admin) |

---

## 2. ESTRUTURA DO MONOREPO

```
C:\Projeto-fiteness/          (raiz do monorepo)
├── apps/
│   ├── api/                  → Backend NestJS (porta 4000)
│   ├── web/                  → Frontend Next.js 14 (porta 3000)
│   ├── twa/                  → Trusted Web Activity (APK Android / Play Store)
│   └── mobile/               → React Native + Expo (DESCONTINUADO — não mexer)
├── packages/
│   ├── database/             → Prisma schema + client + migrations
│   ├── shared/               → Tipos TypeScript compartilhados
│   └── ui/                   → Componentes reutilizáveis
├── infra/
│   ├── docker/               → Dockerfiles, init.sql
│   └── nginx/                → nginx.prod.conf (proxy reverso + SSL + assetlinks.json)
├── .github/workflows/ci.yml  → CI/CD (testes → build Docker → push ghcr.io)
├── docker-compose.yml        → Stack local de desenvolvimento
├── docker-compose.prod.yml   → Stack de produção
├── CLAUDE.md                 → Convenções críticas do projeto (SEMPRE ler)
└── BRIEFING_DEEPSEEK.md      → Este arquivo
```

**Gerenciador de pacotes:** pnpm 9 com workspaces  
**Build system:** Turborepo 2

---

## 3. STACK TECNOLÓGICA

### Backend — `apps/api/`
| Tecnologia | Versão | Uso |
|---|---|---|
| NestJS | 10.3.0 | Framework principal |
| Prisma | 5.15.0 | ORM + migrations |
| PostgreSQL | 16 | Banco de dados principal |
| Redis | 7 | Cache + filas Bull |
| Socket.io | 4.7.5 | Chat em tempo real |
| Passport JWT | — | Autenticação |
| Passport Google | — | OAuth 2.0 |
| Stripe | 15.9.0 | Pagamentos internacionais |
| Mercado Pago | 2.0.6 | Pagamentos Brasil (PIX) |
| OpenAI SDK | 4.52.0 | Sugestões AI (GPT-4) |
| Anthropic SDK | 0.104.1 | AI alternativa |
| Bull | 4.12.2 | Filas de trabalho async |
| Nodemailer / Resend | — | Envio de emails |
| Cloudinary | 2.3.1 | Upload de imagens |
| Firebase Admin | — | Push notifications |
| class-validator | — | Validação de DTOs |

### Frontend — `apps/web/`
| Tecnologia | Versão | Uso |
|---|---|---|
| Next.js | 14.2.5 | Framework (App Router) |
| React | 18.3.1 | UI |
| TypeScript | 5.x | Tipagem |
| TailwindCSS | 3.4.4 | Estilos |
| Shadcn/UI + Radix | — | Componentes UI |
| Framer Motion | — | Animações |
| Zustand | 4.5.4 | Estado global (client-side) |
| TanStack React Query | 5.50.1 | Estado servidor + cache |
| Axios | — | Cliente HTTP |
| react-hook-form + zod | — | Formulários e validação |
| Socket.io-client | 4.7.5 | Chat em tempo real |
| Recharts | — | Gráficos |
| react-hot-toast | — | Notificações toast |

---

## 4. BANCO DE DADOS — SCHEMA PRISMA COMPLETO

**Localização:** `packages/database/prisma/schema.prisma`  
**Banco:** PostgreSQL 16  
**ORM:** Prisma 5  

### Enums Importantes

```typescript
enum UserRole { ADMIN, TRAINER, NUTRITIONIST, STUDENT, STUDIO_OWNER }
enum SubscriptionStatus { TRIAL, ACTIVE, PAST_DUE, CANCELED, EXPIRED }
enum SubscriptionPlan { FREE, BASIC, PRO, ENTERPRISE }
enum PaymentStatus { PENDING, PAID, FAILED, REFUNDED, CANCELED }
enum PaymentProvider { STRIPE, MERCADO_PAGO }
enum StudentBillingStatus { PENDING, ACTIVE, OVERDUE, SUSPENDED, CANCELLED }
enum WorkoutStatus { DRAFT, ACTIVE, ARCHIVED }
enum MealType { BREAKFAST, MORNING_SNACK, LUNCH, AFTERNOON_SNACK, DINNER, EVENING_SNACK, PRE_WORKOUT, POST_WORKOUT }
```

### Modelos Principais

#### Sistema Multi-Tenant
```
Tenant              → Studio/academia (nome, logo, cores, domínio)
TenantSettings      → Toggles de features por tenant
TenantSubscription  → Plano SaaS (status, plan, billingCycle, stripeCustomerId, currentPeriodEnd)
PlatformSettings    → Configurações globais da plataforma
```

#### Usuários
```
User          → (id UUID, email, password, role, tenantId, googleId, isActive, isVerified)
Profile       → (firstName, lastName, phone, avatar, bio, gender, birthDate)
RefreshToken  → (token, expiresAt)
DeviceToken   → (token, platform) → push notifications
AuditLog      → (action, entity, entityId, metadata)
```

#### Perfis de Papel
```
Trainer       → (userId, cref, specialties[], rating, tenantId)
Nutritionist  → (userId, crn, specialties[], tenantId)
Student       → (userId, goals[], activityLevel, medicalHistory, points, streak, level, tenantId)
```

### ⚠️ REGRA CRÍTICA DE IDs

O banco tem **dois níveis de ID para usuários**:

| Campo | Tipo | Quando usar |
|-------|------|-------------|
| `User.id` | UUID | JWT payload (`user.id`), autenticação |
| `Student.id` | UUID | Relacionamentos (WorkoutPlan, etc.) |
| `Trainer.id` | UUID | Relacionamentos (Workout, etc.) |

- `Student.userId = User.id` (FK)  
- `Trainer.userId = User.id` (FK)  
- `WorkoutPlan.studentId = Student.id` (**NÃO** o User.id)  
- Controllers recebem `user.id` do JWT → services buscam a entidade pelo userId

**Padrão correto em service:**
```typescript
const student = await this.prisma.student.findUnique({ where: { userId } }); // userId = JWT
const plans = await this.prisma.workoutPlan.findMany({ where: { studentId: student.id } }); // student.id
```

#### Treinos
```
Workout          → (name, trainerId, status, level, duration, isTemplate)
Exercise         → (name, category, muscleGroups[], videoUrl, gifUrl, isPublic, isAIGenerated)
WorkoutExercise  → (workoutId, exerciseId, sets, reps, weight, restSeconds, isDropSet, isSuperSet, superSetGroupId)
WorkoutPlan      → (workoutId, studentId, dayOfWeek[], startDate, endDate, isActive)
WorkoutLog       → (studentId, planId, status: COMPLETED/SKIPPED/PARTIAL, feeling)
WorkoutExerciseLog → (logId, exerciseId, setNumber, reps, weight, duration)
```

**`dayOfWeek`** é array de inteiros: `0=Dom, 1=Seg, ..., 6=Sáb` (igual `Date.getDay()`)  
Array vazio `[]` = aparece todos os dias

#### Nutrição
```
FoodDatabase    → (name, calories, protein, carbs, fat, portion, barcode, isPublic)
Diet            → (name, nutritionistId, totalCalories, macros, isTemplate)
DietMeal        → (dietId, mealType, calories, macros)
MealFood        → (mealId, foodId, quantity, unit, macros)
DietPlan        → (dietId, studentId, startDate, endDate, isActive)
MealLog         → (studentId, mealType, calories, macros, photoUrl, mood)
```

#### Pagamentos e Assinatura
```
TenantSubscription → (tenantId, status, plan, billingCycle, stripeCustomerId,
                       stripeSubscriptionId, currentPeriodStart, currentPeriodEnd,
                       trialEndsAt, cancelAtPeriodEnd)
Payment            → (tenantSubscriptionId, amount, status, provider, externalId, paidAt)
TrainerPricing     → (trainerId, monthlyPrice, annualPrice, mpAccessToken)
StudentBilling     → (trainerId, studentId, status, amount, nextDueDate)
Invoice            → (billingId, status, dueDate, paidAt, mpPaymentId, pixQrCode)
```

#### Gamificação
```
Goal              → (studentId, type, targetValue, currentValue, unit, targetDate)
Challenge         → (title, type, duration, targetValue, points, price)
StudentChallenge  → (studentId, challengeId, progress, isCompleted)
Achievement       → (studentId, title, points, category)
Habit             → (studentId, name, frequency, streak)
```

#### Comunicação
```
Chat             → (type: DIRECT/GROUP, name)
ChatParticipant  → (chatId, userId, lastRead)
Message          → (chatId, senderId, content, type, fileUrl, isRead)
Notification     → (userId, type, title, body, isRead)
```

---

## 5. API — ENDPOINTS COMPLETOS

**Base URL:** `http://localhost:4000/api/v1` (dev) | `https://fitlynutri.com.br/api/v1` (prod)  
**Autenticação:** Bearer token JWT no header `Authorization`

### ⚠️ Formato padrão de resposta

**TODOS** os endpoints retornam via `TransformInterceptor`:
```json
{ "success": true, "data": <payload>, "timestamp": "2024-..." }
```

No frontend, **sempre** use `r.data.data` (não `r.data`):
```typescript
api.get('/students/me/workout-plan').then(r => r.data.data || [])
```

---

### AUTH (`/auth`)
```
POST /auth/register           → Cria user + tenant + envia para checkout
POST /auth/login              → Retorna { accessToken, refreshToken, user }
POST /auth/refresh            → { userId, refreshToken } → novo accessToken
POST /auth/logout             → Invalida refresh token
POST /auth/forgot-password    → Envia email com link de reset
POST /auth/reset-password     → Reset com token do email
GET  /auth/google             → Inicia OAuth Google
GET  /auth/google/callback    → Callback OAuth (redireciona para /dashboard)
POST /auth/invite-link        → Gera link de convite para aluno
GET  /auth/invite/validate    → Valida token do convite (público)
POST /auth/send-welcome       → Envia email de boas-vindas ao aluno
PATCH /auth/change-password   → Altera senha autenticado
GET  /auth/me                 → Dados do usuário logado
```

**JWT Payload:**
```typescript
{
  sub: string;      // User.id (UUID) — identificador principal
  email: string;
  role: UserRole;   // 'TRAINER' | 'STUDENT' | 'NUTRITIONIST' | 'ADMIN' | 'STUDIO_OWNER'
  tenantId: string; // Tenant.id (UUID)
  iat: number;
  exp: number;
}
```

### TRAINERS (`/trainers`)
```
GET    /trainers/me/dashboard       → Stats: alunos ativos, treinos, receita
GET    /trainers/me/students        → Lista alunos { id: Student.id, userId, name, ... }
POST   /trainers/me/students        → Adiciona aluno ao trainer
DELETE /trainers/me/students/:id    → Remove aluno
GET    /trainers/me/appointments    → Agendamentos
POST   /trainers/me/appointments    → Cria agendamento
GET    /trainers/me/reports         → Relatórios (query: ?days=30)
GET    /trainers/me/payments        → Resumo de pagamentos e MRR
PATCH  /trainers/me                 → Atualiza perfil do trainer
```

### STUDENTS (`/students`)
```
GET  /students/me/dashboard          → Stats do aluno
GET  /students/me/workout-plan       → Plano de treino ativo (retorna FLAT — ver seção crítica)
POST /students/me/workout-logs       → Registra treino concluído
GET  /students/me/workout-logs       → Histórico de treinos
GET  /students/me/diet               → Dieta ativa
POST /students/me/meal-logs          → Registra refeição
GET  /students/me/meal-logs/today    → Refeições de hoje
GET  /students/me/progress           → Medidas + fotos
GET  /students/me/goals              → Metas pessoais
GET  /students/me/achievements       → Conquistas/badges
GET  /students/me/challenges         → Desafios participando
GET  /students/me/contacts           → Trainer + nutricionista do aluno
```

### WORKOUTS (`/workouts`)
```
POST   /workouts                        → Cria treino (TRAINER)
GET    /workouts                        → Lista treinos do trainer
GET    /workouts/:id                    → Detalhes (estrutura NESTED: ex.exercise.name)
PUT    /workouts/:id                    → Atualiza treino
DELETE /workouts/:id                    → Remove treino
POST   /workouts/:id/assign             → Atribui treino a aluno
  Body: { studentId: Student.id, startDate, dayOfWeek: number[] }
PATCH  /workouts/plans/:planId          → Atualiza plano atribuído
DELETE /workouts/plans/:planId          → Remove plano atribuído
POST   /workouts/plans/:planId/fork     → Copia plano para personalização
```

### SUBSCRIPTIONS (`/subscriptions`)
```
GET  /subscriptions/my                  → Plano atual { plan, displayName, limits, subscription }
POST /subscriptions/checkout            → Cria checkout Mercado Pago { checkoutUrl }
     Body: { plan, cycle: 'MONTHLY'|'ANNUAL', returnUrl }
POST /subscriptions/webhook/mp          → Webhook Mercado Pago (público) → ativa plano
```

### BILLING (`/billing`) — Trainer → Aluno
```
GET  /billing/invoices                  → Faturas do aluno
POST /billing/invoices                  → Gera fatura
POST /billing/pay                       → Paga via PIX (MP)
POST /billing/webhook                   → Webhook MP student billing (público)
```

### EXERCISES (`/exercises`)
```
GET  /exercises                         → Lista exercícios (filtrado por trainer/tenant)
POST /exercises                         → Cria exercício customizado
GET  /exercises/public                  → Todos os exercícios públicos
GET  /exercises/:id                     → Detalhes do exercício
```

### AI (`/ai`) — Requer plano PRO+
```
GET  /ai/workout-suggestion/:studentId  → Sugestão de treino IA
GET  /ai/diet-suggestion/:studentId     → Sugestão de dieta IA
POST /ai/generate-workout               → Gera treino completo com IA
POST /ai/assistant                      → Chat com assistente fitness IA
POST /ai/analyze-student/:studentId     → Análise completa do aluno
POST /ai/apply-changes                  → Aplica sugestões da IA
```

### CHAT (`/chat`) — WebSocket + HTTP
```
POST /chat/direct/:targetUserId         → Inicia/obtém chat direto
GET  /chat                              → Chats do usuário
GET  /chat/unread/count                 → Mensagens não lidas
GET  /chat/:chatId/messages             → Mensagens paginadas
POST /chat/:chatId/messages             → Envia mensagem (HTTP fallback)
POST /chat/:chatId/mark-read            → Marca como lido
```

**WebSocket eventos:** `sendMessage`, `messageReceived`, `join`, `typing`

### UPLOADS (`/uploads`)
```
POST /uploads                           → Upload de arquivo (Cloudinary)
DELETE /uploads/:id                     → Remove arquivo
```

---

## 6. ⚠️ CONVENÇÕES CRÍTICAS — LEIA ANTES DE QUALQUER MUDANÇA

### 6.1 Estrutura FLAT vs NESTED de Exercícios

`GET /students/me/workout-plan` retorna exercícios **achatados** (sem nível `exercise.*`):
```typescript
// API retorna — campos diretos no objeto
{ id, name, videoUrl, gifUrl, sets, reps, weight, restSeconds, isDropSet, isSuperSet, superSetGroupId }

// ERRADO — não existe exercise aninhado aqui:
ex.exercise?.name     // undefined!
ex.exercise?.videoUrl // undefined!

// CORRETO:
ex.name
ex.videoUrl
ex.gifUrl
```

`GET /workouts/:id` (trainer) retorna estrutura **aninhada**:
```typescript
ex.exercise.name
ex.exercise.videoUrl
```

**Este erro causou bug real em 07/07/2026:** DeepSeek refatorou `getWorkoutPlan()` para retornar flat, mas `ExerciseRow` e `downloadWorkoutPDF` ainda liam estrutura aninhada → exercícios sem nome/vídeo.

### 6.2 Atribuição de Treino (Trainer → Aluno)

```typescript
// CORRETO: studentId deve ser Student.id (entidade Student), não User.id
POST /workouts/:workoutId/assign
Body: { "studentId": "<Student.id>", "startDate": "YYYY-MM-DD", "dayOfWeek": [1,3,5] }

// Endpoint /trainers/me/students retorna:
{ id: Student.id, userId: User.id, ... }
// Sempre use student.id (não student.userId) no assign
```

### 6.3 Planos de Assinatura e Bloqueio de Acesso

| Status | Comportamento no dashboard |
|--------|---------------------------|
| `FREE` | Acesso total (nunca bloqueado) |
| `TRIAL` | **Bloqueia completamente** — overlay de pagamento âmbar |
| `ACTIVE` | Acesso total |
| `PAST_DUE` | Bloqueia completamente — overlay vermelho |
| `CANCELED` | Bloqueia completamente — overlay vermelho |
| `EXPIRED` | Bloqueia completamente — overlay vermelho |

**STUDENT e ADMIN** nunca são bloqueados pelo SubscriptionGate.

**Arquivo:** `apps/web/src/components/dashboard/subscription-gate.tsx`

### 6.4 Limites de Plano

```typescript
FREE:       { maxStudents: 1,   ai: false, challenges: false, billing: false, musicPlayer: false }
BASIC:      { maxStudents: 20,  ai: false, challenges: false, billing: true,  musicPlayer: false }
PRO:        { maxStudents: 60,  ai: true,  challenges: true,  billing: true,  musicPlayer: true  }
ENTERPRISE: { maxStudents: -1,  ai: true,  challenges: true,  billing: true,  musicPlayer: true  }
```

Verificação no hook: `useSubscription().canUseFeature('ai')` → retorna `false` se TRIAL ou plano não tem a feature.

---

## 7. FRONTEND — ESTRUTURA DE PÁGINAS

**Base:** `apps/web/src/app/`

### Grupos de rotas
```
(auth)/          → Páginas públicas de autenticação
(dashboard)/     → Páginas protegidas por AuthGate + SubscriptionGate
(landing)/       → Landing pages de marketing
```

### Layout do Dashboard

```
apps/web/src/app/(dashboard)/layout.tsx
  → <AuthGate>           (verifica se logado, redireciona para /login)
      → <SubscriptionGate>  (verifica pagamento, bloqueia se TRIAL/EXPIRED/etc)
          → {children}
```

### Páginas por perfil

**TRAINER:**
```
/trainer                     → Dashboard principal
/trainer/students            → Lista de alunos
/trainer/students/[id]       → Perfil do aluno + atribuir treino
/trainer/workouts            → Biblioteca de treinos
/trainer/workouts/new        → Criar treino
/trainer/workouts/[id]       → Editar treino
/trainer/exercises           → Gerenciar exercícios
/trainer/schedule            → Calendário
/trainer/chat                → Mensagens
/trainer/billing             → Cobrança mensal
/trainer/payments            → Histórico de pagamentos + MRR
/trainer/reports             → Relatórios
/trainer/ai                  → Sugestões IA
/trainer/settings            → Perfil
/trainer/subscription        → Plano e faturamento
```

**STUDENT:**
```
/student                     → Dashboard
/student/workout             → Treino atual (execução com timer, player de música)
/student/diet                → Dieta atual
/student/goals               → Metas
/student/progress            → Medidas + fotos
/student/achievements        → Conquistas
/student/challenges          → Desafios
/student/billing             → Histórico de pagamentos
/student/profile             → Editar perfil
```

**NUTRITIONIST:**
```
/nutritionist                → Dashboard
/nutritionist/patients/[id]  → Perfil do paciente + atribuir dieta
/nutritionist/diets          → Biblioteca de dietas
/nutritionist/foods          → Banco de alimentos
/nutritionist/schedule       → Agenda de consultas
/nutritionist/ai             → Sugestões IA nutricional
```

**ADMIN:**
```
/admin                       → Analytics da plataforma
/admin/users                 → Todos os usuários
/admin/tenants               → Gerenciar tenants
/admin/subscriptions         → Visão geral de assinaturas
```

---

## 8. ESTADO GLOBAL (FRONTEND)

### Zustand Store — `apps/web/src/store/auth.ts`
```typescript
{
  user: { id, email, role, tenantId } | null,
  accessToken: string | null,
  refreshToken: string | null,
  login(user, tokens): void,
  logout(): void,     // limpa store + cookies + redireciona /login
}
```

**Persistência:** localStorage via `zustand/middleware/persist`  
**Hidratação:** componentes aguardam `hasHydrated` antes de checar auth

### React Query
- Configurado em `apps/web/src/lib/query-client.ts`
- `staleTime` padrão: 5 minutos para dados de assinatura
- Invalidação manual após mutações

### Hook Principal de Assinatura
```typescript
// apps/web/src/hooks/useSubscription.ts
const { plan, status, isBlocked, canUseFeature, limits } = useSubscription();
```

---

## 9. SISTEMA DE PAGAMENTO

### Planos e Preços

| Plano | Mensal | Anual | Max Alunos |
|-------|--------|-------|------------|
| FREE | R$0 | R$0 | 1 |
| BASIC (Starter) | R$35 | R$350 | 20 |
| PRO | R$55 | R$550 | 60 |
| ENTERPRISE (Elite) | R$95 | R$950 | Ilimitado |

### Fluxo de Registro com Pagamento
```
1. Usuário preenche formulário de registro (nome, email, senha, plano)
2. POST /auth/register → cria User + Tenant + TenantSubscription{status: TRIAL}
3. API cria checkout no Mercado Pago
4. Retorna { checkoutUrl } → frontend redireciona para MP
5. Usuário paga → MP chama webhook: POST /subscriptions/webhook/mp
6. Webhook valida pagamento, atualiza status → ACTIVE
7. Usuário pode agora acessar o dashboard
```

### Webhook Mercado Pago (Assinatura Tenant)
```
POST /api/v1/subscriptions/webhook/mp (público, sem autenticação)
Body: { data: { id: "payment_id" }, type: "payment" }

Fluxo interno:
→ Busca pagamento na API do MP usando payment_id
→ Valida status = "approved"
→ Lê external_reference = "tenantId:PLAN:CYCLE" (ex: "abc123:PRO:MONTHLY")
→ Atualiza TenantSubscription:
   { status: ACTIVE, plan: PRO, currentPeriodEnd: +1 mês }
→ Cria registro em Payment { status: PAID }
```

### Webhook Mercado Pago (Billing Trainer→Aluno)
```
POST /api/v1/billing/webhook (público)
→ Atualiza Invoice + StudentBilling status → ACTIVE/PAID
```

### Stripe (mercado internacional — menos usado)
```
POST /api/v1/payments/webhook/stripe
Eventos: checkout.session.completed, invoice.paid, invoice.payment_failed,
         customer.subscription.deleted
```

---

## 10. INFRAESTRUTURA E DEPLOY

### Produção — Oracle Cloud

| Item | Valor |
|------|-------|
| IP | 163.176.136.106 |
| SSH | `ssh -i ~/.ssh/oracle_key ubuntu@163.176.136.106` |
| Diretório | `/home/ubuntu/projeto-fiteness/` |
| SSL | Let's Encrypt (válido até 02/10/2026) |
| Deploy | Automático via Watchtower (~5 min após push) |

**Containers em produção (`docker-compose.prod.yml`):**
```
nginx       → porta 80/443 (proxy reverso + SSL + assetlinks.json)
web         → Next.js porta 3000 (interno)
api         → NestJS porta 4000 (interno)
postgres    → PostgreSQL 16 porta 5432 (interno)
redis       → Redis 7 porta 6379 (interno)
certbot     → Renovação automática SSL
watchtower  → Pull automático de novas imagens Docker
```

### CI/CD (`.github/workflows/ci.yml`)
```
Trigger: push ou PR no branch master
Jobs:
  1. test  → pnpm install → prisma generate → jest (apps/api)
  2. build → docker build api + web → push ghcr.io/{owner}/fitsaas-{api,web}:{sha,latest}
```

### Variáveis de Ambiente Necessárias

**Servidor (`.env` em `/home/ubuntu/projeto-fiteness/.env`):**
```env
# Banco
DATABASE_URL=postgresql://postgres:password123@postgres:5432/fitsaas?schema=public
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password123

# Redis
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=redis123

# JWT
JWT_SECRET=minha-chave-secreta-super-longa-aqui-123456
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=minha-chave-refresh-secreta-123456
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://fitlynutri.com.br/api/v1/auth/google/callback

# Cloudinary (upload de imagens)
CLOUDINARY_CLOUD_NAME=ddcrnfmlm
CLOUDINARY_API_KEY=381992466132183
CLOUDINARY_API_SECRET=VoB3s6THVJOO0VZ3GeA44uh_lYs

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=...

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (Resend — AINDA NÃO CONFIGURADO)
RESEND_API_KEY=

# IA
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# MuscleWiki
MUSCLEWIKI_API_KEY=mw_3TJEkjm6mfz7R0HTi1pknhp62SNu8GVnEyZv_t8zvVw

# URLs
APP_URL=https://fitlynutri.com.br
API_URL=https://fitlynutri.com.br/api/v1
FRONTEND_URL=https://fitlynutri.com.br
```

---

## 11. TRUSTED WEB ACTIVITY (TWA) — Android

**Propósito:** Empacota o web app como APK para publicação na Play Store.

```
apps/twa/
├── android/                 → Projeto Android (Gradle)
│   └── app/
│       └── release.keystore → Chave de assinatura (alias=release, senha=android)
├── twa-manifest.json        → Configuração (package, host, icons, cores)
└── generate_icons.py        → Script de geração de ícones
```

**Configuração:**
- Package ID: `com.fitlynutri.app`
- Host: `fitlynutri.com.br`
- Theme: `#7c3aed` (roxo)
- Min SDK: 21 (Android 5.0)

**Digital Asset Links:**
- SHA-256 da keystore: `88:6F:7A:63:4E:...CA:F8:65`
- Servido em: `https://fitlynutri.com.br/.well-known/assetlinks.json` (via Nginx inline)

**Build:**
```bash
cd apps/twa/android
./gradlew assembleRelease    # APK
./gradlew bundleRelease      # AAB (Play Store)
```

---

## 12. USUÁRIOS DEMO

| Perfil | Email | Senha |
|--------|-------|-------|
| Admin | admin@fitsaas.com | Admin@123 |
| Trainer | trainer@demo.com | Trainer@123 |
| Nutricionista | nutri@demo.com | Nutri@123 |
| Aluno | student@demo.com | Student@123 |

---

## 13. ARQUIVOS CRÍTICOS — ONDE ESTÁ CADA COISA

| O que | Arquivo |
|-------|---------|
| Schema do banco | `packages/database/prisma/schema.prisma` |
| Serviço de assinatura | `apps/api/src/modules/subscriptions/subscription.service.ts` |
| Webhook Mercado Pago | `apps/api/src/modules/subscriptions/subscription.controller.ts` |
| Billing trainer→aluno | `apps/api/src/modules/billing/billing.service.ts` |
| Guard de plano | `apps/api/src/modules/subscriptions/plan-feature.guard.ts` |
| Limites de plano | `apps/api/src/common/plan-limits.ts` |
| Auth JWT | `apps/api/src/modules/auth/` |
| Treinos do aluno | `apps/api/src/modules/students/students.service.ts` → `getWorkoutPlan()` |
| Treinos do trainer | `apps/api/src/modules/workouts/workouts.service.ts` |
| Gate de autenticação | `apps/web/src/components/dashboard/auth-gate.tsx` |
| Gate de assinatura | `apps/web/src/components/dashboard/subscription-gate.tsx` |
| Hook de assinatura | `apps/web/src/hooks/useSubscription.ts` |
| Store de autenticação | `apps/web/src/store/auth.ts` |
| Layout do dashboard | `apps/web/src/app/(dashboard)/layout.tsx` |
| Página de treino (aluno) | `apps/web/src/app/(dashboard)/student/workout/page.tsx` |
| Página de aluno (trainer) | `apps/web/src/app/(dashboard)/trainer/students/[id]/page.tsx` |
| Nginx produção | `infra/nginx/nginx.prod.conf` |
| CI/CD | `.github/workflows/ci.yml` |
| Convenções (CLAUDE.md) | `CLAUDE.md` |

---

## 14. HISTÓRICO DE BUGS CONHECIDOS E CORREÇÕES

| Data | Bug | Causa | Correção |
|------|-----|-------|----------|
| — | CI falhava | `dietCompliance` não existe no schema | Removido de `nutritionists.service.ts` |
| — | assetlinks.json não funcionava | Next.js standalone não servia `.well-known` | Movido para Nginx inline |
| — | Containers parados em produção | `.env` perdido ao recriar volumes | Recriado manualmente + certbot reemitido |
| — | Login "credenciais inválidas" | Banco vazio após volumes recriados | Seed rodado via Node no container |
| — | Vídeos MuscleWiki não carregavam no mobile | CORS em URL externa | Proxy `/api/v1/musclewiki/stream/` criado |
| 07/07/2026 | Exercícios sem nome/vídeo no treino do aluno | `getWorkoutPlan()` retorna flat, mas `ExerciseRow` e `downloadWorkoutPDF` liam `ex.exercise?.name` | Corrigido para `ex.name`, `ex.videoUrl` |
| 07/07/2026 | Não aparecia "nenhum treino para hoje" | Sem estado para planos existentes mas não do dia atual | Adicionado estado com lista de todos os planos e labels de dia |
| 08/07/2026 | TRIAL liberava dashboard inteiro | `SubscriptionGate` renderizava children para TRIAL | TRIAL agora usa `ExpiredOverlay` com bloqueio total + cores âmbar |

---

## 15. REGRAS DE DESENVOLVIMENTO

1. **Nunca commitar/pushar sem permissão explícita do usuário**
2. Não inventar endpoints — verificar controller/service antes de usar
3. Ao editar a API, verificar se o frontend espera flat ou nested response
4. Ao adicionar campo no Prisma schema → rodar `prisma migrate dev` antes de usar
5. Testes de UI: iniciar dev server e verificar na tela antes de declarar pronto
6. Produção fica na Oracle Cloud — sempre confirmar antes de comandos destrutivos
7. O app mobile (`apps/mobile/`) está **descontinuado** — não mexer
8. Não adicionar features além do solicitado — keep it simple

---

## 16. COMO TRABALHAR COM CLAUDE (CLAUDE.AI/CODE)

Quando o DeepSeek fizer algo que quebre o projeto, o usuário pode pedir para Claude reverter dizendo a palavra-chave:

### Palavra-chave: **PAGAMENTO-BLOQUEADO**

Isso significa: `git reset --hard 7b201ebb`

Este é o estado do projeto em 08/07/2026 com as seguintes features funcionando:
- ✅ Login/registro com Google OAuth e email/senha
- ✅ Dashboard do trainer (alunos, treinos, relatórios, billing)
- ✅ Dashboard do aluno (treino, dieta, progresso, metas, conquistas)
- ✅ Dashboard do nutricionista
- ✅ Sistema de assinatura com Mercado Pago (webhook funcional)
- ✅ Bloqueio correto por status de assinatura (TRIAL bloqueia dashboard)
- ✅ Player de música YouTube no treino do aluno
- ✅ Tipos de série (Bi-Set, Super-Set, Drop-Set)
- ✅ Chat em tempo real
- ✅ TWA Android (APK gerado, assetlinks.json funcionando)
- ✅ Deploy automático via GitHub Actions + Watchtower
- ⚠️ Emails não configurados (RESEND_API_KEY vazio)
