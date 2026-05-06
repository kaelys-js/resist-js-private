/**
 * Shared helpers for sync/* workspace lint rules.
 *
 * Provides Levenshtein distance matching for correcting broken references
 * (paths, script names, task names) to their closest valid counterpart.
 *
 * @module
 */

/**
 * Compute the Levenshtein edit distance between two strings.
 *
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} The minimum number of single-character edits (insertions, deletions, substitutions)
 */
export function levenshtein(a: string, b: string): number {
  if (a.length === 0) {
    return b.length;
  }

  if (b.length === 0) {
    return a.length;
  }

  /* Use a single-row DP approach for space efficiency */
  const bLen: number = b.length;
  let prev: number[] = Array.from({ length: bLen + 1 }, (_: unknown, i: number): number => i);
  let curr: number[] = Array.from({ length: bLen + 1 }, (): number => 0);

  for (let i: number = 1; i <= a.length; i++) {
    curr[0] = i;

    for (let j: number = 1; j <= bLen; j++) {
      const cost: number = a[i - 1] === b[j - 1] ? 0 : 1;

      curr[j] = Math.min(
        (prev[j] ?? 0) + 1, // deletion
        (curr[j - 1] ?? 0) + 1, // insertion
        (prev[j - 1] ?? 0) + cost, // substitution
      );
    }

    [prev, curr] = [curr, prev];
  }

  return prev[bLen] ?? a.length;
}

/**
 * Find the closest matching string from a set of candidates.
 *
 * Returns the candidate with the smallest Levenshtein distance to the target,
 * provided it's within the maximum allowed distance.
 *
 * @param {string} target - The broken reference string to match
 * @param {Iterable<string>} candidates - Set or array of valid candidates
 * @param {number} maxDistance - Maximum edit distance to consider (default: 3)
 * @returns {string | undefined} The closest match, or undefined if none within threshold
 */
export function findClosestMatch(
  target: string,
  candidates: Iterable<string>,
  maxDistance: number = 3,
): string | undefined {
  let best: string | undefined;
  let bestDist: number = maxDistance + 1;

  for (const candidate of candidates) {
    /* Quick length check — if lengths differ by more than maxDistance, skip */
    if (Math.abs(candidate.length - target.length) > maxDistance) {
      continue;
    }

    const dist: number = levenshtein(target, candidate);

    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }

    /* Perfect match (distance 0) shouldn't happen in practice, but short-circuit */
    if (dist === 0) {
      break;
    }
  }

  return best;
}

/**
 * Find the closest matching filesystem path from a list of known paths.
 *
 * Extracts unique directory paths from the file list, then matches against
 * the broken path. Uses segment-aware comparison for better results.
 *
 * @param {string} brokenPath - The path that doesn't exist (relative to root)
 * @param {readonly string[]} allFiles - All known file paths (relative to root)
 * @param {number} maxDistance - Maximum edit distance (default: 3)
 * @returns {string | undefined} The closest matching directory path, or undefined
 */
export function findClosestPath(
  brokenPath: string,
  allFiles: readonly string[],
  maxDistance: number = 3,
): string | undefined {
  /* Normalize: strip leading ./ and trailing / */
  const normalized: string = brokenPath.replace(/^\.\//, '').replace(/\/$/, '');

  /* Extract unique directory paths from all files */
  const dirs: Set<string> = new Set<string>();

  for (const f of allFiles) {
    const parts: string[] = f.split('/');

    /* Build all parent directory paths */
    for (let i: number = 1; i < parts.length; i++) {
      dirs.add(parts.slice(0, i).join('/'));
    }
  }

  /* Find closest match among directories */
  return findClosestMatch(normalized, dirs, maxDistance);
}

/**
 * Compute byte offset of a given 1-based line number in file content.
 *
 * @param {string} content - Full file content
 * @param {number} lineNumber - 1-based line number
 * @returns {number} Byte offset of the start of that line
 */
export function lineStartOffset(content: string, lineNumber: number): number {
  let offset: number = 0;

  for (let i: number = 1; i < lineNumber; i++) {
    const nextNewline: number = content.indexOf('\n', offset);

    if (nextNewline === -1) {
      break;
    }

    offset = nextNewline + 1;
  }

  return offset;
}

/**
 * Compute byte offset of the end of a given 1-based line (including newline).
 *
 * @param {string} content - Full file content
 * @param {number} lineNumber - 1-based line number
 * @returns {number} Byte offset just past the newline of that line
 */
export function lineEndOffset(content: string, lineNumber: number): number {
  let offset: number = 0;

  for (let i: number = 1; i <= lineNumber; i++) {
    const nextNewline: number = content.indexOf('\n', offset);

    if (nextNewline === -1) {
      return content.length;
    }

    if (i === lineNumber) {
      return nextNewline + 1;
    }

    offset = nextNewline + 1;
  }

  return offset;
}
