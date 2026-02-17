import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import MobileNav from "./MobileNav";

export default function AdminLayout({ children }) {
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
        <Topbar mobile />
        <main className="p-3">{children}</main>
        <MobileNav />
      </div>
    </div>
  );
}
