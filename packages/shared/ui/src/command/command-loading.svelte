<script lang="ts">
  /**
   * Command loading — spinner / placeholder shown while async
   * search results are loading. Wraps Bits UI's
   * `Command.Loading`.
   *
   * @module
   */

  import { Command as CommandPrimitive } from 'bits-ui';

  let { ref = $bindable(null), ...restProps }: CommandPrimitive.LoadingProps = $props();
</script>

<CommandPrimitive.Loading bind:ref {...restProps} />
