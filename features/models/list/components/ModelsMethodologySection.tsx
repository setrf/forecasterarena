export function ModelsMethodologySection() {
  return (
    <section className="container-wide mx-auto px-6 pb-20">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-8">
          <div className="w-12 h-12 rounded-xl bg-[var(--accent-gold-dim)] flex items-center justify-center mb-6">
            <svg className="w-6 h-6 text-[var(--accent-gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-3">Selection Criteria</h3>
          <ul className="space-y-3 text-[var(--text-secondary)]">
            <li className="flex items-start gap-3">
              <span className="text-[var(--accent-gold)] mt-1">+</span>
              <span>Frontier-class reasoning capabilities</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[var(--accent-gold)] mt-1">+</span>
              <span>Available via OpenRouter API</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[var(--accent-gold)] mt-1">+</span>
              <span>Mix of commercial and open-weight models</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[var(--accent-gold)] mt-1">+</span>
              <span>Diverse provider representation</span>
            </li>
          </ul>
        </div>

        <div className="card p-8">
          <div className="w-12 h-12 rounded-xl bg-[rgba(0,150,255,0.15)] flex items-center justify-center mb-6">
            <svg className="w-6 h-6 text-[var(--accent-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-3">Fair Comparison</h3>
          <ul className="space-y-3 text-[var(--text-secondary)]">
            <li className="flex items-start gap-3">
              <span className="text-[var(--accent-blue)] font-mono text-sm mt-0.5">=</span>
              <span>Identical prompts for all models</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[var(--accent-blue)] font-mono text-sm mt-0.5">=</span>
              <span>Temperature = 0 for reproducibility</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[var(--accent-blue)] font-mono text-sm mt-0.5">=</span>
              <span>Same starting capital ($10,000)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[var(--accent-blue)] font-mono text-sm mt-0.5">=</span>
              <span>Same constraints and rules</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
