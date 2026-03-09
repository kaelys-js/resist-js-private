<script lang="ts">
import type { Bool } from '@/schemas/common';
import Switch from './switch.svelte';
import DemoSection from '../demo-section/DemoSection.svelte';

let unchecked: Bool = $state(false);
let checked: Bool = $state(true);
let withLabel: Bool = $state(false);
</script>

<div class="flex flex-col gap-6">
	<DemoSection title="Unchecked" description="Default unchecked switch. Click to toggle.">
		<Switch bind:checked={unchecked} />
	</DemoSection>

	<DemoSection title="Checked" description="Switch in the checked (on) state.">
		<Switch bind:checked />
	</DemoSection>

	<DemoSection title="Disabled (Unchecked)" description="Disabled switch in the off state.">
		<Switch disabled checked={false} />
	</DemoSection>

	<DemoSection title="Disabled (Checked)" description="Disabled switch in the on state.">
		<Switch disabled checked={true} />
	</DemoSection>

	<DemoSection title="With Label" description="Switch paired with a clickable label.">
		<div class="flex items-center gap-3">
			<Switch id="demo-label" bind:checked={withLabel} />
			<label for="demo-label" class="text-sm font-medium">
				Enable notifications
			</label>
		</div>
	</DemoSection>

	<DemoSection title="Form Layout" description="Multiple switches in a settings-like layout.">
		<div class="flex max-w-md flex-col gap-4">
			<div class="flex items-center justify-between rounded-lg border p-4">
				<div>
					<p class="text-sm font-medium">Dark mode</p>
					<p class="text-xs text-muted-foreground">Switch between light and dark themes.</p>
				</div>
				<Switch />
			</div>
			<div class="flex items-center justify-between rounded-lg border p-4">
				<div>
					<p class="text-sm font-medium">Auto-save</p>
					<p class="text-xs text-muted-foreground">Automatically save changes as you work.</p>
				</div>
				<Switch checked={true} />
			</div>
			<div class="flex items-center justify-between rounded-lg border p-4">
				<div>
					<p class="text-sm font-medium">Experimental features</p>
					<p class="text-xs text-muted-foreground">Try out features that are still in development.</p>
				</div>
				<Switch disabled />
			</div>
		</div>
	</DemoSection>
</div>
