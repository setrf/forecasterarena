import Link from 'next/link';
import { PUBLIC_NAV_LINKS } from '@/components/navigation/config';
import { isNavActive } from '@/components/navigation/utils';

interface DesktopNavigationLinksProps {
  pathname: string;
}

export function DesktopNavigationLinks({ pathname }: DesktopNavigationLinksProps) {
  return (
    <nav className="hidden md:flex items-center gap-1">
      {PUBLIC_NAV_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`nav-link ${isNavActive(pathname, link.href) ? 'nav-link-active' : ''}`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
