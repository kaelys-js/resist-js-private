# Documentation System Plan

> Unified documentation at `docs.<product>.tld` - fully automated, Stripe-quality

## Overview

A comprehensive documentation system that auto-generates API docs, component docs, database schemas, and code references. Runs under `docs.<product>.tld` with product switching, search, i18n, and versioning.

## Tech Stack

| Component | Tool | Rationale |
|-----------|------|-----------|
| Framework | Starlight (Astro) | Best-in-class docs, fast, great DX |
| API Docs | Valibot → OpenAPI + Scalar | Type-safe, beautiful UI |
| Component Docs | Histoire | Native Svelte 5 support |
| Code Docs | TypeDoc | Standard TS documentation |
| DB Schemas | Drizzle → ERD | Auto-generated from schema |
| Search | Pagefind | Local, fast, no external deps |
| Versioning | Branch/tag based | Simple, git-native |
| i18n | Starlight built-in | Multi-language support |

## Architecture

```
docs/
├── astro.config.mjs           # Starlight config
├── package.json
├── src/
│   ├── content/
│   │   ├── docs/
│   │   │   ├── en/            # English (default)
│   │   │   │   ├── index.mdx
│   │   │   │   ├── getting-started/
│   │   │   │   ├── guides/
│   │   │   │   ├── api/       # Generated API docs
│   │   │   │   ├── components/ # Generated component docs
│   │   │   │   ├── database/  # Generated DB docs
│   │   │   │   └── reference/ # Generated code docs
│   │   │   └── es/            # Spanish (example)
│   │   └── config.ts
│   ├── components/
│   │   ├── ProductSwitcher.astro
│   │   ├── ApiPlayground.astro
│   │   └── SchemaViewer.astro
│   └── styles/
│       └── custom.css
├── public/
│   └── assets/
└── scripts/
    ├── generate-api-docs.ts    # Valibot → OpenAPI → MDX
    ├── generate-component-docs.ts
    ├── generate-db-docs.ts
    ├── generate-code-docs.ts
    └── build-all.ts
```

## Part 1: Starlight Setup

### Installation

```bash
# In docs/ package
pnpm add astro @astrojs/starlight @astrojs/svelte
pnpm add -D @types/node
```

### Configuration

```typescript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import svelte from '@astrojs/svelte';

export default defineConfig({
  integrations: [
    starlight({
      title: 'resist.js Docs',
      logo: {
        src: './src/assets/logo.svg',
      },
      social: {
        github: 'https://github.com/resist-js/resist.js',
      },
      locales: {
        root: { label: 'English', lang: 'en' },
        es: { label: 'Español', lang: 'es' },
        // Add more as needed
      },
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', link: '/getting-started/' },
            { label: 'Installation', link: '/getting-started/installation/' },
            { label: 'Quick Start', link: '/getting-started/quick-start/' },
          ],
        },
        {
          label: 'Guides',
          autogenerate: { directory: 'guides' },
        },
        {
          label: 'API Reference',
          collapsed: true,
          autogenerate: { directory: 'api' },
        },
        {
          label: 'Components',
          collapsed: true,
          autogenerate: { directory: 'components' },
        },
        {
          label: 'Database',
          collapsed: true,
          autogenerate: { directory: 'database' },
        },
        {
          label: 'Code Reference',
          collapsed: true,
          autogenerate: { directory: 'reference' },
        },
      ],
      customCss: ['./src/styles/custom.css'],
      components: {
        // Override header to add product switcher
        Header: './src/components/Header.astro',
      },
    }),
    svelte(),
  ],
  output: 'static',
  adapter: cloudflare(),
});
```

### Product Switcher Component

```astro
<!-- src/components/ProductSwitcher.astro -->
---
const products = [
  { id: 'tastier', name: 'Tastier', url: 'https://docs.tastier.app' },
  { id: 'cherishall', name: 'Cherishall', url: 'https://docs.cherishall.app' },
];
const currentProduct = Astro.url.hostname.split('.')[1] || 'tastier';
---

<div class="product-switcher">
  <select onchange="window.location.href = this.value">
    {products.map((p) => (
      <option value={p.url} selected={p.id === currentProduct}>
        {p.name}
      </option>
    ))}
  </select>
</div>

<style>
  .product-switcher select {
    background: var(--sl-color-bg-nav);
    color: var(--sl-color-text);
    border: 1px solid var(--sl-color-gray-5);
    border-radius: 0.25rem;
    padding: 0.25rem 0.5rem;
    font-size: 0.875rem;
  }
</style>
```

## Part 2: API Documentation

### Strategy: Flexible OpenAPI Generation

Generate OpenAPI specs from Valibot schemas where possible, with manual YAML fallback for complex cases. Render with Scalar UI embedded in Starlight.

### Valibot → OpenAPI Converter

```typescript
// scripts/generate-api-docs.ts
import * as v from 'valibot';
import { glob } from 'glob';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import path from 'path';
import YAML from 'yaml';

interface RouteDefinition {
  method: string;
  path: string;
  summary?: string;
  description?: string;
  requestSchema?: string;
  responseSchema?: string;
  tags?: string[];
}

interface OpenAPISpec {
  openapi: string;
  info: { title: string; version: string; description?: string };
  servers: { url: string; description: string }[];
  paths: Record<string, Record<string, unknown>>;
  components: { schemas: Record<string, unknown> };
}

// Convert Valibot schema to JSON Schema
function valibotToJsonSchema(schema: unknown): Record<string, unknown> {
  if (!schema || typeof schema !== 'object') {
    return { type: 'object' };
  }

  const s = schema as { type?: string; entries?: unknown; options?: unknown };

  switch (s.type) {
    case 'string':
      return { type: 'string' };
    case 'number':
      return { type: 'number' };
    case 'boolean':
      return { type: 'boolean' };
    case 'array':
      return {
        type: 'array',
        items: valibotToJsonSchema((s as { item?: unknown }).item)
      };
    case 'object':
    case 'strict_object':
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      if (s.entries && typeof s.entries === 'object') {
        for (const [key, value] of Object.entries(s.entries)) {
          properties[key] = valibotToJsonSchema(value);
          // Check if required (not optional/nullable)
          const v = value as { type?: string };
          if (v.type !== 'optional' && v.type !== 'nullable') {
            required.push(key);
          }
        }
      }

      return { type: 'object', properties, required };
    case 'union':
    case 'variant':
      return {
        oneOf: ((s.options as unknown[]) || []).map(valibotToJsonSchema)
      };
    case 'literal':
      return { const: (s as { value: unknown }).value };
    case 'optional':
    case 'nullable':
      return valibotToJsonSchema((s as { wrapped?: unknown }).wrapped);
    default:
      return { type: 'object' };
  }
}

// Parse route handlers from Worker source
async function parseWorkerRoutes(workerPath: string): Promise<RouteDefinition[]> {
  const routes: RouteDefinition[] = [];
  const content = await readFile(workerPath, 'utf-8');

  // Parse TypeScript/JavaScript
  const ast = parse(content, {
    sourceType: 'module',
    plugins: ['typescript'],
  });

  // Extract route definitions
  // This handles common patterns like:
  // - router.get('/path', handler)
  // - if (url.pathname === '/path' && request.method === 'GET')
  // - switch/case routing

  traverse(ast, {
    CallExpression(path) {
      const callee = path.node.callee;

      // Pattern: router.get('/path', ...)
      if (callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          ['get', 'post', 'put', 'patch', 'delete'].includes(callee.property.name)) {
        const method = callee.property.name.toUpperCase();
        const pathArg = path.node.arguments[0];

        if (pathArg?.type === 'StringLiteral') {
          routes.push({
            method,
            path: pathArg.value,
          });
        }
      }
    },

    // Extract JSDoc comments for descriptions
    enter(path) {
      const leadingComments = path.node.leadingComments;
      if (leadingComments) {
        for (const comment of leadingComments) {
          if (comment.type === 'CommentBlock' && comment.value.includes('@api')) {
            // Parse JSDoc-style API annotations
            const lines = comment.value.split('\n');
            let currentRoute: Partial<RouteDefinition> = {};

            for (const line of lines) {
              const trimmed = line.replace(/^\s*\*\s*/, '').trim();

              if (trimmed.startsWith('@api')) {
                const match = trimmed.match(/@api\s+(\w+)\s+(\S+)/);
                if (match) {
                  currentRoute.method = match[1].toUpperCase();
                  currentRoute.path = match[2];
                }
              } else if (trimmed.startsWith('@summary')) {
                currentRoute.summary = trimmed.replace('@summary', '').trim();
              } else if (trimmed.startsWith('@description')) {
                currentRoute.description = trimmed.replace('@description', '').trim();
              } else if (trimmed.startsWith('@request')) {
                currentRoute.requestSchema = trimmed.replace('@request', '').trim();
              } else if (trimmed.startsWith('@response')) {
                currentRoute.responseSchema = trimmed.replace('@response', '').trim();
              } else if (trimmed.startsWith('@tag')) {
                currentRoute.tags = currentRoute.tags || [];
                currentRoute.tags.push(trimmed.replace('@tag', '').trim());
              }
            }

            if (currentRoute.method && currentRoute.path) {
              routes.push(currentRoute as RouteDefinition);
            }
          }
        }
      }
    },
  });

  return routes;
}

// Load Valibot schemas from types package
async function loadSchemas(typesPath: string): Promise<Map<string, unknown>> {
  const schemas = new Map<string, unknown>();
  const files = await glob(`${typesPath}/**/*.ts`);

  for (const file of files) {
    try {
      // Dynamic import the schema module
      const module = await import(file);

      for (const [name, value] of Object.entries(module)) {
        if (name.endsWith('Schema') && value && typeof value === 'object') {
          schemas.set(name, value);
        }
      }
    } catch {
      // Skip files that can't be imported
    }
  }

  return schemas;
}

// Generate OpenAPI spec for a product
async function generateOpenAPI(product: string): Promise<OpenAPISpec> {
  const productPath = `packages/products/${product}`;
  const apiPath = `${productPath}/api/src`;
  const typesPath = 'packages/shared/types/src';

  // Load schemas
  const schemas = await loadSchemas(typesPath);

  // Parse routes from worker files
  const workerFiles = await glob(`${apiPath}/**/*.ts`);
  const allRoutes: RouteDefinition[] = [];

  for (const file of workerFiles) {
    const routes = await parseWorkerRoutes(file);
    allRoutes.push(...routes);
  }

  // Check for manual OpenAPI overrides
  const manualPath = `${productPath}/api/openapi.yaml`;
  let manualSpec: Partial<OpenAPISpec> = {};
  try {
    const manualContent = await readFile(manualPath, 'utf-8');
    manualSpec = YAML.parse(manualContent);
  } catch {
    // No manual overrides
  }

  // Build OpenAPI spec
  const spec: OpenAPISpec = {
    openapi: '3.1.0',
    info: {
      title: `${product} API`,
      version: '1.0.0',
      description: manualSpec.info?.description || `API documentation for ${product}`,
    },
    servers: [
      { url: `https://api.${product}.app`, description: 'Production' },
      { url: `https://api.${product}-staging.app`, description: 'Staging' },
      { url: `https://api.${product}.localhost`, description: 'Local Development' },
    ],
    paths: {},
    components: { schemas: {} },
  };

  // Add routes to paths
  for (const route of allRoutes) {
    if (!spec.paths[route.path]) {
      spec.paths[route.path] = {};
    }

    const operation: Record<string, unknown> = {
      summary: route.summary || `${route.method} ${route.path}`,
      description: route.description,
      tags: route.tags || [route.path.split('/')[1] || 'default'],
      responses: {
        '200': {
          description: 'Successful response',
        },
      },
    };

    // Add request body if schema specified
    if (route.requestSchema && schemas.has(route.requestSchema)) {
      const jsonSchema = valibotToJsonSchema(schemas.get(route.requestSchema));
      spec.components.schemas[route.requestSchema] = jsonSchema;

      operation.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/${route.requestSchema}` },
          },
        },
      };
    }

    // Add response schema if specified
    if (route.responseSchema && schemas.has(route.responseSchema)) {
      const jsonSchema = valibotToJsonSchema(schemas.get(route.responseSchema));
      spec.components.schemas[route.responseSchema] = jsonSchema;

      operation.responses['200'] = {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/${route.responseSchema}` },
          },
        },
      };
    }

    spec.paths[route.path][route.method.toLowerCase()] = operation;
  }

  // Merge manual overrides (manual takes precedence)
  if (manualSpec.paths) {
    for (const [path, methods] of Object.entries(manualSpec.paths)) {
      spec.paths[path] = { ...spec.paths[path], ...methods };
    }
  }

  if (manualSpec.components?.schemas) {
    spec.components.schemas = { ...spec.components.schemas, ...manualSpec.components.schemas };
  }

  return spec;
}

// Generate MDX documentation from OpenAPI
async function generateApiMdx(spec: OpenAPISpec, outputDir: string): Promise<void> {
  await mkdir(outputDir, { recursive: true });

  // Write OpenAPI spec as JSON for Scalar
  await writeFile(
    path.join(outputDir, 'openapi.json'),
    JSON.stringify(spec, null, 2)
  );

  // Generate index page with embedded Scalar
  const indexMdx = `---
title: API Reference
description: Complete API documentation
---

import { Scalar } from '@/components/Scalar.astro';

<Scalar specUrl="./openapi.json" />

## Endpoints

${Object.entries(spec.paths)
  .map(([path, methods]) => {
    const methodList = Object.keys(methods as object)
      .filter(m => ['get', 'post', 'put', 'patch', 'delete'].includes(m))
      .map(m => `\`${m.toUpperCase()}\``)
      .join(' ');
    return `- **${path}** - ${methodList}`;
  })
  .join('\n')}
`;

  await writeFile(path.join(outputDir, 'index.mdx'), indexMdx);

  // Generate individual endpoint pages
  for (const [routePath, methods] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(methods as Record<string, Record<string, unknown>>)) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;

      const slug = `${method}-${routePath.replace(/\//g, '-').replace(/^-/, '').replace(/-$/, '') || 'root'}`;
      const mdx = `---
title: ${method.toUpperCase()} ${routePath}
description: ${(operation.summary as string) || ''}
---

## ${method.toUpperCase()} ${routePath}

${(operation.description as string) || ''}

### Request

${operation.requestBody ? `
\`\`\`json
// Request body schema
${JSON.stringify((operation.requestBody as Record<string, unknown>).content?.['application/json']?.schema || {}, null, 2)}
\`\`\`
` : 'No request body required.'}

### Response

\`\`\`json
// Response schema
${JSON.stringify(((operation.responses as Record<string, unknown>)?.['200'] as Record<string, unknown>)?.content?.['application/json']?.schema || { type: 'object' }, null, 2)}
\`\`\`
`;

      await writeFile(path.join(outputDir, `${slug}.mdx`), mdx);
    }
  }
}

// Main execution
async function main() {
  const products = ['tastier', 'cherishall']; // Add more as needed

  for (const product of products) {
    console.log(`Generating API docs for ${product}...`);

    const spec = await generateOpenAPI(product);
    const outputDir = `docs/src/content/docs/en/api/${product}`;

    await generateApiMdx(spec, outputDir);

    console.log(`  Generated ${Object.keys(spec.paths).length} endpoints`);
  }
}

main().catch(console.error);
```

### JSDoc Annotations for Routes

```typescript
// Example: packages/products/tastier/api/src/handlers/users.ts

/**
 * @api GET /users
 * @summary List all users
 * @description Returns a paginated list of users
 * @response UserListResponseSchema
 * @tag users
 */
export async function listUsers(request: Request, env: Env): Promise<Response> {
  // Implementation
}

/**
 * @api POST /users
 * @summary Create a new user
 * @description Creates a new user account
 * @request CreateUserRequestSchema
 * @response UserResponseSchema
 * @tag users
 */
export async function createUser(request: Request, env: Env): Promise<Response> {
  // Implementation
}
```

### Scalar Component

```astro
<!-- src/components/Scalar.astro -->
---
interface Props {
  specUrl: string;
}

const { specUrl } = Astro.props;
---

<div id="scalar-api-reference"></div>

<script define:vars={{ specUrl }}>
  import { createApiReference } from '@scalar/api-reference';

  createApiReference('#scalar-api-reference', {
    spec: { url: specUrl },
    theme: 'default',
    hideDownloadButton: false,
    showSidebar: true,
  });
</script>

<style>
  #scalar-api-reference {
    min-height: 80vh;
  }
</style>
```

## Part 3: Component Documentation (Histoire)

### Setup

```bash
# In packages/shared/ui/
pnpm add -D histoire @histoire/plugin-svelte
```

### Configuration

```typescript
// packages/shared/ui/histoire.config.ts
import { defineConfig } from 'histoire';
import { HstSvelte } from '@histoire/plugin-svelte';

export default defineConfig({
  plugins: [HstSvelte()],
  setupFile: './src/histoire.setup.ts',
  outDir: './dist-histoire',
  vite: {
    base: '/components/',
  },
  theme: {
    title: 'resist.js Components',
    logo: {
      square: './src/assets/logo-square.svg',
      light: './src/assets/logo-light.svg',
      dark: './src/assets/logo-dark.svg',
    },
    colors: {
      primary: { 50: '#fef2f2', /* ... */ 900: '#7f1d1d' },
    },
  },
  tree: {
    groups: [
      { id: 'primitives', title: 'Primitives' },
      { id: 'forms', title: 'Form Controls' },
      { id: 'layout', title: 'Layout' },
      { id: 'feedback', title: 'Feedback' },
      { id: 'navigation', title: 'Navigation' },
    ],
  },
});
```

### Story Format

```svelte
<!-- packages/shared/ui/src/components/Button.story.svelte -->
<script lang="ts">
  import type { Hst } from '@histoire/plugin-svelte';
  import Button from './Button.svelte';

  export let Hst: Hst;
</script>

<Hst.Story title="Button" group="primitives">
  <Hst.Variant title="Default">
    <Button>Click me</Button>
  </Hst.Variant>

  <Hst.Variant title="Primary">
    <Button variant="primary">Primary</Button>
  </Hst.Variant>

  <Hst.Variant title="Destructive">
    <Button variant="destructive">Delete</Button>
  </Hst.Variant>

  <Hst.Variant title="Disabled">
    <Button disabled>Disabled</Button>
  </Hst.Variant>

  <Hst.Variant title="With Icon">
    <Button>
      <svg slot="icon" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/>
      </svg>
      Add Item
    </Button>
  </Hst.Variant>
</Hst.Story>
```

### Integration Script

```typescript
// scripts/generate-component-docs.ts
import { execSync } from 'child_process';
import { cp, writeFile, mkdir } from 'fs/promises';
import path from 'path';

async function generateComponentDocs(): Promise<void> {
  const uiPath = 'packages/shared/ui';
  const outputDir = 'docs/public/components';

  // Build Histoire
  console.log('Building Histoire...');
  execSync('pnpm histoire build', { cwd: uiPath, stdio: 'inherit' });

  // Copy to docs public folder
  await mkdir(outputDir, { recursive: true });
  await cp(`${uiPath}/dist-histoire`, outputDir, { recursive: true });

  // Generate MDX index page
  const indexMdx = `---
title: Component Library
description: Svelte 5 component documentation
---

The component library is built with Svelte 5 and documented using Histoire.

<iframe
  src="/components/"
  style="width: 100%; height: 80vh; border: 1px solid var(--sl-color-gray-5); border-radius: 0.5rem;"
  title="Component Library"
/>

## Quick Links

- [Primitives](/components/?story=primitives) - Buttons, inputs, typography
- [Form Controls](/components/?story=forms) - Form elements and validation
- [Layout](/components/?story=layout) - Grid, flex, spacing utilities
- [Feedback](/components/?story=feedback) - Alerts, toasts, modals
- [Navigation](/components/?story=navigation) - Menus, tabs, breadcrumbs
`;

  await writeFile('docs/src/content/docs/en/components/index.mdx', indexMdx);
}

generateComponentDocs().catch(console.error);
```

## Part 4: Database Documentation (Drizzle)

### ERD Generation

```typescript
// scripts/generate-db-docs.ts
import { glob } from 'glob';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  relations: RelationInfo[];
}

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  default?: string;
  references?: { table: string; column: string };
}

interface RelationInfo {
  name: string;
  type: 'one' | 'many';
  table: string;
  through?: string;
}

// Parse Drizzle schema files
async function parseDrizzleSchema(schemaPath: string): Promise<TableInfo[]> {
  const content = await readFile(schemaPath, 'utf-8');
  const tables: TableInfo[] = [];

  // Match sqliteTable definitions
  const tableRegex = /export const (\w+) = sqliteTable\(['"](\w+)['"],\s*\{([^}]+)\}/g;
  let match;

  while ((match = tableRegex.exec(content)) !== null) {
    const [, varName, tableName, columnsStr] = match;
    const columns: ColumnInfo[] = [];

    // Parse columns
    const columnRegex = /(\w+):\s*(text|integer|real|blob)\(['"]?(\w+)?['"]?\)([^,]*)/g;
    let colMatch;

    while ((colMatch = columnRegex.exec(columnsStr)) !== null) {
      const [, colName, colType, , modifiers] = colMatch;

      columns.push({
        name: colName,
        type: colType,
        nullable: !modifiers.includes('.notNull()'),
        primaryKey: modifiers.includes('.primaryKey()'),
        unique: modifiers.includes('.unique()'),
        default: modifiers.match(/\.default\(([^)]+)\)/)?.[1],
        references: modifiers.match(/\.references\(\(\) => (\w+)\.(\w+)\)/)
          ? {
              table: modifiers.match(/\.references\(\(\) => (\w+)\.(\w+)\)/)?.[1] || '',
              column: modifiers.match(/\.references\(\(\) => (\w+)\.(\w+)\)/)?.[2] || '',
            }
          : undefined,
      });
    }

    tables.push({
      name: tableName,
      columns,
      relations: [], // Parsed separately from relations()
    });
  }

  return tables;
}

// Generate Mermaid ERD
function generateMermaidERD(tables: TableInfo[]): string {
  let mermaid = 'erDiagram\n';

  for (const table of tables) {
    // Add table and columns
    mermaid += `    ${table.name} {\n`;
    for (const col of table.columns) {
      const pk = col.primaryKey ? 'PK' : '';
      const fk = col.references ? 'FK' : '';
      const nullable = col.nullable ? '' : '*';
      mermaid += `        ${col.type} ${col.name}${nullable} ${pk}${fk}\n`;
    }
    mermaid += '    }\n';

    // Add relationships
    for (const col of table.columns) {
      if (col.references) {
        mermaid += `    ${col.references.table} ||--o{ ${table.name} : "${col.name}"\n`;
      }
    }
  }

  return mermaid;
}

// Generate table documentation
function generateTableMdx(table: TableInfo): string {
  return `---
title: ${table.name}
description: Database table documentation
---

## Columns

| Name | Type | Nullable | Primary Key | Unique | Default | References |
|------|------|----------|-------------|--------|---------|------------|
${table.columns
  .map(
    (c) =>
      `| ${c.name} | ${c.type} | ${c.nullable ? 'Yes' : 'No'} | ${c.primaryKey ? 'Yes' : '-'} | ${c.unique ? 'Yes' : '-'} | ${c.default || '-'} | ${c.references ? `${c.references.table}.${c.references.column}` : '-'} |`
  )
  .join('\n')}

## Relationships

${table.relations.length > 0 ? table.relations.map((r) => `- **${r.name}**: ${r.type} to \`${r.table}\`${r.through ? ` through \`${r.through}\`` : ''}`).join('\n') : 'No relationships defined.'}

## Example Queries

\`\`\`typescript
import { db } from '@resist/db';
import { ${table.name} } from '@resist/db/schema';
import { eq } from 'drizzle-orm';

// Select all
const all${table.name} = await db.select().from(${table.name});

// Select with condition
const filtered = await db
  .select()
  .from(${table.name})
  .where(eq(${table.name}.id, 'some-id'));

// Insert
const inserted = await db
  .insert(${table.name})
  .values({ /* ... */ })
  .returning();

// Update
const updated = await db
  .update(${table.name})
  .set({ /* ... */ })
  .where(eq(${table.name}.id, 'some-id'))
  .returning();

// Delete
await db
  .delete(${table.name})
  .where(eq(${table.name}.id, 'some-id'));
\`\`\`
`;
}

async function main(): Promise<void> {
  const dbPath = 'packages/shared/db/src';
  const outputDir = 'docs/src/content/docs/en/database';

  await mkdir(outputDir, { recursive: true });

  // Find all schema files
  const schemaFiles = await glob(`${dbPath}/schema/**/*.ts`);
  const allTables: TableInfo[] = [];

  for (const file of schemaFiles) {
    const tables = await parseDrizzleSchema(file);
    allTables.push(...tables);
  }

  console.log(`Found ${allTables.length} tables`);

  // Generate ERD
  const mermaidERD = generateMermaidERD(allTables);

  // Generate index page
  const indexMdx = `---
title: Database Schema
description: D1 database documentation
---

## Entity Relationship Diagram

\`\`\`mermaid
${mermaidERD}
\`\`\`

## Tables

${allTables.map((t) => `- [${t.name}](./${t.name.toLowerCase()}/)`).join('\n')}

## Database Information

- **Database**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM
- **Migrations**: \`packages/shared/db/migrations/\`

## Connection

\`\`\`typescript
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@resist/db/schema';

// In Cloudflare Worker
export default {
  async fetch(request: Request, env: Env) {
    const db = drizzle(env.DB, { schema });
    // Use db...
  }
};
\`\`\`
`;

  await writeFile(path.join(outputDir, 'index.mdx'), indexMdx);

  // Generate individual table pages
  for (const table of allTables) {
    const tableDir = path.join(outputDir, table.name.toLowerCase());
    await mkdir(tableDir, { recursive: true });
    await writeFile(path.join(tableDir, 'index.mdx'), generateTableMdx(table));
  }
}

main().catch(console.error);
```

## Part 5: Code Documentation (TypeDoc)

### Configuration

```json
// typedoc.json
{
  "entryPoints": [
    "packages/shared/schemas/src/index.ts",
    "packages/shared/utils/src/index.ts",
    "packages/shared/types/src/index.ts",
    "packages/shared/db/src/index.ts"
  ],
  "entryPointStrategy": "expand",
  "out": "docs/public/reference",
  "plugin": ["typedoc-plugin-markdown"],
  "theme": "markdown",
  "readme": "none",
  "excludePrivate": true,
  "excludeProtected": true,
  "excludeInternal": true,
  "skipErrorChecking": true,
  "categoryOrder": ["Schemas", "Utilities", "Types", "Database", "*"],
  "navigationModel": {
    "excludeGroups": false,
    "excludeCategories": false,
    "excludeFolders": false
  }
}
```

### Generation Script

```typescript
// scripts/generate-code-docs.ts
import { execSync } from 'child_process';
import { glob } from 'glob';
import { readFile, writeFile, mkdir, readdir, cp } from 'fs/promises';
import path from 'path';

async function generateCodeDocs(): Promise<void> {
  const outputDir = 'docs/src/content/docs/en/reference';

  // Run TypeDoc
  console.log('Running TypeDoc...');
  execSync('pnpm typedoc --options typedoc.json', { stdio: 'inherit' });

  // Copy generated markdown to Starlight content
  await mkdir(outputDir, { recursive: true });

  const sourceDir = 'docs/public/reference';
  const files = await glob(`${sourceDir}/**/*.md`);

  for (const file of files) {
    const relativePath = path.relative(sourceDir, file);
    const destPath = path.join(outputDir, relativePath.replace('.md', '.mdx'));

    await mkdir(path.dirname(destPath), { recursive: true });

    // Read and transform for Starlight
    let content = await readFile(file, 'utf-8');

    // Add frontmatter if not present
    if (!content.startsWith('---')) {
      const title = path.basename(file, '.md').replace(/-/g, ' ');
      content = `---
title: ${title}
description: Code reference documentation
---

${content}`;
    }

    await writeFile(destPath, content);
  }

  // Generate index
  const packages = ['schemas', 'utils', 'types', 'db'];
  const indexMdx = `---
title: Code Reference
description: TypeScript API documentation
---

Generated API documentation for shared packages.

## Packages

${packages.map((pkg) => `- [@resist/${pkg}](./${pkg}/)`).join('\n')}

## Documentation Standards

All exported functions, classes, and types should include JSDoc comments:

\`\`\`typescript
/**
 * Validates an email address
 * @param email - The email to validate
 * @returns True if valid, false otherwise
 * @example
 * isValidEmail('user@example.com') // true
 * isValidEmail('invalid') // false
 */
export function isValidEmail(email: string): boolean {
  // ...
}
\`\`\`
`;

  await writeFile(path.join(outputDir, 'index.mdx'), indexMdx);
}

generateCodeDocs().catch(console.error);
```

## Part 6: Search (Pagefind)

### Integration

```typescript
// astro.config.mjs (updated)
import pagefind from 'astro-pagefind';

export default defineConfig({
  integrations: [
    starlight({ /* ... */ }),
    pagefind(),
  ],
  // ...
});
```

### Build Integration

```bash
# After Astro build, Pagefind indexes the static output
npx pagefind --site dist
```

### Search UI

Starlight has built-in search, but Pagefind provides better results:

```astro
<!-- src/components/Search.astro -->
<link href="/pagefind/pagefind-ui.css" rel="stylesheet">
<div id="search"></div>
<script>
  import { PagefindUI } from '@pagefind/default-ui';

  new PagefindUI({
    element: '#search',
    showImages: false,
    showSubResults: true,
    translations: {
      placeholder: 'Search documentation...',
      zero_results: 'No results for [SEARCH_TERM]',
    },
  });
</script>
```

## Part 7: Versioning

### Branch-Based Strategy

```
main          → docs.product.app (latest)
release/v1    → docs.product.app/v1
release/v2    → docs.product.app/v2
```

### Build Script

```typescript
// scripts/build-versioned-docs.ts
import { execSync } from 'child_process';
import { mkdir, writeFile } from 'fs/promises';

interface Version {
  name: string;
  branch: string;
  path: string;
}

const versions: Version[] = [
  { name: 'Latest', branch: 'main', path: '/' },
  { name: 'v2', branch: 'release/v2', path: '/v2/' },
  { name: 'v1', branch: 'release/v1', path: '/v1/' },
];

async function buildVersionedDocs(): Promise<void> {
  const currentBranch = execSync('git branch --show-current').toString().trim();

  for (const version of versions) {
    console.log(`Building ${version.name} from ${version.branch}...`);

    // Checkout version branch
    execSync(`git checkout ${version.branch}`);

    // Build docs
    execSync('pnpm --filter docs build', { stdio: 'inherit' });

    // Copy to versioned output
    const outputDir = `dist${version.path}`;
    await mkdir(outputDir, { recursive: true });
    execSync(`cp -r docs/dist/* ${outputDir}`);
  }

  // Generate version switcher data
  const versionData = versions.map((v) => ({
    name: v.name,
    path: v.path,
    current: v.branch === currentBranch,
  }));

  await writeFile('dist/versions.json', JSON.stringify(versionData, null, 2));

  // Return to original branch
  execSync(`git checkout ${currentBranch}`);
}

buildVersionedDocs().catch(console.error);
```

### Version Switcher Component

```astro
<!-- src/components/VersionSwitcher.astro -->
---
const response = await fetch('/versions.json');
const versions = await response.json();
const currentPath = Astro.url.pathname;
---

<div class="version-switcher">
  <select onchange="window.location.href = this.value + window.location.pathname.replace(/^\/v\\d+/, '')">
    {versions.map((v) => (
      <option value={v.path} selected={currentPath.startsWith(v.path)}>
        {v.name}
      </option>
    ))}
  </select>
</div>
```

## Part 8: i18n

### Starlight i18n Config

```typescript
// astro.config.mjs
export default defineConfig({
  integrations: [
    starlight({
      locales: {
        root: {
          label: 'English',
          lang: 'en',
        },
        es: {
          label: 'Español',
          lang: 'es',
        },
        fr: {
          label: 'Français',
          lang: 'fr',
        },
        de: {
          label: 'Deutsch',
          lang: 'de',
        },
        ja: {
          label: '日本語',
          lang: 'ja',
        },
        zh: {
          label: '中文',
          lang: 'zh',
        },
      },
      defaultLocale: 'root',
    }),
  ],
});
```

### Content Structure

```
src/content/docs/
├── en/           # English (default, maps to root)
│   ├── index.mdx
│   ├── getting-started/
│   └── ...
├── es/           # Spanish
│   ├── index.mdx
│   ├── getting-started/
│   └── ...
└── fr/           # French
    ├── index.mdx
    └── ...
```

### Translation Workflow

```typescript
// scripts/check-translations.ts
import { glob } from 'glob';
import { readFile } from 'fs/promises';
import path from 'path';

const DEFAULT_LOCALE = 'en';
const LOCALES = ['es', 'fr', 'de', 'ja', 'zh'];

async function checkTranslations(): Promise<void> {
  const docsDir = 'docs/src/content/docs';

  // Get all default locale files
  const defaultFiles = await glob(`${docsDir}/${DEFAULT_LOCALE}/**/*.mdx`);

  const missing: Record<string, string[]> = {};

  for (const locale of LOCALES) {
    missing[locale] = [];

    for (const file of defaultFiles) {
      const relativePath = path.relative(`${docsDir}/${DEFAULT_LOCALE}`, file);
      const translatedPath = path.join(docsDir, locale, relativePath);

      try {
        await readFile(translatedPath);
      } catch {
        missing[locale].push(relativePath);
      }
    }
  }

  // Report
  console.log('Translation Status:\n');

  for (const [locale, files] of Object.entries(missing)) {
    const total = defaultFiles.length;
    const translated = total - files.length;
    const percentage = Math.round((translated / total) * 100);

    console.log(`${locale}: ${translated}/${total} (${percentage}%)`);

    if (files.length > 0 && files.length <= 10) {
      console.log('  Missing:');
      files.forEach((f) => console.log(`    - ${f}`));
    } else if (files.length > 10) {
      console.log(`  Missing ${files.length} files`);
    }

    console.log();
  }
}

checkTranslations().catch(console.error);
```

## Part 9: CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/docs.yml
name: Documentation

on:
  push:
    branches: [main]
    paths:
      - 'docs/**'
      - 'packages/shared/**'
      - 'packages/products/**/api/**'
      - '.github/workflows/docs.yml'
  pull_request:
    branches: [main]
    paths:
      - 'docs/**'
      - 'packages/shared/**'

jobs:
  generate:
    name: Generate Documentation
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Generate API docs
        run: pnpm --filter docs generate:api

      - name: Generate component docs
        run: pnpm --filter docs generate:components

      - name: Generate database docs
        run: pnpm --filter docs generate:db

      - name: Generate code docs
        run: pnpm --filter docs generate:code

      - name: Build documentation
        run: pnpm --filter docs build

      - name: Index with Pagefind
        run: npx pagefind --site docs/dist

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: docs/dist

  deploy:
    name: Deploy to Cloudflare Pages
    needs: generate
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    steps:
      - name: Download artifact
        uses: actions/download-artifact@v4
        with:
          name: github-pages
          path: dist

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: docs
          directory: dist
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}

  check-translations:
    name: Check Translation Coverage
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Check translations
        run: pnpm --filter docs check:translations
```

### Package.json Scripts

```json
{
  "name": "@resist/docs",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "generate": "pnpm generate:api && pnpm generate:components && pnpm generate:db && pnpm generate:code",
    "generate:api": "tsx scripts/generate-api-docs.ts",
    "generate:components": "tsx scripts/generate-component-docs.ts",
    "generate:db": "tsx scripts/generate-db-docs.ts",
    "generate:code": "tsx scripts/generate-code-docs.ts",
    "check:translations": "tsx scripts/check-translations.ts",
    "search:index": "pagefind --site dist"
  }
}
```

## Part 10: Local Development

### Dev Server Setup

```typescript
// docs/scripts/dev-server.ts
import { spawn } from 'child_process';
import chokidar from 'chokidar';

const WATCH_PATHS = [
  '../packages/shared/types/src/**/*.ts',
  '../packages/shared/schemas/src/**/*.ts',
  '../packages/shared/db/src/**/*.ts',
  '../packages/products/**/api/src/**/*.ts',
];

let regenerating = false;

async function regenerate(type: string): Promise<void> {
  if (regenerating) return;
  regenerating = true;

  console.log(`\n🔄 Regenerating ${type} docs...`);

  const script = {
    types: 'generate:api',
    schemas: 'generate:api',
    db: 'generate:db',
    api: 'generate:api',
  }[type] || 'generate';

  spawn('pnpm', [script], { stdio: 'inherit' }).on('close', () => {
    regenerating = false;
    console.log('✅ Done\n');
  });
}

// Watch for changes
const watcher = chokidar.watch(WATCH_PATHS, {
  ignoreInitial: true,
});

watcher.on('change', (path) => {
  if (path.includes('/types/')) regenerate('types');
  else if (path.includes('/schemas/')) regenerate('schemas');
  else if (path.includes('/db/')) regenerate('db');
  else if (path.includes('/api/')) regenerate('api');
});

// Start Astro dev server
spawn('pnpm', ['astro', 'dev'], { stdio: 'inherit' });

console.log('👀 Watching for source changes...');
```

## Implementation Timeline

### Phase 1: Foundation (Days 1-2)
- [ ] Set up Starlight with basic config
- [ ] Configure product switcher
- [ ] Set up i18n structure
- [ ] Create base styling

### Phase 2: API Documentation (Days 3-4)
- [ ] Build Valibot → OpenAPI converter
- [ ] Integrate Scalar UI
- [ ] Add JSDoc parsing for routes
- [ ] Test with sample API

### Phase 3: Component Documentation (Day 5)
- [ ] Configure Histoire
- [ ] Create story files for existing components
- [ ] Integrate into Starlight

### Phase 4: Database & Code Docs (Day 6)
- [ ] Build Drizzle schema parser
- [ ] Generate ERD diagrams
- [ ] Configure TypeDoc
- [ ] Integrate markdown output

### Phase 5: Search & Polish (Day 7)
- [ ] Integrate Pagefind
- [ ] Test search quality
- [ ] Add version switcher
- [ ] Polish UI/UX

### Phase 6: CI/CD & Deployment (Day 8)
- [ ] Set up GitHub Actions workflow
- [ ] Configure Cloudflare Pages
- [ ] Test deployment pipeline
- [ ] Add translation checking

## File Structure (Final)

```
docs/
├── package.json
├── astro.config.mjs
├── tsconfig.json
├── typedoc.json
├── scripts/
│   ├── generate-api-docs.ts
│   ├── generate-component-docs.ts
│   ├── generate-db-docs.ts
│   ├── generate-code-docs.ts
│   ├── check-translations.ts
│   ├── build-versioned-docs.ts
│   └── dev-server.ts
├── src/
│   ├── content/
│   │   ├── docs/
│   │   │   ├── en/
│   │   │   │   ├── index.mdx
│   │   │   │   ├── getting-started/
│   │   │   │   ├── guides/
│   │   │   │   ├── api/          # Generated
│   │   │   │   ├── components/   # Generated
│   │   │   │   ├── database/     # Generated
│   │   │   │   └── reference/    # Generated
│   │   │   ├── es/
│   │   │   └── fr/
│   │   └── config.ts
│   ├── components/
│   │   ├── Header.astro
│   │   ├── ProductSwitcher.astro
│   │   ├── VersionSwitcher.astro
│   │   ├── Scalar.astro
│   │   └── Search.astro
│   ├── styles/
│   │   └── custom.css
│   └── assets/
│       └── logo.svg
├── public/
│   ├── components/    # Histoire output
│   ├── reference/     # TypeDoc output
│   └── versions.json
└── dist/              # Build output
```

## Dependencies

```json
{
  "dependencies": {
    "astro": "^4.0.0",
    "@astrojs/starlight": "^0.20.0",
    "@astrojs/svelte": "^5.0.0",
    "@astrojs/cloudflare": "^9.0.0",
    "svelte": "^5.0.0"
  },
  "devDependencies": {
    "@babel/parser": "^7.23.0",
    "@babel/traverse": "^7.23.0",
    "@scalar/api-reference": "^1.20.0",
    "@types/node": "^20.0.0",
    "astro-pagefind": "^1.4.0",
    "chokidar": "^3.5.0",
    "glob": "^10.3.0",
    "pagefind": "^1.0.0",
    "tsx": "^4.7.0",
    "typedoc": "^0.25.0",
    "typedoc-plugin-markdown": "^3.17.0",
    "yaml": "^2.3.0"
  }
}
```

## Notes

- **Manual content** goes in `src/content/docs/{locale}/guides/` and `getting-started/`
- **Auto-generated content** goes in `api/`, `components/`, `database/`, `reference/`
- **Don't edit generated files** - they're overwritten on build
- **Add JSDoc to source code** for better generated documentation
- **Translation priority**: Start with high-traffic pages (getting-started, guides)
