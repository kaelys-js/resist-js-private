<script lang="ts">
  /**
   * Getting Started — onboarding guide for the component library.
   *
   * Vertical timeline with numbered steps covering installation, imports,
   * first component, project structure, customization, and next steps.
   */
  import type { Bool, Str } from '@/schemas/common';
  import * as DropdownMenu from '@/ui/dropdown-menu/index.js';
  import * as Tooltip from '@/ui/tooltip/index.js';
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
  import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical';
  import ClipboardCopy from '@lucide/svelte/icons/clipboard-copy';
  import FileText from '@lucide/svelte/icons/file-text';
  import Search from '@lucide/svelte/icons/search';
  import SearchX from '@lucide/svelte/icons/search-x';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';
  import Palette from '@lucide/svelte/icons/palette';
  import Shapes from '@lucide/svelte/icons/shapes';
  import TagIcon from '@lucide/svelte/icons/tag';
  import ComponentIcon from '@lucide/svelte/icons/component';
  import type { Component } from 'svelte';

  /* ------------------------------------------------------------------ */
  /*  Code snippets                                                      */
  /* ------------------------------------------------------------------ */

  const installCommands: Record<Str, Str> = {
    pnpm: 'pnpm add @webforge/ui' as Str,
    npm: 'npm install @webforge/ui' as Str,
    yarn: 'yarn add @webforge/ui' as Str,
    bun: 'bun add @webforge/ui' as Str,
  };

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

  /* ------------------------------------------------------------------ */
  /*  Step definitions                                                   */
  /* ------------------------------------------------------------------ */

  type Step = {
    /** Step ID for anchor links. */
    id: Str;
    /** Lucide icon for the step. */
    icon: Component;
    /** Step title. */
    title: Str;
    /** Short description shown below the title. */
    subtitle: Str;
  };

  const steps: Step[] = [
    {
      id: 'welcome' as Str,
      icon: BookOpen,
      title: 'Welcome' as Str,
      subtitle: 'Introduction to the component library' as Str,
    },
    {
      id: 'installation' as Str,
      icon: Package,
      title: 'Installation' as Str,
      subtitle: 'Add the package to your project' as Str,
    },
    {
      id: 'imports' as Str,
      icon: Import,
      title: 'Import Conventions' as Str,
      subtitle: 'Direct, namespace, and type imports' as Str,
    },
    {
      id: 'first-component' as Str,
      icon: Play,
      title: 'First Component' as Str,
      subtitle: 'Render a Button with variants' as Str,
    },
    {
      id: 'structure' as Str,
      icon: FolderTree,
      title: 'Project Structure' as Str,
      subtitle: 'Where components live and what files exist' as Str,
    },
    {
      id: 'customization' as Str,
      icon: Paintbrush,
      title: 'Customization' as Str,
      subtitle: 'Extend with Tailwind classes' as Str,
    },
    {
      id: 'next-steps' as Str,
      icon: ArrowRight,
      title: 'Next Steps' as Str,
      subtitle: 'Explore the full library' as Str,
    },
  ];

  /* ------------------------------------------------------------------ */
  /*  State                                                              */
  /* ------------------------------------------------------------------ */

  /** Selected package manager tab. */
  let pkgManager: Str = $state('pnpm' as Str);

  /** Export search query. */
  let exportSearch: Str = $state('' as Str);

  /** Two-step reset confirmation. */
  let confirmingReset: Bool = $state(false as Bool);

  /** Timer for auto-clearing reset confirmation. */
  let confirmResetTimer: ReturnType<typeof setTimeout> | undefined;

  /* ------------------------------------------------------------------ */
  /*  Export                                                              */
  /* ------------------------------------------------------------------ */

  /** Export format options. */
  const EXPORT_OPTIONS: Array<{
    id: Str;
    label: Str;
    description: Str;
    icon: typeof ClipboardCopy;
  }> = [
    {
      id: 'markdown' as Str,
      label: 'Copy as Markdown' as Str,
      description: 'Full guide as formatted markdown' as Str,
      icon: FileText,
    },
    {
      id: 'clipboard' as Str,
      label: 'Copy All Code' as Str,
      description: 'All code snippets from this page' as Str,
      icon: ClipboardCopy,
    },
  ];

  /** Filtered export options. */
  const filteredExports = $derived.by(() => {
    if (!exportSearch) {
      return EXPORT_OPTIONS;
    }
    const q: Str = exportSearch.toLowerCase() as Str;
    return EXPORT_OPTIONS.filter(
      (o) => o.label.toLowerCase().includes(q) || o.description.toLowerCase().includes(q),
    );
  });

  /* ------------------------------------------------------------------ */
  /*  Handlers                                                           */
  /* ------------------------------------------------------------------ */

  /**
   * Handle two-step reset confirmation.
   *
   * @param e - Select event
   */
  function handleReset(e: Event): void {
    e.preventDefault();
    if (confirmingReset) {
      pkgManager = 'pnpm' as Str;
      confirmingReset = false as Bool;
      if (confirmResetTimer) {
        clearTimeout(confirmResetTimer);
      }
    } else {
      confirmingReset = true as Bool;
      confirmResetTimer = setTimeout((): void => {
        confirmingReset = false as Bool;
      }, 3000);
    }
  }

  /** Whether any settings differ from defaults. */
  const hasChanges: boolean = $derived(pkgManager !== 'pnpm');
</script>

<div class="w-full">
  <!-- Sticky header -->
  <div
    class="sticky top-(--header-height) z-10 flex flex-col gap-3 border-b bg-background px-6 pb-4 pt-6 md:px-10 md:pt-10"
  >
    <div class="flex items-center gap-3">
      <div class="flex size-12 items-center justify-center rounded-xl bg-primary/10">
        <BookOpen class="size-6 text-primary" />
      </div>
      <div class="flex-1">
        <h1 class="text-2xl font-bold tracking-tight">Getting Started</h1>
        <p class="text-sm text-muted-foreground">
          Everything you need to start building with the component library
        </p>
      </div>

      <!-- 3-dot menu -->
      <DropdownMenu.Root>
        <Tooltip.Provider>
          <Tooltip.Root delayDuration={300}>
            <Tooltip.Trigger>
              {#snippet child({ props: tooltipProps }: { props: Record<string, unknown> })}
                <DropdownMenu.Trigger>
                  {#snippet child({ props: triggerProps }: { props: Record<string, unknown> })}
                    <button
                      type="button"
                      class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      {...tooltipProps}
                      {...triggerProps}
                    >
                      <EllipsisVertical class="size-4" />
                      <span class="sr-only">Page options</span>
                    </button>
                  {/snippet}
                </DropdownMenu.Trigger>
              {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content side="bottom" sideOffset={4}>Page options</Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
        <DropdownMenu.Content align="end" sideOffset={4}>
          <!-- Export submenu -->
          <DropdownMenu.Sub
            onOpenChange={(open: boolean) => {
              if (open) exportSearch = '' as Str;
            }}
          >
            <DropdownMenu.SubTrigger>
              <ClipboardCopy class="mr-2 size-4" />
              Export
            </DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent class="w-64">
              <div class="shrink-0 px-2 pb-1.5 pt-1">
                <div
                  class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm"
                >
                  <Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Search exports..."
                    class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    bind:value={exportSearch}
                    onkeydown={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              {#if filteredExports.length === 0}
                <div
                  class="flex flex-col items-center gap-1.5 py-6 text-center text-muted-foreground"
                >
                  <SearchX class="size-4 text-muted-foreground/40" />
                  <span class="text-xs text-muted-foreground/60">No exports match</span>
                </div>
              {:else}
                {#each filteredExports as opt (opt.id)}
                  {@const OptIcon = opt.icon}
                  <DropdownMenu.Item>
                    <OptIcon class="mr-2 size-4" />
                    <div class="flex flex-col">
                      <span>{opt.label}</span>
                      <span class="text-[10px] text-muted-foreground">{opt.description}</span>
                    </div>
                  </DropdownMenu.Item>
                {/each}
              {/if}
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>

          <DropdownMenu.Separator />

          <!-- Reset to defaults -->
          <DropdownMenu.Item
            variant="destructive"
            disabled={!hasChanges && !confirmingReset}
            onSelect={handleReset}
          >
            <Trash2 class="mr-2 size-4" />
            {confirmingReset ? 'Confirm Reset' : 'Reset to Defaults'}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>

    <!-- Step navigation chips -->
    <nav class="flex flex-wrap gap-1.5" aria-label="Section navigation">
      {#each steps as step, i (step.id)}
        {@const StepIcon = step.icon}
        <a
          href="#{step.id}"
          class="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <span
            class="inline-flex size-4 items-center justify-center rounded-full bg-primary/15 text-[9px] font-bold tabular-nums text-primary"
          >
            {i + 1}
          </span>
          {step.title}
        </a>
      {/each}
    </nav>
  </div>

  <!-- Page content -->
  <div class="px-6 py-6 md:px-10 md:py-8">
    <!-- Vertical timeline -->
    <div class="relative">
      <!-- Timeline line -->
      <div class="absolute left-[15px] top-0 h-full w-px bg-border" aria-hidden="true"></div>

      <div class="flex flex-col gap-10">
        <!-- 1. Welcome -->
        {#each steps as step, i (step.id)}
          {@const StepIcon = step.icon}
          <section id={step.id} class="relative scroll-mt-60 pl-12">
            <!-- Timeline dot -->
            <div
              class="absolute left-0 flex size-8 items-center justify-center rounded-full border-2 border-primary bg-background"
            >
              <span class="text-xs font-bold tabular-nums text-primary">{i + 1}</span>
            </div>

            <!-- Step header -->
            <div class="mb-4">
              <div class="flex items-center gap-2">
                <StepIcon class="size-4 text-primary" />
                <h2 class="text-lg font-semibold">{step.title}</h2>
              </div>
              <p class="mt-0.5 text-sm text-muted-foreground">{step.subtitle}</p>
            </div>

            <!-- Step content -->
            {#if step.id === 'welcome'}
              <div class="space-y-4">
                <p class="text-sm leading-relaxed text-muted-foreground">
                  This component library provides a comprehensive set of UI primitives and patterns
                  built with <strong class="text-foreground">Svelte 5</strong>,
                  <strong class="text-foreground">Tailwind CSS</strong>, and
                  <strong class="text-foreground">Valibot</strong> schema validation. Every component
                  is type-safe, accessible, and designed to work together.
                </p>

                <div class="grid gap-3 sm:grid-cols-3">
                  {#each [{ label: 'Type-Safe', desc: 'Every prop validated with Valibot schemas. Full TypeScript inference.' }, { label: 'Accessible', desc: 'ARIA attributes, keyboard navigation, and focus management built in.' }, { label: 'Composable', desc: 'Combine primitives freely. Extend with Tailwind classes via the class prop.' }] as feature (feature.label)}
                    <div class="rounded-lg border bg-card p-4">
                      <div class="mb-2 flex items-center gap-2">
                        <Check class="size-4 text-emerald-500" />
                        <span class="text-sm font-medium">{feature.label}</span>
                      </div>
                      <p class="text-xs text-muted-foreground">{feature.desc}</p>
                    </div>
                  {/each}
                </div>

                <p class="text-sm leading-relaxed text-muted-foreground">
                  <strong class="text-foreground">Lens</strong> is the documentation system you're using
                  right now. It auto-generates prop tables, live previews, and compatibility scores from
                  component source code — no hand-written docs needed.
                </p>
              </div>
            {:else if step.id === 'installation'}
              <div class="space-y-4">
                <p class="text-sm text-muted-foreground">
                  Install the UI package in your project workspace:
                </p>

                <!-- Package manager tabs -->
                <div class="rounded-lg border bg-card">
                  <div class="flex border-b">
                    {#each Object.keys(installCommands) as pm (pm)}
                      <button
                        type="button"
                        class="px-4 py-2 text-xs font-medium transition-colors {pkgManager === pm
                          ? 'border-b-2 border-primary text-primary'
                          : 'text-muted-foreground hover:text-foreground'}"
                        onclick={() => {
                          pkgManager = pm as Str;
                        }}
                      >
                        {pm}
                      </button>
                    {/each}
                  </div>
                  <div class="flex items-center gap-2 px-4 py-3 font-mono text-sm">
                    <span class="text-muted-foreground">$</span>
                    <span class="flex-1 select-all">{installCommands[pkgManager]}</span>
                    <CopyButton
                      text={installCommands[pkgManager] ?? ''}
                      label="Copy install command"
                    />
                  </div>
                </div>

                <p class="text-sm text-muted-foreground">
                  Components are imported directly from <code
                    class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">@/ui/</code
                  > paths — no barrel file needed. Each component is tree-shakeable.
                </p>
              </div>
            {:else if step.id === 'imports'}
              <div class="space-y-4">
                <CodeBlock code={importExample} lang="svelte" />
                <div class="space-y-3">
                  {#each [{ title: 'Direct Imports', desc: 'For single components — import the default export from the component file.', code: "import Button from '@/ui/button/button.svelte';" }, { title: 'Namespace Imports', desc: 'For compound components (Card, Dialog, etc.) — import the namespace from the index file.', code: "import * as Card from '@/ui/card';" }, { title: 'Type Imports', desc: 'For types and schemas — use import type to avoid runtime overhead.', code: "import type { LensMeta } from '@/ui/lens/types.js';" }] as item (item.title)}
                    <div class="rounded-lg border bg-card p-4">
                      <h4 class="mb-1 text-sm font-semibold">{item.title}</h4>
                      <p class="mb-2 text-xs text-muted-foreground">{item.desc}</p>
                      <code class="block rounded bg-muted px-3 py-2 font-mono text-xs">
                        {item.code}
                      </code>
                    </div>
                  {/each}
                </div>
              </div>
            {:else if step.id === 'first-component'}
              <div class="space-y-4">
                <p class="text-sm text-muted-foreground">
                  Copy the code below into a Svelte file to render buttons in all five variants:
                </p>
                <CodeBlock code={firstComponentCode} lang="svelte" />
                <div class="rounded-lg border bg-card p-6">
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
            {:else if step.id === 'structure'}
              <div class="space-y-4">
                <p class="text-sm text-muted-foreground">
                  All components live under <code
                    class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
                    >packages/shared/ui/src/</code
                  >. Each component has its own directory:
                </p>
                <CodeBlock code={projectStructure} lang="bash" />
                <div class="grid gap-2 sm:grid-cols-2">
                  {#each [{ ext: '.svelte', name: 'Component file', desc: 'The implementation with props schema' }, { ext: 'lens.ts', name: 'Lens metadata', desc: 'Category, tags, and description for docs' }, { ext: '.test.ts', name: 'Unit tests', desc: 'Colocated Vitest tests' }, { ext: 'examples/', name: 'Usage examples', desc: 'Live demos shown in Lens docs' }, { ext: 'docs.md', name: 'Documentation', desc: 'Optional long-form component docs' }, { ext: 'index.ts', name: 'Compound barrel', desc: 'Only for multi-part components (Card, Dialog)' }] as file (file.ext)}
                    <div class="flex items-start gap-3 rounded-lg border bg-card p-3">
                      <code class="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
                        >{file.ext}</code
                      >
                      <div>
                        <p class="text-xs font-medium">{file.name}</p>
                        <p class="text-[10px] text-muted-foreground">{file.desc}</p>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {:else if step.id === 'customization'}
              <div class="space-y-4">
                <p class="text-sm text-muted-foreground">
                  Every component accepts a <code
                    class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">class</code
                  >
                  prop for Tailwind overrides. Classes are merged with
                  <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
                    >tailwind-merge</code
                  > so your overrides take priority.
                </p>
                <CodeBlock code={customizationCode} lang="svelte" />
                <div class="space-y-2">
                  {#each [{ label: 'Class prop', desc: 'pass additional Tailwind classes directly' }, { label: 'Tailwind Variants', desc: 'components use tv() for variant management' }, { label: 'CSS variables', desc: 'theme colors via --color-primary etc.' }, { label: 'Composition', desc: 'combine primitives freely to build complex UI' }] as item (item.label)}
                    <div class="flex items-start gap-2 text-xs">
                      <Check class="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                      <span class="text-muted-foreground">
                        <strong class="text-foreground">{item.label}</strong> — {item.desc}
                      </span>
                    </div>
                  {/each}
                </div>
              </div>
            {:else if step.id === 'next-steps'}
              <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {#each [{ href: '/components/all', title: 'All Components', desc: 'Browse all components with live previews', icon: ComponentIcon, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' }, { href: '/components/category', title: 'Categories', desc: 'Components organized by function', icon: LayoutGrid, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10' }, { href: '/components/tags', title: 'Tags', desc: 'Cross-cutting labels for discovery', icon: TagIcon, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' }, { href: '/tokens', title: 'Design Tokens', desc: 'Colors, spacing, and theme variables', icon: Palette, color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-500/10' }, { href: '/icons', title: 'Icons', desc: 'Searchable Lucide icon gallery', icon: Shapes, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-500/10' }] as card (card.href)}
                  {@const CardIcon = card.icon}
                  <a
                    href={card.href}
                    class="group flex items-center gap-3 rounded-lg border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
                  >
                    <div
                      class="flex size-9 shrink-0 items-center justify-center rounded-lg {card.bg}"
                    >
                      <CardIcon class="size-5 {card.color}" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <h4 class="text-sm font-semibold group-hover:text-primary">{card.title}</h4>
                      <p class="text-xs text-muted-foreground">{card.desc}</p>
                    </div>
                    <ArrowRight
                      class="size-4 shrink-0 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                    />
                  </a>
                {/each}
              </div>
            {/if}
          </section>
        {/each}
      </div>
    </div>
  </div>
</div>
