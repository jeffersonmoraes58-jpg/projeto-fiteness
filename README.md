# FitSaaS — Plataforma SaaS Fitness Completa

> Plataforma enterprise para Personal Trainers, Nutricionistas e Academias com IA integrada, white-label e multi-tenant.

---

## Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| **Frontend Web** | Next.js 14, React 18, TailwindCSS, Shadcn/UI, Framer Motion |
| **Mobile** | React Native + Expo (iOS & Android) |
| **Backend** | Node.js, NestJS 10 |
| **Banco de Dados** | PostgreSQL 16 + Prisma ORM |
| **Cache / Filas** | Redis + Bull |
| **Auth** | JWT + Refresh Token + OAuth Google |
| **Uploads** | Cloudinary / AWS S3 |
| **Tempo Real** | Socket.io |
| **Notificações** | Firebase Push Notification |
| **Pagamentos** | Stripe + Mercado Pago |
| **IA** | OpenAI GPT-4o |
| **Infra** | Docker, Nginx, Vercel, AWS |
| **Monorepo** | Turborepo + pnpm workspaces |

---

## Estrutura do Projeto

```
fitsaas/
├── apps/
│   ├── api/              # NestJS Backend
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── auth/          # JWT + Google OAuth
│   │       │   ├── users/         # Gestão de usuários
│   │       │   ├── trainers/      # Personal trainers
│   │       │   ├── nutritionists/ # Nutricionistas
│   │       │   ├── students/      # Alunos
│   │       │   ├── workouts/      # Treinos
│   │       │   ├── exercises/     # Biblioteca de exercícios
│   │       │   ├── diets/         # Dietas
│   │       │   ├── meals/         # Refeições
│   │       │   ├── chat/          # Chat + WebSocket
│   │       │   ├── notifications/ # Push + In-app
│   │       │   ├── payments/      # Stripe + MP
│   │       │   ├── progress/      # Evolução
│   │       │   ├── goals/         # Metas
│   │       │   ├── challenges/    # Desafios
│   │       │   ├── ai/            # OpenAI integração
│   │       │   ├── admin/         # Painel admin
│   │       │   └── tenants/       # Multi-tenant
│   │       ├── decorators/
│   │       ├── filters/
│   │       ├── guards/
│   │       └── interceptors/
│   ├── web/              # Next.js Frontend
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (auth)/        # Login, Register
│   │       │   ├── (dashboard)/
│   │       │   │   ├── trainer/   # Painel Personal
│   │       │   │   ├── nutritionist/ # Painel Nutricionista
│   │       │   │   ├── student/   # Área do Aluno
│   │       │   │   └── admin/     # Painel Admin SaaS
│   │       │   └── page.tsx       # Landing page
│   │       ├── components/
│   │       │   ├── landing/       # Seções da landing
│   │       │   ├── dashboard/     # Layout do painel
│   │       │   ├── ui/            # Componentes base
│   │       │   └── providers/     # Context providers
│   │       ├── hooks/             # Custom hooks
│   │       ├── lib/               # API client, utils
│   │       ├── store/             # Zustand stores
│   │       └── types/             # TypeScript types
│   └── mobile/           # React Native Expo
│       └── src/
│           ├── screens/
│           │   ├── auth/          # Login, Cadastro
│           │   ├── student/       # Telas do aluno
│           │   ├── trainer/       # Telas do personal
│           │   └── nutritionist/  # Telas do nutricionista
│           ├── components/        # Componentes compartilhados
│           ├── hooks/             # Custom hooks
│           ├── store/             # Zustand stores
│           └── services/          # API services
├── packages/
│   ├── database/         # Prisma Schema + Client
│   └── shared/           # Tipos e utils compartilhados
├── infra/
│   ├── docker/           # Configurações Docker
│   └── nginx/            # Nginx reverse proxy
├── docker-compose.yml
├── turbo.json
└── .env.example
```

---

## Setup Rápido

### Pré-requisitos
- Node.js 20+
- pnpm 9+
- Docker + Docker Compose
- PostgreSQL 16 (via Docker)

### 1. Clone e instale

```bash
git clone https://github.com/seu-usuario/fitsaas.git
cd fitsaas
pnpm install
```

### 2. Configure variáveis de ambiente

```bash
cp .env.example .env
# Edite o .env com suas credenciais
```

### 3. Suba os serviços com Docker

```bash
docker-compose up -d postgres redis
```

### 4. Configure o banco de dados

```bash
pnpm db:generate   # Gera o Prisma Client
pnpm db:migrate    # Roda as migrations
pnpm db:seed       # Popula dados iniciais (opcional)
```

### 5. Inicie o desenvolvimento

```bash
# Tudo junto (API + Web)
pnpm dev

# Ou individualmente:
pnpm --filter api dev      # API em :4000
pnpm --filter web dev      # Web em :3000
pnpm --filter fitsaas-mobile start  # Mobile com Expo
```

### 6. Docker completo (produção)

```bash
docker-compose up -d
# Web: http://localhost
# API: http://localhost/api/v1
# Docs: http://localhost/api/docs
```

---

## Módulos e Funcionalidades

### Personal Trainer
- Cadastro e gestão de alunos
- Anamnese completa
- Montagem de treinos (divisão ABCDE)
- Biblioteca de exercícios com vídeos/GIFs
- Atribuição de treinos por dia da semana
- Evolução de cargas e histórico
- Agenda de sessões
- Chat integrado
- Avaliação física completa
- Fotos de evolução
- Controle financeiro + mensalidades
- Relatórios e gráficos

### Nutricionista
- Cadastro de pacientes
- Avaliação nutricional completa
- Cálculo automático de IMC, TMB, GET
- Planejamento alimentar por refeição
- Banco de alimentos com macros
- Cálculo automático de macronutrientes
- Lista de compras automática
- Diário alimentar do paciente
- Controle hídrico
- Upload de exames laboratoriais

### Aluno / Paciente
- Dashboard moderno com gamificação
- Treino do dia em tempo real
- Dieta do dia com tracking
- Check-in de treino com timer
- Registro de refeições e fotos
- Controle de água
- Evolução: peso, medidas, fotos
- Histórico completo
- Chat com profissional
- Sistema de pontos e medals
- Desafios semanais
- Ranking entre alunos

### IA (OpenAI GPT-4o)
- Sugestão automática de treinos baseada no perfil
- Sugestão de dieta personalizada
- Cálculo inteligente de macros
- Exercícios alternativos
- Assistente fitness conversacional
- Análise de fotos de progresso
- Mensagens motivacionais personalizadas

### White-label
- Logo personalizado por tenant
- Paleta de cores configurável
- Domínio próprio
- Nome do app customizado
- Splash screen personalizada

### Admin SaaS
- Gestão de todos os tenants
- Planos e assinaturas
- Trial de 14 dias automático
- Cupons de desconto
- Analytics em tempo real
- Controle financeiro
- Logs do sistema
- Monitoramento de saúde

---

## API REST

Documentação disponível em `http://localhost:4000/api/docs` (Swagger UI).

### Endpoints principais

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
GET    /api/v1/auth/google

GET    /api/v1/trainers/students
POST   /api/v1/workouts
POST   /api/v1/workouts/:id/assign

GET    /api/v1/nutritionists/patients
POST   /api/v1/diets
POST   /api/v1/diets/:id/assign

GET    /api/v1/students/today-workout
GET    /api/v1/students/today-diet
POST   /api/v1/workouts/log

POST   /api/v1/chat/direct/:userId
GET    /api/v1/chat/:chatId/messages

POST   /api/v1/ai/workout-suggestion/:studentId
POST   /api/v1/ai/diet-suggestion/:studentId
POST   /api/v1/ai/assistant

POST   /api/v1/payments/checkout
POST   /api/v1/payments/webhook/stripe

GET    /api/v1/admin/tenants
GET    /api/v1/admin/analytics
```

---

## Variáveis de Ambiente

Veja o arquivo `.env.example` para todas as variáveis necessárias. Principais:

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Connection string PostgreSQL |
| `JWT_SECRET` | Chave para assinar tokens |
| `OPENAI_API_KEY` | Chave da API OpenAI |
| `STRIPE_SECRET_KEY` | Chave secreta Stripe |
| `CLOUDINARY_*` | Credenciais Cloudinary |
| `FIREBASE_*` | Credenciais Firebase |
| `GOOGLE_CLIENT_*` | Credenciais OAuth Google |

---

## Segurança

- JWT + Refresh Token rotation
- RBAC com guard por role
- Rate limiting (Throttler)
- Helmet (security headers)
- CORS configurado
- Validação de DTOs (class-validator)
- Proteção contra SQL injection (Prisma)
- Audit logs completos
- Criptografia bcrypt 12 rounds

---

## Deploy

### Vercel (Frontend)
```bash
vercel deploy --prod
```

### AWS ECS (Backend + DB)
```bash
# Build imagens Docker e push para ECR
# Deploy via ECS com Fargate
```

### Variáveis necessárias em produção
Todas as variáveis do `.env.example` devem ser configuradas no ambiente de produção.

---

## Licença

MIT © 2025 FitSaaS
