import { prisma } from "@/lib/db";
import { getStudioSettings } from "@/lib/settings";
import { computeTaxBreakdown } from "@/lib/tax";
import { formatCurrency, toNumber } from "@/lib/utils";
import { MonthlyBarChart, StatusPieChart } from "@/components/ReportCharts";
import { StatCard } from "@/components/StatCard";
import { HiOutlineCash, HiOutlineExclamationCircle, HiOutlineReceiptTax, HiOutlineTrendingUp } from "react-icons/hi";

export const dynamic = "force-dynamic";

const MESI = [
  "Gen",
  "Feb",
  "Mar",
  "Apr",
  "Mag",
  "Giu",
  "Lug",
  "Ago",
  "Set",
  "Ott",
  "Nov",
  "Dic",
];

export default async function ReportPage({
  searchParams,
}: {
  searchParams: { anno?: string };
}) {
  const now = new Date();
  const anni = await getAvailableYears();
  const anno = parseInt(searchParams.anno || String(now.getFullYear()), 10) || now.getFullYear();

  const startOfYear = new Date(anno, 0, 1);
  const endOfYear = new Date(anno + 1, 0, 1);

  const [fattureEmesse, fatturePagate, fattureNonPagate, settings] = await Promise.all([
    prisma.invoice.findMany({
      where: { data: { gte: startOfYear, lt: endOfYear } },
      select: { importo: true, data: true },
    }),
    prisma.invoice.findMany({
      where: { pagata: true, dataPagamento: { gte: startOfYear, lt: endOfYear } },
      select: { importo: true, dataPagamento: true },
    }),
    prisma.invoice.findMany({
      where: { pagata: false },
      select: { importo: true },
    }),
    getStudioSettings(),
  ]);

  const monthly = MESI.map((mese, idx) => {
    const fatturato = fattureEmesse
      .filter((f) => f.data.getMonth() === idx)
      .reduce((acc, f) => acc + toNumber(f.importo), 0);
    const incassato = fatturePagate
      .filter((f) => f.dataPagamento && f.dataPagamento.getMonth() === idx)
      .reduce((acc, f) => acc + toNumber(f.importo), 0);
    return { mese, fatturato, incassato };
  });

  const fatturatoAnno = fattureEmesse.reduce((acc, f) => acc + toNumber(f.importo), 0);
  const incassatoAnno = fatturePagate.reduce((acc, f) => acc + toNumber(f.importo), 0);
  const daIncassareTotale = fattureNonPagate.reduce((acc, f) => acc + toNumber(f.importo), 0);

  const tax = computeTaxBreakdown(incassatoAnno, {
    coefficienteRedditivita: settings.coefficienteRedditivita,
    aliquotaImposta: settings.aliquotaImposta,
    aliquotaContributi: settings.aliquotaContributi,
  });

  return (
    <div className="py-6 md:py-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Report</h1>
          <p className="text-slate-500 text-sm mt-1">Fatturato, incassi e stima delle imposte</p>
        </div>
        <form method="get" className="flex items-center gap-2">
          <select name="anno" defaultValue={anno} className="input w-auto">
            {anni.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-secondary">
            Aggiorna
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Fatturato emesso"
          value={formatCurrency(fatturatoAnno)}
          hint={`Anno ${anno}`}
          icon={HiOutlineTrendingUp}
          color="brand"
        />
        <StatCard
          label="Incassato"
          value={formatCurrency(incassatoAnno)}
          hint="Principio di cassa"
          icon={HiOutlineCash}
          color="mint"
        />
        <StatCard
          label="Da incassare"
          value={formatCurrency(daIncassareTotale)}
          hint="Tutte le fatture non pagate"
          icon={HiOutlineExclamationCircle}
          color="coral"
        />
        <StatCard
          label="Netto stimato"
          value={formatCurrency(tax.nettoStimato)}
          hint="Dopo imposte e contributi"
          icon={HiOutlineReceiptTax}
          color="sunny"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <h2 className="font-bold text-slate-800 mb-4">Andamento mensile {anno}</h2>
          <MonthlyBarChart data={monthly} />
        </div>
        <div className="card">
          <h2 className="font-bold text-slate-800 mb-4">Incassato vs da incassare</h2>
          <StatusPieChart pagate={incassatoAnno} daPagare={daIncassareTotale} />
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-800">Stima imposte — regime forfettario</h2>
          <a href="/impostazioni" className="text-sm font-semibold text-brand-600 hover:underline">
            Modifica parametri
          </a>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Calcolo indicativo sull&apos;incassato dell&apos;anno {anno}, a principio di cassa. Per il
          calcolo definitivo fai sempre riferimento al tuo commercialista.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              <Row label="Incassato nell'anno" value={tax.incassato} />
              <Row
                label={`Reddito imponibile lordo (coeff. ${(settings.coefficienteRedditivita * 100).toFixed(0)}%)`}
                value={tax.redditoImponibileLordo}
              />
              <Row
                label={`Contributi previdenziali (${(settings.aliquotaContributi * 100).toFixed(1)}%)`}
                value={-tax.contributiPrevidenziali}
              />
              <Row
                label={`Imposta sostitutiva (${(settings.aliquotaImposta * 100).toFixed(0)}%)`}
                value={-tax.impostaSostitutiva}
              />
              <Row label="Netto stimato" value={tax.nettoStimato} bold />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold = false }: { label: string; value: number; bold?: boolean }) {
  return (
    <tr>
      <td className={`py-2.5 pr-4 ${bold ? "font-bold text-slate-800" : "text-slate-600"}`}>
        {label}
      </td>
      <td
        className={`py-2.5 text-right ${bold ? "font-bold text-brand-700" : "text-slate-700"}`}
      >
        {formatCurrency(value)}
      </td>
    </tr>
  );
}

async function getAvailableYears(): Promise<number[]> {
  const currentYear = new Date().getFullYear();
  const first = await prisma.invoice.findFirst({ orderBy: { data: "asc" }, select: { data: true } });
  const minYear = first ? first.data.getFullYear() : currentYear;
  const years: number[] = [];
  for (let y = currentYear; y >= minYear; y--) years.push(y);
  if (years.length === 0) years.push(currentYear);
  return years;
}
