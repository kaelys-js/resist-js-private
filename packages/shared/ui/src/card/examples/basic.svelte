<script lang="ts">
import * as Card from '@/ui/card';
</script>

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
