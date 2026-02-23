import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ReactNode } from "react";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/ForgotPassword";
import Register from "./pages/Register";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const isAuth = localStorage.getItem("auth") === "true";

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Login */}
        <Route path="/login" element={<Login />} />

        {/* Dashboard protegido con subrutas */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Redirección inicial */}
        <Route path="/" element={<Navigate to="/login" />} />

        {/* 404 global */}
        <Route path="*" element={<NotFound />} />

		<Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/register" element={<Register />} />

      </Routes>
    </BrowserRouter>
  );
}