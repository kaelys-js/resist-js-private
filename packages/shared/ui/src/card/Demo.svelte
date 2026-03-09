<script lang="ts">
import * as Card from './index.js';
import DemoSection from '../demo-section/DemoSection.svelte';
</script>

<div class="flex flex-col gap-6">
	<DemoSection title="Basic Card" description="A minimal card with just content.">
		<Card.Root class="max-w-sm">
			<Card.Content>
				<p class="text-sm text-muted-foreground">This is a simple card with content only.</p>
			</Card.Content>
		</Card.Root>
	</DemoSection>

	<DemoSection title="With Header" description="Card with header containing title and description.">
		<Card.Root class="max-w-sm">
			<Card.Header>
				<Card.Title>Card Title</Card.Title>
				<Card.Description>A short description of what this card is about.</Card.Description>
			</Card.Header>
			<Card.Content>
				<p class="text-sm">The main content area of the card lives here.</p>
			</Card.Content>
		</Card.Root>
	</DemoSection>

	<DemoSection title="Full Card" description="Card with header, content, and footer.">
		<Card.Root class="max-w-sm">
			<Card.Header>
				<Card.Title>Project Settings</Card.Title>
				<Card.Description>Manage your project configuration and preferences.</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="flex flex-col gap-3">
					<div class="flex items-center justify-between">
						<span class="text-sm">Auto-save</span>
						<span class="text-sm text-muted-foreground">Enabled</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm">Theme</span>
						<span class="text-sm text-muted-foreground">Dark</span>
					</div>
				</div>
			</Card.Content>
			<Card.Footer>
				<p class="text-xs text-muted-foreground">Last updated 2 hours ago</p>
			</Card.Footer>
		</Card.Root>
	</DemoSection>

	<DemoSection title="With Action" description="Card header with an action slot for buttons or controls.">
		<Card.Root class="max-w-sm">
			<Card.Header>
				<Card.Title>Notifications</Card.Title>
				<Card.Description>You have 3 unread messages.</Card.Description>
				<Card.Action>
					<button class="text-xs text-primary hover:underline">Mark all read</button>
				</Card.Action>
			</Card.Header>
			<Card.Content>
				<div class="flex flex-col gap-2">
					<div class="rounded-md bg-muted/50 px-3 py-2 text-sm">New comment on your post</div>
					<div class="rounded-md bg-muted/50 px-3 py-2 text-sm">Build completed successfully</div>
					<div class="rounded-md bg-muted/50 px-3 py-2 text-sm">Team invite accepted</div>
				</div>
			</Card.Content>
		</Card.Root>
	</DemoSection>

	<DemoSection title="Multiple Cards" description="Cards arranged side-by-side in a grid layout.">
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
			<Card.Root>
				<Card.Header>
					<Card.Title>Scenes</Card.Title>
					<Card.Description>12 total</Card.Description>
				</Card.Header>
				<Card.Content>
					<p class="text-2xl font-bold">12</p>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header>
					<Card.Title>Assets</Card.Title>
					<Card.Description>248 files</Card.Description>
				</Card.Header>
				<Card.Content>
					<p class="text-2xl font-bold">248</p>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header>
					<Card.Title>Plugins</Card.Title>
					<Card.Description>3 active</Card.Description>
				</Card.Header>
				<Card.Content>
					<p class="text-2xl font-bold">3</p>
				</Card.Content>
			</Card.Root>
		</div>
	</DemoSection>
</div>
