<script lang="ts">
  import { PAID_ENTRIES } from '../../data/data';
  import { formatCost } from '../../lib/currency';
  import { BlockTitle, List, ListItem, Badge } from 'framework7-svelte';
</script>

{#each Object.entries(PAID_ENTRIES) as [city, entries] (city)}
  <BlockTitle>{city}</BlockTitle>
  <List>
    {#each entries as entry (entry.name)}
      <ListItem title={entry.name}>
        {#snippet after()}
          <span class="paid-entry__cost">
            {formatCost(entry.cost)}
            {#if entry.mustPreBook}
              <Badge color="red" class="paid-entry__prebook">Pre-book</Badge>
            {/if}
          </span>
        {/snippet}
      </ListItem>
    {/each}
  </List>
{/each}

<style>
  .paid-entry__cost {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-navy);
  }
</style>
