<script lang="ts">
import Kbd from './Kbd.svelte';
import DemoSection from '../demo-section/DemoSection.svelte';
</script>

<div class="flex flex-col gap-6">
	<DemoSection title="Single Keys" description="Individual keyboard keys rendered as badges.">
		<div class="flex flex-wrap items-center gap-3">
			<Kbd label="Esc" alwaysVisible />
			<Kbd label="Tab" alwaysVisible />
			<Kbd label="Enter" alwaysVisible />
			<Kbd label="Space" alwaysVisible />
			<Kbd label="Delete" alwaysVisible />
		</div>
	</DemoSection>

	<DemoSection title="Modifier Combos" description="Common keyboard shortcuts with modifier keys.">
		<div class="flex flex-wrap items-center gap-3">
			<Kbd label="⌘B" alwaysVisible />
			<Kbd label="⌘S" alwaysVisible />
			<Kbd label="⌘Z" alwaysVisible />
			<Kbd label="Ctrl+C" alwaysVisible />
			<Kbd label="Ctrl+Shift+P" alwaysVisible />
			<Kbd label="Alt+F4" alwaysVisible />
		</div>
	</DemoSection>

	<DemoSection title="Always Visible vs Responsive" description="By default, Kbd is hidden on mobile (shown at md+). Set alwaysVisible to override.">
		<div class="flex flex-col gap-3">
			<div class="flex items-center gap-2">
				<span class="text-sm">Always visible:</span>
				<Kbd label="⌘K" alwaysVisible />
			</div>
			<div class="flex items-center gap-2">
				<span class="text-sm">Responsive (hidden on mobile):</span>
				<Kbd label="⌘K" />
			</div>
		</div>
	</DemoSection>

	<DemoSection title="In Context" description="Kbd badges used inline with menu items and labels.">
		<div class="flex max-w-xs flex-col gap-1">
			<div class="flex items-center justify-between rounded-md px-3 py-2 hover:bg-accent">
				<span class="text-sm">Save</span>
				<Kbd label="⌘S" alwaysVisible />
			</div>
			<div class="flex items-center justify-between rounded-md px-3 py-2 hover:bg-accent">
				<span class="text-sm">Undo</span>
				<Kbd label="⌘Z" alwaysVisible />
			</div>
			<div class="flex items-center justify-between rounded-md px-3 py-2 hover:bg-accent">
				<span class="text-sm">Redo</span>
				<Kbd label="⌘⇧Z" alwaysVisible />
			</div>
			<div class="flex items-center justify-between rounded-md px-3 py-2 hover:bg-accent">
				<span class="text-sm">Command Palette</span>
				<Kbd label="⌘K" alwaysVisible />
			</div>
		</div>
	</DemoSection>
</div>
