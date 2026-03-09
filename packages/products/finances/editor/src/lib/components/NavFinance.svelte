<script lang="ts">
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import CreditCard from '@lucide/svelte/icons/credit-card';
import Calendar from '@lucide/svelte/icons/calendar';
import ShoppingBag from '@lucide/svelte/icons/shopping-bag';
import Plane from '@lucide/svelte/icons/plane';
import Clock from '@lucide/svelte/icons/clock';
import * as Sidebar from '@/ui/sidebar/index.js';
import { page } from '$app/state';
import { localeStore, t } from '$lib/i18n.svelte';
import type { Str } from '@/schemas/common';

type NavItem = {
	/** Display label for the nav item. */
	title: Str;
	/** Route path for the nav item. */
	url: Str;
	/** Lucide icon component. */
	icon: typeof LayoutDashboard;
};

const items: readonly NavItem[] = $derived([
	{ title: t(localeStore.t.sidebar.overview, 'Overview'), url: '/', icon: LayoutDashboard },
	{ title: t(localeStore.t.sidebar.income, 'Income'), url: '/income', icon: TrendingUp },
	{ title: t(localeStore.t.sidebar.debt, 'Debt'), url: '/debt', icon: CreditCard },
	{ title: t(localeStore.t.sidebar.monthly, 'Monthly'), url: '/monthly', icon: Calendar },
	{ title: t(localeStore.t.sidebar.purchases, 'Purchases'), url: '/purchases', icon: ShoppingBag },
	{ title: t(localeStore.t.sidebar.travel, 'Travel'), url: '/travel', icon: Plane },
	{ title: t(localeStore.t.sidebar.lifetime, 'Lifetime'), url: '/lifetime', icon: Clock },
]);
</script>

<Sidebar.Group>
	<Sidebar.GroupLabel>{t(localeStore.t.sidebar.finance, 'Finance')}</Sidebar.GroupLabel>
	<Sidebar.Menu>
		{#each items as item (item.url)}
			<Sidebar.MenuItem>
				<Sidebar.MenuButton
					tooltipContent={item.title}
					isActive={page.url.pathname === item.url}
					aria-current={page.url.pathname === item.url ? 'page' : undefined}
				>
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
</Sidebar.Group>
