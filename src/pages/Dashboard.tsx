import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  ClipboardList,
  CheckCircle,
  BarChart3,
  User,
  Bell,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("auth");
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-gray-100 relative">
      {/* OVERLAY MOBILE */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          bg-green-900 text-white w-64 flex flex-col flex-shrink-0
          fixed inset-y-0 left-0 z-50 transform transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:static lg:translate-x-0
        `}
      >
        {/* LOGO */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-green-800">
          <div className="flex items-center gap-2">
            <Shield className="text-yellow-400" />
            <div>
              <p className="font-semibold">Warriors TKD</p>
              <span className="text-xs text-green-200">Espinal</span>
            </div>
          </div>

          <button className="lg:hidden" onClick={() => setOpen(false)}>
            <X />
          </button>
        </div>

        {/* MENU */}
        <nav className="p-4 space-y-2">
          <SidebarItem to="/dashboard" icon={LayoutDashboard} label="Panel" />
          <SidebarItem to="/dashboard/deportistas" icon={Users} label="Deportistas" />
          <SidebarItem to="/dashboard/inscripcion" icon={ClipboardList} label="Inscripción" />
          <SidebarItem to="/dashboard/evaluacion" icon={CheckCircle} label="Evaluación" />
          <SidebarItem to="/dashboard/reportes" icon={BarChart3} label="Reportes" />
          <SidebarItem to="/dashboard/perfil" icon={User} label="Perfil" />
        </nav>
        
          
    
    {/* USER FOOTER */}
      <div className="mt-auto p-4 space-y-4">      
         <Button
           variant="destructive"
            className="w-full"
            onClick={handleLogout}
           >
           Cerrar sesión
        </Button>
     <div className="pt-4 border-t border-green-800">
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-full bg-green-700 flex items-center justify-center text-sm font-bold">
        AD
      </div>

      <div className="text-sm">
        <p className="font-medium">Usuario Admin</p>
        <p className="text-green-200 text-xs">admin@warriors.com</p>
      </div>
    </div>
    </div>

    </div>
      </aside>

      {/* RIGHT CONTAINER */}
      <div className="flex flex-col flex-1">
        {/* NAVBAR */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setOpen(true)}>
              <Menu />
            </button>

            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                W
              </div>
              <span className="font-semibold">Warriors TKD</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Bell className="text-gray-600" />

            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm">
                AD
              </div>
              <span className="hidden sm:block">Admin</span>
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/* ---------- SIDEBAR ITEM ---------- */

function SidebarItem({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: any;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-green-800 transition"
    >
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  );
}