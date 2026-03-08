import Link from 'next/link';
import { PUBLIC_NAV_LINKS } from '@/components/navigation/config';
import { isNavActive } from '@/components/navigation/utils';

interface MobileNavigationMenuProps {
  pathname: string;
  mobileMenuOpen: boolean;
  onNavigate: () => void;
}

export function MobileNavigationMenu({
  pathname,
  mobileMenuOpen,
  onNavigate
}: MobileNavigationMenuProps) {
  return (
    <div
      className={`md:hidden absolute top-full left-0 right-0 bg-[var(--bg-primary)]/95 backdrop-blur-xl border-b border-[var(--border-subtle)] transition-all duration-300 ${
        mobileMenuOpen
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}
    >
      <nav className="container-wide mx-auto px-6 py-4 flex flex-col gap-1">
        {PUBLIC_NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={`px-4 py-3 rounded-lg transition-colors ${
              isNavActive(pathname, link.href)
                ? 'bg-[var(--accent-gold-dim)] text-[var(--accent-gold)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
