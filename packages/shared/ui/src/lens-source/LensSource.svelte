<script module lang="ts">
  import * as v from 'valibot';
  import { BoolSchema, StrSchema } from '@/schemas/common';

  /**
   * Source code section for Lens documentation pages.
   *
   * Wraps LensSection + CodeBlock to display component source code
   * with collapsible code toggle, copy-to-clipboard, syntax highlighting,
   * optional line numbers, search, and word wrap.
   *
   * @example
   * ```svelte
   * <LensSource name="button" source={rawCode} />
   * <LensSource name="button" source={rawCode} lang="typescript" showLineNumbers showSearch />
   * ```
   */
  export const LensSourcePropsSchema = v.strictObject({
    /** Component directory name (kebab-case). @values button, dialog, sidebar */
    name: StrSchema,
    /** Raw source code string. @values let x = 1, const y = 2, export default z */
    source: StrSchema,
    /** Language grammar for syntax highlighting. @values svelte, typescript, javascript, html, css, json */
    lang: v.optional(StrSchema),
    /** Display title override (defaults to PascalCase of name). @values Button, CopyButton, DropdownMenu */
    title: v.optional(StrSchema),
    /** Description text below the title. @values Component source code., Main entry point., Type definitions. */
    description: v.optional(StrSchema),
    /** Whether to show line numbers in the code block. @values true, false */
    showLineNumbers: v.optional(BoolSchema, false),
    /** Whether to enable inline search in the code block. @values true, false */
    showSearch: v.optional(BoolSchema, false),
    /** Whether word wrap is enabled by default. @values true, false */
    wordWrap: v.optional(BoolSchema, false),
    /** Additional CSS classes for the root element. */
    class: v.optional(StrSchema),
  });
  /** Props for the LensSource component. */
  export type LensSourceProps = v.InferOutput<typeof LensSourcePropsSchema>;
</script>

<script lang="ts">
  import type { Str } from '@/schemas/common';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps, toTitle } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';
  import LensSection from '../lens-section/LensSection.svelte';
  import CodeBlock from '../code-block/CodeBlock.svelte';

  const { ...restProps }: LensSourceProps = $props();
  const validated: LensSourceProps = $derived.by(() => {
    const rawProps: LensSourceProps = stripSvelteProps(restProps);
    const result = safeParse(LensSourcePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as LensSourceProps;
  });

  /** Resolved display title — uses title prop or PascalCase of name. */
  const displayTitle: Str = $derived(validated.title ?? toTitle(validated.name));
</script>

<div class={cn('', validated.class)} {...restProps}>
  <LensSection
    title={displayTitle}
    description={validated.description ?? 'Component source code.'}
    codeText={validated.source}
  >
    {#snippet code()}
      <CodeBlock
        code={validated.source}
        lang={validated.lang ?? 'svelte'}
        showLineNumbers={validated.showLineNumbers}
        showSearch={validated.showSearch}
        wordWrap={validated.wordWrap}
      />
    {/snippet}
  </LensSection>
</div>
