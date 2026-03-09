<script lang="ts">
/**
 * Component header for Lens documentation pages.
 *
 * Displays an icon, title, description, category/tag badges, a
 * copy-import shortcut, and a section navigation dropdown menu.
 */
import type { Bool, Str, Void } from '@/schemas/common';
import type { LensMeta } from '../lens/types.js';
import { toTitle } from '../lens/lens-utils.js';
import Badge from '../badge/badge.svelte';
import CopyImport from '../copy-import/CopyImport.svelte';
import * as DropdownMenu from '../dropdown-menu/index.js';
import * as Tooltip from '../tooltip/index.js';
import ComponentIcon from '@lucide/svelte/icons/component';
import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical';
import TableProperties from '@lucide/svelte/icons/table-properties';
import Layers from '@lucide/svelte/icons/layers';
import BookOpen from '@lucide/svelte/icons/book-open';
import FileCode from '@lucide/svelte/icons/file-code';

type LensHeaderProps = {
	/** Component directory name (kebab-case). @values button, dialog, sidebar */
	name: Str;
	/** Component description extracted from source JSDoc. @values A clickable button, An overlay dialog, A navigation sidebar */
	description?: Str;
	/** Validated lens metadata for category/tag badges. */
	meta?: LensMeta | null;
	/** Import path shown in the copy-import chip. @values @/ui/button, @/ui/dialog, @/ui/sidebar */
	importPath?: Str;
	/** Whether the component has renderable variants. */
	hasVariants?: Bool;
	/** Whether the component has hand-written examples. */
	hasExamples?: Bool;
	/** Whether the component has raw source available. */
	hasSource?: Bool;
};

const { name, description, meta, importPath, hasVariants = false, hasExamples = false, hasSource = false }: LensHeaderProps = $props();

/**
 * Smooth-scroll to a section by its element ID.
 *
 * @param id - The DOM element ID to scroll to
 */
function scrollTo(id: Str): Void {
	document.querySelector(`#${id}`)?.scrollIntoView({ behavior: 'smooth' });
}
</script>

<div class="flex items-start gap-4">
	<div class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
		<ComponentIcon class="size-6 text-primary" />
	</div>
	<div class="min-w-0 flex-1">
		<div class="flex items-baseline gap-2">
			<h1 class="text-3xl font-bold tracking-tight">{toTitle(name)}</h1>
			<DropdownMenu.Root>
				<Tooltip.Root delayDuration={300}>
					<Tooltip.Trigger>
						{#snippet child({ props: tooltipProps })}
							<DropdownMenu.Trigger>
								{#snippet child({ props: triggerProps })}
									<button
										type="button"
										class="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
										{...tooltipProps}
										{...triggerProps}
									>
										<EllipsisVertical class="size-4" />
										<span class="sr-only">Section navigation</span>
									</button>
								{/snippet}
							</DropdownMenu.Trigger>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="right" sideOffset={4}>
						Section navigation
					</Tooltip.Content>
				</Tooltip.Root>
				<DropdownMenu.Content align="start" sideOffset={4}>
					<DropdownMenu.Item onclick={() => scrollTo('props')}>
						<TableProperties class="mr-2 size-4" />
						Go to Props
					</DropdownMenu.Item>
					{#if hasVariants}
						<DropdownMenu.Item onclick={() => scrollTo('default')}>
							<ComponentIcon class="mr-2 size-4" />
							Go to Default
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={() => scrollTo('variants')}>
							<Layers class="mr-2 size-4" />
							Go to Variants
						</DropdownMenu.Item>
					{/if}
					<DropdownMenu.Item onclick={() => scrollTo('examples')}>
						<BookOpen class="mr-2 size-4" />
						Go to Examples
					</DropdownMenu.Item>
					{#if hasSource}
						<DropdownMenu.Item onclick={() => scrollTo('source')}>
							<FileCode class="mr-2 size-4" />
							Go to Source
						</DropdownMenu.Item>
					{/if}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
		{#if description}
			<p class="mt-1 text-sm text-muted-foreground">{description}</p>
		{/if}
		{#if meta}
			<div class="mt-2 flex flex-wrap items-center gap-1.5">
				<Badge variant="secondary" class="text-xs capitalize">{meta.category}</Badge>
				{#each meta.tags as tag (tag)}
					<Badge variant="outline" class="text-xs">{tag}</Badge>
				{/each}
			</div>
		{/if}
		<div class="mt-1.5">
			<CopyImport text={importPath ?? `@/ui/${name}`} copyText="import ... from '@/ui/{name}/...';" />
		</div>
	</div>
</div>
