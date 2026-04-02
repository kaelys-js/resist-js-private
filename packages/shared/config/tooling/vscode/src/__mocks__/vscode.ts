/**
 * VSCode API Mock for Vitest
 *
 * Minimal mock implementations of the vscode module APIs used by the
 * Resist extension. Used via vi.mock('vscode') in test files.
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-55.md TASK 9
 *
 * @module
 */

import { vi } from 'vitest';
import { BRAND_NAME, DIAGNOSTIC_COLLECTION_NAME } from '../shared/brand';

// =============================================================================
// Enums
// =============================================================================

export const DiagnosticSeverity = {
  Error: 0,
  Warning: 1,
  Information: 2,
  Hint: 3,
} as const;

export const StatusBarAlignment = {
  Left: 1,
  Right: 2,
} as const;

export const ViewColumn = {
  Active: -1,
  Beside: -2,
  One: 1,
  Two: 2,
  Three: 3,
} as const;

export const ProgressLocation = {
  SourceControl: 1,
  Window: 10,
  Notification: 15,
} as const;

export const ConfigurationTarget = {
  Global: 1,
  Workspace: 2,
  WorkspaceFolder: 3,
} as const;

export const QuickPickItemKind = {
  Default: -1,
  Separator: 0,
} as const;

export const TreeItemCollapsibleState = {
  None: 0,
  Collapsed: 1,
  Expanded: 2,
} as const;

// =============================================================================
// Classes
// =============================================================================

export class Position {
  constructor(
    public readonly line: number,
    public readonly character: number,
  ) {}
}

export class Range {
  public readonly start: Position;
  public readonly end: Position;

  constructor(
    startLine: number | Position,
    startCharacter?: number | Position,
    endLine?: number,
    endColumn?: number,
  ) {
    if (startLine instanceof Position && startCharacter instanceof Position) {
      this.start = startLine;
      this.end = startCharacter;
    } else {
      this.start = new Position(startLine as number, (startCharacter as number) ?? 0);
      this.end = new Position(endLine ?? (startLine as number), endColumn ?? 0);
    }
  }

  contains(positionOrRange: Position | Range): boolean {
    if (positionOrRange instanceof Position) {
      const pos = positionOrRange;

      if (pos.line < this.start.line || pos.line > this.end.line) {
        return false;
      }

      if (pos.line === this.start.line && pos.character < this.start.character) {
        return false;
      }

      if (pos.line === this.end.line && pos.character > this.end.character) {
        return false;
      }

      return true;
    }

    return this.contains(positionOrRange.start) && this.contains(positionOrRange.end);
  }
}

export class Uri {
  public readonly path: string;

  private constructor(
    public readonly scheme: string,
    public readonly fsPath: string,
  ) {
    this.path = fsPath;
  }

  static file(path: string): Uri {
    return new Uri('file', path);
  }

  static parse(value: string): Uri {
    // Parse "scheme:path" format
    const colonIndex: number = value.indexOf(':');
    if (colonIndex > 0) {
      const scheme: string = value.slice(0, colonIndex);
      const path: string = value.slice(colonIndex + 1);
      return new Uri(scheme, path);
    }
    return new Uri('https', value);
  }

  toString(): string {
    return this.fsPath;
  }
}

export class ThemeColor {
  constructor(public readonly id: string) {}
}

export class MarkdownString {
  public value: string = '';
  public isTrusted: boolean = false;
  public supportHtml: boolean = false;
  public supportThemeIcons: boolean = false;

  constructor(value?: string) {
    this.value = value ?? '';
  }

  appendMarkdown(value: string): this {
    this.value += value;
    return this;
  }

  appendText(value: string): this {
    this.value += value;
    return this;
  }
}

export class Hover {
  constructor(
    public readonly contents: MarkdownString | MarkdownString[],
    public readonly range?: Range,
  ) {
    if (!Array.isArray(contents)) {
      this.contents = [contents];
    }
  }
}

export class Diagnostic {
  public source?: string;
  public code?: string | number | { value: string | number; target: Uri };
  public data?: unknown;

  constructor(
    public readonly range: Range,
    public readonly message: string,
    public readonly severity: number = DiagnosticSeverity.Error,
  ) {}
}

export class CodeAction {
  public diagnostics?: Diagnostic[];
  public isPreferred?: boolean;
  public edit?: WorkspaceEdit;
  public command?: unknown;

  constructor(
    public readonly title: string,
    public readonly kind?: { value: string },
  ) {}
}

export const CodeActionKind = {
  QuickFix: { value: 'quickfix' },
  Refactor: { value: 'refactor' },
  Source: { value: 'source' },
} as const;

export const CodeActionTriggerKind = {
  Invoke: 1,
  Automatic: 2,
} as const;

export class EventEmitter<T> {
  private listeners: Array<(e: T) => void> = [];

  get event(): (listener: (e: T) => void) => { dispose: () => void } {
    return (listener: (e: T) => void) => {
      this.listeners.push(listener);
      return {
        dispose: () => {
          const idx = this.listeners.indexOf(listener);
          if (idx >= 0) {
            this.listeners.splice(idx, 1);
          }
        },
      };
    };
  }

  fire(data: T): void {
    for (const listener of this.listeners) {
      listener(data);
    }
  }

  dispose(): void {
    this.listeners = [];
  }
}

export class CodeLens {
  constructor(
    public readonly range: Range,
    public readonly command?: { title: string; command: string; arguments?: unknown[] },
  ) {}
}

export class ThemeIcon {
  static readonly File = new ThemeIcon('file');
  static readonly Folder = new ThemeIcon('folder');

  constructor(
    public readonly id: string,
    public readonly color?: ThemeColor,
  ) {}
}

export class TreeItem {
  public label?: string;
  public description?: string;
  public tooltip?: string | MarkdownString;
  public iconPath?: ThemeIcon | Uri | { light: Uri; dark: Uri };
  public command?: { title: string; command: string; arguments?: unknown[] };
  public contextValue?: string;
  public collapsibleState?: number;
  public resourceUri?: Uri;
  public id?: string;

  constructor(label: string, collapsibleState?: number) {
    this.label = label;
    this.collapsibleState = collapsibleState;
  }
}

export class TextEdit {
  constructor(
    public readonly range: Range,
    public readonly newText: string,
  ) {}

  static replace(range: Range, newText: string): TextEdit {
    return new TextEdit(range, newText);
  }

  static insert(position: Position, newText: string): TextEdit {
    return new TextEdit(new Range(position, position), newText);
  }

  static delete(range: Range): TextEdit {
    return new TextEdit(range, '');
  }
}

export class WorkspaceEdit {
  private edits: Array<{ uri: Uri; range: Range; newText: string }> = [];

  replace(uri: Uri, range: Range, newText: string): void {
    this.edits.push({ uri, range, newText });
  }

  entries(): Array<{ uri: Uri; range: Range; newText: string }> {
    return this.edits;
  }
}

// =============================================================================
// Mock Factories
// =============================================================================

function createMockOutputChannel(): {
  appendLine: ReturnType<typeof vi.fn>;
  show: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  name: string;
  logLevel: number;
  onDidChangeLogLevel: ReturnType<typeof vi.fn>;
  trace: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
} {
  return {
    appendLine: vi.fn(),
    show: vi.fn(),
    clear: vi.fn(),
    dispose: vi.fn(),
    name: BRAND_NAME,
    logLevel: 1,
    onDidChangeLogLevel: vi.fn(() => createMockDisposable()),
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function createMockStatusBarItem(): {
  text: string;
  tooltip: string | MarkdownString | undefined;
  command: string | undefined;
  backgroundColor: unknown;
  show: ReturnType<typeof vi.fn>;
  hide: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
} {
  return {
    text: '',
    tooltip: '',
    command: undefined,
    backgroundColor: undefined,
    show: vi.fn(),
    hide: vi.fn(),
    dispose: vi.fn(),
  };
}

function createMockDiagnosticCollection(): {
  name: string;
  set: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  forEach: ReturnType<typeof vi.fn>;
  [Symbol.iterator]: () => IterableIterator<[Uri, Diagnostic[]]>;
} {
  const store = new Map<string, Diagnostic[]>();

  return {
    name: DIAGNOSTIC_COLLECTION_NAME,
    set: vi.fn((uri: Uri, diags: Diagnostic[]) => {
      store.set(uri.toString(), diags);
    }),
    get: vi.fn((uri: Uri) => store.get(uri.toString())),
    delete: vi.fn((uri: Uri) => {
      store.delete(uri.toString());
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
    dispose: vi.fn(),
    forEach: vi.fn(
      (callback: (uri: Uri, diagnostics: Diagnostic[], collection: unknown) => void) => {
        for (const [uriStr, diags] of store) {
          callback(Uri.file(uriStr), diags, undefined);
        }
      },
    ),
    *[Symbol.iterator](): IterableIterator<[Uri, Diagnostic[]]> {
      for (const [uriStr, diags] of store) {
        yield [Uri.file(uriStr), diags];
      }
    },
  };
}

function createMockDisposable(): { dispose: ReturnType<typeof vi.fn> } {
  return { dispose: vi.fn() };
}

// =============================================================================
// Namespace Mocks
// =============================================================================

const configValues: Record<string, unknown> = {};

export const workspace = {
  getConfiguration: vi.fn((_section?: string) => ({
    get: vi.fn(<T>(key: string, defaultValue?: T): T => {
      const fullKey: string = _section ? `${_section}.${key}` : key;
      return (configValues[fullKey] as T) ?? (defaultValue as T);
    }),
    update: vi.fn(),
    has: vi.fn(() => true),
    inspect: vi.fn(),
  })),
  getWorkspaceFolder: vi.fn((_uri: Uri) => undefined),
  workspaceFolders: undefined as Array<{ uri: Uri; name: string; index: number }> | undefined,
  textDocuments: [] as Array<{
    uri: Uri;
    isUntitled: boolean;
    getText: () => string;
    lineAt: (line: number) => { text: string };
    lineCount: number;
    positionAt: (offset: number) => Position;
    getWordRangeAtPosition: (pos: Position) => Range | undefined;
  }>,
  createFileSystemWatcher: vi.fn(() => ({
    onDidChange: vi.fn(),
    onDidCreate: vi.fn(),
    onDidDelete: vi.fn(),
    dispose: vi.fn(),
  })),
  onDidOpenTextDocument: vi.fn(() => createMockDisposable()),
  onDidSaveTextDocument: vi.fn(() => createMockDisposable()),
  onDidChangeTextDocument: vi.fn(() => createMockDisposable()),
  onDidCloseTextDocument: vi.fn(() => createMockDisposable()),
  onDidChangeConfiguration: vi.fn(() => createMockDisposable()),
  applyEdit: vi.fn(async () => true),
  openTextDocument: vi.fn(async () => ({
    uri: Uri.parse('untitled:mock'),
    getText: () => '',
    lineAt: () => ({ text: '' }),
    lineCount: 0,
    positionAt: () => new Position(0, 0),
  })),
  registerTextDocumentContentProvider: vi.fn(() => createMockDisposable()),
};

export const window = {
  createOutputChannel: vi.fn(createMockOutputChannel),
  createStatusBarItem: vi.fn(createMockStatusBarItem),
  showWarningMessage: vi.fn(),
  showErrorMessage: vi.fn(),
  showInformationMessage: vi.fn(),
  showTextDocument: vi.fn(async () => ({})),
  createTextEditorDecorationType: vi.fn(() => ({ dispose: vi.fn() })),
  activeTextEditor: undefined as
    | { document: { uri: Uri; getText: () => string; positionAt: (o: number) => Position } }
    | undefined,
  visibleTextEditors: [] as Array<{ document: { uri: Uri } }>,
  onDidChangeActiveTextEditor: vi.fn(() => createMockDisposable()),
  createTreeView: vi.fn((_viewId: string, _options: unknown) => ({
    reveal: vi.fn(),
    dispose: vi.fn(),
    visible: true,
    onDidChangeVisibility: vi.fn(() => createMockDisposable()),
    badge: undefined as { value: number; tooltip: string } | undefined,
    description: undefined as string | undefined,
    message: undefined as string | undefined,
  })),
  createWebviewPanel: vi.fn(
    (_viewType: string, _title: string, _showOptions: unknown, _options?: unknown) => ({
      webview: { html: '', cspSource: 'https://test.csp', asWebviewUri: vi.fn((uri: Uri) => uri) },
      reveal: vi.fn(),
      dispose: vi.fn(),
      onDidDispose: vi.fn((cb: () => void) => {
        // Store callback for test access
        (window.createWebviewPanel as ReturnType<typeof vi.fn>).__disposeCallback = cb;
        return createMockDisposable();
      }),
      visible: true,
    }),
  ),
  showQuickPick: vi.fn(async () => undefined),
  showInputBox: vi.fn(async () => undefined),
  withProgress: vi.fn(
    async (
      _options: unknown,
      task: (
        progress: { report: (value: unknown) => void },
        token: { isCancellationRequested: boolean },
      ) => Promise<void>,
    ) => {
      await task({ report: vi.fn() }, { isCancellationRequested: false });
    },
  ),
};

export const languages = {
  createDiagnosticCollection: vi.fn(createMockDiagnosticCollection),
  registerCodeActionsProvider: vi.fn(() => createMockDisposable()),
  registerHoverProvider: vi.fn(() => createMockDisposable()),
  registerCodeLensProvider: vi.fn(() => createMockDisposable()),
  registerDocumentFormattingEditProvider: vi.fn(() => createMockDisposable()),
  onDidChangeDiagnostics: vi.fn(() => createMockDisposable()),
  setTextDocumentLanguage: vi.fn(async () => ({})),
};

export const commands = {
  registerCommand: vi.fn((_cmd: string, _handler: (...args: unknown[]) => unknown) =>
    createMockDisposable(),
  ),
  registerTextEditorCommand: vi.fn(
    (_cmd: string, _handler: (editor: unknown, edit: unknown, ...args: unknown[]) => unknown) =>
      createMockDisposable(),
  ),
  executeCommand: vi.fn(async () => undefined),
};

// =============================================================================
// Utilities
// =============================================================================

/** Helper to set mock config values for testing. */
export function __setConfigValue(key: string, value: unknown): void {
  configValues[key] = value;
}

/** Helper to reset all mock state. */
export function __resetMocks(): void {
  for (const key of Object.keys(configValues)) {
    delete configValues[key];
  }
  workspace.workspaceFolders = undefined;
  workspace.textDocuments = [];
  window.activeTextEditor = undefined;
}
