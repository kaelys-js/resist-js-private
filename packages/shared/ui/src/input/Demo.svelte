<script lang="ts">
import Input from './input.svelte';
import DemoSection from '../demo-section/DemoSection.svelte';
</script>

<div class="flex flex-col gap-6">
	<DemoSection title="Default" description="Basic text input with no additional props.">
		<div class="max-w-sm">
			<Input />
		</div>
	</DemoSection>

	<DemoSection title="With Placeholder" description="Text input with placeholder text.">
		<div class="max-w-sm">
			<Input placeholder="Enter your name..." />
		</div>
	</DemoSection>

	<DemoSection title="Input Types" description="Various HTML input types: text, email, password, number, search, url.">
		<div class="flex max-w-sm flex-col gap-3">
			<div class="flex flex-col gap-1">
				<label class="text-xs font-medium text-muted-foreground" for="demo-text">Text</label>
				<Input id="demo-text" type="text" placeholder="Plain text" />
			</div>
			<div class="flex flex-col gap-1">
				<label class="text-xs font-medium text-muted-foreground" for="demo-email">Email</label>
				<Input id="demo-email" type="email" placeholder="you@example.com" />
			</div>
			<div class="flex flex-col gap-1">
				<label class="text-xs font-medium text-muted-foreground" for="demo-password">Password</label>
				<Input id="demo-password" type="password" placeholder="Secret..." />
			</div>
			<div class="flex flex-col gap-1">
				<label class="text-xs font-medium text-muted-foreground" for="demo-number">Number</label>
				<Input id="demo-number" type="number" placeholder="42" />
			</div>
			<div class="flex flex-col gap-1">
				<label class="text-xs font-medium text-muted-foreground" for="demo-search">Search</label>
				<Input id="demo-search" type="search" placeholder="Search..." />
			</div>
			<div class="flex flex-col gap-1">
				<label class="text-xs font-medium text-muted-foreground" for="demo-url">URL</label>
				<Input id="demo-url" type="url" placeholder="https://example.com" />
			</div>
		</div>
	</DemoSection>

	<DemoSection title="Disabled" description="Input in the disabled state.">
		<div class="max-w-sm">
			<Input disabled placeholder="Cannot edit this..." />
		</div>
	</DemoSection>

	<DemoSection title="File Input" description="File upload variant with type='file'.">
		<div class="max-w-sm">
			<Input type="file" />
		</div>
	</DemoSection>

	<DemoSection title="With Value" description="Input with a pre-filled value.">
		<div class="max-w-sm">
			<Input value="Pre-filled content" />
		</div>
	</DemoSection>

	<DemoSection title="Invalid State" description="Input with aria-invalid for error styling.">
		<div class="max-w-sm">
			<Input aria-invalid="true" value="Bad input" />
		</div>
	</DemoSection>
</div>
