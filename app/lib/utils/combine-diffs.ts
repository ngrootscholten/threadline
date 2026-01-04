/**
 * Combine Diffs Utility
 * 
 * Combines two git diffs (previous and current) into a single unified diff
 * that shows the introduction and removal of changes. This is similar to
 * how `git diff branch1...branch2` shows cumulative changes.
 * 
 * The combined diff shows:
 * - Lines added in previous check (introduction of problem)
 * - Lines removed/changed in current check (fix/removal of problem)
 * 
 * Note: This simply concatenates the two diffs. react-diff-view will parse
 * and display both sections, showing the full lifecycle of the problem.
 */

/**
 * Combines two git diffs into a single unified diff.
 * 
 * This concatenates the diffs so you can see both:
 * - The introduction of changes (from previous diff)
 * - The removal/fix of changes (from current diff)
 * 
 * @param previousDiff - The diff from the previous check (introduction) - already filtered to violation files
 * @param currentDiff - The diff from the current check (removal/fix) - already filtered to violation files
 * @param filterFiles - Optional: unused (diffs are pre-filtered in API)
 * @returns Combined unified diff string
 */
export function combineDiffs(
  previousDiff: string,
  currentDiff: string,
  filterFiles?: string[]
): string {
  if (!previousDiff && !currentDiff) {
    return '';
  }

  // If one is empty, return the other
  if (!previousDiff || previousDiff.trim() === '') {
    return currentDiff || '';
  }
  if (!currentDiff || currentDiff.trim() === '') {
    return previousDiff;
  }

  // Concatenate the diffs
  // This shows both the introduction (previous) and removal (current)
  // react-diff-view will parse and display both sections separately
  return `${previousDiff}\n\n${currentDiff}`;
}

