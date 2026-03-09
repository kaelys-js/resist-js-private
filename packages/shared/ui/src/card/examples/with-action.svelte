<script lang="ts">
import * as Card from '@/ui/card';
</script>

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
