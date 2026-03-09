<script lang="ts">
import type { Str } from '@/schemas/common';
import SearchAutocomplete from './SearchAutocomplete.svelte';
import type { SearchItem } from './search-item.js';
import DemoSection from '../demo-section/DemoSection.svelte';

let selectedLabel: Str = $state('(none)');

const fruits: SearchItem[] = [
	{ value: 'apple', label: 'Apple' },
	{ value: 'banana', label: 'Banana' },
	{ value: 'cherry', label: 'Cherry' },
	{ value: 'date', label: 'Date' },
	{ value: 'elderberry', label: 'Elderberry' },
	{ value: 'fig', label: 'Fig' },
	{ value: 'grape', label: 'Grape' },
];

const grouped: SearchItem[] = [
	{ value: 'button', label: 'Button', group: 'Primitives' },
	{ value: 'input', label: 'Input', group: 'Primitives' },
	{ value: 'label', label: 'Label', group: 'Primitives' },
	{ value: 'dialog', label: 'Dialog', group: 'Overlays' },
	{ value: 'popover', label: 'Popover', group: 'Overlays' },
	{ value: 'sheet', label: 'Sheet', group: 'Overlays' },
	{ value: 'sidebar', label: 'Sidebar', group: 'Layout' },
	{ value: 'card', label: 'Card', group: 'Layout' },
];
</script>

<div class="flex flex-col gap-6">
	<DemoSection title="Basic" description="Flat list with selection callback.">
		<div class="flex items-center gap-4">
			<SearchAutocomplete
				items={fruits}
				placeholder="Search fruits..."
				onSelect={(item) => {
					selectedLabel = item.label;
				}}
			/>
			<span class="text-sm text-muted-foreground">Selected: {selectedLabel}</span>
		</div>
	</DemoSection>

	<DemoSection title="Grouped" description="Items organized under group headings.">
		<SearchAutocomplete
			items={grouped}
			placeholder="Search components..."
			emptyText="No components found."
		/>
	</DemoSection>

	<DemoSection title="Custom Empty Text" description="Shows a custom message when no items match.">
		<SearchAutocomplete
			items={[{ value: 'only', label: 'The Only Item' }]}
			placeholder="Try searching..."
			emptyText="Nothing here — try a different query."
		/>
	</DemoSection>
</div>
