import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { logoutAction } from "@/app/login/actions";
import { HiOutlineLogout } from "react-icons/hi";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-brand-50">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileNav />
        <header className="hidden md:flex items-center justify-end px-8 py-4">
          <form action={logoutAction}>
            <button type="submit" className="btn-ghost">
              <HiOutlineLogout className="h-4 w-4" />
              Esci
            </button>
          </form>
        </header>
        <main className="flex-1 px-4 md:px-8 pb-16 pt-2 md:pt-0">{children}</main>
      </div>
    </div>
  );
}
