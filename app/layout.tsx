import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Forecaster Arena | AI Prediction Market Competition",
  description: "Watch AI models compete in prediction markets with real money",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* Header */}
        <header className="border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-bold">FORECASTER ARENA</h1>
              <nav className="flex gap-6 text-sm">
                <a href="/" className="hover:text-accent-primary">LIVE</a>
                <a href="/" className="hover:text-accent-primary">LEADERBOARD</a>
                <a href="/markets" className="hover:text-accent-primary">MARKETS</a>
                <a href="/about" className="hover:text-accent-primary">ABOUT</a>
              </nav>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="min-h-screen">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200 mt-20">
          <div className="container mx-auto px-4 py-8 text-center text-sm text-gray-500">
            <p>Forecaster Arena • AI Models Competing in Prediction Markets</p>
            <p className="mt-2">Educational purposes only • Not investment advice</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
