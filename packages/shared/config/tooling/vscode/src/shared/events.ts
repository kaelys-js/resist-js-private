/**
 * Document Event Registry
 *
 * Pluggable hook system where tools register for document lifecycle events.
 * Each tool declares which events it cares about; the registry handles
 * filtering, config checks, and dispatch.
 *
 * @module
 */

import * as vscode from 'vscode';
import { isWorkspaceDocument } from './document-filter';
import { safeRun } from './errors';

/** Supported document lifecycle event types. */
type DocumentEventType = 'open' | 'save' | 'change' | 'close';

/** A registered event handler with its associated tool name. */
type RegisteredHandler = {
  readonly tool: string;
  readonly handler: (doc: vscode.TextDocument) => void;
};

/**
 * Registry for document lifecycle events.
 *
 * Tools register handlers for specific events (open, save, change, close).
 * The registry manages a single set of VS Code event listeners and dispatches
 * to all registered handlers with error boundaries and document filtering.
 */
export class DocumentEventRegistry implements vscode.Disposable {
  private readonly handlers = new Map<DocumentEventType, RegisteredHandler[]>();
  private readonly disposables: vscode.Disposable[] = [];
  private readonly outputChannel?: vscode.OutputChannel;
  private initialized = false;

  /**
   * Creates a new DocumentEventRegistry.
   *
   * @param outputChannel - Optional output channel for logging
   */
  constructor(outputChannel?: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
    for (const event of ['open', 'save', 'change', 'close'] as DocumentEventType[]) {
      this.handlers.set(event, []);
    }
  }

  /**
   * Registers a handler for document open events.
   *
   * @param tool - Tool name (e.g., 'lint', 'format')
   * @param handler - Handler function receiving the opened document
   */
  onOpen(tool: string, handler: (doc: vscode.TextDocument) => void): void {
    this.registerHandler('open', tool, handler);
  }

  /**
   * Registers a handler for document save events.
   *
   * @param tool - Tool name
   * @param handler - Handler function receiving the saved document
   */
  onSave(tool: string, handler: (doc: vscode.TextDocument) => void): void {
    this.registerHandler('save', tool, handler);
  }

  /**
   * Registers a handler for document change events.
   *
   * @param tool - Tool name
   * @param handler - Handler function receiving the changed document
   */
  onChange(tool: string, handler: (doc: vscode.TextDocument) => void): void {
    this.registerHandler('change', tool, handler);
  }

  /**
   * Registers a handler for document close events.
   *
   * @param tool - Tool name
   * @param handler - Handler function receiving the closed document
   */
  onClose(tool: string, handler: (doc: vscode.TextDocument) => void): void {
    this.registerHandler('close', tool, handler);
  }

  /**
   * Initializes VS Code event listeners.
   *
   * Must be called after all handlers are registered. Creates the actual
   * VS Code event subscriptions that dispatch to registered handlers.
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    this.disposables.push(
      vscode.workspace.onDidOpenTextDocument((doc) => {
        this.dispatch('open', doc);
      }),
    );

    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument((doc) => {
        this.dispatch('save', doc);
      }),
    );

    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.contentChanges.length > 0) {
          this.dispatch('change', event.document);
        }
      }),
    );

    this.disposables.push(
      vscode.workspace.onDidCloseTextDocument((doc) => {
        this.dispatch('close', doc);
      }),
    );
  }

  /**
   * Returns the number of registered handlers for a given event type.
   *
   * @param event - The event type to count handlers for
   * @returns Number of registered handlers
   */
  handlerCount(event: DocumentEventType): number {
    return this.handlers.get(event)?.length ?? 0;
  }

  /**
   * Disposes all event listeners and clears handlers.
   */
  dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables.length = 0;
    for (const handlers of this.handlers.values()) {
      handlers.length = 0;
    }
    this.initialized = false;
  }

  /**
   * Registers a handler for a specific event type.
   *
   * @param event - The event type to register for
   * @param tool - Tool name identifier
   * @param handler - Handler function for the event
   */
  private registerHandler(
    event: DocumentEventType,
    tool: string,
    handler: (doc: vscode.TextDocument) => void,
  ): void {
    const handlers: RegisteredHandler[] | undefined = this.handlers.get(event);

    if (handlers) {
      handlers.push({ tool, handler });
    }
  }

  /**
   * Dispatches an event to all registered handlers.
   *
   * Filters out non-workspace documents (except for 'close' events).
   * Each handler is wrapped in a safeRun error boundary.
   *
   * @param event - The event type to dispatch
   * @param doc - The document that triggered the event
   */
  private dispatch(event: DocumentEventType, doc: vscode.TextDocument): void {
    // Skip non-workspace documents (except close — always allow cleanup)
    if (event !== 'close' && !isWorkspaceDocument(doc)) {
      return;
    }

    const handlers: RegisteredHandler[] | undefined = this.handlers.get(event);

    if (!handlers || handlers.length === 0) {
      return;
    }

    for (const { tool, handler } of handlers) {
      if (this.outputChannel) {
        safeRun(this.outputChannel, `event:${tool}:${event}`, () => {
          handler(doc);
        });
      } else {
        try {
          handler(doc);
        } catch {
          // Error caught to prevent unhandled exception — no output channel available for logging
        }
      }
    }
  }
}
