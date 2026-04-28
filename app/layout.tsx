import type { Metadata } from "next";
import Link from "next/link";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Script from "next/script";
import "./globals.css";
import { GITHUB_URL } from "@/lib/constants";
import { Navigation } from "@/components/Navigation";
import { AppShellBoundary } from "@/components/AppShellBoundary";

export const metadata: Metadata = {
  title: "Forecaster Arena | Reality-Grounded LLM Evaluation",
  description: "Forecaster Arena evaluates LLMs on unsettled real-world events using prediction markets, paper portfolios, and deterministic portfolio-value scoring.",
  keywords: ["AI", "LLM", "prediction markets", "Polymarket", "benchmark", "forecasting"],
  authors: [{ name: "Forecaster Arena" }],
  openGraph: {
    title: "Forecaster Arena",
    description: "Reality-grounded LLM evaluation using unsettled future events and paper portfolios.",
    type: "website",
  },
};

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
              Reality as the ultimate benchmark. Frontier LLMs make timestamped paper-portfolio
              decisions before real-world outcomes resolve.
            </p>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-gold)]" />
              <span className="text-xs text-[var(--text-muted)]">Methodology v2</span>
            </div>
          </div>

          {/* Links */}
          <nav className="md:col-span-2" aria-label="Explore">
            <p className="font-mono text-xs mb-5 text-[var(--text-muted)] uppercase tracking-wider">Explore</p>
            <ul className="space-y-3">
              <li><Link href="/models" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors">Models</Link></li>
              <li><Link href="/cohorts" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors">Cohorts</Link></li>
              <li><Link href="/markets" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors">Markets</Link></li>
              <li><Link href="/changelog" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors">Changelog</Link></li>
            </ul>
          </nav>

          <nav className="md:col-span-2" aria-label="Research">
            <p className="font-mono text-xs mb-5 text-[var(--text-muted)] uppercase tracking-wider">Research</p>
            <ul className="space-y-3">
              <li><Link href="/methodology" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors">Methodology</Link></li>
              <li><Link href="/about" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors">About</Link></li>
              <li><a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors">GitHub</a></li>
            </ul>
          </nav>

          <div className="md:col-span-3">
            <p className="font-mono text-xs mb-5 text-[var(--text-muted)] uppercase tracking-wider">Status</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-muted)]">Next Decision</span>
                <span className="font-mono">Sunday 00:05 UTC</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-muted)]">Market Sync</span>
                <span className="font-mono">Runs before cohorts</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-muted)]">Market Source</span>
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
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-MKLB59R9M6"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-MKLB59R9M6');
          `}
        </Script>

        <AppShellBoundary>
          <Navigation />
          <main className="app-main min-h-screen pt-16">
            {children}
          </main>
          <Footer />
        </AppShellBoundary>
      </body>
    </html>
  );
}
