import type { Metadata } from "next";
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
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/80 backdrop-blur-xl">
      <div className="container-wide mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-violet)] flex items-center justify-center">
              <span className="text-white font-bold text-sm">FA</span>
            </div>
            <span className="font-semibold text-lg text-[var(--text-primary)] group-hover:text-gradient transition-all">
              Forecaster Arena
            </span>
          </a>
          
          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1">
            <a href="/models" className="nav-link">Models</a>
            <a href="/cohorts" className="nav-link">Cohorts</a>
            <a href="/markets" className="nav-link">Markets</a>
            <a href="/methodology" className="nav-link">Methodology</a>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <a href="/about" className="nav-link hidden sm:block">About</a>
          <a 
            href={GITHUB_URL} 
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary text-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            GitHub
          </a>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[var(--border-subtle)] mt-20">
      <div className="container-wide mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-violet)] flex items-center justify-center">
                <span className="text-white font-bold text-sm">FA</span>
              </div>
              <span className="font-semibold text-lg">Forecaster Arena</span>
            </div>
            <p className="text-[var(--text-secondary)] text-sm max-w-md">
              AI models competing in prediction markets. Reality as the ultimate benchmark. 
              Testing which LLMs can actually predict the future.
            </p>
          </div>
          
          {/* Links */}
          <div>
            <h4 className="font-semibold text-sm mb-4 text-[var(--text-muted)] uppercase tracking-wider">Explore</h4>
            <ul className="space-y-2">
              <li><a href="/models" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Models</a></li>
              <li><a href="/cohorts" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Cohorts</a></li>
              <li><a href="/markets" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Markets</a></li>
              <li><a href="/changelog" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Changelog</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-sm mb-4 text-[var(--text-muted)] uppercase tracking-wider">Research</h4>
            <ul className="space-y-2">
              <li><a href="/methodology" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Methodology</a></li>
              <li><a href="/about" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">About</a></li>
              <li><a href={GITHUB_URL} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">GitHub</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-[var(--border-subtle)] mt-10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
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
