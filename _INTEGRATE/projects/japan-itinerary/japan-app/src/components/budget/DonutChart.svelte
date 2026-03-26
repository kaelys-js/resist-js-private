<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from 'chart.js';

  Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

  let { segments, centerText = '' }: {
    segments: { label: string; value: number; color: string }[];
    centerText?: string;
  } = $props();

  let canvas: HTMLCanvasElement;
  let chart: Chart<'doughnut'> | null = null;

  onMount(() => {
    chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: segments.map((s) => s.label),
        datasets: [
          {
            data: segments.map((s) => s.value),
            backgroundColor: segments.map((s) => s.color),
            borderWidth: 2,
            borderColor:
              getComputedStyle(document.documentElement)
                .getPropertyValue('--color-warm-white')
                .trim() || '#faf8f5',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 12,
              usePointStyle: true,
              pointStyleWidth: 8,
              font: {
                family: '-apple-system, SF Pro Text, system-ui, sans-serif',
                size: 11,
              },
            },
          },
          tooltip: {
            callbacks: {
              label(ctx) {
                return ` ${ctx.label}: \u00a5${ctx.parsed.toLocaleString()}`;
              },
            },
          },
        },
      },
    });
  });

  onDestroy(() => {
    chart?.destroy();
    chart = null;
  });
</script>

<div class="donut-wrapper">
  <canvas bind:this={canvas}></canvas>
  {#if centerText}
    <div class="donut-center">{centerText}</div>
  {/if}
</div>

<style>
  .donut-wrapper {
    position: relative;
    max-width: 260px;
    margin: 0 auto;
    padding: var(--space-md) 0;
  }

  .donut-center {
    position: absolute;
    top: 45%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-charcoal);
    text-align: center;
    pointer-events: none;
  }
</style>
