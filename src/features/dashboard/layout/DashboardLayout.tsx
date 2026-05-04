import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, LogOut, Menu, User } from "lucide-react";

import { authApi } from "@/features/auth/api/authApi";
import { useAuthStore } from "@/features/auth/store/authStore";
import { usePermissions } from "@/features/auth/hooks/usePermissions";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import type { RoleName } from "@/config/permissions";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";

import { navConfig, buildLabelMap, type NavGroup, type NavItem } from "./navConfig";

function getInitials(name: string | undefined): string {
  if (!name) return "??";
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { handleError } = useApiErrorHandler();
  const { confirm } = useFeedback();
  const { user } = usePermissions();
  const [open, setOpen] = useState(false);

  const role = (user?.role ?? "sportsman") as RoleName;
  const groups = navConfig[role] ?? [];

  // Close mobile drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    const ok = await confirm({
      title: "Cerrar sesión",
      description: "¿Estás seguro de que deseas cerrar sesión?",
    });
    if (!ok) return;
    try {
      await authApi.logout();
    } catch (err) {
      handleError(err);
    } finally {
      useAuthStore.getState().clearSession();
      navigate("/login");
    }
  };

  return (
    <div className="flex h-screen bg-bg text-text">
      <a href="#main-content" className="skip-link">
        Saltar al contenido
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-divider bg-surface">
        <SidebarContents groups={groups} />
      </aside>

      {/* Mobile sidebar (Sheet) */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-70 p-0 border-r border-divider">
          <SheetTitle className="sr-only">Navegación</SheetTitle>
          <SidebarContents groups={groups} />
        </SheetContent>
      </Sheet>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col min-h-0">
        <Topbar
          onOpenMobileNav={() => setOpen(true)}
          user={user}
          role={role}
          onLogout={handleLogout}
        />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 outline-none"
        >
          {/* Keyed wrapper restarts the slide-up-fade keyframe on every route
           * change without unmounting the scroll container itself. */}
          <div key={location.pathname} className="animate-slide-up-fade">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sidebar — shared across desktop and mobile                                 */
/* -------------------------------------------------------------------------- */
function SidebarContents({ groups }: { groups: NavGroup[] }) {
  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center justify-center px-5 py-6 border-b border-divider">
        <Logo className="h-24 w-auto" alt="Warriors TKD" eager />
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        {groups.map((group, i) => (
          <NavGroupBlock key={group.heading ?? `group-${i}`} group={group} />
        ))}
      </nav>
    </div>
  );
}

function NavGroupBlock({ group }: { group: NavGroup }) {
  return (
    <div>
      {group.heading && (
        <p className="px-3 mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-faint">
          {group.heading}
        </p>
      )}
      <ul className="space-y-0.5">
        {group.items.map((item) => (
          <li key={item.to}>
            <SidebarLink item={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SidebarLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        [
          "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-interactive",
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted hover:bg-surface-2 hover:text-text",
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          {/* Active indicator stays mounted on every row; opacity + translate
           * animate together so switching active row crossfades the pills. */}
          <span
            aria-hidden="true"
            className={[
              "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary",
              "transition-[opacity,transform] duration-(--duration-normal) ease-(--ease-spring)",
              isActive
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-1",
            ].join(" ")}
          />
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

/* -------------------------------------------------------------------------- */
/* Topbar                                                                     */
/* -------------------------------------------------------------------------- */
interface TopbarProps {
  onOpenMobileNav: () => void;
  onLogout: () => void;
  role: RoleName;
  user: ReturnType<typeof usePermissions>["user"];
}

function Topbar({ onOpenMobileNav, onLogout, role, user }: TopbarProps) {
  const initials = getInitials(user?.full_name);
  const firstName = user?.full_name?.split(" ")[0] ?? "";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-divider bg-bg/85 backdrop-blur px-4 sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden text-muted hover:text-text"
        onClick={onOpenMobileNav}
        aria-label="Abrir navegación"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile brand mark — visible only when sidebar is collapsed */}
      <Link
        to="/dashboard"
        className="flex items-center gap-1.5 lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded-md"
        aria-label="Warriors TKD — Inicio"
      >
        <Logo className="h-14 w-14" alt="" />
      </Link>

      <Breadcrumbs role={role} />

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Menú de usuario"
              className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 hover:bg-surface-2 transition-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                {initials}
              </span>
              <span className="hidden sm:inline text-sm font-medium text-text">
                {firstName}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-sm font-semibold text-text">{user?.full_name ?? "—"}</p>
              <p className="truncate text-xs font-normal text-muted">{user?.email ?? ""}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/dashboard/profile">
                <User className="h-4 w-4" />
                Mi perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={onLogout}
              className="text-error focus:text-error"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* Breadcrumbs derived from URL + nav labels                                  */
/* -------------------------------------------------------------------------- */
function Breadcrumbs({ role }: { role: RoleName }) {
  const location = useLocation();
  const labelMap = useMemo(() => buildLabelMap(role), [role]);

  const segments = location.pathname.split("/").filter(Boolean);
  const trail: { to: string; label: string }[] = [];
  let acc = "";
  for (const seg of segments) {
    acc += `/${seg}`;
    const label = labelMap.get(acc);
    if (label) trail.push({ to: acc, label });
  }

  // If we're on /dashboard exactly, show single "Inicio" label
  if (trail.length === 0) trail.push({ to: "/dashboard", label: "Inicio" });

  return (
    <nav aria-label="Migas de pan" className="hidden md:flex items-center gap-1.5 text-sm min-w-0">
      {trail.map((crumb, idx) => {
        const isLast = idx === trail.length - 1;
        return (
          <span key={crumb.to} className="flex items-center gap-1.5 min-w-0">
            {idx > 0 && (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden="true" />
            )}
            {isLast ? (
              <span className="font-medium text-text truncate">{crumb.label}</span>
            ) : (
              <Link
                to={crumb.to}
                className="text-muted hover:text-text transition-interactive truncate"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
