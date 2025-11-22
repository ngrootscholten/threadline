"use client";

import { useState } from "react";

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleFetchMetrics = async () => {
    if (!repoUrl) return;
    
    setLoading(true);
    setError("");
    setResponse("");
    
    try {
      const res = await fetch("/api/github/workflow-runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repoUrl }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || "Failed to fetch workflow runs");
      } else {
        setResponse(JSON.stringify(data, null, 2));
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              DevThreadline
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Monitor your GitHub workflow metrics
            </p>
          </div>

          {/* Input Section */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-8">
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
              GitHub Repository URL
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/facebook/react"
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
              />
              <button
                onClick={handleFetchMetrics}
                disabled={loading || !repoUrl}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? "Loading..." : "Fetch Workflow Runs"}
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8">
              <p className="text-sm text-red-800 dark:text-red-300">
                <strong>Error:</strong> {error}
              </p>
            </div>
          )}

          {/* Mapped Domain Models Response */}
          {response && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">
                Workflow Run Metrics (Domain Models)
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                Mapped from GitHub API to our simplified domain model
              </p>
              <textarea
                value={response}
                readOnly
                className="w-full h-96 px-4 py-3 font-mono text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
              />
            </div>
          )}

          {/* Metrics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Workflow Run Time Card */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
                  Workflow Run Time
                </h2>
                <span className="text-2xl">⏱️</span>
              </div>
              <div className="text-center py-8">
                <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  --
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Average duration
                </p>
              </div>
            </div>

            {/* Workflow Success Rate Card */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
                  Workflow Success Rate
                </h2>
                <span className="text-2xl">✅</span>
              </div>
              <div className="text-center py-8">
                <p className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">
                  --%
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Last 100 workflow runs
                </p>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Note:</strong> Make sure to set your GitHub Personal Access Token in the <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">.env.local</code> file.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

