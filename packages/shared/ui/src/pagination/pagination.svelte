<!-- @convert-to-lens -->
<script lang="ts">
	import { Pagination as PaginationPrimitive } from "bits-ui";

	import { cn } from "../utils.js";

	let {
		ref = $bindable(null),
		class: className,
		/** Total number of items to paginate. @values 0, 10, 50, 100 */
		count = 0,
		/** Number of items per page. @values 5, 10, 20, 50 */
		perPage = 10,
		/** The current active page number. @values 1, 2, 3, 5 */
		page = $bindable(1),
		/** Number of sibling pages shown around the current page. @values 0, 1, 2, 3 */
		siblingCount = 1,
		...restProps
	}: PaginationPrimitive.RootProps = $props();
</script>

<PaginationPrimitive.Root
	bind:ref
	bind:page
	role="navigation"
	aria-label="pagination"
	data-slot="pagination"
	class={cn("mx-auto flex w-full justify-center", className)}
	{count}
	{perPage}
	{siblingCount}
	{...restProps}
/>
