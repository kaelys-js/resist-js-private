<script lang="ts">
  /**
   * Pagination.Link — clickable Pagination page link.
   * @module
   */
  import { Pagination as PaginationPrimitive } from 'bits-ui';
  import { cn } from '../utils.js';
  import { type Props, buttonVariants } from '../button/index.js';

  let {
    ref = $bindable(null),
    class: className,
    /** Link button size preset. @values default, sm, lg, icon */
    size = 'icon',
    /** Whether this page link is the active page. */
    isActive,
    /** Page data object from the pagination primitive. */
    page,
    children,
    ...restProps
  }: PaginationPrimitive.PageProps &
    Props & {
      isActive: boolean;
    } = $props();
</script>

{#snippet Fallback()}
  {page.value}
{/snippet}

<PaginationPrimitive.Page
  bind:ref
  {page}
  aria-current={isActive ? 'page' : undefined}
  data-slot="pagination-link"
  data-active={isActive}
  class={cn(
    buttonVariants({
      variant: isActive ? 'outline' : 'ghost',
      size,
    }),
    className,
  )}
  children={children || Fallback}
  {...restProps}
/>
