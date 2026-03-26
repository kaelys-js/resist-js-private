# UI Components Reference

Comprehensive, deduplicated reference of UI components across 40+ component libraries. Each entry merges props, sub-components, and features from all libraries that include it.

---

## Accordion

Expandable content sections that show/hide content panels. Users click headers to toggle visibility of associated content areas.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `'single' \| 'multiple'` | `'single'` | Whether one or multiple items can be open |
| `value` | `string \| string[]` | — | Controlled open item(s) |
| `defaultValue` | `string \| string[]` | — | Initially open item(s) |
| `collapsible` | `boolean` | `false` | Whether all items can be closed |
| `disabled` | `boolean` | `false` | Disables the entire accordion |
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | Layout direction |
| `dir` | `'ltr' \| 'rtl'` | `'ltr'` | Text direction |
| `multiple` | `boolean` | `false` | Allow multiple expanded items (Flowbite, Skeleton, Ark UI) |
| `flush` | `boolean` | `false` | Remove borders/background (Flowbite) |
| `onValueChange` | `function` | — | Value change callback |
| `onFocusChange` | `function` | — | Focus change callback (Ark UI) |
| `lazyMount` | `boolean` | `false` | Defer content rendering until expanded (Ark UI) |
| `unmountOnExit` | `boolean` | `false` | Remove DOM nodes on collapse (Ark UI) |
| `isCompact` | `boolean` | `false` | Compact display mode (HeroUI) |
| `variant` | `'light' \| 'shadow' \| 'bordered' \| 'splitted'` | `'light'` | Visual style variant (HeroUI) |
| `showDivider` | `boolean` | `true` | Show dividers between items (HeroUI) |
| `keepContentMounted` | `boolean` | `false` | Keep content in DOM when collapsed for SEO (HeroUI) |
| `disableAnimation` | `boolean` | `false` | Disable expand/collapse animations (HeroUI) |
| `activeIndex` | `number \| number[]` | — | Controlled active tab(s) (PrimeReact/PrimeVue) |

### Sub-components

- **Accordion.Item** — Wraps a single collapsible section (`value: string`, `disabled: boolean`)
- **Accordion.Trigger** — The clickable header that toggles the item
- **Accordion.Content** — The collapsible content panel with enter/exit animations
- **Accordion.Header** — Wrapper for trigger with heading level support
- **Accordion.ItemIndicator** — Expand/collapse indicator icon (Ark UI)

### Features

- Keyboard navigation (Arrow keys, Home, End, Space/Enter)
- WAI-ARIA Accordion pattern compliance
- Animated expand/collapse transitions
- Nested accordions support
- Controlled and uncontrolled modes
- CSS custom variables for content width/height (Radix, Kobalte)
- Data attributes for styling (`data-state`, `data-disabled`)

### Available In

Radix UI, shadcn/ui, Bits UI, Melt UI, Ark UI, Park UI, Kobalte, Oku UI, Base UI, DaisyUI, Flowbite, Skeleton UI, Carbon Svelte, HeroUI, PrimeReact, PrimeVue, Fluent UI, SvelteUI, Svelte UX, AgnosticUI, Svelte Radix, Svelte Headless UI (as Disclosure), Preline, HyperUI, Tailwind Plus, Mantine, Ant Design, Chakra UI, Material UI

---

## Alert

Displays a short, important message that attracts the user's attention without interrupting their workflow.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'destructive' \| 'filled' \| 'outlined' \| 'soft'` | `'default'` | Visual style |
| `severity` | `'success' \| 'info' \| 'warning' \| 'error'` | — | Alert severity/intent |
| `color` | `string` | — | Theme color |
| `title` | `string \| ReactNode` | — | Alert title |
| `description` | `string \| ReactNode` | — | Alert description text |
| `icon` | `ReactNode` | — | Custom icon |
| `closable` | `boolean` | `false` | Whether the alert can be dismissed |
| `onClose` | `function` | — | Close callback |
| `border` | `boolean` | `false` | Show border (Flowbite) |
| `dismissable` | `boolean` | `false` | Can be dismissed (Flowbite) |

### Sub-components

- **Alert.Title** — The alert heading
- **Alert.Description** — The alert body text
- **Alert.Icon** — Icon slot

### Features

- `role="alert"` for screen reader announcements
- Multiple severity/color variants
- Closable/dismissable with transitions
- Icon support
- Grid layout with container queries (shadcn)

### Available In

shadcn/ui, DaisyUI, Flowbite, HeroUI, PrimeReact, PrimeVue (as Message), Fluent UI (as MessageBar), SvelteUI, AgnosticUI, Park UI, Carbon Svelte (as InlineNotification), Ant Design, Chakra UI, Mantine, Material UI, Preline, HyperUI, Tailwind Plus

---

## Alert Dialog

A modal dialog that interrupts the user with important content and expects a response. Cannot be dismissed by clicking outside.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | `false` | Dialog visibility |
| `defaultOpen` | `boolean` | — | Uncontrolled initial state |
| `onOpenChange` | `function` | — | State change callback |
| `modal` | `boolean` | `true` | Whether to block outside interaction |

### Sub-components

- **AlertDialog.Trigger** — Element that opens the dialog
- **AlertDialog.Portal** — Renders content in a portal
- **AlertDialog.Overlay** — Background overlay
- **AlertDialog.Content** — The dialog panel with focus trap
- **AlertDialog.Title** — Required accessible title
- **AlertDialog.Description** — Accessible description
- **AlertDialog.Action** — Confirm action button
- **AlertDialog.Cancel** — Cancel/dismiss button

### Features

- Focus trapping within the dialog
- Escape key to close
- Screen reader announcements via Title/Description
- Portal rendering
- Cannot be dismissed by clicking overlay (unlike Dialog)
- WAI-ARIA AlertDialog pattern

### Available In

Radix UI, shadcn/ui, Bits UI, Kobalte, Oku UI, Base UI, Svelte Radix, Ant Design (as Modal.confirm), Material UI (as Dialog with disableBackdropClick)

---

## Angle Slider

A circular slider for selecting angle values, typically 0-360 degrees.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | — | Current angle value |
| `defaultValue` | `number` | — | Initial angle value |
| `onValueChange` | `function` | — | Value change callback |
| `min` | `number` | `0` | Minimum angle |
| `max` | `number` | `360` | Maximum angle |
| `step` | `number` | `1` | Step increment |
| `disabled` | `boolean` | `false` | Disabled state |

### Sub-components

- **AngleSlider.Control** — The circular track container
- **AngleSlider.Track** — The circular track
- **AngleSlider.Thumb** — The draggable thumb
- **AngleSlider.Label** — Label text
- **AngleSlider.ValueText** — Current value display
- **AngleSlider.HiddenInput** — Hidden form input
- **AngleSlider.MarkerGroup** — Group of position markers
- **AngleSlider.Marker** — Individual position marker

### Features

- Circular/radial input for angle values
- Keyboard navigation
- Form integration via hidden input

### Available In

Ark UI, Park UI

---

## Aspect Ratio

Displays content within a desired ratio (e.g., 16:9, 4:3). Useful for responsive images and videos.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `ratio` | `number` | `1` | Desired aspect ratio (e.g., `16/9`) |

### Features

- Maintains consistent aspect ratio regardless of content
- Responsive sizing

### Available In

Radix UI, shadcn/ui, Bits UI, Svelte Radix, SvelteUI, Kobalte, AgnosticUI, Mantine, Chakra UI

---

## Autocomplete

A text input with a dropdown of filtered suggestions that updates as the user types.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | — | Input value |
| `inputValue` | `string` | — | Current input text |
| `items` | `Iterable<T>` | — | Suggestion items |
| `selectedKey` | `Key` | — | Selected item key |
| `defaultSelectedKey` | `Key` | — | Initial selected item |
| `suggestions` | `array` | — | Suggestion list (PrimeReact/PrimeVue) |
| `field` | `string` | — | Object property to display |
| `multiple` | `boolean` | `false` | Allow multiple selections |
| `dropdown` | `boolean` | `false` | Show dropdown trigger button |
| `forceSelection` | `boolean` | `false` | Require selection from suggestions |
| `minLength` | `number` | `1` | Minimum input length to trigger suggestions |
| `delay` | `number` | `300` | Debounce delay in ms |
| `completeMethod` | `function` | — | Search/filter function |
| `menuTrigger` | `'focus' \| 'input' \| 'manual'` | — | When to show suggestions (HeroUI) |
| `allowsCustomValue` | `boolean` | `false` | Allow values not in the list |
| `isClearable` | `boolean` | `true` | Show clear button |
| `variant` | `'flat' \| 'bordered' \| 'faded' \| 'underlined'` | — | Visual style (HeroUI) |
| `virtualScrollerOptions` | `object` | — | Virtual scrolling config |

### Sub-components

- **Autocomplete.Item** — Individual suggestion option
- **Autocomplete.Section** — Grouped section of suggestions

### Features

- Real-time filtering as user types
- Async/remote data loading
- Virtual scrolling for large lists
- Keyboard navigation
- Multiple selection mode
- Force selection from list
- Custom item templates

### Available In

HeroUI, PrimeReact, PrimeVue, Material UI, Ant Design, Mantine, Base UI

---

## Avatar

Displays a user's profile image with fallback to initials or an icon when the image is unavailable.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | — | Image source URL |
| `alt` | `string` | — | Image alt text |
| `name` | `string` | — | User name (for initials fallback) |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Avatar size |
| `shape` | `'circular' \| 'square' \| 'rounded'` | `'circular'` | Avatar shape |
| `color` | `string` | — | Background color |
| `icon` | `ReactNode` | — | Fallback icon |
| `isBordered` | `boolean` | `false` | Show border (HeroUI) |
| `showFallback` | `boolean` | `false` | Always show fallback (HeroUI) |
| `fallback` | `ReactNode` | — | Custom fallback content |
| `delayMs` | `number` | — | Delay before showing fallback (Radix) |
| `active` | `'active' \| 'inactive' \| 'unset'` | — | Active status indicator (Fluent UI) |

### Sub-components

- **Avatar.Image** — The profile image element
- **Avatar.Fallback** — Content shown when image fails to load
- **Avatar.Group** — Container for stacking multiple avatars with overflow count

### Features

- Automatic fallback to initials on load failure
- Configurable delay before showing fallback
- Online/offline status indicators
- Avatar groups with overflow count
- Image load state tracking

### Available In

Radix UI, shadcn/ui, Bits UI, Ark UI, Park UI, Skeleton UI, Svelte Radix, DaisyUI, Flowbite, HeroUI, Fluent UI, PrimeReact, PrimeVue, Kobalte, Oku UI, Base UI, AgnosticUI, SvelteUI (via ActionIcon), Svelte UX, Ant Design, Chakra UI, Mantine, Material UI, Preline, HyperUI, Tailwind Plus

---

## Badge

A small label used to display a status, count, or category. Often overlaid on other elements.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'secondary' \| 'destructive' \| 'outline' \| 'solid' \| 'flat' \| 'faded' \| 'shadow'` | `'default'` | Visual style |
| `color` | `string` | — | Theme color |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Badge size |
| `content` | `string \| number \| ReactNode` | — | Badge content |
| `placement` | `'top-right' \| 'top-left' \| 'bottom-right' \| 'bottom-left'` | `'top-right'` | Position relative to child (HeroUI) |
| `isDot` | `boolean` | `false` | Render as a dot indicator |
| `isInvisible` | `boolean` | `false` | Hide the badge |
| `showOutline` | `boolean` | `true` | Show border outline |
| `href` | `string` | — | Render as link when present (shadcn) |
| `rounded` | `boolean` | `false` | Fully rounded shape (PrimeReact/PrimeVue) |
| `severity` | `string` | — | Severity color (PrimeReact/PrimeVue) |

### Features

- Multiple color and style variants
- Dot/indicator mode
- Counter badge for notification counts
- Presence badge for status indicators (Fluent UI)
- Can wrap other elements as overlay

### Available In

shadcn/ui, DaisyUI, Flowbite, Skeleton UI, HeroUI, Fluent UI, PrimeReact, PrimeVue, Park UI, Kobalte, SvelteUI, Svelte UX, AgnosticUI, Ant Design, Chakra UI, Mantine, Material UI, Preline, HyperUI, Tailwind Plus

---

## Banner

A prominent message bar displayed at the top or bottom of the page for announcements or promotions.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `'top' \| 'bottom'` | `'top'` | Position |
| `open` | `boolean` | `true` | Visibility |
| `dismissable` | `boolean` | `true` | Can be dismissed |
| `onClose` | `function` | — | Close callback |

### Features

- Sticky positioning at top/bottom of viewport
- Dismissable with close button
- Transition animations

### Available In

Flowbite, Preline, Kibo UI, HyperUI, Tailwind Plus

---

## Bento Grid

A layout component that arranges content in an asymmetric grid inspired by Japanese bento boxes.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | — | Custom CSS classes |
| `children` | `ReactNode` | — | Grid items |

### Sub-components

- **BentoGrid.Item** — Individual grid cell with `title`, `description`, `header`, `icon`, `className`

### Features

- Asymmetric grid layout with varying cell sizes
- Responsive columns
- Card-style items with headers and descriptions

### Available In

Aceternity UI, Magic UI, Tailwind Plus

---

## Block UI

An overlay that blocks user interaction with a section or the entire page during loading or processing.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `blocked` | `boolean` | `false` | Whether interaction is blocked |
| `fullScreen` | `boolean` | `false` | Block entire page |
| `template` | `ReactNode` | — | Custom overlay content |

### Features

- Block interaction on element or entire page
- Custom overlay content/template
- Auto z-index management

### Available In

PrimeReact, PrimeVue

---

## Blockquote

A styled quotation block for displaying cited text with optional attribution.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `cite` | `string` | — | Citation source |
| `icon` | `ReactNode` | — | Custom quote icon |
| `color` | `string` | — | Theme color |

### Features

- Semantic `<blockquote>` element
- Optional citation/source display
- Icon customization

### Available In

Flowbite, SvelteUI, Mantine, Chakra UI

---

## Bottom Navigation

A fixed navigation bar at the bottom of the screen, commonly used in mobile interfaces.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `position` | `string` | `'fixed'` | CSS position |
| `navType` | `'default' \| 'border' \| 'application' \| 'pagination' \| 'group' \| 'card'` | `'default'` | Navigation style |
| `activeUrl` | `string` | — | Currently active URL |

### Sub-components

- **BottomNav.Item** — Individual navigation item with icon and label

### Features

- Fixed bottom positioning
- Multiple layout variants
- Active state tracking
- Icon and label display

### Available In

Flowbite, DaisyUI (as Dock), Material UI (as BottomNavigation)

---

## Bottom Sheet

A panel that slides up from the bottom of the screen, commonly used on mobile for contextual content.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | `false` | Whether the sheet is open |
| `defaultOpen` | `boolean` | — | Initial open state |
| `onOpenChange` | `function` | — | Open state callback |
| `snapPoints` | `number[]` | — | Snap positions |
| `modal` | `boolean` | `true` | Modal behavior |

### Sub-components

- **BottomSheet.Trigger** — Element that opens the sheet
- **BottomSheet.Backdrop** — Background overlay
- **BottomSheet.Content** — The sheet panel
- **BottomSheet.Handle** — Drag handle
- **BottomSheet.Title** — Accessible title
- **BottomSheet.Description** — Accessible description

### Features

- Snap points for multiple heights
- Drag to dismiss
- Swipe gestures
- Background overlay

### Available In

Ark UI, Park UI

---

## Breadcrumb

A navigation aid showing the user's current location within a site hierarchy with links to parent pages.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `separator` | `ReactNode` | `'/'` | Separator between items |
| `maxItems` | `number` | — | Max items before collapsing |
| `itemsBeforeCollapse` | `number` | `1` | Items shown before ellipsis |
| `itemsAfterCollapse` | `number` | `2` | Items shown after ellipsis |

### Sub-components

- **Breadcrumb.List** — The ordered list container
- **Breadcrumb.Item** — Individual breadcrumb entry
- **Breadcrumb.Link** — Clickable navigation link
- **Breadcrumb.Page** — Current page (non-clickable, `aria-current="page"`)
- **Breadcrumb.Separator** — Visual separator between items
- **Breadcrumb.Ellipsis** — Collapsed items indicator

### Features

- Accessible ARIA navigation landmark
- Auto-collapse with ellipsis for long paths
- Custom separator icons
- `aria-current="page"` on current item
- Responsive collapse patterns

### Available In

shadcn/ui, DaisyUI, Flowbite, Fluent UI, HeroUI, PrimeReact, PrimeVue, Park UI, Kobalte, SvelteUI, Svelte UX, AgnosticUI, Carbon Svelte, Preline, HyperUI, Tailwind Plus, Ant Design, Chakra UI, Mantine, Material UI

---

## Button

An interactive element that triggers an action when clicked.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'destructive' \| 'outline' \| 'secondary' \| 'ghost' \| 'link' \| 'solid' \| 'bordered' \| 'light' \| 'flat' \| 'faded' \| 'shadow'` | `'default'` | Visual style |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| 'icon'` | `'md'` | Button size |
| `color` | `string` | — | Theme color |
| `disabled` | `boolean` | `false` | Disabled state |
| `loading` | `boolean` | `false` | Loading state with spinner |
| `href` | `string` | — | Renders as `<a>` when present |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | HTML button type |
| `fullWidth` | `boolean` | `false` | Takes full container width |
| `isIconOnly` | `boolean` | `false` | Icon-only mode (HeroUI) |
| `startContent` | `ReactNode` | — | Content before label (HeroUI) |
| `endContent` | `ReactNode` | — | Content after label (HeroUI) |
| `spinner` | `ReactNode` | — | Custom loading spinner (HeroUI) |
| `spinnerPlacement` | `'start' \| 'end'` | `'start'` | Spinner position (HeroUI) |
| `disableRipple` | `boolean` | `false` | Disable click ripple effect (HeroUI) |
| `icon` | `string \| ReactNode` | — | Button icon (PrimeReact/PrimeVue) |
| `iconPos` | `'left' \| 'right' \| 'top' \| 'bottom'` | `'left'` | Icon position (PrimeReact/PrimeVue) |
| `severity` | `string` | — | Color severity (PrimeReact/PrimeVue) |
| `rounded` | `boolean` | `false` | Fully rounded (PrimeReact/PrimeVue) |
| `raised` | `boolean` | `false` | Raised shadow (PrimeReact/PrimeVue) |
| `outlined` | `boolean` | `false` | Outline style (PrimeReact/PrimeVue) |
| `text` | `boolean` | `false` | Text-only style (PrimeReact/PrimeVue) |
| `appearance` | `string` | — | Visual appearance (Fluent UI) |
| `shape` | `'rounded' \| 'circular' \| 'square'` | `'rounded'` | Button shape (Fluent UI) |

### Sub-components

- **Button.Group** — Groups buttons together with shared styling
- **CompoundButton** — Button with secondary text line (Fluent UI)
- **SplitButton** — Primary action + dropdown menu (Fluent UI, PrimeReact/PrimeVue)
- **MenuButton** — Button that opens a menu (Fluent UI)

### Features

- Multiple visual variants and sizes
- Loading state with configurable spinner
- Icon support (before, after, icon-only)
- Polymorphic rendering (button or anchor)
- Ripple click effect
- Built-in badge support (PrimeReact/PrimeVue)
- Press events (onPress, onPressStart, onPressEnd)
- Button groups with shared borders/radius

### Available In

shadcn/ui, Bits UI, DaisyUI, Flowbite, Skeleton UI, HeroUI, Fluent UI, PrimeReact, PrimeVue, Park UI, Kobalte, SvelteUI, Svelte UX, AgnosticUI, Carbon Svelte, Ant Design, Chakra UI, Mantine, Material UI, Preline, HyperUI, Tailwind Plus


---

## Calendar

A date selection component displaying a month grid with navigation controls.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `DateValue \| Date` | — | Selected date(s) |
| `defaultValue` | `DateValue \| Date` | — | Initial selected date(s) |
| `type` | `'single' \| 'range' \| 'multiple'` | `'single'` | Selection mode |
| `numberOfMonths` | `number` | `1` | Months displayed simultaneously |
| `locale` | `string` | — | Localization locale |
| `minValue` | `DateValue` | — | Minimum selectable date |
| `maxValue` | `DateValue` | — | Maximum selectable date |
| `weekdayFormat` | `'narrow' \| 'short' \| 'long'` | — | Day header format |
| `weekStartsOn` | `number` | — | First day of week (0=Sunday) |
| `fixedWeeks` | `boolean` | — | Always show 6 weeks |
| `isDateUnavailable` | `function` | — | Function to mark dates unavailable |
| `isDateDisabled` | `function` | — | Function to disable specific dates |
| `captionLayout` | `'dropdown' \| 'buttons'` | — | Month/year navigation style |
| `selectionMode` | `'single' \| 'multiple' \| 'range'` | `'single'` | Selection mode (PrimeReact/PrimeVue) |
| `inline` | `boolean` | `false` | Render inline without popover |
| `showTime` | `boolean` | `false` | Include time picker (PrimeReact/PrimeVue) |
| `showWeek` | `boolean` | `false` | Show week numbers |
| `showMonthAndYearPickers` | `boolean` | — | Month/year dropdown pickers (HeroUI) |
| `visibleMonths` | `number` | `1` | Number of visible months (HeroUI) |
| `view` | `'date' \| 'month' \| 'year'` | `'date'` | Calendar view level (PrimeReact/PrimeVue) |
| `touchUI` | `boolean` | `false` | Touch-optimized mode (PrimeReact/PrimeVue) |

### Sub-components

- **Calendar.Header** — Month/year navigation bar
- **Calendar.Grid** — The day grid
- **Calendar.GridHead** — Weekday headers
- **Calendar.GridBody** — Day cells container
- **Calendar.Cell** — Individual day cell
- **Calendar.Day** — Day number within cell
- **Calendar.PrevButton** — Previous month navigation
- **Calendar.NextButton** — Next month navigation
- **Calendar.MonthSelect** — Month dropdown selector
- **Calendar.YearSelect** — Year dropdown selector

### Features

- Single, multiple, and range date selection
- Multi-month display
- Internationalization via `@internationalized/date`
- Keyboard navigation (Arrow keys, Page Up/Down for months)
- Month/year dropdown navigation
- Custom date availability/disability filters
- Week number display
- Time picker integration

### Available In

shadcn/ui, Bits UI, Melt UI, Ark UI, Park UI, Skeleton UI, HeroUI, PrimeReact, PrimeVue, DaisyUI, Flowbite, Svelte UX, Preline, Tailwind Plus, Ant Design, Mantine, Material UI, Kibo UI

---

## Card

A container component for grouping related content and actions.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'outline' \| 'filled' \| 'elevated'` | — | Visual style |
| `href` | `string` | — | Makes card a clickable link |
| `horizontal` | `boolean` | `false` | Horizontal layout |
| `shadow` | `'none' \| 'sm' \| 'md' \| 'lg'` | `'md'` | Shadow level (HeroUI) |
| `isHoverable` | `boolean` | `false` | Hover effect (HeroUI) |
| `isPressable` | `boolean` | `false` | Click/press interaction (HeroUI) |
| `isBlurred` | `boolean` | `false` | Blurred background effect (HeroUI) |
| `appearance` | `string` | — | Visual appearance (Fluent UI) |
| `orientation` | `'horizontal' \| 'vertical'` | `'vertical'` | Layout direction (Fluent UI) |
| `selectable` | `boolean` | `false` | Can be selected (Fluent UI) |

### Sub-components

- **Card.Header** — Top section with title and description
- **Card.Title** — Card heading
- **Card.Description** — Card subheading/description
- **Card.Content** — Main content area
- **Card.Footer** — Bottom section for actions
- **Card.Action** — Action button slot
- **Card.Preview** — Image/media preview area (Fluent UI)

### Features

- Composable layout with header/content/footer
- Clickable/pressable card variants
- Hover effects
- Shadow and blur variants
- Grid-based responsive layout
- Container queries for responsive header (shadcn)
- Image overlay modes (DaisyUI)

### Available In

shadcn/ui, DaisyUI, Flowbite, Skeleton UI, HeroUI, Fluent UI, PrimeReact, PrimeVue, Park UI, SvelteUI, Svelte UX, AgnosticUI, Ant Design, Chakra UI, Mantine, Material UI, Preline, HyperUI, Tailwind Plus

---

## Carousel

A slideshow component for cycling through content items with navigation controls.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Scroll direction |
| `loop` | `boolean` | `false` | Infinite loop |
| `autoplay` | `boolean \| { delay: number }` | `false` | Auto-advance slides |
| `slidesPerView` | `number` | `1` | Visible slides |
| `slidesPerMove` | `number \| 'auto'` | — | Slides to advance |
| `spacing` | `string` | `'0px'` | Gap between slides |
| `index` | `number` | — | Controlled current slide |
| `onIndexChange` | `function` | — | Slide change callback |
| `opts` | `object` | — | Embla Carousel options (shadcn) |
| `plugins` | `array` | — | Embla plugins (shadcn) |
| `circular` | `boolean` | `false` | Circular navigation (Fluent UI, PrimeReact) |
| `autoplayInterval` | `number` | — | Autoplay interval in ms |
| `allowMouseDrag` | `boolean` | `false` | Mouse drag support (Skeleton) |
| `numVisible` | `number` | `1` | Visible items (PrimeReact/PrimeVue) |
| `numScroll` | `number` | `1` | Items to scroll (PrimeReact/PrimeVue) |
| `responsiveOptions` | `array` | — | Breakpoint configurations (PrimeReact/PrimeVue) |

### Sub-components

- **Carousel.Content** — Slides container
- **Carousel.Item** — Individual slide
- **Carousel.Previous** — Previous slide button
- **Carousel.Next** — Next slide button
- **Carousel.Indicator** — Dot/page indicators
- **Carousel.IndicatorGroup** — Indicator container
- **Carousel.AutoplayTrigger** — Play/pause toggle (Skeleton, Ark UI)

### Features

- Horizontal and vertical scrolling
- Infinite loop mode
- Autoplay with play/pause
- Mouse drag and touch/swipe support
- Responsive breakpoints
- Multiple visible slides
- Keyboard navigation
- `aria-roledescription="slide"` on items
- Plugin system (Embla-based)

### Available In

shadcn/ui, DaisyUI, Flowbite, Skeleton UI, HeroUI (via Image Gallery), Fluent UI, PrimeReact, PrimeVue, Ark UI, Park UI, Aceternity UI, Preline, Tailwind Plus, Ant Design, Mantine, Material UI

---

## Cascade Select

A multi-level dropdown for selecting values from hierarchical data structures.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `any` | — | Selected value |
| `options` | `array` | — | Hierarchical options |
| `optionLabel` | `string` | — | Property for display text |
| `optionValue` | `string` | — | Property for value |
| `optionGroupLabel` | `string` | — | Property for group label |
| `optionGroupChildren` | `string[]` | — | Property for child options |
| `placeholder` | `string` | — | Placeholder text |
| `disabled` | `boolean` | `false` | Disabled state |

### Features

- Nested option panels that cascade horizontally
- Mobile-friendly breakpoint
- Loading states

### Available In

PrimeReact, PrimeVue, Ant Design (as Cascader)

---

## Chart

Wrapper components for data visualization libraries providing themed, consistent chart rendering.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `'bar' \| 'line' \| 'pie' \| 'doughnut' \| 'radar' \| 'scatter' \| 'bubble' \| 'polarArea'` | — | Chart type |
| `data` | `object` | — | Chart data configuration |
| `options` | `object` | — | Chart options |
| `config` | `ChartConfig` | — | Chart configuration (shadcn) |
| `width` | `string` | — | Chart width |
| `height` | `string` | — | Chart height |

### Sub-components

- **Chart.Container** — Themed wrapper with CSS variable theming
- **Chart.Tooltip** — Custom tooltip with indicators

### Features

- CSS variable theming (--chart-1 through --chart-5)
- Light/dark mode support
- Custom tooltip formatting
- Responsive sizing
- Multiple chart type support

### Available In

shadcn/ui (LayerChart), PrimeReact (Chart.js), PrimeVue (Chart.js), Flowbite (ApexCharts), Ant Design, Mantine, Material UI, Recharts, Tremor

---

## Chat Bubble

A message bubble component for displaying chat/messaging interfaces.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `alignment` | `'start' \| 'end'` | — | Left or right alignment |
| `color` | `string` | — | Bubble color |

### Sub-components

- **Chat.Image** — User avatar
- **Chat.Header** — Sender name and metadata
- **Chat.Bubble** — Message content container
- **Chat.Footer** — Timestamp and status

### Features

- Left/right alignment for sent/received messages
- Color variants for different senders
- Avatar, timestamp, and delivery status display

### Available In

DaisyUI, Flowbite, Preline

---

## Checkbox

A control that allows the user to toggle between checked and unchecked states, with optional indeterminate state.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `checked` | `boolean \| 'indeterminate'` | `false` | Check state |
| `defaultChecked` | `boolean` | — | Initial checked state |
| `onCheckedChange` | `function` | — | State change callback |
| `disabled` | `boolean` | `false` | Disabled state |
| `required` | `boolean` | `false` | Required for form submission |
| `name` | `string` | — | Form field name |
| `value` | `string` | `'on'` | Form submission value |
| `indeterminate` | `boolean` | `false` | Indeterminate/mixed state |
| `invalid` | `boolean` | `false` | Invalid/error state (Ark UI) |
| `color` | `string` | — | Theme color |
| `size` | `string` | — | Checkbox size |
| `lineThrough` | `boolean` | `false` | Strike-through text when checked (HeroUI) |
| `icon` | `ReactNode` | — | Custom check icon (HeroUI) |

### Sub-components

- **Checkbox.Indicator** — The check mark indicator
- **Checkbox.Label** — Associated label text
- **Checkbox.Control** — The visual checkbox element (Ark UI)
- **Checkbox.HiddenInput** — Hidden native input for form integration
- **Checkbox.Group** — Groups multiple checkboxes with shared state

### Features

- Tri-state support (checked/unchecked/indeterminate)
- WAI-ARIA checkbox pattern
- Space key toggle
- Form integration via hidden input
- Custom check icons
- Group management with select-all

### Available In

Radix UI, shadcn/ui, Bits UI, Melt UI, Ark UI, Park UI, Skeleton UI, Svelte Radix, DaisyUI, Flowbite, HeroUI, Fluent UI, PrimeReact, PrimeVue, Kobalte, Oku UI, Base UI, SvelteUI, Svelte UX, AgnosticUI, Carbon Svelte, Ant Design, Chakra UI, Mantine, Material UI, Preline, HyperUI, Tailwind Plus

---

## Chip

A compact element representing an input, attribute, or action. Similar to a tag but often with interaction capabilities.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | — | Chip text |
| `variant` | `'solid' \| 'bordered' \| 'light' \| 'flat' \| 'faded' \| 'shadow' \| 'dot'` | — | Visual style |
| `color` | `string` | — | Theme color |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Chip size |
| `removable` | `boolean` | `false` | Can be removed/closed |
| `onClose` | `function` | — | Remove callback |
| `avatar` | `ReactNode` | — | Avatar content |
| `startContent` | `ReactNode` | — | Content before label |
| `endContent` | `ReactNode` | — | Content after label |
| `icon` | `string \| ReactNode` | — | Icon |
| `image` | `string` | — | Image source |

### Features

- Removable/closeable
- Icon, avatar, and image support
- Dot variant for status indication
- Multiple visual styles

### Available In

HeroUI, Skeleton UI (as Chips), PrimeReact, PrimeVue, Fluent UI (as Tag), Material UI, Ant Design (as Tag), Chakra UI (as Tag), Mantine (as Chip)

---

## Clipboard

A utility component for copying text to the clipboard with visual feedback.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | — | Text to copy |
| `timeout` | `number` | `2000` | Reset delay after copy (ms) |
| `onStatusChange` | `function` | — | Copy status callback |

### Sub-components

- **Clipboard.Control** — Container for input and trigger
- **Clipboard.Input** — Displays the value to copy
- **Clipboard.Trigger** — Copy button
- **Clipboard.Indicator** — Success/idle indicator
- **Clipboard.Label** — Label text

### Features

- One-click copy to clipboard
- Visual success feedback with timeout
- Customizable trigger and indicator

### Available In

Ark UI, Park UI, Flowbite, Kibo UI, Preline

---

## Code / Code Block

Displays formatted code with optional syntax highlighting, line numbers, and copy functionality.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `code` | `string` | — | Code content |
| `language` | `string` | — | Programming language for highlighting |
| `filename` | `string` | — | File name display |
| `showLineNumbers` | `boolean` | `false` | Display line numbers |
| `color` | `string` | — | Theme color (HeroUI) |
| `size` | `string` | — | Text size (HeroUI) |

### Features

- Syntax highlighting
- Line numbers
- Copy to clipboard button
- File name header
- Multi-line and inline code modes

### Available In

HeroUI (as Code), SvelteUI, Svelte UX, Carbon Svelte (as CodeSnippet), Aceternity UI, Kibo UI, Ant Design, Mantine

---

## Collapsible

A component that can be expanded or collapsed to show/hide content. Simpler than Accordion for single-item use.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | `false` | Expanded state |
| `defaultOpen` | `boolean` | — | Initial expanded state |
| `onOpenChange` | `function` | — | State change callback |
| `disabled` | `boolean` | `false` | Disabled state |
| `collapsedHeight` | `string \| number` | — | Height when collapsed (Skeleton) |
| `collapsedWidth` | `string \| number` | — | Width when collapsed (Skeleton) |

### Sub-components

- **Collapsible.Trigger** — The toggle button
- **Collapsible.Content** — The collapsible content panel
- **Collapsible.Indicator** — Expand/collapse visual indicator (Skeleton)

### Features

- WAI-ARIA disclosure pattern
- Space/Enter toggle
- Animated expand/collapse
- CSS variables for content dimensions
- Partial collapse (custom collapsed height)

### Available In

Radix UI, shadcn/ui, Bits UI, Melt UI, Ark UI, Park UI, Skeleton UI, Svelte Radix, Kobalte, Base UI, AgnosticUI, SvelteUI (as Collapse), Svelte UX (as Collapse), Preline (as Collapse), Ant Design, Chakra UI, Mantine

---

## Color Picker

An interactive component for selecting colors using various formats and input methods.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string \| Color` | — | Current color value |
| `defaultValue` | `string \| Color` | — | Initial color |
| `format` | `'hex' \| 'rgb' \| 'rgba' \| 'hsl' \| 'hsla' \| 'hsb'` | `'hex'` | Color format |
| `onValueChange` | `function` | — | Value change callback |
| `onValueChangeEnd` | `function` | — | Drag end callback |
| `inline` | `boolean` | `false` | Render without popover |
| `disabled` | `boolean` | `false` | Disabled state |
| `closeOnSelect` | `boolean` | `false` | Close on swatch selection |

### Sub-components

- **ColorPicker.Area** — 2D saturation/brightness picker
- **ColorPicker.AreaThumb** — Area picker thumb
- **ColorPicker.ChannelSlider** — Individual channel slider (hue, saturation, etc.)
- **ColorPicker.ChannelInput** — Numeric channel input
- **ColorPicker.Swatch** — Color preset button
- **ColorPicker.SwatchGroup** — Preset color grid
- **ColorPicker.EyeDropperTrigger** — Screen color picker
- **ColorPicker.TransparencyGrid** — Alpha transparency grid
- **ColorPicker.FormatSelect** — Format switcher

### Features

- Multiple color formats (hex, RGB, HSL, HSB)
- 2D area picker with channel sliders
- Preset color swatches
- Eye dropper (native browser API)
- Transparency/alpha channel support
- Inline and popover modes
- Form integration

### Available In

Ark UI, Park UI, Kobalte, PrimeReact, PrimeVue, Preline, Ant Design, Mantine, Kibo UI

---

## Combobox

A searchable dropdown that combines a text input with a filterable option list.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string \| string[]` | — | Selected value(s) |
| `defaultValue` | `string \| string[]` | — | Initial selected value(s) |
| `inputValue` | `string` | — | Current search text |
| `onValueChange` | `function` | — | Selection change callback |
| `onInputValueChange` | `function` | — | Search text change callback |
| `collection` | `ListCollection<T>` | — | Item collection (Ark UI) |
| `multiple` | `boolean` | `false` | Allow multiple selections |
| `allowCustomValue` | `boolean` | `false` | Allow typing custom values |
| `openOnClick` | `boolean` | `false` | Open dropdown on input click |
| `openOnChange` | `boolean` | `true` | Open dropdown on input change |
| `inputBehavior` | `'none' \| 'autohighlight' \| 'autocomplete'` | `'none'` | Auto-completion mode |
| `selectionBehavior` | `'clear' \| 'replace' \| 'preserve'` | `'replace'` | Input behavior after selection |
| `closeOnSelect` | `boolean` | — | Close after selecting |
| `loopFocus` | `boolean` | `true` | Loop keyboard navigation |
| `disabled` | `boolean` | `false` | Disabled state |
| `placeholder` | `string` | — | Placeholder text |
| `filterFunction` | `function` | — | Custom filter function (Melt UI) |

### Sub-components

- **Combobox.Input** — Search text input
- **Combobox.Trigger** — Dropdown toggle button
- **Combobox.Content** — Dropdown panel
- **Combobox.Item** — Individual option
- **Combobox.ItemGroup** — Grouped options
- **Combobox.ItemGroupLabel** — Group heading
- **Combobox.ItemText** — Option text
- **Combobox.ItemIndicator** — Selection indicator
- **Combobox.ClearTrigger** — Clear selection button
- **Combobox.Empty** — Empty state display

### Features

- Real-time filtering
- Multi-select with tags
- Custom value creation
- Keyboard navigation
- Virtual scrolling for large lists
- Grouped options
- Form integration
- Responsive drawer variant for mobile (shadcn)

### Available In

shadcn/ui, Bits UI, Melt UI, Ark UI, Park UI, Skeleton UI, Fluent UI, Kobalte, Base UI, Carbon Svelte, AgnosticUI, Preline, Tailwind Plus, Ant Design, Mantine, Material UI, Kibo UI


---

## Command

A command palette / spotlight search for searching and executing actions via keyboard.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | `''` | Search input value |
| `open` | `boolean` | — | Dialog visibility (when used as dialog) |
| `title` | `string` | `'Command Palette'` | Dialog title |

### Sub-components

- **Command.Input** — Search text input
- **Command.List** — Results container
- **Command.Group** — Grouped results section
- **Command.GroupHeading** — Group heading label
- **Command.Item** — Individual command/action item
- **Command.Empty** — Empty state when no results
- **Command.Separator** — Visual separator between groups
- **Command.Shortcut** — Keyboard shortcut display
- **Command.Dialog** — Dialog wrapper with modal behavior
- **Command.LinkItem** — Item that navigates to a URL

### Features

- Searchable command palette
- Keyboard navigation (Arrow keys, Enter to select)
- Modal dialog mode with keyboard shortcut activation
- Grouped commands with separators
- Keyboard shortcut display
- Empty state handling
- Icon support with auto-styling

### Available In

shadcn/ui, Bits UI, Flowbite (as CommandPalette), Tailwind Plus, Kibo UI

---

## Confirm Dialog

A specialized dialog for confirming or canceling an action, with accept/reject buttons.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `visible` | `boolean` | `false` | Dialog visibility |
| `message` | `string \| ReactNode` | — | Confirmation message |
| `header` | `string` | — | Dialog header text |
| `icon` | `string` | — | Icon class/component |
| `acceptLabel` | `string` | `'Yes'` | Accept button text |
| `rejectLabel` | `string` | `'No'` | Reject button text |
| `accept` | `function` | — | Accept callback |
| `reject` | `function` | — | Reject callback |
| `draggable` | `boolean` | `true` | Can be dragged |
| `closable` | `boolean` | `true` | Can be closed |
| `position` | `string` | — | Dialog position |

### Features

- Declarative and programmatic API
- Draggable dialog
- Customizable accept/reject buttons
- Also available as ConfirmPopup (attached to target element)

### Available In

PrimeReact, PrimeVue, Ant Design (as Modal.confirm), Material UI (as Dialog)

---

## Context Menu

A right-click menu that appears at the cursor position with contextual actions.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | — | Controlled open state |
| `onOpenChange` | `function` | — | Open state callback |
| `loop` | `boolean` | `false` | Loop keyboard focus |
| `dir` | `'ltr' \| 'rtl'` | — | Reading direction |

### Sub-components

- **ContextMenu.Trigger** — Right-click target area
- **ContextMenu.Portal** — Portal container
- **ContextMenu.Content** — Menu panel with positioning
- **ContextMenu.Item** — Individual menu action
- **ContextMenu.CheckboxItem** — Toggleable menu item
- **ContextMenu.RadioGroup** — Radio selection group
- **ContextMenu.RadioItem** — Radio selection item
- **ContextMenu.Sub** — Nested submenu container
- **ContextMenu.SubTrigger** — Submenu trigger item
- **ContextMenu.SubContent** — Submenu panel
- **ContextMenu.Separator** — Visual divider
- **ContextMenu.Group** — Logical item grouping
- **ContextMenu.GroupHeading** — Group label
- **ContextMenu.Shortcut** — Keyboard shortcut display (shadcn)

### Features

- Right-click activation
- Nested submenus (unlimited depth)
- Checkbox and radio items
- Typeahead search
- Full keyboard navigation (Arrow keys, Enter, Escape)
- WAI-ARIA Menu pattern
- Collision-aware positioning
- Portal rendering

### Available In

Radix UI, shadcn/ui, Bits UI, Melt UI, Ark UI, Park UI, Kobalte, Oku UI, Base UI, Carbon Svelte, PrimeReact, PrimeVue, Ant Design

---

## Countdown

An animated countdown display showing remaining time or cycling through numbers.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | — | Current countdown value (0-999) |
| `digits` | `number` | — | Minimum digits to display |

### Features

- CSS-variable-driven animation (`--value`)
- Supports days, hours, minutes, seconds segments
- No JavaScript required (pure CSS)

### Available In

DaisyUI

---

## Data Table

A feature-rich table component for displaying, sorting, filtering, and interacting with tabular data.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `TData[]` | — | Table data array |
| `columns` | `ColumnDef[]` | — | Column definitions |
| `value` | `array` | — | Data array (PrimeReact/PrimeVue) |
| `sortField` | `string` | — | Active sort column |
| `sortOrder` | `number` | — | Sort direction (1/-1) |
| `paginator` | `boolean` | `false` | Enable pagination |
| `rows` | `number` | — | Rows per page |
| `selectionMode` | `'single' \| 'multiple' \| 'checkbox' \| 'radio'` | — | Row selection mode |
| `selection` | `any` | — | Selected rows |
| `filters` | `object` | — | Column filter values |
| `globalFilter` | `string` | — | Global search text |
| `scrollable` | `boolean` | `false` | Enable scrolling |
| `virtualScrollerOptions` | `object` | — | Virtual scrolling config |
| `resizableColumns` | `boolean` | `false` | Column resize |
| `reorderableColumns` | `boolean` | `false` | Column reorder |
| `rowGroupMode` | `string` | — | Row grouping mode |
| `expandedRows` | `any` | — | Expanded row data |
| `editMode` | `'cell' \| 'row'` | — | Inline editing mode |
| `lazy` | `boolean` | `false` | Server-side data handling |
| `loading` | `boolean` | `false` | Loading state |
| `stripedRows` | `boolean` | `false` | Alternating row colors |
| `showGridlines` | `boolean` | `false` | Show cell borders |
| `stateKey` | `string` | — | State persistence key |
| `stateStorage` | `'session' \| 'local'` | — | State storage method |

### Sub-components

- **DataTable.Header** — Header row container
- **DataTable.Body** — Body rows container
- **DataTable.Row** — Individual row
- **DataTable.Cell** — Individual cell
- **DataTable.Column** — Column definition (PrimeReact/PrimeVue)
- **DataTable.ColumnGroup** — Grouped column headers
- **DataTable.Footer** — Footer row
- **DataTable.Caption** — Table caption

### Features

- Sorting (single and multi-column)
- Filtering (column-level and global)
- Pagination
- Row selection (single, multiple, checkbox, radio)
- Row expansion with detail view
- Cell and row inline editing
- Column resize, reorder, and visibility toggling
- Row grouping and sub-headers
- Frozen columns and rows
- Virtual scrolling for large datasets
- CSV/Excel export
- State persistence (local/session storage)
- Context menu integration
- Drag selection
- Lazy/server-side data loading
- Responsive layouts

### Available In

shadcn/ui (TanStack Table), PrimeReact, PrimeVue, Flowbite (DataTables), Carbon Svelte, Svelte UX, HeroUI, Ant Design, Mantine, Material UI, Kibo UI, TanStack Table

---

## Data View

A component for displaying data in switchable list or grid layouts with optional pagination and sorting.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `array` | — | Data items |
| `layout` | `'list' \| 'grid'` | — | Display layout |
| `paginator` | `boolean` | `false` | Enable pagination |
| `rows` | `number` | — | Items per page |
| `sortField` | `string` | — | Sort field |
| `sortOrder` | `number` | — | Sort direction |
| `lazy` | `boolean` | `false` | Server-side mode |
| `itemTemplate` | `function` | — | Custom item renderer |

### Sub-components

- **DataView.LayoutOptions** — List/grid toggle

### Features

- List and grid layout toggle
- Pagination
- Sorting
- Lazy loading
- Custom item templates

### Available In

PrimeReact, PrimeVue, Ant Design (as List)

---

## Date Field

A segmented date input where each date part (day, month, year) is independently editable.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `DateValue` | — | Selected date |
| `defaultValue` | `DateValue` | — | Initial date |
| `placeholder` | `DateValue` | — | Placeholder date for segment cycling |
| `granularity` | `'day' \| 'hour' \| 'minute' \| 'second'` | — | Input precision level |
| `hourCycle` | `'12' \| '24'` | — | 12 or 24 hour format |
| `hideTimeZone` | `boolean` | `false` | Hide time zone segment |
| `locale` | `string` | `'en-US'` | Localization locale |
| `minValue` | `DateValue` | — | Minimum date |
| `maxValue` | `DateValue` | — | Maximum date |
| `disabled` | `boolean` | `false` | Disabled state |
| `readonly` | `boolean` | `false` | Read-only state |
| `required` | `boolean` | `false` | Required for form |
| `readonlySegments` | `array` | — | Lock specific segments |
| `validate` | `function` | — | Custom validation |

### Sub-components

- **DateField.Input** — Container for segments
- **DateField.Segment** — Individual date part (day, month, year, hour, etc.)
- **DateField.Label** — Associated label

### Features

- Segment-based editing (click segment, type to change)
- International date format support via `@internationalized/date`
- Per-segment readonly control
- Custom validation function
- Form integration via hidden input
- Keyboard navigation between segments

### Available In

Bits UI, Melt UI, Kobalte (as Time Field), HeroUI (as Date Input)

---

## Date Picker

A date selection component combining a text input with a calendar dropdown.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `DateValue \| DateValue[]` | — | Selected date(s) |
| `defaultValue` | `DateValue \| DateValue[]` | — | Initial date(s) |
| `selectionMode` | `'single' \| 'multiple' \| 'range'` | `'single'` | Selection mode |
| `locale` | `string` | `'en-US'` | Locale for formatting |
| `minValue` | `DateValue` | — | Minimum date |
| `maxValue` | `DateValue` | — | Maximum date |
| `isDateUnavailable` | `function` | — | Mark dates as unavailable |
| `closeOnSelect` | `boolean` | `true` | Close after selection |
| `numberOfMonths` | `number` | — | Visible months |
| `inline` | `boolean` | `false` | Inline mode (no popover) |
| `showTime` | `boolean` | `false` | Include time selection |
| `showWeekNumbers` | `boolean` | `false` | Display week numbers |
| `dateFormat` | `string` | — | Custom date format string |
| `disabled` | `boolean` | `false` | Disabled state |
| `granularity` | `string` | — | Time precision |
| `hourCycle` | `'12' \| '24'` | — | Time format |
| `fixedWeeks` | `boolean` | — | Always show 6 weeks |
| `openOnClick` | `boolean` | `false` | Open on input click |

### Sub-components

- **DatePicker.Input** — Text input with formatted date
- **DatePicker.Trigger** — Calendar open button
- **DatePicker.Content** — Calendar dropdown panel
- **DatePicker.Calendar** — Calendar grid
- **DatePicker.Segment** — Date field segments (Bits UI)
- **DatePicker.PresetTrigger** — Preset date shortcuts (Ark UI)

### Features

- Single, multiple, and range date selection
- Calendar popup with month/year navigation
- Segmented date input
- Time selection integration
- Date presets/shortcuts
- Multiple calendar systems
- Internationalization
- Form integration
- Natural language parsing (chrono-node, shadcn)

### Available In

shadcn/ui, Bits UI, Melt UI, Ark UI, Park UI, Skeleton UI, HeroUI, Flowbite, PrimeReact, PrimeVue, Svelte UX, Preline, Ant Design, Chakra UI, Mantine, Material UI, Kibo UI

---

## Date Range Picker

A date picker specifically designed for selecting a start and end date range.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `{ start: DateValue, end: DateValue }` | — | Selected range |
| `defaultValue` | `{ start: DateValue, end: DateValue }` | — | Initial range |
| `minDays` | `number` | — | Minimum range length |
| `maxDays` | `number` | — | Maximum range length |
| `closeOnRangeSelect` | `boolean` | `true` | Auto-close after selection |
| `numberOfMonths` | `number` | `2` | Visible months |
| `locale` | `string` | — | Localization |
| `isDateUnavailable` | `function` | — | Unavailable date filter |
| `isDateDisabled` | `function` | — | Disabled date filter |

### Sub-components

- **DateRangePicker.Input** — Start/end date inputs (`type: 'start' | 'end'`)
- **DateRangePicker.Trigger** — Calendar toggle
- **DateRangePicker.Content** — Calendar dropdown
- **DateRangePicker.Calendar** — Range calendar grid

### Features

- Start/end date selection with visual range highlight
- Adjacent month display
- Range length constraints (min/max days)
- Separate start and end inputs with segments
- International date support

### Available In

Bits UI, Melt UI, Ark UI, Park UI, HeroUI, Ant Design, Mantine

---

## Dialog

A modal window overlaid on the primary content, requiring user interaction before returning to the main flow.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | `false` | Dialog visibility |
| `defaultOpen` | `boolean` | — | Initial open state |
| `onOpenChange` | `function` | — | State change callback |
| `modal` | `boolean` | `true` | Modal vs non-modal behavior |
| `role` | `'dialog' \| 'alertdialog'` | `'dialog'` | ARIA role |
| `trapFocus` | `boolean` | `true` | Trap focus inside dialog |
| `preventScroll` | `boolean` | `true` | Prevent background scroll |
| `closeOnInteractOutside` | `boolean` | `true` | Close on outside click |
| `closeOnEscape` | `boolean` | `true` | Close on Escape key |
| `lazyMount` | `boolean` | `false` | Defer rendering until open |
| `unmountOnExit` | `boolean` | `false` | Remove from DOM when closed |
| `restoreFocus` | `boolean` | `true` | Restore focus on close |
| `draggable` | `boolean` | `false` | Allow dragging (PrimeReact/PrimeVue) |
| `resizable` | `boolean` | `false` | Allow resizing (PrimeReact/PrimeVue) |
| `maximizable` | `boolean` | `false` | Allow maximizing (PrimeReact/PrimeVue) |
| `position` | `string` | `'center'` | Dialog position (PrimeReact/PrimeVue) |

### Sub-components

- **Dialog.Trigger** — Element that opens the dialog
- **Dialog.Portal** — Renders in a portal
- **Dialog.Overlay** — Background overlay/backdrop
- **Dialog.Content** — The dialog panel
- **Dialog.Header** — Header section
- **Dialog.Title** — Required accessible title
- **Dialog.Description** — Accessible description
- **Dialog.Footer** — Footer with actions
- **Dialog.Close** — Close button

### Features

- Focus trapping
- Scroll locking
- Escape key dismissal
- Click-outside dismissal (configurable)
- Animated transitions (enter/exit)
- Portal rendering
- Nested dialog support
- WAI-ARIA Dialog pattern
- Modal/non-modal modes
- Draggable and resizable (PrimeReact/PrimeVue)
- Maximizable (PrimeReact/PrimeVue)
- 9 position presets (PrimeReact/PrimeVue)

### Available In

Radix UI, shadcn/ui, Bits UI, Melt UI, Ark UI, Park UI, Skeleton UI, Svelte Radix, DaisyUI (as Modal), Flowbite (as Modal), HeroUI (as Modal), Fluent UI, PrimeReact, PrimeVue, Kobalte, Oku UI, Base UI, SvelteUI (as Modal), Svelte UX, Svelte Headless UI, AgnosticUI, Carbon Svelte, Ant Design (as Modal), Chakra UI (as Modal), Mantine (as Modal), Material UI, Preline, HyperUI, Tailwind Plus

---

## Divider

A visual separator between content sections, rendered as a horizontal or vertical line.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Line direction |
| `decorative` | `boolean` | `false` | If true, purely visual (no ARIA separator role) |
| `type` | `'solid' \| 'dashed' \| 'dotted'` | `'solid'` | Line style (PrimeReact/PrimeVue) |
| `align` | `'left' \| 'center' \| 'right'` | `'center'` | Label alignment (PrimeReact/PrimeVue) |
| `inset` | `boolean` | `false` | Inset from edges (Fluent UI) |

### Features

- Horizontal and vertical orientations
- Optional label/text content
- Semantic `role="separator"` by default
- Decorative mode (no ARIA role)
- Content label support (PrimeReact/PrimeVue)

### Available In

shadcn/ui (as Separator), Bits UI (as Separator), Melt UI (as Separator), Svelte Radix (as Separator), DaisyUI, Flowbite (as Hr), HeroUI, Fluent UI, PrimeReact, PrimeVue, Skeleton UI, Kobalte (as Separator), Oku UI, SvelteUI, Svelte UX, AgnosticUI, Chakra UI, Mantine, Material UI, HyperUI, Tailwind Plus

---

## Dock

A macOS-style navigation bar with icon magnification on hover proximity.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `array` | — | Navigation items with title, icon, href |
| `iconSize` | `number` | `40` | Default icon size |
| `iconMagnification` | `number` | `60` | Magnified icon size on hover |
| `iconDistance` | `number` | `140` | Magnification trigger distance |
| `direction` | `'top' \| 'middle' \| 'bottom'` | `'middle'` | Icon alignment |
| `position` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'bottom'` | Dock position |
| `magnification` | `boolean` | `true` | Enable magnification (PrimeReact/PrimeVue) |

### Features

- Proximity-based icon magnification
- Smooth spring animations
- Tooltip labels on hover
- Multiple positions
- Responsive mobile variant (Aceternity)

### Available In

Aceternity UI (as Floating Dock), Magic UI, Stunning UI, DaisyUI, PrimeReact, PrimeVue

---

## Drawer

A panel that slides in from a screen edge, used for navigation, forms, or supplementary content.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | `false` | Drawer visibility |
| `defaultOpen` | `boolean` | — | Initial open state |
| `onOpenChange` | `function` | — | State change callback |
| `side` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'right'` | Slide-in direction |
| `direction` | `'top' \| 'right' \| 'bottom' \| 'left'` | `'bottom'` | Drag/animation direction (Vaul) |
| `modal` | `boolean` | `true` | Modal behavior |
| `dismissible` | `boolean` | `true` | Can be dismissed |
| `shouldScaleBackground` | `boolean` | `true` | Scale background content (Vaul) |
| `snapPoints` | `number[]` | — | Snap positions (Vaul) |
| `handleOnly` | `boolean` | `false` | Only draggable via handle (Vaul) |
| `size` | `string` | `'md'` | Drawer width/height |
| `placement` | `'left' \| 'right' \| 'top' \| 'bottom'` | — | Position |
| `fullScreen` | `boolean` | `false` | Full screen mode (PrimeReact/PrimeVue) |

### Sub-components

- **Drawer.Trigger** — Element that opens the drawer
- **Drawer.Portal** — Portal container
- **Drawer.Overlay** — Background overlay
- **Drawer.Content** — The drawer panel
- **Drawer.Header** — Header section
- **Drawer.Title** — Accessible title
- **Drawer.Description** — Accessible description
- **Drawer.Footer** — Footer section
- **Drawer.Close** — Close button
- **Drawer.Handle** — Drag handle (Vaul)
- **Drawer.NestedRoot** — Nested drawer support (Vaul)

### Features

- Slide from any edge (top, right, bottom, left)
- Swipe-to-dismiss gesture
- Snap points for multiple heights/widths
- Background content scaling
- Nested drawers
- Focus trapping
- Scroll locking
- Responsive (switch to dialog on desktop)
- Overlay and inline modes

### Available In

shadcn/ui (Vaul), Vaul, DaisyUI, Flowbite, HeroUI, Fluent UI, PrimeReact (as Sidebar), PrimeVue (as Drawer), Park UI, Skeleton UI (via Dialog), Svelte UX, AgnosticUI, Base UI, Ant Design, Chakra UI (as Drawer), Mantine, Material UI, Preline, HyperUI, Tailwind Plus

---

## Dropdown Menu

A menu that appears below a trigger element, offering a list of actions or options.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | — | Controlled open state |
| `defaultOpen` | `boolean` | — | Initial open state |
| `onOpenChange` | `function` | — | State change callback |
| `modal` | `boolean` | — | Modal/non-modal behavior |
| `dir` | `'ltr' \| 'rtl'` | — | Reading direction |

### Sub-components

- **DropdownMenu.Trigger** — Button that opens the menu
- **DropdownMenu.Portal** — Portal container
- **DropdownMenu.Content** — Menu panel with positioning props (`side`, `sideOffset`, `align`, `avoidCollisions`)
- **DropdownMenu.Item** — Individual action (`disabled`, `onSelect`, `textValue`)
- **DropdownMenu.CheckboxItem** — Toggleable item with checkbox
- **DropdownMenu.RadioGroup** — Radio selection group
- **DropdownMenu.RadioItem** — Radio selection item
- **DropdownMenu.Sub** — Nested submenu
- **DropdownMenu.SubTrigger** — Submenu trigger
- **DropdownMenu.SubContent** — Submenu panel
- **DropdownMenu.Group** — Logical grouping
- **DropdownMenu.GroupHeading** — Group label
- **DropdownMenu.Separator** — Visual divider
- **DropdownMenu.Shortcut** — Keyboard shortcut display (shadcn)

### Features

- Nested submenus (unlimited depth)
- Checkbox and radio items with indeterminate support
- Typeahead search
- Full keyboard navigation (arrows, Home/End, Enter, Escape)
- Collision-aware positioning
- Portal rendering
- WAI-ARIA Menu pattern
- Modal and non-modal modes

### Available In

Radix UI, shadcn/ui, Bits UI, Melt UI, Ark UI, Park UI, Kobalte, Oku UI, Base UI, DaisyUI, Flowbite, HeroUI, Fluent UI (as Menu), Carbon Svelte (as OverflowMenu), Svelte Headless UI (as Menu), Ant Design, Chakra UI (as Menu), Mantine (as Menu), Material UI (as Menu), Preline, HyperUI, Tailwind Plus


---

## Editable

An inline text display that transforms into an input field on interaction for in-place editing.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | — | Current text value |
| `defaultValue` | `string` | — | Initial text value |
| `onValueChange` | `function` | — | Value change callback |
| `onValueCommit` | `function` | — | Commit callback (on save) |
| `onValueRevert` | `function` | — | Revert callback (on cancel) |
| `placeholder` | `string` | — | Placeholder text |
| `disabled` | `boolean` | `false` | Disabled state |
| `readOnly` | `boolean` | `false` | Read-only state |
| `maxLength` | `number` | — | Maximum input length |
| `submitMode` | `'enter' \| 'blur' \| 'both' \| 'none'` | — | How to submit edits |
| `activationMode` | `'click' \| 'dblclick' \| 'focus' \| 'none'` | — | How to enter edit mode |
| `autoResize` | `boolean` | `false` | Auto-resize input to content |

### Sub-components

- **Editable.Area** — Container for input/preview
- **Editable.Input** — The edit input field
- **Editable.Preview** — The display text (non-edit mode)
- **Editable.Label** — Associated label
- **Editable.SubmitTrigger** — Save button
- **Editable.CancelTrigger** — Cancel button
- **Editable.EditTrigger** — Enter edit mode button
- **Editable.Control** — Wrapper for action triggers

### Features

- Click, double-click, or focus to edit
- Submit on Enter, blur, or both
- Cancel with Escape
- Auto-resize input
- Form integration

### Available In

Ark UI, Park UI, Chakra UI, Mantine

---

## Empty State

A placeholder display shown when a section has no content, with optional illustration and action.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | — | Title text |
| `description` | `string` | — | Description text |
| `icon` | `ReactNode` | — | Illustration or icon |

### Sub-components

- **EmptyState.Media** — Illustration/icon container
- **EmptyState.Title** — Title text
- **EmptyState.Description** — Description text
- **EmptyState.Content** — Action content area (buttons)

### Features

- Composable layout with icon, title, description, and actions
- Multiple visual styles

### Available In

shadcn/ui (as Empty), AgnosticUI, Tailwind Plus, HyperUI, Kibo UI

---

## File Upload

A component for selecting and uploading files via click or drag-and-drop.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `accept` | `string` | — | Accepted MIME types |
| `multiple` | `boolean` | `false` | Allow multiple files |
| `maxFiles` | `number` | `1` | Maximum number of files |
| `maxFileSize` | `number` | `Infinity` | Maximum file size in bytes |
| `minFileSize` | `number` | `0` | Minimum file size in bytes |
| `disabled` | `boolean` | `false` | Disabled state |
| `allowDrop` | `boolean` | `true` | Allow drag and drop |
| `directory` | `boolean` | `false` | Allow directory upload |
| `name` | `string` | — | Form field name |
| `validate` | `function` | — | Custom validation |
| `onFileChange` | `function` | — | File change callback |
| `onFileAccept` | `function` | — | File accepted callback |
| `onFileReject` | `function` | — | File rejected callback |
| `mode` | `'basic' \| 'advanced'` | — | Upload mode (PrimeReact/PrimeVue) |
| `url` | `string` | — | Upload endpoint URL (PrimeReact/PrimeVue) |
| `auto` | `boolean` | `false` | Auto-upload on selection (PrimeReact/PrimeVue) |
| `customUpload` | `boolean` | `false` | Use custom upload handler (PrimeReact/PrimeVue) |
| `capture` | `'user' \| 'environment'` | — | Camera capture mode |

### Sub-components

- **FileUpload.Dropzone** — Drag-and-drop area
- **FileUpload.Trigger** — Click-to-browse button
- **FileUpload.HiddenInput** — Native file input
- **FileUpload.ItemGroup** — Uploaded file list
- **FileUpload.Item** — Individual file entry
- **FileUpload.ItemName** — File name display
- **FileUpload.ItemSizeText** — File size display
- **FileUpload.ItemPreview** — File preview (images)
- **FileUpload.ItemDeleteTrigger** — Remove file button
- **FileUpload.ClearTrigger** — Clear all files
- **FileUpload.Label** — Label text

### Features

- Drag-and-drop upload area
- File type and size validation
- Multiple file selection
- File preview (images)
- Upload progress tracking
- Custom upload handler
- Auto-upload mode
- Directory upload
- Camera capture

### Available In

Ark UI, Park UI, Skeleton UI, Carbon Svelte, PrimeReact, PrimeVue, DaisyUI, Flowbite, SvelteUI, Aceternity UI, Preline, Kibo UI, Ant Design, Mantine, Material UI

---

## Floating Panel

A draggable, resizable floating window that can be moved and sized within the viewport.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | — | Panel visibility |
| `defaultOpen` | `boolean` | `false` | Initial open state |
| `onOpenChange` | `function` | — | Open state callback |
| `position` | `{ x: number, y: number }` | — | Panel position |
| `defaultPosition` | `{ x: number, y: number }` | — | Initial position |
| `size` | `{ width: number, height: number }` | — | Panel size |
| `defaultSize` | `{ width: number, height: number }` | — | Initial size |
| `minWidth` | `number` | — | Minimum width |
| `minHeight` | `number` | — | Minimum height |
| `maxWidth` | `number` | — | Maximum width |
| `maxHeight` | `number` | — | Maximum height |
| `draggable` | `boolean` | `true` | Allow dragging |
| `resizable` | `boolean` | `true` | Allow resizing |
| `lockAspectRatio` | `boolean` | `false` | Lock width/height ratio |
| `persistRect` | `boolean` | `false` | Persist position/size |
| `gridSize` | `number` | `1` | Snap grid size |

### Sub-components

- **FloatingPanel.Trigger** — Element that opens the panel
- **FloatingPanel.Content** — The panel body
- **FloatingPanel.Header** — Panel header with drag handle
- **FloatingPanel.Title** — Panel title
- **FloatingPanel.Description** — Panel description
- **FloatingPanel.Body** — Panel content area
- **FloatingPanel.CloseTrigger** — Close button
- **FloatingPanel.DragTrigger** — Drag handle
- **FloatingPanel.ResizeTrigger** — Resize handle
- **FloatingPanel.StageTrigger** — Minimize/maximize (Skeleton)

### Features

- Drag to reposition
- Resize from edges/corners
- Grid snapping
- Aspect ratio locking
- Position/size persistence
- Minimize/maximize states (Skeleton)

### Available In

Ark UI, Park UI, Skeleton UI

---

## Form

A form container providing validation, error handling, and field management.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `validationBehavior` | `'native' \| 'aria'` | `'native'` | Validation mode |
| `validationErrors` | `Record<string, string \| string[]>` | — | Server-side errors |
| `onSubmit` | `function` | — | Submit callback |
| `onReset` | `function` | — | Reset callback |
| `onInvalid` | `function` | — | Invalid submission callback |

### Sub-components

- **Form.Field** — Individual field wrapper with label, input, and error
- **Form.Label** — Field label
- **Form.Control** — Native form control wrapper (Radix)
- **Form.Message** — Validation error message
- **Form.ValidityState** — Exposes native validity state (Radix)
- **Form.Submit** — Submit button

### Features

- Native constraint validation API
- Custom/async validation
- Server-side validation integration
- Automatic focus management on invalid fields
- Error message display
- Field-level and form-level validation

### Available In

Radix UI, HeroUI, Ant Design, Chakra UI, Mantine, Material UI, Carbon Svelte, React Hook Form, Superforms (SvelteKit)

---

## Galleria

An advanced image gallery with thumbnails, fullscreen mode, indicators, and autoplay.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `array` | — | Image items |
| `activeIndex` | `number` | `0` | Current image index |
| `fullScreen` | `boolean` | `false` | Fullscreen mode |
| `numVisible` | `number` | `3` | Visible thumbnails |
| `showThumbnails` | `boolean` | `true` | Show thumbnail strip |
| `showIndicators` | `boolean` | `false` | Show dot indicators |
| `showItemNavigators` | `boolean` | `false` | Show prev/next arrows |
| `circular` | `boolean` | `false` | Circular navigation |
| `autoPlay` | `boolean` | `false` | Auto-advance |
| `transitionInterval` | `number` | `4000` | Auto-advance interval |
| `thumbnailsPosition` | `'bottom' \| 'top' \| 'left' \| 'right'` | `'bottom'` | Thumbnail position |

### Features

- Fullscreen lightbox mode
- Thumbnail strip (4 positions)
- Dot indicators
- Autoplay with interval
- Circular navigation
- Captions
- Responsive breakpoints
- Keyboard navigation

### Available In

PrimeReact, PrimeVue, Ant Design (as Image.PreviewGroup)

---

## Highlight

A utility component that highlights matching text within a string, useful for search result display.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `query` | `string` | — | Search query to highlight |
| `text` | `string` | — | Text to search within |
| `matchAll` | `boolean` | `false` | Highlight all occurrences |
| `ignoreCase` | `boolean` | `false` | Case-insensitive matching |

### Features

- Highlights matching substrings
- Case-sensitive and case-insensitive modes
- Single or all-match highlighting

### Available In

Ark UI, Park UI, Chakra UI, Mantine

---

## Hover Card

A floating card that appears when hovering over a trigger element, showing preview content.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | `false` | Card visibility |
| `defaultOpen` | `boolean` | — | Initial state |
| `openDelay` | `number` | `700` | Show delay (ms) |
| `closeDelay` | `number` | `300` | Hide delay (ms) |
| `onOpenChange` | `function` | — | State change callback |

### Sub-components

- **HoverCard.Trigger** — Hover target element
- **HoverCard.Portal** — Portal container
- **HoverCard.Content** — Floating card content with positioning props
- **HoverCard.Arrow** — Pointing arrow

### Features

- Hover-triggered display with configurable delays
- Collision-aware positioning
- Mouse-only (not keyboard accessible by design)
- Custom anchor positioning
- Svelte transitions support (Bits UI)

### Available In

Radix UI, shadcn/ui, Bits UI (as Link Preview), Melt UI (as Link Preview), Ark UI, Park UI, Svelte Radix, Kobalte, Oku UI, Ant Design (as Popover), Mantine

---

## Image

An enhanced image component with loading states, fallbacks, zoom, and preview capabilities.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | — | Image source URL |
| `alt` | `string` | — | Alt text |
| `width` | `number \| string` | — | Image width |
| `height` | `number \| string` | — | Image height |
| `fallbackSrc` | `string` | — | Fallback image URL |
| `loading` | `'eager' \| 'lazy'` | — | Loading strategy |
| `fit` | `'none' \| 'contain' \| 'cover' \| 'fill'` | — | Object-fit mode |
| `radius` | `string` | — | Border radius |
| `shadow` | `string` | — | Shadow level |
| `isBlurred` | `boolean` | `false` | Blur effect (HeroUI) |
| `isZoomed` | `boolean` | `false` | Zoom on hover (HeroUI) |
| `preview` | `boolean` | `false` | Preview/lightbox mode (PrimeReact/PrimeVue) |
| `bordered` | `boolean` | `false` | Show border (Fluent UI) |
| `shape` | `'circular' \| 'rounded' \| 'square'` | — | Image shape (Fluent UI) |

### Features

- Image load state tracking
- Fallback image on error
- Skeleton loading placeholder
- Zoom on hover
- Blur/frosted glass effect
- Preview mode with lightbox
- Download, rotate, and zoom in preview mode (PrimeReact/PrimeVue)
- Responsive sizing
- Lazy loading

### Available In

HeroUI, Fluent UI, PrimeReact, PrimeVue, Kobalte, SvelteUI, Ant Design, Chakra UI, Mantine, Material UI

---

## Inplace

A component that toggles between a display view and an editable/interactive content view.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `active` | `boolean` | `false` | Whether content view is shown |
| `closable` | `boolean` | `false` | Show close button in content view |
| `disabled` | `boolean` | `false` | Disabled state |

### Sub-components

- **Inplace.Display** — The display/preview view
- **Inplace.Content** — The editable/interactive view

### Features

- Toggle between display and content views
- Lazy data loading on activation
- Close button to revert to display view

### Available In

PrimeReact, PrimeVue

---

## Input

A text input field for single-line data entry.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | — | Input value |
| `defaultValue` | `string` | — | Initial value |
| `type` | `string` | `'text'` | HTML input type |
| `placeholder` | `string` | — | Placeholder text |
| `disabled` | `boolean` | `false` | Disabled state |
| `required` | `boolean` | `false` | Required field |
| `readonly` | `boolean` | `false` | Read-only state |
| `invalid` | `boolean` | `false` | Error state |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Input size |
| `variant` | `'default' \| 'filled' \| 'outlined' \| 'underlined' \| 'faded'` | `'default'` | Visual style |
| `color` | `string` | — | Theme color |
| `clearable` | `boolean` | `false` | Show clear button |
| `startContent` | `ReactNode` | — | Content before input (prefix) |
| `endContent` | `ReactNode` | — | Content after input (suffix) |
| `label` | `ReactNode` | — | Associated label |
| `description` | `ReactNode` | — | Help text |
| `errorMessage` | `ReactNode` | — | Error message |
| `appearance` | `string` | — | Visual appearance (Fluent UI) |
| `contentBefore` | `slot` | — | Prefix slot (Fluent UI) |
| `contentAfter` | `slot` | — | Suffix slot (Fluent UI) |

### Sub-components

- **Input.Group** — Container for grouped inputs with addons
- **Input.Addon** — Prefix/suffix decorators
- **Input.LeftElement** — Left icon/element (Chakra)
- **Input.RightElement** — Right icon/element (Chakra)

### Features

- Multiple variants and sizes
- Prefix/suffix content slots
- Clear button
- Error and validation states
- `aria-invalid` support
- Responsive sizing
- Floating label support
- Auto-focus management

### Available In

shadcn/ui, DaisyUI, Flowbite, HeroUI, Fluent UI, PrimeReact, PrimeVue, Park UI, Skeleton UI, SvelteUI, Svelte UX, AgnosticUI, Carbon Svelte, Preline, HyperUI, Tailwind Plus, Ant Design, Chakra UI, Mantine, Material UI

---

## Input Mask

A text input with a predefined format pattern that guides user input (e.g., phone numbers, dates).

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | — | Input value |
| `mask` | `string` | — | Format mask pattern |
| `slotChar` | `string` | `'_'` | Placeholder character |
| `autoClear` | `boolean` | `true` | Clear incomplete values on blur |
| `unmask` | `boolean` | `false` | Return unmasked value |
| `disabled` | `boolean` | `false` | Disabled state |
| `placeholder` | `string` | — | Placeholder text |

### Features

- Mask patterns: `9` = digit, `a` = letter, `*` = alphanumeric
- Auto-advance through mask positions
- Clear incomplete values on blur
- Return masked or unmasked value

### Available In

PrimeReact, PrimeVue, Ant Design

---

## Input OTP / PIN Input

A multi-segment input for entering one-time passwords, verification codes, or PINs.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | — | Current OTP value |
| `defaultValue` | `string` | — | Initial value |
| `maxlength` | `number` | `6` | Number of characters/segments |
| `length` | `number` | `4` | Number of input fields (HeroUI) |
| `pattern` | `RegExp` | — | Validation pattern |
| `onComplete` | `function` | — | Fired when all segments filled |
| `onValueChange` | `function` | — | Value change callback |
| `type` | `'text' \| 'numeric' \| 'alphanumeric'` | — | Input type filter |
| `otp` | `boolean` | `false` | OTP autocomplete hint (Ark UI) |
| `mask` | `boolean` | `false` | Hide entered characters |
| `disabled` | `boolean` | `false` | Disabled state |
| `placeholder` | `string` | — | Placeholder per segment |
| `blurOnComplete` | `boolean` | `false` | Blur on last segment fill |
| `allowedKeys` | `string` | — | Regex for allowed characters (HeroUI) |
| `pasteTransformer` | `function` | — | Sanitize pasted text (Bits UI) |

### Sub-components

- **PinInput.Input** — Individual segment input
- **PinInput.HiddenInput** — Hidden form input
- **PinInput.Control** — Segments container
- **PinInput.Label** — Associated label
- **PinInput.Group** — Segment grouping (shadcn)
- **PinInput.Separator** — Visual separator between segments

### Features

- Auto-advance between segments
- Copy-paste support
- Backspace navigation
- Form integration
- Numeric/alphanumeric filtering
- Animated caret
- Password manager detection

### Available In

shadcn/ui (as Input OTP), Bits UI (as PIN Input), Melt UI (as PIN Input), Ark UI (as Pin Input), Park UI, HeroUI (as Input OTP), Preline, Ant Design, Mantine, Kibo UI


---

## Kbd

Displays a keyboard key or shortcut in a styled inline element.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `keys` | `string \| string[]` | — | Key names to display (HeroUI) |
| `size` | `string` | — | Display size |

### Sub-components

- **Kbd.Group** — Groups multiple keys

### Features

- Semantic `<kbd>` elements
- Platform-aware key symbols (Command, Shift, Ctrl, etc.)
- Composable with tooltips and buttons

### Available In

shadcn/ui, DaisyUI, Flowbite, HeroUI, SvelteUI, Svelte UX, AgnosticUI, Ant Design, Chakra UI, Mantine

---

## Knob

A circular dial/rotary control for selecting numeric values.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | — | Current value |
| `min` | `number` | `0` | Minimum value |
| `max` | `number` | `100` | Maximum value |
| `step` | `number` | `1` | Step increment |
| `size` | `number` | `100` | Knob diameter in pixels |
| `strokeWidth` | `number` | `14` | Track stroke width |
| `valueTemplate` | `string` | — | Display format template |
| `valueColor` | `string` | — | Value arc color |
| `rangeColor` | `string` | — | Background arc color |
| `showValue` | `boolean` | `true` | Display numeric value |
| `disabled` | `boolean` | `false` | Disabled state |
| `readOnly` | `boolean` | `false` | Read-only state |

### Features

- Circular drag interaction
- Keyboard control (arrow keys)
- Custom colors
- Value display template

### Available In

PrimeReact, PrimeVue

---

## Label

An accessible label element associated with a form control.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `htmlFor` | `string` | — | Associated control ID |
| `required` | `boolean` | — | Show required indicator |
| `size` | `string` | — | Label size |
| `weight` | `'regular' \| 'semibold'` | — | Font weight (Fluent UI) |
| `disabled` | `boolean` | `false` | Disabled styling |

### Features

- Text selection prevention on double-click (Radix)
- Required indicator
- Semantic labeling for screen readers
- Disabled state styling

### Available In

Radix UI, shadcn/ui, Bits UI, Melt UI, Svelte Radix, DaisyUI, Fluent UI, Carbon Svelte, Ant Design, Mantine

---

## Link

A navigation element for navigating to URLs or triggering actions.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `href` | `string` | — | Target URL |
| `color` | `string` | — | Link color |
| `underline` | `'none' \| 'hover' \| 'always' \| 'active' \| 'focus'` | — | Underline behavior (HeroUI) |
| `isExternal` | `boolean` | `false` | Open in new tab (HeroUI) |
| `showAnchorIcon` | `boolean` | `false` | Show external link icon (HeroUI) |
| `isBlock` | `boolean` | `false` | Block-level link (HeroUI) |
| `disabled` | `boolean` | `false` | Disabled state |
| `appearance` | `'default' \| 'subtle'` | — | Visual style (Fluent UI) |
| `inline` | `boolean` | — | Inline vs standalone (Fluent UI) |

### Features

- External link detection and icon
- Multiple underline behaviors
- Disabled state with focusable option (Fluent UI)
- Polymorphic rendering (a, button, span)

### Available In

DaisyUI, HeroUI, Fluent UI, Carbon Svelte, SvelteUI (as Anchor), Ant Design, Chakra UI, Mantine, Material UI

---

## Listbox

A scrollable list of options for selection, used standalone or within other components like Select.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `Iterable<T>` | — | List items |
| `value` | `string \| string[]` | — | Selected value(s) |
| `defaultValue` | `string \| string[]` | — | Initial selection |
| `collection` | `ListCollection<T>` | — | Item collection (Ark UI) |
| `selectionMode` | `'none' \| 'single' \| 'multiple' \| 'extended'` | — | Selection behavior |
| `multiple` | `boolean` | `false` | Allow multiple selections |
| `filter` | `boolean` | `false` | Show filter input |
| `disabled` | `boolean` | `false` | Disabled state |
| `loopFocus` | `boolean` | `false` | Loop keyboard navigation |
| `isVirtualized` | `boolean` | `false` | Virtual scrolling (HeroUI) |
| `orientation` | `'horizontal' \| 'vertical'` | `'vertical'` | Layout orientation |
| `typeahead` | `boolean` | `true` | Type-to-find (Skeleton) |

### Sub-components

- **Listbox.Item** — Individual option
- **Listbox.ItemGroup** — Grouped options
- **Listbox.ItemGroupLabel** — Group heading
- **Listbox.ItemText** — Option text
- **Listbox.ItemIndicator** — Selection indicator

### Features

- Single and multiple selection
- Keyboard navigation with typeahead
- Grouped options
- Virtual scrolling for large lists
- Filtering
- Custom item templates
- WAI-ARIA Listbox pattern

### Available In

Ark UI, Park UI, Skeleton UI, HeroUI, PrimeReact, PrimeVue, Base UI, Svelte Headless UI, Fluent UI (as List), Carbon Svelte, Ant Design (as List), Mantine

---

## Marquee

An infinitely scrolling content strip, typically used for logos, testimonials, or announcements.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `speed` | `number` | — | Scroll speed |
| `direction` | `'left' \| 'right' \| 'up' \| 'down'` | `'left'` | Scroll direction |
| `pauseOnHover` | `boolean` | `false` | Pause animation on hover |
| `reverse` | `boolean` | `false` | Reverse scroll direction |
| `vertical` | `boolean` | `false` | Vertical scrolling |
| `repeat` | `number` | — | Content repetitions |
| `autoFill` | `boolean` | `false` | Auto-fill to cover container |
| `gap` | `number` | — | Gap between repeated items |

### Features

- Infinite scroll animation (no JavaScript needed for CSS-only versions)
- Pause on hover
- Horizontal and vertical directions
- Auto-fill to cover container width

### Available In

Ark UI, Magic UI, Stunning UI, Kibo UI, Aceternity UI (as Infinite Moving Cards)

---

## Mega Menu

A large dropdown navigation menu spanning multiple columns with categorized links.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `model` | `MenuItem[]` | — | Menu items model |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Layout direction |
| `breakpoint` | `string` | `'960px'` | Responsive breakpoint |
| `start` | `ReactNode` | — | Start content slot |
| `end` | `ReactNode` | — | End content slot |

### Features

- Multi-column dropdown layout
- Horizontal and vertical orientations
- Responsive breakpoint for mobile
- Custom start/end content slots
- Nested submenu support

### Available In

Flowbite, PrimeReact, PrimeVue, Preline, Tailwind Plus (as Flyout Menu)

---

## Mention

A text input that triggers suggestions when typing a trigger character (e.g., @user).

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | — | Input value |
| `suggestions` | `array` | — | Suggestion items |
| `field` | `string \| string[]` | — | Display field(s) |
| `trigger` | `string \| string[]` | `'@'` | Trigger character(s) |
| `autoResize` | `boolean` | `false` | Auto-resize textarea |
| `delay` | `number` | `0` | Search debounce delay |

### Features

- Trigger-based suggestion popup
- Multiple trigger characters
- Custom suggestion templates
- Auto-resize textarea
- Keyboard navigation

### Available In

PrimeReact, PrimeVue, Ant Design

---

## Menubar

A horizontal menu bar with dropdown menus, similar to desktop application menu bars.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | — | Currently open menu |
| `defaultValue` | `string` | — | Initially open menu |
| `onValueChange` | `function` | — | Menu change callback |
| `loop` | `boolean` | `false` | Focus wrapping |
| `dir` | `'ltr' \| 'rtl'` | — | Reading direction |

### Sub-components

- **Menubar.Menu** — Individual top-level menu
- **Menubar.Trigger** — Menu trigger button
- **Menubar.Content** — Dropdown menu panel
- **Menubar.Item** — Menu action item
- **Menubar.CheckboxItem** — Toggleable item
- **Menubar.RadioGroup** — Radio group
- **Menubar.RadioItem** — Radio item
- **Menubar.Sub** — Nested submenu
- **Menubar.SubTrigger** — Submenu trigger
- **Menubar.SubContent** — Submenu content
- **Menubar.Separator** — Divider
- **Menubar.Group** — Logical grouping
- **Menubar.GroupHeading** — Group label

### Features

- Persistent horizontal menu bar
- Nested submenus
- Checkbox and radio items
- Full keyboard navigation
- Typeahead search
- WAI-ARIA Menu Button pattern

### Available In

Radix UI, shadcn/ui, Bits UI, Melt UI, Oku UI, Base UI, PrimeReact, PrimeVue, Kobalte

---

## Meter

A gauge component displaying a scalar value within a known range, representing a measurement rather than progress.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | `0` | Current value |
| `min` | `number` | `0` | Minimum value |
| `max` | `number` | `100` | Maximum value |
| `low` | `number` | — | Low threshold |
| `high` | `number` | — | High threshold |
| `optimum` | `number` | — | Optimal value |

### Features

- Static measurement display (not progress)
- Data attributes for value, min, max
- ARIA meter role
- Low/high/optimum thresholds for color coding

### Available In

Bits UI, Kobalte, Base UI, PrimeReact (as MeterGroup), PrimeVue (as MeterGroup), Mantine

---

## Modal

See [Dialog](#dialog). Modal is an alternate name used by some libraries for the Dialog component.

### Available In

DaisyUI, Flowbite, HeroUI, SvelteUI, Svelte UX, Carbon Svelte, Ant Design, Chakra UI, Mantine, Material UI

---

## Multi Select

A select input that allows choosing multiple values, often displaying them as chips/tags.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `array` | — | Selected values |
| `options` | `array` | — | Available options |
| `optionLabel` | `string` | — | Property for display text |
| `optionValue` | `string` | — | Property for value |
| `display` | `'comma' \| 'chip'` | — | How selected values are shown |
| `placeholder` | `string` | — | Placeholder text |
| `filter` | `boolean` | `false` | Show filter input |
| `maxSelectedLabels` | `number` | `3` | Max labels before summary |
| `selectedItemsLabel` | `string` | `'{0} items selected'` | Summary label |
| `selectionLimit` | `number` | — | Maximum selections |
| `showSelectAll` | `boolean` | `true` | Show select all checkbox |
| `disabled` | `boolean` | `false` | Disabled state |

### Features

- Chip or comma display for selections
- Select all option
- Selection limit
- Filtering/search
- Virtual scrolling
- Grouped options

### Available In

PrimeReact, PrimeVue, Svelte UX, Carbon Svelte, Flowbite, Ant Design, Mantine

---

## Navbar

A top-level navigation bar, typically containing a brand logo, navigation links, and utility actions.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fluid` | `boolean` | `false` | Full-width container (Flowbite) |
| `breakpoint` | `string` | `'md'` | Responsive collapse breakpoint |
| `position` | `'static' \| 'sticky' \| 'fixed'` | — | Position behavior |
| `isBordered` | `boolean` | `false` | Show bottom border (HeroUI) |
| `isBlurred` | `boolean` | `true` | Backdrop blur (HeroUI) |
| `shouldHideOnScroll` | `boolean` | `false` | Auto-hide on scroll (HeroUI) |

### Sub-components

- **Navbar.Brand** — Logo/brand section
- **Navbar.Content** — Navigation links container
- **Navbar.Item** — Individual nav item
- **Navbar.Toggle** — Mobile hamburger toggle
- **Navbar.Menu** — Mobile menu panel
- **Navbar.MenuItem** — Mobile menu item
- **Navbar.Start** — Left-aligned content (DaisyUI)
- **Navbar.Center** — Center-aligned content (DaisyUI)
- **Navbar.End** — Right-aligned content (DaisyUI)

### Features

- Responsive collapse to hamburger menu
- Auto-hide on scroll
- Backdrop blur effect
- Fixed/sticky positioning
- Dropdown menus integration
- Brand/logo section
- Search integration

### Available In

DaisyUI, Flowbite, HeroUI, PrimeReact (as Menubar), PrimeVue (as Menubar), Skeleton UI (as Navigation), Carbon Svelte (as UIShell), Preline, HyperUI, Tailwind Plus, Ant Design (as Layout.Header), Mantine (as AppShell), Material UI (as AppBar)

---

## Navigation Menu

A site-wide navigation component with animated sub-menus, typically used for top-level navigation with rich dropdown content.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | — | Active menu item |
| `defaultValue` | `string` | — | Initially active item |
| `onValueChange` | `function` | — | Change callback |
| `delayDuration` | `number` | `200` | Open delay (ms) |
| `skipDelayDuration` | `number` | `300` | Skip delay for adjacent items |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Layout direction |
| `viewport` | `boolean` | `true` | Enable viewport-based layout (shadcn) |

### Sub-components

- **NavigationMenu.Root** — Top-level container
- **NavigationMenu.List** — Menu items list
- **NavigationMenu.Item** — Individual menu entry
- **NavigationMenu.Trigger** — Dropdown trigger
- **NavigationMenu.Content** — Dropdown content panel
- **NavigationMenu.Link** — Navigation link (`active` prop)
- **NavigationMenu.Indicator** — Active item indicator
- **NavigationMenu.Viewport** — Animated content viewport

### Features

- Animated viewport transitions between menu items
- Active item indicator
- Content motion direction attributes for animation
- Full keyboard navigation
- Rich dropdown content (not just links)
- CSS variables for viewport dimensions

### Available In

Radix UI, shadcn/ui, Bits UI, Ark UI, Park UI, Kobalte, Base UI

---

## Number Input

A numeric input with increment/decrement buttons and optional formatting.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | — | Current value |
| `defaultValue` | `number` | — | Initial value |
| `min` | `number` | — | Minimum value |
| `max` | `number` | — | Maximum value |
| `step` | `number` | `1` | Step increment |
| `precision` | `number` | — | Decimal precision |
| `formatOptions` | `Intl.NumberFormatOptions` | — | Number formatting |
| `locale` | `string` | — | Locale for formatting |
| `disabled` | `boolean` | `false` | Disabled state |
| `readOnly` | `boolean` | `false` | Read-only state |
| `clampValueOnBlur` | `boolean` | `true` | Clamp to min/max on blur |
| `allowOverflow` | `boolean` | `false` | Allow values outside min/max |
| `spinOnPress` | `boolean` | `true` | Spin on long press |
| `mode` | `'decimal' \| 'currency'` | `'decimal'` | Format mode (PrimeReact) |
| `currency` | `string` | — | Currency code (PrimeReact) |
| `useGrouping` | `boolean` | `true` | Show thousands separator |
| `showButtons` | `boolean` | `false` | Show stepper buttons (PrimeReact) |
| `buttonLayout` | `'stacked' \| 'horizontal' \| 'vertical'` | — | Button layout (PrimeReact) |

### Sub-components

- **NumberInput.Input** — Text input field
- **NumberInput.IncrementTrigger** — Increment button
- **NumberInput.DecrementTrigger** — Decrement button
- **NumberInput.Label** — Associated label
- **NumberInput.Control** — Button container
- **NumberInput.ScrubArea** — Drag-to-change area (Ark UI)
- **NumberInput.ValueText** — Formatted value display

### Features

- Increment/decrement buttons
- Long-press spin
- Intl number formatting (currency, percent)
- Keyboard shortcuts (Arrow keys, Page Up/Down)
- Min/max clamping
- Scrub interaction (drag to change value)
- Custom step sizes
- Form integration

### Available In

Ark UI, Park UI, HeroUI, Fluent UI (as SpinButton), PrimeReact (as InputNumber), PrimeVue (as InputNumber), Kobalte (as Number Field), Base UI, SvelteUI, Svelte UX (as NumberStepper), Carbon Svelte, Preline, Ant Design, Chakra UI, Mantine, Material UI


---

## Order List

A reorderable list with move-up/move-down controls and optional drag-and-drop.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `array` | — | List items |
| `selection` | `array` | — | Selected items |
| `header` | `ReactNode` | — | List header |
| `dragdrop` | `boolean` | `false` | Enable drag and drop |
| `filter` | `boolean` | `false` | Enable filtering |
| `filterBy` | `string` | — | Property to filter on |
| `itemTemplate` | `function` | — | Custom item renderer |

### Features

- Move items up/down/top/bottom with buttons
- Drag-and-drop reordering
- Item selection
- Filtering

### Available In

PrimeReact, PrimeVue

---

## Organization Chart

A hierarchical visualization of organizational structure with interactive nodes.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `TreeNode[]` | — | Org chart data |
| `selectionMode` | `'single' \| 'multiple'` | — | Node selection mode |
| `selection` | `any` | — | Selected node(s) |
| `nodeTemplate` | `function` | — | Custom node renderer |

### Features

- Hierarchical tree visualization
- Node selection
- Custom node templates
- Expand/collapse branches

### Available In

PrimeReact, PrimeVue, Ant Design (as Tree with custom render)

---

## Pagination

Controls for navigating between pages of content.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `count` | `number` | — | Total items |
| `page` | `number` | — | Current page |
| `perPage` | `number` | `10` | Items per page |
| `total` | `number` | — | Total pages (HeroUI) |
| `siblings` | `number` | `1` | Adjacent page count (HeroUI) |
| `boundaries` | `number` | `1` | Boundary page count (HeroUI) |
| `defaultPage` | `number` | `1` | Initial page |
| `onPageChange` | `function` | — | Page change callback |
| `siblingCount` | `number` | `1` | Pages shown around current |
| `boundaryCount` | `number` | `1` | Pages shown at start/end |
| `showControls` | `boolean` | `false` | Show prev/next buttons |
| `loop` | `boolean` | `false` | Loop from last to first page |
| `isCompact` | `boolean` | `false` | Compact display (HeroUI) |
| `variant` | `string` | — | Visual style (HeroUI) |
| `type` | `'button' \| 'link'` | `'button'` | Navigation element type |
| `getPageUrl` | `function` | — | URL generator for link mode |

### Sub-components

- **Pagination.Item** — Individual page button
- **Pagination.PrevTrigger** — Previous page button
- **Pagination.NextTrigger** — Next page button
- **Pagination.FirstTrigger** — First page button (Skeleton)
- **Pagination.LastTrigger** — Last page button (Skeleton)
- **Pagination.Ellipsis** — Ellipsis for skipped pages

### Features

- Page number navigation
- Previous/next controls
- First/last page controls
- Ellipsis for large page ranges
- Jump-to-page functionality
- Rows-per-page selector
- Keyboard navigation
- Link-based for SEO

### Available In

shadcn/ui, Bits UI, Melt UI, Ark UI, Park UI, Skeleton UI, DaisyUI (as Join), Flowbite, HeroUI, PrimeReact, PrimeVue, Svelte UX, AgnosticUI, Carbon Svelte, Preline, HyperUI, Tailwind Plus, Ant Design, Chakra UI, Mantine, Material UI

---

## Panel

A collapsible content container with a header, useful for settings or configuration groups.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `header` | `string \| ReactNode` | — | Panel header content |
| `toggleable` | `boolean` | `false` | Can be collapsed |
| `collapsed` | `boolean` | `false` | Collapsed state |
| `icons` | `ReactNode` | — | Header icon actions |
| `onToggle` | `function` | — | Toggle callback |

### Features

- Collapsible content area
- Header with icons/actions
- Template support for header/footer

### Available In

PrimeReact, PrimeVue, Ant Design (as Collapse.Panel), Material UI (as ExpansionPanel)

---

## Password Input

A password text input with visibility toggle and optional strength indicator.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | — | Password value |
| `visible` | `boolean` | `false` | Password visibility |
| `defaultVisible` | `boolean` | `false` | Initial visibility |
| `onVisibilityChange` | `function` | — | Visibility toggle callback |
| `feedback` | `boolean` | `true` | Show strength meter (PrimeReact) |
| `toggleMask` | `boolean` | `false` | Show toggle button (PrimeReact) |
| `promptLabel` | `string` | — | Prompt text |
| `weakLabel` | `string` | — | Weak password label |
| `mediumLabel` | `string` | — | Medium password label |
| `strongLabel` | `string` | — | Strong password label |
| `mediumRegex` | `string` | — | Medium strength regex |
| `strongRegex` | `string` | — | Strong strength regex |

### Sub-components

- **PasswordInput.Input** — The masked input field
- **PasswordInput.VisibilityTrigger** — Show/hide toggle button
- **PasswordInput.HiddenInput** — Form-compatible hidden input

### Features

- Toggle password visibility
- Password strength meter
- Custom strength regex patterns
- Strength feedback labels

### Available In

Ark UI, Park UI, PrimeReact, PrimeVue, SvelteUI, Carbon Svelte, Preline, Mantine, Ant Design

---

## Persona

A composite display of a user's avatar, name, and additional details.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | — | Primary name |
| `secondaryText` | `string` | — | Secondary text (title/role) |
| `tertiaryText` | `string` | — | Third line of text |
| `quaternaryText` | `string` | — | Fourth line of text |
| `size` | `number` | — | Avatar size |
| `textPosition` | `'before' \| 'after' \| 'below'` | `'after'` | Text placement |
| `avatar` | `slot` | — | Avatar configuration |
| `presence` | `slot` | — | Presence indicator |

### Features

- Up to 4 text lines
- Presence indicator
- Avatar integration
- Multiple text positions

### Available In

Fluent UI, HeroUI (as User)

---

## Pick List

A dual-list transfer component for moving items between source and target lists.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `source` | `array` | — | Source list items |
| `target` | `array` | — | Target list items |
| `sourceHeader` | `string` | — | Source list header |
| `targetHeader` | `string` | — | Target list header |
| `filter` | `boolean` | `false` | Show filter inputs |
| `dragdrop` | `boolean` | `false` | Enable drag and drop |
| `showSourceControls` | `boolean` | `true` | Show source reorder controls |
| `showTargetControls` | `boolean` | `true` | Show target reorder controls |

### Features

- Transfer items between two lists
- Reorder within lists
- Drag-and-drop support
- Filtering
- Responsive breakpoint for mobile layout

### Available In

PrimeReact, PrimeVue, Ant Design (as Transfer), Mantine (as TransferList)

---

## Popover

A floating panel anchored to a trigger element, used for interactive content like forms or menus.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | `false` | Popover visibility |
| `defaultOpen` | `boolean` | — | Initial state |
| `onOpenChange` | `function` | — | State change callback |
| `modal` | `boolean` | `false` | Modal mode (trap focus) |
| `positioning` | `object` | — | Floating UI positioning config |
| `side` | `'top' \| 'right' \| 'bottom' \| 'left'` | `'bottom'` | Preferred placement side |
| `sideOffset` | `number` | `0` | Offset from trigger |
| `align` | `'start' \| 'center' \| 'end'` | `'center'` | Alignment on side |
| `avoidCollisions` | `boolean` | `true` | Flip when clipped |
| `collisionPadding` | `number \| object` | `0` | Padding from viewport edges |
| `closeOnInteractOutside` | `boolean` | `true` | Close on outside click |
| `closeOnEscape` | `boolean` | `true` | Close on Escape |
| `autoFocus` | `boolean` | `true` | Auto-focus content on open |
| `trigger` | `'hover' \| 'click'` | `'click'` | Trigger interaction (Flowbite) |

### Sub-components

- **Popover.Trigger** — Anchor element
- **Popover.Anchor** — Custom anchor (separate from trigger)
- **Popover.Portal** — Portal container
- **Popover.Content** — Floating panel
- **Popover.Arrow** — Pointing arrow
- **Popover.Close** — Close button
- **Popover.Title** — Popover title
- **Popover.Description** — Popover description

### Features

- Click or hover trigger
- Collision-aware positioning (Floating UI)
- Focus trap in modal mode
- Portal rendering
- Custom anchor element
- Arrow indicator
- WAI-ARIA Dialog pattern
- Keyboard dismissal

### Available In

Radix UI, shadcn/ui, Bits UI, Melt UI, Ark UI, Park UI, Skeleton UI, DaisyUI, Flowbite, HeroUI, Fluent UI, PrimeReact (as OverlayPanel), PrimeVue (as Popover), Kobalte, Oku UI, Base UI, Svelte UX, Svelte Headless UI, AgnosticUI, Carbon Svelte, Preline, Tailwind Plus, Ant Design, Chakra UI, Mantine, Material UI

---

## Progress

A visual indicator showing the completion status of a task or process.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number \| null` | — | Current progress (null = indeterminate) |
| `max` | `number` | `100` | Maximum value |
| `min` | `number` | `0` | Minimum value |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Bar direction |
| `color` | `string` | — | Bar color |
| `size` | `string` | — | Bar thickness |
| `isIndeterminate` | `boolean` | `false` | Indeterminate state (HeroUI) |
| `isStriped` | `boolean` | `false` | Striped pattern (HeroUI) |
| `showValueLabel` | `boolean` | `false` | Display percentage label |
| `formatOptions` | `Intl.NumberFormatOptions` | — | Value formatting |
| `label` | `ReactNode` | — | Progress label |
| `mode` | `'determinate' \| 'indeterminate'` | — | Display mode (PrimeReact/PrimeVue) |
| `getValueLabel` | `function` | — | Custom label function (Radix) |

### Sub-components

- **Progress.Track** — Background track
- **Progress.Range** — Filled portion
- **Progress.Indicator** — Visual indicator element (Radix)
- **Progress.Label** — Label text
- **Progress.ValueText** — Value display
- **Progress.Circle** — Circular progress (Skeleton, Ark UI)
- **Progress.CircleTrack** — Circular track
- **Progress.CircleRange** — Circular fill

### Features

- Determinate and indeterminate states
- Linear and circular variants
- Animated transitions
- `progressbar` WAI-ARIA role
- Data attributes for state (complete, loading, indeterminate)
- Striped pattern
- Custom value formatting

### Available In

Radix UI, shadcn/ui, Bits UI, Melt UI, Ark UI, Park UI, Skeleton UI, Svelte Radix, DaisyUI, Flowbite, HeroUI, Fluent UI, PrimeReact, PrimeVue, Kobalte, Oku UI, Base UI, SvelteUI, Svelte UX, AgnosticUI, Carbon Svelte, Preline, HyperUI, Tailwind Plus, Ant Design, Chakra UI, Mantine, Material UI

---

## QR Code

Generates and displays a QR code from a string value.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | — | Text to encode |
| `encoding` | `object` | — | Encoding options |

### Sub-components

- **QRCode.Frame** — QR code container
- **QRCode.Pattern** — QR code pattern
- **QRCode.Overlay** — Center overlay (logo)
- **QRCode.DownloadTrigger** — Download as image button

### Features

- Generate QR codes from any string/URL
- Center overlay for logos
- Download as image

### Available In

Ark UI, Park UI, Kibo UI, Ant Design

---

## Radio Group

A set of mutually exclusive options where only one can be selected at a time.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | — | Selected value |
| `defaultValue` | `string` | — | Initial selection |
| `onValueChange` | `function` | — | Selection change callback |
| `disabled` | `boolean` | `false` | Disable all options |
| `required` | `boolean` | `false` | Required for form |
| `name` | `string` | — | Form field name |
| `orientation` | `'horizontal' \| 'vertical'` | `'vertical'` | Layout direction |
| `loop` | `boolean` | `true` | Wrap keyboard focus |
| `dir` | `'ltr' \| 'rtl'` | — | Reading direction |
| `color` | `string` | — | Theme color |
| `size` | `string` | — | Radio size |
| `layout` | `'horizontal' \| 'vertical' \| 'horizontal-stacked'` | — | Layout style (Fluent UI) |

### Sub-components

- **RadioGroup.Item** — Individual radio option (`value`, `disabled`)
- **RadioGroup.Indicator** — Visual check indicator (Radix)
- **RadioGroup.ItemControl** — Radio circle element (Ark UI)
- **RadioGroup.ItemText** — Option label text
- **RadioGroup.ItemHiddenInput** — Hidden form input
- **RadioGroup.Label** — Group label

### Features

- Single selection with mutual exclusion
- Roving tabindex for keyboard navigation
- Arrow key navigation
- WAI-ARIA Radio Group pattern
- Custom content in radio items (HeroUI)
- Horizontal/vertical/stacked layouts
- Form integration

### Available In

Radix UI, shadcn/ui, Bits UI, Melt UI, Ark UI, Park UI, Skeleton UI (as radio classes), Svelte Radix, DaisyUI, Flowbite, HeroUI, Fluent UI, PrimeReact, PrimeVue, Kobalte, Oku UI, Base UI, SvelteUI, Svelte UX, AgnosticUI, Carbon Svelte, Svelte Headless UI, Preline, HyperUI, Tailwind Plus, Ant Design, Chakra UI, Mantine, Material UI

---

## Range Calendar

A calendar specifically for selecting a date range with start and end date highlighting.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `{ start: DateValue, end: DateValue }` | — | Selected range |
| `defaultValue` | `{ start: DateValue, end: DateValue }` | — | Initial range |
| `minValue` | `DateValue` | — | Minimum date |
| `maxValue` | `DateValue` | — | Maximum date |
| `numberOfMonths` | `number` | `2` | Visible months |
| `locale` | `string` | — | Localization |
| `isDateUnavailable` | `function` | — | Unavailable date filter |
| `isDateDisabled` | `function` | — | Disabled date filter |
| `allowsNonContiguousRanges` | `boolean` | `false` | Allow gaps in range (HeroUI) |

### Features

- Start/end date selection with visual range highlight
- Adjacent months display
- Date unavailability filtering
- International calendar support

### Available In

shadcn/ui, Bits UI, Melt UI, HeroUI

---

## Rating Group

A star/icon-based rating input for user reviews and feedback.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | `0` | Current rating |
| `defaultValue` | `number` | — | Initial rating |
| `max` | `number` | `5` | Maximum rating |
| `count` | `number` | `5` | Number of stars/icons |
| `onValueChange` | `function` | — | Value change callback |
| `allowHalf` | `boolean` | `false` | Half-star precision |
| `disabled` | `boolean` | `false` | Disabled state |
| `readOnly` | `boolean` | `false` | Read-only display |
| `required` | `boolean` | `false` | Required field |
| `name` | `string` | — | Form field name |
| `hoverPreview` | `boolean` | `false` | Preview on hover (Bits UI) |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Layout direction |
| `cancel` | `boolean` | `true` | Allow clearing (PrimeReact) |
| `onHoverChange` | `function` | — | Hover state callback |
| `step` | `number` | `1` | Step size (0.5 for half, Fluent UI) |

### Sub-components

- **RatingGroup.Item** — Individual star/icon
- **RatingGroup.HiddenInput** — Form input
- **RatingGroup.Label** — Label text
- **RatingGroup.Control** — Stars container

### Features

- Whole and half-star precision
- WAI-ARIA slider pattern
- Keyboard navigation (Arrow keys, number keys)
- Hover preview
- Custom icons (stars, hearts, etc.)
- Cancel/clear capability
- Form integration
- RTL support

### Available In

Bits UI, Ark UI, Park UI, Skeleton UI, DaisyUI, Flowbite, Fluent UI, PrimeReact, PrimeVue, AgnosticUI, Preline, Kibo UI, Ant Design, Mantine, Material UI

---

## Resizable / Splitter

Resizable panels separated by draggable handles for creating adjustable layouts.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `direction` | `'horizontal' \| 'vertical'` | — | Split orientation |
| `orientation` | `'horizontal' \| 'vertical'` | — | Alias for direction |
| `layout` | `'horizontal' \| 'vertical'` | — | Alias (PrimeReact/PrimeVue) |
| `gutterSize` | `number` | `4` | Handle/gutter size (PrimeReact/PrimeVue) |
| `stateKey` | `string` | — | State persistence key |
| `stateStorage` | `'local' \| 'session'` | — | Storage method |
| `onSizeChange` | `function` | — | Size change callback |

### Sub-components

- **Splitter.PaneGroup / Splitter.Root** — Container for panels
- **Splitter.Pane / Splitter.Panel** — Individual resizable panel (`defaultSize`, `minSize`, `maxSize`)
- **Splitter.Handle / Splitter.ResizeTrigger** — Draggable divider

### Features

- Keyboard-accessible resizing
- Nested layouts (horizontal within vertical, etc.)
- Size persistence (local/session storage)
- Min/max size constraints
- Visual grip handle

### Available In

shadcn/ui (PaneForge), Ark UI, Park UI, Flowbite (as SplitPane), PrimeReact (as Splitter), PrimeVue (as Splitter), Mantine

---

## Rich Text Editor

A WYSIWYG editor for composing formatted text with toolbars, slash commands, and collaborative features.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | — | HTML content |
| `placeholder` | `string` | — | Placeholder text |
| `readOnly` | `boolean` | `false` | Read-only mode |
| `modules` | `object` | — | Editor modules/extensions |
| `theme` | `string` | — | Editor theme |

### Features

- Bold, italic, underline, strikethrough formatting
- Headings, lists, blockquotes
- Tables, code blocks
- Image and media embedding
- Slash commands (/heading, /list, etc.)
- Floating and bubble menus
- Collaborative editing
- Mentions (@user)
- Task lists with checkboxes
- Character count
- Markdown shortcuts

### Available In

PrimeReact (Quill), PrimeVue (Quill), Kibo UI (Tiptap), Tiptap, Plate, Novel, Lexical, Flowbite (WYSIWYG), Ant Design, Mantine

---

## Scroll Area

A custom scrollbar component that provides consistent styling across browsers while preserving native scroll behavior.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `'hover' \| 'scroll' \| 'auto' \| 'always'` | `'hover'` | Scrollbar visibility mode |
| `scrollHideDelay` | `number` | `600` | Auto-hide delay (ms) |
| `dir` | `'ltr' \| 'rtl'` | — | Scroll direction |
| `orientation` | `'vertical' \| 'horizontal' \| 'both'` | `'vertical'` | Scroll direction(s) |

### Sub-components

- **ScrollArea.Viewport** — Scrollable content container
- **ScrollArea.Scrollbar** — Custom scrollbar track (horizontal/vertical)
- **ScrollArea.Thumb** — Draggable scroll thumb
- **ScrollArea.Corner** — Corner element (when both scrollbars visible)

### Features

- Non-space-consuming overlay scrollbar
- Consistent cross-browser styling
- Native scroll behavior preserved (keyboard unaffected)
- Auto-hide on inactivity
- RTL support
- Horizontal and vertical scrolling

### Available In

Radix UI, shadcn/ui, Bits UI, Melt UI, Ark UI, Park UI, Svelte Radix, Oku UI, Svelte UX (as ScrollContainer), Mantine, Material UI

---

## Scroll Shadow

An indicator that shows shadows at the edges of scrollable content to hint that more content is available.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `orientation` | `'horizontal' \| 'vertical'` | — | Scroll direction |
| `size` | `number` | `40` | Shadow size in pixels |
| `offset` | `number` | `0` | Shadow offset |
| `visibility` | `'auto' \| 'always' \| 'never'` | `'auto'` | Shadow visibility |
| `hideScrollBar` | `boolean` | `false` | Hide native scrollbar |

### Features

- Automatic shadow based on scroll position
- Horizontal and vertical support
- Configurable shadow size and visibility

### Available In

HeroUI

---

## Searchbox

A text input optimized for search with clear button and optional suggestions.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | — | Search text |
| `defaultValue` | `string` | — | Initial value |
| `onChange` | `function` | — | Text change callback |
| `appearance` | `string` | — | Visual style |
| `size` | `string` | — | Input size |
| `disabled` | `boolean` | `false` | Disabled state |
| `dismiss` | `slot` | — | Clear/dismiss button |
| `contentBefore` | `slot` | — | Search icon |
| `contentAfter` | `slot` | — | Additional content |

### Features

- Search icon
- Clear/dismiss button
- Appearance variants
- Type-ahead suggestions

### Available In

Fluent UI, Carbon Svelte (as Search), Preline, Ant Design (as Input.Search), Kibo UI

---

## Segmented Control

A set of exclusive options displayed as connected buttons, similar to iOS-style segmented controls.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | — | Selected value |
| `defaultValue` | `string` | — | Initial selection |
| `onValueChange` | `function` | — | Selection change callback |
| `disabled` | `boolean` | `false` | Disabled state |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Layout direction |
| `name` | `string` | — | Form field name |

### Sub-components

- **SegmentedControl.Item** — Individual option (`value`, `disabled`)
- **SegmentedControl.Indicator** — Animated selection indicator
- **SegmentedControl.ItemText** — Option label
- **SegmentedControl.ItemHiddenInput** — Hidden radio input

### Features

- Animated sliding indicator
- Radio-button behavior (single selection)
- Keyboard navigation
- Form integration via hidden inputs

### Available In

Ark UI (as Segment Group), Park UI, Skeleton UI, Kobalte, SvelteUI, Carbon Svelte (as ContentSwitcher), Ant Design, Mantine


---

## Select

A dropdown menu for choosing a single value from a list of options. Replaces native `<select>` with custom styling and behavior.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | — | Controlled selected value |
| `defaultValue` | `string` | — | Initially selected value |
| `onValueChange` | `function` | — | Selection change callback |
| `open` | `boolean` | — | Controlled open state |
| `onOpenChange` | `function` | — | Open state callback |
| `disabled` | `boolean` | `false` | Disabled state |
| `required` | `boolean` | `false` | Required for form validation |
| `name` | `string` | — | Form field name |
| `placeholder` | `string` | — | Placeholder text |
| `multiple` | `boolean` | `false` | Allow multiple selections |
| `positioning` | `object` | — | Floating positioning config |
| `portal` | `boolean \| string` | `true` | Render in portal |
| `typeahead` | `boolean` | `true` | Enable type-to-select |
| `loop` | `boolean` | `false` | Loop keyboard navigation |
| `filter` | `boolean` | `false` | Enable search filtering |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Component size |
| `variant` | `'outline' \| 'filled' \| 'ghost'` | `'outline'` | Visual variant |

### Sub-components

- **Select.Trigger** — Button that opens the dropdown
- **Select.Value** — Displays the selected value
- **Select.Content** — Dropdown container
- **Select.Viewport** — Scrollable viewport
- **Select.Item** — Individual option (`value`, `disabled`, `textValue`)
- **Select.ItemText** — Option label
- **Select.ItemIndicator** — Selected checkmark
- **Select.Group** — Group of related options
- **Select.Label** — Group label
- **Select.Separator** — Visual divider
- **Select.ScrollUpButton** — Scroll up indicator
- **Select.ScrollDownButton** — Scroll down indicator
- **Select.Arrow** — Popover arrow
- **Select.Icon** — Trigger chevron icon
- **Select.HiddenSelect** — Hidden native select for forms

### Features

- Type-ahead character matching
- Keyboard navigation (arrow keys, home/end)
- Grouped options with labels
- Custom item rendering
- Form integration via hidden select
- Scroll indicators for long lists
- Portal rendering
- Search/filter support
- Virtualized rendering for large lists

### Available In

Radix UI, shadcn/ui, Bits UI, Melt UI, Ark UI, Park UI, Kobalte, Oku UI, Base UI, DaisyUI, Flowbite, Skeleton UI, HeroUI, Fluent UI, PrimeReact (as Dropdown), PrimeVue (as Select/Dropdown), Carbon Svelte, SvelteUI (as NativeSelect), Ant Design, Chakra UI, Mantine, Material UI, Preline, Kibo UI

---

## Sheet

A panel that slides in from the edge of the screen, used for supplementary content or actions. Similar to Drawer but typically used for settings, filters, or navigation.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | — | Controlled open state |
| `onOpenChange` | `function` | — | Open state callback |
| `side` | `'top' \| 'right' \| 'bottom' \| 'left'` | `'right'` | Slide-in direction |
| `modal` | `boolean` | `true` | Whether to render a modal overlay |

### Sub-components

- **Sheet.Trigger** — Element that opens the sheet
- **Sheet.Content** — Panel content container
- **Sheet.Header** — Title area
- **Sheet.Footer** — Action area
- **Sheet.Title** — Accessible title
- **Sheet.Description** — Accessible description
- **Sheet.Close** — Close button
- **Sheet.Overlay** — Backdrop overlay

### Features

- Slide-in animation from any edge
- Focus trapping
- Scroll locking
- Nested sheets
- Keyboard dismiss (Escape)

### Available In

shadcn/ui, Bits UI, Park UI, Skeleton UI, HeroUI (as Drawer variant)

---

## Sidebar

A fixed or collapsible navigation panel, typically on the left side of the layout.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `collapsed` | `boolean` | `false` | Whether sidebar is collapsed |
| `collapsible` | `'offcanvas' \| 'icon' \| 'none'` | `'offcanvas'` | Collapse behavior |
| `side` | `'left' \| 'right'` | `'left'` | Which side to display |
| `variant` | `'sidebar' \| 'floating' \| 'inset'` | `'sidebar'` | Visual variant |
| `width` | `string` | `'16rem'` | Expanded width |
| `collapsedWidth` | `string` | `'3rem'` | Collapsed width |

### Sub-components

- **Sidebar.Header** — Top area (logo, branding)
- **Sidebar.Content** — Scrollable body
- **Sidebar.Footer** — Bottom area (user info, settings)
- **Sidebar.Group** — Navigation group
- **Sidebar.GroupLabel** — Group heading
- **Sidebar.Menu** — Menu container
- **Sidebar.MenuItem** — Individual item
- **Sidebar.MenuButton** — Clickable item button
- **Sidebar.MenuSub** — Nested submenu
- **Sidebar.Separator** — Visual divider
- **Sidebar.Rail** — Slim toggle rail
- **Sidebar.Trigger** — Toggle button
- **Sidebar.Inset** — Main content area offset

### Features

- Collapsible with icon-only mode
- Responsive behavior (offcanvas on mobile)
- Nested submenus
- Keyboard navigation
- Cookie/localStorage persistence
- Multiple variants (floating, inset)

### Available In

shadcn/ui, PrimeReact, PrimeVue, Flowbite, Carbon Svelte (as SideNav), Fluent UI (as NavDrawer), Ant Design (as Layout.Sider), Preline

---

## Signature Pad

A drawing canvas for capturing handwritten signatures via mouse, touch, or stylus input.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | — | Signature data (Data URL or SVG) |
| `onValueChange` | `function` | — | Value change callback |
| `disabled` | `boolean` | `false` | Disabled state |
| `drawing` | `object` | — | Drawing options (color, width, smoothing) |
| `format` | `'image/png' \| 'image/svg+xml'` | `'image/png'` | Output format |

### Sub-components

- **SignaturePad.Control** — Canvas container
- **SignaturePad.Segment** — Path segment
- **SignaturePad.Guide** — Signature line guide
- **SignaturePad.ClearTrigger** — Clear button
- **SignaturePad.Label** — Accessible label

### Features

- Pressure-sensitive drawing
- Smooth Bézier curve interpolation
- Export as PNG or SVG
- Clear/undo support
- Touch and stylus support

### Available In

Ark UI, Park UI

---

## Skeleton

A placeholder component that mimics content layout while data is loading, reducing perceived load time.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'text' \| 'circular' \| 'rectangular' \| 'rounded' \| 'wave'` | `'text'` | Shape variant |
| `width` | `string \| number` | `'100%'` | Width |
| `height` | `string \| number` | — | Height |
| `animation` | `'pulse' \| 'wave' \| 'none'` | `'pulse'` | Animation type |
| `count` | `number` | `1` | Number of skeleton rows |
| `circle` | `boolean` | `false` | Circular shape |
| `loading` | `boolean` | `true` | Show skeleton vs children |

### Features

- Multiple shape variants (text, circle, rectangle)
- Pulse and wave animations
- Composable layout (stack multiple)
- Conditional rendering (show/hide when loaded)

### Available In

shadcn/ui, DaisyUI, Flowbite, Skeleton UI, HeroUI, Fluent UI, PrimeReact, PrimeVue, Carbon Svelte (as SkeletonPlaceholder/SkeletonText), Ant Design, Chakra UI, Mantine, Material UI, Preline, Kibo UI

---

## Slider

A draggable control for selecting a numeric value or range within a given bounds.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number \| number[]` | — | Current value(s) |
| `defaultValue` | `number \| number[]` | — | Initial value(s) |
| `onValueChange` | `function` | — | Value change callback |
| `onValueCommit` | `function` | — | Committed value callback (on release) |
| `min` | `number` | `0` | Minimum value |
| `max` | `number` | `100` | Maximum value |
| `step` | `number` | `1` | Step increment |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Slider orientation |
| `disabled` | `boolean` | `false` | Disabled state |
| `inverted` | `boolean` | `false` | Invert direction |
| `minStepsBetweenThumbs` | `number` | `0` | Minimum gap between range thumbs |
| `marks` | `array` | — | Tick marks along the track |
| `showTooltip` | `boolean` | `false` | Show value tooltip on thumb |
| `color` | `string` | — | Theme color |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Component size |

### Sub-components

- **Slider.Root** — Container
- **Slider.Track** — Track bar
- **Slider.Range** — Filled portion
- **Slider.Thumb** — Draggable handle
- **Slider.Marker** — Tick mark
- **Slider.MarkerGroup** — Tick mark container
- **Slider.ValueText** — Current value display
- **Slider.Label** — Accessible label
- **Slider.Control** — Track + thumb container
- **Slider.HiddenInput** — Hidden range input

### Features

- Single and range (multi-thumb) modes
- Keyboard navigation (arrow keys, page up/down)
- Step snapping and tick marks
- Vertical and horizontal orientation
- Value tooltip on hover/drag
- Form integration

### Available In

Radix UI, shadcn/ui, Bits UI, Melt UI, Ark UI, Park UI, Kobalte, Oku UI, Base UI, DaisyUI, Flowbite, Skeleton UI, HeroUI, Fluent UI, PrimeReact, PrimeVue, Carbon Svelte, SvelteUI, Ant Design, Chakra UI, Mantine, Material UI, Preline, Kibo UI

---

## Snippet

A styled container for displaying short code or text snippets with a copy button.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | `string \| string[]` | — | Code text to display |
| `symbol` | `string` | `'$'` | Line prefix symbol |
| `color` | `string` | `'default'` | Theme color |
| `variant` | `'bordered' \| 'flat' \| 'shadow'` | `'flat'` | Visual variant |
| `hideSymbol` | `boolean` | `false` | Hide the prefix symbol |
| `copyable` | `boolean` | `true` | Show copy button |
| `timeout` | `number` | `2000` | Copy feedback duration (ms) |

### Features

- One-click copy to clipboard
- Multi-line support
- Line prefix symbols
- Copy feedback animation
- Syntax highlighting

### Available In

HeroUI, Kibo UI, Preline (as code blocks)

---

## Sonner

A toast notification system with stacked, swipeable notifications and rich content support.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `position` | `'top-left' \| 'top-center' \| 'top-right' \| 'bottom-left' \| 'bottom-center' \| 'bottom-right'` | `'bottom-right'` | Toast position |
| `expand` | `boolean` | `false` | Expand all toasts |
| `duration` | `number` | `4000` | Auto-dismiss duration (ms) |
| `visibleToasts` | `number` | `3` | Max visible toasts |
| `closeButton` | `boolean` | `false` | Show close button |
| `richColors` | `boolean` | `false` | Enhanced color scheme |
| `theme` | `'light' \| 'dark' \| 'system'` | `'system'` | Theme mode |
| `gap` | `number` | `14` | Gap between toasts |
| `offset` | `string \| number` | — | Edge offset |
| `dir` | `'ltr' \| 'rtl'` | `'ltr'` | Text direction |
| `hotkey` | `string[]` | `['altKey', 'KeyT']` | Focus hotkey |
| `toastOptions` | `object` | — | Default options for all toasts |
| `invert` | `boolean` | `false` | Invert colors |
| `pauseWhenPageIsHidden` | `boolean` | `false` | Pause timer when tab hidden |

### Features

- Stacked toast animation
- Swipe to dismiss
- Promise-based toasts (loading → success/error)
- Action buttons within toasts
- Rich content (descriptions, custom JSX)
- Keyboard accessible (hotkey focus)
- Headless mode

### Available In

Sonner (standalone), shadcn/ui, Park UI, Skeleton UI

---

## Spacer

A flexible empty space component for adding consistent spacing between elements.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `x` | `number` | — | Horizontal spacing |
| `y` | `number` | — | Vertical spacing |
| `flex` | `boolean` | `true` | Use flex grow |

### Features

- Flex-based spacing
- Directional control
- Consistent spacing scale

### Available In

HeroUI, Chakra UI, SvelteUI (as Space)

---

## Speed Dial

A floating action button that expands to reveal a set of related actions.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `model` | `array` | — | Menu items (icon, label, command) |
| `direction` | `'up' \| 'down' \| 'left' \| 'right'` | `'up'` | Expansion direction |
| `type` | `'linear' \| 'circle' \| 'semi-circle' \| 'quarter-circle'` | `'linear'` | Layout pattern |
| `radius` | `number` | `0` | Circle radius |
| `mask` | `boolean` | `false` | Show backdrop mask |
| `disabled` | `boolean` | `false` | Disabled state |
| `visible` | `boolean` | `false` | Controlled visibility |
| `showIcon` | `string` | — | Icon when closed |
| `hideIcon` | `string` | — | Icon when open |
| `transitionDelay` | `number` | `30` | Stagger delay per item (ms) |

### Features

- Multiple layout patterns (linear, circle, semi-circle)
- Staggered animation
- Backdrop mask
- Custom icons
- Tooltip labels

### Available In

PrimeReact, PrimeVue, Material UI (as SpeedDial/Fab), Flowbite

---

## Spinner

An animated loading indicator showing that an operation is in progress.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Spinner size |
| `color` | `string` | `'primary'` | Theme color |
| `label` | `string` | `'Loading...'` | Accessible label |
| `variant` | `'border' \| 'grow' \| 'dots' \| 'bars'` | `'border'` | Animation variant |
| `speed` | `string` | `'0.75s'` | Animation speed |

### Features

- Multiple animation styles
- Accessible labeling
- Color variants
- Size presets

### Available In

HeroUI, Flowbite, Chakra UI, DaisyUI (as Loading), SvelteUI (as Loader), Carbon Svelte (as Loading), Mantine (as Loader), Skeleton UI (as ProgressRadial)

---

## Stat

A display component for key metrics or KPIs, typically showing a value, label, and optional trend indicator.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | — | Metric label |
| `value` | `string \| number` | — | Metric value |
| `helpText` | `string` | — | Supporting description |

### Sub-components

- **Stat.Label** — Metric name
- **Stat.Number** — Primary value
- **Stat.HelpText** — Description or trend
- **Stat.Arrow** — Trend indicator (up/down)
- **Stat.Group** — Multiple stats in a row

### Features

- Trend indicators (increase/decrease arrows)
- Grouping for dashboards
- Icon support
- Responsive layout

### Available In

Chakra UI, DaisyUI, Ant Design (as Statistic), Mantine (as StatsGroup)

---

## Stepper

A multi-step progress indicator showing the current position in a sequential workflow.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `activeStep` | `number` | `0` | Current active step |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Layout direction |
| `linear` | `boolean` | `false` | Enforce sequential completion |
| `model` | `array` | — | Step definitions |
| `readonly` | `boolean` | `false` | Non-interactive display |

### Sub-components

- **Stepper.Step** — Individual step (`label`, `description`, `icon`, `optional`)
- **Stepper.Separator** — Line between steps
- **Stepper.Trigger** — Clickable step header
- **Stepper.Content** — Step body content
- **Stepper.Indicator** — Step number/icon circle

### Features

- Linear and non-linear navigation
- Step validation
- Custom icons per step
- Vertical and horizontal layouts
- Error and completed states

### Available In

PrimeReact (as Steps/Stepper), PrimeVue (as Stepper/Steps), Material UI, Carbon Svelte (as ProgressIndicator), Ant Design (as Steps), Mantine, Fluent UI, Flowbite, Preline

---

## Swap

A component that toggles between two visual states (e.g., icons, text) with an animation.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `active` | `boolean` | `false` | Current state |
| `effect` | `'rotate' \| 'flip' \| 'none'` | `'rotate'` | Transition animation |

### Sub-components

- **Swap.On** — Content when active
- **Swap.Off** — Content when inactive

### Features

- Rotate and flip animations
- Checkbox-based toggle
- Custom content for each state

### Available In

DaisyUI

---

## Switch

A toggle control that represents an on/off state, similar to a physical light switch.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `checked` | `boolean` | — | Controlled checked state |
| `defaultChecked` | `boolean` | `false` | Initial checked state |
| `onCheckedChange` | `function` | — | State change callback |
| `disabled` | `boolean` | `false` | Disabled state |
| `required` | `boolean` | `false` | Required for forms |
| `name` | `string` | — | Form field name |
| `value` | `string` | `'on'` | Form submission value |
| `label` | `string` | — | Accessible label |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Component size |
| `color` | `string` | `'primary'` | Theme color |
| `thumbIcon` | `element` | — | Icon inside the thumb |
| `startContent` | `element` | — | Content before thumb |
| `endContent` | `element` | — | Content after thumb |

### Sub-components

- **Switch.Thumb** — Sliding indicator
- **Switch.Label** — Associated label
- **Switch.HiddenInput** — Hidden checkbox for forms
- **Switch.Control** — Track container

### Features

- Smooth sliding animation
- Keyboard toggle (Space)
- Form integration
- Custom thumb icons
- Start/end content slots
- Indeterminate state (some libraries)

### Available In

Radix UI, shadcn/ui, Bits UI, Melt UI, Ark UI, Park UI, Kobalte, Oku UI, Base UI, DaisyUI (as Toggle), Flowbite, Skeleton UI (as SlideToggle), HeroUI, Fluent UI, PrimeReact (as ToggleSwitch), PrimeVue (as ToggleSwitch), Carbon Svelte, SvelteUI, Ant Design, Chakra UI, Mantine, Material UI, Preline, Kibo UI

---

## Table

A structured data display component with rows and columns, supporting sorting, filtering, pagination, and selection.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `array` | — | Row data |
| `columns` | `array` | — | Column definitions |
| `sortable` | `boolean` | `false` | Enable column sorting |
| `selectable` | `boolean` | `false` | Enable row selection |
| `paginator` | `boolean` | `false` | Enable pagination |
| `rows` | `number` | `10` | Rows per page |
| `stripedRows` | `boolean` | `false` | Alternating row colors |
| `stickyHeader` | `boolean` | `false` | Fixed header on scroll |
| `resizableColumns` | `boolean` | `false` | Draggable column widths |
| `reorderableColumns` | `boolean` | `false` | Drag-to-reorder columns |
| `virtualScroll` | `boolean` | `false` | Virtualized rendering |
| `loading` | `boolean` | `false` | Loading state |
| `emptyMessage` | `string` | — | Empty state message |
| `globalFilter` | `string` | — | Global search term |
| `expandedRows` | `array` | — | Expanded row keys |
| `rowGroupMode` | `'subheader' \| 'rowspan'` | — | Row grouping mode |

### Sub-components

- **Table.Header** — Column headers container
- **Table.Body** — Rows container
- **Table.Row** — Individual row
- **Table.Head** — Header cell
- **Table.Cell** — Data cell
- **Table.Footer** — Footer row
- **Table.Caption** — Accessible caption
- **Table.ColumnHeader** — Sortable header
- **Table.RowExpansion** — Expandable row detail

### Features

- Column sorting (single/multi)
- Row selection (single/multi/checkbox)
- Pagination (client/server)
- Global and column filters
- Row expansion
- Column resizing and reordering
- Virtual scrolling for large datasets
- Row grouping
- Frozen columns/rows
- CSV/Excel export
- Context menu integration
- Cell editing (inline)
- Drag-and-drop row reordering

### Available In

shadcn/ui, DaisyUI, Flowbite, Skeleton UI, HeroUI, Fluent UI (as DataGrid), PrimeReact (as DataTable), PrimeVue (as DataTable), Carbon Svelte (as DataTable), Ant Design, Chakra UI, Mantine, Material UI, TanStack Table, Preline, Kibo UI

---

## Tabs

A set of layered content panels, where only one panel is visible at a time.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | — | Active tab value |
| `defaultValue` | `string` | — | Initially active tab |
| `onValueChange` | `function` | — | Tab change callback |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Layout direction |
| `activationMode` | `'automatic' \| 'manual'` | `'automatic'` | Focus vs click activation |
| `loop` | `boolean` | `true` | Loop keyboard navigation |
| `variant` | `'default' \| 'outline' \| 'pills' \| 'underline'` | `'default'` | Visual style |
| `fitted` | `boolean` | `false` | Equal width tabs |

### Sub-components

- **Tabs.List** — Tab button container
- **Tabs.Trigger** — Tab button (`value`, `disabled`)
- **Tabs.Content** — Associated panel (`value`)
- **Tabs.Indicator** — Animated active indicator

### Features

- Keyboard navigation (arrow keys, home/end)
- Automatic or manual activation
- Vertical and horizontal layouts
- Animated active indicator
- Lazy content loading
- Closeable/removable tabs
- Scrollable tab list
- Icon and badge support

### Available In

Radix UI, shadcn/ui, Bits UI, Melt UI, Ark UI, Park UI, Kobalte, Oku UI, Base UI, DaisyUI, Flowbite, Skeleton UI, HeroUI, Fluent UI, PrimeReact (as TabView), PrimeVue (as Tabs), Carbon Svelte, SvelteUI, Ant Design, Chakra UI, Mantine, Material UI, Preline, Kibo UI

---

## Tags Input

A text input that converts typed text into tags/chips on Enter or delimiter, with removal via backspace or click.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string[]` | — | Current tags |
| `defaultValue` | `string[]` | `[]` | Initial tags |
| `onValueChange` | `function` | — | Tags change callback |
| `addOnPaste` | `boolean` | `false` | Parse pasted text into tags |
| `delimiter` | `string \| RegExp` | `','` | Tag separator |
| `max` | `number` | `Infinity` | Maximum tags |
| `allowDuplicates` | `boolean` | `false` | Allow duplicate values |
| `editable` | `boolean` | `false` | Edit existing tags inline |
| `validate` | `function` | — | Validation before adding |
| `disabled` | `boolean` | `false` | Disabled state |
| `placeholder` | `string` | — | Input placeholder |
| `blurBehavior` | `'clear' \| 'add'` | `'clear'` | Behavior on blur |

### Sub-components

- **TagsInput.Control** — Container
- **TagsInput.Input** — Text input
- **TagsInput.Item** — Individual tag (`value`)
- **TagsInput.ItemText** — Tag label
- **TagsInput.ItemDeleteTrigger** — Remove button
- **TagsInput.ItemPreview** — Tag preview
- **TagsInput.Label** — Accessible label
- **TagsInput.ClearTrigger** — Clear all button
- **TagsInput.HiddenInput** — Hidden input for forms

### Features

- Add on Enter, comma, or custom delimiter
- Remove via backspace or click
- Paste-to-add support
- Duplicate prevention
- Max tag limit
- Inline editing
- Drag-to-reorder tags
- Custom validation
- Form integration

### Available In

Ark UI, Park UI, Bits UI, Melt UI, shadcn/ui, Kobalte, Carbon Svelte (as Tag), Chakra UI, Mantine (as TagsInput), Ant Design (as Select mode=tags), Kibo UI

---

## Terminal

A command-line terminal display component for showing code execution or CLI output.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `lines` | `array` | — | Terminal output lines |
| `title` | `string` | `'Terminal'` | Window title |
| `prompt` | `string` | `'$'` | Command prompt symbol |
| `animated` | `boolean` | `false` | Typing animation |
| `theme` | `'dark' \| 'light'` | `'dark'` | Color theme |

### Features

- Syntax-highlighted output
- Typing animation
- Window chrome (title bar, buttons)
- Copy button
- Scrollable output

### Available In

Magic UI, Stunning UI, Aceternity UI, HyperUI

---

## Textarea

A multi-line text input for longer form content like comments, descriptions, or messages.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | — | Controlled value |
| `defaultValue` | `string` | — | Initial value |
| `placeholder` | `string` | — | Placeholder text |
| `rows` | `number` | `3` | Visible rows |
| `maxLength` | `number` | — | Character limit |
| `autoResize` | `boolean` | `false` | Auto-grow with content |
| `disabled` | `boolean` | `false` | Disabled state |
| `readonly` | `boolean` | `false` | Read-only state |
| `resize` | `'none' \| 'both' \| 'vertical' \| 'horizontal'` | `'vertical'` | Resize behavior |
| `variant` | `'outline' \| 'filled' \| 'flushed'` | `'outline'` | Visual variant |

### Features

- Auto-resize to content
- Character count display
- Min/max rows constraint
- Form validation integration

### Available In

shadcn/ui, DaisyUI, Flowbite, Skeleton UI, HeroUI, Fluent UI, PrimeReact, PrimeVue, Carbon Svelte, SvelteUI, Ant Design (as Input.TextArea), Chakra UI, Mantine, Material UI, Preline, Kibo UI

---

## Theme Controller

A toggle or selector that switches between light, dark, and custom themes.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `theme` | `string` | — | Active theme name |
| `themes` | `string[]` | — | Available themes |
| `strategy` | `'attribute' \| 'class'` | `'attribute'` | Theme application method |
| `storageKey` | `string` | `'theme'` | localStorage key |

### Features

- Light/dark/system detection
- Multiple theme support (DaisyUI has 30+)
- Persistence via localStorage
- Toggle, dropdown, and swap variants
- System preference detection

### Available In

DaisyUI, shadcn/ui (as ThemeToggle), Skeleton UI (as LightSwitch/ThemeSelector), Flowbite

---

## Time Picker

An input component for selecting a time value with hour, minute, and optional second/period fields.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Date \| string` | — | Selected time |
| `defaultValue` | `Date \| string` | — | Initial time |
| `onValueChange` | `function` | — | Time change callback |
| `hourCycle` | `12 \| 24` | `24` | 12 or 24 hour format |
| `granularity` | `'hour' \| 'minute' \| 'second'` | `'minute'` | Time precision |
| `minValue` | `Date \| string` | — | Minimum time |
| `maxValue` | `Date \| string` | — | Maximum time |
| `stepMinute` | `number` | `1` | Minute step increment |
| `disabled` | `boolean` | `false` | Disabled state |
| `showSeconds` | `boolean` | `false` | Show seconds field |

### Sub-components

- **TimePicker.Input** — Combined time input
- **TimePicker.HourField** — Hour segment
- **TimePicker.MinuteField** — Minute segment
- **TimePicker.SecondField** — Second segment
- **TimePicker.Period** — AM/PM selector

### Features

- Segmented input fields
- AM/PM toggle
- Keyboard increment/decrement
- Time range constraints
- Dropdown time list
- Locale-aware formatting

### Available In

Bits UI (as TimeField), PrimeReact (as Calendar timeOnly), PrimeVue (as DatePicker timeOnly), Ant Design (as TimePicker), Mantine (as TimeInput), Carbon Svelte (as TimePicker), Flowbite

---

## Timeline

A vertical or horizontal sequence of events or steps displayed chronologically.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `array` | — | Timeline events |
| `layout` | `'vertical' \| 'horizontal'` | `'vertical'` | Orientation |
| `align` | `'left' \| 'right' \| 'alternate'` | `'left'` | Content alignment |

### Sub-components

- **Timeline.Item** — Individual event
- **Timeline.Separator** — Line between events
- **Timeline.Connector** — Connecting line
- **Timeline.Dot** — Event marker
- **Timeline.Content** — Event content
- **Timeline.OppositeContent** — Content on opposite side (alternate mode)

### Features

- Alternate left/right layout
- Custom markers/icons per event
- Horizontal and vertical orientations
- Color and status indicators
- Animated entry

### Available In

PrimeReact, PrimeVue, Material UI, Flowbite, DaisyUI, Ant Design, Mantine, Carbon Svelte (as ProgressIndicator), Preline

---

## Toast

A brief, auto-dismissing notification that appears temporarily to provide feedback.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | — | Toast title |
| `description` | `string` | — | Toast message |
| `type` | `'info' \| 'success' \| 'warning' \| 'error' \| 'loading'` | `'info'` | Toast type |
| `duration` | `number` | `5000` | Auto-dismiss time (ms) |
| `position` | `string` | `'bottom-right'` | Screen position |
| `action` | `object` | — | Action button config |
| `onDismiss` | `function` | — | Dismiss callback |
| `closable` | `boolean` | `true` | Show close button |

### Sub-components

- **Toast.Provider** — Context provider (placement config)
- **Toast.Root** — Toast container
- **Toast.Title** — Title text
- **Toast.Description** — Body text
- **Toast.Action** — Action button
- **Toast.Close** — Dismiss button
- **Toast.Viewport** — Positioning container

### Features

- Auto-dismiss with countdown
- Swipe to dismiss
- Action buttons
- Stacking and queuing
- Promise-based (loading → result)
- Pause on hover
- Multiple positions
- Custom rendering

### Available In

Radix UI, shadcn/ui (via Sonner), Bits UI, Melt UI, Ark UI, Park UI, Kobalte, DaisyUI, Flowbite, Skeleton UI, HeroUI, Fluent UI, PrimeReact, PrimeVue, Carbon Svelte (as ToastNotification), SvelteUI (as Notification), Ant Design (as message/notification), Chakra UI, Mantine (as Notifications), Material UI (as Snackbar), Preline, Kibo UI

---

## Toggle

A two-state button that can be toggled on or off, with visual pressed/unpressed states.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `pressed` | `boolean` | — | Controlled pressed state |
| `defaultPressed` | `boolean` | `false` | Initial pressed state |
| `onPressedChange` | `function` | — | State change callback |
| `disabled` | `boolean` | `false` | Disabled state |
| `variant` | `'default' \| 'outline'` | `'default'` | Visual variant |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Component size |

### Features

- Toggle between pressed and unpressed
- Keyboard activation (Enter/Space)
- ARIA pressed attribute
- Visual state change
- Icon toggle support

### Available In

Radix UI, shadcn/ui, Bits UI, Melt UI, Kobalte, Oku UI, Fluent UI (as ToggleButton), Ark UI, Park UI, Kibo UI

---

## Toggle Group

A set of toggle buttons where one or multiple can be pressed simultaneously.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `'single' \| 'multiple'` | `'single'` | Selection mode |
| `value` | `string \| string[]` | — | Controlled value |
| `defaultValue` | `string \| string[]` | — | Initial value |
| `onValueChange` | `function` | — | Value change callback |
| `disabled` | `boolean` | `false` | Disabled state |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Layout direction |
| `loop` | `boolean` | `true` | Loop keyboard navigation |
| `rovingFocus` | `boolean` | `true` | Roving tabindex |

### Sub-components

- **ToggleGroup.Item** — Individual toggle (`value`, `disabled`)

### Features

- Single or multiple selection
- Roving focus management
- Keyboard navigation
- Exclusive selection mode
- Toolbar integration

### Available In

Radix UI, shadcn/ui, Bits UI, Melt UI, Ark UI, Park UI, Kobalte, Oku UI, Fluent UI, Kibo UI

---

## Toolbar

A container for grouping related actions and controls, typically with buttons, toggles, and separators.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Layout direction |
| `loop` | `boolean` | `true` | Loop keyboard navigation |

### Sub-components

- **Toolbar.Button** — Action button
- **Toolbar.Link** — Navigation link
- **Toolbar.Separator** — Visual divider
- **Toolbar.ToggleGroup** — Embedded toggle group
- **Toolbar.ToggleItem** — Toggle within group

### Features

- Keyboard navigation (arrow keys)
- Roving tabindex
- Overflow menu for responsive layouts
- Separator grouping
- Toggle integration

### Available In

Radix UI, Bits UI, Melt UI, Kobalte, Oku UI, PrimeReact, PrimeVue, Carbon Svelte, Fluent UI, Material UI (as AppBar/Toolbar)

---

## Tooltip

A floating text label that appears on hover or focus to describe an element.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `string \| element` | — | Tooltip content |
| `open` | `boolean` | — | Controlled open state |
| `defaultOpen` | `boolean` | `false` | Initially open |
| `onOpenChange` | `function` | — | Open state callback |
| `delayDuration` | `number` | `700` | Show delay (ms) |
| `skipDelayDuration` | `number` | `300` | Skip delay for nearby tooltips |
| `side` | `'top' \| 'right' \| 'bottom' \| 'left'` | `'top'` | Preferred position |
| `sideOffset` | `number` | `0` | Distance from trigger |
| `align` | `'start' \| 'center' \| 'end'` | `'center'` | Alignment |
| `portal` | `boolean \| string` | `true` | Render in portal |
| `arrow` | `boolean` | `true` | Show arrow |
| `closeOnClick` | `boolean` | `true` | Dismiss on click |
| `color` | `string` | — | Theme color |
| `placement` | `string` | `'top'` | Floating UI placement |
| `interactive` | `boolean` | `false` | Allow hovering tooltip content |

### Sub-components

- **Tooltip.Provider** — Shared delay context
- **Tooltip.Root** — State container
- **Tooltip.Trigger** — Hover/focus target
- **Tooltip.Content** — Floating content
- **Tooltip.Arrow** — Pointing arrow
- **Tooltip.Portal** — Portal container
- **Tooltip.Positioner** — Positioning wrapper

### Features

- Show delay with skip behavior
- Collision-aware positioning
- Portal rendering
- Custom content (rich tooltips)
- Arrow pointer
- Touch-accessible
- Provider for shared state across tooltips

### Available In

Radix UI, shadcn/ui, Bits UI, Melt UI, Ark UI, Park UI, Kobalte, Oku UI, Base UI, DaisyUI, Flowbite, Skeleton UI, HeroUI, Fluent UI, PrimeReact, PrimeVue, Carbon Svelte, SvelteUI, Ant Design, Chakra UI, Mantine, Material UI, Preline, Kibo UI

---

## Tour

A guided walkthrough that highlights UI elements with popover explanations to onboard users.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `steps` | `array` | — | Tour step definitions (target, title, content) |
| `open` | `boolean` | — | Controlled visibility |
| `current` | `number` | `0` | Current step index |
| `onClose` | `function` | — | Close callback |
| `mask` | `boolean` | `true` | Dim non-highlighted areas |
| `arrow` | `boolean` | `true` | Show pointer arrow |
| `type` | `'default' \| 'primary'` | `'default'` | Visual style |
| `placement` | `string` | `'bottom'` | Popover placement |
| `gap` | `object` | — | Padding around highlighted element |
| `scrollIntoViewOptions` | `object` | — | Scroll behavior |

### Features

- Step-by-step element highlighting
- Backdrop masking
- Keyboard navigation
- Scroll into view
- Skip and close controls
- Custom rendering per step

### Available In

Ant Design, Bits UI (as Tour), PrimeReact (as Steps + Dialog pattern), Mantine (as Spotlight), Preline

---

## Tree View

A hierarchical data display showing expandable/collapsible parent-child relationships.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `array` | — | Tree node data |
| `expandedKeys` | `string[]` | — | Expanded node keys |
| `selectedKeys` | `string[]` | — | Selected node keys |
| `selectionMode` | `'single' \| 'multiple' \| 'checkbox'` | `'single'` | Selection behavior |
| `onExpand` | `function` | — | Expand callback |
| `onSelect` | `function` | — | Selection callback |
| `filter` | `boolean` | `false` | Enable search filtering |
| `dragDrop` | `boolean` | `false` | Enable drag and drop |
| `loading` | `boolean` | `false` | Loading state |
| `virtualScroll` | `boolean` | `false` | Virtualized rendering |

### Sub-components

- **TreeView.Root** — Container
- **TreeView.Item** — Tree node
- **TreeView.Branch** — Expandable parent
- **TreeView.BranchContent** — Children container
- **TreeView.BranchTrigger** — Expand/collapse toggle
- **TreeView.BranchIndicator** — Chevron icon
- **TreeView.ItemText** — Node label

### Features

- Expand/collapse with animation
- Single/multi/checkbox selection
- Keyboard navigation (arrow keys)
- Drag and drop reordering
- Lazy loading children
- Search/filter
- Context menu integration
- Virtual scrolling for large trees
- Custom node rendering

### Available In

Ark UI, Park UI, Bits UI, shadcn/ui, PrimeReact (as Tree), PrimeVue (as Tree), Fluent UI, Ant Design, Material UI (as TreeView), Carbon Svelte (as TreeView), Mantine, Preline

---

## Tree Select

A dropdown selector that displays options in a hierarchical tree structure, combining Tree View with Select.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string \| string[]` | — | Selected value(s) |
| `options` | `array` | — | Tree option data |
| `selectionMode` | `'single' \| 'multiple' \| 'checkbox'` | `'single'` | Selection mode |
| `filter` | `boolean` | `false` | Enable search |
| `placeholder` | `string` | — | Placeholder text |
| `disabled` | `boolean` | `false` | Disabled state |
| `expandedKeys` | `object` | — | Expanded node keys |
| `metaKeySelection` | `boolean` | `false` | Require meta key for multi-select |

### Features

- Hierarchical option display
- Search/filter within tree
- Checkbox selection mode
- Lazy loading branches
- Chip display for selected items

### Available In

PrimeReact (as TreeSelect), PrimeVue (as TreeSelect), Ant Design (as TreeSelect)

---

## Typography

A set of text components for headings, paragraphs, and inline text with consistent styling.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'h1' \| 'h2' \| 'h3' \| 'h4' \| 'body1' \| 'body2' \| 'caption' \| 'overline'` | `'body1'` | Text variant |
| `as` | `string` | — | Rendered HTML element |
| `color` | `string` | `'inherit'` | Text color |
| `align` | `'left' \| 'center' \| 'right' \| 'justify'` | `'inherit'` | Text alignment |
| `gutterBottom` | `boolean` | `false` | Bottom margin |
| `noWrap` | `boolean` | `false` | Truncate with ellipsis |
| `gradient` | `object` | — | Gradient text effect |
| `truncate` | `boolean \| number` | `false` | Line clamp truncation |
| `order` | `number` | — | Heading hierarchy order |

### Sub-components

- **Title** — Heading text (h1–h6)
- **Text** — Body text
- **Mark** — Highlighted text
- **Highlight** — Search-match highlighting
- **Blockquote** — Quoted text
- **Code** — Inline code
- **List** — Styled list

### Features

- Semantic HTML mapping
- Gradient text effects
- Line clamping / truncation
- Responsive font sizing
- Polymorphic `as` prop

### Available In

Material UI, Chakra UI, Mantine, Ant Design, SvelteUI, Carbon Svelte, Fluent UI, Preline

---

## Vaul Drawer

A drawer component specifically designed for mobile with touch-based pull-to-dismiss interaction, inspired by native mobile sheets.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | — | Controlled open state |
| `onOpenChange` | `function` | — | Open state callback |
| `snapPoints` | `(number \| string)[]` | — | Snap positions (fractions or CSS values) |
| `activeSnapPoint` | `number \| string` | — | Current snap point |
| `fadeFromIndex` | `number` | — | Snap index to start overlay fade |
| `shouldScaleBackground` | `boolean` | `false` | Scale background content |
| `modal` | `boolean` | `true` | Modal mode |
| `dismissible` | `boolean` | `true` | Can be swiped away |
| `direction` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'bottom'` | Drawer direction |
| `nested` | `boolean` | `false` | Nested drawer mode |
| `noBodyStyles` | `boolean` | `false` | Skip body scroll lock |

### Sub-components

- **Drawer.Root** — State container
- **Drawer.Trigger** — Open trigger
- **Drawer.Content** — Drawer panel
- **Drawer.Overlay** — Backdrop
- **Drawer.Handle** — Pull handle
- **Drawer.Title** — Accessible title
- **Drawer.Description** — Accessible description
- **Drawer.Close** — Close trigger
- **Drawer.NestedRoot** — Nested drawer container

### Features

- Touch-based pull-to-dismiss
- Snap points with spring physics
- Background scaling effect
- Nested drawer support
- Direction variants (all 4 edges)
- Non-modal mode
- Scroll-aware dismiss (scrolls content before dismissing)

### Available In

Vaul (standalone), shadcn/ui (as Drawer), Bits UI (as Drawer), Park UI

---

## Virtual Scroller

A component that renders only visible items from a large list, providing smooth scrolling performance.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `array` | — | Full data array |
| `itemSize` | `number \| function` | — | Item height (fixed or dynamic) |
| `overscan` | `number` | `5` | Extra items rendered beyond viewport |
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | Scroll direction |
| `scrollToIndex` | `number` | — | Programmatic scroll target |
| `estimateSize` | `function` | — | Size estimator for dynamic items |
| `getScrollElement` | `function` | — | Custom scroll container |
| `measureElement` | `function` | — | Dynamic measurement callback |

### Features

- Fixed and variable height items
- Horizontal and vertical scrolling
- Dynamic item measurement
- Smooth programmatic scrolling
- Infinite scroll support
- Grid/masonry layouts

### Available In

PrimeReact (as VirtualScroller), PrimeVue (as VirtualScroller), TanStack Virtual, Material UI (via react-window), Mantine (as ScrollArea + virtualizer)

---

## Watermark

An overlay pattern rendered across content to indicate ownership, draft status, or prevent unauthorized use.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `string \| string[]` | — | Watermark text |
| `image` | `string` | — | Watermark image URL |
| `width` | `number` | `120` | Single mark width |
| `height` | `number` | `64` | Single mark height |
| `rotate` | `number` | `-22` | Rotation angle |
| `gap` | `[number, number]` | `[100, 100]` | Spacing between marks |
| `offset` | `[number, number]` | — | Position offset |
| `font` | `object` | — | Font style (color, size, weight, family) |
| `zIndex` | `number` | `9` | Stack order |
| `inherit` | `boolean` | `false` | Inherit parent font |

### Features

- Text and image watermarks
- Repeating pattern
- Rotation and spacing control
- Anti-tamper (MutationObserver re-renders if removed)
- Multi-line text support

### Available In

Ant Design, Mantine (as custom), PrimeVue (as Watermark)

---

## Window

A draggable, resizable window panel that mimics desktop OS windows, with title bar, minimize, maximize, and close controls.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | — | Window title |
| `draggable` | `boolean` | `true` | Enable dragging |
| `resizable` | `boolean` | `true` | Enable resizing |
| `minimizable` | `boolean` | `true` | Show minimize button |
| `maximizable` | `boolean` | `true` | Show maximize button |
| `closable` | `boolean` | `true` | Show close button |
| `position` | `object` | — | Initial position (x, y) |
| `size` | `object` | — | Initial size (width, height) |
| `minWidth` | `number` | — | Minimum width |
| `minHeight` | `number` | — | Minimum height |

### Features

- Drag-to-move via title bar
- Corner/edge resize handles
- Minimize/maximize/restore
- Z-index stacking (click to focus)
- Snap to edges

### Available In

Svelte UX (as Dialog variant), PrimeVue (as Dialog with draggable), Stunning UI

---

## Animated Background

A full-page or section background with animated visual effects such as particles, gradients, grids, or 3D elements.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `string` | — | Effect type (aurora, grid, dots, particles, beams, waves, globe, vortex) |
| `color` | `string \| string[]` | — | Effect colors |
| `speed` | `number` | `1` | Animation speed |
| `density` | `number` | — | Particle/element count |
| `interactive` | `boolean` | `false` | Respond to mouse movement |
| `className` | `string` | — | Additional CSS classes |

### Features

- Aurora/gradient backgrounds
- Dot/grid patterns (with hover glow)
- Particle systems
- Beam/ray effects
- 3D globe with arcs
- Mouse-interactive ripples
- Smooth gradient animation

### Available In

Aceternity UI (as AuroraBackground, BackgroundBeams, DotBackground, GridBackground, Vortex, WavyBackground, GlobeComponent), Magic UI (as DotPattern, GridPattern, Particles, Meteors, AnimatedGridPattern), Stunning UI (as AnimatedBackground, ParticleField)

---

## Animated Card

A card component with hover effects, 3D transforms, spotlight effects, or animated borders.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `string` | — | Effect type (3d, spotlight, border, hover, glow) |
| `rotateIntensity` | `number` | `10` | 3D rotation amount (degrees) |
| `glareEnabled` | `boolean` | `false` | Mouse-follow glare effect |
| `borderColor` | `string` | — | Animated border color |
| `borderRadius` | `string` | — | Corner radius |
| `spotlight` | `boolean` | `false` | Mouse-follow spotlight |

### Features

- 3D tilt on mouse hover
- Animated gradient borders
- Spotlight/glare mouse tracking
- Hover reveal content
- Stacked card parallax

### Available In

Aceternity UI (as 3DCard, CardHoverEffect, CardSpotlight, HoverBorderGradient), Magic UI (as MagicCard, NeonGradientCard, ShimmerButton), Stunning UI (as GlowCard, TiltCard)

---

## Animated List

A list component where items animate in sequentially with staggered entrance effects.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `delay` | `number` | `0.1` | Stagger delay between items (seconds) |
| `direction` | `'up' \| 'down' \| 'left' \| 'right'` | `'up'` | Entrance direction |
| `duration` | `number` | `0.5` | Animation duration |
| `initialDelay` | `number` | `0` | Initial delay before first item |

### Features

- Staggered fade/slide entrance
- Configurable direction and timing
- Exit animations
- Dynamic item support (new items animate in)

### Available In

Magic UI, Stunning UI, Aceternity UI (as TracingBeam list items)

---

## Animated Number

A component that animates between numeric values with counting/rolling transitions.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | — | Target number |
| `duration` | `number` | `1000` | Animation duration (ms) |
| `format` | `function` | — | Number formatter |
| `decimals` | `number` | `0` | Decimal places |
| `easing` | `string` | `'easeOut'` | Easing function |
| `prefix` | `string` | — | Text before number |
| `suffix` | `string` | — | Text after number |
| `locale` | `string` | — | Number locale |

### Features

- Counting animation (increment/decrement)
- Rolling digit animation
- Custom formatting (currency, percent)
- Intersection Observer trigger
- Spring physics

### Available In

Magic UI (as NumberTicker/AnimatedNumber), Stunning UI (as CountUp), Aceternity UI

---

## Animated Text

Text with animated effects such as typewriter, word-by-word reveal, gradient shimmer, or morphing between values.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | `string \| string[]` | — | Text content |
| `variant` | `string` | — | Animation type (typewriter, reveal, flip, shimmer, morph, wavy, blur, fade) |
| `speed` | `number` | `50` | Characters per second |
| `delay` | `number` | `0` | Start delay (ms) |
| `loop` | `boolean` | `false` | Repeat animation |
| `cursor` | `boolean` | `true` | Show blinking cursor (typewriter) |
| `words` | `string[]` | — | Words to cycle through (flip/morph) |

### Features

- Typewriter character reveal
- Word-by-word fade/slide in
- Text morphing between values
- Gradient shimmer sweep
- Wavy letter animation
- Blur-in text reveal
- Flip/rotate word cycling
- Letter-by-letter stagger

### Available In

Aceternity UI (as TypewriterEffect, TextGenerateEffect, FlipWords, TextRevealCard, WavyText), Magic UI (as TypingAnimation, BlurIn, WordRotate, GradualSpacing, TextShimmer, MorphingText, AnimatedShinyText), Stunning UI (as TypeWriter, TextReveal, GradientText)

---

## Bento Grid

A masonry/grid layout component for showcasing features or content in an asymmetric, magazine-style grid.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `number` | `3` | Number of columns |
| `gap` | `number \| string` | `'1rem'` | Grid gap |
| `items` | `array` | — | Grid item definitions |

### Sub-components

- **BentoGrid.Item** — Individual cell (`colSpan`, `rowSpan`, `className`)

### Features

- Asymmetric cell spanning
- Hover animations per cell
- Responsive column count
- Background effects per cell

### Available In

Aceternity UI, Magic UI, Stunning UI, Tailwind Plus

---

## Dock

A macOS-style dock bar with magnification effect on hover, used for application navigation.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `array` | — | Dock items (icon, label, href) |
| `magnification` | `number` | `60` | Magnified icon size |
| `iconSize` | `number` | `40` | Default icon size |
| `distance` | `number` | `140` | Mouse effect distance |
| `direction` | `'top' \| 'middle' \| 'bottom'` | `'bottom'` | Magnify direction |

### Sub-components

- **Dock.Icon** — Individual dock item
- **Dock.Separator** — Visual divider
- **Dock.Label** — Tooltip label

### Features

- Mouse-proximity magnification
- Spring animation physics
- Tooltip labels on hover
- Separator grouping
- Responsive layout

### Available In

Magic UI, Aceternity UI (as FloatingDock), Stunning UI

---

## Globe

An interactive 3D globe visualization with animated arcs, markers, and rotation.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `arcs` | `array` | — | Arc definitions (start/end lat/lng, color) |
| `markers` | `array` | — | Point markers (lat, lng, label) |
| `autoRotate` | `boolean` | `true` | Auto-rotation |
| `rotateSpeed` | `number` | `0.5` | Rotation speed |
| `globeColor` | `string` | `'#1d072e'` | Globe surface color |
| `arcColor` | `string \| function` | — | Arc color |
| `atmosphere` | `boolean` | `true` | Glow atmosphere |
| `width` | `number` | `600` | Canvas width |
| `height` | `number` | `600` | Canvas height |

### Features

- WebGL/Three.js rendering
- Animated flight arcs
- Interactive drag rotation
- Point markers with labels
- Atmosphere glow effect
- Zoom controls

### Available In

Aceternity UI (as GlobeComponent), Magic UI (as Globe), Stunning UI

---

## Infinite Scroll Area

A container that continuously scrolls content in a loop, used for logo bars, testimonials, or content feeds.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `direction` | `'left' \| 'right' \| 'up' \| 'down'` | `'left'` | Scroll direction |
| `speed` | `'slow' \| 'normal' \| 'fast'` | `'normal'` | Scroll speed |
| `pauseOnHover` | `boolean` | `true` | Pause on mouse hover |
| `gap` | `string` | `'1rem'` | Gap between items |
| `reverse` | `boolean` | `false` | Reverse direction |

### Features

- Seamless infinite loop
- Configurable direction and speed
- Pause on hover
- Duplicate content for seamless wrapping
- Fade edges

### Available In

Aceternity UI (as InfiniteMovingCards), Magic UI (as Marquee), Stunning UI (as InfiniteScroll), shadcn/ui (as Marquee)

---

## Lamp

A decorative visual effect simulating a desk lamp or spotlight illuminating content below it.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `color` | `string` | `'cyan'` | Light color |
| `width` | `string` | `'50%'` | Light cone width |
| `delay` | `number` | `0.5` | Animation delay |

### Features

- Animated light cone expansion
- Gradient glow effect
- Content reveal beneath light

### Available In

Aceternity UI (as LampEffect), Stunning UI

---

## Magnetic Button

A button that responds to cursor proximity with magnetic pull/push effects.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `strength` | `number` | `50` | Pull strength in pixels |
| `radius` | `number` | `200` | Effect radius |
| `duration` | `number` | `0.3` | Animation duration |
| `haptic` | `boolean` | `false` | Spring-back effect |

### Features

- Cursor-proximity pull effect
- Spring-back animation
- Configurable strength and radius

### Available In

Stunning UI, Kibo UI

---

## Orbit

Animated orbital rings with icons or elements rotating around a center point.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `radius` | `number` | `160` | Orbit radius |
| `duration` | `number` | `20` | Full orbit duration (seconds) |
| `reverse` | `boolean` | `false` | Reverse rotation direction |
| `delay` | `number` | `0` | Animation delay |
| `path` | `boolean` | `true` | Show orbit path ring |

### Sub-components

- **OrbitingCircles** — Items on the orbit path

### Features

- Smooth circular rotation
- Multiple concurrent orbits at different radii
- Icon or image elements
- Path visibility toggle
- Staggered start delays

### Available In

Magic UI, Stunning UI

---

## Parallax Scroll

A container where nested elements move at different speeds during scroll, creating a depth illusion.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `speed` | `number` | `0.5` | Parallax speed factor |
| `direction` | `'up' \| 'down'` | `'up'` | Movement direction |
| `offset` | `number` | `0` | Starting offset |
| `className` | `string` | — | Additional CSS classes |

### Features

- Multi-layer parallax
- Scroll-linked animation
- Sticky scroll reveal
- Horizontal parallax
- Content pinning during scroll

### Available In

Aceternity UI (as ParallaxScroll, StickyScrollReveal, MacbookScroll), Magic UI (as ScrollBasedVelocity), Stunning UI (as ParallaxSection)

---

## Retro Grid

A CSS-based perspective grid that creates an 80s/retro-style vanishing point floor effect.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `angle` | `number` | `65` | Perspective angle |
| `cellSize` | `number` | `60` | Grid cell size |
| `opacity` | `number` | `0.5` | Grid line opacity |
| `color` | `string` | — | Grid line color |

### Features

- CSS-only implementation
- Perspective transform
- Configurable grid density
- Color customization

### Available In

Magic UI, Stunning UI

---

## Rich Text Editor

A full-featured text editor with formatting toolbar, supporting bold, italic, headings, lists, links, images, and more.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string \| JSON` | — | Editor content (HTML or JSON) |
| `onValueChange` | `function` | — | Content change callback |
| `extensions` | `array` | — | Editor extensions/plugins |
| `editable` | `boolean` | `true` | Editable mode |
| `placeholder` | `string` | — | Placeholder text |
| `autofocus` | `boolean` | `false` | Auto-focus on mount |

### Sub-components

- **Editor.Toolbar** — Formatting toolbar
- **Editor.Content** — Editable content area
- **Editor.BubbleMenu** — Floating selection menu
- **Editor.FloatingMenu** — Context menu on empty lines
- **Editor.Mention** — @-mention autocomplete
- **Editor.Slash** — Slash command menu

### Features

- Block-level formatting (headings, lists, quotes, code blocks)
- Inline formatting (bold, italic, underline, strike, highlight)
- Image and media embedding
- Tables with row/column operations
- Collaborative editing (Yjs)
- Markdown shortcuts
- Slash commands
- Drag-and-drop blocks
- Undo/redo
- Export to HTML/JSON/Markdown

### Available In

Tiptap, Plate, Lexical, Novel, PrimeReact (as Editor), PrimeVue (as Editor), Ant Design (via integrations), Mantine (as RichTextEditor)

---

## Shine Border

A decorative border effect with an animated light sweep/shimmer around an element.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `color` | `string \| string[]` | `'white'` | Shine color(s) |
| `duration` | `number` | `14` | Animation duration (seconds) |
| `borderWidth` | `number` | `1` | Border width |
| `borderRadius` | `number` | `8` | Corner radius |

### Features

- Animated rotating gradient border
- Multi-color gradient
- Configurable speed
- Works on any container

### Available In

Magic UI, Stunning UI, Kibo UI

---

## Sparkles

Animated sparkle/star particles that appear around or within content, creating a twinkling decoration effect.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `color` | `string` | `'#FFC700'` | Sparkle color |
| `count` | `number` | `10` | Number of sparkles |
| `minSize` | `number` | `10` | Minimum sparkle size |
| `maxSize` | `number` | `20` | Maximum sparkle size |
| `speed` | `number` | `1` | Animation speed |

### Features

- Random sparkle positioning
- Size and opacity animation
- Continuous generation
- Inline or block-level wrapping

### Available In

Magic UI (as SparklesText), Aceternity UI (as Sparkles), Stunning UI

---

## Spotlight

A mouse-tracking radial gradient that follows the cursor, highlighting content areas.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `number` | `200` | Spotlight radius |
| `color` | `string` | — | Spotlight color |
| `opacity` | `number` | `0.15` | Effect opacity |
| `fill` | `string` | — | Background fill |

### Features

- Mouse-following gradient
- Smooth position interpolation
- Fade in/out on enter/leave
- Multiple concurrent spotlights

### Available In

Aceternity UI (as Spotlight), Magic UI, Stunning UI

---

## Sticky Scroll Reveal

A scroll-driven layout where content pins to the viewport and reveals/changes as the user scrolls through sections.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `sections` | `array` | — | Section content definitions |
| `contentAlignment` | `'left' \| 'center' \| 'right'` | `'left'` | Text position |
| `linearGradient` | `boolean` | `true` | Background gradient effect |

### Features

- Content pinning on scroll
- Section-by-section reveal
- Paired text and media columns
- Smooth scroll transitions

### Available In

Aceternity UI (as StickyScrollReveal), Stunning UI

---

## Tracing Beam

An animated SVG path that traces along the page as the user scrolls, highlighting the current reading position.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `color` | `string` | — | Beam color |
| `strokeWidth` | `number` | `2` | Line width |
| `className` | `string` | — | Additional CSS classes |

### Features

- SVG path drawing on scroll
- Gradient color along path
- Dot indicator at current position
- Glow effect

### Available In

Aceternity UI, Stunning UI

---

## Ripple

An animated ripple effect emanating from a point, typically used as a background decoration or on button click.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `color` | `string` | `'currentColor'` | Ripple color |
| `count` | `number` | `3` | Number of rings |
| `duration` | `number` | `2` | Animation duration (seconds) |
| `size` | `number` | — | Maximum ring size |

### Features

- Concentric expanding rings
- Staggered animation
- Click-triggered or continuous
- Configurable ring count

### Available In

Magic UI, Material UI (as ButtonBase ripple), Stunning UI

---

## Safari / Browser Frame

A decorative wrapper that renders content inside a realistic browser window frame with address bar, tabs, and window controls.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `url` | `string` | `'https://example.com'` | Displayed URL |
| `variant` | `'safari' \| 'chrome' \| 'firefox' \| 'arc'` | `'safari'` | Browser style |
| `width` | `number \| string` | `'100%'` | Frame width |
| `height` | `number \| string` | `'auto'` | Frame height |
| `imageSrc` | `string` | — | Screenshot content |

### Features

- Realistic browser chrome
- Traffic light / window control buttons
- Address bar with URL
- Tab strip
- Image or live content inside frame

### Available In

Magic UI (as Safari), Aceternity UI (as BrowserFrame), Stunning UI

---

## Shimmer Button

A button with an animated shimmer/shine sweep effect across its surface.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `shimmerColor` | `string` | `'white'` | Shimmer highlight color |
| `shimmerSize` | `string` | `'0.05em'` | Shimmer particle size |
| `shimmerDuration` | `string` | `'3s'` | Animation cycle duration |
| `background` | `string` | — | Button background |
| `borderRadius` | `string` | `'100px'` | Corner radius |

### Features

- Continuous shimmer animation
- Customizable colors and timing
- Hover state enhancement
- Gradient background support

### Available In

Magic UI, Stunning UI, Kibo UI

---

## Notification List

A stacked notification display showing alerts, messages, or activity items with animations.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `notifications` | `array` | — | Notification items (icon, title, description, time) |
| `limit` | `number` | `5` | Max visible notifications |
| `animated` | `boolean` | `true` | Animate entry/exit |

### Features

- Staggered entrance animation
- Grouped by time/category
- Mark as read
- Swipe to dismiss
- Badge counts

### Available In

Magic UI (as AnimatedList variant), Stunning UI, Preline, Flowbite

---

## Comparison Slider

An interactive before/after image comparison with a draggable divider.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `firstImage` | `string` | — | Before image URL |
| `secondImage` | `string` | — | After image URL |
| `initialPosition` | `number` | `50` | Initial slider position (%) |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Slider direction |
| `showLabels` | `boolean` | `true` | Show before/after labels |

### Sub-components

- **ComparisonSlider.FirstItem** — Before content
- **ComparisonSlider.SecondItem** — After content
- **ComparisonSlider.Handle** — Draggable divider

### Features

- Drag to reveal
- Touch support
- Keyboard accessible
- Custom handle styling
- Vertical and horizontal modes

### Available In

Aceternity UI (as Compare), Stunning UI, Kibo UI

---

## Confetti

An animated confetti burst or cannon effect triggered by an action or event.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `particleCount` | `number` | `50` | Number of particles |
| `spread` | `number` | `60` | Spread angle |
| `origin` | `object` | `{ x: 0.5, y: 0.5 }` | Burst origin point |
| `colors` | `string[]` | — | Particle colors |
| `gravity` | `number` | `1` | Fall speed |
| `duration` | `number` | `3000` | Effect duration (ms) |
| `shapes` | `string[]` | `['square', 'circle']` | Particle shapes |

### Features

- Burst and cannon modes
- Custom shapes and colors
- Physics simulation (gravity, wind)
- Trigger on demand

### Available In

Magic UI (as Confetti), Stunning UI, Kibo UI (as ConfettiButton)

---

## Cool Mode

A wrapper that spawns small particle/emoji effects on every click within the wrapped area.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `particle` | `string` | — | Custom particle image URL |
| `particleCount` | `number` | `30` | Particles per click |
| `speedDown` | `number` | `5` | Fall speed |
| `size` | `number` | `25` | Particle size |

### Features

- Click-to-spawn particles
- Custom emoji or image particles
- Physics-based animation
- Child wrapper (any content)

### Available In

Magic UI, Stunning UI

---

## File Tree

A file-system browser component showing folders and files in a hierarchical tree with icons.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `array` | — | File/folder tree data |
| `selectedId` | `string` | — | Selected file ID |
| `onSelect` | `function` | — | Selection callback |
| `defaultExpanded` | `string[]` | — | Initially expanded folders |

### Sub-components

- **FileTree.Folder** — Expandable folder node
- **FileTree.File** — File leaf node

### Features

- Expandable folders
- File type icons
- Selection highlighting
- Keyboard navigation
- Nested depth indicators

### Available In

Magic UI, shadcn/ui (as custom), Stunning UI

---

## Gauge / Circular Progress

A circular progress indicator or gauge displaying a value within a range.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | `0` | Current value |
| `min` | `number` | `0` | Minimum value |
| `max` | `number` | `100` | Maximum value |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Component size |
| `showValue` | `boolean` | `true` | Display numeric value |
| `color` | `string` | `'primary'` | Fill color |
| `trackColor` | `string` | `'muted'` | Background track color |
| `thickness` | `number` | — | Stroke width |

### Features

- SVG-based rendering
- Animated value transitions
- Custom center content
- Gradient fills
- Multiple rings

### Available In

HeroUI (as CircularProgress), PrimeReact (as Knob), PrimeVue (as Knob), Ant Design (as Progress type=circle), Mantine (as RingProgress), SvelteUI (as RingProgress), Chakra UI (as CircularProgress)

---

## Interactive Icon Cloud

A 3D sphere of rotating icons/logos that respond to mouse interaction.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icons` | `string[]` | — | Icon slugs (Simple Icons) |
| `images` | `string[]` | — | Custom image URLs |
| `size` | `number` | `600` | Cloud diameter |
| `speed` | `number` | `1` | Rotation speed |
| `depth` | `number` | `1` | 3D depth factor |

### Features

- 3D sphere positioning
- Mouse-interactive rotation
- Auto-rotation
- Simple Icons integration
- Custom images support

### Available In

Magic UI (as IconCloud), Stunning UI

---

## Phone Mockup

A realistic mobile phone frame for showcasing app screenshots or mobile-responsive content.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'iphone' \| 'android' \| 'generic'` | `'iphone'` | Device style |
| `color` | `string` | `'black'` | Device color |
| `width` | `number \| string` | `'300px'` | Frame width |
| `imageSrc` | `string` | — | Screen content image |

### Features

- Realistic device bezels
- Notch/dynamic island rendering
- Status bar
- Responsive content area

### Available In

Magic UI (as iPhone15Pro/AndroidMockup), DaisyUI (as Mockup Phone), Flowbite, HyperUI, Stunning UI

---

## Accordion Menu

A vertical navigation menu with expandable/collapsible sections, commonly used for sidebar navigation with nested items.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `array` | — | Menu item definitions (label, icon, children) |
| `defaultExpandedKeys` | `string[]` | — | Initially expanded sections |
| `multiple` | `boolean` | `false` | Allow multiple open sections |
| `iconPosition` | `'start' \| 'end'` | `'end'` | Chevron position |

### Features

- Nested item groups
- Icon support per item
- Active item highlighting
- Keyboard navigation
- Badge/count indicators

### Available In

PrimeReact (as PanelMenu), PrimeVue (as PanelMenu), Flowbite, Preline, Carbon Svelte (as AccordionMenu)

---

## Affix

A wrapper that fixes its child to the viewport when scrolling past a threshold.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `position` | `object` | `{ bottom: 20, right: 20 }` | Fixed position coordinates |
| `target` | `element \| string` | `window` | Scroll container |
| `offsetTop` | `number` | — | Offset from top to trigger |
| `offsetBottom` | `number` | — | Offset from bottom to trigger |
| `zIndex` | `number` | — | Stack order |

### Features

- Scroll-triggered fixing
- Custom scroll containers
- Position customization
- Change event callback

### Available In

Ant Design, Mantine, SvelteUI

---

## Anchor Navigation

An in-page navigation component that highlights the currently visible section and provides click-to-scroll links.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `array` | — | Section links (href, title) |
| `offsetTop` | `number` | `0` | Scroll offset |
| `bounds` | `number` | `5` | Active detection bounds |
| `targetOffset` | `number` | — | Target scroll offset |
| `affix` | `boolean` | `true` | Fixed positioning |
| `direction` | `'vertical' \| 'horizontal'` | `'vertical'` | Layout direction |

### Features

- Active section tracking
- Smooth scroll on click
- Nested anchor links
- Affix positioning
- Custom scroll containers

### Available In

Ant Design (as Anchor), Mantine (as ScrollSpy pattern)

---

## Auto Complete

A text input with a dropdown of filtered suggestions that update as the user types.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | — | Input value |
| `suggestions` | `array` | — | Suggestion items |
| `field` | `string` | — | Display field for objects |
| `completeMethod` | `function` | — | Search callback |
| `dropdown` | `boolean` | `false` | Show dropdown trigger |
| `multiple` | `boolean` | `false` | Multiple selection mode |
| `delay` | `number` | `300` | Search debounce (ms) |
| `minLength` | `number` | `1` | Minimum chars to trigger |
| `forceSelection` | `boolean` | `false` | Require selection from list |
| `loading` | `boolean` | `false` | Loading state |

### Features

- Async suggestion fetching
- Debounced search
- Multiple selection with chips
- Force selection from list
- Custom item templates
- Grouped suggestions

### Available In

PrimeReact (as AutoComplete), PrimeVue (as AutoComplete), Ant Design (as AutoComplete), Material UI (as Autocomplete), Mantine (as Autocomplete), Flowbite

---

## Back To Top

A button that appears after scrolling down and smoothly scrolls the page back to the top.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `visibilityHeight` | `number` | `400` | Scroll distance to show button |
| `target` | `element \| string` | `window` | Scroll container |
| `duration` | `number` | `450` | Scroll animation duration (ms) |

### Features

- Scroll-triggered visibility
- Smooth scroll animation
- Custom trigger element
- Custom scroll containers

### Available In

Ant Design (as BackTop/FloatButton.BackTop), Flowbite, Preline, HyperUI

---

## Bottom Navigation Bar

A fixed bottom bar with navigation icons, commonly used in mobile layouts.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `array` | — | Navigation items (icon, label, href) |
| `activeItem` | `string` | — | Currently active item |
| `variant` | `'default' \| 'bordered' \| 'pill'` | `'default'` | Visual variant |
| `showLabels` | `boolean` | `true` | Show text labels |

### Features

- Icon + label layout
- Active state indicator
- Badge support
- Animated transitions

### Available In

DaisyUI (as BottomNavigation), Flowbite (as BottomNavbar), Material UI (as BottomNavigation), HyperUI

---

## Cascader

A multi-level dropdown selector for hierarchical data, where each selection reveals the next level.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `options` | `array` | — | Hierarchical options data |
| `value` | `string[]` | — | Selected path |
| `onChange` | `function` | — | Selection callback |
| `placeholder` | `string` | — | Placeholder text |
| `multiple` | `boolean` | `false` | Multiple selection |
| `showSearch` | `boolean` | `false` | Enable search filtering |
| `loadData` | `function` | — | Async child loading |
| `changeOnSelect` | `boolean` | `false` | Allow partial path selection |
| `expandTrigger` | `'click' \| 'hover'` | `'click'` | Expand trigger |

### Features

- Multi-level panel navigation
- Search within all levels
- Async child loading
- Multiple selection with checkboxes
- Show full path or leaf only

### Available In

Ant Design (as Cascader), PrimeReact (as CascadeSelect), PrimeVue (as CascadeSelect)

---

## Color Swatch

A visual color sample display, often used in palettes or theme selectors.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `color` | `string` | — | Color value (hex, rgb, hsl) |
| `size` | `string \| number` | `'2rem'` | Swatch size |
| `radius` | `string` | `'sm'` | Corner radius |
| `withShadow` | `boolean` | `true` | Shadow for light colors |

### Features

- Checkerboard background for alpha colors
- Click to copy color value
- Tooltip with color code
- Grouped palettes

### Available In

Mantine (as ColorSwatch), Chakra UI, SvelteUI

---

## Config Provider

A context provider that sets global configuration for all child components, including theme, locale, and size.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `theme` | `object` | — | Theme configuration |
| `locale` | `object` | — | Locale messages |
| `componentSize` | `'small' \| 'middle' \| 'large'` | `'middle'` | Global component size |
| `direction` | `'ltr' \| 'rtl'` | `'ltr'` | Text direction |
| `prefixCls` | `string` | — | CSS class prefix |
| `iconPrefixCls` | `string` | — | Icon class prefix |

### Features

- Global theme overrides
- Component size defaults
- RTL/LTR direction
- Locale provider
- CSS variable injection

### Available In

Ant Design (as ConfigProvider), PrimeReact (as PrimeReactContext), PrimeVue (as PrimeVue config), Material UI (as ThemeProvider), Mantine (as MantineProvider), Chakra UI (as ChakraProvider)

---

## Copy Button

A button that copies specified text to the clipboard with visual feedback.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | — | Text to copy |
| `timeout` | `number` | `2000` | Success feedback duration (ms) |
| `onCopy` | `function` | — | Copy callback |

### Features

- One-click clipboard copy
- Success/error feedback icon
- Tooltip confirmation
- Custom trigger element

### Available In

Mantine (as CopyButton), Kibo UI (as Clipboard), Ark UI (as Clipboard), Park UI (as Clipboard), Preline

---

## Descriptions

A key-value display for showing labeled data fields, commonly used for detail views.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `array` | — | Description items (label, content) |
| `column` | `number` | `3` | Columns per row |
| `layout` | `'horizontal' \| 'vertical'` | `'horizontal'` | Label position |
| `bordered` | `boolean` | `false` | Show borders |
| `size` | `'small' \| 'middle' \| 'default'` | `'default'` | Component size |
| `title` | `string` | — | Group title |
| `colon` | `boolean` | `true` | Show colon after label |

### Sub-components

- **Descriptions.Item** — Key-value pair (`label`, `span`)

### Features

- Responsive column layout
- Horizontal and vertical label alignment
- Bordered and borderless variants
- Column spanning
- Editable values

### Available In

Ant Design (as Descriptions), Material UI (as custom grid), Carbon Svelte (as StructuredList)

---

## Dropdown

A generic floating menu triggered by a button click, distinct from DropdownMenu by being simpler and often used for single actions.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `array` | — | Menu items |
| `trigger` | `'click' \| 'hover' \| 'contextMenu'` | `'click'` | Open trigger |
| `placement` | `string` | `'bottomLeft'` | Menu position |
| `disabled` | `boolean` | `false` | Disabled state |
| `arrow` | `boolean` | `false` | Show arrow pointer |
| `open` | `boolean` | — | Controlled open state |
| `destroyPopupOnHide` | `boolean` | `false` | Unmount on close |

### Features

- Multiple trigger modes
- Nested submenus
- Disabled items
- Danger items (red)
- Keyboard navigation
- Custom positioning

### Available In

Ant Design, DaisyUI, Flowbite, HeroUI, Skeleton UI, Preline, HyperUI

---

## Empty

A placeholder display for empty states showing an icon/illustration with a description and optional action button.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `image` | `element \| string` | — | Illustration |
| `description` | `string \| element` | — | Description text |
| `imageStyle` | `object` | — | Image CSS |

### Features

- Built-in illustrations (simple, detailed)
- Custom image/icon
- Action button slot
- Fits within tables, lists, cards

### Available In

Ant Design (as Empty), PrimeReact (as custom), HeroUI, Flowbite, Chakra UI, Mantine

---

## Float Button

A floating action button (FAB) fixed to the viewport, optionally with a group of related actions.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `element` | — | Button icon |
| `type` | `'primary' \| 'default'` | `'default'` | Visual type |
| `shape` | `'circle' \| 'square'` | `'circle'` | Button shape |
| `tooltip` | `string` | — | Tooltip text |
| `href` | `string` | — | Link URL |
| `badge` | `object` | — | Badge config |
| `style` | `object` | — | Position styles |

### Sub-components

- **FloatButton.Group** — Expandable group container
- **FloatButton.BackTop** — Scroll-to-top variant

### Features

- Fixed viewport positioning
- Expandable group (vertical fan-out)
- Badge indicator
- BackTop variant
- Custom positioning

### Available In

Ant Design (as FloatButton), Material UI (as Fab), DaisyUI (as fixed button pattern)

---

## Form Field

A wrapper component that associates a label, help text, and validation error message with a form input.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | — | Field label |
| `htmlFor` | `string` | — | Associated input ID |
| `description` | `string` | — | Help text |
| `error` | `string` | — | Error message |
| `required` | `boolean` | `false` | Show required indicator |
| `disabled` | `boolean` | `false` | Disabled state |
| `orientation` | `'horizontal' \| 'vertical'` | `'vertical'` | Label position |

### Sub-components

- **FormField.Label** — Input label
- **FormField.Description** — Help text
- **FormField.Error** — Error message
- **FormField.Control** — Input wrapper

### Features

- Automatic ARIA associations
- Required asterisk indicator
- Error state styling
- Horizontal and vertical layouts

### Available In

Radix UI (as Form), shadcn/ui (as FormField), Bits UI (as FormField), Ark UI (as Field), Park UI, Kobalte (as FormField), Fluent UI (as Field), Material UI (as FormControl), Ant Design (as Form.Item), Mantine (as Input.Wrapper)

---

## Grid Layout

A CSS grid utility component for creating responsive layouts with configurable columns, rows, and gaps.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `number \| object` | `12` | Column count (or responsive object) |
| `rows` | `number` | — | Row count |
| `gap` | `number \| string` | — | Grid gap |
| `gutter` | `number \| string` | — | Alternative gap prop |
| `align` | `string` | — | Vertical alignment |
| `justify` | `string` | — | Horizontal alignment |
| `flow` | `'row' \| 'column' \| 'dense'` | `'row'` | Grid flow direction |

### Sub-components

- **Grid.Col** / **Grid.Item** — Grid cell (`span`, `offset`, `order`)

### Features

- Responsive breakpoint columns
- Column spanning and offset
- Auto-flow layout
- Nested grids
- Gutter/gap control

### Available In

Ant Design (as Grid/Row/Col), Material UI (as Grid), Chakra UI (as Grid/SimpleGrid), Mantine (as Grid/SimpleGrid), Carbon Svelte (as Grid/Row/Column), SvelteUI (as Grid), Fluent UI

---

## Icon Button

A button that contains only an icon (no text), with accessible labeling.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `element` | — | Button icon |
| `aria-label` | `string` | — | Accessible label (required) |
| `variant` | `string` | — | Visual variant |
| `size` | `string` | `'md'` | Button size |
| `isRound` | `boolean` | `false` | Circular shape |
| `disabled` | `boolean` | `false` | Disabled state |
| `color` | `string` | — | Theme color |

### Features

- Icon-only display
- Required accessible label
- All button variants
- Circular option
- Tooltip integration

### Available In

Chakra UI, Material UI, Fluent UI, HeroUI, Mantine (as ActionIcon), Carbon Svelte (as IconButton)

---

## Input Group

A container that visually groups an input with addons (icons, buttons, text) on the start or end.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `string` | `'md'` | Group size |

### Sub-components

- **InputGroup.Addon** — Static prefix/suffix (text, icon)
- **InputGroup.Element** — Overlay element (inside input bounds)

### Features

- Prefix and suffix addons
- Merged border radius
- Consistent sizing across children
- Button addons

### Available In

Chakra UI, Ant Design (as Input.Group / Input addon props), Mantine (as Input.Wrapper), Carbon Svelte, Flowbite

---

## List

A component for rendering ordered or unordered lists of data with consistent styling and optional actions.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dataSource` | `array` | — | List data |
| `renderItem` | `function` | — | Item render function |
| `bordered` | `boolean` | `false` | Show border |
| `size` | `'small' \| 'default' \| 'large'` | `'default'` | Component size |
| `split` | `boolean` | `true` | Show divider between items |
| `header` | `element` | — | List header |
| `footer` | `element` | — | List footer |
| `loading` | `boolean` | `false` | Loading state |
| `grid` | `object` | — | Grid layout config |
| `pagination` | `object \| boolean` | — | Pagination config |

### Sub-components

- **List.Item** — Individual item
- **List.Item.Meta** — Avatar + title + description layout

### Features

- Virtualized rendering
- Grid layout mode
- Loading skeleton
- Pagination
- Item actions (edit, delete)
- Avatar + meta layout

### Available In

Ant Design (as List), Material UI (as List), Mantine (as List), Chakra UI (as List), Carbon Svelte (as StructuredList/UnorderedList/OrderedList), DaisyUI (as Menu), Flowbite

---

## Loading Bar

A thin progress bar at the top of the viewport indicating page or async operation loading.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `loading` | `boolean` | — | Show/hide bar |
| `progress` | `number` | — | Manual progress (0–100) |
| `color` | `string` | `'primary'` | Bar color |
| `height` | `number` | `3` | Bar height (px) |
| `incrementDuration` | `number` | `800` | Auto-increment interval |

### Features

- Indeterminate animation
- Manual progress control
- Page transition integration
- Custom colors

### Available In

HeroUI, SvelteUI (as NProgress pattern), PrimeReact (as ProgressBar indeterminate), Preline

---

## Menu

A vertical navigation list with items, groups, and nested submenus.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `array` | — | Menu item definitions |
| `mode` | `'vertical' \| 'horizontal' \| 'inline'` | `'vertical'` | Display mode |
| `selectedKeys` | `string[]` | — | Selected items |
| `openKeys` | `string[]` | — | Open submenus |
| `theme` | `'light' \| 'dark'` | `'light'` | Color theme |
| `collapsed` | `boolean` | `false` | Icon-only mode |
| `selectable` | `boolean` | `true` | Enable selection |

### Sub-components

- **Menu.Item** — Navigation item
- **Menu.SubMenu** — Nested submenu
- **Menu.ItemGroup** — Visual grouping
- **Menu.Divider** — Separator

### Features

- Inline, vertical, and horizontal modes
- Collapsible to icon-only
- Nested submenus
- Icon and badge support
- Active/selected indicators
- Keyboard navigation

### Available In

Ant Design, DaisyUI, Material UI (as Menu), PrimeReact (as Menu/TieredMenu), PrimeVue (as Menu/TieredMenu), Carbon Svelte (as SideNav), Chakra UI, Mantine

---

## Message

A lightweight feedback display that appears at the top of the page for brief notifications.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `string \| element` | — | Message content |
| `type` | `'info' \| 'success' \| 'warning' \| 'error' \| 'loading'` | `'info'` | Message type |
| `duration` | `number` | `3` | Auto-close time (seconds) |
| `onClose` | `function` | — | Close callback |
| `maxCount` | `number` | — | Maximum concurrent messages |

### Features

- Auto-dismiss
- Promise-based (loading → result)
- Stackable
- Global configuration
- Custom icon

### Available In

Ant Design (as message), Material UI (as Snackbar), Mantine (as Notifications)

---

## Multi-Select

A select component that allows choosing multiple values, displaying them as chips/tags.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string[]` | — | Selected values |
| `options` | `array` | — | Available options |
| `onChange` | `function` | — | Selection callback |
| `placeholder` | `string` | — | Placeholder text |
| `maxSelectedLabels` | `number` | `3` | Max visible chips |
| `filter` | `boolean` | `true` | Enable search |
| `display` | `'comma' \| 'chip'` | `'chip'` | Display mode |
| `selectAll` | `boolean` | `false` | Show select all option |
| `maxSelection` | `number` | — | Selection limit |

### Features

- Chip/tag display for selections
- Search filtering
- Select all toggle
- Group options
- Virtualized dropdown for large lists

### Available In

PrimeReact (as MultiSelect), PrimeVue (as MultiSelect), Mantine (as MultiSelect), Carbon Svelte (as MultiSelect), Ant Design (as Select mode=multiple), Material UI (as Select multiple), Bits UI (as Listbox multiple), Kibo UI

---

## Notification

A persistent notification panel or popup with title, description, and action buttons, richer than Toast.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | — | Notification title |
| `description` | `string \| element` | — | Body content |
| `type` | `'info' \| 'success' \| 'warning' \| 'error'` | `'info'` | Notification type |
| `placement` | `string` | `'topRight'` | Screen position |
| `duration` | `number` | `4.5` | Auto-close time (seconds, null = persistent) |
| `closable` | `boolean` | `true` | Show close button |
| `icon` | `element` | — | Custom icon |
| `actions` | `element` | — | Action buttons |

### Features

- Rich content (title + description + actions)
- Custom icon
- Persistent (no auto-close) option
- Stacking at corners
- Update existing notification
- Progress bar

### Available In

Ant Design (as notification), SvelteUI (as Notification), Carbon Svelte (as InlineNotification/ToastNotification), Mantine (as Notifications), PrimeReact (as Toast with life), PrimeVue (as Toast with life)

---

## Page Header

A component displaying page title, breadcrumbs, back button, and optional actions at the top of a page.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | — | Page title |
| `subtitle` | `string` | — | Subtitle text |
| `breadcrumb` | `object` | — | Breadcrumb config |
| `onBack` | `function` | — | Back button callback |
| `extra` | `element` | — | Action buttons |
| `tags` | `element` | — | Status tags |
| `footer` | `element` | — | Footer content (tabs, etc.) |
| `avatar` | `object` | — | Title avatar |

### Features

- Breadcrumb integration
- Back navigation
- Action buttons area
- Responsive layout
- Content section below header

### Available In

Ant Design (as PageHeader), Carbon Svelte (as Header), Fluent UI (as PageHeader pattern), Preline

---

## Segmented Button

A group of connected buttons where one is active, functioning as a single-select control with button styling (distinct from Segmented Control by emphasizing button behavior over radio behavior).

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `options` | `array` | — | Button options (label, value, icon) |
| `value` | `string` | — | Selected value |
| `onChange` | `function` | — | Selection callback |
| `fullWidth` | `boolean` | `false` | Stretch to fill container |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size |

### Features

- Connected button styling
- Icon + label options
- Disabled individual options
- Full-width mode

### Available In

Ant Design (as Segmented), Material UI (as ToggleButtonGroup), Mantine (as SegmentedControl), Fluent UI

---

## Skeleton Group

A preset layout of multiple skeleton elements mimicking a specific content type (card, list item, article).

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'card' \| 'list' \| 'article' \| 'profile' \| 'table'` | `'card'` | Layout preset |
| `count` | `number` | `1` | Number of skeleton groups |
| `animated` | `boolean` | `true` | Animation enabled |
| `avatar` | `boolean` | `false` | Include avatar circle |
| `rows` | `number` | `3` | Number of text rows |
| `title` | `boolean` | `true` | Include title bar |
| `paragraph` | `object` | — | Paragraph config (rows, widths) |

### Features

- Pre-composed layouts
- Avatar + title + paragraph pattern
- Repeatable groups
- Custom row widths

### Available In

Ant Design (as Skeleton with avatar/paragraph), Material UI (as Skeleton compositions), Mantine (as Skeleton compositions), Carbon Svelte (as SkeletonPlaceholder/SkeletonText), Preline

---

## Split Button

A button combined with a dropdown trigger, providing a primary action and secondary options.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | — | Primary button label |
| `icon` | `element` | — | Primary button icon |
| `model` | `array` | — | Dropdown menu items |
| `severity` | `string` | — | Button color variant |
| `disabled` | `boolean` | `false` | Disabled state |

### Features

- Primary click action
- Dropdown secondary actions
- Unified visual styling
- Menu positioning

### Available In

PrimeReact (as SplitButton), PrimeVue (as SplitButton), Fluent UI (as SplitButton), Carbon Svelte (as Button with menu), Ant Design (as Dropdown.Button)

---

## Stack

A layout component for arranging children with consistent spacing along a single axis.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `direction` | `'row' \| 'column'` | `'column'` | Stack direction |
| `spacing` | `number \| string` | `'md'` | Gap between children |
| `align` | `string` | `'stretch'` | Cross-axis alignment |
| `justify` | `string` | `'flex-start'` | Main-axis alignment |
| `wrap` | `boolean` | `false` | Allow wrapping |
| `divider` | `element` | — | Divider between children |
| `separator` | `element` | — | Alternative divider prop |

### Features

- Vertical and horizontal stacking
- Responsive spacing
- Divider insertion between items
- Flex wrap support

### Available In

Chakra UI (as Stack/VStack/HStack), Material UI (as Stack), Mantine (as Stack/Group), Fluent UI (as Stack), SvelteUI (as Stack/Group), Carbon Svelte (as Stack)

---

## Status Badge

A small indicator dot or label showing online/offline status, presence, or condition.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `status` | `'online' \| 'offline' \| 'away' \| 'busy' \| 'dnd'` | — | Status value |
| `color` | `string` | — | Custom color |
| `size` | `'xs' \| 'sm' \| 'md'` | `'sm'` | Dot size |
| `label` | `string` | — | Status text |
| `pulse` | `boolean` | `false` | Pulsing animation |

### Features

- Status-based coloring
- Pulsing animation for active
- Positioning on avatars
- Text label variant

### Available In

Fluent UI (as Badge/PresenceBadge), DaisyUI (as Badge with status), Flowbite, HeroUI (as Badge dot), Preline

---

## Steps Indicator

A horizontal or vertical step indicator showing numbered/icon steps for multi-page forms or wizards, distinct from Stepper by being display-only (no built-in content panels).

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `current` | `number` | `0` | Active step index |
| `items` | `array` | — | Step definitions (title, description, icon, status) |
| `direction` | `'horizontal' \| 'vertical'` | `'horizontal'` | Layout |
| `size` | `'small' \| 'default'` | `'default'` | Step size |
| `progressDot` | `boolean` | `false` | Dot style instead of numbers |
| `type` | `'default' \| 'navigation'` | `'default'` | Visual variant |
| `status` | `'wait' \| 'process' \| 'finish' \| 'error'` | `'process'` | Current step status |

### Features

- Completed/active/pending states
- Error state per step
- Dot style variant
- Navigation style (clickable)
- Custom icon per step
- Responsive vertical fallback

### Available In

Ant Design (as Steps), Mantine (as Stepper display), Carbon Svelte (as ProgressIndicator), Preline

---

## Sticky Header

A page header that sticks to the top of the viewport on scroll, with optional show/hide behavior.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `sticky` | `boolean` | `true` | Enable sticky behavior |
| `hideOnScroll` | `'up' \| 'down' \| 'both' \| 'none'` | `'none'` | Auto-hide direction |
| `offset` | `number` | `0` | Scroll offset threshold |
| `shadow` | `boolean` | `true` | Show shadow when stuck |
| `blur` | `boolean` | `false` | Backdrop blur when stuck |
| `zIndex` | `number` | `50` | Stack order |

### Features

- Scroll-linked show/hide
- Shadow on scroll
- Backdrop blur
- Smooth transitions
- Sentinel-based detection

### Available In

Flowbite (as Navbar sticky), Preline, HyperUI, Tailwind Plus, HeroUI (as Navbar sticky)

---

## Table of Contents

An auto-generated navigation list from page headings that highlights the currently visible section.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `selector` | `string` | `'h2, h3'` | Heading selector |
| `offset` | `number` | `0` | Scroll detection offset |
| `smooth` | `boolean` | `true` | Smooth scroll on click |
| `activeClass` | `string` | — | Active item CSS class |
| `container` | `element` | — | Scroll container |

### Features

- Auto-extracted from headings
- Active section tracking
- Nested heading hierarchy
- Smooth scroll navigation
- Collapsible sections

### Available In

Mantine (as TableOfContents), Flowbite (as custom), Carbon Svelte (as TableOfContents), Preline

---

## Text Divider

A horizontal divider with text content (label, heading, or action) in the center.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string \| element` | — | Center content |
| `position` | `'left' \| 'center' \| 'right'` | `'center'` | Label position |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Divider direction |
| `variant` | `'solid' \| 'dashed' \| 'dotted'` | `'solid'` | Line style |
| `color` | `string` | — | Line color |

### Features

- Text content within divider line
- Configurable label position
- Line style variants
- Vertical orientation

### Available In

Ant Design (as Divider with children), Mantine (as Divider with label), Chakra UI (as Divider), Material UI (as Divider textAlign), DaisyUI (as Divider with text)

---

## Transfer

A dual-list component for moving items between two columns (source and target).

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dataSource` | `array` | — | All available items |
| `targetKeys` | `string[]` | — | Keys in target list |
| `onChange` | `function` | — | Transfer callback |
| `titles` | `string[]` | — | Column titles |
| `render` | `function` | — | Item render function |
| `showSearch` | `boolean` | `false` | Enable search |
| `oneWay` | `boolean` | `false` | One-direction only |
| `pagination` | `boolean \| object` | — | Pagination config |

### Features

- Dual list with move buttons
- Search/filter in each list
- Select all per list
- Drag-and-drop transfer
- Pagination for large lists
- Custom item rendering
- Tree transfer variant

### Available In

Ant Design (as Transfer), PrimeReact (as PickList), PrimeVue (as PickList), Material UI (as TransferList pattern), Mantine (as TransferList)

---

## Transition

A wrapper that applies enter/exit animations to its children when they mount/unmount or change state.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `show` | `boolean` | — | Control visibility |
| `enter` | `string` | — | Enter transition classes |
| `enterFrom` | `string` | — | Enter start state |
| `enterTo` | `string` | — | Enter end state |
| `leave` | `string` | — | Leave transition classes |
| `leaveFrom` | `string` | — | Leave start state |
| `leaveTo` | `string` | — | Leave end state |
| `duration` | `number \| object` | `300` | Duration (ms) |
| `name` | `string` | — | Named transition preset |
| `appear` | `boolean` | `false` | Animate on initial mount |

### Features

- CSS class-based transitions
- Enter and leave animations
- Duration control
- Appear on mount
- Nested transition groups
- Named presets (fade, slide, scale)
- JavaScript animation hooks

### Available In

Mantine (as Transition), SvelteUI (as Transition), Svelte (built-in transition directive), Carbon Svelte (as various transitions), Kobalte (as Transition)

---

## Truncate

A text component that truncates overflow with an ellipsis, optionally with a "show more" toggle.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `lines` | `number` | `1` | Number of visible lines |
| `expandable` | `boolean` | `false` | Show expand/collapse toggle |
| `symbol` | `string \| element` | `'...'` | Truncation symbol |
| `width` | `string \| number` | — | Max width for inline truncation |

### Features

- Single and multi-line truncation
- Expand/collapse toggle
- Tooltip on hover showing full text
- CSS-based line clamping

### Available In

Ant Design (as Typography.Paragraph ellipsis), Chakra UI (as Text noOfLines), Mantine (as Text truncate/lineClamp), Carbon Svelte (as Truncate), HeroUI

---

## Upload / File Upload

A file upload component with drag-and-drop, file list, and progress display.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `accept` | `string` | — | Accepted file types |
| `multiple` | `boolean` | `false` | Multiple file selection |
| `maxSize` | `number` | — | Max file size (bytes) |
| `maxFiles` | `number` | — | Max number of files |
| `disabled` | `boolean` | `false` | Disabled state |
| `action` | `string` | — | Upload URL |
| `customRequest` | `function` | — | Custom upload handler |
| `beforeUpload` | `function` | — | Pre-upload validation |
| `listType` | `'text' \| 'picture' \| 'picture-card'` | `'text'` | File list display |
| `directory` | `boolean` | `false` | Allow directory upload |
| `dragAndDrop` | `boolean` | `true` | Enable drag-and-drop |

### Sub-components

- **Upload.Dragger** — Drag-and-drop zone
- **Upload.FileList** — Uploaded files display
- **Upload.Trigger** — Click-to-upload button

### Features

- Drag-and-drop zone
- File type validation
- Size limit enforcement
- Upload progress
- Preview thumbnails
- File list with remove
- Directory upload
- Paste upload
- Chunk upload for large files

### Available In

Ant Design (as Upload), PrimeReact (as FileUpload), PrimeVue (as FileUpload), Material UI (as custom), Mantine (as Dropzone/FileInput), Carbon Svelte (as FileUploader), Flowbite, Ark UI (as FileUpload), Park UI, Preline, Kibo UI

---

## Visually Hidden

A utility component that hides content visually while keeping it accessible to screen readers.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `as` | `string` | `'span'` | Rendered element |
| `focusable` | `boolean` | `false` | Visible on focus |

### Features

- Screen reader accessible
- Zero visual footprint
- Focusable variant (visible on focus for skip links)

### Available In

Radix UI (as VisuallyHidden), Bits UI, Kobalte, Oku UI, Chakra UI, Mantine, SvelteUI

---

## Flex

A layout utility component that applies CSS flexbox properties to arrange children.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `direction` | `'row' \| 'column' \| 'row-reverse' \| 'column-reverse'` | `'row'` | Flex direction |
| `wrap` | `'nowrap' \| 'wrap' \| 'wrap-reverse'` | `'nowrap'` | Flex wrap |
| `align` | `string` | `'stretch'` | Align items |
| `justify` | `string` | `'flex-start'` | Justify content |
| `gap` | `number \| string` | — | Gap between children |
| `flex` | `string` | — | Flex shorthand for child sizing |
| `basis` | `string` | — | Flex basis |
| `grow` | `number` | — | Flex grow |
| `shrink` | `number` | — | Flex shrink |

### Features

- Full flexbox API
- Responsive props
- Shorthand direction helpers

### Available In

Ant Design (as Flex), Chakra UI (as Flex/Box), Mantine (as Flex), Material UI (as Box), SvelteUI (as Flex)

---

## Hero

A large banner section at the top of a page with headline, description, call-to-action buttons, and optional media.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string \| element` | — | Main headline |
| `description` | `string` | — | Supporting text |
| `image` | `string` | — | Hero image URL |
| `overlay` | `boolean` | `false` | Image overlay |
| `centered` | `boolean` | `false` | Center-aligned content |
| `fullHeight` | `boolean` | `false` | Full viewport height |
| `variant` | `string` | `'default'` | Layout variant |

### Features

- Full-width banner layout
- Background image with overlay
- Video backgrounds
- CTA button slots
- Responsive stacking

### Available In

DaisyUI (as Hero), Flowbite, HyperUI, Preline, Tailwind Plus

---

## Indicator

A small badge or dot positioned at the corner of another element to show status, count, or notification.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number \| string` | — | Badge content |
| `color` | `string` | `'primary'` | Badge color |
| `position` | `string` | `'top-right'` | Corner position |
| `processing` | `boolean` | `false` | Pulsing animation |
| `dot` | `boolean` | `false` | Show as dot (no content) |
| `showZero` | `boolean` | `false` | Show when value is 0 |
| `overflowCount` | `number` | `99` | Max displayed count |

### Features

- Corner positioning (all 4 corners)
- Overflow count (99+)
- Dot mode
- Processing animation
- Auto-hide at zero

### Available In

DaisyUI (as Indicator), Ant Design (as Badge), HeroUI (as Badge), Material UI (as Badge), Flowbite (as Badge indicator)

---

## Loading Overlay

A full-area overlay with spinner or progress indicator that covers content during loading.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `visible` | `boolean` | — | Show/hide overlay |
| `loader` | `element` | — | Custom loader element |
| `overlayOpacity` | `number` | `0.75` | Background opacity |
| `overlayColor` | `string` | — | Background color |
| `overlayBlur` | `number` | — | Backdrop blur (px) |
| `transitionDuration` | `number` | `200` | Fade duration (ms) |
| `loaderProps` | `object` | — | Props passed to loader |
| `zIndex` | `number` | `400` | Stack order |

### Features

- Full-area coverage
- Custom spinner/loader
- Blur backdrop
- Transition animation
- Relative or fixed positioning

### Available In

Mantine (as LoadingOverlay), PrimeReact (as BlockUI), PrimeVue (as BlockUI), SvelteUI (as Overlay), Ant Design (as Spin), Carbon Svelte (as Loading)

---

## Masonry

A layout component that arranges items in a staggered grid where items fill vertical space optimally, like bricks in a wall.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `number \| object` | `3` | Number of columns (or responsive) |
| `gap` | `number \| string` | `'1rem'` | Gap between items |
| `sequential` | `boolean` | `false` | Fill columns left-to-right |

### Features

- CSS-based or JS-based layout
- Responsive column count
- Animated item entry
- Infinite scroll integration
- Dynamic item heights

### Available In

Material UI (as Masonry), Mantine (as SimpleGrid masonry pattern), Chakra UI (as custom), Flowbite

---

## Scroll Indicator

A visual progress bar showing how far down the page or container the user has scrolled.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `color` | `string` | `'primary'` | Bar color |
| `height` | `number` | `3` | Bar height (px) |
| `position` | `'top' \| 'bottom'` | `'top'` | Bar position |
| `container` | `element` | `window` | Scroll container |
| `zIndex` | `number` | `100` | Stack order |

### Features

- Scroll-linked width animation
- Custom scroll containers
- Fixed positioning
- Gradient colors

### Available In

Flowbite, Preline, HyperUI, Stunning UI
