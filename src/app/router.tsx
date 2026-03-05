import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "@/features/auth/components/ProtectedRoute";
import GuestRoute from "@/features/auth/components/GuestRoute";
import Login from "@/features/auth/pages/Login";
import Register from "@/features/auth/pages/Register";
import ForgotPassword from "@/features/auth/pages/ForgotPassword";

import DashboardLayout from "@/features/dashboard/layout/DashboardLayout";
import Home from "@/features/dashboard/pages/Home";
import About from "@/features/dashboard/pages/About";
import Test from "@/features/dashboard/pages/Test";

import FeedbackLab from "@/feedback/FeedbackLab";
import NotFound from "@/components/common/NotFound";

export default function AppRouter() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

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
        <Route path="about" element={<About />} />
        <Route path="test" element={<Test />} />
        <Route path="feedback-lab" element={<FeedbackLab />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* 404 global */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
