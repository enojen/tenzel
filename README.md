# 🏗️ Modular Monolith Starter

A production-ready **Modular Monolith** boilerplate with **Domain-Driven Design** principles, built with modern TypeScript tooling.

[![Bun](https://img.shields.io/badge/Bun-1.1+-black?logo=bun)](https://bun.sh)
[![Elysia](https://img.shields.io/badge/Elysia-1.2+-blue)](https://elysiajs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue?logo=typescript)](https://www.typescriptlang.org)
[![Drizzle](https://img.shields.io/badge/Drizzle_ORM-0.36+-green)](https://orm.drizzle.team)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-blue?logo=postgresql)](https://www.postgresql.org)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Core Concepts](#-core-concepts)
  - [Single Source of Truth (Zod)](#1-single-source-of-truth-zod)
  - [Request-Scoped i18n](#2-request-scoped-i18n)
  - [Unified Exception Handling](#3-unified-exception-handling)
  - [Layer Separation](#4-layer-separation)
  - [Response Mapping (DTO Layer)](#5-response-mapping-dto-layer)
  - [OpenAPI Integration](#6-openapi-integration)
- [Module Structure](#-module-structure)
- [Configuration](#-configuration)
- [Database](#-database)
- [Testing](#-testing)
- [Observability](#-observability)
- [Docker](#-docker)
- [API Documentation](#-api-documentation)
- [Best Practices](#-best-practices)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

This boilerplate provides a solid foundation for building **scalable backend applications** using the Modular Monolith architecture pattern. It combines the simplicity of a monolith with the modularity benefits of microservices.

### Why Modular Monolith?

| Approach                 | Pros                               | Cons                                     |
| ------------------------ | ---------------------------------- | ---------------------------------------- |
| **Traditional Monolith** | Simple deployment, easy debugging  | Tight coupling, hard to scale teams      |
| **Microservices**        | Independent scaling, team autonomy | Operational complexity, network overhead |
| **Modular Monolith** ✅  | Best of both worlds                | Requires discipline                      |

A Modular Monolith gives you:

- 🧩 **Clear module boundaries** - Each module is self-contained
- 🚀 **Single deployment** - No distributed system complexity
- 📦 **Easy extraction** - Modules can become microservices later
- 🔒 **Type safety** - End-to-end TypeScript with Zod validation

---

## 🛠 Tech Stack

| Category          | Technology                          | Why?                                         |
| ----------------- | ----------------------------------- | -------------------------------------------- |
| **Runtime**       | [Bun](https://bun.sh)               | 3x faster than Node.js, built-in TypeScript  |
| **Framework**     | [Elysia](https://elysiajs.com)      | Type-safe, OpenAPI native, excellent DX      |
| **ORM**           | [Drizzle](https://orm.drizzle.team) | Type-safe SQL, lightweight, great migrations |
| **Validation**    | [Zod](https://zod.dev)              | Runtime validation + TypeScript inference    |
| **Database**      | PostgreSQL 16+                      | Robust, scalable, great JSON support         |
| **Logging**       | [Pino](https://getpino.io)          | Fastest Node.js logger, JSON structured      |
| **Tracing**       | OpenTelemetry                       | Industry standard observability              |
| **Documentation** | OpenAPI 3.0                         | Auto-generated from Zod schemas              |

---

## 🏛 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MODULAR MONOLITH                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │    User     │  │    Order    │  │   Payment   │  Modules    │
│  │   Module    │  │   Module    │  │   Module    │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          │                                      │
│                    ┌─────▼─────┐                                │
│                    │  Shared   │  Cross-cutting concerns        │
│                    │  Kernel   │  (exceptions, i18n, logging)   │
│                    └─────┬─────┘                                │
│                          │                                      │
│  ┌───────────────────────┴───────────────────────┐             │
│  │              Infrastructure                    │             │
│  │  (Database, Cache, Message Bus, External APIs) │             │
│  └────────────────────────────────────────────────┘             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Module Communication

Modules communicate through:

1. **Direct imports** - For queries (read operations)
2. **Event Bus** - For commands (write operations, async)
3. **Shared Kernel** - For common domain concepts

---

## 📁 Project Structure

```
├── src/
│   ├── app.ts                      # Elysia app factory
│   ├── bootstrap.ts                # Application entry point
│   │
│   ├── config/                     # ⚙️ Configuration
│   │   ├── index.ts                # Config singleton
│   │   └── schema.ts               # Zod env validation
│   │
│   ├── shared/                     # 🔄 Shared Kernel
│   │   ├── domain/                 # Base entities, value objects
│   │   │   ├── base.entity.ts
│   │   │   ├── aggregate-root.ts
│   │   │   └── value-objects/
│   │   │
│   │   ├── exceptions/             # 🚨 Exception handling
│   │   │   ├── index.ts            # Barrel export
│   │   │   ├── base.exception.ts   # Base class (no i18n in constructor)
│   │   │   ├── http.exception.ts   # HTTP exceptions
│   │   │   └── exception-handler.ts # Elysia error handler
│   │   │
│   │   ├── i18n/                   # 🌐 Internationalization
│   │   │   ├── index.ts            # Stateless translate function
│   │   │   └── locales/
│   │   │       ├── en.json
│   │   │       └── tr.json
│   │   │
│   │   ├── infrastructure/
│   │   │   └── database/
│   │   │       └── drizzle.ts      # Database client
│   │   │
│   │   ├── logging/
│   │   │   └── logger.ts           # Pino logger
│   │   │
│   │   ├── observability/          # 📊 OpenTelemetry (Day 2+)
│   │   │   └── tracing.ts
│   │   │
│   │   └── openapi/
│   │       └── zod-openapi.ts      # Zod OpenAPI extension
│   │
│   └── modules/                    # 📦 Feature Modules
│       └── user/
│           ├── index.ts            # Module barrel export
│           ├── user.module.ts      # Module definition
│           │
│           ├── domain/             # 💎 Domain Layer
│           │   ├── entities/
│           │   ├── value-objects/
│           │   ├── events/
│           │   └── repositories/   # Interfaces only
│           │
│           ├── application/        # 🎯 Application Layer
│           │   ├── commands/
│           │   ├── queries/
│           │   └── dto/
│           │       └── user.mapper.ts  # DB model → API DTO transformation
│           │
│           ├── infrastructure/     # 🔧 Infrastructure Layer
│           │   └── persistence/
│           │       ├── user.table.ts       # Drizzle table definition
│           │       ├── user.db-schemas.ts  # drizzle-zod schemas
│           │       └── user.repository.ts  # Repository implementation
│           │
│           ├── api/                # 🌐 API Layer
│           │   ├── user.controller.ts      # Elysia routes
│           │   └── user.schemas.ts         # API Zod schemas
│           │
│           └── exceptions/
│               └── user.exceptions.ts      # Module-specific exceptions
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── drizzle/
│   └── migrations/
│
├── drizzle.config.ts
├── package.json
├── tsconfig.json
└── .env.example
```

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) 1.1+
- [PostgreSQL](https://www.postgresql.org) 16+
- [Docker](https://www.docker.com) (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/modular-monolith-starter.git
cd modular-monolith-starter

# Install dependencies
bun install

# Copy environment variables
cp .env.example .env

# Start PostgreSQL (Docker)
docker compose up -d db

# Run database migrations
bun run db:migrate

# Start development server
bun run dev
```

### Available Scripts

| Script                | Description                              |
| --------------------- | ---------------------------------------- |
| `bun run dev`         | Start development server with hot reload |
| `bun run build`       | Build for production                     |
| `bun run start`       | Start production server                  |
| `bun run test`        | Run tests                                |
| `bun run test:watch`  | Run tests in watch mode                  |
| `bun run db:generate` | Generate migration files                 |
| `bun run db:migrate`  | Apply migrations                         |
| `bun run db:push`     | Push schema changes (dev only)           |
| `bun run db:studio`   | Open Drizzle Studio                      |
| `bun run typecheck`   | Run TypeScript type checking             |
| `bun run lint`        | Run ESLint                               |

---

## 🧠 Core Concepts

### 1. Single Source of Truth (Zod)

All validation and type definitions flow from **Zod schemas**. This eliminates duplication and ensures consistency across your entire application.

```
┌─────────────────────────────────────────────────────────────┐
│                  SCHEMA FLOW (Single Source)                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Drizzle Table  ──────▶  drizzle-zod  ──────▶  DB Types    │
│  (user.table.ts)        (user.db-schemas.ts)               │
│                                                             │
│  Zod Schema  ──────▶  TypeScript Type  ──────▶  OpenAPI    │
│  (user.schemas.ts)    (inferred)              (generated)  │
│                                                             │
│  ❌ NO Elysia t.Object() duplication                       │
│  ❌ NO manual type definitions                             │
│  ✅ Types are ALWAYS in sync                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Example: API Schema Definition

```typescript
// src/modules/user/api/user.schemas.ts
import { z } from '@/shared/openapi/zod-openapi';

export const createUserRequestSchema = z
  .object({
    email: z.string().email('Invalid email format').openapi({
      description: 'User email address',
      example: 'user@example.com',
    }),
    name: z.string().min(2).max(100).openapi({
      description: 'User display name',
      example: 'John Doe',
    }),
    password: z.string().min(8).openapi({
      description: 'User password (min 8 characters)',
    }),
  })
  .openapi('CreateUserRequest');

// Types are automatically inferred
export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;
```

#### Example: Controller with Zod Validation

```typescript
// src/modules/user/api/user.controller.ts
import { generateSchema } from '@anatine/zod-openapi';

.post(
  '/',
  async ({ body }): Promise<UserResponse> => {
    // Zod validation - throws ZodError if invalid
    const validated = createUserRequestSchema.parse(body);

    // `validated` is fully typed as CreateUserRequest
    return userService.create(validated);
  },
  {
    // OpenAPI gets full schema from Zod
    body: generateSchema(createUserRequestSchema),
    response: { 200: generateSchema(userResponseSchema) },
    detail: {
      summary: 'Create a new user',
      tags: ['Users'],
    },
  }
)
```

---

### 2. Request-Scoped i18n

Internationalization is **stateless** and **request-scoped** to prevent race conditions in concurrent requests.

#### ❌ Anti-Pattern (Global State)

```typescript
// DON'T DO THIS - Race condition!
class I18n {
  private currentLocale: Locale = 'en';

  setLocale(locale: Locale) {
    this.currentLocale = locale; // Shared across all requests!
  }

  t(key: string) {
    return translations[this.currentLocale][key];
  }
}
```

#### ✅ Correct Pattern (Stateless)

```typescript
// src/shared/i18n/index.ts

// Pure function - locale passed as parameter
export function t(
  key: TranslationKey,
  params?: Record<string, string | number>,
  locale: Locale = 'en',
): string {
  const translations = locales[locale];
  // ... lookup and interpolate
  return translatedString;
}

// Extract locale from request header
export function parseLocaleFromHeader(acceptLanguage?: string): Locale {
  const lang = acceptLanguage?.split(',')[0]?.split('-')[0]?.toLowerCase();
  return lang === 'tr' ? 'tr' : 'en';
}
```

#### Usage in Exception Handler

```typescript
// src/shared/exceptions/exception-handler.ts

export const exceptionHandler = new Elysia()
  // Derive locale from request - stored in context
  .derive(({ headers }) => ({
    locale: parseLocaleFromHeader(headers['accept-language']),
  }))

  .onError(({ error, set, locale }) => {
    if (error instanceof BaseException) {
      // Translate at request time with request's locale
      const message = t(error.messageKey, error.messageParams, locale);

      set.status = error.statusCode;
      return {
        error: {
          code: error.code,
          message, // Localized for THIS request
          timestamp: error.timestamp.toISOString(),
        },
      };
    }
  });
```

---

### 3. Unified Exception Handling

All exceptions extend `BaseException` and store **translation keys**, not translated messages. Translation happens at the **edge** (in the error handler).

#### Exception Class

```typescript
// src/shared/exceptions/base.exception.ts

export abstract class BaseException extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly messageKey: TranslationKey; // NOT translated message
  public readonly messageParams?: Record<string, string | number>;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(options: ExceptionOptions) {
    super(options.messageKey); // Temporary, will be localized in handler
    // ... store all fields
  }
}
```

#### Module-Specific Exceptions

```typescript
// src/modules/user/exceptions/user.exceptions.ts

export class UserNotFoundException extends NotFoundException {
  constructor(userId?: number | string) {
    super('errors.user.not_found', userId ? { id: String(userId) } : undefined);
  }
}

export class UserAlreadyExistsException extends ConflictException {
  constructor(email: string) {
    super('errors.user.already_exists', { email });
  }
}
```

#### Throwing Exceptions

```typescript
// In your service or controller
if (!user) {
  throw new UserNotFoundException(userId);
}

// Error response (with Accept-Language: tr):
// {
//   "error": {
//     "code": "NOT_FOUND",
//     "message": "Kullanıcı bulunamadı",
//     "timestamp": "2025-01-15T10:30:00.000Z"
//   }
// }
```

---

### 4. Layer Separation

Each module follows **Clean Architecture** principles with clear layer boundaries.

```
┌─────────────────────────────────────────────────────────────┐
│                      MODULE LAYERS                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    API Layer                         │   │
│  │  • Controllers (Elysia routes)                       │   │
│  │  • Request/Response Zod schemas                      │   │
│  │  • OpenAPI documentation                             │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │ calls                             │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │               Application Layer                      │   │
│  │  • Commands & Queries (CQRS)                         │   │
│  │  • Use Cases / Handlers                              │   │
│  │  • DTOs & Mappers                                    │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │ uses                              │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │                 Domain Layer                         │   │
│  │  • Entities & Aggregate Roots                        │   │
│  │  • Value Objects                                     │   │
│  │  • Domain Events                                     │   │
│  │  • Repository Interfaces                             │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │ implemented by                    │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │             Infrastructure Layer                     │   │
│  │  • Repository Implementations                        │   │
│  │  • Drizzle Table Definitions                         │   │
│  │  • External Service Clients                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### File Separation

| File                 | Layer          | Contains                                  |
| -------------------- | -------------- | ----------------------------------------- |
| `user.table.ts`      | Infrastructure | Drizzle `pgTable` definition only         |
| `user.db-schemas.ts` | Infrastructure | `drizzle-zod` generated schemas           |
| `user.schemas.ts`    | API            | Request/Response Zod schemas with OpenAPI |
| `user.controller.ts` | API            | Elysia routes                             |
| `user.mapper.ts`     | Application    | DB model → API DTO transformation         |
| `user.repository.ts` | Infrastructure | Repository implementation                 |
| `user.entity.ts`     | Domain         | Domain entity with business logic         |

---

### 5. Response Mapping (DTO Layer)

Controllers should **never** return raw database models or inline objects. Instead, use **mappers** to transform data between layers.

#### Why Mappers?

| Without Mapper ❌           | With Mapper ✅            |
| --------------------------- | ------------------------- |
| DB schema changes break API | API contract stays stable |
| Dates leak as Date objects  | Dates always ISO strings  |
| Internal fields exposed     | Only DTO fields returned  |
| No runtime validation       | Zod validates output      |

#### Mapper Implementation

```typescript
// src/modules/user/application/dto/user.mapper.ts
import type { DbUser } from '../../infrastructure/persistence/user.db-schemas';
import { userResponseSchema, type UserResponse } from '../../api/user.schemas';

export const userMapper = {
  /**
   * Transforms database model to API response DTO.
   * - Converts Date objects to ISO strings
   * - Validates output against Zod schema (runtime safety)
   * - Excludes internal fields (passwordHash, deletedAt, etc.)
   */
  toResponse(dbUser: DbUser): UserResponse {
    const dto: UserResponse = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      status: dbUser.status,
      isEmailVerified: dbUser.isEmailVerified,
      lastLoginAt: dbUser.lastLoginAt?.toISOString() ?? null,
      createdAt: dbUser.createdAt.toISOString(),
      updatedAt: dbUser.updatedAt.toISOString(),
    };

    // Runtime validation: ensures DB→API transformation is correct
    return userResponseSchema.parse(dto);
  },

  toResponseList(dbUsers: DbUser[]): UserResponse[] {
    return dbUsers.map((u) => this.toResponse(u));
  },
};
```

#### Service Layer

```typescript
// src/modules/user/application/commands/create-user.handler.ts
import { userMapper } from '../dto/user.mapper';
import type { CreateUserRequest, UserResponse } from '../../api/user.schemas';
import { UserAlreadyExistsException } from '../../exceptions/user.exceptions';

interface CreateUserDeps {
  userRepo: UserRepository;
  passwordHasher: PasswordHasher;
}

export async function createUser(
  input: CreateUserRequest,
  deps: CreateUserDeps,
): Promise<UserResponse> {
  // 1. Business logic
  const exists = await deps.userRepo.findByEmail(input.email);
  if (exists) {
    throw new UserAlreadyExistsException(input.email);
  }

  // 2. Create entity
  const passwordHash = await deps.passwordHasher.hash(input.password);
  const dbUser = await deps.userRepo.create({
    email: input.email,
    name: input.name,
    role: input.role ?? 'user',
    passwordHash,
  });

  // 3. Map to response DTO
  return userMapper.toResponse(dbUser);
}
```

#### Controller (Clean)

```typescript
// src/modules/user/api/user.controller.ts
.post(
  '/',
  async ({ body }): Promise<UserResponse> => {
    const validated = createUserRequestSchema.parse(body);

    // Controller does NOT build response object
    // Just validates input and delegates to service
    return createUser(validated, deps);
  },
  {
    body: generateSchema(createUserRequestSchema),
    response: { 200: generateSchema(userResponseSchema) },
    detail: { summary: 'Create a new user', tags: ['Users'] },
  }
)
```

#### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     REQUEST → RESPONSE FLOW                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  HTTP Request Body                                              │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────┐                                           │
│  │ Zod Validation  │  createUserRequestSchema.parse(body)      │
│  │ (API Schema)    │                                           │
│  └────────┬────────┘                                           │
│           │ CreateUserRequest (typed)                          │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │    Service      │  Business logic, repository calls         │
│  │    (Handler)    │                                           │
│  └────────┬────────┘                                           │
│           │ DbUser (from database)                             │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │     Mapper      │  userMapper.toResponse(dbUser)            │
│  │   (DTO Layer)   │  - Date → ISO string                      │
│  └────────┬────────┘  - Zod validation on output               │
│           │ UserResponse (validated DTO)                       │
│           ▼                                                     │
│  HTTP Response JSON                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

> **Key Insight**: The mapper calls `userResponseSchema.parse()` on its output. This means if your DB model ever drifts from your API contract, you'll get a **runtime error** instead of silently returning invalid data.

---

### 6. OpenAPI Integration

OpenAPI documentation is **generated from Zod schemas** using `@anatine/zod-openapi`.

#### Setup

```typescript
// src/shared/openapi/zod-openapi.ts
import { extendZodWithOpenApi } from '@anatine/zod-openapi';
import { z } from 'zod';

// Extend Zod with .openapi() method
extendZodWithOpenApi(z);

export { z };
```

#### Schema with OpenAPI Metadata

```typescript
// Use the extended z from our setup
import { z } from '@/shared/openapi/zod-openapi';

export const userResponseSchema = z
  .object({
    id: z.number().openapi({ example: 1 }),
    email: z.string().openapi({ example: 'user@example.com' }),
    name: z.string().openapi({ example: 'John Doe' }),
    createdAt: z.string().datetime().openapi({
      description: 'Creation timestamp (ISO 8601)',
      example: '2025-01-01T00:00:00.000Z',
    }),
  })
  .openapi('UserResponse');
```

#### Route with OpenAPI

```typescript
import { generateSchema } from '@anatine/zod-openapi';

.get(
  '/:id',
  handler,
  {
    params: generateSchema(getUserParamsSchema),
    response: {
      200: generateSchema(userResponseSchema),
      404: generateSchema(errorResponseSchema),
    },
    detail: {
      summary: 'Get user by ID',
      description: 'Retrieves a user by their unique identifier',
      tags: ['Users'],
    },
  }
)
```

#### Access Documentation

- **Scalar UI**: `http://localhost:3000/openapi`
- **OpenAPI JSON**: `http://localhost:3000/openapi/json`

---

## 📦 Module Structure

Each module is a self-contained unit with its own layers.

### Creating a New Module

```bash
# Create module directory structure
mkdir -p src/modules/order/{domain/{entities,value-objects,events,repositories},application/{commands,queries,dto},infrastructure/persistence,api,exceptions}

# Create index.ts for barrel export
touch src/modules/order/index.ts
```

### Module Registration

```typescript
// src/modules/order/order.module.ts
import { Elysia } from 'elysia';
import { orderController } from './api/order.controller';

export interface OrderModuleDeps {
  // Dependencies from other modules or shared
}

export const createOrderModule = (deps: OrderModuleDeps) => {
  return new Elysia({ prefix: '/orders', tags: ['Orders'] }).use(orderController(deps));
};
```

```typescript
// src/app.ts
import { createOrderModule } from '@/modules/order';

export function createApp() {
  return (
    new Elysia()
      // ... other setup
      .group(
        '/api/v1',
        (app) => app.use(createUserModule({})).use(createOrderModule({})), // Add new module
      )
  );
}
```

---

## ⚙️ Configuration

### Environment Variables

All environment variables are validated at startup using Zod.

```typescript
// src/config/schema.ts
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  OTEL_ENABLED: z.coerce.boolean().default(false),
  DEFAULT_LOCALE: z.enum(['en', 'tr']).default('en'),
});
```

### .env.example

```env
# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app

# Security
JWT_SECRET=your-super-secret-key-minimum-32-characters

# Logging
LOG_LEVEL=debug

# Observability (Day 2+)
OTEL_ENABLED=false
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317

# i18n
DEFAULT_LOCALE=en
```

### Accessing Config

```typescript
import { config } from '@/config';

// Type-safe config access
const port = config.app.port; // number
const isProduction = config.app.isProduction; // boolean
const dbUrl = config.database.url; // string
```

---

## 🗄️ Database

### Drizzle ORM Setup

```typescript
// src/shared/infrastructure/database/drizzle.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from '@/config';

const client = postgres(config.database.url, {
  max: config.database.pool.max,
});

export const db = drizzle(client);
```

### Table Definition

```typescript
// src/modules/user/infrastructure/persistence/user.table.ts
import { pgTable, text, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['admin', 'user', 'moderator']);

export const usersTable = pgTable('users', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: userRoleEnum('role').default('user').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Migrations

```bash
# Generate migration from schema changes
bun run db:generate

# Apply migrations
bun run db:migrate

# Push schema directly (development only)
bun run db:push

# Open Drizzle Studio (GUI)
bun run db:studio
```

---

## 🧪 Testing

### Test Structure

```
tests/
├── unit/                    # Unit tests (isolated)
│   └── modules/
│       └── user/
│           ├── user.service.test.ts
│           └── user.entity.test.ts
├── integration/             # Integration tests (with DB)
│   └── modules/
│       └── user/
│           └── user.repository.test.ts
├── e2e/                     # End-to-end tests (full HTTP)
│   └── user.e2e.test.ts
├── fixtures/                # Test data
└── setup.ts                 # Global test setup
```

### Running Tests

```bash
# Run all tests
bun test

# Run with watch mode
bun test --watch

# Run specific file
bun test tests/unit/modules/user/user.service.test.ts

# Run with coverage
bun test --coverage
```

### Example Test

```typescript
// tests/unit/modules/user/user.schemas.test.ts
import { describe, it, expect } from 'bun:test';
import { createUserRequestSchema } from '@/modules/user/api/user.schemas';

describe('User Schemas', () => {
  describe('createUserRequestSchema', () => {
    it('should validate a valid user request', () => {
      const validData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
      };

      const result = createUserRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'not-an-email',
        name: 'Test User',
        password: 'password123',
      };

      const result = createUserRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
```

---

## 📊 Observability

### Logging (Pino)

```typescript
import { logger, createModuleLogger } from '@/shared/logging/logger';

// Global logger
logger.info({ userId: 1 }, 'User created');

// Module-specific logger
const userLogger = createModuleLogger('user');
userLogger.debug({ email }, 'Checking if user exists');
```

### OpenTelemetry (Day 2+)

Enable tracing by setting `OTEL_ENABLED=true`.

```typescript
// Automatically instruments:
// - HTTP requests
// - Database queries
// - External HTTP calls
```

View traces in Jaeger UI at `http://localhost:16686`.

---

## 🐳 Docker

### Development

```bash
# Start all services (db, redis, jaeger)
docker compose up -d

# Start only database
docker compose up -d db

# View logs
docker compose logs -f

# Stop all
docker compose down
```

### Production Build

```bash
# Build image
docker build -f docker/Dockerfile -t modular-monolith:latest .

# Run container
docker run -p 3000:3000 --env-file .env modular-monolith:latest
```

### docker-compose.yml

```yaml
services:
  app:
    build:
      context: .
      dockerfile: docker/Dockerfile
    ports:
      - '3000:3000'
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/app
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s
      timeout: 5s
      retries: 5

  # Day 2+
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - '16686:16686' # UI
      - '4317:4317' # OTLP gRPC
```

---

## 📖 API Documentation

Once the server is running, access:

| URL                                  | Description           |
| ------------------------------------ | --------------------- |
| `http://localhost:3000/openapi`      | Interactive Scalar UI |
| `http://localhost:3000/openapi/json` | Raw OpenAPI JSON spec |
| `http://localhost:3000/health`       | Health check endpoint |

---

## ✅ Best Practices

### Do's ✅

- ✅ **Use Zod for all validation** - Single source of truth
- ✅ **Keep modules independent** - No cross-module imports in domain layer
- ✅ **Use repository pattern** - Abstract database access
- ✅ **Throw domain exceptions** - Not generic errors
- ✅ **Write tests first** - TDD for domain logic
- ✅ **Use ISO strings for dates in API** - JSON-safe serialization
- ✅ **Use mappers for response transformation** - Never return raw DB models
- ✅ **Validate mapper output with Zod** - Catch DB↔API drift at runtime

### Don'ts ❌

- ❌ **Don't use global state** - Especially for request-scoped data
- ❌ **Don't skip validation** - Always validate at API boundary
- ❌ **Don't put business logic in controllers** - Use application layer
- ❌ **Don't import from other modules' infrastructure** - Use public interfaces
- ❌ **Don't use `any` type** - Leverage TypeScript fully
- ❌ **Don't return inline objects from controllers** - Use mappers
- ❌ **Don't expose database models in API responses** - Transform via DTOs

---

## 🗺️ Roadmap

### Day 1 (MVP) ✅

- [x] Project structure
- [x] Config with Zod validation
- [x] Pino logging
- [x] Exception handling with i18n
- [x] Drizzle ORM setup
- [x] Zod schemas with OpenAPI
- [x] User module example
- [x] Docker setup

### Day 2+ 🔜

- [ ] Authentication (JWT + refresh tokens)
- [ ] Authorization (RBAC/ABAC)
- [ ] Redis caching
- [ ] Event Bus (inter-module communication)
- [ ] OpenTelemetry tracing
- [ ] Rate limiting
- [ ] Background jobs (BullMQ)
- [ ] E2E test suite
- [ ] CI/CD pipeline

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Elysia](https://elysiajs.com) - For the amazing framework
- [Drizzle](https://orm.drizzle.team) - For type-safe SQL
- [Kamil Grzybek](https://github.com/kgrzybek/modular-monolith-with-ddd) - For modular monolith inspiration

---

**Built with ❤️ by [Wegobi Studio](https://wegobi.com)**
