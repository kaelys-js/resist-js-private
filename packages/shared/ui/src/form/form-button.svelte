<script lang="ts">
  /**
   * Form.Button — submit button slot for a Formsnap-driven
   * form. Forwards all props to the shared `Button` component
   * with `type="submit"`.
   *
   * @module
   */
  import { Button, type ButtonProps } from '../button/index.js';

  let { ref = $bindable(null), ...restProps }: ButtonProps = $props();
</script>

<Button bind:ref type="submit" {...restProps} />
