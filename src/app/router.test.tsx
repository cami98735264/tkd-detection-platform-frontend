import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/features/auth/store/authStore";
import type { AuthUser } from "@/types/entities";

// Lightweight stand-ins: the router logic is under test, not the pages.
vi.mock("./routes", () => ({
  dashboardRoutes: [
    { path: "", element: <p>home page</p>, guard: { module: "dashboard" } },
    { path: "reportes", element: <p>reports page</p>, guard: { module: "reports" } },
    {
      path: "evaluacion-tecnica",
      element: <p>tech eval page</p>,
      guard: { module: "technical-evaluation" },
    },
    {
      path: "deportista/mis-programas",
      element: <p>my programs page</p>,
      guard: { roles: ["sportsman"] },
    },
  ],
}));
vi.mock("@/features/dashboard/layout/DashboardLayout", () => ({
  default: () => (
    <div>
      layout
      <Outlet />
    </div>
  ),
}));
vi.mock("@/features/auth/pages/Login", () => ({ default: () => <p>login page</p> }));
vi.mock("@/components/common/NotFound", () => ({ default: () => <p>not found page</p> }));

import AppRouter from "./router";

function signIn(role: AuthUser["role"] | null) {
  useAuthStore.setState(
    role
      ? {
          status: "ready",
          isAuthenticated: true,
          user: { id: 1, email: "u@x.co", full_name: "U", role } as AuthUser,
        }
      : { status: "ready", isAuthenticated: false, user: null },
  );
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRouter />
    </MemoryRouter>,
  );
}

describe("AppRouter guards", () => {
  beforeEach(() => signIn(null));

  it("sends anonymous users to /login", () => {
    renderAt("/dashboard/reportes");
    expect(screen.getByText("login page")).toBeInTheDocument();
  });

  it("lets an administrator open an admin module page", () => {
    signIn("administrator");
    renderAt("/dashboard/reportes");
    expect(screen.getByText("reports page")).toBeInTheDocument();
  });

  it("redirects a sportsman away from an admin page to the dashboard home", () => {
    signIn("sportsman");
    renderAt("/dashboard/reportes");
    expect(screen.queryByText("reports page")).not.toBeInTheDocument();
    expect(screen.getByText("home page")).toBeInTheDocument();
  });

  it("follows the matrix for technical evaluation (sportsman yes, admin no)", () => {
    signIn("sportsman");
    const { unmount } = renderAt("/dashboard/evaluacion-tecnica");
    expect(screen.getByText("tech eval page")).toBeInTheDocument();
    unmount();

    signIn("administrator");
    renderAt("/dashboard/evaluacion-tecnica");
    expect(screen.queryByText("tech eval page")).not.toBeInTheDocument();
    expect(screen.getByText("home page")).toBeInTheDocument();
  });

  it("enforces explicit role lists for role-specific pages", () => {
    signIn("parent");
    renderAt("/dashboard/deportista/mis-programas");
    expect(screen.queryByText("my programs page")).not.toBeInTheDocument();
    expect(screen.getByText("home page")).toBeInTheDocument();
  });

  it("no longer exposes the FeedbackLab demo", () => {
    signIn("administrator");
    renderAt("/dashboard/feedback-lab");
    expect(screen.getByText("not found page")).toBeInTheDocument();
  });

  it("renders nothing while the session check is still running", () => {
    useAuthStore.setState({ status: "initializing", isAuthenticated: false, user: null });
    const { container } = renderAt("/dashboard/reportes");
    expect(container).toBeEmptyDOMElement();
  });
});
