<script lang="ts">
let { size = 24, class: className = '' }: { size?: number; class?: string } = $props();
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

	.logo-img {
		animation: logo-appear 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}

	/* Fade in + scale up with a slight overshoot */
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

	/* Sparkle overlay — a bright sweep that crosses the crystal */
	.logo-sparkle {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
		border-radius: 2px;
	}

	.logo-sparkle::after {
		content: '';
		position: absolute;
		top: -20%;
		left: -60%;
		width: 40%;
		height: 140%;
		background: linear-gradient(
			105deg,
			transparent 30%,
			rgba(255, 255, 255, 0.6) 45%,
			rgba(255, 255, 255, 0.8) 50%,
			rgba(255, 255, 255, 0.6) 55%,
			transparent 70%
		);
		animation: logo-sparkle 0.8s 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	@keyframes logo-sparkle {
		0% {
			transform: translateX(0) skewX(-15deg);
			opacity: 0;
		}
		20% {
			opacity: 1;
		}
		100% {
			transform: translateX(350%) skewX(-15deg);
			opacity: 0;
		}
	}
</style>
