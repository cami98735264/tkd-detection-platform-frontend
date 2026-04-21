import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "@/features/auth/components/ProtectedRoute";
import GuestRoute from "@/features/auth/components/GuestRoute";
import RoleRoute from "@/features/auth/components/RoleRoute";
import Login from "@/features/auth/pages/Login";
import ForgotPassword from "@/features/auth/pages/ForgotPassword";

import DashboardLayout from "@/features/dashboard/layout/DashboardLayout";
import Home from "@/features/dashboard/pages/Home";
import Profile from "@/features/auth/pages/Profile";

import AthletesPage from "@/features/athletes/pages/AthletesPage";
import ProgramsPage from "@/features/programs/pages/ProgramsPage";
import EditionsPage from "@/features/programs/pages/EditionsPage";
import EnrollmentsPage from "@/features/enrollments/pages/EnrollmentsPage";
import EvaluationsPage from "@/features/evaluations/pages/EvaluationsPage";
import ReportsPage from "@/features/reports/pages/ReportsPage";
import CompetitionCategoriesPage from "@/features/categories/pages/CategoriesPage";
import RegistrationPage from "@/features/registration/pages/RegistrationPage";

import UsersPage from "@/features/users/pages/UsersPage";
import MeetingsPage from "@/features/meetings/pages/MeetingsPage";
import InventoryPage from "@/features/inventory/pages/InventoryPage";
import ItemsPage from "@/features/inventory/pages/ItemsPage";
import TrainingsPage from "@/features/trainings/pages/TrainingsPage";
import HelpPage from "@/features/help/pages/HelpPage";

import AttendancePage from "@/features/attendance/pages/AttendancePage";
import TechnicalEvaluationPage from "@/features/technical-evaluation/pages/TechnicalEvaluationPage";

import FeedbackLab from "@/feedback/FeedbackLab";
import NotFound from "@/components/common/NotFound";

export default function AppRouter() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />

      {/* Dashboard with layout and nested routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Home />} />
        <Route path="profile" element={<Profile />} />
        <Route path="deportistas" element={
          <RoleRoute allowedRoles={["sportsman", "administrator"]}><AthletesPage /></RoleRoute>
        } />
        <Route path="programas" element={
          <RoleRoute allowedRoles={["sportsman", "administrator"]}><ProgramsPage /></RoleRoute>
        } />
        <Route path="programas/:programId/ediciones" element={<EditionsPage />} />
        <Route path="inscripcion" element={
          <RoleRoute allowedRoles={["sportsman", "administrator"]}><EnrollmentsPage /></RoleRoute>
        } />
        <Route path="evaluacion" element={
          <RoleRoute allowedRoles={["sportsman", "administrator"]}><EvaluationsPage /></RoleRoute>
        } />
        <Route path="categorias-competencia" element={<CompetitionCategoriesPage />} />
        <Route path="reportes" element={
          <RoleRoute allowedRoles={["administrator"]}><ReportsPage /></RoleRoute>
        } />
        <Route path="usuarios" element={
          <RoleRoute allowedRoles={["administrator"]}><UsersPage /></RoleRoute>
        } />
        <Route path="reuniones" element={
          <RoleRoute allowedRoles={["parent", "sportsman", "administrator"]}><MeetingsPage /></RoleRoute>
        } />
        <Route path="inventario" element={
          <RoleRoute allowedRoles={["administrator"]}><InventoryPage /></RoleRoute>
        } />
        <Route path="inventario/tipos" element={
          <RoleRoute allowedRoles={["administrator"]}><ItemsPage /></RoleRoute>
        } />
        <Route path="entrenamientos" element={<TrainingsPage />} />
        <Route path="ayuda" element={<HelpPage />} />
        <Route path="asistencia" element={
          <RoleRoute allowedRoles={["parent", "sportsman", "administrator"]}><AttendancePage /></RoleRoute>
        } />
        <Route path="evaluacion-tecnica" element={
          <RoleRoute allowedRoles={["parent"]}><TechnicalEvaluationPage /></RoleRoute>
        } />
        <Route path="feedback-lab" element={<FeedbackLab />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public registration */}
      <Route path="/registro" element={<GuestRoute><RegistrationPage /></GuestRoute>} />

      {/* 404 global */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
