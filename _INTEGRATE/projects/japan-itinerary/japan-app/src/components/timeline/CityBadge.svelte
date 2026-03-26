<script lang="ts">
  import type { City } from '../../data/types';

  let { city }: { city: City } = $props();

  const cityClass = $derived(
    'city-' + city.toLowerCase().replace('/', '\\/'),
  );
</script>

<span class="city-badge {cityClass}">{city}</span>
