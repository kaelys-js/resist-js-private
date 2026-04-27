/**
 * Barrel re-export for the agent-status component — exposes the
 * `AgentStatus` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type AgentStatusProps, AgentStatusPropsSchema } from './AgentStatus.svelte';

export {
  Root,
  type AgentStatusProps,
  AgentStatusPropsSchema,
  //
  Root as AgentStatus,
};
