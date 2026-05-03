import {
  BarChart3,
  BookOpen,
  Calendar,
  Camera,
  CheckCircle,
  ClipboardCheck,
  ClipboardList,
  Dumbbell,
  HelpCircle,
  Package,
  Settings,
  Trophy,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { RoleName } from "@/config/permissions";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** When set, the active match is exact only (avoids parent matching child paths). */
  end?: boolean;
}

export interface NavGroup {
  /** Optional section heading shown above the items. */
  heading?: string;
  items: NavItem[];
}

const sharedFooter: NavGroup = {
  items: [
    { to: "/dashboard/ayuda", label: "Ayuda", icon: HelpCircle },
    { to: "/dashboard/profile", label: "Mi perfil", icon: User },
  ],
};

export const navConfig: Record<RoleName, NavGroup[]> = {
  administrator: [
    {
      heading: "Operación",
      items: [
        { to: "/dashboard", label: "Resumen", icon: BarChart3, end: true },
        { to: "/dashboard/deportistas", label: "Deportistas", icon: Users },
        { to: "/dashboard/programas", label: "Programas", icon: BookOpen },
        { to: "/dashboard/inscripcion", label: "Inscripción", icon: ClipboardList },
        { to: "/dashboard/evaluacion", label: "Evaluación", icon: CheckCircle },
        { to: "/dashboard/entrenamientos", label: "Entrenamientos", icon: Dumbbell },
        { to: "/dashboard/reuniones", label: "Reuniones", icon: Calendar },
      ],
    },
    {
      heading: "Asistencia",
      items: [
        { to: "/dashboard/asistencia", label: "Historial", icon: ClipboardCheck, end: true },
        { to: "/dashboard/asistencia/registrar", label: "Registrar", icon: ClipboardCheck },
      ],
    },
    {
      heading: "Administración",
      items: [
        { to: "/dashboard/usuarios", label: "Usuarios", icon: Settings },
        { to: "/dashboard/acudientes", label: "Acudientes", icon: Users },
        { to: "/dashboard/inventario", label: "Inventario", icon: Package, end: true },
        { to: "/dashboard/inventario/tipos", label: "Ítems", icon: Package },
        { to: "/dashboard/categorias-competencia", label: "Categorías", icon: Trophy },
        { to: "/dashboard/reportes", label: "Reportes", icon: BarChart3 },
      ],
    },
    sharedFooter,
  ],
  sportsman: [
    {
      heading: "Mi entrenamiento",
      items: [
        { to: "/dashboard/deportista", label: "Mi panel", icon: BarChart3, end: true },
        { to: "/dashboard/deportista/mis-programas", label: "Mis programas", icon: BookOpen },
        { to: "/dashboard/deportista/mi-inscripcion", label: "Mi inscripción", icon: ClipboardList },
        { to: "/dashboard/deportista/entrenamientos", label: "Entrenamientos", icon: Dumbbell },
      ],
    },
    {
      heading: "Seguimiento",
      items: [
        { to: "/dashboard/deportista/mis-evaluaciones", label: "Mis evaluaciones", icon: CheckCircle },
        { to: "/dashboard/asistencia", label: "Mi asistencia", icon: ClipboardCheck },
        { to: "/dashboard/reuniones", label: "Reuniones", icon: Calendar },
        { to: "/dashboard/evaluacion-tecnica", label: "Evaluación técnica", icon: Camera },
      ],
    },
    sharedFooter,
  ],
  parent: [
    {
      heading: "Mi hijo/a",
      items: [
        { to: "/dashboard/deportistas", label: "Deportistas", icon: Users },
        { to: "/dashboard/programas", label: "Programas", icon: BookOpen },
        { to: "/dashboard/inscripcion", label: "Inscripciones", icon: ClipboardList },
      ],
    },
    {
      heading: "Seguimiento",
      items: [
        { to: "/dashboard/acudiente/mis-hijos/evaluaciones", label: "Evaluaciones", icon: CheckCircle },
        { to: "/dashboard/asistencia", label: "Asistencia", icon: ClipboardCheck },
        { to: "/dashboard/reuniones", label: "Confirmar reuniones", icon: Calendar },
        { to: "/dashboard/evaluacion-tecnica", label: "Evaluación técnica", icon: Camera },
      ],
    },
    sharedFooter,
  ],
};

/** Flatten all groups into a single label-by-path map for breadcrumbs. */
export function buildLabelMap(role: RoleName): Map<string, string> {
  const out = new Map<string, string>();
  for (const group of navConfig[role]) {
    for (const item of group.items) out.set(item.to, item.label);
  }
  // Routes that may not appear in nav but still need a friendly label
  out.set("/dashboard", "Inicio");
  out.set("/dashboard/profile", "Mi perfil");
  out.set("/dashboard/ayuda", "Ayuda");
  return out;
}
