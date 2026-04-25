/**
 * Plan File Parser
 *
 * Shared parser for plan markdown files. Extracts tasks, statuses,
 * files, verification sections, execution order, and header metadata.
 *
 * @module
 */

// =============================================================================
// Types
// =============================================================================

/** Parsed header metadata from a plan file. */
export type PlanHeader = {
  date: string;
  packagePath: string;
  goal: string;
};

/** A file entry from a task's Files section. */
export type TaskFile = {
  action: 'create' | 'edit' | 'test';
  path: string;
};

/** Status of a plan task. */
export type TaskStatus = '[ ]' | '[x]' | '[~]';

/** A parsed task block from a plan file. */
export type PlanTask = {
  number: number;
  name: string;
  status: TaskStatus;
  line: number;
  gap: string;
  planBullets: string[];
  files: TaskFile[];
  verification: string;
  isTail: boolean;
};

/** A dependency entry from the Execution Order table. */
export type TaskDependency = {
  task: number;
  dependsOn: number[];
};

/** Full parsed plan file. */
export type ParsedPlan = {
  header: PlanHeader;
  tasks: PlanTask[];
  dependencies: TaskDependency[];
  hasBaseline: boolean;
  hasStatusLegend: boolean;
  hasExecutionOrder: boolean;
};

// =============================================================================
// Constants
// =============================================================================

/** Tail task name patterns (case-insensitive match). */
const TAIL_PATTERNS: readonly string[] = [
  'register',
  'full qa',
  'qa + coverage',
  'qa coverage',
  'final verification',
  'integration verification',
  'commit',
];

// =============================================================================
// Parser
// =============================================================================

/**
 * Check if a task name matches a tail task pattern.
 *
 * @param {string} name - Task name
 * @returns {boolean} True if the task is a tail task
 */
function isTailTask(name: string): boolean {
  const lower: string = name.toLowerCase();
  return TAIL_PATTERNS.some((p: string): boolean => lower.includes(p));
}

/**
 * Parse the header metadata from plan content.
 *
 * @param {string[]} lines - Plan file lines
 * @returns {PlanHeader} Parsed header
 */
function parseHeader(lines: string[]): PlanHeader {
  let date: string = '';
  let packagePath: string = '';
  let goal: string = '';

  for (const line of lines) {
    const datMatch: RegExpMatchArray | null = line.match(/^\*\*Date\*\*:\s*(.+)/);
    if (datMatch && datMatch[1]) {
      date = datMatch[1].trim();
    }
    const pkgMatch: RegExpMatchArray | null = line.match(/^\*\*Package\*\*:.*\(`([^)]+)`\)/);
    if (pkgMatch && pkgMatch[1]) {
      packagePath = pkgMatch[1].trim();
    }
    const goalMatch: RegExpMatchArray | null = line.match(/^\*\*Goal\*\*:\s*(.+)/);
    if (goalMatch && goalMatch[1]) {
      goal = goalMatch[1].trim();
    }
  }

  return { date, packagePath, goal };
}

/**
 * Parse task blocks from plan content.
 *
 * @param {string} content - Full plan file content
 * @param {string[]} lines - Plan file lines
 * @returns {PlanTask[]} Parsed tasks
 */
function parseTasks(content: string, lines: string[]): PlanTask[] {
  const tasks: PlanTask[] = [];
  const taskHeaderRe: RegExp = /^##\s+TASK\s+(\d+)\s*—\s*(.+)/;

  /* Find all task header positions */
  const taskPositions: Array<{ index: number; number: number; name: string; line: number }> = [];
  for (let i: number = 0; i < lines.length; i++) {
    const m: RegExpMatchArray | null = (lines[i] ?? '').match(taskHeaderRe);
    if (m && m[1] && m[2]) {
      taskPositions.push({
        index: i,
        number: parseInt(m[1], 10),
        name: m[2].trim(),
        line: i + 1,
      });
    }
  }

  /* Extract each task section */
  for (let t: number = 0; t < taskPositions.length; t++) {
    const pos = taskPositions[t]!;
    const nextIndex: number =
      t + 1 < taskPositions.length ? taskPositions[t + 1]!.index : lines.length;
    const sectionLines: string[] = lines.slice(pos.index, nextIndex);
    const section: string = sectionLines.join('\n');

    /* Status */
    let status: TaskStatus = '[ ]';
    const statusMatch: RegExpMatchArray | null = section.match(/\*\*Status\*\*:\s*(\[[ x~]\])/);
    if (statusMatch && statusMatch[1]) {
      status = statusMatch[1] as TaskStatus;
    }

    /* Gap */
    let gap: string = '';
    const gapMatch: RegExpMatchArray | null = section.match(/\*\*Gap\*\*:\s*(.+)/);
    if (gapMatch && gapMatch[1]) {
      gap = gapMatch[1].trim();
    }

    /* Plan bullets */
    const planBullets: string[] = [];
    const planStart: number = sectionLines.findIndex((l: string): boolean =>
      l.trim().startsWith('**Plan**'),
    );
    if (planStart >= 0) {
      for (let i: number = planStart + 1; i < sectionLines.length; i++) {
        const line: string = (sectionLines[i] ?? '').trim();
        if (line.startsWith('- ')) {
          planBullets.push(line.slice(2).trim());
        } else if (line.startsWith('**') || line === '---' || line === '') {
          if (planBullets.length > 0) break;
        }
      }
    }

    /* Files */
    const files: TaskFile[] = [];
    const filesStart: number = sectionLines.findIndex(
      (l: string): boolean => l.trim().startsWith('**Files**') || l.trim().startsWith('**File'),
    );
    if (filesStart >= 0) {
      for (let i: number = filesStart + 1; i < sectionLines.length; i++) {
        const line: string = (sectionLines[i] ?? '').trim();
        if (!line.startsWith('- ')) {
          if (files.length > 0 || line.startsWith('**') || line === '---') break;
          continue;
        }
        const fileMatch: RegExpMatchArray | null = line.match(
          /^-\s+(Create|Edit|Test):\s*`?([^`\n]+)`?/i,
        );
        if (fileMatch && fileMatch[1] && fileMatch[2]) {
          const action: string = fileMatch[1].toLowerCase();
          files.push({
            action: action as 'create' | 'edit' | 'test',
            path: fileMatch[2].trim(),
          });
        }
      }
    }

    /* Verification */
    let verification: string = '';
    const verStart: number = sectionLines.findIndex((l: string): boolean =>
      l.trim().startsWith('**Verification**'),
    );
    if (verStart >= 0) {
      const verLines: string[] = [];
      /* Include inline text after **Verification**: */
      const inlineMatch: RegExpMatchArray | null = (sectionLines[verStart] ?? '').match(
        /\*\*Verification\*\*:\s*(.+)/,
      );
      if (inlineMatch && inlineMatch[1]) {
        verLines.push(inlineMatch[1].trim());
      }
      for (let i: number = verStart + 1; i < sectionLines.length; i++) {
        const line: string = (sectionLines[i] ?? '').trim();
        if (line.startsWith('**') || line === '---') break;
        if (line.startsWith('- ') || line.startsWith('`') || line.length > 0) {
          verLines.push(line);
        }
      }
      verification = verLines.join('\n').trim();
    }

    tasks.push({
      number: pos.number,
      name: pos.name,
      status,
      line: pos.line,
      gap,
      planBullets,
      files,
      verification,
      isTail: isTailTask(pos.name),
    });
  }

  return tasks;
}

/**
 * Parse the Execution Order table.
 *
 * @param {string[]} lines - Plan file lines
 * @returns {TaskDependency[]} Parsed dependencies
 */
function parseDependencies(lines: string[]): TaskDependency[] {
  const deps: TaskDependency[] = [];
  let inTable: boolean = false;
  let headerSkipped: boolean = false;

  for (const rawLine of lines) {
    const line: string = rawLine.trim();

    if (line.match(/^##\s+Execution Order/i)) {
      inTable = true;
      continue;
    }

    if (!inTable) continue;

    /* Skip table header and separator rows */
    if (line.startsWith('| Task') || line.startsWith('|---') || line.startsWith('| -')) {
      headerSkipped = true;
      continue;
    }

    /* Stop at next section */
    if (line.startsWith('##') || (headerSkipped && !line.startsWith('|'))) {
      break;
    }

    /* Parse table row: | 1 | description | 2-3 | */
    const cells: string[] = line
      .split('|')
      .map((c: string): string => c.trim())
      .filter((c: string): boolean => c.length > 0);

    if (cells.length >= 3) {
      const taskNum: number = parseInt(cells[0] ?? '', 10);
      const depStr: string = cells[2] ?? '';

      if (!isNaN(taskNum)) {
        const dependsOn: number[] = [];
        if (depStr !== '--' && depStr !== '-') {
          /* Parse "1-3" as [1,2,3], "1,3" as [1,3], "1" as [1] */
          const rangeMatch: RegExpMatchArray | null = depStr.match(/^(\d+)-(\d+)$/);
          if (rangeMatch && rangeMatch[1] && rangeMatch[2]) {
            const start: number = parseInt(rangeMatch[1], 10);
            const end: number = parseInt(rangeMatch[2], 10);
            for (let i: number = start; i <= end; i++) {
              dependsOn.push(i);
            }
          } else {
            /* Comma-separated or single number */
            for (const part of depStr.split(/[,\s]+/)) {
              const n: number = parseInt(part.trim(), 10);
              if (!isNaN(n)) dependsOn.push(n);
            }
          }
        }
        deps.push({ task: taskNum, dependsOn });
      }
    }
  }

  return deps;
}

/**
 * Parse a plan markdown file into a structured representation.
 *
 * @param {string} content - Full plan file content
 * @returns {ParsedPlan} Parsed plan
 */
export function parsePlan(content: string): ParsedPlan {
  const lines: string[] = content.split('\n');

  return {
    header: parseHeader(lines),
    tasks: parseTasks(content, lines),
    dependencies: parseDependencies(lines),
    hasBaseline: /##\s+Baseline/i.test(content),
    hasStatusLegend: /##\s+Status Legend/i.test(content),
    hasExecutionOrder: /##\s+Execution Order/i.test(content),
  };
}

/**
 * Discover plan files in the workspace.
 *
 * Filters all `.md` files to those under any `docs/plans/` directory,
 * excluding the canonical `TEMPLATE.md`. Used by every `plans/*` rule
 * to define both the file set they check AND the cache-input fingerprint
 * declared via `WorkspaceRule.inputs`.
 *
 * @param ctx - Workspace context (must expose `filesByExtension`)
 * @returns Absolute paths of plan files
 */
export async function discoverPlanFiles(ctx: {
  filesByExtension(ext: string): Promise<readonly string[]>;
}): Promise<readonly string[]> {
  const mdFiles: readonly string[] = await ctx.filesByExtension('.md');
  return mdFiles.filter(
    (f: string): boolean => f.includes('/docs/plans/') && !f.endsWith('TEMPLATE.md'),
  );
}

/**
 * Parse a date from a plan filename (YYYY-MM-DD-*.md).
 *
 * @param {string} filename - Plan filename
 * @returns {Date | undefined} Parsed date, or undefined if not parseable
 */
export function parsePlanDate(filename: string): Date | undefined {
  const m: RegExpMatchArray | null = filename.match(/(\d{4}-\d{2}-\d{2})/);
  if (!m || !m[1]) return undefined;
  const d: Date = new Date(m[1] + 'T00:00:00');
  return isNaN(d.getTime()) ? undefined : d;
}
