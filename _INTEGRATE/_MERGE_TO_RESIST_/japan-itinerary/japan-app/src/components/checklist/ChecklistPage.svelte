<script lang="ts">
  import { Page, Navbar } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import { CHECKLIST_SECTIONS } from '../../data/data';
  import { loadChecklist, saveChecklist } from '../../lib/state';
  import type { ChecklistState } from '../../data/types';
  import ChecklistProgress from './ChecklistProgress.svelte';
  import ChecklistSection from './ChecklistSection.svelte';

  let checklistState = $state<ChecklistState>({});

  const totalItems = CHECKLIST_SECTIONS.reduce(
    (sum, section) => sum + section.items.length,
    0,
  );

  const completedItems = $derived(
    Object.values(checklistState).filter(Boolean).length,
  );

  function handleToggle(id: string, value: boolean) {
    checklistState = { ...checklistState, [id]: value };
    saveChecklist(checklistState);
  }

  onMount(async () => {
    checklistState = await loadChecklist();
  });
</script>

<Page name="checklist">
  <Navbar title="Checklist" />

  <ChecklistProgress completed={completedItems} total={totalItems} />

  {#each CHECKLIST_SECTIONS as section (section.id)}
    <ChecklistSection
      {section}
      {checklistState}
      onToggle={handleToggle}
    />
  {/each}

  <div class="checklist-bottom-spacer"></div>
</Page>

<style>
  .checklist-bottom-spacer {
    height: calc(var(--space-xl) + env(safe-area-inset-bottom, 0px));
  }
</style>
