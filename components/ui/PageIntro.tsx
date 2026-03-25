import type { ReactNode } from 'react';

interface PageIntroProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  className?: string;
  containerClassName?: string;
  contentClassName?: string;
}

export function PageIntro({
  eyebrow,
  title,
  description,
  children,
  actions,
  aside,
  className,
  containerClassName,
  contentClassName,
}: PageIntroProps) {
  return (
    <section className={['page-intro', !aside && 'page-intro--solo', className].filter(Boolean).join(' ')}>
      <div className={['page-intro__grid', containerClassName].filter(Boolean).join(' ')}>
        <div className={['page-intro__content', contentClassName].filter(Boolean).join(' ')}>
          {eyebrow && <p className="page-intro__eyebrow">{eyebrow}</p>}
          <h1 className="page-intro__title">{title}</h1>
          {description && <p className="page-intro__description">{description}</p>}
          {children}
          {actions && <div className="page-intro__actions">{actions}</div>}
        </div>
        {aside && <aside className="page-intro__aside">{aside}</aside>}
      </div>
    </section>
  );
}
