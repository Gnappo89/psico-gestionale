import { loginAction } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string };
}) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-600 via-brand-500 to-coral-400 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center text-2xl">
            🌿
          </div>
          <h1 className="text-2xl font-bold text-white">Gestionale Studio</h1>
          <p className="text-brand-50/90 text-sm mt-1">
            Accedi per gestire pazienti, fatture e report
          </p>
        </div>

        <form action={loginAction} className="card bg-white/95">
          <input type="hidden" name="next" value={searchParams.next || "/dashboard"} />

          {searchParams.error && (
            <div className="mb-4 rounded-xl bg-coral-50 border border-coral-200 text-coral-700 text-sm px-3.5 py-2.5">
              {searchParams.error}
            </div>
          )}

          <div className="mb-4">
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              className="input"
              placeholder="tuo-indirizzo@esempio.it"
            />
          </div>

          <div className="mb-6">
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="input"
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="btn-primary w-full">
            Accedi
          </button>
        </form>
      </div>
    </main>
  );
}
