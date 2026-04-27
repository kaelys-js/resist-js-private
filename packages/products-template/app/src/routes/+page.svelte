<script lang="ts">
  /**
   * Home page for the products-template app — minimal scaffold
   * page with a counter button used as the starting point for new
   * product applications generated from the template.
   *
   * @module
   */

  import { Button } from '@/ui/button';

  let count = $state(0);
</script>

<main>
  <h1>{'{product}'} App</h1>
  <p>Authenticated product experience.</p>

  <Button onclick={() => count++}>
    Count: {count}
  </Button>
</main>
