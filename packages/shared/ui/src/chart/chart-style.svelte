<script lang="ts">
  import { type ChartConfig, THEMES } from './chart-utils.js';

  let {
    /** Matching chart container identifier. @values chart-1, chart-2, chart-3 */
    id,
    /** Chart color and label configuration object. */
    config,
  }: { id: string; config: ChartConfig } = $props();

  const colorConfig = $derived(
    config ? Object.entries(config).filter(([, itemCfg]) => itemCfg.theme || itemCfg.color) : null,
  );

  const themeContents = $derived.by(() => {
    if (!colorConfig || colorConfig.length === 0) {
      return;
    }

    const parts = [];
    for (let [_theme, prefix] of Object.entries(THEMES)) {
      let content = `${prefix} [data-chart=${id}] {\n`;
      const lines = colorConfig.map(([key, itemConfig]) => {
        const theme = _theme as keyof typeof itemConfig.theme;
        const colorValue = itemConfig.theme?.[theme] || itemConfig.color;
        return colorValue ? `\t--color-${key}: ${colorValue};` : null;
      });

      content += `${lines.join('\n')}\n}`;

      parts.push(content);
    }

    return parts.join('\n');
  });
</script>

{#if themeContents}
  {#key id}
    <svelte:element this={'style'}>
      {themeContents}
    </svelte:element>
  {/key}
{/if}
