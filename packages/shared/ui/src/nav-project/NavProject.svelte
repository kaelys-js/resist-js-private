<script module lang="ts">
  /**
   * NavProject Svelte component — sidebar nav row representing
   * a project entry, with optional pinned state.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema, BoolSchema } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  /** Schema for the NavProject component props. */
  export const NavProjectPropsSchema = v.strictObject({
    /** Display name (project or user). @values Storylyne RPG, My Project, Demo App */
    name: StrSchema,
    /** Subtitle text (project subtitle, email, or em dash). @values v1.0.0, Production, Development */
    subtitle: StrSchema,
    /** Avatar image URL (empty string for no image). @values https://example.com/avatar.png, /avatars/user.jpg */
    avatarSrc: StrSchema,
    /** Whether to show the avatar icon in the trigger button. @values true, false */
    showIcon: BoolSchema,
    /** Product-specific dropdown menu items. @values <div>content</div> */
    menuItems: v.custom<Snippet>((val: unknown): boolean => typeof val === 'function'),
  });
  /** Props for the NavProject component. */
  export type NavProjectProps = v.InferOutput<typeof NavProjectPropsSchema>;
</script>

<script lang="ts">
  /**
   * Project navigation switcher displayed in the sidebar header with avatar and dropdown menu.
   *
   * Shows the current project/user name and subtitle, with product-specific menu items injected via snippet.
   */
  import type { Str } from '@/schemas/common';
  import { safeParse } from '@/utils/result/safe';
  import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
  import * as Avatar from '../avatar/index.js';
  import * as DropdownMenu from '../dropdown-menu/index.js';
  import * as Sidebar from '../sidebar/index.js';
  import { stripSvelteProps } from '../lens/lens-utils.js';

  const { ...restProps }: NavProjectProps = $props();
  const validated: NavProjectProps = $derived.by(() => {
    const rawProps: NavProjectProps = stripSvelteProps(restProps);
    const result = safeParse(NavProjectPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as NavProjectProps;
  });

  const sidebar: ReturnType<typeof Sidebar.useSidebar> = Sidebar.useSidebar();

  /** Monogram from the name (e.g. "My Project" -> "MP", "Project" -> "P"). */
  const monogram: Str = $derived(
    validated.name
      .split(/\s+/)
      .slice(0, 2)
      .map((w: Str) => w[0]?.toUpperCase() ?? '')
      .join(''),
  );
</script>

<Sidebar.Menu {...restProps}>
  <Sidebar.MenuItem>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Sidebar.MenuButton
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            {...props}
          >
            {#if validated.showIcon}
              <Avatar.Root class="h-8 w-8 rounded-lg shadow-sm">
                <Avatar.Image src={validated.avatarSrc} alt={validated.name} />
                <Avatar.Fallback class="rounded-lg text-xs font-medium">
                  {monogram}
                </Avatar.Fallback>
              </Avatar.Root>
            {/if}
            <div class="grid flex-1 text-left text-sm leading-tight">
              <span class="truncate font-medium">{validated.name}</span>
              <span class="truncate text-xs text-muted-foreground">{validated.subtitle}</span>
            </div>
            <ChevronsUpDown aria-hidden="true" class="ml-auto size-4" />
          </Sidebar.MenuButton>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        class="w-[--bits-dropdown-menu-anchor-width] min-w-56 rounded-lg bg-white/[0.08] dark:bg-white/[0.06] backdrop-blur-2xl backdrop-saturate-150 border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_1px_rgba(255,255,255,0.1)_inset]"
        side={sidebar.isMobile ? 'bottom' : 'right'}
        align="end"
        sideOffset={4}
      >
        <DropdownMenu.Label class="p-0 font-normal -m-1">
          <div
            class="flex items-center gap-2 px-3 py-2.5 pb-3 text-left text-sm bg-white/[0.06] border-b border-white/[0.06] rounded-t-lg"
          >
            <Avatar.Root class="h-8 w-8 rounded-lg">
              <Avatar.Image src={validated.avatarSrc} alt={validated.name} />
              <Avatar.Fallback class="rounded-lg text-xs font-medium">
                {monogram}
              </Avatar.Fallback>
            </Avatar.Root>
            <div class="grid flex-1 text-left text-sm leading-tight">
              <span class="truncate font-medium">{validated.name}</span>
              <span class="truncate text-xs text-muted-foreground">{validated.subtitle}</span>
            </div>
          </div>
        </DropdownMenu.Label>
        <DropdownMenu.Separator />
        <DropdownMenu.Group>
          {@render validated.menuItems()}
        </DropdownMenu.Group>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </Sidebar.MenuItem>
</Sidebar.Menu>
