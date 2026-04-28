<script lang="ts">
  /**
   * Lens example — Resizable with horizontal panes whose right
   * side is further split vertically into nested panes.
   *
   * @module
   */
  import * as Resizable from '@/ui/resizable';
</script>

<div class="h-64 rounded-lg border">
  <Resizable.PaneGroup direction="horizontal">
    <Resizable.Pane defaultSize={40} minSize={20}>
      <div class="flex h-full items-center justify-center bg-muted/30 p-4">
        <span class="text-sm font-medium text-muted-foreground">Left Pane</span>
      </div>
    </Resizable.Pane>
    <Resizable.Handle withHandle />
    <Resizable.Pane defaultSize={60} minSize={30}>
      <Resizable.PaneGroup direction="vertical">
        <Resizable.Pane defaultSize={50}>
          <div class="flex h-full items-center justify-center p-4">
            <span class="text-sm font-medium text-muted-foreground">Top Right</span>
          </div>
        </Resizable.Pane>
        <Resizable.Handle withHandle />
        <Resizable.Pane defaultSize={50}>
          <div class="flex h-full items-center justify-center p-4">
            <span class="text-sm font-medium text-muted-foreground">Bottom Right</span>
          </div>
        </Resizable.Pane>
      </Resizable.PaneGroup>
    </Resizable.Pane>
  </Resizable.PaneGroup>
</div>
