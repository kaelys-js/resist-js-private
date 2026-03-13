<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';
  import { PropMetaSchema, type PropMeta, type TypeField } from '../lens/types.js';

  /** Sort column identifier for PropsTable header sorting. */
  export type PropsTableSortColumn =
    | 'name'
    | 'required'
    | 'type'
    | 'accepts'
    | 'default'
    | 'description';

  /** Sort direction for PropsTable header sorting. */
  export type PropsTableSortDirection = 'asc' | 'desc' | 'none';

  export const PropsTablePropsSchema = v.strictObject({
    /** Array of prop metadata to render. @values [{name: "variant", type: "Str", default: "default", description: "Visual style", bindable: false}] */
    props: v.array(PropMetaSchema),
    /** Variant key names — props matching these get a "See variants" action. @values variant, size, disabled */
    variantKeys: v.optional(v.array(StrSchema)),
    /** Additional CSS classes for the root element. */
    class: v.optional(StrSchema),
    /** Callback when a sortable column header is clicked. @values (column, direction) => void */
    onsort: v.optional(
      v.custom<(column: PropsTableSortColumn, direction: PropsTableSortDirection) => void>(
        () => true,
      ),
    ),
    /** Currently sorted column for header indicator display. @values name, required, type, accepts, default, description */
    sortColumn: v.optional(
      v.nullable(v.picklist(['name', 'required', 'type', 'accepts', 'default', 'description'])),
    ),
    /** Current sort direction for header indicator display. @values asc, desc, none */
    sortDirection: v.optional(v.picklist(['asc', 'desc', 'none'])),
  });
  /** Props for the PropsTable component. */
  export type PropsTableProps = v.InferOutput<typeof PropsTablePropsSchema>;
</script>

<script lang="ts">
  /**
   * Renders a table of component props extracted by the Lens system.
   *
   * Displays Name, Required, Type, Accepts, Default, and Description columns from
   * auto-extracted `PropMeta[]` data. Props with complex object types show collapsible
   * child rows for their type fields inside a `transition:slide` wrapper. Both parent
   * and nested tables use explicit `<colgroup>` widths for column alignment.
   */
  import { fade, slide } from 'svelte/transition';
  import type { Bool, Num, Str, Void } from '@/schemas/common';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import ArrowDown from '@lucide/svelte/icons/arrow-down';
  import ToggleLeft from '@lucide/svelte/icons/toggle-left';
  import ToggleRight from '@lucide/svelte/icons/toggle-right';
  import { safeParse } from '@/utils/result/safe';
  import Badge from '../badge/badge.svelte';
  import LensEmpty from '../lens-empty/LensEmpty.svelte';
  import * as DropdownMenu from '../dropdown-menu/index.js';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import CircleHelp from '@lucide/svelte/icons/circle-help';
  import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical';
  import Layers from '@lucide/svelte/icons/layers';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import Link from '@lucide/svelte/icons/link';
  import Copy from '@lucide/svelte/icons/copy';
  import Check from '@lucide/svelte/icons/check';
  import ClipboardCopy from '@lucide/svelte/icons/clipboard-copy';
  import * as Tooltip from '../tooltip/index.js';
  import { cn } from '../utils.js';
  import { stripSvelteProps } from '../lens/lens-utils.js';

  const allProps: PropsTableProps = $props();
  const validated: PropsTableProps = $derived.by(() => {
    const rawProps: PropsTableProps = stripSvelteProps(allProps);
    const result = safeParse(PropsTablePropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // Cast to mutable — Result.data is deep-frozen via Object.freeze but component only reads, never mutates
    return result.data as PropsTableProps;
  });

  /** Callback when a sortable column header is clicked. */
  const onsort = $derived(validated.onsort);
  /** Currently sorted column for header indicator display. */
  const sortColumn = $derived(validated.sortColumn);
  /** Current sort direction for header indicator display. */
  const sortDirection = $derived(validated.sortDirection);

  /** Resolved variant keys with empty-array default. */
  const variantKeys: readonly Str[] = $derived(validated.variantKeys ?? []);

  /** Set of variant keys for O(1) lookup. */
  const variantKeySet: Set<Str> = $derived(new Set(variantKeys));

  /** Set of prop names whose type fields are currently expanded. */
  let expandedTypeFields: Set<Str> = $state(new Set());

  /** Current table density mode. */
  // Density state — cast needed because $state infers literal 'comfortable', not Str
  let tableDensity: Str = $state('comfortable' as Str);

  /**
   * Return Tailwind padding classes based on the current density mode.
   *
   * @returns Padding class string
   */
  function densityPadding(): Str {
    if (tableDensity === 'compact') return 'px-3 py-0.5' as Str;
    if (tableDensity === 'spacious') return 'px-4 py-3' as Str;
    return 'px-4 py-2' as Str;
  }

  /**
   * Return Tailwind padding classes for nested/type-field rows based on density.
   *
   * @returns Padding class string for nested rows
   */
  function nestedDensityPadding(): Str {
    if (tableDensity === 'compact') return 'px-3 py-0.5' as Str;
    if (tableDensity === 'spacious') return 'px-4 py-2' as Str;
    return 'px-4 py-1.5' as Str;
  }

  /**
   * Set the table row density mode.
   *
   * @param density - One of 'compact', 'comfortable', or 'spacious'
   */
  export function setDensity(density: Str): Void {
    tableDensity = density;
  }

  /**
   * Get the current table row density mode.
   *
   * @returns Current density string
   */
  export function getDensity(): Str {
    return tableDensity;
  }

  /**
   * Toggle the expanded state of a prop's type fields.
   *
   * @param propName - The prop name to toggle
   */
  function toggleTypeFields(propName: Str): Void {
    const next: Set<Str> = new Set(expandedTypeFields);
    if (next.has(propName)) {
      next.delete(propName);
    } else {
      next.add(propName);
    }
    expandedTypeFields = next;
  }

  /**
   * Expand all type fields for props that have them.
   * Recursively includes nested type field keys.
   */
  export function expandAllTypeFields(): Void {
    const all: Set<Str> = new Set<Str>();
    for (const prop of validated.props) {
      if (hasTypeFields(prop)) {
        all.add(prop.name);
        for (const tf of prop.typeFields ?? []) {
          if (tf.typeFields && tf.typeFields.length > 0) {
            all.add(`${prop.name}.${tf.field}` as Str);
          }
        }
      }
    }
    expandedTypeFields = all;
  }

  /**
   * Collapse all expanded type fields.
   */
  export function collapseAllTypeFields(): Void {
    expandedTypeFields = new Set();
  }

  /** Whether any type fields are currently expanded. */
  const hasAnyExpanded: Bool = $derived(expandedTypeFields.size > 0);

  /** Whether any props have expandable type fields. */
  const hasExpandableProps: Bool = $derived(
    validated.props.some((p: PropMeta): boolean => hasTypeFields(p)),
  );

  /**
   * Returns whether any type fields are currently expanded.
   *
   * @returns True if any type fields are expanded
   */
  export function getHasAnyExpanded(): Bool {
    return hasAnyExpanded;
  }

  /**
   * Returns whether any props have expandable type fields.
   *
   * @returns True if any props have expandable type fields
   */
  export function getHasExpandableProps(): Bool {
    return hasExpandableProps;
  }

  /**
   * Handle column header click for sorting.
   * Cycles: none → asc → desc → none.
   *
   * @param column - The column to sort by
   */
  function handleColumnSort(column: PropsTableSortColumn): Void {
    if (!onsort) return;
    if (sortColumn === column) {
      // Cycle direction
      if (sortDirection === 'asc') {
        onsort(column, 'desc');
      } else if (sortDirection === 'desc') {
        onsort(column, 'none');
      } else {
        onsort(column, 'asc');
      }
    } else {
      onsort(column, 'asc');
    }
  }

  /**
   * Smooth-scroll to a specific variant section by prop name.
   *
   * @param propName - The prop/variant key name to scroll to
   */
  function scrollToVariant(propName: Str): Void {
    // Escape dots for CSS selector (dotted keys like meta.category → meta\.category)
    const escaped: Str = propName.replaceAll('.', String.raw`\.`);
    document.querySelector(`#variant-${escaped}`)?.scrollIntoView({ behavior: 'smooth' });
  }

  /**
   * Determine if a prop is required (no default value and not marked optional).
   *
   * @param prop - The prop metadata
   * @returns True if the prop has no default and is not optional
   */
  function isRequired(prop: PropMeta): Bool {
    if (prop.optional) return false;
    return !prop.default;
  }

  /**
   * Check whether a prop's description contains a `@deprecated` tag.
   *
   * @param prop - The prop metadata
   * @returns True if the description includes `@deprecated`
   */
  function isDeprecated(prop: PropMeta): Bool {
    return prop.description?.toLowerCase().includes('@deprecated') ?? false;
  }

  /**
   * Strip the `@deprecated` tag from a description for display.
   *
   * @param description - Raw description string
   * @returns Cleaned description without the tag
   */
  function cleanDeprecatedTag(description: Str): Str {
    return description.replace(/@deprecated\s*/i, '').trim();
  }

  /** Tracks which prop row just had its link copied (for feedback). */
  let copiedPropLink: Str = $state('');

  /** Tracks which prop row just had its name/type copied (for feedback). */
  let copiedPropAction: Str = $state('');

  /**
   * Copy text to clipboard and show brief feedback.
   *
   * @param text - Text to copy
   * @param feedbackKey - Key to set for visual feedback
   */
  async function copyWithFeedback(text: Str, feedbackKey: Str): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* Clipboard write failed — browser may not support it in this context */
    }
    copiedPropAction = feedbackKey;
    setTimeout((): Void => {
      copiedPropAction = '' as Str;
    }, 1500);
  }

  /**
   * Copy a deep link URL for a specific prop to the clipboard.
   *
   * @param propName - The prop name to link to
   */
  async function copyPropLink(propName: Str): Promise<void> {
    const url: Str = `${window.location.pathname}#prop-${propName}` as Str;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* Clipboard write failed — browser may not support it in this context */
    }
    copiedPropLink = propName;
    setTimeout((): Void => {
      copiedPropLink = '' as Str;
    }, 1500);
  }

  /**
   * Check whether a type string is "complex" enough to warrant a help icon.
   *
   * @param type - The TypeScript type string
   * @returns True if the type is non-trivial
   */
  function isComplexType(type: Str): Bool {
    if (!type || type === '—') return false;
    if (/^(string|number|boolean|Str|Num|Bool|Void)$/.test(type)) return false;
    if (/^'[^']*'$/.test(type)) return false;
    // Union types get their own pretty rendering — not "complex"
    if (isUnionType(type)) return false;
    return true;
  }

  /**
   * Check whether a type string is a pipe-separated union (e.g., `'a' | 'b' | 'c'`).
   *
   * @param type - The TypeScript type string
   * @returns True if the type contains ` | `
   */
  function isUnionType(type: Str): Bool {
    return type.includes(' | ');
  }

  /**
   * Split a union type string into individual members, stripping surrounding quotes.
   *
   * @param type - Union type string like `'a' | 'b' | undefined`
   * @returns Array of cleaned member strings
   */
  function parseUnionMembers(type: Str): Str[] {
    return type
      .split(' | ')
      .map((m: Str): Str => m.trim())
      .filter(Boolean)
      .map((m: Str): Str => m.replaceAll(/^'|'$/g, ''));
  }

  /**
   * Return the raw union member before quote-stripping, for type classification.
   *
   * @param type - Union type string
   * @returns Array of raw member strings (with quotes preserved)
   */
  function parseUnionMembersRaw(type: Str): Str[] {
    return type
      .split(' | ')
      .map((m: Str): Str => m.trim())
      .filter(Boolean);
  }

  /**
   * Return Tailwind classes for syntax-highlighting a type token.
   *
   * @param token - The type token string
   * @returns Tailwind color classes
   */
  function typeTokenClass(token: Str): Str {
    // Primitives
    if (/^(string|number|boolean|Str|Num|Bool|Void)$/.test(token)) {
      return 'text-blue-500 dark:text-blue-400' as Str;
    }
    // String literals
    if (token.startsWith("'") || token.startsWith('"')) {
      return 'text-emerald-600 dark:text-emerald-400' as Str;
    }
    // Nullish
    if (token === 'undefined' || token === 'null') {
      return 'text-muted-foreground/50' as Str;
    }
    // Type references (PascalCase or generics)
    if (/^[A-Z]/.test(token) || token.includes('<')) {
      return 'text-violet-500 dark:text-violet-400' as Str;
    }
    return 'text-muted-foreground' as Str;
  }

  /**
   * Return chip classes for a union member based on its raw form.
   *
   * @param rawMember - The raw union member (with quotes if literal)
   * @returns Tailwind classes for the chip
   */
  function unionChipClass(rawMember: Str): Str {
    if (rawMember.startsWith("'") || rawMember.startsWith('"')) {
      return 'rounded bg-emerald-500/10 px-1 py-0.5 text-[11px] text-emerald-600 dark:text-emerald-400' as Str;
    }
    if (rawMember === 'undefined' || rawMember === 'null') {
      return 'rounded bg-muted px-1 py-0.5 text-[11px] text-muted-foreground/50' as Str;
    }
    // Other members: base chip + typeTokenClass
    const colorClass: Str = typeTokenClass(rawMember);
    return `rounded bg-muted px-1 py-0.5 text-[11px] ${colorClass}` as Str;
  }

  /**
   * Generate a human-readable explanation for a TypeScript type.
   *
   * @param type - The TypeScript type string
   * @returns A plain-English explanation
   */
  function explainType(type: Str): Str {
    if (type === 'Snippet') return 'A Svelte snippet — a reusable template block passed as a prop.';
    if (type === 'Component')
      return 'A Svelte component reference that can be rendered dynamically.';
    if (type === 'Snippet | undefined')
      return 'An optional Svelte snippet — a reusable template block.';

    if (type.includes("['")) {
      const parent: Str = type.split("['")[0] ?? '';
      return `Type inherited from ${parent}. See the parent type definition for details.`;
    }

    if (type.endsWith('[]')) {
      const base: Str = type.slice(0, -2);
      return `An array of ${base} values.`;
    }

    if (type.includes(' | ')) {
      const options: Str[] = type.split(' | ').map((o: Str): Str => o.trim());
      const allLiterals: Bool = options.every(
        (o: Str): boolean => o.startsWith("'") || o === 'undefined' || o === 'null',
      );
      if (allLiterals) return `Accepts one of: ${type}`;
      return `A union type — can be any of: ${options.join(', ')}`;
    }

    if (type.includes('<')) {
      const baseName: Str = type.split('<')[0] ?? '';
      return `A ${baseName} generic type. See TypeScript docs for details.`;
    }

    return `Type: ${type}`;
  }

  /**
   * Get accepted values for the Accepts column.
   *
   * Prefers explicit `@values` (mockValues), then parses string literal unions
   * from the type string.
   *
   * @param prop - The prop metadata
   * @returns Comma-separated accepted values, or '—' if none
   */
  function getAccepts(prop: PropMeta): Str {
    // Normalize type: strip nullable/undefined suffixes and array brackets for base matching
    const baseType: Str = prop.type
      .replaceAll(/\s*\|\s*(null|undefined)\b/g, '')
      .replaceAll(/^(null|undefined)\s*\|\s*/g, '')
      .replace(/\[]$/, '')
      .trim();
    const isNullable: Bool = prop.type.includes('| null');
    const isArray: Bool = prop.type.endsWith('[]');

    // Primitives — match base type after stripping nullable/array wrappers
    const primitiveMap: Record<Str, Str> = {
      string: 'text',
      Str: 'text',
      number: 'number',
      Num: 'number',
      boolean: 'true, false',
      Bool: 'true, false',
      Snippet: 'snippet',
      Component: 'component',
    };
    const primitiveAccepts: Str | undefined = primitiveMap[baseType];
    if (primitiveAccepts) {
      const label: Str = isArray ? `list of ${primitiveAccepts}` : primitiveAccepts;
      return isNullable ? `${label} or empty` : label;
    }

    // Inline string literal union: 'a' | 'b' | 'c' (possibly with null/undefined)
    if (prop.type.includes(' | ')) {
      const options: Str[] = prop.type.split(' | ').map((o: Str): Str => o.trim());
      const allLiterals: Bool = options.every(
        (o: Str): boolean => o.startsWith("'") || o === 'undefined' || o === 'null',
      );
      if (allLiterals) {
        return options
          .filter((o: Str): boolean => o !== 'undefined' && o !== 'null')
          .map((o: Str): Str => o.replaceAll(/^'|'$/g, ''))
          .join(', ');
      }
      // Non-literal union with a primitive base (e.g., Str | null handled above,
      // but mixed unions like Str | Num fall through)
    }

    // Resolved type definition: named type → 'default' | 'secondary' | ...
    if (prop.typeDefinition?.includes(' | ')) {
      const options: Str[] = prop.typeDefinition.split(' | ').map((o: Str): Str => o.trim());
      const allLiterals: Bool = options.every(
        (o: Str): boolean => o.startsWith("'") || o === 'undefined' || o === 'null',
      );
      if (allLiterals) {
        return options
          .filter((o: Str): boolean => o !== 'undefined' && o !== 'null')
          .map((o: Str): Str => o.replaceAll(/^'|'$/g, ''))
          .join(', ');
      }
    }

    // Object types with type fields — show field count
    if (hasTypeFields(prop)) {
      const count: Num = prop.typeFields?.length ?? 0;
      return `object (${count} ${count === 1 ? 'field' : 'fields'})`;
    }

    // Function/callback types
    if (baseType.includes('=>') || baseType.startsWith('(')) {
      return 'function';
    }

    // HTMLElement subtypes
    if (baseType.endsWith('Element') || baseType === 'HTMLElement') {
      return 'DOM element';
    }

    return '—';
  }

  /**
   * Whether a prop has expandable type fields.
   *
   * @param prop - The prop metadata
   * @returns True if the prop has type fields to display
   */
  function hasTypeFields(prop: PropMeta): Bool {
    return prop.typeFields !== undefined && prop.typeFields.length > 0;
  }

  /**
   * Check whether a comma-separated accepts string represents a union of literal values.
   *
   * @param accepts - The accepts string from a TypeField
   * @returns True if it looks like a comma-separated union
   */
  function isAcceptsUnion(accepts: Str): Bool {
    if (!accepts || accepts === '—') return false;
    // "text", "number", "true / false" are not unions
    if (/^(text|number|true \/ false|true, false)$/.test(accepts)) return false;
    return accepts.includes(', ');
  }

  /**
   * Split an accepts string into individual members for chip rendering.
   *
   * @param accepts - Comma-separated accepts string
   * @returns Array of individual values
   */
  function parseAcceptsMembers(accepts: Str): Str[] {
    return accepts
      .split(', ')
      .map((m: Str): Str => m.trim())
      .filter(Boolean);
  }

  /**
   * Check whether a TypeField has nested expandable sub-fields.
   *
   * @param tf - The type field to check
   * @returns True if the field has nested typeFields
   */
  function hasNestedFields(tf: TypeField): Bool {
    return tf.typeFields !== undefined && tf.typeFields.length > 0;
  }

  /**
   * Return a tooltip label describing what clicking a column header will do next.
   *
   * @param col - The column key
   * @returns Human-readable sort action description
   */
  function sortTooltip(col: Str): Str {
    if (sortColumn === col) {
      if (sortDirection === 'asc') return 'Click to sort descending' as Str;
      if (sortDirection === 'desc') return 'Click to clear sort' as Str;
    }
    return 'Click to sort ascending' as Str;
  }

  /** Number of columns in the table — always 7 (Name, Required, Type, Accepts, Default, Description, Actions). */
  const colCount: Num = 7;
</script>

{#snippet requiredDot(required: Bool)}
  {#if required}
    <span class="inline-flex size-2 rounded-full bg-red-500" aria-label="Required"></span>
  {:else}
    <span class="inline-flex size-2 rounded-full bg-muted-foreground/20" aria-label="Optional"
    ></span>
  {/if}
{/snippet}

{#snippet acceptsCell(accepts: Str)}
  {#if accepts === '—'}
    <span class="text-muted-foreground/40">—</span>
  {:else if accepts === 'true, false'}
    <span class="inline-flex flex-wrap gap-1">
      <span
        class="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400"
        >true</span
      >
      <span
        class="rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400"
        >false</span
      >
    </span>
  {:else if accepts === 'text' || accepts === 'number'}
    <span class="text-[11px] italic text-muted-foreground/50">{accepts}</span>
  {:else if accepts.startsWith('list of ')}
    {@const listContent = accepts.slice(8)}
    {@const listNullable = listContent.endsWith(' or empty')}
    {@const listBase = listNullable ? listContent.slice(0, -9) : listContent}
    <span class="inline-flex items-center gap-1 text-[11px]">
      <span
        class="rounded bg-blue-500/10 px-1 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400"
        >list</span
      >
      <span class="text-muted-foreground/40">of</span>
      <span class="italic text-muted-foreground/50">{listBase}</span>
      {#if listNullable}
        <span class="text-muted-foreground/30">or</span>
        <span class="text-[10px] italic text-muted-foreground/40">empty</span>
      {/if}
    </span>
  {:else if accepts.endsWith(' or empty')}
    <span class="inline-flex items-center gap-1 text-[11px]">
      <span class="italic text-muted-foreground/50">{accepts.slice(0, -9)}</span>
      <span class="text-muted-foreground/30">or</span>
      <span class="text-[10px] italic text-muted-foreground/40">empty</span>
    </span>
  {:else if accepts.startsWith('object (')}
    <span class="inline-flex items-center gap-1 text-[11px]">
      <span
        class="rounded bg-violet-500/10 px-1 py-0.5 text-[10px] font-medium text-violet-600 dark:text-violet-400"
        >object</span
      >
      <span class="text-muted-foreground/50">{accepts.slice(7)}</span>
    </span>
  {:else if accepts === 'snippet' || accepts === 'component'}
    <span
      class="rounded bg-amber-500/10 px-1 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400"
      >{accepts}</span
    >
  {:else if accepts === 'function'}
    <span
      class="rounded bg-purple-500/10 px-1 py-0.5 text-[10px] font-medium text-purple-600 dark:text-purple-400"
      >{accepts}</span
    >
  {:else if accepts === 'DOM element'}
    <span
      class="rounded bg-sky-500/10 px-1 py-0.5 text-[10px] font-medium text-sky-600 dark:text-sky-400"
      >{accepts}</span
    >
  {:else if isAcceptsUnion(accepts)}
    <span class="inline-flex flex-wrap gap-1">
      {#each parseAcceptsMembers(accepts) as member, i (i)}
        <span
          class="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium"
          >{member}</span
        >
      {/each}
    </span>
  {:else}
    {accepts}
  {/if}
{/snippet}

{#snippet defaultCell(defaultVal: Str | undefined)}
  {#if defaultVal}
    {#if defaultVal === 'true'}
      <code class="rounded bg-muted px-1 py-0.5 text-[11px]"
        ><ToggleRight class="mr-0.5 inline size-3 text-emerald-500" />{defaultVal}</code
      >
    {:else if defaultVal === 'false'}
      <code class="rounded bg-muted px-1 py-0.5 text-[11px]"
        ><ToggleLeft class="mr-0.5 inline size-3 text-muted-foreground/50" />{defaultVal}</code
      >
    {:else}
      <code class="rounded bg-muted px-1 py-0.5 text-[11px]">{defaultVal}</code>
    {/if}
  {:else}
    <span class="text-[10px] italic text-muted-foreground/30">none</span>
  {/if}
{/snippet}

{#snippet typeCell(type: Str)}
  {#if isUnionType(type)}
    {@const rawMembers = parseUnionMembersRaw(type)}
    {@const cleanMembers = parseUnionMembers(type)}
    <span class="inline-flex flex-wrap items-center gap-1">
      {#each cleanMembers as member, mi (mi)}
        <code class={unionChipClass(rawMembers[mi] ?? ('' as Str))}>{member}</code>
      {/each}
    </span>
  {:else if isComplexType(type)}
    <span class="inline-flex items-center gap-1">
      {#if type.length > 30}
        <Tooltip.Provider>
          <Tooltip.Root delayDuration={300}>
            <Tooltip.Trigger>
              {#snippet child({ props: truncTypeProps })}
                <code {...truncTypeProps} class={cn('cursor-help truncate', typeTokenClass(type))}
                  >{type.slice(0, 30)}…</code
                >
              {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content side="top" sideOffset={4} class="max-w-sm font-mono text-xs">
              {type}
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      {:else}
        <code class={typeTokenClass(type)}>{type}</code>
      {/if}
      <Tooltip.Provider>
        <Tooltip.Root delayDuration={300}>
          <Tooltip.Trigger>
            {#snippet child({ props: triggerProps })}
              <button
                {...triggerProps}
                type="button"
                class="cursor-help text-muted-foreground/60 transition-colors hover:text-muted-foreground"
                aria-label="Type info"
              >
                <CircleHelp class="size-3" aria-hidden="true" />
              </button>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content side="top" sideOffset={4}>
            {explainType(type)}
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>
    </span>
  {:else if type}
    {#if type.length > 30}
      <Tooltip.Provider>
        <Tooltip.Root delayDuration={300}>
          <Tooltip.Trigger>
            {#snippet child({ props: truncTypeProps })}
              <code {...truncTypeProps} class={cn('cursor-help', typeTokenClass(type))}
                >{type.slice(0, 30)}…</code
              >
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content side="top" sideOffset={4} class="max-w-sm font-mono text-xs">
            {type}
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>
    {:else}
      <code class={typeTokenClass(type)}>{type}</code>
    {/if}
  {:else}
    <span class="text-muted-foreground/40">—</span>
  {/if}
{/snippet}

{#snippet colGroupCols()}
  <col class="w-[22%]" />
  <col class="w-[60px]" />
  <col class="w-[18%]" />
  <col class="w-[18%]" />
  <col class="w-[12%]" />
  <col class="w-auto" />
  <col class="w-10" />
{/snippet}

<div class={cn('overflow-x-auto rounded-lg border', validated.class)}>
  {#if validated.props.length === 0}
    <LensEmpty
      title="No props detected"
      description="This component's $props() destructuring has no typed fields. Add typed props or a Valibot schema to see them here."
    />
  {:else}
    <div class="max-h-[70vh] overflow-y-auto">
      <table class="w-full text-sm">
        <colgroup>
          {@render colGroupCols()}
        </colgroup>
        <thead class="sticky top-0 z-[5] bg-background">
          <tr class="border-b bg-muted/50">
            {#each [{ key: 'name', label: 'Name' }, { key: 'required', label: 'Required' }, { key: 'type', label: 'Type' }, { key: 'accepts', label: 'Accepts' }, { key: 'default', label: 'Default' }, { key: 'description', label: 'Description' }] as col (col.key)}
              <th
                class={cn(
                  densityPadding(),
                  'text-left font-medium text-muted-foreground',
                  col.key === 'name' && 'sticky left-0 z-[3] bg-muted/50',
                )}
              >
                {#if onsort}
                  <Tooltip.Provider>
                    <Tooltip.Root delayDuration={400}>
                      <Tooltip.Trigger>
                        {#snippet child({ props: sortTipProps })}
                          <button
                            {...sortTipProps}
                            type="button"
                            class="group/th inline-flex items-center gap-1 transition-colors hover:text-foreground"
                            onclick={() => handleColumnSort(col.key as PropsTableSortColumn)}
                          >
                            {col.label}
                            {#if sortColumn === col.key && sortDirection === 'asc'}
                              <ArrowUp class="size-3 text-primary" />
                            {:else if sortColumn === col.key && sortDirection === 'desc'}
                              <ArrowDown class="size-3 text-primary" />
                            {:else}
                              <ArrowUp class="size-3 opacity-0 group-hover/th:opacity-40" />
                            {/if}
                          </button>
                        {/snippet}
                      </Tooltip.Trigger>
                      <Tooltip.Content side="bottom" sideOffset={4} class="text-xs">
                        {sortTooltip(col.key)}
                      </Tooltip.Content>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                {:else}
                  {col.label}
                {/if}
              </th>
            {/each}
            <th
              class={cn(
                'w-10 px-2',
                densityPadding().replace('px-4', '').replace('px-3', '').trim(),
              )}><span class="sr-only">Actions</span></th
            >
          </tr>
        </thead>
        <tbody>
          {#each validated.props as prop (prop.name)}
            <tr
              id="prop-{prop.name}"
              class="group/row border-b last:border-b-0 transition-colors hover:bg-muted/40"
            >
              <td
                class={cn(
                  'group/name font-mono text-xs font-medium sticky left-0 z-[2] bg-background group-hover/row:bg-muted/40',
                  densityPadding(),
                )}
              >
                <span class="inline-flex items-center gap-1">
                  {#if hasTypeFields(prop)}
                    <button
                      type="button"
                      class="inline-flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground/60 transition-all hover:text-foreground"
                      onclick={() => toggleTypeFields(prop.name)}
                      aria-expanded={expandedTypeFields.has(prop.name)}
                      aria-label="Toggle {prop.name} type fields"
                    >
                      <ChevronRight
                        class="size-3 transition-transform duration-200 {expandedTypeFields.has(
                          prop.name,
                        )
                          ? 'rotate-90'
                          : ''}"
                        aria-hidden="true"
                      />
                    </button>
                    <button
                      type="button"
                      class={cn(
                        'cursor-pointer hover:text-foreground hover:underline',
                        isDeprecated(prop) && 'line-through opacity-60',
                      )}
                      onclick={() => toggleTypeFields(prop.name)}
                    >
                      {prop.name}{#if isRequired(prop)}<span class="text-red-500">*</span>{/if}
                    </button>
                  {:else}
                    <span class={cn(isDeprecated(prop) && 'line-through opacity-60')}>
                      {prop.name}{#if isRequired(prop)}<span class="text-red-500">*</span>{/if}
                    </span>
                  {/if}
                  <!-- Deep link copy button — visible on row hover -->
                  <Tooltip.Provider>
                    <Tooltip.Root delayDuration={300}>
                      <Tooltip.Trigger>
                        {#snippet child({ props: tipProps })}
                          <button
                            {...tipProps}
                            type="button"
                            class="invisible inline-flex size-4 items-center justify-center rounded text-muted-foreground/40 transition-colors hover:text-foreground group-hover/name:visible"
                            onclick={() => copyPropLink(prop.name)}
                            aria-label="Copy link to {prop.name}"
                          >
                            {#if copiedPropLink === prop.name}
                              <span in:fade={{ duration: 150 }}
                                ><Check class="size-3 text-green-500" /></span
                              >
                            {:else}
                              <Link class="size-3" />
                            {/if}
                          </button>
                        {/snippet}
                      </Tooltip.Trigger>
                      <Tooltip.Content side="top" sideOffset={4}
                        >Copy link to #{prop.name}</Tooltip.Content
                      >
                    </Tooltip.Root>
                  </Tooltip.Provider>
                </span>
                {#if prop.bindable}
                  <Tooltip.Provider>
                    <Tooltip.Root delayDuration={300}>
                      <Tooltip.Trigger>
                        {#snippet child({ props: triggerProps })}
                          <Badge
                            {...triggerProps}
                            variant="outline"
                            class="ml-1 cursor-help gap-0.5 rounded-md border-blue-200 bg-blue-50 py-0 text-[10px] text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                          >
                            bindable
                            <CircleHelp class="size-2.5" aria-hidden="true" />
                          </Badge>
                        {/snippet}
                      </Tooltip.Trigger>
                      <Tooltip.Content side="top" sideOffset={4}>
                        Supports two-way binding with bind:{prop.name}
                      </Tooltip.Content>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                {/if}
                {#if isDeprecated(prop)}
                  <Tooltip.Provider>
                    <Tooltip.Root delayDuration={300}>
                      <Tooltip.Trigger>
                        {#snippet child({ props: depProps })}
                          <Badge
                            {...depProps}
                            variant="outline"
                            class="ml-1 cursor-help gap-0.5 rounded-md border-amber-200 bg-amber-50 py-0 text-[10px] text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                          >
                            deprecated
                            <TriangleAlert class="size-2.5" aria-hidden="true" />
                          </Badge>
                        {/snippet}
                      </Tooltip.Trigger>
                      <Tooltip.Content side="top" sideOffset={4}>
                        This prop is deprecated and may be removed in a future version
                      </Tooltip.Content>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                {/if}
              </td>
              <td class={densityPadding()}>
                {@render requiredDot(isRequired(prop))}
              </td>
              <td class={cn(densityPadding(), 'font-mono text-xs text-muted-foreground')}>
                {@render typeCell(prop.type)}
              </td>
              <td class={cn('max-w-48 font-mono text-xs text-muted-foreground', densityPadding())}>
                {@render acceptsCell(getAccepts(prop))}
              </td>
              <td class={cn(densityPadding(), 'font-mono text-xs text-muted-foreground')}>
                {@render defaultCell(prop.default)}
              </td>
              <td class={cn('max-w-64 text-xs text-muted-foreground', densityPadding())}>
                {#if prop.description}
                  {@const desc = isDeprecated(prop)
                    ? cleanDeprecatedTag(prop.description)
                    : prop.description}
                  {#if desc.length > 80}
                    <Tooltip.Provider>
                      <Tooltip.Root delayDuration={300}>
                        <Tooltip.Trigger>
                          {#snippet child({ props: truncProps })}
                            <span {...truncProps} class="cursor-help">
                              {desc.slice(0, 80)}…
                            </span>
                          {/snippet}
                        </Tooltip.Trigger>
                        <Tooltip.Content side="top" sideOffset={4} class="max-w-sm text-xs">
                          {desc}
                        </Tooltip.Content>
                      </Tooltip.Root>
                    </Tooltip.Provider>
                  {:else}
                    {desc}
                  {/if}
                {:else}
                  <span class="text-muted-foreground/40">—</span>
                {/if}
              </td>
              <!-- Per-prop actions column -->
              <td
                class={cn(
                  'w-10 px-2',
                  densityPadding().replace('px-4', '').replace('px-3', '').trim(),
                )}
              >
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger>
                    {#snippet child({ props: triggerProps })}
                      <button
                        type="button"
                        class="inline-flex size-6 items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
                        {...triggerProps}
                      >
                        <EllipsisVertical class="size-3.5" />
                        <span class="sr-only">Prop actions</span>
                      </button>
                    {/snippet}
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="end" sideOffset={4} class="min-w-44">
                    <DropdownMenu.Item
                      onSelect={(e) => {
                        e.preventDefault();
                        copyWithFeedback(prop.name, `name-${prop.name}`);
                      }}
                    >
                      {#if copiedPropAction === `name-${prop.name}`}
                        <span in:fade={{ duration: 150 }}
                          ><Check class="size-4 text-green-500" /></span
                        >
                      {:else}
                        <Copy class="size-4" />
                      {/if}
                      Copy Name
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onSelect={(e) => {
                        e.preventDefault();
                        copyWithFeedback(prop.type || '—', `type-${prop.name}`);
                      }}
                    >
                      {#if copiedPropAction === `type-${prop.name}`}
                        <span in:fade={{ duration: 150 }}
                          ><Check class="size-4 text-green-500" /></span
                        >
                      {:else}
                        <Copy class="size-4" />
                      {/if}
                      Copy Type
                    </DropdownMenu.Item>
                    {#if prop.bindable}
                      <DropdownMenu.Item
                        onSelect={(e) => {
                          e.preventDefault();
                          copyWithFeedback(`bind:${prop.name}`, `bind-${prop.name}`);
                        }}
                      >
                        {#if copiedPropAction === `bind-${prop.name}`}
                          <span in:fade={{ duration: 150 }}
                            ><Check class="size-4 text-green-500" /></span
                          >
                        {:else}
                          <ClipboardCopy class="size-4" />
                        {/if}
                        Copy bind:{prop.name}
                      </DropdownMenu.Item>
                    {/if}
                    <DropdownMenu.Item
                      onSelect={(e) => {
                        e.preventDefault();
                        copyWithFeedback(JSON.stringify(prop, null, 2), `json-${prop.name}`);
                      }}
                    >
                      {#if copiedPropAction === `json-${prop.name}`}
                        <span in:fade={{ duration: 150 }}
                          ><Check class="size-4 text-green-500" /></span
                        >
                      {:else}
                        <ClipboardCopy class="size-4" />
                      {/if}
                      Copy as JSON
                    </DropdownMenu.Item>
                    {#if variantKeySet.has(prop.name)}
                      <DropdownMenu.Separator />
                      <DropdownMenu.Item onclick={() => scrollToVariant(prop.name)}>
                        <Layers class="size-4" />
                        See variants
                      </DropdownMenu.Item>
                    {/if}
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              </td>
            </tr>
            {#if hasTypeFields(prop) && expandedTypeFields.has(prop.name)}
              <tr class="border-b">
                <td colspan={colCount} class="p-0">
                  <div transition:slide={{ duration: 150 }} class="overflow-hidden">
                    <table class="w-full text-sm">
                      <colgroup>
                        {@render colGroupCols()}
                      </colgroup>
                      <tbody>
                        {#each prop.typeFields ?? [] as tf (tf.field)}
                          {@const nestedKey = `${prop.name}.${tf.field}`}
                          <tr
                            class="group/row border-b bg-muted/30 last:border-b-0 transition-colors hover:bg-muted/50"
                          >
                            <td
                              class={cn(
                                'pl-12 pr-4 font-mono text-xs text-muted-foreground sticky left-0 z-[2] bg-muted/30 group-hover/row:bg-muted/50',
                                nestedDensityPadding(),
                              )}
                            >
                              {#if hasNestedFields(tf)}
                                <span class="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    class="inline-flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground/60 transition-all hover:text-foreground"
                                    onclick={() => toggleTypeFields(nestedKey)}
                                    aria-expanded={expandedTypeFields.has(nestedKey)}
                                    aria-label="Toggle {tf.field} type fields"
                                  >
                                    <ChevronRight
                                      class="size-3 transition-transform duration-200 {expandedTypeFields.has(
                                        nestedKey,
                                      )
                                        ? 'rotate-90'
                                        : ''}"
                                      aria-hidden="true"
                                    />
                                  </button>
                                  <button
                                    type="button"
                                    class="cursor-pointer hover:text-foreground hover:underline"
                                    onclick={() => toggleTypeFields(nestedKey)}
                                  >
                                    {tf.field}
                                  </button>
                                </span>
                              {:else}
                                {tf.field}
                              {/if}
                            </td>
                            <td class={nestedDensityPadding()}>
                              {@render requiredDot(tf.required)}
                            </td>
                            <td
                              class={cn(
                                nestedDensityPadding(),
                                'font-mono text-xs text-muted-foreground',
                              )}
                            >
                              {@render typeCell(tf.type)}
                            </td>
                            <td
                              class={cn(
                                nestedDensityPadding(),
                                'font-mono text-xs text-muted-foreground',
                              )}
                            >
                              {@render acceptsCell(tf.accepts)}
                            </td>
                            <td
                              class={cn(
                                nestedDensityPadding(),
                                'font-mono text-xs text-muted-foreground',
                              )}
                            >
                              <span class="text-[10px] italic text-muted-foreground/30">none</span>
                            </td>
                            <td class={cn(nestedDensityPadding(), 'text-xs text-muted-foreground')}>
                              {#if tf.description}
                                {tf.description}
                              {:else}
                                <span class="text-muted-foreground/40">—</span>
                              {/if}
                            </td>
                            <td
                              class={cn(
                                'w-10 px-2',
                                nestedDensityPadding()
                                  .replace('px-4', '')
                                  .replace('px-3', '')
                                  .trim(),
                              )}
                            >
                              {#if variantKeySet.has(`${prop.name}.${tf.field}`)}
                                <DropdownMenu.Root>
                                  <DropdownMenu.Trigger>
                                    {#snippet child({ props: triggerProps })}
                                      <button
                                        type="button"
                                        class="inline-flex size-6 items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
                                        {...triggerProps}
                                      >
                                        <EllipsisVertical class="size-3.5" />
                                        <span class="sr-only">Field actions</span>
                                      </button>
                                    {/snippet}
                                  </DropdownMenu.Trigger>
                                  <DropdownMenu.Content align="end" sideOffset={4}>
                                    <DropdownMenu.Item
                                      onclick={() => scrollToVariant(`${prop.name}.${tf.field}`)}
                                    >
                                      <Layers class="size-4" />
                                      See variants
                                    </DropdownMenu.Item>
                                  </DropdownMenu.Content>
                                </DropdownMenu.Root>
                              {/if}
                            </td>
                          </tr>
                          {#if hasNestedFields(tf) && expandedTypeFields.has(nestedKey)}
                            {#each tf.typeFields ?? [] as ntf (ntf.field)}
                              <tr
                                class="group/row border-b bg-muted/20 last:border-b-0 transition-colors hover:bg-muted/40"
                              >
                                <td
                                  class={cn(
                                    'pl-20 pr-4 font-mono text-xs text-muted-foreground/80 sticky left-0 z-[2] bg-muted/20 group-hover/row:bg-muted/40',
                                    nestedDensityPadding(),
                                  )}
                                >
                                  {ntf.field}
                                </td>
                                <td class={nestedDensityPadding()}>
                                  {@render requiredDot(ntf.required)}
                                </td>
                                <td
                                  class={cn(
                                    nestedDensityPadding(),
                                    'font-mono text-xs text-muted-foreground',
                                  )}
                                >
                                  {@render typeCell(ntf.type)}
                                </td>
                                <td
                                  class={cn(
                                    nestedDensityPadding(),
                                    'font-mono text-xs text-muted-foreground',
                                  )}
                                >
                                  {@render acceptsCell(ntf.accepts)}
                                </td>
                                <td
                                  class={cn(
                                    nestedDensityPadding(),
                                    'font-mono text-xs text-muted-foreground',
                                  )}
                                >
                                  <span class="text-[10px] italic text-muted-foreground/30"
                                    >none</span
                                  >
                                </td>
                                <td
                                  class={cn(
                                    nestedDensityPadding(),
                                    'text-xs text-muted-foreground',
                                  )}
                                >
                                  {#if ntf.description}
                                    {ntf.description}
                                  {:else}
                                    <span class="text-muted-foreground/40">—</span>
                                  {/if}
                                </td>
                                <td
                                  class={cn(
                                    'w-10 px-2',
                                    nestedDensityPadding()
                                      .replace('px-4', '')
                                      .replace('px-3', '')
                                      .trim(),
                                  )}
                                ></td>
                              </tr>
                            {/each}
                          {/if}
                        {/each}
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
