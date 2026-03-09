import Link from 'next/link';
import type { CatalogModel } from '@/features/models/detail/types';

interface ModelDetailHeaderProps {
  model: CatalogModel;
}

export function ModelDetailHeader({ model }: ModelDetailHeaderProps) {
  return (
    <>
      <Link href="/models" className="detail-backlink">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to all models
      </Link>

      <div className="detail-header">
        <div className="detail-header__identity">
          <div
            className="detail-header__avatar"
            style={{ backgroundColor: model.color }}
          >
            {model.displayName.substring(0, 2).toUpperCase()}
          </div>

          <div className="flex-1">
            <p className="detail-header__eyebrow">Model Family</p>
            <div className="detail-header__badges">
              <h1 className="detail-header__title">{model.displayName}</h1>
              <span className="badge badge-active">Active</span>
            </div>
            <p className="detail-header__meta">
              {model.provider}
              {model.currentReleaseName ? ` • Current Release: ${model.currentReleaseName}` : ''}
            </p>
          </div>
        </div>

        {model.openrouterId ? (
          <div className="metric-tile max-w-sm">
            <p className="metric-tile__label">OpenRouter ID</p>
            <code className="metric-tile__meta block font-mono text-sm">
              {model.openrouterId}
            </code>
          </div>
        ) : null}
      </div>
    </>
  );
}
