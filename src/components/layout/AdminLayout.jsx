import { useEffect, useState } from "react";
import Sidebar, { MobileSidebar } from "./Sidebar";
import Topbar from "./Topbar";
import MobileNav from "./MobileNav";

export default function AdminLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen md:h-screen">
        <div className="hidden shrink-0 md:flex">
          <Sidebar />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenuClick={() => setMobileMenuOpen(true)} />
          <main className="min-w-0 p-3 pb-24 md:overflow-auto md:p-4 md:pb-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
      <div className="md:hidden">
        <MobileSidebar
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />
        <MobileNav />
      </div>
    </div>
  );
}
