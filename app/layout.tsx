import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import "./globals.css";
import { GITHUB_URL } from "@/lib/constants";
import { Navigation } from "@/components/Navigation";
import { ErrorBoundary } from "@/components/ErrorBoundary";

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

        <ErrorBoundary>
          <Navigation />
          <main className="min-h-screen pt-16">
            {children}
          </main>
          <Footer />
        </ErrorBoundary>
      </body>
    </html>
  );
}
