import type { ReactNode } from "react";

import { lazyPage } from "./lazyPage";

import type { Action, Module, RoleName } from "@/config/permissions";

// Route-level code splitting: every page is its own chunk, so FullCalendar,
// jsPDF and MediaPipe are only downloaded by the pages that use them.
const Profile = lazyPage(() => import("@/features/auth/pages/Profile"));
const Home = lazyPage(() => import("@/features/dashboard/pages/Home"));
const AthletesPage = lazyPage(() => import("@/features/athletes/pages/AthletesPage"));
const AthleteDetailPage = lazyPage(() => import("@/features/athletes/pages/AthleteDetailPage"));
const MyDocumentsPage = lazyPage(
  () => import("@/features/athlete-documents/pages/MyDocumentsPage"),
);
const ParentDocumentsPage = lazyPage(
  () => import("@/features/athlete-documents/pages/ParentDocumentsPage"),
);
const AttendancePage = lazyPage(() => import("@/features/attendance/pages/AttendancePage"));
const AttendanceRegisterPage = lazyPage(
  () => import("@/features/attendance/pages/AttendanceRegisterPage"),
);
const CompetitionCategoriesPage = lazyPage(
  () => import("@/features/categories/pages/CategoriesPage"),
);
const EnrollmentsPage = lazyPage(() => import("@/features/enrollments/pages/EnrollmentsPage"));
const MyEnrollmentPage = lazyPage(() => import("@/features/enrollments/pages/MyEnrollmentPage"));
const EvaluationsPage = lazyPage(() => import("@/features/evaluations/pages/EvaluationsPage"));
const ParentEvaluationsPage = lazyPage(
  () => import("@/features/evaluations/pages/ParentEvaluationsPage"),
);
const SportsmanEvaluationsPage = lazyPage(
  () => import("@/features/evaluations/pages/SportsmanEvaluationsPage"),
);
const HelpPage = lazyPage(() => import("@/features/help/pages/HelpPage"));
const InventoryPage = lazyPage(() => import("@/features/inventory/pages/InventoryPage"));
const ItemsPage = lazyPage(() => import("@/features/inventory/pages/ItemsPage"));
const KickHistoryPage = lazyPage(() => import("@/features/kick-history/pages/KickHistoryPage"));
const ParentKickHistoryPage = lazyPage(
  () => import("@/features/kick-history/pages/ParentKickHistoryPage"),
);
const MeetingsPage = lazyPage(() => import("@/features/meetings/pages/MeetingsPage"));
const ParentAthletesPage = lazyPage(() => import("@/features/parent/pages/ParentAthletesPage"));
const EditionsPage = lazyPage(() => import("@/features/programs/pages/EditionsPage"));
const MyProgramsPage = lazyPage(() => import("@/features/programs/pages/MyProgramsPage"));
const ProgramsPage = lazyPage(() => import("@/features/programs/pages/ProgramsPage"));
const ReportsPage = lazyPage(() => import("@/features/reports/pages/ReportsPage"));
const StatisticsPage = lazyPage(() => import("@/features/reports/pages/StatisticsPage"));
const TechnicalEvaluationPage = lazyPage(
  () => import("@/features/technical-evaluation/pages/TechnicalEvaluationPage"),
);
const MyTrainingsPage = lazyPage(() => import("@/features/trainings/pages/MyTrainingsPage"));
const TrainingsPage = lazyPage(() => import("@/features/trainings/pages/TrainingsPage"));
const UsersPage = lazyPage(() => import("@/features/users/pages/UsersPage"));
// Listado 1 — Req 6/6.1 (promotions), 7 (gamification), 8 (poomsae).
const PromotionsAdminPage = lazyPage(
  () => import("@/features/promotions/pages/PromotionsAdminPage"),
);
const MyDiplomasPage = lazyPage(() => import("@/features/promotions/pages/MyDiplomasPage"));
const ProgressPage = lazyPage(() => import("@/features/gamification/pages/ProgressPage"));
const LeaderboardPage = lazyPage(() => import("@/features/gamification/pages/LeaderboardPage"));
const ChallengesAdminPage = lazyPage(
  () => import("@/features/gamification/pages/ChallengesAdminPage"),
);
const PoomsaeCatalogPage = lazyPage(() => import("@/features/poomsae/pages/PoomsaeCatalogPage"));
const PoomsaeDetailPage = lazyPage(() => import("@/features/poomsae/pages/PoomsaeDetailPage"));
// Official club data for generated documents (Addendum B.2).
const ClubProfilePage = lazyPage(() => import("@/features/club/pages/ClubProfilePage"));

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
const EVERYONE: RouteGuard = { roles: ["sportsman", "parent", "administrator"] };

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

  // Athlete documents, enrollment certificates and CV (listado 1, req 2/4/5).
  { path: "deportistas/:athleteId", element: <AthleteDetailPage />, guard: ADMIN },
  {
    path: "deportista/documentos",
    element: <MyDocumentsPage />,
    guard: { roles: ["sportsman"] },
  },
  {
    path: "acudiente/documentos",
    element: <ParentDocumentsPage />,
    guard: { roles: ["parent"] },
  },
  // Belt promotions & diplomas (Req 6 + 6.1).
  { path: "ascensos", element: <PromotionsAdminPage />, guard: ADMIN },
  {
    path: "mis-diplomas",
    element: <MyDiplomasPage />,
    guard: { roles: ["sportsman", "parent"] },
  },
  // Gamification (Req 7).
  { path: "progreso", element: <ProgressPage />, guard: EVERYONE },
  { path: "clasificacion", element: <LeaderboardPage />, guard: EVERYONE },
  { path: "retos", element: <ChallengesAdminPage />, guard: ADMIN },
  // Poomsae (Req 8).
  { path: "poomsae", element: <PoomsaeCatalogPage />, guard: EVERYONE },
  { path: "poomsae/:id", element: <PoomsaeDetailPage />, guard: EVERYONE },
  // Club profile + legal representative signature (Addendum B.7).
  { path: "club", element: <ClubProfilePage />, guard: ADMIN },
];
