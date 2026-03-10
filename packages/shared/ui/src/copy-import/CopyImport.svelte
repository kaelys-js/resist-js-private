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

const allProps = $props();
const rawProps: Record<Str, unknown> = stripSvelteProps(allProps);
const validated = safeParse(CopyImportPropsSchema, rawProps);
if (!validated.ok) throw validated.error;
const { text, copyText, class: className }: CopyImportProps = validated.data;
</script>

<span class={cn('inline-flex items-center gap-1.5', className)}>
	<code class="rounded bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
		{text}
	</code>
	<CopyButton text={copyText ?? text} label="Copy to clipboard" />
</span>
