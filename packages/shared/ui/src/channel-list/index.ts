/**
 * Barrel re-export for the channel-list component — exposes the
 * `ChannelList` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type ChannelListProps, ChannelListPropsSchema } from './ChannelList.svelte';

export {
  Root,
  type ChannelListProps,
  ChannelListPropsSchema,
  //
  Root as ChannelList,
};
