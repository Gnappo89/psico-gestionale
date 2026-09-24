"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HiOutlineHome,
  HiOutlineUsers,
  HiOutlineDocumentText,
  HiOutlineChartBar,
  HiOutlineCog,
} from "react-icons/hi";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: HiOutlineHome },
  { href: "/pazienti", label: "Pazienti", icon: HiOutlineUsers },
  { href: "/fatture", label: "Fatture", icon: HiOutlineDocumentText },
  { href: "/report", label: "Report", icon: HiOutlineChartBar },
  { href: "/impostazioni", label: "Impostazioni", icon: HiOutlineCog },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 bg-brand-700 text-white min-h-screen px-4 py-6">
      <div className="flex items-center gap-2 px-2 mb-8">
        <span className="text-2xl">🌿</span>
        <span className="font-bold text-lg">Gestionale Studio</span>
      </div>

      <nav className="flex flex-col gap-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-white text-brand-700 shadow-soft"
                  : "text-brand-50 hover:bg-brand-600"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
