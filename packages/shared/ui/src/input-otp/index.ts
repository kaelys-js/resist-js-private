/**
 * Barrel re-export for the input-otp compound component —
 * exposes Root / Group / Slot / Separator sub-components under
 * both internal aliases and the `InputOTP*` public names.
 *
 * @module
 */

import Root from './input-otp.svelte';
import Group from './input-otp-group.svelte';
import Separator from './input-otp-separator.svelte';
import Slot from './input-otp-slot.svelte';

export {
  Root,
  Group,
  Slot,
  Separator,
  Root as InputOTP,
  Group as InputOTPGroup,
  Slot as InputOTPSlot,
  Separator as InputOTPSeparator,
};
