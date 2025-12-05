# Tenzel

A production-ready **Modular Monolith** boilerplate with **Domain-Driven Design** principles, built with modern TypeScript tooling.

[![Bun](https://img.shields.io/badge/Bun-1.1+-black?logo=bun)](https://bun.sh)
[![Elysia](https://img.shields.io/badge/Elysia-1.4+-blue)](https://elysiajs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue?logo=typescript)](https://www.typescriptlang.org)
[![Drizzle](https://img.shields.io/badge/Drizzle_ORM-0.44+-green)](https://orm.drizzle.team)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-blue?logo=postgresql)](https://www.postgresql.org)
[![Zod](https://img.shields.io/badge/Zod-4+-orange)](https://zod.dev)

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Core Features](#core-features)
  - [Configuration System](#configuration-system)
  - [Domain Layer](#domain-layer)
  - [Exception Handling](#exception-handling)
  - [Internationalization](#internationalization-i18n)
  - [Logging](#logging)
  - [Observability](#observability)
  - [Database](#database)
  - [Security](#security)
  - [OpenAPI Documentation](#openapi-documentation)
- [Module Guide](#module-guide)
- [Task Creation Guideline](#task-creation-guideline)
- [Testing](#testing)
- [Docker](#docker)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Scripts Reference](#scripts-reference)
- [Contributing](#contributing)

---

## Overview

Tenzel provides a solid foundation for building **scalable backend applications** using the Modular Monolith architecture pattern. It combines the simplicity of a monolith with the modularity benefits of microservices.

### Why Modular Monolith?

| Approach             | Pros                               | Cons                                     |
| -------------------- | ---------------------------------- | ---------------------------------------- |
| Traditional Monolith | Simple deployment, easy debugging  | Tight coupling, hard to scale teams      |
| Microservices        | Independent scaling, team autonomy | Operational complexity, network overhead |
| **Modular Monolith** | Best of both worlds                | Requires discipline                      |

### Key Benefits

- **Clear Module Boundaries** - Each module is self-contained with its own domain, application, and infrastructure layers
- **Single Deployment** - No distributed system complexity, easier debugging and monitoring
- **Easy Extraction** - Modules can be extracted to microservices when needed
- **End-to-End Type Safety** - Full TypeScript coverage with Zod runtime validation
- **Production Ready** - Includes logging, tracing, health checks, and graceful shutdown

---

## Tech Stack

| Category       | Technology     | Purpose                                                  |
| -------------- | -------------- | -------------------------------------------------------- |
| **Runtime**    | Bun 1.1+       | Fast JavaScript runtime with built-in TypeScript support |
| **Framework**  | Elysia 1.4+    | Type-safe HTTP framework with OpenAPI integration        |
| **ORM**        | Drizzle 0.44+  | Type-safe SQL query builder with migration support       |
| **Validation** | Zod 4+         | Runtime validation with TypeScript type inference        |
| **Database**   | PostgreSQL 16+ | Robust relational database                               |
| **Logging**    | Pino 10+       | High-performance JSON structured logging                 |
| **Tracing**    | OpenTelemetry  | Distributed tracing with auto-instrumentation            |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MODULAR MONOLITH                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │    User     │  │   (Future)  │  │   (Future)  │  Modules    │
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

### Layer Separation

Each module follows Clean Architecture with four distinct layers:

| Layer              | Responsibility                                                 | Dependencies |
| ------------------ | -------------------------------------------------------------- | ------------ |
| **API**            | HTTP controllers, request/response schemas, OpenAPI docs       | Application  |
| **Application**    | Use cases, commands, queries, DTOs, mappers                    | Domain       |
| **Domain**         | Entities, value objects, domain events, repository interfaces  | None         |
| **Infrastructure** | Repository implementations, database tables, external services | Domain       |

---

## Project Structure

```
├── src/
│   ├── app.ts                    # Elysia application factory
│   ├── bootstrap.ts              # Application entry point with lifecycle management
│   │
│   ├── config/                   # Configuration
│   │   ├── index.ts              # Config singleton with caching
│   │   └── schema.ts             # Zod environment validation schema
│   │
│   ├── shared/                   # Shared Kernel
│   │   ├── domain/               # Base entities and value objects
│   │   ├── exceptions/           # Exception classes and handler
│   │   ├── i18n/                 # Internationalization with locales
│   │   ├── infrastructure/       # Database connection, crypto utilities
│   │   ├── logging/              # Pino logger configuration
│   │   ├── middleware/           # Request ID middleware
│   │   ├── observability/        # OpenTelemetry tracing setup
│   │   ├── openapi/              # Shared OpenAPI schemas
│   │   └── types/                # Shared TypeScript types
│   │
│   └── modules/                  # Feature Modules
│       └── user/
│           ├── api/              # Controllers and API schemas
│           ├── application/      # Commands, queries, DTOs
│           ├── domain/           # Entities, value objects, repository interfaces
│           ├── exceptions/       # Module-specific exceptions
│           └── infrastructure/   # Repository implementations, database tables
│
├── tests/
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests with database
│   ├── e2e/                      # End-to-end HTTP tests
│   ├── mocks/                    # Mock implementations
│   └── setup.ts                  # Test environment setup
│
├── docker/
│   ├── Dockerfile                # Multi-stage production build
│   ├── docker-compose.yml        # Full stack deployment
│   └── docker-compose.local.yml  # Local development database
│
├── drizzle/
│   └── migrations/               # Database migration files
│
└── drizzle.config.ts             # Drizzle Kit configuration
```

---

## Getting Started

### Prerequisites

- Bun 1.1 or higher
- PostgreSQL 16 or higher
- Docker (optional, for containerized development)

### Installation

1. Clone the repository
2. Install dependencies with `bun install`
3. Copy `.env.example` to `.env` and configure variables
4. Start PostgreSQL (or use `docker compose -f docker/docker-compose.local.yml up -d`)
5. Run migrations with `bun run db:migrate`
6. Start development server with `bun run dev`

### Quick Start with Docker

Start the full stack including database and optional Jaeger tracing:

```
docker compose -f docker/docker-compose.yml up -d
docker compose -f docker/docker-compose.yml --profile observability up -d
```

---

## Core Features

### Configuration System

Environment configuration is validated at startup using Zod schemas. Invalid configuration causes immediate application failure with descriptive error messages.

**Features:**

- Type-safe configuration access throughout the application
- Cached singleton pattern for performance
- Validation errors display expected vs received values
- Supports development, production, and test environments

**Configuration Categories:**

- Application settings (port, environment)
- Database connection with pooling options
- Security (JWT secret with minimum length requirement)
- Logging level configuration
- OpenTelemetry toggle and endpoint
- Default locale setting

---

### Domain Layer

The domain layer implements Domain-Driven Design patterns for rich domain modeling.

#### Base Entity

All domain entities extend the Base Entity class which provides:

- Unique identity (numeric or string ID)
- Creation and update timestamps
- Identity-based equality comparison

#### Aggregate Root

Aggregates extend Base Entity with additional capabilities:

- Domain event collection for eventual consistency
- Event publishing after persistence
- Transactional boundary definition

#### Value Objects

Immutable objects that describe domain concepts:

- **UserRole** - Defines user permission levels (admin, user)
- **UserStatus** - Defines account states (active, inactive, suspended)

---

### Exception Handling

A unified exception system that separates error definition from error presentation.

#### Exception Classes

| Exception               | HTTP Status | Default Code   |
| ----------------------- | ----------- | -------------- |
| BadRequestException     | 400         | BAD_REQUEST    |
| UnauthorizedException   | 401         | UNAUTHORIZED   |
| ForbiddenException      | 403         | FORBIDDEN      |
| NotFoundException       | 404         | NOT_FOUND      |
| ConflictException       | 409         | CONFLICT       |
| InternalServerException | 500         | INTERNAL_ERROR |

#### Key Design Decisions

- Exceptions store translation keys, not translated messages
- Translation occurs at the error handler level using request locale
- Stack traces are included only in development mode
- All exceptions include timestamps for debugging
- Module-specific exceptions extend base HTTP exceptions

#### Error Response Format

All errors return a consistent JSON structure with error code, localized message, and ISO timestamp.

---

### Internationalization (i18n)

Request-scoped, stateless internationalization to prevent race conditions in concurrent requests.

**Supported Locales:**

- English (en) - Default
- Turkish (tr)

**Features:**

- Locale detection from Accept-Language header
- Parameter interpolation in messages (e.g., `{email}`)
- Fallback to English for missing translations
- Configurable default locale via environment variable

**Translation Categories:**

- Generic HTTP errors
- Validation errors
- Module-specific errors (e.g., user not found, user already exists)

---

### Logging

High-performance structured logging with Pino.

#### Request Lifecycle Logging

Every HTTP request is logged with:

- Unique request ID (from X-Request-ID header or auto-generated with nanoid)
- HTTP method and path
- Response status code
- Request duration in milliseconds

#### Log Level Mapping

| Response Status | Log Level |
| --------------- | --------- |
| 2xx, 3xx        | INFO      |
| 4xx             | WARN      |
| 5xx             | ERROR     |

#### Output Formats

- **Development:** Colorized pretty-print output with pino-pretty
- **Production:** JSON structured logs for log aggregation systems

#### Module Loggers

Create child loggers with module context for organized log filtering.

---

### Observability

Distributed tracing with OpenTelemetry for production monitoring.

#### Auto-Instrumentation

When enabled, automatically traces:

- HTTP requests and responses
- PostgreSQL database queries
- External HTTP calls

#### Jaeger Integration

The project includes Jaeger configuration for trace visualization:

- Web UI available on port 16686
- OTLP HTTP endpoint on port 4318
- Enable with OTEL_ENABLED=true

#### Service Identification

Traces are tagged with service name "tenzel" and version "1.0.0" for filtering in trace backends.

---

### Database

PostgreSQL database access via Drizzle ORM with production-ready configuration.

#### Connection Pooling

Configurable pool settings:

- Maximum connections (default: 10)
- Idle timeout (default: 20 seconds)
- Connect timeout (default: 10 seconds)
- Maximum connection lifetime (30 minutes)

#### Health Checks

Two endpoints for container orchestration:

- **/health** - Returns database connectivity status with uptime
- **/ready** - Returns 503 if database is unavailable

#### Migration Workflow

Drizzle Kit manages database schema:

- `db:generate` - Generate migration files from schema changes
- `db:migrate` - Apply pending migrations
- `db:push` - Push schema directly (development only)
- `db:studio` - Open Drizzle Studio GUI

#### Table Definitions

Tables are defined in module infrastructure layers with:

- PostgreSQL enums for constrained values
- Auto-incrementing identity columns
- Timezone-aware timestamps
- Soft delete support with deletedAt column

---

### Security

#### Password Hashing

Passwords are hashed using Argon2id algorithm via Bun's built-in password utilities:

- Industry-standard memory-hard hashing
- Automatic salt generation
- Secure verification without timing attacks

#### JWT Configuration

JWT secret requires minimum 32 characters, validated at startup.

---

### OpenAPI Documentation

API documentation automatically generated from Zod schemas.

#### Endpoints

| URL           | Description                        |
| ------------- | ---------------------------------- |
| /openapi      | Interactive Scalar UI              |
| /openapi/json | Raw OpenAPI 3.0 JSON specification |

#### Schema Integration

Zod schemas are converted to JSON Schema using `z.toJSONSchema` and passed directly to Elysia route definitions. Use `.describe()` on Zod fields to add OpenAPI descriptions.

---

## Module Guide

### Module Structure

Each module is self-contained with clear layer separation:

| Directory       | Contents                                               |
| --------------- | ------------------------------------------------------ |
| api/            | Controller with routes, request/response Zod schemas   |
| application/    | Command handlers, query handlers, DTOs, mappers        |
| domain/         | Entities, value objects, repository interfaces, events |
| infrastructure/ | Repository implementations, database table definitions |
| exceptions/     | Module-specific exception classes                      |

### Creating a New Module

1. Create module directory under `src/modules/`
2. Define domain entities and repository interfaces
3. Create database tables and repository implementation
4. Implement application layer handlers
5. Create API controller with Zod schemas
6. Register module in `src/app.ts` within the API group

### Module Registration

Modules are registered as Elysia plugins with dependency injection:

- Dependencies are passed through the module factory function
- Each module defines its required dependencies interface
- Modules are mounted under `/api/v1` with their own prefix

> **Detailed Guide:** See [docs/module-registration.md](docs/module-registration.md) for step-by-step instructions with code examples.

---

## Task Creation Guideline

Guidelines for breaking down new module development into manageable tasks.

### Task ID Format

```
{WORD}-{XXX}
```

- **WORD**: Random English word (e.g., NOVA, BOLT, APEX, FLUX, CORE)
- **XXX**: Sequential 3-digit number

Examples: `NOVA-001`, `BOLT-042`, `APEX-103`

### Optimal Task Size

| Too Small (Avoid)  | Good Size             | Too Large (Avoid)         |
| ------------------ | --------------------- | ------------------------- |
| Create single file | Create entire layer   | Full module in one task   |
| Add one export     | 2-4 related endpoints | All 10+ endpoints at once |
| Single test file   | Layer + its tests     | Multiple modules          |

### Module Creation Task Template

#### Phase 1: Foundation (Sequential)

| Task | Name                            | Description                                         |
| ---- | ------------------------------- | --------------------------------------------------- |
| 1    | **Domain Layer**                | Entity, repository interface, value objects, events |
| 2    | **Infrastructure - Table**      | Drizzle table, enums, DB types, Zod schemas         |
| 3    | **Infrastructure - Repository** | Repository implementation (all CRUD methods)        |
| 4    | **Module Exceptions**           | Module-specific exception classes                   |

#### Phase 2: API Endpoints (Can be Parallel)

For modules with many endpoints, **group by 3-5 related endpoints per task**:

| Task | Name                    | Example Grouping                          |
| ---- | ----------------------- | ----------------------------------------- |
| 5    | **API - CRUD Core**     | create, getById, getAll, update, delete   |
| 6    | **API - Status Ops**    | activate, deactivate, suspend, archive    |
| 7    | **API - Relations**     | addItem, removeItem, getItems, updateItem |
| 8    | **API - Search/Filter** | search, filter, paginate, sort            |
| 9    | **API - Bulk Ops**      | bulkCreate, bulkUpdate, bulkDelete        |

#### Phase 3: Testing & Finalization

| Task | Name                         | Description                            |
| ---- | ---------------------------- | -------------------------------------- |
| 10   | **Unit Tests**               | Domain entity, mapper, schemas tests   |
| 11   | **Integration Tests**        | Repository tests with DB               |
| 12   | **E2E Tests**                | API endpoint tests                     |
| 13   | **Migration & Registration** | Generate migration, register in app.ts |

### Cross-Module Dependencies

When a module depends on another module that doesn't exist:

1. **Create dependency tasks FIRST** with `[DEPENDENCY]` tag
2. Add note about which module requires it
3. Link tasks in description

```markdown
- [ ] NOVA-020: [DEPENDENCY] category module - domain layer (required by: product)
- [ ] NOVA-021: [DEPENDENCY] category module - infrastructure
- [ ] NOVA-022: [DEPENDENCY] category module - API layer
- [ ] NOVA-023: product module - domain layer (depends on: NOVA-022)
```

### Commit Convention

After each task completion, commit with task ID:

```bash
git commit -m "TASK-ID: brief description

- bullet point of changes
- another change
```

### Full Example: Product Module (10 Endpoints)

Assuming product depends on **category** module (not yet created):

```markdown
## Category Module (Dependency)

- [ ] BOLT-040: category module - domain layer
- [ ] BOLT-041: category module - infrastructure (table + repository)
- [ ] BOLT-042: category module - API (CRUD endpoints)
- [ ] BOLT-043: category module - tests (unit + integration + e2e)

## Product Module

- [ ] BOLT-044: product module - domain layer (entity, repo interface, VOs)
- [ ] BOLT-045: product module - infrastructure table & DB schemas
- [ ] BOLT-046: product module - repository implementation
- [ ] BOLT-047: product module - exceptions
- [ ] BOLT-048: product module - API core (create, get, update, delete, list)
- [ ] BOLT-049: product module - API status (activate, deactivate, archive)
- [ ] BOLT-050: product module - API relations (category assignment)
- [ ] BOLT-051: product module - unit tests
- [ ] BOLT-052: product module - integration tests
- [ ] BOLT-053: product module - e2e tests
- [ ] BOLT-054: product module - migration & app registration
```

### Task Description Template

```markdown
## BOLT-048: product module - API core

**Endpoints:**

- POST /products (create)
- GET /products/:id (getById)
- GET /products (list with pagination)
- PUT /products/:id (update)
- DELETE /products/:id (delete)

**Dependencies:** BOLT-046, BOLT-047

**Files to create/modify:**

- src/modules/product/api/product.schemas.ts
- src/modules/product/api/product.controller.ts
- src/modules/product/application/commands/create-product.handler.ts
- src/modules/product/application/queries/get-product.query.ts

**Acceptance:**

- [ ] All endpoints working
- [ ] OpenAPI schemas documented
- [ ] Lint & typecheck pass

**On completion:** Commit with "BOLT-048: product module - API core endpoints"
```

### Tips for AI Agents

1. **Always commit after task** - use task ID in commit message
2. **Check dependencies first** - create missing module tasks before proceeding
3. **Group related endpoints** - 3-5 endpoints per task is optimal
4. **Run tests before commit** - `bun test`, `bun run lint`, `bun run typecheck`
5. **Reference existing patterns** - "follow user module structure"

---

## Testing

### Test Structure

| Directory          | Purpose                      | Database |
| ------------------ | ---------------------------- | -------- |
| tests/unit/        | Isolated component tests     | No       |
| tests/integration/ | Repository and service tests | Yes      |
| tests/e2e/         | Full HTTP request tests      | Yes      |
| tests/mocks/       | Mock implementations         | -        |

### Test Setup

The test setup file configures environment variables for the test environment:

- Separate port (4000)
- Test database URL
- Test JWT secret
- Debug log level

### Mock Implementations

Available mocks for unit testing:

- In-memory user repository
- Mock password hasher with predictable output

### Running Tests

| Command             | Description              |
| ------------------- | ------------------------ |
| `bun test`          | Run all tests            |
| `bun test:unit`     | Run unit tests only      |
| `bun test:coverage` | Run with coverage report |

---

## Docker

### Dockerfile

Multi-stage build optimized for production:

**Stage 1 - Builder:**

- Uses official Bun Debian image
- Installs dependencies with frozen lockfile
- Compiles to standalone binary with `bun build --compile`

**Stage 2 - Runner:**

- Minimal Debian slim image
- Non-root user for security
- Only contains compiled binary
- ~50MB final image size

### Docker Compose Files

| File                     | Purpose                                 |
| ------------------------ | --------------------------------------- |
| docker-compose.yml       | Full production stack (app, db, jaeger) |
| docker-compose.local.yml | Local development database only         |
| docker-compose.dev.yml   | Development configuration               |

### Services

| Service | Image                         | Ports       |
| ------- | ----------------------------- | ----------- |
| app     | Custom build                  | 3000        |
| db      | postgres:16-alpine            | 5432        |
| jaeger  | jaegertracing/all-in-one:1.54 | 16686, 4318 |

### Observability Profile

Jaeger is configured as an optional profile. Enable with:

```
docker compose --profile observability up -d
```

---

## API Reference

### System Endpoints

| Method | Path          | Description                       |
| ------ | ------------- | --------------------------------- |
| GET    | /health       | Health check with database status |
| GET    | /ready        | Readiness probe for orchestrators |
| GET    | /openapi      | Interactive API documentation     |
| GET    | /openapi/json | OpenAPI specification             |
| GET    | /api/v1       | API version root                  |

### User Endpoints

| Method | Path              | Description     |
| ------ | ----------------- | --------------- |
| POST   | /api/v1/users     | Create new user |
| GET    | /api/v1/users/:id | Get user by ID  |

### Response Codes

| Code | Description                            |
| ---- | -------------------------------------- |
| 200  | Success                                |
| 201  | Created                                |
| 400  | Bad Request - Validation failed        |
| 401  | Unauthorized - Authentication required |
| 403  | Forbidden - Insufficient permissions   |
| 404  | Not Found - Resource does not exist    |
| 409  | Conflict - Resource already exists     |
| 500  | Internal Server Error                  |
| 503  | Service Unavailable - Database down    |

---

## Environment Variables

| Variable                    | Required | Default               | Description                                        |
| --------------------------- | -------- | --------------------- | -------------------------------------------------- |
| NODE_ENV                    | No       | development           | Environment mode (development, production, test)   |
| PORT                        | No       | 3000                  | HTTP server port                                   |
| DATABASE_URL                | Yes      | -                     | PostgreSQL connection string                       |
| DATABASE_POOL_MAX           | No       | 10                    | Maximum pool connections                           |
| DATABASE_IDLE_TIMEOUT       | No       | 20                    | Idle connection timeout (seconds)                  |
| DATABASE_CONNECT_TIMEOUT    | No       | 10                    | Connection timeout (seconds)                       |
| JWT_SECRET                  | Yes      | -                     | JWT signing secret (min 32 chars)                  |
| LOG_LEVEL                   | No       | info                  | Log level (trace, debug, info, warn, error, fatal) |
| OTEL_ENABLED                | No       | false                 | Enable OpenTelemetry tracing                       |
| OTEL_EXPORTER_OTLP_ENDPOINT | No       | http://localhost:4318 | OTLP exporter endpoint                             |
| DEFAULT_LOCALE              | No       | en                    | Default language (en, tr)                          |

---

## Scripts Reference

| Script                | Description                              |
| --------------------- | ---------------------------------------- |
| `bun run dev`         | Start development server with hot reload |
| `bun run start`       | Start production server                  |
| `bun test`            | Run all tests                            |
| `bun test:unit`       | Run unit tests only                      |
| `bun test:coverage`   | Run tests with coverage                  |
| `bun run typecheck`   | TypeScript type checking                 |
| `bun run lint`        | Run ESLint                               |
| `bun run lint:fix`    | Run ESLint with auto-fix                 |
| `bun run format`      | Check Prettier formatting                |
| `bun run format:fix`  | Fix Prettier formatting                  |
| `bun run db:generate` | Generate migration files                 |
| `bun run db:migrate`  | Apply migrations                         |
| `bun run db:push`     | Push schema (dev only)                   |
| `bun run db:studio`   | Open Drizzle Studio                      |

---

## Contributing

We welcome contributions! Please follow these guidelines to ensure a smooth process.

### Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/tenzel.git`
3. Install dependencies: `bun install`
4. Create a feature branch: `git checkout -b feature/your-feature-name`

### Branch Naming

| Type     | Pattern                | Example                     |
| -------- | ---------------------- | --------------------------- |
| Feature  | `feature/description`  | `feature/add-auth-module`   |
| Bug Fix  | `fix/description`      | `fix/user-validation-error` |
| Refactor | `refactor/description` | `refactor/improve-logging`  |
| Docs     | `docs/description`     | `docs/update-readme`        |
| Chore    | `chore/description`    | `chore/update-deps`         |

### Commit Messages

Follow conventional commits format:

```
type(scope): brief description

- detailed change 1
- detailed change 2
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Pull Request Process

1. Ensure all tests pass: `bun test`
2. Run linting: `bun run lint`
3. Run type checking: `bun run typecheck`
4. Update documentation if needed
5. Create a pull request with a clear description

### Code Style

- Follow existing patterns in the codebase
- Use TypeScript strict mode
- Add Zod schemas for runtime validation
- Write tests for new features
- Keep modules self-contained following the module structure

### Development Workflow

1. Pick an issue or create one for your feature
2. Follow the [Task Creation Guideline](#task-creation-guideline) for complex features
3. Make small, focused commits
4. Request review when ready

---

## License

MIT
