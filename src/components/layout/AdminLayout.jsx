// src/components/layout/AdminLayout.jsx

import { useEffect, useState } from "react";
import Sidebar, { MobileSidebar } from "./Sidebar";
import Topbar from "./Topbar";
import MobileNav from "./MobileNav";

export default function AdminLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fermer le menu si on repasse en desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileMenuOpen(false);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop */}
      <div className="hidden md:flex h-screen">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <Topbar />
          <main className="p-4 lg:p-6 overflow-auto">{children}</main>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden pb-20">
        <Topbar onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="p-3">{children}</main>

        {/* Drawer mobile */}
        <MobileSidebar
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        <MobileNav />
      </div>
    </div>
  );
}