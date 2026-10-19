import { Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import NotFound from "@/components/common/NotFound";
import GuestRoute from "@/features/auth/components/GuestRoute";
import ProtectedRoute from "@/features/auth/components/ProtectedRoute";
import RoleRoute from "@/features/auth/components/RoleRoute";
import DashboardLayout from "@/features/dashboard/layout/DashboardLayout";

import { lazyPage } from "./lazyPage";
import { dashboardRoutes, type RouteGuard } from "./routes";

const AcceptInvitation = lazyPage(() => import("@/features/auth/pages/AcceptInvitation"));
const ConfirmEmailChange = lazyPage(() => import("@/features/auth/pages/ConfirmEmailChange"));
const ForgotPassword = lazyPage(() => import("@/features/auth/pages/ForgotPassword"));
const Login = lazyPage(() => import("@/features/auth/pages/Login"));
const ResetPassword = lazyPage(() => import("@/features/auth/pages/ResetPassword"));
const VerifyEmail = lazyPage(() => import("@/features/auth/pages/VerifyEmail"));

/** Shown while a route's code chunk downloads. */
function PageFallback() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[40vh] items-center justify-center">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}

function Guarded({ guard, children }: { guard: RouteGuard; children: ReactNode }) {
  const page = <Suspense fallback={<PageFallback />}>{children}</Suspense>;
  return "module" in guard ? (
    <RoleRoute module={guard.module} action={guard.action}>
      {page}
    </RoleRoute>
  ) : (
    <RoleRoute allowedRoles={guard.roles}>{page}</RoleRoute>
  );
}

export default function AppRouter() {
  return (
    <Suspense fallback={<PageFallback />}>
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
    </Suspense>
  );
}
