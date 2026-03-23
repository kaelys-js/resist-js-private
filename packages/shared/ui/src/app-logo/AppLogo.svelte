<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema, NumSchema } from '@/schemas/common';

  /** Schema for the AppLogo component props. */
  export const AppLogoPropsSchema = v.strictObject({
    /** Pixel dimensions (width and height) of the logo image. @values 16, 24, 32, 48 */
    size: v.optional(NumSchema),
    /** Additional CSS classes for the root element. */
    class: v.optional(StrSchema),
  });
  /** Props for the AppLogo component. */
  export type AppLogoProps = v.InferOutput<typeof AppLogoPropsSchema>;
</script>

<script lang="ts">
  /**
   * Renders the application brand logo from favicon.svg with an animated entrance.
   *
   * Plays a fade-in, grow, and sparkle animation on mount. Respects prefers-reduced-motion.
   */
  import type { Num, Str } from '@/schemas/common';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';

  const { ...restProps }: AppLogoProps = $props();
  const validated: AppLogoProps = $derived.by(() => {
    const rawProps: AppLogoProps = stripSvelteProps(restProps);
    const result = safeParse(AppLogoPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AppLogoProps;
  });

  const size: Num = $derived(validated.size ?? 24);
  const className: Str = $derived(validated.class ?? '');
</script>

<!--
  Brand logo — renders the full-color crystal from favicon.svg.
  Source of truth: branding/logo.svg (regenerate with: pnpm generate-icons)
  Plays a fade-in + grow + sparkle animation on mount.
-->
<div class="logo-entrance {className}" style="width: {size}px; height: {size}px;" {...restProps}>
  <img
    src="/favicon.svg"
    alt=""
    width={size}
    height={size}
    class="logo-img"
    aria-hidden="true"
    draggable="false"
  />
  <div class="logo-sparkle" aria-hidden="true"></div>
</div>

<style>
  .logo-entrance {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  /* Delay matches sidebar width transition (300ms) so the grow
	   doesn't stack with the sidebar expanding on mount. */
  .logo-img {
    animation: logo-appear 0.5s 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  @keyframes logo-appear {
    0% {
      opacity: 0;
      transform: scale(0.4);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* Sparkle overlay — masked to the crystal silhouette so light
	   only shines through the crystal shape, not a rectangular box. */
  .logo-sparkle {
    position: absolute;
    inset: 0;
    pointer-events: none;
    -webkit-mask-image: url('/favicon.svg');
    mask-image: url('/favicon.svg');
    -webkit-mask-size: contain;
    mask-size: contain;
    -webkit-mask-position: center;
    mask-position: center;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    overflow: hidden;
  }

  .logo-sparkle::after {
    content: '';
    position: absolute;
    top: -40%;
    left: -100%;
    width: 45%;
    height: 180%;
    background: linear-gradient(
      105deg,
      transparent 25%,
      rgba(255, 255, 255, 0.25) 38%,
      rgba(255, 255, 255, 0.7) 50%,
      rgba(255, 255, 255, 0.25) 62%,
      transparent 75%
    );
    animation: logo-sparkle 1.4s 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
  }

  @media (prefers-reduced-motion: reduce) {
    .logo-img {
      animation: none;
      opacity: 1;
    }
    .logo-sparkle::after {
      animation: none;
      opacity: 0;
    }
  }

  @keyframes logo-sparkle {
    0% {
      transform: translateX(0) skewX(-12deg);
      opacity: 0;
    }
    8% {
      opacity: 1;
    }
    85% {
      opacity: 0.6;
    }
    100% {
      transform: translateX(500%) skewX(-12deg);
      opacity: 0;
    }
  }
</style>
