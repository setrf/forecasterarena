interface AdminLoginCardProps {
  password: string;
  error: string;
  loading: boolean;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}

export function AdminLoginCard({
  password,
  error,
  loading,
  onPasswordChange,
  onSubmit
}: AdminLoginCardProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="glass-card p-8 w-full max-w-md mx-auto relative z-10 bg-[var(--bg-card)] border-2 border-[var(--border-medium)] shadow-xl">
        <h1 className="text-2xl font-bold mb-6 text-center text-[var(--text-primary)]">Admin Login</h1>

        <form onSubmit={onSubmit}>
          <div className="mb-4">
            <label className="block text-sm text-[var(--text-secondary)] mb-2 font-medium">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:border-[var(--accent-blue)] focus:outline-none"
              placeholder="Enter admin password"
              required
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-lg text-sm text-[var(--accent-rose)]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
