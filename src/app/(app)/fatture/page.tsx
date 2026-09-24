import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";
import { HiPlus } from "react-icons/hi";

export const dynamic = "force-dynamic";

export default async function FatturePage({
  searchParams,
}: {
  searchParams: { stato?: string; q?: string };
}) {
  const stato = searchParams.stato === "pagate" || searchParams.stato === "nonpagate"
    ? searchParams.stato
    : "tutte";
  const q = searchParams.q?.trim() || "";

  const fatture = await prisma.invoice.findMany({
    where: {
      ...(stato === "pagate" ? { pagata: true } : {}),
      ...(stato === "nonpagate" ? { pagata: false } : {}),
      ...(q
        ? {
            OR: [
              { numero: { contains: q, mode: "insensitive" } },
              { patient: { nome: { contains: q, mode: "insensitive" } } },
              { patient: { cognome: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { data: "desc" },
    include: { patient: true },
  });

  const totale = fatture.reduce((acc, f) => acc + toNumber(f.importo), 0);

  return (
    <div className="py-6 md:py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Fatture</h1>
          <p className="text-slate-500 text-sm mt-1">
            {fatture.length} fatture · totale {formatCurrency(totale)}
          </p>
        </div>
        <Link href="/fatture/nuova" className="btn-primary">
          <HiPlus className="h-4 w-4" /> Nuova fattura
        </Link>
      </div>

      <form className="card flex flex-wrap gap-3 items-center" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Cerca per numero fattura o paziente..."
          className="input flex-1 min-w-[220px]"
        />
        <select name="stato" defaultValue={stato} className="input w-auto">
          <option value="tutte">Tutte</option>
          <option value="pagate">Pagate</option>
          <option value="nonpagate">Da pagare</option>
        </select>
        <button type="submit" className="btn-secondary">
          Filtra
        </button>
      </form>

      <div className="card !p-0 overflow-hidden">
        {fatture.length === 0 ? (
          <p className="text-sm text-slate-400 py-10 text-center">
            Nessuna fattura trovata.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {fatture.map((f) => (
              <Link
                key={f.id}
                href={`/fatture/${f.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-brand-50/60 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate">
                    {f.patient.nome} {f.patient.cognome}
                  </p>
                  <p className="text-xs text-slate-400">
                    Fattura n. {f.numero} · {formatDate(f.data)}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-semibold text-sm text-slate-700">
                    {formatCurrency(toNumber(f.importo))}
                  </span>
                  <span className={f.pagata ? "badge-success" : "badge-warning"}>
                    {f.pagata ? "Pagata" : "Da pagare"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
