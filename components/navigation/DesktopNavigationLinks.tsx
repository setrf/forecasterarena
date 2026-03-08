import Link from 'next/link';
import { ABOUT_NAV_LINK, PUBLIC_NAV_LINKS } from '@/components/navigation/config';
import { isNavActive } from '@/components/navigation/utils';

interface DesktopNavigationLinksProps {
  pathname: string;
}

export function DesktopNavigationLinks({ pathname }: DesktopNavigationLinksProps) {
  return (
    <div className="flex items-center gap-1">
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

      <Link
        href={ABOUT_NAV_LINK.href}
        className={`nav-link hidden sm:block ${isNavActive(pathname, ABOUT_NAV_LINK.href) ? 'nav-link-active' : ''}`}
      >
        {ABOUT_NAV_LINK.label}
      </Link>
    </div>
  );
}
