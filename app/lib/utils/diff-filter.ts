/**
 * Git Diff Filtering Utilities
 * 
 * Filters git diffs to include only specific files.
 * This is used to send only relevant files to each threadline's LLM call.
 */

/**
 * Filters a git diff to include only the specified files.
 * 
 * Git diff format structure:
 * - Each file section starts with "diff --git a/path b/path"
 * - Followed by metadata lines (index, ---, +++)
 * - Then hunks with "@@ -start,count +start,count @@" headers
 * - Content lines (+, -, space-prefixed)
 * 
 * @param diff - The full git diff string
 * @param filesToInclude - Array of file paths to include (must match paths in diff)
 * @returns Filtered diff containing only the specified files
 */
export function filterDiffByFiles(diff: string, filesToInclude: string[]): string {
  if (!diff || diff.trim() === '') {
    return '';
  }

  if (filesToInclude.length === 0) {
    return '';
  }

  // Normalize file paths for comparison (handle both a/path and b/path formats)
  const normalizedFiles = new Set(
    filesToInclude.map(file => file.trim())
  );

  const lines = diff.split('\n');
  const filteredLines: string[] = [];
  let currentFile: string | null = null;
  let inFileSection = false;
  let fileSectionStartIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for file header: "diff --git a/path b/path"
    const diffHeaderMatch = line.match(/^diff --git a\/(.+?) b\/(.+?)$/);
    if (diffHeaderMatch) {
      // Save previous file section if it was included
      if (inFileSection && currentFile && normalizedFiles.has(currentFile)) {
        // File section was included - it's already been added to filteredLines
        // Reset for next file
      }

      // Start new file section
      const filePathA = diffHeaderMatch[1];
      const filePathB = diffHeaderMatch[2];
      
      // Use the 'b' path (new file) as the canonical path
      currentFile = filePathB;
      inFileSection = normalizedFiles.has(filePathB);
      fileSectionStartIndex = i;

      if (inFileSection) {
        filteredLines.push(line);
      }
      continue;
    }

    // If we're in a file section that should be included, add all lines
    if (inFileSection && currentFile && normalizedFiles.has(currentFile)) {
      filteredLines.push(line);
    }
  }

  return filteredLines.join('\n');
}

/**
 * Extracts file paths from a git diff.
 * 
 * @param diff - The git diff string
 * @returns Array of file paths found in the diff
 */
export function extractFilesFromDiff(diff: string): string[] {
  if (!diff || diff.trim() === '') {
    return [];
  }

  const files = new Set<string>();
  const lines = diff.split('\n');

  for (const line of lines) {
    const diffHeaderMatch = line.match(/^diff --git a\/(.+?) b\/(.+?)$/);
    if (diffHeaderMatch) {
      // Use the 'b' path (new file) as the canonical path
      files.add(diffHeaderMatch[2]);
    }
  }

  return Array.from(files);
}

