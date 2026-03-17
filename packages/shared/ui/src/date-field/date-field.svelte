<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Selected date @values DateValue */
    value,
    /** Initial date @values DateValue */
    defaultValue,
    /** Placeholder date for segment cycling @values DateValue */
    placeholder,
    /** Input precision level @values 'day', 'hour', 'minute', 'second' */
    granularity,
    /** 12 or 24 hour format @values '12', '24' */
    hourCycle,
    /** Hide time zone segment */
    hideTimeZone = false,
    /** Localization locale @values 'en-US' */
    locale = 'en-US',
    /** Minimum date @values DateValue */
    minValue,
    /** Maximum date @values DateValue */
    maxValue,
    /** Disabled state */
    disabled = false,
    /** Read-only state */
    readonly = false,
    /** Required for form */
    required = false,
    /** Lock specific segments */
    readonlySegments,
    /** Custom validation */
    validate,
    children,
  }: {
    /** Selected date */
    value: Str;
    /** Initial date */
    defaultValue: Str;
    /** Placeholder date for segment cycling */
    placeholder: Str;
    /** Input precision level */
    granularity: Str;
    /** 12 or 24 hour format */
    hourCycle: Str;
    /** Hide time zone segment */
    hideTimeZone?: Bool;
    /** Localization locale */
    locale?: Str;
    /** Minimum date */
    minValue: Str;
    /** Maximum date */
    maxValue: Str;
    /** Disabled state */
    disabled?: Bool;
    /** Read-only state */
    readonly?: Bool;
    /** Required for form */
    required?: Bool;
    /** Lock specific segments */
    readonlySegments: Str[];
    /** Custom validation */
    validate: () => void;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
