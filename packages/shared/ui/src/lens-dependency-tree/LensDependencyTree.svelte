<script module lang="ts">
import * as v from 'valibot';
import { StrSchema } from '@/schemas/common';

/** Schema for a single dependency entry. */
export const DepEntrySchema = v.strictObject({
	/** The import specifier path. */
	path: StrSchema,
	/** Imported names. */
	names: v.array(StrSchema),
	/** UI component directory name (only for internal deps). */
	component: StrSchema,
});

/** Schema for a categorized dependency tree. */
export const DepTreeSchema = v.strictObject({
	/** Sibling UI component imports. */
	internal: v.array(DepEntrySchema),
	/** Workspace package imports. */
	workspace: v.array(DepEntrySchema),
	/** External npm package imports. */
	external: v.array(DepEntrySchema),
});

/** Schema for the LensDependencyTree component props. */
export const LensDependencyTreePropsSchema = v.strictObject({
	/** Categorized dependency tree to render. */
	deps: DepTreeSchema,
	/** Current component name — used to build links to sibling component pages. @values button, dialog, sidebar */
	currentComponent: v.optional(StrSchema),
	/** Additional CSS classes for the root element. */
	class: v.optional(StrSchema),
});
/** Props for the LensDependencyTree component. */
export type LensDependencyTreeProps = v.InferOutput<typeof LensDependencyTreePropsSchema>;
</script>

<script lang="ts">
/**
 * Dependency tree visualization for Lens documentation pages.
 *
 * Renders a categorized tree of component imports with collapsible
 * sections, icons by category, and clickable links to sibling Lens
 * component pages. Three categories: UI Components (internal),
 * Workspace (shared packages), and External (npm packages).
 */
import type { Bool, Num, Str } from '@/schemas/common';
import { safeParse } from '@/utils/result/safe';
import { stripSvelteProps, toTitle } from '../lens/lens-utils.js';
import { cn } from '../utils.js';
import Badge from '../badge/badge.svelte';
import ComponentIcon from '@lucide/svelte/icons/component';
import Package from '@lucide/svelte/icons/package';
import FolderOpen from '@lucide/svelte/icons/folder-open';
import ChevronRight from '@lucide/svelte/icons/chevron-right';

const allProps: LensDependencyTreeProps = $props();
const validated: LensDependencyTreeProps = $derived.by(() => {
	const rawProps: LensDependencyTreeProps = stripSvelteProps(allProps);
	const result = safeParse(LensDependencyTreePropsSchema, rawProps);
	if (!result.ok) throw result.error;
	// DeepReadonly from safeParse is safe to cast — props are read-only in templates
	return result.data as LensDependencyTreeProps;
});

const className: Str = $derived(validated.class ?? '');

/** Which categories are expanded. All start open. */
let expanded: Record<Str, Bool> = $state({
	internal: true,
	workspace: true,
	external: true,
});

/**
 * Toggle a category section open/closed.
 *
 * @param category - Category key ('internal', 'workspace', 'external')
 */
function toggle(category: Str): void {
	expanded[category] = !(expanded[category] ?? true);
}

/** Total dependency count across all categories. */
const totalDeps: Num = $derived(
	validated.deps.internal.length + validated.deps.workspace.length + validated.deps.external.length,
);
</script>

{#if totalDeps === 0}
	<p class="text-sm text-muted-foreground">No dependencies detected.</p>
{:else}
	<div class={cn('space-y-2', className)}>
		<!-- UI Components (internal) -->
		{#if validated.deps.internal.length > 0}
			<div class="overflow-hidden rounded-md border bg-card">
				<button
					type="button"
					class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted/50"
					onclick={() => toggle('internal')}
				>
					<ChevronRight class={cn('size-4 shrink-0 transition-transform', expanded.internal && 'rotate-90')} />
					<ComponentIcon class="size-4 shrink-0 text-primary" />
					<span>UI Components</span>
					<Badge variant="secondary" class="ml-auto text-xs">{validated.deps.internal.length}</Badge>
				</button>
				{#if expanded.internal}
					<div class="border-t px-3 py-2">
						<ul class="space-y-1">
							{#each validated.deps.internal as dep, di (di)}
								<li class="flex items-center gap-2 text-sm">
									<span class="size-1 shrink-0 rounded-full bg-primary/40"></span>
									{#if dep.component}
										<a
											href="/components/{dep.component}"
											class="font-medium text-primary underline-offset-2 hover:underline"
										>
											{toTitle(dep.component)}
										</a>
									{:else}
										<span class="font-medium text-foreground">{dep.names.join(', ')}</span>
									{/if}
									<code class="ml-auto truncate text-xs text-muted-foreground">{dep.path}</code>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Workspace packages -->
		{#if validated.deps.workspace.length > 0}
			<div class="overflow-hidden rounded-md border bg-card">
				<button
					type="button"
					class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted/50"
					onclick={() => toggle('workspace')}
				>
					<ChevronRight class={cn('size-4 shrink-0 transition-transform', expanded.workspace && 'rotate-90')} />
					<FolderOpen class="size-4 shrink-0 text-amber-500" />
					<span>Workspace</span>
					<Badge variant="secondary" class="ml-auto text-xs">{validated.deps.workspace.length}</Badge>
				</button>
				{#if expanded.workspace}
					<div class="border-t px-3 py-2">
						<ul class="space-y-1">
							{#each validated.deps.workspace as dep, wi (wi)}
								<li class="flex items-center gap-2 text-sm">
									<span class="size-1 shrink-0 rounded-full bg-amber-500/40"></span>
									<code class="truncate text-xs text-foreground">{dep.path}</code>
									<span class="ml-auto shrink-0 text-xs text-muted-foreground">{dep.names.join(', ')}</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		{/if}

		<!-- External packages -->
		{#if validated.deps.external.length > 0}
			<div class="overflow-hidden rounded-md border bg-card">
				<button
					type="button"
					class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted/50"
					onclick={() => toggle('external')}
				>
					<ChevronRight class={cn('size-4 shrink-0 transition-transform', expanded.external && 'rotate-90')} />
					<Package class="size-4 shrink-0 text-emerald-500" />
					<span>External</span>
					<Badge variant="secondary" class="ml-auto text-xs">{validated.deps.external.length}</Badge>
				</button>
				{#if expanded.external}
					<div class="border-t px-3 py-2">
						<ul class="space-y-1">
							{#each validated.deps.external as dep, ei (ei)}
								<li class="flex items-center gap-2 text-sm">
									<span class="size-1 shrink-0 rounded-full bg-emerald-500/40"></span>
									<code class="truncate text-xs text-foreground">{dep.path}</code>
									<span class="ml-auto shrink-0 text-xs text-muted-foreground">{dep.names.join(', ')}</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}
