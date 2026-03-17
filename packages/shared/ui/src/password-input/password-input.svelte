<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Password value @values value */
    value,
    /** Password visibility */
    visible = false,
    /** Initial visibility */
    defaultVisible = false,
    /** Show strength meter (PrimeReact) */
    feedback = true,
    /** Show toggle button (PrimeReact) */
    toggleMask = false,
    /** Prompt text @values promptLabel */
    promptLabel,
    /** Weak password label @values weakLabel */
    weakLabel,
    /** Medium password label @values mediumLabel */
    mediumLabel,
    /** Strong password label @values strongLabel */
    strongLabel,
    /** Medium strength regex @values mediumRegex */
    mediumRegex,
    /** Strong strength regex @values strongRegex */
    strongRegex,
    children,
  }: {
    /** Password value */
    value: Str;
    /** Password visibility */
    visible?: Bool;
    /** Initial visibility */
    defaultVisible?: Bool;
    /** Show strength meter (PrimeReact) */
    feedback?: Bool;
    /** Show toggle button (PrimeReact) */
    toggleMask?: Bool;
    /** Prompt text */
    promptLabel: Str;
    /** Weak password label */
    weakLabel: Str;
    /** Medium password label */
    mediumLabel: Str;
    /** Strong password label */
    strongLabel: Str;
    /** Medium strength regex */
    mediumRegex: Str;
    /** Strong strength regex */
    strongRegex: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
