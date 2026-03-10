<script module lang="ts">
import * as v from 'valibot';
import { StrSchema } from '@/schemas/common';
import type { Component } from 'svelte';

/** Schema for a single navigation item. */
export const NavItemSchema = v.strictObject({
	/** Display label. @values Settings, Help, Support, Feedback */
	title: StrSchema,
	/** Link href. @values /settings, /help, /support, /feedback */
	url: StrSchema,
	/** Lucide icon component. */
	icon: v.custom<Component>((val: unknown): boolean => typeof val === 'function'),
});
/** A single navigation item. */
export type NavItem = v.InferOutput<typeof NavItemSchema>;

/** Schema for NavSecondary — uses objectWithRest to allow passthrough props. */
export const NavSecondaryPropsSchema = v.objectWithRest({
	/** Array of navigation item objects to render. @values [{title: "Settings", url: "/settings"}] */
	items: v.array(NavItemSchema),
}, v.unknown());
/** Props for the NavSecondary component. */
export type NavSecondaryProps = v.InferOutput<typeof NavSecondaryPropsSchema>;
</script>

<script lang="ts">
/**
 * Secondary navigation link list rendered as a sidebar menu group.
 *
 * Accepts an array of icon+title+url items and renders them as sidebar menu buttons.
 */
import type { Str } from '@/schemas/common';
import { safeParse } from '@/utils/result/safe';
import * as Sidebar from '../sidebar/index.js';
import { stripSvelteProps } from '../lens/lens-utils.js';

const allProps: NavSecondaryProps = $props();
const validated: NavSecondaryProps = $derived.by(() => {
	const rawProps: NavSecondaryProps = stripSvelteProps(allProps);
	const result = safeParse(NavSecondaryPropsSchema, rawProps);
	if (!result.ok) throw result.error;
	// Cast to mutable — Result.data is deep-frozen via Object.freeze but component only reads, never mutates
	return result.data as NavSecondaryProps;
});
const restProps = $derived.by(() => {
	const { items: _items, ...rest }: NavSecondaryProps = validated;
	return rest;
});
</script>

<Sidebar.Group {...restProps}>
	<Sidebar.GroupContent>
		<Sidebar.Menu>
			{#each validated.items as item, i (item.title ?? i)}
				<Sidebar.MenuItem>
					<Sidebar.MenuButton>
						{#snippet child({ props })}
							<a href={item.url} {...props}>
								<item.icon aria-hidden="true" />
								<span>{item.title}</span>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			{/each}
		</Sidebar.Menu>
	</Sidebar.GroupContent>
</Sidebar.Group>
