import {
  Award,
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  Camera,
  CheckCircle,
  ClipboardCheck,
  ClipboardList,
  Dumbbell,
  FileSpreadsheet,
  FolderOpen,
  Footprints,
  HelpCircle,
  History,
  Medal,
  Package,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Target,
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

/** Listado 1 — promotions, gamification and poomsae (one group per role). */
const progressGroups: Record<RoleName, NavGroup> = {
  administrator: {
    heading: "Formación",
    items: [
      { to: "/dashboard/ascensos", label: "Ascensos de cinturón", icon: Award },
      { to: "/dashboard/poomsae", label: "Poomsae", icon: Footprints },
      { to: "/dashboard/retos", label: "Retos", icon: Target },
      { to: "/dashboard/clasificacion", label: "Clasificación", icon: Medal },
      { to: "/dashboard/progreso", label: "Progreso", icon: Sparkles },
    ],
  },
  sportsman: {
    heading: "Progreso",
    items: [
      { to: "/dashboard/progreso", label: "Mi progreso", icon: Sparkles },
      { to: "/dashboard/clasificacion", label: "Clasificación", icon: Medal },
      { to: "/dashboard/poomsae", label: "Poomsae", icon: Footprints },
      { to: "/dashboard/mis-diplomas", label: "Mis diplomas", icon: Award },
    ],
  },
  parent: {
    heading: "Progreso",
    items: [
      { to: "/dashboard/progreso", label: "Progreso de mis hijos", icon: Sparkles },
      { to: "/dashboard/clasificacion", label: "Clasificación", icon: Medal },
      { to: "/dashboard/poomsae", label: "Poomsae", icon: Footprints },
      { to: "/dashboard/mis-diplomas", label: "Diplomas de mis hijos", icon: Award },
    ],
  },
};

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
        {
          to: "/dashboard/categorias-competencia",
          label: "Categorías de competencia",
          icon: Trophy,
        },
        { to: "/dashboard/reportes", label: "Reportes", icon: FileSpreadsheet, end: true },
        { to: "/dashboard/reportes/estadisticas", label: "Estadísticas", icon: BarChart3 },
        { to: "/dashboard/club", label: "Datos del club", icon: Building2 },
        { to: "/dashboard/poomsae-admin", label: "Poomsae", icon: Footprints, end: true },
        {
          to: "/dashboard/poomsae-admin/calibracion",
          label: "Calibración de técnicas",
          icon: SlidersHorizontal,
        },
      ],
    },
    progressGroups.administrator,
    sharedFooter,
  ],
  sportsman: [
    {
      heading: "Mi entrenamiento",
      items: [
        { to: "/dashboard/deportista/mis-programas", label: "Mis programas", icon: BookOpen },
        {
          to: "/dashboard/deportista/mi-inscripcion",
          label: "Mi inscripción",
          icon: ClipboardList,
        },
        { to: "/dashboard/deportista/entrenamientos", label: "Entrenamientos", icon: Dumbbell },
        { to: "/dashboard/deportista/documentos", label: "Mis documentos", icon: FolderOpen },
      ],
    },
    {
      heading: "Seguimiento",
      items: [
        {
          to: "/dashboard/deportista/mis-evaluaciones",
          label: "Mis evaluaciones",
          icon: CheckCircle,
        },
        { to: "/dashboard/asistencia", label: "Mi asistencia", icon: ClipboardCheck },
        { to: "/dashboard/reuniones", label: "Reuniones", icon: Calendar },
        { to: "/dashboard/evaluacion-tecnica", label: "Evaluación técnica", icon: Camera },
        {
          to: "/dashboard/deportista/historial-patadas",
          label: "Historial de patadas",
          icon: History,
        },
      ],
    },
    progressGroups.sportsman,
    sharedFooter,
  ],
  parent: [
    {
      heading: "Mi hijo/a",
      items: [
        { to: "/dashboard/deportistas", label: "Deportistas", icon: Users },
        { to: "/dashboard/programas", label: "Programas", icon: BookOpen },
        { to: "/dashboard/inscripcion", label: "Inscripciones", icon: ClipboardList },
        { to: "/dashboard/acudiente/documentos", label: "Documentos", icon: FolderOpen },
      ],
    },
    {
      heading: "Seguimiento",
      items: [
        {
          to: "/dashboard/acudiente/mis-hijos/evaluaciones",
          label: "Evaluaciones",
          icon: CheckCircle,
        },
        { to: "/dashboard/asistencia", label: "Asistencia", icon: ClipboardCheck },
        { to: "/dashboard/reuniones", label: "Confirmar reuniones", icon: Calendar },
        { to: "/dashboard/evaluacion-tecnica", label: "Evaluación técnica", icon: Camera },
        {
          to: "/dashboard/acudiente/historial-patadas",
          label: "Historial de patadas",
          icon: History,
        },
      ],
    },
    progressGroups.parent,
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
