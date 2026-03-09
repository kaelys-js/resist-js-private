<script lang="ts">
import Label from './label.svelte';
import DemoSection from '../demo-section/DemoSection.svelte';
</script>

<div class="flex flex-col gap-6">
	<DemoSection title="Standalone" description="A label rendered on its own.">
		<Label>Email address</Label>
	</DemoSection>

	<DemoSection title="Paired with Input" description="Label associated with an input field via the for attribute.">
		<div class="flex max-w-xs flex-col gap-2">
			<Label for="demo-email">Email</Label>
			<input
				id="demo-email"
				type="email"
				placeholder="you@example.com"
				class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
			/>
		</div>
	</DemoSection>

	<DemoSection title="Multiple Fields" description="Labels in a typical form layout.">
		<div class="flex max-w-sm flex-col gap-4">
			<div class="flex flex-col gap-2">
				<Label for="demo-username">Username</Label>
				<input
					id="demo-username"
					type="text"
					placeholder="huntabyte"
					class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
				/>
			</div>
			<div class="flex flex-col gap-2">
				<Label for="demo-password">Password</Label>
				<input
					id="demo-password"
					type="password"
					placeholder="Enter your password"
					class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
				/>
			</div>
		</div>
	</DemoSection>

	<DemoSection title="Disabled State" description="Label inherits the disabled look when its parent group is disabled.">
		<div class="group flex max-w-xs flex-col gap-2" data-disabled="true">
			<Label for="demo-disabled">Disabled Field</Label>
			<input
				id="demo-disabled"
				type="text"
				disabled
				placeholder="Cannot edit"
				class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
			/>
		</div>
	</DemoSection>
</div>
