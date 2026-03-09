<script lang="ts">
import AppLogo from './AppLogo.svelte';
import DemoSection from '../demo-section/DemoSection.svelte';
</script>

<div class="flex flex-col gap-6">
	<DemoSection title="Default (24px)" description="The default logo size used in most contexts.">
		<AppLogo />
	</DemoSection>

	<DemoSection title="Sizes" description="The logo scales to any pixel size via the size prop.">
		<div class="flex items-end gap-8">
			<div class="flex flex-col items-center gap-2">
				<AppLogo size={16} />
				<span class="text-xs text-muted-foreground">16px</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<AppLogo size={24} />
				<span class="text-xs text-muted-foreground">24px</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<AppLogo size={32} />
				<span class="text-xs text-muted-foreground">32px</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<AppLogo size={48} />
				<span class="text-xs text-muted-foreground">48px</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<AppLogo size={64} />
				<span class="text-xs text-muted-foreground">64px</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<AppLogo size={96} />
				<span class="text-xs text-muted-foreground">96px</span>
			</div>
		</div>
	</DemoSection>

	<DemoSection title="In Context" description="Logo alongside text in a typical header layout.">
		<div class="flex items-center gap-3">
			<AppLogo size={32} />
			<span class="text-lg font-semibold">WebForge</span>
		</div>
	</DemoSection>
</div>
