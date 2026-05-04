/**
 * Diagnostic Filtering UI
 *
 * Provides commands to filter diagnostics by category using a
 * multi-select quick pick. Stores active filter and re-applies
 * when diagnostics change.
 *
 * @module
 */

import * as vscode from 'vscode';
import { log } from '../shared/output';
import { en } from '../locale/en';
import { format } from '../locale/schema';
import { DIAGNOSTIC_SOURCE } from '../shared/brand';

/**
 * Collects entries from a DiagnosticCollection into an array.
 *
 * @param collection - The diagnostic collection to iterate
 * @returns Array of [uri, diagnostics] pairs
 */
function collectEntries(
  collection: vscode.DiagnosticCollection,
): Array<[vscode.Uri, readonly vscode.Diagnostic[]]> {
  const result: Array<[vscode.Uri, readonly vscode.Diagnostic[]]> = [];

  // DiagnosticCollection implements Iterable<[Uri, readonly Diagnostic[]]>
  for (const [uri, diagnostics] of collection) {
    result.push([uri, diagnostics]);
  }
  return result;
}

/**
 * Manages diagnostic filtering by category.
 *
 * Stores an active category filter and can apply/clear it on a
 * diagnostic collection. Categories are extracted from rule IDs
 * (the part before the first '/').
 */
export class DiagnosticFilter implements vscode.Disposable {
  private activeCategories: Set<string> | undefined;
  private readonly channel?: vscode.OutputChannel;
  private originalDiagnostics = new Map<string, readonly vscode.Diagnostic[]>();

  /**
   * Creates a new DiagnosticFilter.
   *
   * @param channel - Optional output channel for logging
   */
  constructor(channel?: vscode.OutputChannel) {
    this.channel = channel;
  }

  /**
   * Extracts unique categories from diagnostics in a collection.
   *
   * Categories are derived from rule IDs (part before first '/').
   *
   * @param collection - The diagnostic collection to scan
   * @returns Array of unique category names
   */
  extractCategories(collection: vscode.DiagnosticCollection): string[] {
    const categories = new Set<string>();

    for (const [_uri, diagnostics] of collectEntries(collection)) {
      for (const diag of diagnostics) {
        if (diag.source !== DIAGNOSTIC_SOURCE) {
          continue;
        }

        const ruleId: string =
          typeof diag.code === 'object' && diag.code !== null
            ? String((diag.code as { value: string | number }).value)
            : String(diag.code ?? '');
        const slashIndex: number = ruleId.indexOf('/');

        if (slashIndex > 0) {
          categories.add(ruleId.slice(0, slashIndex));
        }
      }
    }

    return [...categories].toSorted();
  }

  /**
   * Shows a quick pick for category selection and applies the filter.
   *
   * @param collection - The diagnostic collection to filter
   */
  async showFilterQuickPick(collection: vscode.DiagnosticCollection): Promise<void> {
    const categories: string[] = this.extractCategories(collection);

    if (categories.length === 0) {
      vscode.window.showInformationMessage(en.filter.noCategories);
      return;
    }

    const selected: string[] | undefined = (await vscode.window.showQuickPick(categories, {
      canPickMany: true,
      placeHolder: en.filter.selectCategories,
    })) as string[] | undefined;

    if (selected === undefined) {
      return; // User cancelled
    }

    this.applyFilter(selected, collection);
  }

  /**
   * Applies a category filter to the diagnostic collection.
   *
   * Stores original diagnostics for restoration on clear.
   *
   * @param categories - Categories to keep (empty = show all)
   * @param collection - The diagnostic collection to filter
   */
  applyFilter(categories: string[], collection: vscode.DiagnosticCollection): void {
    if (categories.length === 0) {
      this.clearFilter(collection);
      return;
    }

    this.activeCategories = new Set(categories);

    // Store originals before filtering
    for (const [uri, diagnostics] of collectEntries(collection)) {
      if (!this.originalDiagnostics.has(uri.toString())) {
        this.originalDiagnostics.set(uri.toString(), diagnostics);
      }
    }

    // Apply filter
    const originals = new Map(this.originalDiagnostics);
    const activeCats: Set<string> = this.activeCategories;

    for (const [uriStr, diagnostics] of originals) {
      const filtered: vscode.Diagnostic[] = [];

      for (const diag of diagnostics) {
        if (diag.source !== DIAGNOSTIC_SOURCE) {
          filtered.push(diag); // Keep non-resist diagnostics
          continue;
        }

        const ruleId: string =
          typeof diag.code === 'object' && diag.code !== null
            ? String((diag.code as { value: string | number }).value)
            : String(diag.code ?? '');
        const slashIndex: number = ruleId.indexOf('/');
        const category: string = slashIndex > 0 ? ruleId.slice(0, slashIndex) : '';

        if (activeCats.has(category)) {
          filtered.push(diag);
        }
      }

      const uri: vscode.Uri = vscode.Uri.file(uriStr);
      collection.set(uri, filtered);
    }

    if (this.channel) {
      log(this.channel, format(en.filter.filterApplied, { categories: categories.join(', ') }));
    }
  }

  /**
   * Clears the active filter and restores original diagnostics.
   *
   * @param collection - The diagnostic collection to restore
   */
  clearFilter(collection: vscode.DiagnosticCollection): void {
    if (this.originalDiagnostics.size > 0) {
      for (const [uriStr, diagnostics] of this.originalDiagnostics) {
        const uri: vscode.Uri = vscode.Uri.file(uriStr);
        collection.set(uri, [...diagnostics]);
      }
      this.originalDiagnostics.clear();
    }

    this.activeCategories = undefined;

    if (this.channel) {
      log(this.channel, en.filter.filterCleared);
    }
  }

  /**
   * Returns the currently active categories, or undefined if no filter.
   *
   * @returns Array of active category names, or undefined
   */
  getActiveCategories(): string[] | undefined {
    return this.activeCategories ? [...this.activeCategories] : undefined;
  }

  /**
   * Disposes the filter, clearing state.
   */
  dispose(): void {
    this.activeCategories = undefined;
    this.originalDiagnostics.clear();
  }
}
