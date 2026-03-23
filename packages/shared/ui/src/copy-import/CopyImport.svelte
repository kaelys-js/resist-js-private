<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CopyImportPropsSchema = v.strictObject({
    /** The text displayed inside the code badge. @values @/ui/button, @/ui/dialog, @/ui/input */
    text: StrSchema,
    /** Text copied to clipboard. Defaults to `text` when omitted. @values npm install @/ui/button, pnpm add @/ui/dialog */
    copyText: v.optional(StrSchema),
    /** Additional CSS classes for the root element. */
    class: v.optional(StrSchema),
  });
  export type CopyImportProps = v.InferOutput<typeof CopyImportPropsSchema>;
</script>

<script lang="ts">
  /**
   * Monospace code badge with a copy-to-clipboard button and tooltip feedback.
   *
   * Clicking the copy icon copies text to the clipboard with visual
   * success/failure feedback via the shared CopyButton component.
   *
   * @example
   * ```svelte
   * <CopyImport text="@/ui/button" />
   * <CopyImport text="@/ui/dialog" copyText="import { Dialog } from '@/ui/dialog/index.js';" />
   * ```
   */
  import type { Str } from '@/schemas/common';
  import { safeParse } from '@/utils/result/safe';
  import CopyButton from '../copy-button/CopyButton.svelte';
  import { cn } from '../utils.js';
  import { stripSvelteProps } from '../lens/lens-utils.js';

  const { ...restProps }: CopyImportProps = $props();
  const validated: CopyImportProps = $derived.by(() => {
    const rawProps: CopyImportProps = stripSvelteProps(restProps);
    const result = safeParse(CopyImportPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CopyImportProps;
  });
</script>

<span class={cn('inline-flex items-center gap-1.5', validated.class)} {...restProps}>
  <code class="rounded bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
    {validated.text}
  </code>
  <CopyButton text={validated.copyText ?? validated.text} label="Copy to clipboard" />
</span>
