<script lang="ts">
  import type { Stop } from '../../data/types';
  import { formatCost } from '../../lib/currency';
  import { openInMaps, copyAddress } from '../../lib/maps';
  import { shareStop } from '../../lib/share';
  import { tapFeedback } from '../../lib/haptics';
  import { Icon, Actions, ActionsGroup, ActionsButton, ActionsLabel } from 'framework7-svelte';

  let { stop, dayLabel = '' }: { stop: Stop; dayLabel?: string } = $props();
  let actionsOpen = $state(false);

  const hasCost = $derived(stop.cost !== null);
  const isFree = $derived(stop.cost === 0);
  const costText = $derived(formatCost(stop.cost));

  function handleLongPress() {
    if (stop.mapQuery) {
      tapFeedback();
      actionsOpen = true;
    }
  }

  function handleMapOpen() {
    if (stop.mapQuery) openInMaps(stop.mapQuery);
  }

  function handleCopy() {
    copyAddress(stop.location + ', Japan');
  }

  function handleShare() {
    shareStop(stop.location, stop.time, dayLabel);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="stop-item"
  oncontextmenu={(e) => { e.preventDefault(); handleLongPress(); }}
>
  <div class="stop-time">{stop.time}</div>
  <div class="stop-content">
    <div class="stop-header">
      <span class="stop-location">{stop.location}</span>
      {#if hasCost}
        <span class="badge-cost" class:badge-cost--free={isFree} class:badge-cost--paid={!isFree}>
          {costText}
        </span>
      {/if}
      {#if stop.mapQuery}
        <button class="stop-map-btn" onclick={handleMapOpen} aria-label="Open in Maps">
          <Icon f7="map_fill" size="14px" />
        </button>
      {/if}
    </div>
    {#if stop.directions && stop.directions !== '\u2014'}
      <p class="stop-directions">{stop.directions}</p>
    {/if}
    {#if stop.tips}
      <p class="stop-tips">{stop.tips}</p>
    {/if}
  </div>
</div>

<Actions opened={actionsOpen} onActionsClosed={() => { actionsOpen = false; }}>
  <ActionsGroup>
    <ActionsLabel>{stop.location}</ActionsLabel>
    <ActionsButton onclick={handleMapOpen}>
      {#snippet media()}<Icon f7="map_fill" />{/snippet}
      Open in Maps
    </ActionsButton>
    <ActionsButton onclick={handleCopy}>
      {#snippet media()}<Icon f7="doc_on_clipboard" />{/snippet}
      Copy Address
    </ActionsButton>
    <ActionsButton onclick={handleShare}>
      {#snippet media()}<Icon f7="square_arrow_up" />{/snippet}
      Share
    </ActionsButton>
    <ActionsButton color="red" close>Cancel</ActionsButton>
  </ActionsGroup>
</Actions>

<style>
  .stop-item {
    display: flex;
    gap: var(--space-md);
    padding: var(--space-sm) 0;
    border-bottom: 1px solid var(--color-divider);
  }

  .stop-item:last-child {
    border-bottom: none;
  }

  .stop-time {
    flex-shrink: 0;
    width: 48px;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-navy);
    padding-top: 2px;
  }

  .stop-content {
    flex: 1;
    min-width: 0;
  }

  .stop-header {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    flex-wrap: wrap;
  }

  .stop-location {
    font-weight: 600;
    font-size: 0.9375rem;
    color: var(--color-charcoal);
  }

  .stop-map-btn {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: var(--color-navy);
    opacity: 0.6;
    display: flex;
    align-items: center;
  }

  .stop-map-btn:active {
    opacity: 1;
  }

  .stop-directions {
    margin: 4px 0 2px;
    font-size: 0.8125rem;
    color: var(--color-slate);
    line-height: 1.3;
  }

  .stop-tips {
    margin: 2px 0 0;
    font-size: 0.8125rem;
    color: var(--color-charcoal);
    line-height: 1.4;
  }
</style>
