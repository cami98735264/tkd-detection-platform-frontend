import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ReactNode } from "react";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/ForgotPassword";
import Register from "./pages/Register";

import Home from "./pages/Home";
import About from "./pages/About";
import Test from "./pages/Test";

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

        {/* Dashboard con layout y subrutas */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="test" element={<Test />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Redirección inicial */}
        <Route path="/" element={<Navigate to="/login" />} />

        {/* Recuperación / registro */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/register" element={<Register />} />

        {/* 404 global */}
        <Route path="*" element={<NotFound />} />

      </Routes>
    </BrowserRouter>
  );
}