<script module lang="ts">
import * as v from 'valibot';
import { StrSchema } from '@/schemas/common';

/** Schema for LensSource component props. */
export const LensSourcePropsSchema = v.strictObject({
	/** Component directory name (kebab-case). @values button, dialog, sidebar */
	name: StrSchema,
	/** Raw source code string. @values let x = 1, const y = 2, export default z */
	source: StrSchema,
});
/** Props for the LensSource component. */
export type LensSourceProps = v.InferOutput<typeof LensSourcePropsSchema>;
</script>

<script lang="ts">
/**
 * Source code section for Lens documentation pages.
 *
 * Wraps LensSection + CodeBlock to display component source code
 * with collapsible code toggle and copy-to-clipboard.
 */
import type { Str } from '@/schemas/common';
import { safeParse } from '@/utils/result/safe';
import { stripSvelteProps, toTitle } from '../lens/lens-utils.js';
import LensSection from '../lens-section/LensSection.svelte';
import CodeBlock from '../code-block/CodeBlock.svelte';
import FileCode from '@lucide/svelte/icons/file-code';

const allProps = $props();
const validated = $derived.by(() => {
	const rawProps: Record<Str, unknown> = stripSvelteProps(allProps);
	const result = safeParse(LensSourcePropsSchema, rawProps);
	if (!result.ok) throw result.error;
	return result.data;
});
</script>

<section id="source" class="scroll-mt-60">
	<h2 class="mb-3 flex items-center gap-2 text-lg font-semibold"><FileCode class="size-5" /> Source</h2>
	<LensSection title={toTitle(validated.name)} description="Component source code." codeText={validated.source}>
		{#snippet code()}
			<CodeBlock code={validated.source} lang="svelte" />
		{/snippet}
	</LensSection>
</section>
