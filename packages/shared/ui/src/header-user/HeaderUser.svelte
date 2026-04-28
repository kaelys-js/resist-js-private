<script module lang="ts">
  /**
   * HeaderUser Svelte component — header user profile
   * dropdown showing avatar, name, and account actions.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema, BoolSchema } from '@/schemas/common';

  /** Schema for feature flags controlling which menu items are visible. */
  export const HeaderUserFeaturesSchema = v.strictObject({
    /** Show avatar image (vs monogram-only). */
    avatar: BoolSchema,
    /** Show "Account" menu item. */
    account: BoolSchema,
    /** Show "Subscription" menu item. */
    subscription: BoolSchema,
    /** Show "Notifications" menu item. */
    notifications: BoolSchema,
    /** Show "Keyboard Shortcuts" menu item. */
    shortcuts: BoolSchema,
    /** Show "Settings" menu item. */
    settings: BoolSchema,
    /** Show "What's New" menu item. */
    whatsNew: BoolSchema,
    /** Show "Log Out" menu item. */
    logout: BoolSchema,
  });
  /** Feature flags controlling which menu items are visible. */
  export type HeaderUserFeatures = v.InferOutput<typeof HeaderUserFeaturesSchema>;

  /** Schema for localized UI labels in the HeaderUser component. */
  export const HeaderUserLabelsSchema = v.strictObject({
    /** Trigger button aria-label (e.g. "User menu"). @values User menu, Open user menu, Account menu */
    userMenu: StrSchema,
    /** "Account" menu item label. @values Account, My Account, Profile */
    account: StrSchema,
    /** "Subscription" menu item label. @values Subscription, Billing, Plan */
    subscription: StrSchema,
    /** "Notifications" menu item label. @values Notifications, Alerts, Updates */
    notifications: StrSchema,
    /** "Keyboard Shortcuts" menu item label. @values Keyboard Shortcuts, Shortcuts, Hotkeys */
    keyboardShortcuts: StrSchema,
    /** "Settings" menu item label. @values Settings, Preferences, Options */
    settings: StrSchema,
    /** "What's New" menu item label. @values What's New, Changelog, Updates */
    whatsNew: StrSchema,
    /** "Log Out" menu item label. @values Log Out, Sign Out, Logout */
    logout: StrSchema,
  });
  /** Localized UI labels for the HeaderUser component. */
  export type HeaderUserLabels = v.InferOutput<typeof HeaderUserLabelsSchema>;

  /** Schema for the HeaderUser component props. */
  export const HeaderUserPropsSchema = v.strictObject({
    /** User display name. @values John Doe, Jane Smith, Demo User */
    userName: StrSchema,
    /** Optional user email. @values john@example.com, jane@example.com, demo@example.com */
    userEmail: v.optional(StrSchema),
    /** Optional avatar image URL. @values https://example.com/avatar.png, /avatars/user.jpg */
    userAvatar: v.optional(StrSchema),
    /** Callback when "Log Out" is clicked. @values () => void */
    onLogOut: v.custom<() => void>((val: unknown): boolean => typeof val === 'function'),
    /** Feature flags controlling menu item visibility. @values {avatar: true, account: true, subscription: true, notifications: true, shortcuts: true, settings: true, whatsNew: true, logout: true} */
    features: HeaderUserFeaturesSchema,
    /** Localized UI labels. @values {userMenu: "User menu", account: "Account", subscription: "Subscription", notifications: "Notifications", keyboardShortcuts: "Keyboard Shortcuts", settings: "Settings", whatsNew: "What's New", logout: "Log Out"} */
    labels: HeaderUserLabelsSchema,
  });
  /** Props for the HeaderUser component. */
  export type HeaderUserProps = v.InferOutput<typeof HeaderUserPropsSchema>;
</script>

<script lang="ts">
  /**
   * User profile avatar button with a dropdown menu for account, settings, and logout actions.
   *
   * Renders an avatar trigger that opens a feature-flagged dropdown with configurable menu groups.
   */
  import UserIcon from '@lucide/svelte/icons/user';
  import CreditCard from '@lucide/svelte/icons/credit-card';
  import Bell from '@lucide/svelte/icons/bell';
  import Keyboard from '@lucide/svelte/icons/keyboard';
  import SettingsIcon from '@lucide/svelte/icons/settings';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import LogOut from '@lucide/svelte/icons/log-out';
  import * as Avatar from '../avatar/index.js';
  import * as DropdownMenu from '../dropdown-menu/index.js';
  import type { Bool, Str } from '@/schemas/common';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';

  const { ...restProps }: HeaderUserProps = $props();
  const validated: HeaderUserProps = $derived.by(() => {
    const rawProps: HeaderUserProps = stripSvelteProps(restProps);
    const result = safeParse(HeaderUserPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as HeaderUserProps;
  });

  /** Monogram from the user name (e.g. "John Doe" → "JD", "User" → "U"). */
  const monogram: Str = $derived(
    validated.userName
      .split(/\s+/)
      .slice(0, 2)
      .map((w: Str) => w[0]?.toUpperCase() ?? '')
      .join(''),
  );

  const hasAccountGroup: Bool = $derived(
    validated.features.account ||
      validated.features.subscription ||
      validated.features.notifications,
  );

  const hasToolsGroup: Bool = $derived(
    validated.features.shortcuts || validated.features.settings || validated.features.whatsNew,
  );
</script>

<DropdownMenu.Root {...restProps}>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <button
        class="inline-flex items-center justify-center rounded-full size-8 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={validated.labels.userMenu}
        data-testid="header-user-trigger"
        {...props}
      >
        <Avatar.Root class="size-8">
          {#if validated.features.avatar && validated.userAvatar}
            <Avatar.Image src={validated.userAvatar} alt={validated.userName} />
          {/if}
          <Avatar.Fallback class="text-xs font-medium">
            {monogram}
          </Avatar.Fallback>
        </Avatar.Root>
      </button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content
    class="w-56 rounded-lg bg-white/[0.08] dark:bg-white/[0.06] backdrop-blur-2xl backdrop-saturate-150 border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_1px_rgba(255,255,255,0.1)_inset]"
    align="end"
    sideOffset={8}
  >
    <DropdownMenu.Label class="p-0 font-normal -m-1">
      <div
        class="flex items-center gap-2 px-3 py-2.5 pb-3 text-left text-sm bg-white/[0.06] border-b border-white/[0.06] rounded-t-lg"
      >
        <Avatar.Root class="size-8">
          {#if validated.features.avatar && validated.userAvatar}
            <Avatar.Image src={validated.userAvatar} alt={validated.userName} />
          {/if}
          <Avatar.Fallback class="text-xs font-medium">
            {monogram}
          </Avatar.Fallback>
        </Avatar.Root>
        <div class="grid flex-1 text-left text-sm leading-tight">
          <span class="truncate font-medium">{validated.userName}</span>
          {#if validated.userEmail}
            <span class="truncate text-xs text-muted-foreground">
              {validated.userEmail}
            </span>
          {/if}
        </div>
      </div>
    </DropdownMenu.Label>

    {#if hasAccountGroup}
      <DropdownMenu.Separator />
      <DropdownMenu.Group>
        {#if validated.features.account}
          <DropdownMenu.Item>
            <UserIcon aria-hidden="true" class="mr-2 size-4" />
            {validated.labels.account}
          </DropdownMenu.Item>
        {/if}
        {#if validated.features.subscription}
          <DropdownMenu.Item>
            <CreditCard aria-hidden="true" class="mr-2 size-4" />
            {validated.labels.subscription}
          </DropdownMenu.Item>
        {/if}
        {#if validated.features.notifications}
          <DropdownMenu.Item>
            <Bell aria-hidden="true" class="mr-2 size-4" />
            {validated.labels.notifications}
          </DropdownMenu.Item>
        {/if}
      </DropdownMenu.Group>
    {/if}

    {#if hasToolsGroup}
      <DropdownMenu.Separator />
      <DropdownMenu.Group>
        {#if validated.features.shortcuts}
          <DropdownMenu.Item>
            <Keyboard aria-hidden="true" class="mr-2 size-4" />
            {validated.labels.keyboardShortcuts}
          </DropdownMenu.Item>
        {/if}
        {#if validated.features.settings}
          <DropdownMenu.Item>
            <SettingsIcon aria-hidden="true" class="mr-2 size-4" />
            {validated.labels.settings}
          </DropdownMenu.Item>
        {/if}
        {#if validated.features.whatsNew}
          <DropdownMenu.Item>
            <Sparkles aria-hidden="true" class="mr-2 size-4" />
            {validated.labels.whatsNew}
          </DropdownMenu.Item>
        {/if}
      </DropdownMenu.Group>
    {/if}

    {#if validated.features.logout}
      <DropdownMenu.Separator />
      <DropdownMenu.Group>
        <DropdownMenu.Item variant="destructive" onclick={validated.onLogOut}>
          <LogOut aria-hidden="true" class="mr-2 size-4" />
          {validated.labels.logout}
        </DropdownMenu.Item>
      </DropdownMenu.Group>
    {/if}
  </DropdownMenu.Content>
</DropdownMenu.Root>
