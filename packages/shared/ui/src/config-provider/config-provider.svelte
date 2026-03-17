<!-- @convert-to-lens -->
<script lang="ts">
  import type { Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Theme configuration */
    theme,
    /** Locale messages */
    locale,
    /** Global component size @values 'small', 'middle', 'large' */
    componentSize = 'middle',
    /** Text direction @values 'ltr', 'rtl' */
    direction = 'ltr',
    /** CSS class prefix @values prefixCls */
    prefixCls,
    /** Icon class prefix @values iconPrefixCls */
    iconPrefixCls,
    children,
  }: {
    /** Theme configuration */
    theme: Record<Str, unknown>;
    /** Locale messages */
    locale: Record<Str, unknown>;
    /** Global component size */
    componentSize?: Str;
    /** Text direction */
    direction?: Str;
    /** CSS class prefix */
    prefixCls: Str;
    /** Icon class prefix */
    iconPrefixCls: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
