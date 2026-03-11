<script module lang="ts">
import * as v from 'valibot';
import { StrSchema, BoolSchema } from '@/schemas/common';
import { LensMetaSchema, type LensMeta } from '../lens/types.js';

/** Schema for the LensHeader component props. */
export const LensHeaderPropsSchema = v.strictObject({
	/** Component directory name (kebab-case). @values button, dialog, sidebar */
	name: StrSchema,
	/** Component description extracted from source JSDoc. @values A clickable button, An overlay dialog, A navigation sidebar */
	description: v.optional(StrSchema),
	/** Validated lens metadata for category/tag badges. @values {category: "display", tags: ["interactive"], description: "A clickable button"} */
	meta: v.optional(v.nullable(LensMetaSchema)),
	/** Import path shown in the copy-import chip. @values @/ui/button, @/ui/dialog, @/ui/sidebar */
	importPath: v.optional(StrSchema),
	/** Whether the component has renderable variants. @values true, false */
	hasVariants: v.optional(BoolSchema),
	/** Whether the component has hand-written examples. @values true, false */
	hasExamples: v.optional(BoolSchema),
	/** Whether the component has raw source available. @values true, false */
	hasSource: v.optional(BoolSchema),
	/** Whether the component has any import dependencies. @values true, false */
	hasDeps: v.optional(BoolSchema),
	/** Previous component name for sequential navigation (kebab-case). @values button, dialog, sidebar */
	prevComponent: v.optional(v.nullable(StrSchema)),
	/** Next component name for sequential navigation (kebab-case). @values button, dialog, sidebar */
	nextComponent: v.optional(v.nullable(StrSchema)),
});
/** Props for the LensHeader component. */
export type LensHeaderProps = v.InferOutput<typeof LensHeaderPropsSchema>;
</script>

<script lang="ts">
/**
 * Component header for Lens documentation pages.
 *
 * Displays an icon, title, description, category/tag badges, a
 * copy-import shortcut, a section navigation dropdown menu, and
 * previous/next component navigation.
 */
import type { Bool, Str, Void } from '@/schemas/common';
import { safeParse } from '@/utils/result/safe';
import { toTitle, stripSvelteProps } from '../lens/lens-utils.js';
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
import ShieldAlert from '@lucide/svelte/icons/shield-alert';
import GitFork from '@lucide/svelte/icons/git-fork';
import ChevronLeft from '@lucide/svelte/icons/chevron-left';
import ChevronRight from '@lucide/svelte/icons/chevron-right';

const allProps: LensHeaderProps = $props();
const validated: LensHeaderProps = $derived.by(() => {
	const rawProps: LensHeaderProps = stripSvelteProps(allProps);
	const result = safeParse(LensHeaderPropsSchema, rawProps);
	if (!result.ok) throw result.error;
	// DeepReadonly from safeParse is safe to cast — props are read-only in templates
	return result.data as LensHeaderProps;
});

/** Whether the component has renderable variants. */
const hasVariants: Bool = $derived(validated.hasVariants ?? false);

/** Whether the component has hand-written examples. */
const hasExamples: Bool = $derived(validated.hasExamples ?? false);

/** Whether the component has raw source available. */
const hasSource: Bool = $derived(validated.hasSource ?? false);

/** Whether the component has any import dependencies. */
const hasDeps: Bool = $derived(validated.hasDeps ?? false);

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
		<div class="flex items-center gap-4">
			<div class="flex items-baseline gap-4">
				<h1 class="text-3xl font-bold tracking-tight">{toTitle(validated.name)}</h1>

				<div class="flex items-center gap-1">
				<!-- Section navigation dropdown -->
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
						<DropdownMenu.Item onclick={() => scrollTo('error-boundary')}>
							<ShieldAlert class="mr-2 size-4" />
							Go to Error Boundary
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
					{#if hasDeps}
						<DropdownMenu.Item onclick={() => scrollTo('dependencies')}>
							<GitFork class="mr-2 size-4" />
							Go to Dependencies
						</DropdownMenu.Item>
					{/if}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
				</div>
			</div>

			<!-- Previous / Next component navigation -->
			<div class="ml-auto flex items-center gap-1">
				{#if validated.prevComponent}
					<Tooltip.Root delayDuration={300}>
						<Tooltip.Trigger>
							{#snippet child({ props: tooltipProps })}
								<a
									href="/components/{validated.prevComponent}"
									class="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
									{...tooltipProps}
								>
									<ChevronLeft class="size-4" />
									<span class="sr-only">Previous: {toTitle(validated.prevComponent ?? '')}</span>
								</a>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content side="bottom" sideOffset={4}>
							{toTitle(validated.prevComponent ?? '')}
						</Tooltip.Content>
					</Tooltip.Root>
				{:else}
					<span class="inline-flex size-8 items-center justify-center text-muted-foreground/30">
						<ChevronLeft class="size-4" />
					</span>
				{/if}
				{#if validated.nextComponent}
					<Tooltip.Root delayDuration={300}>
						<Tooltip.Trigger>
							{#snippet child({ props: tooltipProps })}
								<a
									href="/components/{validated.nextComponent}"
									class="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
									{...tooltipProps}
								>
									<ChevronRight class="size-4" />
									<span class="sr-only">Next: {toTitle(validated.nextComponent ?? '')}</span>
								</a>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content side="bottom" sideOffset={4}>
							{toTitle(validated.nextComponent ?? '')}
						</Tooltip.Content>
					</Tooltip.Root>
				{:else}
					<span class="inline-flex size-8 items-center justify-center text-muted-foreground/30">
						<ChevronRight class="size-4" />
					</span>
				{/if}
			</div>
		</div>
		{#if validated.description}
			<p class="mt-1 text-sm text-muted-foreground">{validated.description}</p>
		{/if}
		{#if validated.meta}
			<div class="mt-2 flex flex-wrap items-center gap-1.5">
				<Badge variant="secondary" class="text-xs capitalize">{validated.meta.category}</Badge>
				{#each validated.meta.tags as tag, i (i)}
					<Badge variant="outline" class="text-xs">{tag}</Badge>
				{/each}
			</div>
		{/if}
		<div class="mt-1.5">
			<CopyImport text={validated.importPath ?? `@/ui/${validated.name}`} copyText="import ... from '@/ui/{validated.name}/...';" />
		</div>
	</div>
</div>
