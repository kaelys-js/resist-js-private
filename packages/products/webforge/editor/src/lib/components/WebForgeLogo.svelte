<script lang="ts">
let { size = 24, class: className = '' }: { size?: number; class?: string } = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="currentColor"
	class={className}
	aria-hidden="true"
>
	<path
		fill-rule="evenodd"
		d={[
			'M1 8 L4 4 H21 V11 H4 Z',
			'M6 11 H19 V16 H6 Z',
			'M3 16 H21 L23 21 H1 Z',
			'M10 6 H12 V8 H10 Z',
			'M13 6 H15 V8 H13 Z',
			'M10 9 H12 V11 H10 Z',
			'M13 9 H15 V11 H13 Z',
		].join(' ')}
	/>
</svg>
