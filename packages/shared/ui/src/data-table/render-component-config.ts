import type { Component, ComponentProps } from 'svelte';

/**
 * A helper class to make it easy to identify Svelte components in
 * `columnDef.cell` and `columnDef.header` properties.
 *
 * > NOTE: This class should only be used internally by the adapter. If you're
 * reading this and you don't know what this is for, you probably don't need it.
 *
 * @example
 * ```svelte
 * {@const result = content(context as any)}
 * {#if result instanceof RenderComponentConfig}
 *   {@const { component: Component, props } = result}
 *   <Component {...props} />
 * {/if}
 * ```
 */
export class RenderComponentConfig<TComponent extends Component> {
  component: TComponent;
  props: ComponentProps<TComponent> | Record<string, never>;
  constructor(
    component: TComponent,
    props: ComponentProps<TComponent> | Record<string, never> = {},
  ) {
    this.component = component;
    this.props = props;
  }
}

/**
 * A helper function to help create cells from Svelte components through ColumnDef's `cell` and `header` properties.
 *
 * This is only to be used with Svelte Components - use `renderSnippet` for Svelte Snippets.
 *
 * @param component A Svelte component
 * @param props The props to pass to `component`
 * @returns A `RenderComponentConfig` object that helps svelte-table know how to render the header/cell component.
 * @example
 * ```ts
 * // +page.svelte
 * const defaultColumns = [
 *   columnHelper.accessor('name', {
 *     header: header => renderComponent(SortHeader, { label: 'Name', header }),
 *   }),
 *   columnHelper.accessor('state', {
 *     header: header => renderComponent(SortHeader, { label: 'State', header }),
 *   }),
 * ]
 * ```
 * @see {@link https://tanstack.com/table/latest/docs/guide/column-defs}
 */
export function renderComponent<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends Component<any>,
  Props extends ComponentProps<T>,
>(component: T, props: Props = {} as Props) {
  return new RenderComponentConfig(component, props);
}
