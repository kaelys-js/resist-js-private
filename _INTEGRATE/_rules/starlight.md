# Starlight Documentation Lint Rules

Implement the **Starlight/Documentation** lint rules (13 rules).

Create files in: `_INTEGRATE/linter-test/scripts/rules/typescript/starlight/`

File patterns: `docs/**/*.md`, `docs/**/*.mdx`, `src/content/docs/**/*.md`, `src/content/docs/**/*.mdx`

---

## Already Covered by Other Tools

- **Markdown linting** (markdownlint): Heading structure, list formatting, line length
- **Link checking** (lychee, markdown-link-check): External broken links
- **Spell checking** (cspell): Typos

The rules below are **Starlight-specific** patterns for content collections, frontmatter, and documentation structure.

---

## Rules to Implement

### 1. `starlight/require-title`

**What it catches:** Documentation pages missing required `title` frontmatter

**Why:** Starlight requires `title` for every page - build fails without it

**Detection:** `.md`/`.mdx` file in docs content collection without `title` in frontmatter

```markdown
// ❌ Bad - missing title
---
description: A guide to getting started
---

# Getting Started

Content here...

// ❌ Bad - empty title
---
title: ""
---

// ❌ Bad - title only in heading (not frontmatter)
# Getting Started

Content without frontmatter...

// ✅ Good - title in frontmatter
---
title: Getting Started
description: A guide to getting started with our product
---

Content here...

// ✅ Good - with other frontmatter
---
title: API Reference
description: Complete API documentation
sidebar:
  order: 2
---
```

**Error message:** `Starlight page missing required 'title' frontmatter`

**Tip:** `Add title in frontmatter: ---\ntitle: Page Title\n---`

**Severity:** error

---

### 2. `starlight/valid-frontmatter-types`

**What it catches:** Frontmatter fields with incorrect types

**Why:** Type mismatches cause build failures or unexpected behavior

**Detection:** Frontmatter values that don't match Starlight's schema

```markdown
// ❌ Bad - draft should be boolean
---
title: My Page
draft: "yes"
---

// ❌ Bad - sidebar.order should be number
---
title: My Page
sidebar:
  order: "first"
---

// ❌ Bad - tableOfContents should be boolean or object
---
title: My Page
tableOfContents: "show"
---

// ❌ Bad - template should be 'doc' or 'splash'
---
title: My Page
template: "custom"
---

// ❌ Bad - lastUpdated should be Date or boolean
---
title: My Page
lastUpdated: "yesterday"
---

// ✅ Good - correct types
---
title: Getting Started
description: A brief description
draft: false
sidebar:
  order: 1
  label: Start Here
  badge:
    text: New
    variant: tip
tableOfContents:
  minHeadingLevel: 2
  maxHeadingLevel: 3
template: doc
lastUpdated: 2024-01-15
---

// ✅ Good - boolean shortcuts
---
title: Hidden Page
pagefind: false
editUrl: false
prev: false
next: false
---
```

**Error message:** `Frontmatter '${field}' has invalid type: expected ${expected}, got ${actual}`

**Tip:** `Use correct type: ${field}: ${exampleValue}`

**Severity:** error

---

### 3. `starlight/valid-slug`

**What it catches:** Invalid slug format in frontmatter

**Why:** Invalid slugs cause broken URLs and routing issues

**Detection:** `slug` frontmatter that:
- Contains spaces
- Has uppercase letters
- Contains special characters (except `-` and `/`)
- Starts or ends with `/`
- Has consecutive slashes

```markdown
// ❌ Bad - spaces in slug
---
title: My Page
slug: my page
---

// ❌ Bad - uppercase
---
title: My Page
slug: My-Page
---

// ❌ Bad - special characters
---
title: Q&A
slug: q&a
---

// ❌ Bad - leading/trailing slash
---
title: My Page
slug: /my-page/
---

// ❌ Bad - consecutive slashes
---
title: My Page
slug: guides//my-page
---

// ✅ Good - lowercase with hyphens
---
title: My Page
slug: my-page
---

// ✅ Good - nested path
---
title: Advanced Guide
slug: guides/advanced-topics
---

// ✅ Good - i18n prefix
---
title: Начало работы
slug: ru/getting-started
---

// ✅ Good - no slug (uses filename)
---
title: My Page
---
```

**Error message:** `Invalid slug '${slug}': ${reason}`

**Tip:** `Use lowercase letters, numbers, and hyphens only: ${suggestedSlug}`

**Severity:** error

---

### 4. `starlight/description-length`

**What it catches:** Description too long or too short for SEO

**Why:** Meta descriptions should be 50-160 characters for search engines

**Detection:** `description` frontmatter outside optimal length range

```markdown
// ❌ Bad - too short (under 50 chars)
---
title: API Reference
description: API docs
---

// ❌ Bad - too long (over 160 chars)
---
title: Getting Started
description: This is an extremely comprehensive and detailed guide that walks you through every single step of the setup process, including all the prerequisites, installation steps, configuration options, and troubleshooting tips that you might need along the way.
---

// ❌ Bad - just repeating title
---
title: Installation Guide
description: Installation Guide
---

// ✅ Good - optimal length (50-160 chars)
---
title: Getting Started
description: Learn how to install, configure, and deploy your first project in under 10 minutes with our step-by-step guide.
---

// ✅ Good - concise and informative
---
title: API Reference
description: Complete API documentation with examples for authentication, resources, and error handling.
---

// ✅ Good - no description (uses auto-generated)
---
title: Quick Start
---
```

**Error message:** `Description is ${length} characters - optimal range is 50-160 for SEO`

**Tip:** `Aim for 50-160 characters that summarize the page content`

**Severity:** warning

---

### 5. `starlight/no-broken-internal-links`

**What it catches:** Links to non-existent documentation pages

**Why:** Broken internal links frustrate users and hurt documentation quality

**Detection:** Markdown links `[text](path)` where path points to non-existent `.md`/`.mdx` file

```markdown
// ❌ Bad - file doesn't exist
See the [configuration guide](/guides/configuration/) for details.

// ❌ Bad - wrong extension
Check out [getting started](./getting-started.html).

// ❌ Bad - typo in path
Read the [API docs](/reference/api-referece/).

// ❌ Bad - case mismatch (if filesystem is case-sensitive)
See [Components](/guides/Components/).

// ✅ Good - valid relative link
See the [configuration guide](../guides/configuration/) for details.

// ✅ Good - valid absolute link (from content root)
Check out [getting started](/getting-started/).

// ✅ Good - anchor link to heading
See [Installation](#installation) below.

// ✅ Good - external link
Visit [Astro's website](https://astro.build) for more info.

// ✅ Good - link to existing page
Read the [API reference](/reference/api/) for complete details.
```

**Error message:** `Broken internal link: '${path}' does not exist`

**Tip:** `Did you mean '${suggestion}'? Available pages: ${nearMatches}`

**Severity:** error

---

### 6. `starlight/require-content-config`

**What it catches:** Missing or incorrect content collection configuration

**Why:** Starlight requires proper content config for docs collection

**Detection:**
- Missing `src/content/config.ts` or `src/content.config.ts`
- Config exists but doesn't use `docsSchema()`
- Missing i18n collection when i18n is configured

```typescript
// ❌ Bad - missing content config entirely
// No src/content/config.ts file!

// ❌ Bad - not using Starlight schema
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const docs = defineCollection({
  schema: z.object({
    title: z.string(),  // Custom schema, not Starlight's!
  }),
});

export const collections = { docs };

// ❌ Bad - missing i18n collection when needed
// astro.config.mjs has: locales: { en: {...}, es: {...} }
// But content config only has docs collection

// ✅ Good - proper Starlight content config
// src/content/config.ts
import { defineCollection } from 'astro:content';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';

export const collections = {
  docs: defineCollection({ schema: docsSchema() }),
  i18n: defineCollection({ type: 'data', schema: i18nSchema() }),
};

// ✅ Good - with extended schema
import { defineCollection, z } from 'astro:content';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
  docs: defineCollection({
    schema: docsSchema({
      extend: z.object({
        category: z.enum(['guide', 'reference', 'tutorial']).optional(),
        difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
      }),
    }),
  }),
};
```

**Error message:** `${issue} in content collection configuration`

**Tip:** `Use docsSchema() from '@astrojs/starlight/schema' for the docs collection`

**Severity:** error

---

### 7. `starlight/i18n-consistency`

**What it catches:** Missing translations for internationalized documentation

**Why:** Inconsistent translations create broken navigation and confusing UX

**Detection:**
- Pages existing in one locale but not others
- Slug mismatches between locales
- Missing sidebar translations

```
// ❌ Bad - page exists in en/ but not es/
docs/
├── en/
│   ├── getting-started.md  ✓
│   ├── guides/
│   │   ├── installation.md  ✓
│   │   └── configuration.md  ✓
│   └── reference/
│       └── api.md  ✓
└── es/
    ├── getting-started.md  ✓
    └── guides/
        └── installation.md  ✓
        // Missing: configuration.md
        // Missing: reference/api.md

// ❌ Bad - slug mismatch
// en/guides/getting-started.md: slug: guides/getting-started
// es/guides/getting-started.md: slug: guias/empezando  // Different structure!

// ✅ Good - all locales have same pages
docs/
├── en/
│   ├── getting-started.md
│   ├── guides/
│   │   ├── installation.md
│   │   └── configuration.md
│   └── reference/
│       └── api.md
└── es/
    ├── getting-started.md
    ├── guides/
    │   ├── installation.md
    │   └── configuration.md
    └── reference/
        └── api.md

// ✅ Good - pages marked as draft while translating
// es/guides/configuration.md
---
title: Configuración
draft: true  # Not yet translated
---
```

**Error message:** `Missing translation: '${page}' exists in ${locale1} but not ${locale2}`

**Tip:** `Create ${missingPath} or mark as draft if translation is in progress`

**Severity:** warning

---

### 8. `starlight/heading-hierarchy`

**What it catches:** Heading levels that skip or are inconsistent

**Why:** Proper heading hierarchy is important for accessibility and navigation

**Detection:**
- Heading levels that skip (h1 → h3)
- Multiple h1 headings
- Starting with h3 or lower

```markdown
// ❌ Bad - skipped heading level
---
title: My Guide
---

## Introduction

Some content...

#### Details  // Skipped h3!

// ❌ Bad - multiple h1 (title is already h1)
---
title: My Guide
---

# Another Title  // Duplicate h1!

## Introduction

// ❌ Bad - starting too deep
---
title: My Guide
---

### Details  // Should start with h2

// ✅ Good - proper hierarchy
---
title: My Guide
---

## Introduction

Intro content...

### Getting Started

Details here...

### Next Steps

More details...

## Advanced Topics

### Topic One

#### Subtopic

// ✅ Good - no headings (short page)
---
title: Quick Reference
---

Just a simple page with no subheadings needed.
```

**Error message:** `Heading hierarchy issue: ${issue}`

**Tip:** `${suggestion}`

**Severity:** warning

---

### 9. `starlight/no-duplicate-slug`

**What it catches:** Multiple pages with the same effective slug

**Why:** Duplicate slugs cause routing conflicts and unpredictable behavior

**Detection:** Two or more `.md`/`.mdx` files that resolve to same URL

```markdown
// ❌ Bad - explicit slug matches another file's path
// File: docs/getting-started.md (slug: getting-started)
// File: docs/guides/intro.md
---
title: Introduction
slug: getting-started  // Conflicts with docs/getting-started.md!
---

// ❌ Bad - two files with same explicit slug
// File: docs/guide-v1.md
---
title: Guide V1
slug: guide
---

// File: docs/guide-v2.md
---
title: Guide V2
slug: guide  // Same slug!
---

// ❌ Bad - index file conflicts with directory
// File: docs/guides.md (slug: guides)
// File: docs/guides/index.md (slug: guides)  // Conflict!

// ✅ Good - unique slugs
// File: docs/guides/intro.md
---
title: Introduction
slug: guides/introduction
---

// File: docs/getting-started.md
---
title: Getting Started
---

// ✅ Good - versioned with different slugs
// File: docs/v1/guide.md
---
title: Guide (v1)
slug: v1/guide
---

// File: docs/v2/guide.md
---
title: Guide (v2)
slug: v2/guide
---
```

**Error message:** `Duplicate slug '${slug}' found in ${file1} and ${file2}`

**Tip:** `Use unique slugs or rename files to avoid conflicts`

**Severity:** error

---

### 10. `starlight/sidebar-order`

**What it catches:** Sidebar ordering issues and conflicts

**Why:** Inconsistent sidebar ordering creates confusing navigation

**Detection:**
- Duplicate `sidebar.order` values within same directory
- Gaps in ordering sequence
- Mix of ordered and unordered pages in same group

```markdown
// ❌ Bad - duplicate order values
// docs/guides/first.md
---
title: First Guide
sidebar:
  order: 1
---

// docs/guides/second.md
---
title: Second Guide
sidebar:
  order: 1  // Same as first!
---

// ❌ Bad - gaps in ordering
// docs/guides/
// - intro.md: order: 1
// - setup.md: order: 2
// - advanced.md: order: 10  // Big gap!

// ❌ Bad - mixing ordered and unordered
// docs/guides/
// - intro.md: order: 1
// - setup.md: (no order)  // Will sort alphabetically
// - advanced.md: order: 2  // Ordered

// ✅ Good - consistent ordering
// docs/guides/intro.md
---
title: Introduction
sidebar:
  order: 1
---

// docs/guides/setup.md
---
title: Setup
sidebar:
  order: 2
---

// docs/guides/advanced.md
---
title: Advanced
sidebar:
  order: 3
---

// ✅ Good - all unordered (alphabetical)
// docs/reference/
// - api.md (no order)
// - cli.md (no order)
// - config.md (no order)

// ✅ Good - using sidebar label
---
title: Getting Started with Our Amazing Product
sidebar:
  label: Getting Started
  order: 1
---
```

**Error message:** `Sidebar ordering issue: ${issue}`

**Tip:** `${suggestion}`

**Severity:** warning

---

### 11. `starlight/code-block-language`

**What it catches:** Code blocks without language specifier

**Why:** Language is needed for syntax highlighting and accessibility

**Detection:** Fenced code blocks (```) without language identifier

````markdown
// ❌ Bad - no language specified
```
const x = 1;
function hello() {
  console.log('world');
}
```

// ❌ Bad - generic "code" language
```code
npm install package
```

// ✅ Good - specific language
```typescript
const x: number = 1;
function hello(): void {
  console.log('world');
}
```

// ✅ Good - shell commands
```bash
npm install package
```

// ✅ Good - with title
```js title="example.js"
export const config = {};
```

// ✅ Good - plain text explicitly
```text
This is plain text output
with no syntax highlighting
```

// ✅ Good - diff for changes
```diff
- const old = 1;
+ const new = 2;
```

// ✅ Good - specific framework
```astro
---
const name = 'World';
---
<h1>Hello {name}</h1>
```
````

**Error message:** `Code block missing language specifier`

**Tip:** `Add language after opening fence: \`\`\`typescript or \`\`\`text for plain text`

**Severity:** warning

---

### 12. `starlight/require-image-alt`

**What it catches:** Images without alt text in documentation

**Why:** Alt text is required for accessibility and SEO

**Detection:**
- Markdown images `![](path)` with empty alt
- MDX/HTML `<img>` without alt attribute
- Images with meaningless alt like "image" or "screenshot"

```markdown
// ❌ Bad - empty alt text
![](/images/diagram.png)

// ❌ Bad - meaningless alt
![image](/images/dashboard.png)
![screenshot](/images/settings.png)
![photo](/images/team.jpg)

// ❌ Bad - filename as alt
![dashboard.png](/images/dashboard.png)

// ❌ Bad - HTML without alt
<img src="/images/logo.png" />

// ✅ Good - descriptive alt text
![Architecture diagram showing data flow between services](/images/diagram.png)

// ✅ Good - concise but meaningful
![Dashboard showing user metrics](/images/dashboard.png)

// ✅ Good - for decorative images, use empty alt explicitly with aria-hidden
<img src="/images/decorative-line.png" alt="" aria-hidden="true" />

// ✅ Good - MDX with proper alt
import screenshot from './images/screenshot.png';

<img src={screenshot} alt="Settings page with theme options highlighted" />

// ✅ Good - Astro Image component
import { Image } from 'astro:assets';
import diagram from './diagram.png';

<Image src={diagram} alt="Component lifecycle diagram" />
```

**Error message:** `Image missing meaningful alt text`

**Tip:** `Describe what the image shows: ![Description of image content](/path)`

**Severity:** warning

---

### 13. `starlight/prefer-relative-links`

**What it catches:** Absolute URLs for internal documentation links

**Why:** Relative links are more portable and work in local dev, previews, and production

**Detection:** Links starting with full domain or `/docs/` absolute paths to internal content

```markdown
// ❌ Bad - full URL to own docs
See the [API reference](https://docs.example.com/reference/api/) for details.

// ❌ Bad - absolute path when relative works
Read [getting started](/docs/en/getting-started/) first.

// ❌ Bad - hardcoded locale in link
Check the [guide](/en/guides/setup/).

// ❌ Bad - mixing link styles inconsistently
See [page one](/guides/one/) and [page two](../guides/two/).

// ✅ Good - relative link
See the [API reference](../reference/api/) for details.

// ✅ Good - relative from current directory
Read [getting started](./getting-started/) first.

// ✅ Good - parent directory navigation
Check the [guide](../../guides/setup/).

// ✅ Good - anchor links
See [Configuration](#configuration) below.

// ✅ Good - external links (absolute is correct)
Visit [Astro](https://astro.build) for more info.

// ✅ Good - Starlight link component for cross-locale
import { LinkCard } from '@astrojs/starlight/components';

<LinkCard
  title="Getting Started"
  href="/getting-started/"
/>
```

**Error message:** `Use relative link instead of absolute: '${path}'`

**Tip:** `Change to relative path: ${suggestedPath}`

**Severity:** warning

---

## Detection Helpers

For Starlight files, the linter needs:

1. **Parse frontmatter** - YAML between `---` delimiters
2. **Validate against schema** - Starlight's `docsSchema()` types
3. **Cross-file analysis** - For duplicate slugs, broken links, i18n
4. **Markdown AST** - For headings, code blocks, images, links
5. **Content collection awareness** - Know which files are in docs collection

### Frontmatter Schema

```typescript
// Starlight frontmatter types
interface StarlightFrontmatter {
  title: string;  // Required
  description?: string;
  slug?: string;
  editUrl?: string | boolean;
  head?: HeadConfig[];
  tableOfContents?: boolean | { minHeadingLevel?: number; maxHeadingLevel?: number };
  template?: 'doc' | 'splash';
  hero?: HeroConfig;
  banner?: { content: string };
  lastUpdated?: Date | boolean;
  prev?: boolean | string | { link: string; label: string };
  next?: boolean | string | { link: string; label: string };
  pagefind?: boolean;
  draft?: boolean;
  sidebar?: {
    label?: string;
    order?: number;
    hidden?: boolean;
    badge?: string | { text: string; variant?: 'note' | 'tip' | 'caution' | 'danger' };
    attrs?: Record<string, string | number | boolean>;
  };
}
```

### File Structure Patterns

```typescript
// Docs content paths
const DOCS_PATHS = [
  'src/content/docs/**/*.md',
  'src/content/docs/**/*.mdx',
  'docs/**/*.md',
  'docs/**/*.mdx',
];

// Locale detection
const LOCALE_REGEX = /^(en|es|fr|de|ja|zh|ko|pt|ru|ar)\/|\/(?<locale>en|es|fr|de|ja|zh|ko|pt|ru|ar)\//;

// Slug validation
const VALID_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;
```

---

## Summary

| Rule | Severity | Catches |
|------|----------|---------|
| `require-title` | error | Missing title frontmatter |
| `valid-frontmatter-types` | error | Wrong frontmatter types |
| `valid-slug` | error | Invalid slug format |
| `description-length` | warning | SEO description length |
| `no-broken-internal-links` | error | Links to missing pages |
| `require-content-config` | error | Missing/wrong content config |
| `i18n-consistency` | warning | Missing translations |
| `heading-hierarchy` | warning | Skipped heading levels |
| `no-duplicate-slug` | error | Slug conflicts |
| `sidebar-order` | warning | Ordering issues |
| `code-block-language` | warning | Missing code language |
| `require-image-alt` | warning | Missing image alt text |
| `prefer-relative-links` | warning | Absolute internal links |

**Total: 13 rules**
