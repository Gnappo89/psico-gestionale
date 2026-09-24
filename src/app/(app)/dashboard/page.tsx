import Link from "next/link";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/StatCard";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";
import {
  HiOutlineUsers,
  HiOutlineDocumentText,
  HiOutlineCash,
  HiOutlineExclamationCircle,
  HiPlus,
} from "react-icons/hi";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [pazientiAttivi, fattureNonPagate, incassatoMese, incassatoAnno, ultimeFatture] =
    await Promise.all([
      prisma.patient.count({ where: { attivo: true } }),
      prisma.invoice.findMany({ where: { pagata: false }, select: { importo: true } }),
      prisma.invoice.aggregate({
        _sum: { importo: true },
        where: { pagata: true, dataPagamento: { gte: startOfMonth } },
      }),
      prisma.invoice.aggregate({
        _sum: { importo: true },
        where: { pagata: true, dataPagamento: { gte: startOfYear } },
      }),
      prisma.invoice.findMany({
        orderBy: { data: "desc" },
        take: 6,
        include: { patient: true },
      }),
    ]);

  const totaleNonPagato = fattureNonPagate.reduce((acc, f) => acc + toNumber(f.importo), 0);

  return (
    <div className="py-6 md:py-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ciao! 👋</h1>
          <p className="text-slate-500 text-sm mt-1">
            Ecco la situazione dello studio, {formatDate(now)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/pazienti/nuovo" className="btn-secondary">
            <HiPlus className="h-4 w-4" /> Paziente
          </Link>
          <Link href="/fatture/nuova" className="btn-primary">
            <HiPlus className="h-4 w-4" /> Fattura
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pazienti attivi"
          value={String(pazientiAttivi)}
          icon={HiOutlineUsers}
          color="brand"
        />
        <StatCard
          label="Da incassare"
          value={formatCurrency(totaleNonPagato)}
          hint={`${fattureNonPagate.length} fatture non pagate`}
          icon={HiOutlineExclamationCircle}
          color="coral"
        />
        <StatCard
          label="Incassato questo mese"
          value={formatCurrency(toNumber(incassatoMese._sum.importo ?? 0))}
          icon={HiOutlineCash}
          color="mint"
        />
        <StatCard
          label="Incassato quest'anno"
          value={formatCurrency(toNumber(incassatoAnno._sum.importo ?? 0))}
          icon={HiOutlineDocumentText}
          color="sunny"
        />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-800">Ultime fatture</h2>
          <Link href="/fatture" className="text-sm font-semibold text-brand-600 hover:underline">
            Vedi tutte
          </Link>
        </div>

        {ultimeFatture.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">
            Nessuna fattura ancora. Creane una dalla sezione Fatture.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {ultimeFatture.map((f) => (
              <Link
                key={f.id}
                href={`/fatture/${f.id}`}
                className="flex items-center justify-between py-3 hover:bg-brand-50/60 -mx-2 px-2 rounded-lg transition-colors"
              >
                <div>
                  <p className="font-medium text-slate-800 text-sm">
                    {f.patient.nome} {f.patient.cognome}
                  </p>
                  <p className="text-xs text-slate-400">
                    Fattura n. {f.numero} · {formatDate(f.data)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
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
