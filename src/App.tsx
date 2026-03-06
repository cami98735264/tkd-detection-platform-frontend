import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { Toaster } from "sonner";

import Login from "./features/auth/pages/Login";
//import Home from "./features/dashboard/pages/Home";
import About from "./features/dashboard/pages/About";
import Test from "./features/dashboard/pages/Test";
import NotFound from "./components/common/NotFound";
import ForgotPassword from "./features/auth/pages/ForgotPassword";
import Register from "./features/auth/pages/Register";
import Profile from "./features/auth/pages/Profile";

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
          <Route path="perfil" element={<Profile />} />

        {/* Dashboard con layout y subrutas */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
//            </ProtectedRoute>
          }
        >
//                    <Route path="perfil" element={<Profile />} /> {/*  AQUÍ */}

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