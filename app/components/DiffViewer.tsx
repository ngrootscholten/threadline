"use client";

import { useState, useMemo } from "react";
import { Diff, Hunk, parseDiff } from "react-diff-view";
import "react-diff-view/style/index.css";
import { createSlimDiff } from "../lib/utils/slim-diff";

interface DiffViewerProps {
  diff: string;
  title?: string;
}

/**
 * Diff Viewer Component
 * 
 * Displays git diffs with an option to show full context or slim context.
 * 
 * By default, shows a slim version with only 3 lines of context around changes.
 * When "Show context" is checked, shows the full diff with all context lines.
 * 
 * This component uses standard react-diff-view rendering - no hunk manipulation.
 */
export function DiffViewer({ diff, title }: DiffViewerProps) {
  const [showFullContext, setShowFullContext] = useState(false);

  // Create slim diff once on mount (memoized)
  const slimDiff = useMemo(() => createSlimDiff(diff, 3), [diff]);
  
  // Choose which diff to display
  const displayDiff = showFullContext ? diff : slimDiff;

  if (!displayDiff || displayDiff.trim() === '') {
    return (
      <div className="p-4 text-slate-400 text-sm">
        No diff content to display
      </div>
    );
  }

  try {
    const files = parseDiff(displayDiff);
    
    if (files.length === 0) {
      return (
        <div className="p-4 text-slate-400 text-sm">
          No diff content to display
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {/* Toggle for showing full context */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
          <span className="text-sm text-slate-400">
            {title && <span className="font-semibold mr-2">{title}</span>}
            {showFullContext ? 'Showing full context' : 'Showing 3 lines of context'}
          </span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showFullContext}
              onChange={(e) => setShowFullContext(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-green-500 focus:ring-green-500 focus:ring-2"
            />
            <span className="text-sm text-slate-300">Show full context</span>
          </label>
        </div>

        {/* Render files normally using react-diff-view */}
        {files.map((file, fileIdx) => (
          <details key={fileIdx} className="group">
            <summary className="bg-slate-800 px-4 py-2 cursor-pointer hover:bg-slate-750 select-none flex items-center gap-2 border-b border-slate-700">
              <span className="text-slate-400 group-open:rotate-90 transition-transform">▶</span>
              <span className="text-sm font-mono text-slate-300">
                {file.newPath || file.oldPath || 'Unknown file'}
              </span>
            </summary>
            <div className="p-4 overflow-x-auto">
              {file.hunks.length > 0 ? (
                <Diff
                  viewType="unified"
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
        ))}
      </div>
    );
  } catch (error) {
    return (
      <div className="p-4 text-red-400 text-sm">
        Error parsing diff: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }
}
