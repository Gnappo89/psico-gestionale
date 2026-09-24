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
  { href: "/dashboard", label: "Home", icon: HiOutlineHome },
  { href: "/pazienti", label: "Pazienti", icon: HiOutlineUsers },
  { href: "/fatture", label: "Fatture", icon: HiOutlineDocumentText },
  { href: "/report", label: "Report", icon: HiOutlineChartBar },
  { href: "/impostazioni", label: "Impostazioni", icon: HiOutlineCog },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden sticky top-0 z-20 bg-brand-700 text-white px-2 py-2 flex gap-1 overflow-x-auto">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap ${
              active ? "bg-white text-brand-700" : "text-brand-50"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
