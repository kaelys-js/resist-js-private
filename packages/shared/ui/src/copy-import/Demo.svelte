<script lang="ts">
import CopyImport from './CopyImport.svelte';
import DemoSection from '../demo-section/DemoSection.svelte';
</script>

<div class="flex flex-col gap-6">
	<DemoSection title="Default" description="Code badge with copy button. Hover for tooltip, click to copy.">
		<CopyImport text="@/ui/button" />
	</DemoSection>

	<DemoSection title="Custom Copy Text" description="Displayed text differs from what is copied to clipboard.">
		<CopyImport text="@/ui/dialog" copyText="import * as Dialog from '@/ui/dialog/index.js';" />
	</DemoSection>

	<DemoSection title="Multiple Inline" description="Several badges side by side.">
		<div class="flex flex-wrap items-center gap-4">
			<CopyImport text="@/ui/button" />
			<CopyImport text="@/ui/tooltip" />
			<CopyImport text="@/ui/command" />
		</div>
	</DemoSection>

	<DemoSection title="Long Path" description="Handles longer import paths gracefully.">
		<CopyImport
			text="@/ui/search-autocomplete"
			copyText="import SearchAutocomplete from '@/ui/search-autocomplete/SearchAutocomplete.svelte';"
		/>
	</DemoSection>
</div>
