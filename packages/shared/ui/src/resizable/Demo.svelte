<script lang="ts">
import DemoSection from '../demo-section/DemoSection.svelte';
import * as Resizable from './index.js';
</script>

<div class="flex flex-col gap-6">
	<DemoSection title="Horizontal Layout" description="Two-pane horizontal layout with a draggable resize handle.">
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
	</DemoSection>

	<DemoSection title="Vertical Layout" description="Two-pane vertical layout with a horizontal drag handle.">
		<div class="h-64 rounded-lg border">
			<Resizable.PaneGroup direction="vertical">
				<Resizable.Pane defaultSize={40}>
					<div class="flex h-full items-center justify-center bg-muted/30 p-4">
						<span class="text-sm font-medium text-muted-foreground">Top Pane</span>
					</div>
				</Resizable.Pane>
				<Resizable.Handle withHandle />
				<Resizable.Pane defaultSize={60}>
					<div class="flex h-full items-center justify-center bg-muted/30 p-4">
						<span class="text-sm font-medium text-muted-foreground">Bottom Pane</span>
					</div>
				</Resizable.Pane>
			</Resizable.PaneGroup>
		</div>
	</DemoSection>

	<DemoSection title="Three Panes" description="Three horizontal panes with two resize handles.">
		<div class="h-48 rounded-lg border">
			<Resizable.PaneGroup direction="horizontal">
				<Resizable.Pane defaultSize={25} minSize={15}>
					<div class="flex h-full items-center justify-center bg-muted/30 p-4">
						<span class="text-sm font-medium text-muted-foreground">Sidebar</span>
					</div>
				</Resizable.Pane>
				<Resizable.Handle />
				<Resizable.Pane defaultSize={50} minSize={20}>
					<div class="flex h-full items-center justify-center p-4">
						<span class="text-sm font-medium text-muted-foreground">Main Content</span>
					</div>
				</Resizable.Pane>
				<Resizable.Handle />
				<Resizable.Pane defaultSize={25} minSize={15}>
					<div class="flex h-full items-center justify-center bg-muted/30 p-4">
						<span class="text-sm font-medium text-muted-foreground">Inspector</span>
					</div>
				</Resizable.Pane>
			</Resizable.PaneGroup>
		</div>
	</DemoSection>

	<DemoSection title="Without Handle Grip" description="A minimal handle without the visible grip icon.">
		<div class="h-48 rounded-lg border">
			<Resizable.PaneGroup direction="horizontal">
				<Resizable.Pane defaultSize={50}>
					<div class="flex h-full items-center justify-center bg-muted/30 p-4">
						<span class="text-sm font-medium text-muted-foreground">Left</span>
					</div>
				</Resizable.Pane>
				<Resizable.Handle />
				<Resizable.Pane defaultSize={50}>
					<div class="flex h-full items-center justify-center bg-muted/30 p-4">
						<span class="text-sm font-medium text-muted-foreground">Right</span>
					</div>
				</Resizable.Pane>
			</Resizable.PaneGroup>
		</div>
	</DemoSection>

	<DemoSection title="Nested Layout" description="Horizontal panes with a vertically-split right pane.">
		<div class="h-64 rounded-lg border">
			<Resizable.PaneGroup direction="horizontal">
				<Resizable.Pane defaultSize={40} minSize={20}>
					<div class="flex h-full items-center justify-center bg-muted/30 p-4">
						<span class="text-sm font-medium text-muted-foreground">Left Pane</span>
					</div>
				</Resizable.Pane>
				<Resizable.Handle withHandle />
				<Resizable.Pane defaultSize={60} minSize={30}>
					<Resizable.PaneGroup direction="vertical">
						<Resizable.Pane defaultSize={50}>
							<div class="flex h-full items-center justify-center p-4">
								<span class="text-sm font-medium text-muted-foreground">Top Right</span>
							</div>
						</Resizable.Pane>
						<Resizable.Handle withHandle />
						<Resizable.Pane defaultSize={50}>
							<div class="flex h-full items-center justify-center p-4">
								<span class="text-sm font-medium text-muted-foreground">Bottom Right</span>
							</div>
						</Resizable.Pane>
					</Resizable.PaneGroup>
				</Resizable.Pane>
			</Resizable.PaneGroup>
		</div>
	</DemoSection>
</div>
