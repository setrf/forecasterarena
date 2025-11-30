'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GITHUB_URL } from '@/lib/constants';

const navLinks = [
  { href: '/models', label: 'Models' },
  { href: '/cohorts', label: 'Cohorts' },
  { href: '/markets', label: 'Markets' },
  { href: '/methodology', label: 'Methodology' },
];

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border-subtle)]">
      {/* Blur background */}
      <div className="absolute inset-0 bg-[var(--bg-primary)]/80 backdrop-blur-xl" />
      
      <div className="container-wide mx-auto px-6 h-16 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-10">
          {/* Logo */}
          <Link 
            href="/" 
            className={`font-semibold text-lg transition-colors ${
              pathname === '/' ? 'text-[var(--accent-gold)]' : 'hover:text-[var(--accent-gold)]'
            }`}
          >
            Forecaster Arena
          </Link>
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link 
                key={link.href}
                href={link.href} 
                className={`nav-link ${isActive(link.href) ? 'nav-link-active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="flex items-center gap-3">
          {/* About link - desktop only */}
          <Link 
            href="/about" 
            className={`nav-link hidden sm:block ${isActive('/about') ? 'nav-link-active' : ''}`}
          >
            About
          </Link>
          
          {/* GitHub button */}
          <a 
            href={GITHUB_URL} 
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-[var(--border-medium)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--border-strong)] transition-all"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            <span className="hidden sm:inline">GitHub</span>
          </a>
          
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>
      
      {/* Mobile menu */}
      <div 
        className={`md:hidden absolute top-full left-0 right-0 bg-[var(--bg-primary)]/95 backdrop-blur-xl border-b border-[var(--border-subtle)] transition-all duration-300 ${
          mobileMenuOpen 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <nav className="container-wide mx-auto px-6 py-4 flex flex-col gap-1">
          {navLinks.map(link => (
            <Link 
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`px-4 py-3 rounded-lg transition-colors ${
                isActive(link.href) 
                  ? 'bg-[var(--accent-gold-dim)] text-[var(--accent-gold)]' 
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link 
            href="/about"
            onClick={() => setMobileMenuOpen(false)}
            className={`px-4 py-3 rounded-lg transition-colors ${
              isActive('/about') 
                ? 'bg-[var(--accent-gold-dim)] text-[var(--accent-gold)]' 
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
            }`}
          >
            About
          </Link>
        </nav>
      </div>
    </header>
  );
}

