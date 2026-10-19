import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import NotFound from "@/components/common/NotFound";
import GuestRoute from "@/features/auth/components/GuestRoute";
import ProtectedRoute from "@/features/auth/components/ProtectedRoute";
import RoleRoute from "@/features/auth/components/RoleRoute";
import AcceptInvitation from "@/features/auth/pages/AcceptInvitation";
import ConfirmEmailChange from "@/features/auth/pages/ConfirmEmailChange";
import ForgotPassword from "@/features/auth/pages/ForgotPassword";
import Login from "@/features/auth/pages/Login";
import ResetPassword from "@/features/auth/pages/ResetPassword";
import VerifyEmail from "@/features/auth/pages/VerifyEmail";
import DashboardLayout from "@/features/dashboard/layout/DashboardLayout";

import { dashboardRoutes, type RouteGuard } from "./routes";

function Guarded({ guard, children }: { guard: RouteGuard; children: ReactNode }) {
  return "module" in guard ? (
    <RoleRoute module={guard.module} action={guard.action}>
      {children}
    </RoleRoute>
  ) : (
    <RoleRoute allowedRoles={guard.roles}>{children}</RoleRoute>
  );
}

export default function AppRouter() {
  return (
    <Routes>
      {/* Auth */}
      <Route
        path="/login"
        element={
          <GuestRoute>
            <Login />
          </GuestRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <GuestRoute>
            <ForgotPassword />
          </GuestRoute>
        }
      />
      <Route
        path="/reset-password"
        element={
          <GuestRoute>
            <ResetPassword />
          </GuestRoute>
        }
      />
      <Route
        path="/accept-invitation"
        element={
          <GuestRoute>
            <AcceptInvitation />
          </GuestRoute>
        }
      />
      {/* Auth-agnostic: the link works whether or not the user is logged in */}
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/confirm-email-change" element={<ConfirmEmailChange />} />

      {/* Dashboard: authenticated layout; every child is role-guarded */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {dashboardRoutes.map(({ path, element, guard }) => {
          const guarded = <Guarded guard={guard}>{element}</Guarded>;
          return path === "" ? (
            <Route key="index" index element={guarded} />
          ) : (
            <Route key={path} path={path} element={guarded} />
          );
        })}
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* 404 global */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
