<script lang="ts">
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import CreditCard from '@lucide/svelte/icons/credit-card';
import Calendar from '@lucide/svelte/icons/calendar';
import ShoppingBag from '@lucide/svelte/icons/shopping-bag';
import Plane from '@lucide/svelte/icons/plane';
import Clock from '@lucide/svelte/icons/clock';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import { page } from '$app/state';
import type { Str } from '@/schemas/common';

type NavItem = {
	/** Display label for the nav item. */
	title: Str;
	/** Route path for the nav item. */
	url: Str;
	/** Lucide icon component. */
	icon: typeof LayoutDashboard;
};

const items: readonly NavItem[] = [
	{ title: 'Overview', url: '/', icon: LayoutDashboard },
	{ title: 'Income', url: '/income', icon: TrendingUp },
	{ title: 'Debt', url: '/debt', icon: CreditCard },
	{ title: 'Monthly', url: '/monthly', icon: Calendar },
	{ title: 'Purchases', url: '/purchases', icon: ShoppingBag },
	{ title: 'Travel', url: '/travel', icon: Plane },
	{ title: 'Lifetime', url: '/lifetime', icon: Clock },
];
</script>

<Sidebar.Group>
	<Sidebar.GroupLabel>Finance</Sidebar.GroupLabel>
	<Sidebar.Menu>
		{#each items as item (item.url)}
			<Sidebar.MenuItem>
				<Sidebar.MenuButton
					tooltipContent={item.title}
					isActive={page.url.pathname === item.url}
					aria-current={page.url.pathname === item.url ? 'page' : undefined}
				>
					<a href={item.url} class="flex items-center gap-2">
						<item.icon aria-hidden="true" />
						<span>{item.title}</span>
					</a>
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		{/each}
	</Sidebar.Menu>
</Sidebar.Group>
