<script module lang="ts">
import * as v from 'valibot';

/** Schema for LensSource component props. */
export const LensSourcePropsSchema = v.strictObject({
	/** Component directory name (kebab-case). @values button, dialog, sidebar */
	name: v.string(),
	/** Raw source code string. @values let x = 1, const y = 2, export default z */
	source: v.string(),
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
import { safeParse } from '@/utils/result/safe';
import { toTitle } from '../lens/lens-utils.js';
import LensSection from '../lens-section/LensSection.svelte';
import CodeBlock from '../code-block/CodeBlock.svelte';
import FileCode from '@lucide/svelte/icons/file-code';

const rawProps = $props();
const validated = safeParse(LensSourcePropsSchema, rawProps);
if (!validated.ok) throw validated.error;
const { name, source }: LensSourceProps = validated.data;
</script>

<section id="source" class="scroll-mt-60">
	<h2 class="mb-3 flex items-center gap-2 text-lg font-semibold"><FileCode class="size-5" /> Source</h2>
	<LensSection title={toTitle(name)} description="Component source code." codeText={source}>
		{#snippet code()}
			<CodeBlock code={source} lang="svelte" />
		{/snippet}
	</LensSection>
</section>
