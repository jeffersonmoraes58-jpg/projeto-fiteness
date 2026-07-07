# FitlyNutri — Guia de Desenvolvimento

Monorepo NestJS + Next.js 14 para plataforma SaaS de fitness.

## Estrutura

```
apps/
  api/     # NestJS — porta 3001
  web/     # Next.js 14 App Router — porta 3000
  twa/     # Trusted Web Activity (Android/Play Store)
packages/
  database/ # Prisma schema + client
  shared/   # Tipos compartilhados
  ui/       # Componentes reutilizáveis
```

## Convenções Críticas

### IDs — Dois tipos, não confunda

O banco tem dois níveis de ID para usuários:

| Campo | Tipo | Quando usar |
|-------|------|-------------|
| `User.id` | UUID | JWT payload (`user.id`), autenticação |
| `Student.id` | UUID | Relacionamentos (WorkoutPlan, etc.) |
| `Trainer.id` | UUID | Relacionamentos (Workout, etc.) |

- `Student.userId = User.id` (FK)
- `Trainer.userId = User.id` (FK)
- **WorkoutPlan.studentId** = `Student.id` (NÃO o User.id)
- Controllers recebem `user.id` do JWT → services buscam a entidade pelo userId

Exemplo correto em service:
```typescript
const student = await this.prisma.student.findUnique({ where: { userId } }); // userId = JWT
const plans = await this.prisma.workoutPlan.findMany({ where: { studentId: student.id } }); // student.id
```

### Formato de Resposta da API

Todos os endpoints são envolvidos pelo `TransformInterceptor`:
```json
{ "success": true, "data": <payload>, "timestamp": "2024-..." }
```

No frontend, **sempre** usar `r.data.data`:
```typescript
api.get('/students/me/workout-plan').then(r => r.data.data || [])
```

### Estrutura de Exercícios — Flat vs Nested

`GET /students/me/workout-plan` retorna exercícios **achatados** (sem nível `exercise.*`):
```typescript
// API retorna — campos diretos no objeto
{ id, name, videoUrl, gifUrl, sets, reps, weight, restSeconds, isDropSet, isSuperSet, superSetGroupId }

// ERRADO — não existe exercise aninhado aqui:
ex.exercise?.name    // undefined!
ex.exercise?.videoUrl // undefined!

// CORRETO:
ex.name
ex.videoUrl
ex.gifUrl
```

`GET /workouts/:id` (trainer) retorna estrutura aninhada:
```typescript
ex.exercise.name
ex.exercise.videoUrl
```

### Atribuição de Treino (Trainer → Aluno)

Fluxo: `POST /workouts/:workoutId/assign` com body:
```json
{ "studentId": "<Student.id>", "startDate": "YYYY-MM-DD", "dayOfWeek": [1,3,5] }
```

- `studentId` deve ser o `Student.id` (entidade Student), não `User.id`
- O endpoint `/trainers/me/students` retorna `{ id: Student.id, userId: User.id, ... }`
- Sempre use `student.id` (não `student.userId`) no assign

### Filtro de Dia da Semana

`WorkoutPlan.dayOfWeek` é um array de inteiros: `0=Dom, 1=Seg, ..., 6=Sáb` (igual `Date.getDay()`).

- Array vazio `[]` = treino aparece todos os dias
- `[1,3,5]` = Seg, Qua, Sex

A página do aluno (`/student/workout`) filtra planos pelo dia atual. Quando não há planos para hoje mas há planos atribuídos, exibe aviso "Nenhum treino para hoje" + lista todos os planos com labels de dia.

## Módulos da API

| Módulo | Arquivo | Responsabilidade |
|--------|---------|-----------------|
| students | `students.service.ts` | Aluno busca/registra seus dados |
| workouts | `workouts.service.ts` | CRUD treinos + atribuição a alunos |
| trainers | `trainers.service.ts` | Dashboard/lista de alunos do trainer |
| exercises | — | Banco de exercícios |
| notifications | — | Push notifications |
| auth | — | JWT + Google OAuth |

## Páginas do Frontend (web)

| Rota | Arquivo | Para quem |
|------|---------|-----------|
| `/student/workout` | `student/workout/page.tsx` | Aluno visualiza/executa treinos |
| `/trainer/students/[id]` | `trainer/students/[id]/page.tsx` | Trainer vê perfil + atribui treinos |
| `/trainer/workouts/[id]` | `trainer/workouts/[id]/page.tsx` | Trainer edita treino + atribui |

## Infraestrutura

- **Produção**: Oracle Cloud (sempre confirmar antes de comandos destrutivos)
- **Banco**: PostgreSQL via Docker em produção
- **Deploy**: GitHub Actions CI/CD → Oracle Cloud
- **NUNCA commitar/pushar** sem permissão explícita do usuário

## Regras de Desenvolvimento

1. Não fazer commit ou push automaticamente — perguntar sempre
2. Não inventar endpoints — verificar controller/service antes
3. Ao editar a API, verificar se o frontend espera flat ou nested response
4. Ao adicionar campo no Prisma schema → rodar `prisma migrate dev` antes de usar
5. Testes de UI: iniciar o dev server e verificar na tela antes de declarar pronto
