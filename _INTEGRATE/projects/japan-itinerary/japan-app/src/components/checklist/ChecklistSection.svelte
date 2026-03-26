<script lang="ts">
  import type { ChecklistSection as SectionType, ChecklistState } from '../../data/types';
  import { BlockTitle, List, Badge } from 'framework7-svelte';
  import ChecklistItem from './ChecklistItem.svelte';

  let { section, checklistState = {}, onToggle }: {
    section: SectionType;
    checklistState?: ChecklistState;
    onToggle?: (id: string, value: boolean) => void;
  } = $props();

  const completedCount = $derived(
    section.items.filter((item) => checklistState[item.id]).length,
  );
  const totalCount = $derived(section.items.length);
</script>

<BlockTitle>
  <span class="checklist-section__title">{section.title}</span>
  <Badge
    color={completedCount === totalCount ? 'green' : 'gray'}
    class="checklist-section__badge"
  >
    {completedCount}/{totalCount}
  </Badge>
</BlockTitle>

<List>
  {#each section.items as item (item.id)}
    <ChecklistItem
      {item}
      checked={checklistState[item.id] ?? false}
      {onToggle}
    />
  {/each}
</List>

<style>
  .checklist-section__title {
    flex: 1;
  }

  :global(.checklist-section__badge) {
    margin-left: var(--space-sm);
  }
</style>
