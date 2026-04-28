<script lang="ts">
  /**
   * PageFadeIn Lens example — basic page-content fade-in
   * wrapper.
   *
   * @module
   */
  import PageFadeIn from '@/ui/page-fade-in/PageFadeIn.svelte';
</script>

<PageFadeIn>
  <div class="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
    <h3 class="text-lg font-semibold">Faded In Content</h3>
    <p class="mt-2 text-sm text-muted-foreground">This content fades in on mount.</p>
  </div>
</PageFadeIn>
