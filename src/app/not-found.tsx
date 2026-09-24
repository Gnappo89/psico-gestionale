import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-brand-50 px-4">
      <div className="text-center">
        <p className="text-6xl mb-4">🔍</p>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Pagina non trovata</h1>
        <p className="text-slate-500 mb-6">La pagina che cerchi non esiste o è stata spostata.</p>
        <Link href="/dashboard" className="btn-primary">
          Torna alla dashboard
        </Link>
      </div>
    </main>
  );
}
