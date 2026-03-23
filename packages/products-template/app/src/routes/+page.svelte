<script lang="ts">
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
