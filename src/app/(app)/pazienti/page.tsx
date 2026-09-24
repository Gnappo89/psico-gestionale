import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatCurrency, initials, toNumber } from "@/lib/utils";
import { HiPlus, HiOutlineSearch } from "react-icons/hi";

export const dynamic = "force-dynamic";

export default async function PazientiPage({
  searchParams,
}: {
  searchParams: { q?: string; stato?: string };
}) {
  const q = searchParams.q?.trim() || "";
  const stato = searchParams.stato === "inattivi" ? "inattivi" : "attivi";

  const pazienti = await prisma.patient.findMany({
    where: {
      attivo: stato === "attivi",
      ...(q
        ? {
            OR: [
              { nome: { contains: q, mode: "insensitive" } },
              { cognome: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ cognome: "asc" }, { nome: "asc" }],
    include: { _count: { select: { invoices: true } } },
  });

  return (
    <div className="py-6 md:py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pazienti</h1>
          <p className="text-slate-500 text-sm mt-1">Anagrafica e tariffa di ogni paziente</p>
        </div>
        <Link href="/pazienti/nuovo" className="btn-primary">
          <HiPlus className="h-4 w-4" /> Nuovo paziente
        </Link>
      </div>

      <form className="card flex flex-wrap gap-3 items-center" method="get">
        <div className="relative flex-1 min-w-[220px]">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Cerca per nome, cognome o email..."
            className="input pl-9"
          />
        </div>
        <select name="stato" defaultValue={stato} className="input w-auto">
          <option value="attivi">Attivi</option>
          <option value="inattivi">Non attivi</option>
        </select>
        <button type="submit" className="btn-secondary">
          Filtra
        </button>
      </form>

      <div className="card !p-0 overflow-hidden">
        {pazienti.length === 0 ? (
          <p className="text-sm text-slate-400 py-10 text-center">
            Nessun paziente trovato. Aggiungine uno nuovo per iniziare.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {pazienti.map((p) => (
              <Link
                key={p.id}
                href={`/pazienti/${p.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-brand-50/60 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">
                    {initials(p.nome, p.cognome)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">
                      {p.cognome} {p.nome}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {p.email || "Nessuna email"} {p.telefono ? `· ${p.telefono}` : ""}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-slate-700 text-sm">
                    {formatCurrency(toNumber(p.tariffaSeduta))}
                  </p>
                  <p className="text-xs text-slate-400">{p._count.invoices} fatture</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
