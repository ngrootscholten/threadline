"use client";

import { useState, useMemo } from "react";
import { Diff, Hunk, parseDiff } from "react-diff-view";
import "react-diff-view/style/index.css";
import { createSlimDiff } from "../lib/utils/slim-diff";

interface SplitDiffViewerProps {
  leftDiff: string;
  rightDiff: string;
  leftTitle?: string;
  rightTitle?: string;
}

/**
 * Split Diff Viewer Component
 * 
 * Displays two diffs side-by-side for comparison.
 * Left side shows the previous check's diff (filtered to violation files).
 * Right side shows the current check's full diff.
 * 
 * By default, shows a slim version with only 3 lines of context around changes.
 * When "Show context" is checked, shows the full diff with all context lines.
 */
export function SplitDiffViewer({ leftDiff, rightDiff, leftTitle, rightTitle }: SplitDiffViewerProps) {
  const [showFullContext, setShowFullContext] = useState(false);

  // Create slim diffs once on mount (memoized)
  const leftSlimDiff = useMemo(() => createSlimDiff(leftDiff, 3), [leftDiff]);
  const rightSlimDiff = useMemo(() => createSlimDiff(rightDiff, 3), [rightDiff]);
  
  // Choose which diffs to display
  const displayLeftDiff = showFullContext ? leftDiff : leftSlimDiff;
  const displayRightDiff = showFullContext ? rightDiff : rightSlimDiff;

  const leftEmpty = !displayLeftDiff || displayLeftDiff.trim() === '';
  const rightEmpty = !displayRightDiff || displayRightDiff.trim() === '';

  if (leftEmpty && rightEmpty) {
    return (
      <div className="p-4 text-slate-400 text-sm">
        No diff content to display
      </div>
    );
  }

  let leftFiles: ReturnType<typeof parseDiff> = [];
  let rightFiles: ReturnType<typeof parseDiff> = [];

  try {
    if (!leftEmpty) {
      leftFiles = parseDiff(displayLeftDiff);
    }
    if (!rightEmpty) {
      rightFiles = parseDiff(displayRightDiff);
    }
  } catch (error) {
    return (
      <div className="p-4 text-red-400 text-sm">
        Error parsing diff: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  // Get all unique file paths from both diffs
  const allFilePaths = new Set<string>();
  leftFiles.forEach(file => {
    allFilePaths.add(file.newPath || file.oldPath || '');
  });
  rightFiles.forEach(file => {
    allFilePaths.add(file.newPath || file.oldPath || '');
  });

  const filePaths = Array.from(allFilePaths);

  return (
    <div className="space-y-2">
      {/* Toggle for showing full context */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <span className="text-sm text-slate-400">
          {showFullContext ? 'Showing full context' : 'Showing 3 lines of context'}
        </span>
        <label className="flex items-center gap-2 cursor-pointer group/checkbox">
          <input
            type="checkbox"
            checked={showFullContext}
            onChange={(e) => setShowFullContext(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-4 h-4 rounded border border-slate-500 bg-slate-800 peer-checked:bg-green-500/20 peer-checked:border-green-500/50 transition-colors duration-200 flex items-center justify-center">
            {showFullContext && (
              <svg 
                className="w-3.5 h-3.5 text-green-400" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className="text-sm text-slate-300 group-hover/checkbox:text-slate-200 transition-colors">Show full context</span>
        </label>
      </div>

      {/* Side-by-side diff comparison */}
      <div className="grid grid-cols-2 gap-0 border-t border-slate-700">
        {/* Left side - Previous check (filtered) */}
        <div className="border-r border-slate-700">
          <div className="bg-slate-800 px-4 py-2 border-b border-slate-700">
            <span className="text-sm font-semibold text-slate-300">
              {leftTitle || 'Previous Check (Violation Files)'}
            </span>
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            {leftEmpty ? (
              <div className="p-4 text-slate-500 text-sm text-center">
                No diff available
              </div>
            ) : leftFiles.length === 0 ? (
              <div className="p-4 text-slate-500 text-sm text-center">
                No files changed
              </div>
            ) : (
              leftFiles.map((file, fileIdx) => (
                <details key={fileIdx} className="[&[open]>summary>svg]:rotate-180">
                  <summary className="bg-slate-800 px-4 py-2 cursor-pointer hover:bg-slate-750 select-none flex items-center gap-2 border-b border-slate-700 [&::-webkit-details-marker]:hidden">
                    <svg
                      className="w-4 h-4 text-slate-400 transition-transform duration-200"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                    <span className="text-sm font-mono text-slate-300">
                      {file.newPath || file.oldPath || 'Unknown file'}
                    </span>
                  </summary>
                  <div className="p-4 overflow-x-auto">
                    {file.hunks.length > 0 ? (
                      <Diff
                        viewType="split"
                        diffType={file.type}
                        hunks={file.hunks}
                      >
                        {(hunks) =>
                          hunks.map((hunk, idx) => (
                            <Hunk key={idx} hunk={hunk} />
                          ))
                        }
                      </Diff>
                    ) : (
                      <div className="text-slate-500 text-sm">
                        No changes in this file
                      </div>
                    )}
                  </div>
                </details>
              ))
            )}
          </div>
        </div>

        {/* Right side - Current check (full) */}
        <div>
          <div className="bg-slate-800 px-4 py-2 border-b border-slate-700">
            <span className="text-sm font-semibold text-slate-300">
              {rightTitle || 'Current Check (All Files)'}
            </span>
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            {rightEmpty ? (
              <div className="p-4 text-slate-500 text-sm text-center">
                No diff available
              </div>
            ) : rightFiles.length === 0 ? (
              <div className="p-4 text-slate-500 text-sm text-center">
                No files changed
              </div>
            ) : (
              rightFiles.map((file, fileIdx) => (
                <details key={fileIdx} className="[&[open]>summary>svg]:rotate-180">
                  <summary className="bg-slate-800 px-4 py-2 cursor-pointer hover:bg-slate-750 select-none flex items-center gap-2 border-b border-slate-700 [&::-webkit-details-marker]:hidden">
                    <svg
                      className="w-4 h-4 text-slate-400 transition-transform duration-200"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                    <span className="text-sm font-mono text-slate-300">
                      {file.newPath || file.oldPath || 'Unknown file'}
                    </span>
                  </summary>
                  <div className="p-4 overflow-x-auto">
                    {file.hunks.length > 0 ? (
                      <Diff
                        viewType="split"
                        diffType={file.type}
                        hunks={file.hunks}
                      >
                        {(hunks) =>
                          hunks.map((hunk, idx) => (
                            <Hunk key={idx} hunk={hunk} />
                          ))
                        }
                      </Diff>
                    ) : (
                      <div className="text-slate-500 text-sm">
                        No changes in this file
                      </div>
                    )}
                  </div>
                </details>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

