<script lang="ts">
  /**
   * Getting Started — onboarding guide for the component library.
   *
   * Seven collapsible sections covering installation, imports, first component,
   * project structure, customization, and next steps.
   */
  import type { Str } from '@/schemas/common';
  import LensSection from '@/ui/lens-section/LensSection.svelte';
  import CodeBlock from '@/ui/code-block/CodeBlock.svelte';
  import CopyButton from '@/ui/copy-button/CopyButton.svelte';
  import BookOpen from '@lucide/svelte/icons/book-open';
  import Package from '@lucide/svelte/icons/package';
  import Import from '@lucide/svelte/icons/import';
  import Play from '@lucide/svelte/icons/play';
  import FolderTree from '@lucide/svelte/icons/folder-tree';
  import Paintbrush from '@lucide/svelte/icons/paintbrush';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import Check from '@lucide/svelte/icons/check';

  const installCmd: Str = 'pnpm add @webforge/ui' as Str;

  const importExample: Str =
    "import Button from '@/ui/button/button.svelte';\nimport * as Card from '@/ui/card';\nimport type { LensMeta } from '@/ui/lens/types.js';" as Str;

  const firstComponentCode: Str = `<script lang="ts">
  import Button from '@/ui/button/button.svelte';
${'<'}/script>

<div class="flex gap-2">
  <Button>Default</Button>
  <Button variant="secondary">Secondary</Button>
  <Button variant="outline">Outline</Button>
  <Button variant="destructive">Destructive</Button>
  <Button variant="ghost">Ghost</Button>
</div>` as Str;

  const customizationCode: Str = `<!-- Pass additional Tailwind classes via the class prop -->
<Button class="w-full rounded-full">Full Width Rounded</Button>

<!-- Override colors -->
<Button class="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
  Gradient Button
</Button>

<!-- Compose with other components -->
<Card.Root class="p-6">
  <Card.Header>
    <Card.Title>Custom Card</Card.Title>
  </Card.Header>
  <Card.Content>
    <Button variant="outline" class="mt-4">Action</Button>
  </Card.Content>
</Card.Root>` as Str;

  const projectStructure: Str = `packages/shared/ui/src/
├── button/
│   ├── button.svelte          # Component implementation
│   ├── button.test.ts         # Colocated unit tests
│   ├── lens.ts                # Lens metadata (category, tags, description)
│   ├── examples/
│   │   ├── basic.svelte       # Basic usage example
│   │   └── variants.svelte    # Variant showcase
│   └── docs.md                # Optional long-form documentation
├── card/
│   ├── index.ts               # Compound component barrel
│   ├── card-root.svelte
│   ├── card-header.svelte
│   ├── card-title.svelte
│   ├── card-content.svelte
│   └── lens.ts
└── ...` as Str;

  const steps: Array<{ icon: typeof BookOpen; title: Str; description: Str }> = [
    {
      icon: BookOpen,
      title: 'Welcome' as Str,
      description: 'Introduction to the component library' as Str,
    },
    {
      icon: Package,
      title: 'Installation' as Str,
      description: 'Add the package to your project' as Str,
    },
    {
      icon: Import,
      title: 'Import Conventions' as Str,
      description: 'Direct, namespace, and type imports' as Str,
    },
    {
      icon: Play,
      title: 'First Component' as Str,
      description: 'Render a Button with variants' as Str,
    },
    {
      icon: FolderTree,
      title: 'Project Structure' as Str,
      description: 'Where components live and what files exist' as Str,
    },
    {
      icon: Paintbrush,
      title: 'Customization' as Str,
      description: 'Extend with Tailwind classes' as Str,
    },
    {
      icon: ArrowRight,
      title: 'Next Steps' as Str,
      description: 'Explore the full library' as Str,
    },
  ];
</script>

<div class="mx-auto max-w-4xl space-y-8 p-8">
  <!-- Page header -->
  <div>
    <h1 class="text-3xl font-bold tracking-tight">Getting Started</h1>
    <p class="mt-2 text-lg text-muted-foreground">
      Everything you need to start building with the component library.
    </p>
  </div>

  <!-- Quick nav -->
  <nav class="flex flex-wrap gap-2" aria-label="Section navigation">
    {#each steps as step, i}
      <a
        href="#{step.title.toLowerCase().replaceAll(' ', '-')}"
        class="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
      >
        <span
          class="inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary"
        >
          {i + 1}
        </span>
        {step.title}
      </a>
    {/each}
  </nav>

  <!-- 1. Welcome -->
  <section id="welcome">
    <LensSection title="Welcome" description="Introduction to the component library">
      <div class="space-y-4">
        <p class="text-sm leading-relaxed text-muted-foreground">
          This component library provides a comprehensive set of UI primitives and patterns built
          with <strong class="text-foreground">Svelte 5</strong>,
          <strong class="text-foreground">Tailwind CSS</strong>, and
          <strong class="text-foreground">Valibot</strong> schema validation. Every component is type-safe,
          accessible, and designed to work together.
        </p>

        <div class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-lg border bg-muted/30 p-4">
            <div class="mb-2 flex items-center gap-2">
              <Check class="size-4 text-green-500" />
              <span class="text-sm font-medium">Type-Safe</span>
            </div>
            <p class="text-xs text-muted-foreground">
              Every prop validated with Valibot schemas. Full TypeScript inference.
            </p>
          </div>
          <div class="rounded-lg border bg-muted/30 p-4">
            <div class="mb-2 flex items-center gap-2">
              <Check class="size-4 text-green-500" />
              <span class="text-sm font-medium">Accessible</span>
            </div>
            <p class="text-xs text-muted-foreground">
              ARIA attributes, keyboard navigation, and focus management built in.
            </p>
          </div>
          <div class="rounded-lg border bg-muted/30 p-4">
            <div class="mb-2 flex items-center gap-2">
              <Check class="size-4 text-green-500" />
              <span class="text-sm font-medium">Composable</span>
            </div>
            <p class="text-xs text-muted-foreground">
              Combine primitives freely. Extend with Tailwind classes via the class prop.
            </p>
          </div>
        </div>

        <p class="text-sm leading-relaxed text-muted-foreground">
          <strong class="text-foreground">Lens</strong> is the documentation system you're using right
          now. It auto-generates prop tables, live previews, and compatibility scores from component source
          code — no hand-written docs needed.
        </p>
      </div>
    </LensSection>
  </section>

  <!-- 2. Installation -->
  <section id="installation">
    <LensSection title="Installation" description="Add the package to your project">
      <div class="space-y-4">
        <p class="text-sm text-muted-foreground">
          Install the UI package in your project workspace:
        </p>
        <div
          class="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-3 font-mono text-sm"
        >
          <span class="select-all">{installCmd}</span>
          <CopyButton text={installCmd} label="Copy install command" class="ml-auto" />
        </div>
        <p class="text-sm text-muted-foreground">
          Components are imported directly from <code
            class="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">@/ui/</code
          >
          paths — no barrel file needed. Each component is tree-shakeable.
        </p>
      </div>
    </LensSection>
  </section>

  <!-- 3. Import Conventions -->
  <section id="import-conventions">
    <LensSection
      title="Import Conventions"
      description="Direct imports, namespace imports, and type imports"
      codeText={importExample}
    >
      {#snippet code()}
        <CodeBlock code={importExample} lang="svelte" />
      {/snippet}
      <div class="space-y-4">
        <div class="space-y-3">
          <div class="rounded-lg border p-4">
            <h4 class="mb-1 text-sm font-semibold">Direct Imports</h4>
            <p class="mb-2 text-xs text-muted-foreground">
              For single components — import the default export from the component file.
            </p>
            <code class="block rounded bg-muted px-3 py-2 font-mono text-xs">
              import Button from '@/ui/button/button.svelte';
            </code>
          </div>

          <div class="rounded-lg border p-4">
            <h4 class="mb-1 text-sm font-semibold">Namespace Imports</h4>
            <p class="mb-2 text-xs text-muted-foreground">
              For compound components (Card, Dialog, etc.) — import the namespace from the index
              file.
            </p>
            <code class="block rounded bg-muted px-3 py-2 font-mono text-xs">
              import * as Card from '@/ui/card';
            </code>
          </div>

          <div class="rounded-lg border p-4">
            <h4 class="mb-1 text-sm font-semibold">Type Imports</h4>
            <p class="mb-2 text-xs text-muted-foreground">
              For types and schemas — use <code class="rounded bg-muted px-1 py-0.5 text-[10px]"
                >import type</code
              > to avoid runtime overhead.
            </p>
            <code class="block rounded bg-muted px-3 py-2 font-mono text-xs">
              import type {'{'} LensMeta {'}'} from '@/ui/lens/types.js';
            </code>
          </div>
        </div>
      </div>
    </LensSection>
  </section>

  <!-- 4. First Component -->
  <section id="first-component">
    <LensSection
      title="First Component"
      description="Render a Button with all five variants"
      codeText={firstComponentCode}
    >
      {#snippet code()}
        <CodeBlock code={firstComponentCode} lang="svelte" />
      {/snippet}
      <div class="space-y-4">
        <p class="text-sm text-muted-foreground">
          Copy the code below into a Svelte file to render buttons in all five variants. Click
          <strong class="text-foreground">Expand Code</strong> to see the full source.
        </p>
        <div class="rounded-lg border bg-muted/30 p-6">
          <div class="flex flex-wrap gap-2">
            <span
              class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >Default</span
            >
            <span
              class="inline-flex items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground"
              >Secondary</span
            >
            <span
              class="inline-flex items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium"
              >Outline</span
            >
            <span
              class="inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground"
              >Destructive</span
            >
            <span
              class="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
              >Ghost</span
            >
          </div>
        </div>
      </div>
    </LensSection>
  </section>

  <!-- 5. Project Structure -->
  <section id="project-structure">
    <LensSection
      title="Project Structure"
      description="Where components live and what files exist in each directory"
      codeText={projectStructure}
    >
      {#snippet code()}
        <CodeBlock code={projectStructure} lang="bash" />
      {/snippet}
      <div class="space-y-4">
        <p class="text-sm text-muted-foreground">
          All components live under <code class="rounded bg-muted px-1.5 py-0.5 text-xs font-mono"
            >packages/shared/ui/src/</code
          >. Each component has its own directory containing:
        </p>
        <div class="grid gap-2 sm:grid-cols-2">
          <div class="flex items-start gap-3 rounded-lg border p-3">
            <code class="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-mono">.svelte</code>
            <div>
              <p class="text-xs font-medium">Component file</p>
              <p class="text-[10px] text-muted-foreground">The implementation with props schema</p>
            </div>
          </div>
          <div class="flex items-start gap-3 rounded-lg border p-3">
            <code class="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-mono">lens.ts</code>
            <div>
              <p class="text-xs font-medium">Lens metadata</p>
              <p class="text-[10px] text-muted-foreground">
                Category, tags, and description for docs
              </p>
            </div>
          </div>
          <div class="flex items-start gap-3 rounded-lg border p-3">
            <code class="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-mono">.test.ts</code>
            <div>
              <p class="text-xs font-medium">Unit tests</p>
              <p class="text-[10px] text-muted-foreground">Colocated Vitest tests</p>
            </div>
          </div>
          <div class="flex items-start gap-3 rounded-lg border p-3">
            <code class="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-mono">examples/</code>
            <div>
              <p class="text-xs font-medium">Usage examples</p>
              <p class="text-[10px] text-muted-foreground">Live demos shown in Lens docs</p>
            </div>
          </div>
          <div class="flex items-start gap-3 rounded-lg border p-3">
            <code class="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-mono">docs.md</code>
            <div>
              <p class="text-xs font-medium">Documentation</p>
              <p class="text-[10px] text-muted-foreground">Optional long-form component docs</p>
            </div>
          </div>
          <div class="flex items-start gap-3 rounded-lg border p-3">
            <code class="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-mono">index.ts</code>
            <div>
              <p class="text-xs font-medium">Compound barrel</p>
              <p class="text-[10px] text-muted-foreground">
                Only for multi-part components (Card, Dialog)
              </p>
            </div>
          </div>
        </div>
      </div>
    </LensSection>
  </section>

  <!-- 6. Customization -->
  <section id="customization">
    <LensSection
      title="Customization"
      description="Extend components with Tailwind classes and composition"
      codeText={customizationCode}
    >
      {#snippet code()}
        <CodeBlock code={customizationCode} lang="svelte" />
      {/snippet}
      <div class="space-y-4">
        <p class="text-sm text-muted-foreground">
          Every component accepts a <code class="rounded bg-muted px-1.5 py-0.5 text-xs font-mono"
            >class</code
          >
          prop for Tailwind overrides. Classes are merged with
          <code class="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">tailwind-merge</code>
          so your overrides take priority.
        </p>
        <div class="space-y-2">
          <div class="flex items-start gap-2 text-xs">
            <Check class="mt-0.5 size-3.5 shrink-0 text-green-500" />
            <span class="text-muted-foreground">
              <strong class="text-foreground">Class prop</strong> — pass additional Tailwind classes directly
            </span>
          </div>
          <div class="flex items-start gap-2 text-xs">
            <Check class="mt-0.5 size-3.5 shrink-0 text-green-500" />
            <span class="text-muted-foreground">
              <strong class="text-foreground">Tailwind Variants</strong> — components use
              <code class="rounded bg-muted px-1 py-0.5 text-[10px]">tv()</code> for variant management
            </span>
          </div>
          <div class="flex items-start gap-2 text-xs">
            <Check class="mt-0.5 size-3.5 shrink-0 text-green-500" />
            <span class="text-muted-foreground">
              <strong class="text-foreground">CSS variables</strong> — theme colors via
              <code class="rounded bg-muted px-1 py-0.5 text-[10px]">--color-primary</code> etc.
            </span>
          </div>
          <div class="flex items-start gap-2 text-xs">
            <Check class="mt-0.5 size-3.5 shrink-0 text-green-500" />
            <span class="text-muted-foreground">
              <strong class="text-foreground">Composition</strong> — combine primitives freely to build
              complex UI
            </span>
          </div>
        </div>
      </div>
    </LensSection>
  </section>

  <!-- 7. Next Steps -->
  <section id="next-steps">
    <LensSection title="Next Steps" description="Explore the full library">
      <div class="grid gap-3 sm:grid-cols-3">
        <a
          href="/components"
          class="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/30"
        >
          <h4 class="mb-1 text-sm font-semibold group-hover:text-primary">Components</h4>
          <p class="text-xs text-muted-foreground">
            Browse all available components with live previews and prop documentation.
          </p>
          <span class="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
            Explore <ArrowRight class="size-3" />
          </span>
        </a>
        <a
          href="/tokens"
          class="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/30"
        >
          <h4 class="mb-1 text-sm font-semibold group-hover:text-primary">Design Tokens</h4>
          <p class="text-xs text-muted-foreground">
            Colors, spacing, typography, and other design tokens used across components.
          </p>
          <span class="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
            Explore <ArrowRight class="size-3" />
          </span>
        </a>
        <a
          href="/icons"
          class="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/30"
        >
          <h4 class="mb-1 text-sm font-semibold group-hover:text-primary">Icons</h4>
          <p class="text-xs text-muted-foreground">
            Searchable gallery of all Lucide icons available in the library.
          </p>
          <span class="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
            Explore <ArrowRight class="size-3" />
          </span>
        </a>
      </div>
    </LensSection>
  </section>
</div>
