<script module lang="ts">
import * as v from 'valibot';
import type { Component } from 'svelte';

/** Schema for a single navigation item. */
export const NavItemSchema = v.strictObject({
	/** Display label. @values Settings, Help, Support, Feedback */
	title: v.string(),
	/** Link href. @values /settings, /help, /support, /feedback */
	url: v.string(),
	/** Lucide icon component. */
	icon: v.custom<Component>((val: unknown): boolean => typeof val === 'function'),
});
/** A single navigation item. */
export type NavItem = v.InferOutput<typeof NavItemSchema>;

/** Schema for NavSecondary — uses objectWithRest to allow passthrough props. */
export const NavSecondaryPropsSchema = v.objectWithRest({
	/** Array of navigation item objects to render. */
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
import { safeParse } from '@/utils/result/safe';
import * as Sidebar from '../sidebar/index.js';

const rawProps = $props();
const validated = safeParse(NavSecondaryPropsSchema, rawProps);
if (!validated.ok) throw validated.error;
// Cast to mutable — Result.data is deep-frozen via Object.freeze but component only reads, never mutates
let { items, ...restProps }: NavSecondaryProps = validated.data as NavSecondaryProps;
</script>

<Sidebar.Group {...restProps}>
	<Sidebar.GroupContent>
		<Sidebar.Menu>
			{#each items as item (item.title)}
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
