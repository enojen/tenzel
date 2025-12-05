# Module Registration Guide

This documentation explains the steps required to create and register a new module in the project. The `user` module is used as a reference.

## Module Folder Structure

```
src/modules/{module-name}/
├── api/
│   ├── {module}.controller.ts    # Elysia route handlers
│   ├── {module}.schemas.ts       # Zod validation schemas
│   └── index.ts
├── application/
│   ├── commands/
│   │   ├── {command}.handler.ts  # Mutation operations
│   │   └── index.ts
│   ├── queries/
│   │   ├── {query}.query.ts      # Read-only operations
│   │   └── index.ts
│   └── dto/
│       ├── {module}.mapper.ts    # Domain ↔ DB ↔ Response transformations
│       └── index.ts
├── domain/
│   ├── entities/
│   │   ├── {entity}.entity.ts    # Domain entity
│   │   └── index.ts
│   ├── repositories/
│   │   ├── {module}.repository.ts # Repository interface
│   │   └── index.ts
│   ├── value-objects/
│   │   ├── {vo}.vo.ts            # Value object definitions
│   │   └── index.ts
│   ├── events/
│   │   └── index.ts
│   └── index.ts
├── infrastructure/
│   └── persistence/
│       ├── {module}.table.ts         # Drizzle table schema
│       ├── {module}.db-schemas.ts    # Zod + TS types
│       ├── drizzle-{module}.repository.ts  # Repository impl
│       └── index.ts
├── exceptions/
│   ├── {module}.exceptions.ts
│   └── index.ts
├── {module}.module.ts            # Module factory function
└── index.ts                      # Public API exports
```

---

## 1. Domain Layer

### 1.1 Creating an Entity

Entities extend either `AggregateRoot` or `Entity` base class.

```typescript
// domain/entities/product.entity.ts
import { AggregateRoot, type EntityProps } from '@/shared/domain';

export interface ProductProps extends EntityProps {
  name: string;
  price: number;
  // ... other properties
}

export class Product extends AggregateRoot<ProductProps> {
  get name(): string {
    return this.props.name;
  }

  get price(): number {
    return this.props.price;
  }

  // Domain behavior methods
  updatePrice(newPrice: number): void {
    this.props.price = newPrice;
    this.props.updatedAt = new Date();
  }

  // Factory method
  static create(props: Omit<ProductProps, 'id'> & { id?: number | string }): Product {
    return new Product({
      ...props,
      id: props.id ?? Math.random().toString(36).substr(2, 9),
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    } as ProductProps);
  }
}
```

### 1.2 Repository Interface

Repository interface is defined in the domain layer, implementation is in infrastructure.

```typescript
// domain/repositories/product.repository.ts
import type { Product } from '../entities/product.entity';

export interface ProductRepository {
  findById(id: number): Promise<Product | null>;
  create(product: Product): Promise<Product>;
  update(product: Product): Promise<Product>;
  findAll(): Promise<Product[]>;
}
```

### 1.3 Value Objects

Value objects use the `const` object and `type` export pattern.

```typescript
// domain/value-objects/product-status.vo.ts
export const PRODUCT_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DISCONTINUED: 'discontinued',
} as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[keyof typeof PRODUCT_STATUSES];
```

### 1.4 Domain Index

```typescript
// domain/index.ts
export { Product, type ProductProps } from './entities';
export type { ProductRepository } from './repositories';
export { PRODUCT_STATUSES, type ProductStatus } from './value-objects/product-status.vo';
```

---

## 2. Infrastructure Layer

### 2.1 Drizzle Table Schema

> **IMPORTANT:** File name must follow the `*.table.ts` pattern. `drizzle.config.ts` automatically scans this pattern.

```typescript
// infrastructure/persistence/product.table.ts
import { integer, pgEnum, pgTable, timestamp, varchar, numeric } from 'drizzle-orm/pg-core';

export const productStatusEnum = pgEnum('product_status', ['active', 'inactive', 'discontinued']);

export const productsTable = pgTable('products', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 255 }).notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  status: productStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

### 2.2 DB Schemas (Zod + Types)

```typescript
// infrastructure/persistence/product.db-schemas.ts
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { productsTable } from './product.table';

export const selectProductSchema = createSelectSchema(productsTable);
export const insertProductSchema = createInsertSchema(productsTable);

export type DbProduct = typeof productsTable.$inferSelect;
export type NewDbProduct = typeof productsTable.$inferInsert;
```

### 2.3 Repository Implementation

```typescript
// infrastructure/persistence/drizzle-product.repository.ts
import { eq } from 'drizzle-orm';
import { db } from '@/shared/infrastructure/database/drizzle';
import { Product } from '../../domain/entities/product.entity';
import { productsTable } from './product.table';
import type { DbProduct, NewDbProduct } from './product.db-schemas';
import type { ProductRepository } from '../../domain/repositories/product.repository';

export class DrizzleProductRepository implements ProductRepository {
  constructor(private readonly database: typeof db = db) {}

  async findById(id: number): Promise<Product | null> {
    const result = await this.database
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, id))
      .limit(1);

    return result[0] ? this.toDomain(result[0]) : null;
  }

  async create(product: Product): Promise<Product> {
    const dbProduct = this.toDb(product);
    const [created] = await this.database.insert(productsTable).values(dbProduct).returning();
    return this.toDomain(created!);
  }

  // ... other methods

  private toDomain(dbProduct: DbProduct): Product {
    return Product.create({
      id: dbProduct.id,
      name: dbProduct.name,
      price: Number(dbProduct.price),
      createdAt: dbProduct.createdAt,
      updatedAt: dbProduct.updatedAt,
    });
  }

  private toDb(product: Product): NewDbProduct {
    return {
      name: product.name,
      price: String(product.price),
    };
  }
}
```

### 2.4 Infrastructure Index

```typescript
// infrastructure/persistence/index.ts
export { productsTable, productStatusEnum } from './product.table';
export {
  selectProductSchema,
  insertProductSchema,
  type DbProduct,
  type NewDbProduct,
} from './product.db-schemas';
export { DrizzleProductRepository } from './drizzle-product.repository';
```

---

## 3. Application Layer

### 3.1 Command Handler

```typescript
// application/commands/create-product.handler.ts
import { Product } from '../../domain/entities/product.entity';
import { productMapper } from '../dto/product.mapper';
import type { CreateProductRequest, ProductResponse } from '../../api/product.schemas';
import type { ProductRepository } from '../../domain/repositories/product.repository';

export interface CreateProductDeps {
  productRepo: ProductRepository;
}

export async function createProductHandler(
  input: CreateProductRequest,
  deps: CreateProductDeps,
): Promise<ProductResponse> {
  const { productRepo } = deps;

  const product = Product.create({
    id: 0,
    name: input.name,
    price: input.price,
  });

  const created = await productRepo.create(product);
  return productMapper.toResponse(created);
}
```

### 3.2 Query Handler

```typescript
// application/queries/get-product-by-id.query.ts
import { ProductNotFoundException } from '../../exceptions';
import { productMapper } from '../dto/product.mapper';
import type { ProductResponse } from '../../api/product.schemas';
import type { ProductRepository } from '../../domain/repositories/product.repository';

export interface GetProductByIdDeps {
  productRepo: ProductRepository;
}

export async function getProductByIdQuery(
  id: number,
  deps: GetProductByIdDeps,
): Promise<ProductResponse> {
  const product = await deps.productRepo.findById(id);
  if (!product) {
    throw new ProductNotFoundException();
  }
  return productMapper.toResponse(product);
}
```

### 3.3 Mapper

```typescript
// application/dto/product.mapper.ts
import { Product } from '../../domain/entities/product.entity';
import type { ProductResponse } from '../../api/product.schemas';
import type { DbProduct, NewDbProduct } from '../../infrastructure/persistence/product.db-schemas';

export const productMapper = {
  toPersistence(product: Product): NewDbProduct {
    return {
      name: product.name,
      price: String(product.price),
    };
  },

  toDomain(dbProduct: DbProduct): Product {
    return Product.create({
      id: dbProduct.id,
      name: dbProduct.name,
      price: Number(dbProduct.price),
      createdAt: dbProduct.createdAt,
      updatedAt: dbProduct.updatedAt,
    });
  },

  toResponse(product: Product): ProductResponse {
    return {
      id: product.id as number,
      name: product.name,
      price: product.price,
      createdAt: (product.createdAt ?? new Date()).toISOString(),
      updatedAt: (product.updatedAt ?? new Date()).toISOString(),
    };
  },
};
```

---

## 4. API Layer

### 4.1 Schemas (Zod Validation)

```typescript
// api/product.schemas.ts
import { z } from 'zod';

export const createProductRequestSchema = z.object({
  name: z.string().min(1).max(255).describe('Product name'),
  price: z.number().positive().describe('Product price'),
});

export const productResponseSchema = z.object({
  id: z.number().int().describe('Product ID'),
  name: z.string().describe('Product name'),
  price: z.number().describe('Product price'),
  createdAt: z.string().datetime().describe('Creation timestamp'),
  updatedAt: z.string().datetime().describe('Last update timestamp'),
});

export type CreateProductRequest = z.infer<typeof createProductRequestSchema>;
export type ProductResponse = z.infer<typeof productResponseSchema>;
```

### 4.2 Controller

```typescript
// api/product.controller.ts
import { Elysia, t } from 'elysia';
import { createProductHandler, type CreateProductDeps } from '../application/commands';
import { getProductByIdQuery, type GetProductByIdDeps } from '../application/queries';
import { createProductRequestSchema, productResponseSchema } from './product.schemas';
import { ErrorResponseSchema } from '@/shared/openapi';

export type ProductControllerDeps = CreateProductDeps & GetProductByIdDeps;

export function productController(deps: ProductControllerDeps) {
  return new Elysia()
    .post(
      '/',
      async ({ body, set }) => {
        const validated = createProductRequestSchema.parse(body);
        const result = await createProductHandler(validated, deps);
        set.status = 201;
        return result;
      },
      {
        body: createProductRequestSchema,
        response: {
          201: productResponseSchema,
          400: ErrorResponseSchema,
        },
        detail: {
          summary: 'Create product',
          tags: ['Products'],
        },
      },
    )
    .get(
      '/:id',
      async ({ params }) => {
        return getProductByIdQuery(Number(params.id), deps);
      },
      {
        params: t.Object({ id: t.String() }),
        response: {
          200: productResponseSchema,
          404: ErrorResponseSchema,
        },
        detail: {
          summary: 'Get product by ID',
          tags: ['Products'],
        },
      },
    );
}
```

---

## 5. Exceptions

```typescript
// exceptions/product.exceptions.ts
import { NotFoundException } from '@/shared/exceptions';

export class ProductNotFoundException extends NotFoundException {
  constructor() {
    super('errors.product.not_found');
  }
}
```

```typescript
// exceptions/index.ts
export * from './product.exceptions';
```

---

## 6. Module Registration

### 6.1 Module Factory Function

```typescript
// product.module.ts
import { Elysia } from 'elysia';
import { productController, type ProductControllerDeps } from './api/product.controller';

export function createProductModule(deps: ProductControllerDeps) {
  return new Elysia({ prefix: '/products', tags: ['Products'] }).use(productController(deps));
}
```

### 6.2 Public API Export (index.ts)

```typescript
// index.ts
export { createProductModule } from './product.module';

export { Product, type ProductProps, PRODUCT_STATUSES } from './domain';
export type { ProductRepository, ProductStatus } from './domain';

export {
  productsTable,
  productStatusEnum,
  DrizzleProductRepository,
  type DbProduct,
  type NewDbProduct,
} from './infrastructure/persistence';
```

---

## 7. App Integration

Register the module in `src/app.ts`:

```typescript
// src/app.ts
import { createProductModule, DrizzleProductRepository } from './modules/product';

// ... existing code ...

.group('/api/v1', (api) => {
  // Existing modules
  const userRepo = new DrizzleUserRepository(db);
  const userDeps = { userRepo, passwordHasher };

  // New module
  const productRepo = new DrizzleProductRepository(db);
  const productDeps = { productRepo };

  return api
    .get('/', () => ({ message: 'API v1 is up' }), { /* ... */ })
    .use(createUserModule(userDeps))
    .use(createProductModule(productDeps));  // <-- New module
});
```

---

## 8. Database Migration

### 8.1 Generate Migration

```bash
bunx drizzle-kit generate
```

### 8.2 Run Migration

```bash
bunx drizzle-kit migrate
```

> **Note:** `drizzle.config.ts` automatically scans the `./src/modules/**/infrastructure/persistence/*.table.ts` pattern.

---

## Checklist

Use this checklist when adding a new module:

- [ ] Folder structure created
- [ ] Domain entity and repository interface defined
- [ ] Value objects created
- [ ] Drizzle table schema defined (`*.table.ts`)
- [ ] DB schemas and types created
- [ ] Repository implementation written
- [ ] Command/Query handlers created
- [ ] Mapper functions written
- [ ] API schemas (Zod) defined
- [ ] Controller created
- [ ] Exception classes added
- [ ] Module factory function written
- [ ] index.ts exports configured
- [ ] Module registered in app.ts
- [ ] Migration generated and applied

---

## Further Reading

For detailed examples, examine the `src/modules/user` module:

- Entity pattern: `domain/entities/user.entity.ts`
- Repository pattern: `domain/repositories/user.repository.ts`
- Drizzle implementation: `infrastructure/persistence/drizzle-user.repository.ts`
- Controller pattern: `api/user.controller.ts`
- Dependency injection: `user.module.ts` and `app.ts`
