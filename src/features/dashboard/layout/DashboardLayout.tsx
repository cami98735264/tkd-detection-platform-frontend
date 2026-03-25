import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { authApi } from "@/features/auth/api/authApi";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
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
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function DashboardLayout() {
  const navigate = useNavigate();
  const { handleError } = useApiErrorHandler();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      handleError(err);
    } finally {
      navigate("/login");
    }
  };

  const initials = user ? getInitials(user.full_name) : "??";
  const isAdmin = user?.role === "administrator";

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
          <SidebarItem to="/dashboard/programas" icon={BookOpen} label="Programas" />
          <SidebarItem to="/dashboard/inscripcion" icon={ClipboardList} label="Inscripción" />
          <SidebarItem to="/dashboard/evaluacion" icon={CheckCircle} label="Evaluación" />
          {isAdmin && (
            <SidebarItem to="/dashboard/reportes" icon={BarChart3} label="Reportes" />
          )}
          <SidebarItem to="/dashboard/profile" icon={User} label="Perfil" />
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
                {initials}
              </div>

              <div className="text-sm">
                <p className="font-medium">{user?.full_name ?? "—"}</p>
                <p className="text-green-200 text-xs">{user?.email ?? ""}</p>
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
                {initials}
              </div>
              <span className="hidden sm:block">
                {user?.full_name?.split(" ")[0] ?? ""}
              </span>
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
