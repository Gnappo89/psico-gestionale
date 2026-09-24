"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-brand-50 px-4">
      <div className="text-center max-w-md">
        <p className="text-6xl mb-4">⚠️</p>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Qualcosa è andato storto</h1>
        <p className="text-slate-500 mb-6 text-sm">{error.message}</p>
        <button onClick={() => reset()} className="btn-primary">
          Riprova
        </button>
      </div>
    </main>
  );
}
