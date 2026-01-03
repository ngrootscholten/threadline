"use client";

import { useState } from "react";

interface FilterOptions {
  authors: Array<{ value: string; label: string }>;
  environments: Array<{ value: string; label: string }>;
  repositories: Array<{ value: string; label: string }>;
}

interface ChecksFiltersProps {
  filterOptions: FilterOptions;
  authorFilter: string;
  environmentFilter: string;
  repoFilter: string;
  onFilterChange: (filterType: 'author' | 'environment' | 'repo', value: string) => void;
  onClearFilters: () => void;
}

export function ChecksFilters({
  filterOptions,
  authorFilter,
  environmentFilter,
  repoFilter,
  onFilterChange,
  onClearFilters,
}: ChecksFiltersProps) {
  const [authorDropdownOpen, setAuthorDropdownOpen] = useState(false);

  // Get selected author for display
  const selectedAuthor = authorFilter
    ? filterOptions.authors.find(a => a.value === authorFilter)
    : null;

  const hasActiveFilters = authorFilter || environmentFilter || repoFilter;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2 relative">
        <label htmlFor="author-filter" className="text-sm text-slate-400">Author:</label>
        <div className="relative">
          <button
            id="author-filter"
            type="button"
            onClick={() => setAuthorDropdownOpen(!authorDropdownOpen)}
            className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-green-500/50 min-w-[200px] text-left flex items-center justify-between"
          >
            {selectedAuthor ? (
              <span className="truncate">
                {selectedAuthor.value.split('|')[0] || selectedAuthor.value.split('|')[1]}
              </span>
            ) : (
              <span>All Authors</span>
            )}
            <span className="ml-2 text-slate-500 flex-shrink-0">▼</span>
          </button>
          {authorDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setAuthorDropdownOpen(false)}
              />
              <div className="absolute z-20 mt-1 bg-slate-800 border border-slate-700 rounded shadow-lg max-h-60 overflow-auto min-w-[200px]">
                <button
                  type="button"
                  onClick={() => {
                    onFilterChange('author', '');
                    setAuthorDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors ${
                    !authorFilter ? 'text-green-400' : 'text-slate-300'
                  }`}
                >
                  All Authors
                </button>
                {filterOptions.authors.map((author) => {
                  const [name, email] = author.value.split('|');
                  const isSelected = authorFilter === author.value;
                  return (
                    <button
                      key={author.value}
                      type="button"
                      onClick={() => {
                        onFilterChange('author', author.value);
                        setAuthorDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors ${
                        isSelected ? 'text-green-400 bg-slate-700/50' : 'text-slate-300'
                      }`}
                    >
                      {name && email ? (
                        <>
                          <div>{name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{email}</div>
                        </>
                      ) : name ? (
                        <div>{name}</div>
                      ) : (
                        <div>{email}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="environment-filter" className="text-sm text-slate-400">Environment:</label>
        <select
          id="environment-filter"
          value={environmentFilter}
          onChange={(e) => onFilterChange('environment', e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-green-500/50"
        >
          <option value="">All Environments</option>
          {filterOptions.environments.map((env) => (
            <option key={env.value} value={env.value}>
              {env.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="repo-filter" className="text-sm text-slate-400">Repository:</label>
        <select
          id="repo-filter"
          value={repoFilter}
          onChange={(e) => onFilterChange('repo', e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-green-500/50"
        >
          <option value="">All Repositories</option>
          {filterOptions.repositories.map((repo) => (
            <option key={repo.value} value={repo.value}>
              {repo.label}
            </option>
          ))}
        </select>
      </div>

      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}

