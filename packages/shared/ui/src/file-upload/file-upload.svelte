<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Accepted MIME types @values accept */
    accept,
    /** Allow multiple files */
    multiple = false,
    /** Maximum number of files @values 0, 1, 2 */
    maxFiles = 1,
    /** Maximum file size in bytes @values 0, 50, 100 */
    maxFileSize,
    /** Minimum file size in bytes @values 0, 0, 10 */
    minFileSize = 0,
    /** Disabled state */
    disabled = false,
    /** Allow drag and drop */
    allowDrop = true,
    /** Allow directory upload */
    directory = false,
    /** Form field name @values name */
    name,
    /** Custom validation */
    validate,
    /** Upload mode (PrimeReact/PrimeVue) @values 'basic', 'advanced' */
    mode,
    /** Upload endpoint URL (PrimeReact/PrimeVue) @values url */
    url,
    /** Auto-upload on selection (PrimeReact/PrimeVue) */
    auto = false,
    /** Use custom upload handler (PrimeReact/PrimeVue) */
    customUpload = false,
    /** Camera capture mode @values 'user', 'environment' */
    capture,
    children,
  }: {
    /** Accepted MIME types */
    accept: Str;
    /** Allow multiple files */
    multiple?: Bool;
    /** Maximum number of files */
    maxFiles?: Num;
    /** Maximum file size in bytes */
    maxFileSize?: Num;
    /** Minimum file size in bytes */
    minFileSize?: Num;
    /** Disabled state */
    disabled?: Bool;
    /** Allow drag and drop */
    allowDrop?: Bool;
    /** Allow directory upload */
    directory?: Bool;
    /** Form field name */
    name: Str;
    /** Custom validation */
    validate: () => void;
    /** Upload mode (PrimeReact/PrimeVue) */
    mode: Str;
    /** Upload endpoint URL (PrimeReact/PrimeVue) */
    url: Str;
    /** Auto-upload on selection (PrimeReact/PrimeVue) */
    auto?: Bool;
    /** Use custom upload handler (PrimeReact/PrimeVue) */
    customUpload?: Bool;
    /** Camera capture mode */
    capture: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
