# Resist Linter Test

A multi-language linting solution with VS Code integration.

## Features

- **90+ file types supported**
- **Real-time diagnostics** - errors show inline as you type
- **Package.json scripts** - `pnpm lint`, `pnpm lint:fix`
- **Lefthook integration** - pre-commit linting
- **VS Code extension** - Problems panel integration

## Setup

1. Install dependencies:

```bash
cd linter-test
pnpm install
```

2. Build the VS Code extension:

```bash
cd extensions/resist-linter
pnpm install
pnpm compile
```

3. Install the extension in VS Code:

```bash
code --install-extension extensions/resist-linter
```

Or open VS Code and run "Developer: Install Extension from Location..." and select the `extensions/resist-linter` folder.

## Usage

### CLI

```bash
# Lint everything
pnpm lint

# Lint with auto-fix
pnpm lint:fix

# Lint a single file
pnpm lint:file path/to/file.ts

# Get JSON output
pnpm lint:json path/to/file.ts
```

### VS Code

Once the extension is installed:

1. Open any file
2. Errors will appear inline with red squigglies
3. Check the Problems panel (Ctrl+Shift+M) for all issues
4. Use "Resist Linter: Lint Current File" command

### Lefthook (Git Hooks)

```bash
# Install lefthook
pnpm add -D lefthook

# Install hooks
pnpm lefthook install
```

Now linting runs automatically on:
- `pre-commit` - lints staged files
- `pre-push` - lints entire project

## Supported Languages

| Category | Languages |
|----------|-----------|
| Web | JS, TS, JSX, TSX, Svelte, Vue, Astro |
| Styles | CSS, SCSS, Sass, Less |
| Data | JSON, YAML, TOML, XML, CSV |
| Docs | Markdown, RST, AsciiDoc |
| Shell | Bash, Zsh, Fish, PowerShell |
| Python | .py, .pyi |
| Rust | .rs, Cargo.toml |
| C/C++ | .c, .h, .cpp, .m, .mm |
| Swift | .swift |
| Go | .go |
| JVM | Java, Kotlin, Scala, Groovy |
| .NET | C#, F#, VB |
| Ruby | .rb, Gemfile, Podfile, Fastfile |
| PHP | .php |
| Config | .editorconfig, .npmrc, .nvmrc, .gitignore, .gitattributes, .env |
| Infra | Dockerfile, Terraform, HCL |
| Build | Makefile, CMake, Ninja, Just |
| And more... | 90+ total file types |

## Test Files

The `test-files/` directory contains intentionally broken files to test the linter:

- `.nvmrc` - invalid version format
- `.editorconfig` - invalid property values
- `.gitignore` - duplicate patterns, invalid syntax
- `invalid.json` - malformed JSON
- `example.ts` - TypeScript linting issues
- `.npmrc` - unknown settings
- `Makefile` - tabs/spaces issues

Run `pnpm lint test-files/` to see the linter in action.

## Architecture

```
linter-test/
├── scripts/
│   └── lint.mjs              # Main linting CLI
├── extensions/
│   └── resist-linter/        # VS Code extension
│       ├── src/
│       │   └── extension.ts  # Extension entry point
│       ├── package.json
│       └── tsconfig.json
├── .vscode/
│   ├── settings.json         # Extension settings
│   ├── extensions.json       # Recommended extensions
│   └── tasks.json            # Build tasks
├── lefthook.yml              # Git hooks config
└── package.json              # Scripts and deps
```

## How It Works

1. **CLI** (`scripts/lint.mjs`):
   - Detects file type from extension/filename
   - Routes to appropriate linter (external CLI or custom)
   - Outputs in unix format (`file:line:col: severity: message`)
   - Or JSON format with `--json` flag

2. **VS Code Extension**:
   - Spawns the lint script on file open/save/change
   - Parses output and creates diagnostics
   - Pushes diagnostics to Problems panel
   - Shows inline squigglies

3. **Lefthook**:
   - Runs lint script on staged files
   - Blocks commit if errors found

## Adding New Linters

Edit `scripts/lint.mjs`:

1. Add file extension mapping in `getLinter()`
2. Create linter function that returns `{ file, line, column, severity, message }[]`
3. Use `runCli()` helper for external tools
4. Use custom logic for files without CLI tools

Example:

```javascript
function lintMyLanguage(file) {
	return runCli(`my-linter --format=unix "${file}"`, parseUnixOutput);
}

// Add to extLinters:
'.mylang': lintMyLanguage,
```
