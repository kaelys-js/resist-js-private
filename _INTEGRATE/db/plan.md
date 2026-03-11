# Database Plan

> D1 + Drizzle ORM with automated migrations, seeding, and safe rollback patterns

## Overview

Cloudflare D1 (SQLite at the edge) with Drizzle ORM for type-safe database operations. Each product has its own isolated D1 database. Schema definitions live in `packages/shared/db/` and are applied per-product.

## Tech Stack

| Component | Tool | Rationale |
|-----------|------|-----------|
| Database | Cloudflare D1 | Edge SQLite, global replication |
| ORM | Drizzle | Type-safe, lightweight, great DX |
| Migrations | Drizzle Kit | Schema-driven, generates SQL |
| Seeding | Custom scripts | Valibot-validated seed data |
| Local Dev | D1 local (Miniflare) | Wrangler dev includes this |

## Architecture

```
packages/
├── shared/
│   └── db/
│       ├── package.json
│       ├── drizzle.config.ts       # Drizzle Kit config
│       ├── src/
│       │   ├── index.ts            # Export db client factory
│       │   ├── schema/
│       │   │   ├── index.ts        # Re-export all schemas
│       │   │   ├── users.ts        # User table
│       │   │   ├── sessions.ts     # Session table
│       │   │   └── ...
│       │   ├── relations.ts        # Drizzle relations
│       │   ├── types.ts            # Inferred types
│       │   └── seed/
│       │       ├── index.ts        # Seed runner
│       │       ├── data/           # Seed data per table
│       │       └── factories/      # Factory functions
│       ├── migrations/
│       │   ├── 0000_init.sql
│       │   ├── 0001_add_users.sql
│       │   └── meta/
│       │       └── _journal.json   # Migration journal
│       └── scripts/
│           ├── migrate.ts          # Run migrations
│           ├── seed.ts             # Run seeder
│           ├── reset.ts            # Drop + migrate + seed
│           ├── generate.ts         # Generate migration from schema
│           └── studio.ts           # Open Drizzle Studio

packages/products/<product>/
├── api/
│   ├── wrangler.toml              # D1 binding
│   └── src/
│       └── db.ts                  # Product db instance
└── db/
    ├── drizzle.config.ts          # Product-specific config
    ├── seed/
    │   └── data/                  # Product-specific seed data
    └── migrations/                # Product-specific migrations (if any)
```

## Part 1: Schema Definition

### Base Schema

```typescript
// packages/shared/db/src/schema/users.ts
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // ULID or UUID
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  role: text('role', { enum: ['user', 'admin'] }).default('user'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

```typescript
// packages/shared/db/src/schema/sessions.ts
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  refreshToken: text('refresh_token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  userIdIdx: index('sessions_user_id_idx').on(table.userId),
  refreshTokenIdx: index('sessions_refresh_token_idx').on(table.refreshToken),
  expiresAtIdx: index('sessions_expires_at_idx').on(table.expiresAt),
}));

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
```

### Relations

```typescript
// packages/shared/db/src/relations.ts
import { relations } from 'drizzle-orm';
import { users } from './schema/users';
import { sessions } from './schema/sessions';

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));
```

### Schema Index

```typescript
// packages/shared/db/src/schema/index.ts
export * from './users';
export * from './sessions';
// Add more tables as needed

// Re-export relations
export * from '../relations';
```

### Type Exports

```typescript
// packages/shared/db/src/types.ts
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { users, sessions } from './schema';

// Select types (for reading)
export type User = InferSelectModel<typeof users>;
export type Session = InferSelectModel<typeof sessions>;

// Insert types (for creating)
export type NewUser = InferInsertModel<typeof users>;
export type NewSession = InferInsertModel<typeof sessions>;

// Update types (partial inserts)
export type UpdateUser = Partial<NewUser>;
export type UpdateSession = Partial<NewSession>;
```

## Part 2: Database Client

### Client Factory

```typescript
// packages/shared/db/src/index.ts
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export type Database = ReturnType<typeof createDatabase>;

export function createDatabase(d1: D1Database) {
  return drizzle(d1, { schema });
}

// Re-export everything
export * from './schema';
export * from './types';
export { schema };
```

### Product Usage

```typescript
// packages/products/tastier/api/src/db.ts
import { createDatabase } from '@resist/db';

export type Env = {
  DB: D1Database;
  // ... other bindings
};

export function getDb(env: Env) {
  return createDatabase(env.DB);
}
```

```typescript
// packages/products/tastier/api/src/handlers/users.ts
import { getDb } from '../db';
import { users } from '@resist/db';
import { eq } from 'drizzle-orm';

export async function getUser(env: Env, userId: string) {
  const db = getDb(env);

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      sessions: true,
    },
  });

  return user;
}
```

## Part 3: Drizzle Configuration

### Shared Config

```typescript
// packages/shared/db/drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.D1_DATABASE_ID!,
    token: process.env.CLOUDFLARE_API_TOKEN!,
  },
} satisfies Config;
```

### Local Development Config

```typescript
// packages/shared/db/drizzle.local.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'sqlite',
  dbCredentials: {
    // Local D1 uses a SQLite file
    url: '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite',
  },
} satisfies Config;
```

## Part 4: Migrations

### Generate Migration

```typescript
// packages/shared/db/scripts/generate.ts
import { execSync } from 'node:child_process';

const name = process.argv[2];

if (!name) {
  console.error('Usage: pnpm db:generate <migration-name>');
  process.exit(1);
}

// Generate migration from schema diff
execSync(`drizzle-kit generate --name ${name}`, {
  stdio: 'inherit',
  cwd: import.meta.dirname,
});

console.log(`\n✓ Migration generated: ${name}`);
console.log('Review the generated SQL before applying.');
```

### Apply Migrations

```typescript
// packages/shared/db/scripts/migrate.ts
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const environment = process.argv[2] || 'local';
const product = process.argv[3];

interface MigrationOptions {
  local: boolean;
  databaseName?: string;
}

function getMigrations(): string[] {
  const migrationsDir = join(import.meta.dirname, '../migrations');

  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort(); // Lexicographic sort ensures order
}

async function applyMigration(
  sqlFile: string,
  options: MigrationOptions
): Promise<void> {
  const sql = readFileSync(sqlFile, 'utf-8');

  if (options.local) {
    // Apply to local D1
    execSync(`wrangler d1 execute ${options.databaseName} --local --file=${sqlFile}`, {
      stdio: 'inherit',
    });
  } else {
    // Apply to remote D1
    execSync(`wrangler d1 execute ${options.databaseName} --remote --file=${sqlFile}`, {
      stdio: 'inherit',
    });
  }
}

async function main() {
  const isLocal = environment === 'local';
  const databaseName = product ? `${product}-db` : 'app-db';

  console.log(`Applying migrations to ${databaseName} (${environment})...\n`);

  const migrations = getMigrations();

  for (const migration of migrations) {
    const migrationPath = join(import.meta.dirname, '../migrations', migration);
    console.log(`  Applying ${migration}...`);

    await applyMigration(migrationPath, {
      local: isLocal,
      databaseName,
    });

    console.log(`  ✓ ${migration}`);
  }

  console.log(`\n✓ All migrations applied (${migrations.length} total)`);
}

main().catch(console.error);
```

### Migration Best Practices

```sql
-- migrations/0001_add_users.sql

-- Always use IF NOT EXISTS for tables
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  email_verified INTEGER DEFAULT 0,
  name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Create indexes separately for better control
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);

-- Add comments for complex changes
-- This index supports the session lookup by user
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
```

### Additive-Only Migration Pattern

Since D1 doesn't support transactional DDL rollback, use **additive migrations**:

```sql
-- BAD: Destructive migration (can't rollback)
ALTER TABLE users DROP COLUMN old_field;

-- GOOD: Additive migration
-- Step 1: Add new column
ALTER TABLE users ADD COLUMN new_field TEXT;

-- Step 2: In code, write to both columns during transition
-- Step 3: After full deployment, stop reading old column
-- Step 4: In future migration, drop old column (when safe)
```

### Column Rename Pattern

```sql
-- migrations/0005_rename_user_name.sql

-- Step 1: Add new column
ALTER TABLE users ADD COLUMN display_name TEXT;

-- Step 2: Copy data (one-time backfill)
UPDATE users SET display_name = name WHERE display_name IS NULL;

-- Step 3: Make new column not null (if needed) in next migration
-- ALTER TABLE users ALTER COLUMN display_name SET NOT NULL;

-- Note: Keep 'name' column until all code uses 'display_name'
-- Then drop in a future migration
```

## Part 5: Rollback Strategy

### Rollback Migrations

Since D1 doesn't support automatic rollback, we generate inverse migrations:

```typescript
// packages/shared/db/scripts/rollback.ts
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const migrationName = process.argv[2];

if (!migrationName) {
  console.error('Usage: pnpm db:rollback <migration-name>');
  process.exit(1);
}

const migrationsDir = join(import.meta.dirname, '../migrations');
const rollbackDir = join(import.meta.dirname, '../rollbacks');

// Find the migration file
const migrationFile = `${migrationName}.sql`;
const migrationPath = join(migrationsDir, migrationFile);

if (!existsSync(migrationPath)) {
  console.error(`Migration not found: ${migrationFile}`);
  process.exit(1);
}

// Check for existing rollback
const rollbackPath = join(rollbackDir, `rollback_${migrationFile}`);

if (existsSync(rollbackPath)) {
  console.log(`Rollback exists: ${rollbackPath}`);
  console.log('\nTo apply rollback:');
  console.log(`  wrangler d1 execute <db-name> --file=${rollbackPath}`);
  process.exit(0);
}

// Parse migration and generate inverse operations
const sql = readFileSync(migrationPath, 'utf-8');
const rollbackStatements: string[] = [];

// Parse CREATE TABLE
const createTableRegex = /CREATE TABLE (?:IF NOT EXISTS )?(\w+)/gi;
let match;
while ((match = createTableRegex.exec(sql)) !== null) {
  rollbackStatements.push(`DROP TABLE IF EXISTS ${match[1]};`);
}

// Parse CREATE INDEX
const createIndexRegex = /CREATE (?:UNIQUE )?INDEX (?:IF NOT EXISTS )?(\w+)/gi;
while ((match = createIndexRegex.exec(sql)) !== null) {
  rollbackStatements.push(`DROP INDEX IF EXISTS ${match[1]};`);
}

// Parse ALTER TABLE ADD COLUMN
const addColumnRegex = /ALTER TABLE (\w+) ADD COLUMN (\w+)/gi;
while ((match = addColumnRegex.exec(sql)) !== null) {
  // SQLite doesn't support DROP COLUMN directly in older versions
  // For D1, we can use it
  rollbackStatements.push(`ALTER TABLE ${match[1]} DROP COLUMN ${match[2]};`);
}

if (rollbackStatements.length === 0) {
  console.error('Could not generate rollback statements. Create manually.');
  process.exit(1);
}

// Write rollback file
const rollbackContent = `-- Rollback for ${migrationFile}
-- Generated: ${new Date().toISOString()}
-- WARNING: Review before applying!

${rollbackStatements.join('\n')}
`;

writeFileSync(rollbackPath, rollbackContent);
console.log(`✓ Rollback generated: ${rollbackPath}`);
console.log('\nTo apply rollback:');
console.log(`  wrangler d1 execute <db-name> --file=${rollbackPath}`);
```

### Manual Rollback Template

```sql
-- rollbacks/rollback_0005_rename_user_name.sql

-- Inverse of: Add display_name column
-- Note: This will lose data in display_name!

-- Step 1: Ensure 'name' has latest data
UPDATE users SET name = display_name WHERE display_name IS NOT NULL;

-- Step 2: Drop the new column
ALTER TABLE users DROP COLUMN display_name;
```

### Emergency Rollback Procedure

```bash
# 1. Identify the problematic migration
ls packages/shared/db/migrations/

# 2. Check if rollback exists
ls packages/shared/db/rollbacks/

# 3. If not, generate it
pnpm --filter @resist/db db:rollback 0005_rename_user_name

# 4. Review the rollback SQL
cat packages/shared/db/rollbacks/rollback_0005_rename_user_name.sql

# 5. Apply to staging first
wrangler d1 execute tastier-staging-db --remote \
  --file=packages/shared/db/rollbacks/rollback_0005_rename_user_name.sql

# 6. Verify staging works

# 7. Apply to production
wrangler d1 execute tastier-db --remote \
  --file=packages/shared/db/rollbacks/rollback_0005_rename_user_name.sql
```

## Part 6: Seeding

### Seed Data Structure

```typescript
// packages/shared/db/src/seed/data/users.ts
import type { NewUser } from '../../types';

export const seedUsers: NewUser[] = [
  {
    id: 'user_01HQXK5V5V5V5V5V5V5V5V5V5V',
    email: 'admin@example.com',
    emailVerified: true,
    name: 'Admin User',
    role: 'admin',
  },
  {
    id: 'user_02HQXK5V5V5V5V5V5V5V5V5V5V',
    email: 'user@example.com',
    emailVerified: true,
    name: 'Test User',
    role: 'user',
  },
];
```

### Factory Functions

```typescript
// packages/shared/db/src/seed/factories/user.ts
import { ulid } from 'ulid';
import type { NewUser } from '../../types';

export function createUser(overrides: Partial<NewUser> = {}): NewUser {
  return {
    id: `user_${ulid()}`,
    email: `user-${Math.random().toString(36).slice(2)}@example.com`,
    emailVerified: false,
    name: 'Test User',
    role: 'user',
    ...overrides,
  };
}

export function createUsers(count: number, overrides: Partial<NewUser> = {}): NewUser[] {
  return Array.from({ length: count }, () => createUser(overrides));
}
```

### Seed Runner

```typescript
// packages/shared/db/src/seed/index.ts
import type { Database } from '../index';
import { users, sessions } from '../schema';
import { seedUsers } from './data/users';

export interface SeedOptions {
  /** Clear existing data before seeding */
  clean?: boolean;
  /** Only seed if tables are empty */
  onlyEmpty?: boolean;
}

export async function seed(db: Database, options: SeedOptions = {}): Promise<void> {
  const { clean = false, onlyEmpty = true } = options;

  console.log('Starting database seed...\n');

  // Check if data exists
  if (onlyEmpty) {
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) {
      console.log('Database already has data. Skipping seed.');
      console.log('Use --clean to clear and reseed.');
      return;
    }
  }

  // Clean if requested
  if (clean) {
    console.log('Cleaning existing data...');
    await db.delete(sessions);
    await db.delete(users);
    console.log('  ✓ Data cleared\n');
  }

  // Seed users
  console.log('Seeding users...');
  await db.insert(users).values(seedUsers);
  console.log(`  ✓ ${seedUsers.length} users created`);

  // Add more seed operations here

  console.log('\n✓ Seed complete');
}

export async function seedWithFactories(
  db: Database,
  counts: { users?: number } = {}
): Promise<void> {
  const { createUsers } = await import('./factories/user');

  if (counts.users) {
    const fakeUsers = createUsers(counts.users);
    await db.insert(users).values(fakeUsers);
    console.log(`  ✓ ${counts.users} fake users created`);
  }
}
```

### Seed Script

```typescript
// packages/shared/db/scripts/seed.ts
import { createDatabase } from '../src';
import { seed, seedWithFactories } from '../src/seed';

const environment = process.argv[2] || 'local';
const clean = process.argv.includes('--clean');
const count = parseInt(process.argv.find((a) => a.startsWith('--count='))?.split('=')[1] || '0');

async function main() {
  // For local dev, connect to local D1
  // For remote, use wrangler d1 execute with seed SQL

  if (environment === 'local') {
    // This requires running within wrangler context
    console.log('For local seeding, use:');
    console.log('  wrangler d1 execute <db-name> --local --file=seed.sql');
    console.log('\nOr run seed from your API worker in dev mode.');
    return;
  }

  // For remote seeding, we'd need to call the API or use D1 HTTP API
  console.log('Remote seeding should be done via API endpoint or CI/CD.');
}

main().catch(console.error);
```

### Seed SQL Generation

```typescript
// packages/shared/db/scripts/generate-seed-sql.ts
import { seedUsers } from '../src/seed/data/users';

function escapeValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
  return 'NULL';
}

function generateInsert(table: string, rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';

  const columns = Object.keys(rows[0]);
  const values = rows.map((row) =>
    `(${columns.map((col) => escapeValue(row[col])).join(', ')})`
  );

  return `INSERT INTO ${table} (${columns.join(', ')}) VALUES\n${values.join(',\n')};`;
}

// Generate seed.sql
const sql = `-- Auto-generated seed data
-- Generated: ${new Date().toISOString()}

${generateInsert('users', seedUsers)}
`;

console.log(sql);
```

## Part 7: Reset Script

```typescript
// packages/shared/db/scripts/reset.ts
import { execSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const environment = process.argv[2] || 'local';
const product = process.argv[3] || 'tastier';

const databaseName = `${product}-db`;
const isLocal = environment === 'local';
const flag = isLocal ? '--local' : '--remote';

console.log(`Resetting ${databaseName} (${environment})...\n`);

// Step 1: Get all tables
console.log('Step 1: Getting existing tables...');
const tablesResult = execSync(
  `wrangler d1 execute ${databaseName} ${flag} --json --command="SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'"`,
  { encoding: 'utf-8' }
);

const tables = JSON.parse(tablesResult);
const tableNames: string[] = tables[0]?.results?.map((r: { name: string }) => r.name) || [];

// Step 2: Drop all tables
if (tableNames.length > 0) {
  console.log(`Step 2: Dropping ${tableNames.length} tables...`);
  for (const table of tableNames) {
    execSync(
      `wrangler d1 execute ${databaseName} ${flag} --command="DROP TABLE IF EXISTS ${table}"`,
      { stdio: 'inherit' }
    );
  }
  console.log('  ✓ Tables dropped\n');
} else {
  console.log('Step 2: No tables to drop\n');
}

// Step 3: Apply migrations
console.log('Step 3: Applying migrations...');
const migrationsDir = join(import.meta.dirname, '../migrations');
const migrations = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

for (const migration of migrations) {
  const migrationPath = join(migrationsDir, migration);
  console.log(`  Applying ${migration}...`);
  execSync(
    `wrangler d1 execute ${databaseName} ${flag} --file=${migrationPath}`,
    { stdio: 'inherit' }
  );
}
console.log(`  ✓ ${migrations.length} migrations applied\n`);

// Step 4: Seed data
console.log('Step 4: Seeding data...');
const seedPath = join(import.meta.dirname, '../seed.sql');
try {
  execSync(
    `wrangler d1 execute ${databaseName} ${flag} --file=${seedPath}`,
    { stdio: 'inherit' }
  );
  console.log('  ✓ Seed data applied\n');
} catch {
  console.log('  ⚠ No seed.sql found, skipping\n');
}

console.log(`✓ Database reset complete: ${databaseName}`);
```

## Part 8: Drizzle Studio

```typescript
// packages/shared/db/scripts/studio.ts
import { execSync } from 'node:child_process';

const environment = process.argv[2] || 'local';

const config = environment === 'local'
  ? 'drizzle.local.config.ts'
  : 'drizzle.config.ts';

console.log(`Opening Drizzle Studio (${environment})...\n`);

execSync(`drizzle-kit studio --config=${config}`, {
  stdio: 'inherit',
  cwd: import.meta.dirname,
});
```

## Part 9: Package Configuration

### package.json

```json
{
  "name": "@resist/db",
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema/index.ts",
    "./types": "./src/types.ts",
    "./seed": "./src/seed/index.ts"
  },
  "scripts": {
    "db:generate": "tsx scripts/generate.ts",
    "db:migrate": "tsx scripts/migrate.ts",
    "db:migrate:local": "tsx scripts/migrate.ts local",
    "db:migrate:staging": "tsx scripts/migrate.ts staging",
    "db:migrate:prod": "tsx scripts/migrate.ts prod",
    "db:seed": "tsx scripts/seed.ts",
    "db:seed:sql": "tsx scripts/generate-seed-sql.ts > seed.sql",
    "db:reset": "tsx scripts/reset.ts",
    "db:reset:local": "tsx scripts/reset.ts local",
    "db:rollback": "tsx scripts/rollback.ts",
    "db:studio": "tsx scripts/studio.ts",
    "db:studio:local": "tsx scripts/studio.ts local",
    "db:push": "drizzle-kit push",
    "db:check": "drizzle-kit check"
  },
  "dependencies": {
    "drizzle-orm": "^0.29.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.20.0",
    "tsx": "^4.7.0",
    "ulid": "^2.3.0"
  },
  "peerDependencies": {
    "@cloudflare/workers-types": "^4.0.0"
  }
}
```

### Root Scripts

```json
{
  "scripts": {
    "db:generate": "pnpm --filter @resist/db db:generate",
    "db:migrate": "pnpm --filter @resist/db db:migrate",
    "db:migrate:local": "pnpm --filter @resist/db db:migrate:local",
    "db:seed": "pnpm --filter @resist/db db:seed",
    "db:reset": "pnpm --filter @resist/db db:reset",
    "db:studio": "pnpm --filter @resist/db db:studio"
  }
}
```

## Part 10: CI/CD Integration

### Migration Check Workflow

```yaml
# .github/workflows/db.yml
name: Database

on:
  pull_request:
    paths:
      - 'packages/shared/db/**'
  push:
    branches: [main]
    paths:
      - 'packages/shared/db/**'

jobs:
  validate:
    name: Validate Schema
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Check schema
        run: pnpm --filter @resist/db db:check

      - name: Generate migrations (dry run)
        run: pnpm --filter @resist/db db:generate dry-run

  migrate-staging:
    name: Migrate Staging
    runs-on: ubuntu-latest
    needs: validate
    if: github.ref == 'refs/heads/main'
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Apply migrations to staging
        run: pnpm --filter @resist/db db:migrate staging
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

### Migration in Deploy Workflow

```yaml
# .github/workflows/deploy.yml (relevant section)
jobs:
  deploy:
    steps:
      # ... checkout, setup ...

      - name: Apply database migrations
        run: |
          pnpm --filter @resist/db db:migrate ${{ inputs.environment }}
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

      - name: Deploy workers
        run: |
          # Deploy after migrations succeed
          pnpm deploy:${{ inputs.environment }}
```

## Part 11: Local Development

### Wrangler Configuration

```toml
# packages/products/tastier/api/wrangler.toml

name = "tastier-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "tastier-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# Local D1 uses this for persistence
[env.development]
[[env.development.d1_databases]]
binding = "DB"
database_name = "tastier-db"
database_id = "local"
```

### Dev Workflow

```bash
# 1. Start local D1 (happens automatically with wrangler dev)
pnpm dev:api --product=tastier

# 2. In another terminal, apply migrations to local D1
pnpm db:migrate:local tastier

# 3. Seed local database
wrangler d1 execute tastier-db --local --file=packages/shared/db/seed.sql

# 4. Open Drizzle Studio to inspect
pnpm db:studio:local

# 5. Reset if needed
pnpm db:reset:local tastier
```

## Part 12: Query Patterns

### Common Queries

```typescript
// packages/products/tastier/api/src/repositories/user.ts
import { eq, and, gt, desc, sql } from 'drizzle-orm';
import { users, sessions } from '@resist/db';
import type { Database, User, NewUser, UpdateUser } from '@resist/db';

export class UserRepository {
  constructor(private db: Database) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.db.query.users.findFirst({
      where: eq(users.id, id),
    });
    return result ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });
    return result ?? null;
  }

  async findWithSessions(id: string): Promise<(User & { sessions: Session[] }) | null> {
    const result = await this.db.query.users.findFirst({
      where: eq(users.id, id),
      with: {
        sessions: {
          where: gt(sessions.expiresAt, new Date()),
          orderBy: desc(sessions.createdAt),
        },
      },
    });
    return result ?? null;
  }

  async create(data: NewUser): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values({
        ...data,
        email: data.email.toLowerCase(),
      })
      .returning();
    return user;
  }

  async update(id: string, data: UpdateUser): Promise<User | null> {
    const [user] = await this.db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(users)
      .where(eq(users.id, id));
    return result.rowsAffected > 0;
  }

  async count(): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    return count;
  }
}
```

### Transaction Pattern

```typescript
// D1 supports transactions via batch
async function createUserWithSession(
  db: Database,
  userData: NewUser,
  sessionData: NewSession
): Promise<{ user: User; session: Session }> {
  // D1 batch executes all statements in a transaction
  const results = await db.batch([
    db.insert(users).values(userData).returning(),
    db.insert(sessions).values(sessionData).returning(),
  ]);

  return {
    user: results[0][0],
    session: results[1][0],
  };
}
```

## Summary

| Feature | Implementation |
|---------|----------------|
| ORM | Drizzle (type-safe, lightweight) |
| Schema location | `packages/shared/db/src/schema/` |
| Migrations | Drizzle Kit generated SQL |
| Rollback | Generated inverse migrations |
| Seeding | Factory functions + SQL generation |
| Local dev | Wrangler local D1 (Miniflare) |
| Studio | `drizzle-kit studio` |
| CI/CD | Validate on PR, migrate on deploy |

## Implementation Order

1. **Day 1**: Schema setup, Drizzle config, basic tables
2. **Day 2**: Migration scripts, generate/apply workflow
3. **Day 3**: Seed system, factories, SQL generation
4. **Day 4**: Rollback strategy, reset script
5. **Day 5**: CI/CD integration, staging migrations
6. **Day 6**: Repository patterns, query helpers
7. **Day 7**: Documentation, testing with local D1
