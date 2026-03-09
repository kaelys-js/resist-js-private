<script lang="ts">
/**
 * Renders the application brand logo from favicon.svg with an animated entrance.
 *
 * Plays a fade-in, grow, and sparkle animation on mount. Respects prefers-reduced-motion.
 */
import type { Num, Str } from '@/schemas/common';

let {
	/** Pixel dimensions (width and height) of the logo image. @values 16, 24, 32, 48 */
	size = 24,
	/** Additional CSS classes for the root element. */
	class: className = '',
}: { size?: Num; class?: Str } = $props();
</script>

<!--
  Brand logo — renders the full-color crystal from favicon.svg.
  Source of truth: branding/logo.svg (regenerate with: pnpm generate-icons)
  Plays a fade-in + grow + sparkle animation on mount.
-->
<div class="logo-entrance {className}" style="width: {size}px; height: {size}px;">
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
