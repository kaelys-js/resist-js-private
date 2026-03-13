# CodeBlock

A syntax-highlighted code display component powered by [Shiki](https://shiki.style). Renders source code with accurate language grammars, automatic light/dark theme switching, and built-in developer tools including line numbers, word wrap, and inline search.

## Features

- **30+ language grammars** — Svelte, TypeScript, JavaScript, HTML, CSS, JSON, Markdown, Bash, and more via Shiki's TextMate grammar engine
- **Automatic theme switching** — Detects `dark` class on `<html>` and switches between `github-light` and `github-dark` themes in real-time
- **Lazy loading** — Shiki highlighter, grammars, and themes load on first render — zero cost if the component is never mounted
- **Inline search** — Find-in-source with match highlighting, keyboard navigation (Enter/Shift+Enter), and match counter
- **Line numbers** — CSS counter-based line numbers with perfect 1:1 alignment to Shiki's output spans
- **Word wrap** — Toggle long-line wrapping without horizontal scrolling
- **Language badge** — Displays the active language as a chip in the header bar
- **Options menu** — All display toggles (line numbers, word wrap, search) accessible from a ⋮ dropdown menu
- **Plain text fallback** — Shows unformatted code while Shiki loads or if highlighting fails

## Quick Start

```svelte
<script lang="ts">
  import CodeBlock from '@/ui/code-block/CodeBlock.svelte';
</script>

<CodeBlock code="console.log('hello')" lang="javascript" />
```

## Usage

### Basic

Display a code snippet with syntax highlighting. The `code` prop accepts any raw string and `lang` specifies the grammar.

```svelte
<CodeBlock
  code={`function greet(name: string): string {
  return \`Hello, \${name}!\`;
}`}
  lang="typescript"
/>
```

### With Line Numbers

Enable line numbers for longer code blocks. Numbers are rendered as CSS counter pseudo-elements on each line span, guaranteeing alignment even with variable-height wrapped lines.

```svelte
<CodeBlock
  code={sourceCode}
  lang="svelte"
  showLineNumbers
/>
```

### With Search

Enable the inline search bar for navigating large files. Users can toggle it from the ⋮ menu or you can enable it by default with the `showSearch` prop.

```svelte
<CodeBlock
  code={sourceCode}
  lang="typescript"
  showSearch
/>
```

### With Word Wrap

Prevent horizontal scrolling by enabling word wrap. Useful for prose-heavy formats like Markdown or long template literals.

```svelte
<CodeBlock
  code={markdownSource}
  lang="markdown"
  wordWrap
/>
```

### All Options

Combine all display options for a full-featured code viewer.

```svelte
<CodeBlock
  code={sourceCode}
  lang="svelte"
  showLineNumbers
  showSearch
  wordWrap
  class="my-4"
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `code` | `Str` | — | **Required.** Raw source code string to highlight. |
| `lang` | `Str` | `undefined` | Language grammar for syntax highlighting. Falls back to `"svelte"` internally. |
| `showLineNumbers` | `Bool` | `false` | Whether to show line numbers in the gutter. |
| `showSearch` | `Bool` | `false` | Whether the inline search bar is available (toggled via ⋮ menu). |
| `wordWrap` | `Bool` | `false` | Whether long lines wrap instead of scrolling horizontally. |
| `class` | `Str` | `undefined` | Additional CSS classes applied to the root `<div>`. |

## Supported Languages

CodeBlock delegates language support to Shiki, which includes all TextMate grammars. Common languages:

| Language | `lang` value |
|----------|-------------|
| Svelte | `svelte` |
| TypeScript | `typescript` |
| JavaScript | `javascript` |
| HTML | `html` |
| CSS | `css` |
| JSON | `json` |
| Markdown | `markdown` |
| Bash / Shell | `bash` |
| Python | `python` |
| Rust | `rust` |
| Go | `go` |
| SQL | `sql` |

For the full list, see the [Shiki languages documentation](https://shiki.style/languages).

## Keyboard Navigation

The search bar supports keyboard shortcuts for efficient navigation:

| Key | Action |
|-----|--------|
| `Enter` | Jump to next match |
| `Shift + Enter` | Jump to previous match |
| `Escape` | Close the search bar |

## Theming

CodeBlock uses Shiki's `github-light` and `github-dark` themes, automatically selected based on the presence of a `dark` class on the document root element (`<html class="dark">`).

### Theme Detection

The component reads `document.documentElement.classList.contains('dark')` reactively. When your app toggles dark mode by adding/removing the `dark` class, CodeBlock re-highlights with the appropriate theme.

### Custom Styling

The root element accepts a `class` prop for layout customization. Internal elements use design token CSS variables for consistent theming:

- `--color-muted-foreground` — Line number color and menu icon color
- `--color-muted` — Badge backgrounds, menu hover states
- `--color-foreground` — Active text color

### Line Number Styling

Line numbers are rendered via CSS `::before` pseudo-elements with these characteristics:

- Fixed `3ch` width gutter with `1.5ch` right margin
- `0.3` opacity for subtle appearance
- `user-select: none` to prevent copying line numbers with code
- Uses the same `--color-muted-foreground` token as other UI elements

## Architecture

### Rendering Pipeline

1. **Props validation** — Valibot `strictObject` schema validates all inputs
2. **Shiki lazy load** — `import('shiki')` dynamically loads the highlighter on first render
3. **HTML generation** — `codeToHtml()` produces a `<pre><code>` structure with `<span class="line">` per line
4. **Theme injection** — Shiki inlines color styles; CodeBlock wraps in a themed container
5. **Search overlay** — When active, replaces Shiki HTML with escaped + `<mark>`-wrapped lines

### Loading States

| State | What renders |
|-------|-------------|
| Loading | Plain `<pre><code>` with unformatted source |
| Highlighted | Shiki HTML output via `{@html}` |
| Search active | Per-line rendered spans with `<mark>` tags for matches |
| Shiki failed | Plain `<pre><code>` fallback (same as loading) |

### Effect Cleanup

The Shiki highlighting effect uses a `cancelled` flag pattern for cleanup. When `code`, `lang`, or the dark mode state changes, any in-flight highlight operation is cancelled before starting a new one, preventing race conditions.

## Accessibility

- The ⋮ options menu button has `aria-label="Code block options"`
- Search navigation buttons have `aria-label="Previous match"` and `aria-label="Next match"`
- The close search button has `aria-label="Close search"`
- Line numbers use `user-select: none` so they are excluded from text selection and clipboard copy
- The search icon in the search bar is marked `aria-hidden="true"`
- Navigation buttons are `disabled` when there are zero matches

## Integration with LensSource

CodeBlock is the rendering engine used by the `LensSource` documentation component. LensSource adds section chrome (title, description, collapse toggle, copy-to-clipboard) around a CodeBlock instance:

```svelte
<LensSource
  name="button"
  source={rawCode}
  lang="typescript"
  showLineNumbers
  showSearch
/>
```

See the [LensSource documentation](#) for details on the wrapper component.
