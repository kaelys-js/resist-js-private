<script module lang="ts">
  import * as v from 'valibot';
  import { BoolSchema, StrSchema } from '@/schemas/common';

  /**
   * Syntax-highlighted code block powered by Shiki.
   *
   * Lazily loads Shiki (highlighter, grammar, themes) on first render.
   * Automatically switches between light and dark themes based on
   * the document's current color scheme class.
   *
   * Features:
   * - Language badge chip
   * - ⋮ options menu (line numbers, word wrap, search)
   * - Inline search with match highlighting and navigation
   *
   * @example
   * ```svelte
   * <CodeBlock code={rawSource} lang="svelte" />
   * <CodeBlock code={rawSource} lang="svelte" showLineNumbers showSearch />
   * ```
   */
  export const CodeBlockPropsSchema = v.strictObject({
    /** Raw source code to highlight. @values console.log('hello'), const x = 42, <div>Hello</div> */
    code: StrSchema,
    /** Language grammar to use. @values svelte, typescript, javascript, html, css, json, markdown, bash */
    lang: v.optional(StrSchema),
    /** Additional CSS classes for the root element. */
    class: v.optional(StrSchema),
    /** Whether to show line numbers initially. @values true, false */
    showLineNumbers: v.optional(BoolSchema, false),
    /** Whether to enable the inline search bar. @values true, false */
    showSearch: v.optional(BoolSchema, false),
    /** Whether word wrap is enabled by default. @values true, false */
    wordWrap: v.optional(BoolSchema, false),
  });
  /** Props for the CodeBlock component. */
  export type CodeBlockProps = v.InferOutput<typeof CodeBlockPropsSchema>;
</script>

<script lang="ts">
  import type { Bool, Num, Str, Void } from '@/schemas/common';
  import { safeParse } from '@/utils/result/safe';
  import { fade } from 'svelte/transition';
  import { cn } from '../utils.js';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import * as DropdownMenu from '../dropdown-menu/index.js';
  import Search from '@lucide/svelte/icons/search';
  import X from '@lucide/svelte/icons/x';
  import ChevronUp from '@lucide/svelte/icons/chevron-up';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical';
  import Check from '@lucide/svelte/icons/check';
  import WrapText from '@lucide/svelte/icons/wrap-text';
  import ListOrdered from '@lucide/svelte/icons/list-ordered';

  const { ...restProps }: CodeBlockProps = $props();
  const validated: CodeBlockProps = $derived.by(() => {
    const rawProps: CodeBlockProps = stripSvelteProps(restProps);
    const result = safeParse(CodeBlockPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CodeBlockProps;
  });

  /** Whether we're currently in dark mode. */
  const isDark: Bool = $derived(
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );

  /** The highlighted HTML output. Empty while loading. */
  let highlightedHtml: Str = $state('');

  /** Whether the highlighter is still loading. */
  let loading: Bool = $state(true);

  /** Whether line numbers are visible. */
  let lineNumbers: Bool = $state(false);

  /** Whether word wrap is enabled. */
  let wrapEnabled: Bool = $state(false);

  /** Whether the search bar is visible. */
  let searchOpen: Bool = $state(false);

  /** Current search query text. */
  let searchQuery: Str = $state('');

  /** Index of the currently focused match (0-based). */
  let currentMatchIndex: Num = $state(0 as Num);

  /** Reference to the search input for focus management. */
  let searchInputRef: HTMLInputElement | undefined = $state(undefined);

  /** Reference to the code container for match scrolling. */
  let codeContainerRef: HTMLDivElement | undefined = $state(undefined);

  /* Sync prop defaults into local state */
  $effect(() => {
    lineNumbers = validated.showLineNumbers ?? false;
  });
  $effect(() => {
    wrapEnabled = validated.wordWrap ?? false;
  });

  /** Source lines split from the raw code (trimmed trailing empty line). */
  const lines: Str[] = $derived.by((): Str[] => {
    const raw: Str[] = (validated.code ?? '').split('\n') as Str[];
    /* Trailing newline produces a ghost empty entry — trim it */
    if (raw.length > 1 && raw.at(-1) === '') {
      return raw.slice(0, -1) as Str[];
    }
    return raw;
  });

  /** Total line count. */
  const lineCount: Num = $derived(lines.length as Num);

  /** Display language label (capitalize first letter). */
  const langLabel: Str = $derived.by((): Str => {
    const lang: Str = validated.lang ?? 'text';
    if (lang === 'typescript') {
      return 'TypeScript' as Str;
    }
    if (lang === 'javascript') {
      return 'JavaScript' as Str;
    }
    return (lang.charAt(0).toUpperCase() + lang.slice(1)) as Str;
  });

  /** Search matches — array of line indices (0-based) that contain the query. */
  const searchMatches: Num[] = $derived.by((): Num[] => {
    if (!searchQuery || searchQuery.length === 0) {
      return [];
    }
    const q: Str = searchQuery.toLowerCase() as Str;
    const matches: Num[] = [];
    for (let i: Num = 0 as Num; i < lines.length; i++) {
      if ((lines[i] ?? '').toLowerCase().includes(q)) {
        matches.push(i as Num);
      }
    }
    return matches;
  });

  /** Total number of matching lines. */
  const matchCount: Num = $derived(searchMatches.length as Num);

  /**
   * Toggle the search bar open/closed.
   */
  function toggleSearch(): Void {
    searchOpen = !searchOpen;
    if (searchOpen) {
      searchQuery = '' as Str;
      currentMatchIndex = 0 as Num;
      /* Focus input after DOM update */
      requestAnimationFrame((): void => {
        searchInputRef?.focus();
      });
    }
  }

  /**
   * Navigate to the next search match.
   */
  function nextMatch(): Void {
    if (matchCount === 0) {
      return;
    }
    currentMatchIndex = (((currentMatchIndex as number) + 1) % (matchCount as number)) as Num;
    scrollToMatch();
  }

  /**
   * Navigate to the previous search match.
   */
  function prevMatch(): Void {
    if (matchCount === 0) {
      return;
    }
    currentMatchIndex = (((currentMatchIndex as number) - 1 + (matchCount as number)) %
      (matchCount as number)) as Num;
    scrollToMatch();
  }

  /**
   * Scroll the current match line into view within the code container.
   */
  function scrollToMatch(): Void {
    if (!codeContainerRef || matchCount === 0) {
      return;
    }
    const lineIndex: Num = searchMatches[currentMatchIndex as number] as Num;
    const lineEl: Element | null = codeContainerRef.querySelector(
      `[data-line="${(lineIndex as number) + 1}"]`,
    );
    if (lineEl) {
      lineEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  /**
   * Highlight matching text in a line by wrapping matches in <mark> tags.
   *
   * @param line - The source line text
   * @returns HTML string with highlighted matches
   */
  function highlightMatches(line: Str): Str {
    if (!searchQuery || searchQuery.length === 0) {
      return escapeHtml(line);
    }
    const escaped: Str = escapeHtml(line);
    const q: Str = escapeHtml(searchQuery);
    const regex: RegExp = new RegExp(escapeRegex(q), 'gi');
    return escaped.replace(
      regex,
      (match: Str): Str => `<mark class="bg-yellow-300/50 dark:bg-yellow-500/30">${match}</mark>`,
    ) as Str;
  }

  /**
   * Escape HTML special characters.
   *
   * @param text - Raw text
   * @returns HTML-safe string
   */
  function escapeHtml(text: Str): Str {
    return text
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;') as Str;
  }

  /**
   * Escape regex special characters for use in RegExp constructor.
   *
   * @param text - Raw text
   * @returns Regex-safe string
   */
  function escapeRegex(text: Str): Str {
    return text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`) as Str;
  }

  /**
   * Lazy-load Shiki and produce highlighted HTML.
   *
   * Uses `codeToHtml` from shiki with dual theme support.
   * Runs whenever `code`, `lang`, or `isDark` change.
   */
  $effect(() => {
    const currentCode: Str = validated.code;
    const currentLang: Str = validated.lang ?? 'svelte';
    const currentDark: Bool = isDark;
    let cancelled: Bool = false;

    loading = true;

    (async (): Promise<void> => {
      try {
        const { codeToHtml } = await import('shiki');
        if (cancelled) {
          return;
        }

        const html: Str = await codeToHtml(currentCode, {
          lang: currentLang,
          theme: currentDark ? 'github-dark' : 'github-light',
        });
        if (cancelled) {
          return;
        }

        highlightedHtml = html;
      } catch {
        /* Shiki load failed — show plain text fallback */
        if (!cancelled) {
          highlightedHtml = '';
        }
      } finally {
        if (!cancelled) {
          loading = false;
        }
      }
    })();

    return (): void => {
      cancelled = true;
    };
  });
</script>

<div
  class={cn('group/codeblock relative max-w-full rounded-md text-sm', validated.class)}
  {...restProps}
>
  <!-- Header bar: language chip + line count + options menu -->
  <div class="flex items-center justify-between border-b px-3 py-1.5">
    <div class="flex items-center gap-2">
      <!-- Language chip -->
      <span
        class="inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] font-medium text-muted-foreground"
      >
        {langLabel}
      </span>
      <!-- Line count -->
      <span class="text-[10px] text-muted-foreground/50">
        {lineCount} lines
      </span>
    </div>

    <!-- Options menu (⋮) -->
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <button
            {...props}
            class="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Code block options"
          >
            <EllipsisVertical class="size-3.5" />
          </button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" class="w-44">
        {#if validated.showSearch}
          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              toggleSearch();
            }}
          >
            <Search class="size-4" />
            Search
            {#if searchOpen}
              <span in:fade={{ duration: 150 }}
                ><Check class="ml-auto size-3.5 text-green-500" /></span
              >
            {/if}
          </DropdownMenu.Item>
        {/if}
        <DropdownMenu.Item
          onSelect={(e) => {
            e.preventDefault();
            lineNumbers = !lineNumbers;
          }}
        >
          <ListOrdered class="size-4" />
          Line Numbers
          {#if lineNumbers}
            <span in:fade={{ duration: 150 }}
              ><Check class="ml-auto size-3.5 text-green-500" /></span
            >
          {/if}
        </DropdownMenu.Item>
        <DropdownMenu.Item
          onSelect={(e) => {
            e.preventDefault();
            wrapEnabled = !wrapEnabled;
          }}
        >
          <WrapText class="size-4" />
          Word Wrap
          {#if wrapEnabled}
            <span in:fade={{ duration: 150 }}
              ><Check class="ml-auto size-3.5 text-green-500" /></span
            >
          {/if}
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </div>

  <!-- Search bar -->
  {#if searchOpen}
    <div class="flex items-center gap-2 border-b bg-muted/30 px-3 py-1.5">
      <Search class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <input
        bind:this={searchInputRef}
        type="text"
        placeholder="Find in source..."
        class="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
        bind:value={searchQuery}
        onkeydown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
              prevMatch();
            } else {
              nextMatch();
            }
          }
          if (e.key === 'Escape') {
            toggleSearch();
          }
        }}
      />
      {#if searchQuery}
        <span
          class="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
        >
          {matchCount > 0 ? `${(currentMatchIndex as number) + 1}/${matchCount}` : '0/0'}
        </span>
        <button
          type="button"
          class="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
          onclick={prevMatch}
          aria-label="Previous match"
          disabled={matchCount === 0}
        >
          <ChevronUp class="size-3.5" />
        </button>
        <button
          type="button"
          class="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
          onclick={nextMatch}
          aria-label="Next match"
          disabled={matchCount === 0}
        >
          <ChevronDown class="size-3.5" />
        </button>
      {/if}
      <button
        type="button"
        class="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        onclick={toggleSearch}
        aria-label="Close search"
      >
        <X class="size-3.5" />
      </button>
    </div>
  {/if}

  <!-- Code content -->
  <div
    bind:this={codeContainerRef}
    class={cn(
      'overflow-x-auto [&_pre]:p-4',
      wrapEnabled &&
        '[&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_code]:whitespace-pre-wrap [&_code]:break-words',
      lineNumbers && 'codeblock-line-numbers',
    )}
  >
    {#if loading}
      <pre class="p-4"><code>{validated.code}</code></pre>
    {:else if highlightedHtml && searchQuery && matchCount > 0}
      <!-- Search-highlighted rendering: show plain lines with match marks -->
      <pre class="p-4"><code
          >{#each lines as line, i}<span
              data-line={i + 1}
              class={cn(
                'line',
                searchMatches.includes(i as Num) &&
                  i === (searchMatches[currentMatchIndex as number] ?? -1)
                  ? 'bg-yellow-200/30 dark:bg-yellow-500/10'
                  : '',
              )}
              ><!-- eslint-disable-next-line svelte/no-at-html-tags -- Search highlighting wraps escaped HTML -->{@html highlightMatches(
                line,
              )}{'\n'}</span
            >{/each}</code
        ></pre>
    {:else if highlightedHtml}
      <!-- eslint-disable-next-line svelte/no-at-html-tags -- Shiki produces trusted HTML -->
      {@html highlightedHtml}
    {:else}
      <pre class="p-4"><code>{validated.code}</code></pre>
    {/if}
  </div>
</div>

<style>
  /*
   * CSS counter-based line numbers.
   * Applied via the `.codeblock-line-numbers` class on the code container.
   * Targets Shiki's `span.line` elements — guarantees 1:1 alignment because
   * the line number is a ::before pseudo-element on the actual code line.
   */
  :global(.codeblock-line-numbers) :global(code) {
    counter-reset: line;
  }

  :global(.codeblock-line-numbers) :global(.line) {
    counter-increment: line;
  }

  :global(.codeblock-line-numbers) :global(.line)::before {
    content: counter(line);
    display: inline-block;
    width: 3ch;
    margin-right: 1.5ch;
    text-align: right;
    color: var(--color-muted-foreground);
    opacity: 0.3;
    user-select: none;
  }
</style>
