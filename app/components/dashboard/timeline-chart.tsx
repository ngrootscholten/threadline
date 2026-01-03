"use client";

import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TimelineCheck {
  id: string;
  createdAt: string;  // ISO timestamp - client will bin by local timezone
  outcome: string;
  repoName: string | null;
  environment: string | null;
  threadlineIds: string[];  // Human-readable threadline names (not version-specific)
}

type GroupByType = 'outcome' | 'repo' | 'environment' | 'threadline';

interface TimelineChartProps {
  timelineChecks: TimelineCheck[];
  loading: boolean;
}

export function TimelineChart({ timelineChecks, loading }: TimelineChartProps) {
  const [groupBy, setGroupBy] = useState<GroupByType>('outcome');

  // Bin checks by LOCAL date (user's timezone) - memoized
  const binnedByDate = useMemo(() => {
    if (!timelineChecks.length) return new Map<string, TimelineCheck[]>();
    
    const bins = new Map<string, TimelineCheck[]>();
    timelineChecks.forEach(check => {
      // Convert ISO timestamp to local date string (user's timezone)
      const localDate = new Date(check.createdAt).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
      
      if (!bins.has(localDate)) {
        bins.set(localDate, []);
      }
      bins.get(localDate)!.push(check);
    });
    
    return bins;
  }, [timelineChecks]);

  // Process binned data for charts based on groupBy type
  const chartData = useMemo(() => {
    if (binnedByDate.size === 0) return { data: [], keys: [] as string[] };

    // Get sorted dates
    const sortedDates = Array.from(binnedByDate.keys()).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );

    // Format dates for display
    const formatDate = (dateStr: string) => 
      new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (groupBy === 'outcome') {
      // Stacked bar by outcome
      const data = sortedDates.map(dateStr => {
        const checks = binnedByDate.get(dateStr)!;
        const compliant = checks.filter(c => c.outcome === 'compliant').length;
        const attention = checks.filter(c => c.outcome === 'attention').length;
        const notRelevant = checks.filter(c => c.outcome === 'not_relevant').length;
        
        return {
          date: formatDate(dateStr),
          Compliant: compliant,
          Attention: attention,
          'Not Relevant': notRelevant
        };
      });
      return { data, keys: ['Compliant', 'Attention', 'Not Relevant'] };
    } else if (groupBy === 'repo') {
      // Group by repository - stacked
      const repoSet = new Set<string>();
      
      // First pass: collect all repos
      binnedByDate.forEach(checks => {
        checks.forEach(check => {
          repoSet.add(check.repoName || 'Unknown');
        });
      });

      const data = sortedDates.map(dateStr => {
        const checks = binnedByDate.get(dateStr)!;
        const row: Record<string, string | number> = { date: formatDate(dateStr) };
        
        repoSet.forEach(repo => {
          row[repo] = checks.filter(c => (c.repoName || 'Unknown') === repo).length;
        });
        
        return row;
      });
      return { data, keys: Array.from(repoSet) };
    } else if (groupBy === 'environment') {
      // Group by environment - stacked
      const data = sortedDates.map(dateStr => {
        const checks = binnedByDate.get(dateStr)!;
        const github = checks.filter(c => c.environment === 'github').length;
        const gitlab = checks.filter(c => c.environment === 'gitlab').length;
        const vercel = checks.filter(c => c.environment === 'vercel').length;
        const local = checks.filter(c => c.environment === 'local').length;
        const other = checks.filter(c => c.environment && !['github', 'gitlab', 'vercel', 'local'].includes(c.environment)).length;
        
        return {
          date: formatDate(dateStr),
          GitHub: github,
          GitLab: gitlab,
          Vercel: vercel,
          Local: local,
          Other: other
        };
      });
      return { data, keys: ['GitHub', 'GitLab', 'Vercel', 'Local', 'Other'] };
    } else {
      // Group by threadline (human-readable name) - limit to top 10 most active, stacked
      const threadlineTotals = new Map<string, number>();
      
      // First pass: count total occurrences per threadline
      binnedByDate.forEach(checks => {
        checks.forEach(check => {
          check.threadlineIds.forEach(threadlineId => {
            threadlineTotals.set(threadlineId, (threadlineTotals.get(threadlineId) || 0) + 1);
          });
        });
      });

      // Get top 10 most active threadlines
      const topThreadlines = Array.from(threadlineTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id]) => id);

      const data = sortedDates.map(dateStr => {
        const checks = binnedByDate.get(dateStr)!;
        const row: Record<string, string | number> = { date: formatDate(dateStr) };
        
        topThreadlines.forEach(threadlineId => {
          row[threadlineId] = checks.filter(c => c.threadlineIds.includes(threadlineId)).length;
        });
        
        return row;
      });
      return { data, keys: topThreadlines };
    }
  }, [binnedByDate, groupBy]);

  if (timelineChecks.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="bg-slate-950/50 p-6 rounded-lg border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Check Activity (Last 90 Days)</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setGroupBy('outcome')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                groupBy === 'outcome'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              By Outcome
            </button>
            <button
              onClick={() => setGroupBy('repo')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                groupBy === 'repo'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              By Repo
            </button>
            <button
              onClick={() => setGroupBy('environment')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                groupBy === 'environment'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              By Environment
            </button>
            <button
              onClick={() => setGroupBy('threadline')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                groupBy === 'threadline'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              By Threadline
            </button>
          </div>
        </div>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-slate-400">Loading chart...</p>
          </div>
        ) : chartData.data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="date" 
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#e2e8f0'
                }}
              />
              <Legend 
                wrapperStyle={{ color: '#94a3b8' }}
              />
              {groupBy === 'outcome' ? (
                <>
                  <Bar dataKey="Compliant" stackId="stack" fill="#22c55e" />
                  <Bar dataKey="Attention" stackId="stack" fill="#eab308" />
                  <Bar dataKey="Not Relevant" stackId="stack" fill="#64748b" />
                </>
              ) : groupBy === 'environment' ? (
                <>
                  <Bar dataKey="GitHub" stackId="stack" fill="#64748b" />
                  <Bar dataKey="GitLab" stackId="stack" fill="#f97316" />
                  <Bar dataKey="Vercel" stackId="stack" fill="#a855f7" />
                  <Bar dataKey="Local" stackId="stack" fill="#3b82f6" />
                  <Bar dataKey="Other" stackId="stack" fill="#94a3b8" />
                </>
              ) : (
                // For repo and threadline, dynamically create stacked bars
                (() => {
                  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#f43f5e', '#14b8a6', '#a3e635'];
                  return chartData.keys.map((key, index) => (
                    <Bar 
                      key={key} 
                      dataKey={key} 
                      stackId="stack"
                      fill={colors[index % colors.length]}
                    />
                  ));
                })()
              )}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <p className="text-slate-400">No data available for the selected grouping</p>
          </div>
        )}
      </div>
    </div>
  );
}

