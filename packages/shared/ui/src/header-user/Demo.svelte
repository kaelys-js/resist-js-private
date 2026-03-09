<script lang="ts">
import HeaderUser from './HeaderUser.svelte';
import DemoSection from '../demo-section/DemoSection.svelte';
</script>

<div class="flex flex-col gap-6">
	<DemoSection
		title="Full Featured"
		description="All menu items enabled, with avatar image, email, and logout callback."
	>
		<div class="flex justify-center">
			<HeaderUser
				userName="Jane Doe"
				userEmail="jane@webforge.dev"
				userAvatar="https://github.com/shadcn.png"
				onLogOut={() => {
					/* demo no-op */
				}}
				features={{
					avatar: true,
					account: true,
					subscription: true,
					notifications: true,
					shortcuts: true,
					settings: true,
					whatsNew: true,
					logout: true,
				}}
				labels={{
					userMenu: 'User menu',
					account: 'Account',
					subscription: 'Subscription',
					notifications: 'Notifications',
					keyboardShortcuts: 'Keyboard Shortcuts',
					settings: 'Settings',
					whatsNew: "What's New",
					logout: 'Log Out',
				}}
			/>
		</div>
	</DemoSection>

	<DemoSection
		title="Monogram Fallback"
		description="No avatar image provided; the component displays initials as a monogram."
	>
		<div class="flex justify-center">
			<HeaderUser
				userName="Alex Rivera"
				onLogOut={() => {
					/* demo no-op */
				}}
				features={{
					avatar: false,
					account: true,
					subscription: false,
					notifications: false,
					shortcuts: false,
					settings: true,
					whatsNew: false,
					logout: true,
				}}
				labels={{
					userMenu: 'User menu',
					account: 'Account',
					subscription: 'Subscription',
					notifications: 'Notifications',
					keyboardShortcuts: 'Keyboard Shortcuts',
					settings: 'Settings',
					whatsNew: "What's New",
					logout: 'Log Out',
				}}
			/>
		</div>
	</DemoSection>

	<DemoSection
		title="Minimal"
		description="Only the logout menu item is visible."
	>
		<div class="flex justify-center">
			<HeaderUser
				userName="Guest"
				onLogOut={() => {
					/* demo no-op */
				}}
				features={{
					avatar: false,
					account: false,
					subscription: false,
					notifications: false,
					shortcuts: false,
					settings: false,
					whatsNew: false,
					logout: true,
				}}
				labels={{
					userMenu: 'User menu',
					account: 'Account',
					subscription: 'Subscription',
					notifications: 'Notifications',
					keyboardShortcuts: 'Keyboard Shortcuts',
					settings: 'Settings',
					whatsNew: "What's New",
					logout: 'Log Out',
				}}
			/>
		</div>
	</DemoSection>
</div>
