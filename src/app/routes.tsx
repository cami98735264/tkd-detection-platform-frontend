import type { ReactNode } from "react";

import type { Action, Module, RoleName } from "@/config/permissions";
import Profile from "@/features/auth/pages/Profile";
import Home from "@/features/dashboard/pages/Home";

import AthletesPage from "@/features/athletes/pages/AthletesPage";
import AttendancePage from "@/features/attendance/pages/AttendancePage";
import AttendanceRegisterPage from "@/features/attendance/pages/AttendanceRegisterPage";
import CompetitionCategoriesPage from "@/features/categories/pages/CategoriesPage";
import EnrollmentsPage from "@/features/enrollments/pages/EnrollmentsPage";
import MyEnrollmentPage from "@/features/enrollments/pages/MyEnrollmentPage";
import EvaluationsPage from "@/features/evaluations/pages/EvaluationsPage";
import ParentEvaluationsPage from "@/features/evaluations/pages/ParentEvaluationsPage";
import SportsmanEvaluationsPage from "@/features/evaluations/pages/SportsmanEvaluationsPage";
import HelpPage from "@/features/help/pages/HelpPage";
import InventoryPage from "@/features/inventory/pages/InventoryPage";
import ItemsPage from "@/features/inventory/pages/ItemsPage";
import KickHistoryPage from "@/features/kick-history/pages/KickHistoryPage";
import ParentKickHistoryPage from "@/features/kick-history/pages/ParentKickHistoryPage";
import MeetingsPage from "@/features/meetings/pages/MeetingsPage";
import ParentAthletesPage from "@/features/parent/pages/ParentAthletesPage";
import EditionsPage from "@/features/programs/pages/EditionsPage";
import MyProgramsPage from "@/features/programs/pages/MyProgramsPage";
import ProgramsPage from "@/features/programs/pages/ProgramsPage";
import ReportsPage from "@/features/reports/pages/ReportsPage";
import StatisticsPage from "@/features/reports/pages/StatisticsPage";
import TechnicalEvaluationPage from "@/features/technical-evaluation/pages/TechnicalEvaluationPage";
import MyTrainingsPage from "@/features/trainings/pages/MyTrainingsPage";
import TrainingsPage from "@/features/trainings/pages/TrainingsPage";
import UsersPage from "@/features/users/pages/UsersPage";

/**
 * Who may open a dashboard route. Module pages take their roles from the
 * permissions matrix (src/config/permissions.ts); role-specific page variants
 * (an athlete's own evaluations, a parent's children…) list roles explicitly.
 */
export type RouteGuard = { module: Module; action?: Action } | { roles: readonly RoleName[] };

export interface DashboardRoute {
  /** Path relative to /dashboard ("" = index). */
  path: string;
  element: ReactNode;
  guard: RouteGuard;
}

const ADMIN: RouteGuard = { roles: ["administrator"] };

/** Every page under /dashboard — each one carries a guard (see router tests). */
export const dashboardRoutes: DashboardRoute[] = [
  { path: "", element: <Home />, guard: { module: "dashboard" } },
  { path: "profile", element: <Profile />, guard: { module: "profile" } },
  { path: "ayuda", element: <HelpPage />, guard: { module: "help" } },

  { path: "deportistas", element: <AthletesPage />, guard: { module: "athletes" } },
  { path: "programas", element: <ProgramsPage />, guard: { module: "programs" } },
  {
    path: "programas/:programId/ediciones",
    element: <EditionsPage />,
    guard: { module: "programs" },
  },
  { path: "inscripcion", element: <EnrollmentsPage />, guard: { module: "enrollments" } },
  { path: "entrenamientos", element: <TrainingsPage />, guard: { module: "trainings" } },
  { path: "reuniones", element: <MeetingsPage />, guard: { module: "meetings" } },
  { path: "asistencia", element: <AttendancePage />, guard: { module: "attendance" } },
  {
    path: "asistencia/registrar",
    element: <AttendanceRegisterPage />,
    guard: { module: "attendance", action: "create" },
  },
  {
    path: "evaluacion-tecnica",
    element: <TechnicalEvaluationPage />,
    guard: { module: "technical-evaluation" },
  },
  {
    path: "categorias-competencia",
    element: <CompetitionCategoriesPage />,
    guard: { module: "competition-categories" },
  },
  { path: "reportes", element: <ReportsPage />, guard: { module: "reports" } },
  {
    path: "reportes/estadisticas",
    element: <StatisticsPage />,
    guard: { module: "reports" },
  },
  { path: "usuarios", element: <UsersPage />, guard: { module: "users" } },
  { path: "inventario", element: <InventoryPage />, guard: { module: "inventory" } },
  { path: "inventario/tipos", element: <ItemsPage />, guard: { module: "inventory" } },

  // Role-specific variants of a module page.
  { path: "evaluacion", element: <EvaluationsPage />, guard: ADMIN },
  { path: "acudientes", element: <ParentAthletesPage />, guard: ADMIN },
  {
    path: "deportista/mis-evaluaciones",
    element: <SportsmanEvaluationsPage />,
    guard: { roles: ["sportsman"] },
  },
  {
    path: "acudiente/mis-hijos/evaluaciones",
    element: <ParentEvaluationsPage />,
    guard: { roles: ["parent"] },
  },
  {
    path: "deportista/historial-patadas",
    element: <KickHistoryPage />,
    guard: { roles: ["sportsman"] },
  },
  {
    path: "acudiente/historial-patadas",
    element: <ParentKickHistoryPage />,
    guard: { roles: ["parent"] },
  },
  {
    path: "deportista/mis-programas",
    element: <MyProgramsPage />,
    guard: { roles: ["sportsman"] },
  },
  {
    path: "deportista/mi-inscripcion",
    element: <MyEnrollmentPage />,
    guard: { roles: ["sportsman"] },
  },
  {
    path: "deportista/entrenamientos",
    element: <MyTrainingsPage />,
    guard: { roles: ["sportsman"] },
  },
];
