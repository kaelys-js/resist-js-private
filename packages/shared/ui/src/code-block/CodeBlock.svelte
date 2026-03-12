<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  /**
   * Syntax-highlighted code block powered by Shiki.
   *
   * Lazily loads Shiki (highlighter, grammar, themes) on first render.
   * Automatically switches between light and dark themes based on
   * the document's current color scheme class.
   *
   * @example
   * ```svelte
   * <CodeBlock code={rawSource} lang="svelte" />
   * ```
   */
  export const CodeBlockPropsSchema = v.strictObject({
    /** Raw source code to highlight. @values console.log('hello'), const x = 42, <div>Hello</div> */
    code: StrSchema,
    /** Language grammar to use. @values svelte, typescript, javascript, html, css, json, markdown, bash */
    lang: v.optional(StrSchema),
    /** Additional CSS classes for the root element. */
    class: v.optional(StrSchema),
  });
  /** Props for the CodeBlock component. */
  export type CodeBlockProps = v.InferOutput<typeof CodeBlockPropsSchema>;
</script>

<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import { safeParse } from '@/utils/result/safe';
  import { cn } from '../utils.js';
  import { stripSvelteProps } from '../lens/lens-utils.js';

  const allProps: CodeBlockProps = $props();
  const validated: CodeBlockProps = $derived.by(() => {
    const rawProps: CodeBlockProps = stripSvelteProps(allProps);
    const result = safeParse(CodeBlockPropsSchema, rawProps);
    if (!result.ok) throw result.error;
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
        if (cancelled) return;

        const html: Str = await codeToHtml(currentCode, {
          lang: currentLang,
          theme: currentDark ? 'github-dark' : 'github-light',
        });
        if (cancelled) return;

        highlightedHtml = html;
      } catch {
        /* Shiki load failed — show plain text fallback */
        if (!cancelled) {
          highlightedHtml = '';
        }
      } finally {
        if (!cancelled) loading = false;
      }
    })();

    return (): void => {
      cancelled = true;
    };
  });
</script>

<div
  class={cn(
    'max-w-full overflow-x-auto rounded-md text-sm [&_pre]:overflow-x-auto [&_pre]:p-4',
    validated.class,
  )}
>
  {#if loading}
    <pre class="p-4"><code>{validated.code}</code></pre>
  {:else if highlightedHtml}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -- Shiki produces trusted HTML -->
    {@html highlightedHtml}
  {:else}
    <pre class="p-4"><code>{validated.code}</code></pre>
  {/if}
</div>
