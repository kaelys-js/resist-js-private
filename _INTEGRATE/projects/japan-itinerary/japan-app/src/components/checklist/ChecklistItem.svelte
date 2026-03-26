<script lang="ts">
  import type { ChecklistItem as ChecklistItemType } from '../../data/types';
  import { ListItem, SwipeoutActions, SwipeoutButton } from 'framework7-svelte';
  import { tapFeedback } from '../../lib/haptics';

  let { item, checked = false, onToggle }: {
    item: ChecklistItemType;
    checked?: boolean;
    onToggle?: (id: string, value: boolean) => void;
  } = $props();

  function handleChange() {
    tapFeedback();
    onToggle?.(item.id, !checked);
  }

  function handleSwipeoutDeleted() {
    if (!checked) {
      tapFeedback();
      onToggle?.(item.id, true);
    }
  }
</script>

<ListItem
  checkbox
  {checked}
  title={item.text}
  subtitle={item.subtitle || undefined}
  onChange={handleChange}
  swipeout
  class={checked ? 'checklist-item--checked' : ''}
>
  <SwipeoutActions right>
    <SwipeoutButton
      color="green"
      close
      onClick={handleSwipeoutDeleted}
      overswipe
    >
      Done
    </SwipeoutButton>
  </SwipeoutActions>
</ListItem>
