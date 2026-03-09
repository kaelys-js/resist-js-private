<script lang="ts">
/**
 * Source code section for Lens documentation pages.
 *
 * Wraps LensSection + CodeBlock to display component source code
 * with collapsible code toggle and copy-to-clipboard.
 */
import type { Str } from '@/schemas/common';
import { toTitle } from '../lens/lens-utils.js';
import LensSection from '../lens-section/LensSection.svelte';
import CodeBlock from '../code-block/CodeBlock.svelte';
import FileCode from '@lucide/svelte/icons/file-code';

type LensSourceProps = {
	/** Component directory name (kebab-case). @values button, dialog, sidebar */
	name: Str;
	/** Raw source code string. @values let x = 1, const y = 2, export default z */
	source: Str;
};

const { name, source }: LensSourceProps = $props();
</script>

<section id="source" class="scroll-mt-60">
	<h2 class="mb-3 flex items-center gap-2 text-lg font-semibold"><FileCode class="size-5" /> Source</h2>
	<LensSection title={toTitle(name)} description="Component source code." codeText={source}>
		{#snippet code()}
			<CodeBlock code={source} lang="svelte" />
		{/snippet}
	</LensSection>
</section>
