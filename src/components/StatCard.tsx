import type { IconType } from "react-icons";

const colorMap = {
  brand: "bg-brand-100 text-brand-700",
  coral: "bg-coral-100 text-coral-700",
  mint: "bg-mint-100 text-mint-700",
  sunny: "bg-sunny-100 text-sunny-700",
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  color = "brand",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: IconType;
  color?: keyof typeof colorMap;
}) {
  return (
    <div className="card flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
        {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
      </div>
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${colorMap[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}
