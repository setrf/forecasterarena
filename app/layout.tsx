import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { GITHUB_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Forecaster Arena | AI Models Competing in Prediction Markets",
  description: "AI models competing in prediction markets. Reality as the ultimate benchmark. See which LLMs predict the future best.",
  keywords: ["AI", "LLM", "prediction markets", "Polymarket", "benchmark", "forecasting"],
  authors: [{ name: "Forecaster Arena" }],
  openGraph: {
    title: "Forecaster Arena",
    description: "AI models competing in prediction markets. Reality as the ultimate benchmark.",
    type: "website",
  },
};

function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border-subtle)]">
      {/* Blur background */}
      <div className="absolute inset-0 bg-[var(--bg-primary)]/70 backdrop-blur-xl" />
      
      <div className="container-wide mx-auto px-6 h-16 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-10">
          {/* Logo */}
          <Link href="/" className="font-semibold text-lg hover:text-[var(--accent-gold)] transition-colors">
            Forecaster Arena
          </Link>
          
          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/models" className="nav-link">Models</Link>
            <Link href="/cohorts" className="nav-link">Cohorts</Link>
            <Link href="/markets" className="nav-link">Markets</Link>
            <Link href="/methodology" className="nav-link">Methodology</Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-2">
          <Link href="/about" className="nav-link hidden sm:block">About</Link>
          <a 
            href={GITHUB_URL} 
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-[var(--border-medium)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="relative border-t border-[var(--border-subtle)] mt-12">
      {/* Background texture */}
      <div className="absolute inset-0 bg-[var(--bg-secondary)]" />
      <div className="absolute inset-0 dot-grid opacity-20" />
      
      <div className="container-wide mx-auto px-6 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          {/* Brand */}
          <div className="md:col-span-5">
            <Link href="/" className="font-semibold text-xl inline-block mb-6 hover:text-[var(--accent-gold)] transition-colors">
              Forecaster Arena
            </Link>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-sm mb-6">
              Reality as the ultimate benchmark. Seven frontier LLMs compete in prediction markets. 
              No memorization possible - only genuine forecasting ability.
            </p>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--color-positive)] animate-pulse" />
              <span className="text-xs text-[var(--text-muted)]">Live - Methodology v1.0</span>
            </div>
          </div>
          
          {/* Links */}
          <div className="md:col-span-2">
            <h4 className="font-mono text-xs mb-5 text-[var(--text-muted)] uppercase tracking-wider">Explore</h4>
            <ul className="space-y-3">
              <li><Link href="/models" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors">Models</Link></li>
              <li><Link href="/cohorts" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors">Cohorts</Link></li>
              <li><Link href="/markets" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors">Markets</Link></li>
              <li><Link href="/changelog" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors">Changelog</Link></li>
            </ul>
          </div>
          
          <div className="md:col-span-2">
            <h4 className="font-mono text-xs mb-5 text-[var(--text-muted)] uppercase tracking-wider">Research</h4>
            <ul className="space-y-3">
              <li><Link href="/methodology" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors">Methodology</Link></li>
              <li><Link href="/about" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors">About</Link></li>
              <li><a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors">GitHub</a></li>
            </ul>
          </div>
          
          <div className="md:col-span-3">
            <h4 className="font-mono text-xs mb-5 text-[var(--text-muted)] uppercase tracking-wider">Status</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-muted)]">Next Decision</span>
                <span className="font-mono">Sunday 00:00 UTC</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-muted)]">Markets Synced</span>
                <span className="font-mono text-[var(--color-positive)]">100+</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-muted)]">Data Source</span>
                <span className="font-mono">Polymarket</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-[var(--border-subtle)] mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[var(--text-muted)]">
            © {new Date().getFullYear()} Forecaster Arena. Open source research project.
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            Paper trading only. Not financial advice.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main className="min-h-screen pt-16">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
