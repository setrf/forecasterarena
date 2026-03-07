import type { SortOption, StatusOption } from '@/features/markets/list/types';

interface MarketsFiltersProps {
  categories: string[];
  category: string;
  cohortBets: boolean;
  search: string;
  sort: SortOption;
  status: StatusOption;
  onCategoryChange: (value: string) => void;
  onCohortBetsChange: (value: boolean) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: SortOption) => void;
  onStatusChange: (value: StatusOption) => void;
}

export function MarketsFilters({
  categories,
  category,
  cohortBets,
  search,
  sort,
  status,
  onCategoryChange,
  onCohortBetsChange,
  onSearchChange,
  onSortChange,
  onStatusChange
}: MarketsFiltersProps) {
  return (
    <section className="sticky top-16 z-40 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/80 backdrop-blur-xl">
      <div className="container-wide mx-auto px-6 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-md lg:flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search markets..."
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              aria-label="Search markets"
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg text-sm focus:border-[var(--accent-gold)] focus:outline-none transition-colors"
            />
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:w-auto lg:flex-wrap">
            <label className="col-span-2 flex min-h-[46px] items-center justify-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm transition-colors hover:border-[var(--accent-gold)] sm:col-span-1 lg:justify-start">
              <input
                type="checkbox"
                checked={cohortBets}
                onChange={(event) => onCohortBetsChange(event.target.checked)}
                aria-label="Only show current cohort markets"
                className="w-4 h-4 rounded border-[var(--border-subtle)] text-[var(--accent-gold)] focus:ring-[var(--accent-gold)] focus:ring-offset-0"
              />
              <span>Current Cohort</span>
            </label>

            <select
              value={status}
              onChange={(event) => onStatusChange(event.target.value as StatusOption)}
              aria-label="Filter markets by status"
              className="w-full min-w-0 px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none cursor-pointer"
            >
              <option value="active">Active</option>
              <option value="closed">Closed</option>
              <option value="resolved">Resolved</option>
              <option value="all">All Status</option>
            </select>

            <select
              value={category}
              onChange={(event) => onCategoryChange(event.target.value)}
              aria-label="Filter markets by category"
              className="w-full min-w-0 px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>

            <select
              value={sort}
              onChange={(event) => onSortChange(event.target.value as SortOption)}
              aria-label="Sort markets"
              className="w-full min-w-0 px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none cursor-pointer"
            >
              <option value="volume">Volume</option>
              <option value="close_date">Close Date</option>
              <option value="created">Recent</option>
            </select>
          </div>
        </div>
      </div>
    </section>
  );
}
