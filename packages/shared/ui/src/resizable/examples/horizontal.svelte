<script lang="ts">
import * as Resizable from '@/ui/resizable';
</script>

<div class="h-48 rounded-lg border">
	<Resizable.PaneGroup direction="horizontal">
		<Resizable.Pane defaultSize={50}>
			<div class="flex h-full items-center justify-center bg-muted/30 p-4">
				<span class="text-sm font-medium text-muted-foreground">Left Pane</span>
			</div>
		</Resizable.Pane>
		<Resizable.Handle withHandle />
		<Resizable.Pane defaultSize={50}>
			<div class="flex h-full items-center justify-center bg-muted/30 p-4">
				<span class="text-sm font-medium text-muted-foreground">Right Pane</span>
			</div>
		</Resizable.Pane>
	</Resizable.PaneGroup>
</div>
