import Link from 'next/link';
import type { CatalogModel } from '@/features/models/detail/types';

interface ModelDetailHeaderProps {
  model: CatalogModel;
}

export function ModelDetailHeader({ model }: ModelDetailHeaderProps) {
  return (
    <>
      <Link
        href="/models"
        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2 mb-6"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to all models
      </Link>

      <div className="flex flex-col md:flex-row items-start gap-6 mb-10">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold"
          style={{ backgroundColor: model.color }}
        >
          {model.displayName.substring(0, 2).toUpperCase()}
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{model.displayName}</h1>
            <span className="badge badge-active">Active</span>
          </div>
          <p className="text-[var(--text-secondary)]">
            {model.provider}
            {model.currentReleaseName ? ` • Current Release: ${model.currentReleaseName}` : ''}
            {model.openrouterId ? (
              <>
                {' • OpenRouter ID: '}
                <code className="text-sm font-mono bg-[var(--bg-tertiary)] px-2 py-0.5 rounded">
                  {model.openrouterId}
                </code>
              </>
            ) : null}
          </p>
        </div>
      </div>
    </>
  );
}
