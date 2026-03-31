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

export const ProgressLocation = {
  SourceControl: 1,
  Window: 10,
  Notification: 15,
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
}

export class Uri {
  private constructor(
    public readonly scheme: string,
    public readonly fsPath: string,
  ) {}

  static file(path: string): Uri {
    return new Uri('file', path);
  }

  static parse(value: string): Uri {
    return new Uri('https', value);
  }

  toString(): string {
    return this.fsPath;
  }
}

export class ThemeColor {
  constructor(public readonly id: string) {}
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
  dispose: ReturnType<typeof vi.fn>;
  name: string;
} {
  return {
    appendLine: vi.fn(),
    show: vi.fn(),
    dispose: vi.fn(),
    name: 'Resist',
  };
}

function createMockStatusBarItem(): {
  text: string;
  tooltip: string;
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
} {
  const store = new Map<string, Diagnostic[]>();
  return {
    name: 'resist-linter',
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
    forEach: vi.fn(),
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
};

export const window = {
  createOutputChannel: vi.fn(createMockOutputChannel),
  createStatusBarItem: vi.fn(createMockStatusBarItem),
  showWarningMessage: vi.fn(),
  showErrorMessage: vi.fn(),
  showInformationMessage: vi.fn(),
  activeTextEditor: undefined as
    | { document: { uri: Uri; getText: () => string; positionAt: (o: number) => Position } }
    | undefined,
  onDidChangeActiveTextEditor: vi.fn(() => createMockDisposable()),
  withProgress: vi.fn(
    async (
      _options: unknown,
      task: (progress: { report: (value: unknown) => void }) => Promise<void>,
    ) => {
      await task({ report: vi.fn() });
    },
  ),
};

export const languages = {
  createDiagnosticCollection: vi.fn(createMockDiagnosticCollection),
  registerCodeActionsProvider: vi.fn(() => createMockDisposable()),
};

export const commands = {
  registerCommand: vi.fn((_cmd: string, _handler: (...args: unknown[]) => unknown) =>
    createMockDisposable(),
  ),
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
