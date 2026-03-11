<script lang="ts">
/**
 * Design Token Viewer page for the Lens documentation system.
 *
 * Displays all CSS custom properties extracted from app.css,
 * grouped by category with live color swatches and theme comparison.
 */
import type { Bool, Num, Str } from '@/schemas/common';
import { extractTokens, groupTokens, getThemeNames, type ThemeTokenSet, type TokenGroup, type DesignToken } from '@/ui/lens/extract-tokens.js';
import Badge from '@/ui/badge/badge.svelte';
import CodeBlock from '@/ui/code-block/CodeBlock.svelte';
import * as Tooltip from '@/ui/tooltip/index.js';
import Palette from '@lucide/svelte/icons/palette';
import Copy from '@lucide/svelte/icons/copy';
import Check from '@lucide/svelte/icons/check';
import ChevronRight from '@lucide/svelte/icons/chevron-right';

/* ------------------------------------------------------------------ */
/*  Load app.css raw source and extract tokens                        */
/* ------------------------------------------------------------------ */

const cssRaw: Str = import.meta.glob(
	'/src/app.css',
	{ query: '?raw', import: 'default', eager: true },
) as unknown as Str;

/**
 * Get the raw CSS string from the glob result.
 * Glob returns Record<path, content> — extract the first (only) value.
 *
 * @returns Raw CSS source string
 */
function getCssSource(): Str {
	if (typeof cssRaw === 'string') return cssRaw;
	const entries: Array<[Str, unknown]> = Object.entries(cssRaw as Record<Str, unknown>);
	const [first]: Array<[Str, unknown]> = entries;
	return (first ? String(first[1]) : '') as Str;
}

const cssSource: Str = getCssSource();
const allSets: ThemeTokenSet[] = extractTokens(cssSource);
const themeNames: Str[] = getThemeNames(allSets);

/* ------------------------------------------------------------------ */
/*  State                                                             */
/* ------------------------------------------------------------------ */

/** Currently selected theme context for viewing. */
let selectedTheme: Str = $state(':root');

/** Copied token variable name for feedback. */
let copiedVar: Str | null = $state(null);

/** Section open states. */
let sectionOpen: Record<Str, Bool> = $state({
	color: true,
	'sidebar-color': true,
	radius: true,
	typography: true,
	animation: true,
});

/* ------------------------------------------------------------------ */
/*  Derived                                                           */
/* ------------------------------------------------------------------ */

/** Token set for the currently selected theme. */
const currentSet: ThemeTokenSet | undefined = $derived(
	allSets.find((s: ThemeTokenSet): boolean => s.selector === selectedTheme),
);

/** Grouped tokens for the current theme. */
const groups: TokenGroup[] = $derived(
	currentSet ? groupTokens(currentSet.tokens) : [],
);

/** Total token count. */
const tokenCount: Num = $derived(currentSet?.tokens.length ?? 0);

/** Theme selector options. */
type ThemeOption = { value: Str; label: Str };
const themeOptions: ThemeOption[] = $derived.by(() => {
	const opts: ThemeOption[] = [
		{ value: ':root', label: 'Light (Default)' },
		{ value: '.dark', label: 'Dark (Default)' },
	];
	for (const name of themeNames) {
		opts.push(
			{ value: name, label: `${name.charAt(0).toUpperCase()}${name.slice(1)} (Light)` },
			{ value: `${name}.dark`, label: `${name.charAt(0).toUpperCase()}${name.slice(1)} (Dark)` },
		);
	}
	return opts;
});

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/**
 * Copy a CSS variable reference to the clipboard.
 *
 * @param variable - The CSS variable string (e.g., `--background`)
 */
async function copyVariable(variable: Str): Promise<void> {
	await navigator.clipboard.writeText(`var(${variable})`);
	copiedVar = variable;
	setTimeout((): void => {
		copiedVar = null;
	}, 1500);
}

/**
 * Check if a token value is a color (oklch or other color format).
 *
 * @param value - The CSS value string
 * @returns Whether the value represents a color
 */
function isColorValue(value: Str): boolean {
	return value.startsWith('oklch(') || value.startsWith('rgb') || value.startsWith('hsl') || value.startsWith('#');
}

/**
 * Toggle a section open/closed.
 *
 * @param id - Section identifier key
 */
function toggleSection(id: Str): void {
	sectionOpen[id] = !sectionOpen[id];
}
</script>

<div class="w-full">
	<!-- Header -->
	<div class="sticky top-(--header-height) z-10 border-b bg-background px-8 pb-4 pt-10">
		<div class="flex items-start gap-4">
			<div class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
				<Palette class="size-6 text-primary" />
			</div>
			<div class="min-w-0 flex-1">
				<div class="flex items-center gap-4">
					<h1 class="text-3xl font-bold tracking-tight">Design Tokens</h1>
					<Badge variant="secondary" class="text-xs">{tokenCount} tokens</Badge>
				</div>
				<p class="mt-1 text-sm text-muted-foreground">CSS custom properties powering the design system. All colors use OKLCh color space.</p>

				<!-- Theme selector -->
				<div class="mt-3 flex items-center gap-2">
					<label for="theme-select" class="text-xs font-medium text-muted-foreground">Theme:</label>
					<select
						id="theme-select"
						class="h-8 rounded-md border bg-background px-2 text-sm"
						bind:value={selectedTheme}
					>
						{#each themeOptions as opt (opt.value)}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
				</div>
			</div>
		</div>
	</div>

	<!-- Token groups -->
	<div class="space-y-10 px-8 py-8">
		{#each groups as group (group.category)}
			<section id={group.category} class="scroll-mt-60">
				<button
					type="button"
					onclick={() => toggleSection(group.category)}
					class="mb-3 flex w-full items-center gap-2 text-left text-lg font-semibold transition-colors hover:text-foreground/80"
				>
					<ChevronRight class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {sectionOpen[group.category] ? 'rotate-90' : ''}" />
					<Palette class="size-5" />
					{group.label}
					<Badge variant="outline" class="ml-1 text-xs">{group.tokens.length}</Badge>
				</button>

				{#if sectionOpen[group.category]}
					<div class="rounded-lg border bg-card">
						<table class="w-full table-fixed text-sm">
							<thead>
								<tr class="border-b text-left text-xs text-muted-foreground">
									{#if group.category === 'color' || group.category === 'sidebar-color'}
										<th class="w-12 px-4 py-2"></th>
									{/if}
									<th class="px-4 py-2">Variable</th>
									<th class="px-4 py-2">Value</th>
									<th class="px-4 py-2">Tailwind</th>
									<th class="w-12 px-4 py-2"></th>
								</tr>
							</thead>
							<tbody>
								{#each group.tokens as token (token.name)}
									<tr class="border-b last:border-b-0 transition-colors hover:bg-muted/50">
										{#if group.category === 'color' || group.category === 'sidebar-color'}
											<td class="px-4 py-2.5">
												{#if isColorValue(token.value)}
													<Tooltip.Root delayDuration={200}>
														<Tooltip.Trigger>
															{#snippet child({ props })}
																<div
																	class="size-6 rounded-md border shadow-sm"
																	style="background-color: {token.value};"
																	{...props}
																></div>
															{/snippet}
														</Tooltip.Trigger>
														<Tooltip.Content>
															<span class="font-mono text-xs">{token.value}</span>
														</Tooltip.Content>
													</Tooltip.Root>
												{/if}
											</td>
										{/if}
										<td class="px-4 py-2.5">
											<code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{token.variable}</code>
										</td>
										<td class="px-4 py-2.5">
											<span class="font-mono text-xs text-muted-foreground">{token.value}</span>
										</td>
										<td class="px-4 py-2.5">
											{#if token.tailwindClass}
												<code class="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-primary">{token.tailwindClass}</code>
											{:else}
												<span class="text-xs text-muted-foreground/40">—</span>
											{/if}
										</td>
										<td class="px-4 py-2.5">
											<Tooltip.Root delayDuration={200}>
												<Tooltip.Trigger>
													{#snippet child({ props })}
														<button
															type="button"
															class="inline-flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
															onclick={() => copyVariable(token.variable)}
															{...props}
														>
															{#if copiedVar === token.variable}
																<Check class="size-3.5 text-green-500" />
															{:else}
																<Copy class="size-3.5" />
															{/if}
														</button>
													{/snippet}
												</Tooltip.Trigger>
												<Tooltip.Content>
													{copiedVar === token.variable ? 'Copied!' : `Copy var(${token.variable})`}
												</Tooltip.Content>
											</Tooltip.Root>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</section>
		{/each}

		<!-- Raw CSS source -->
		<section id="source" class="scroll-mt-60">
			<button
				type="button"
				onclick={() => toggleSection('source')}
				class="mb-3 flex w-full items-center gap-2 text-left text-lg font-semibold transition-colors hover:text-foreground/80"
			>
				<ChevronRight class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {sectionOpen.source ? 'rotate-90' : ''}" />
				Source (app.css)
			</button>
			{#if sectionOpen.source}
				<div class="rounded-lg border bg-card p-4">
					<CodeBlock code={cssSource} lang="css" />
				</div>
			{/if}
		</section>
	</div>
</div>
