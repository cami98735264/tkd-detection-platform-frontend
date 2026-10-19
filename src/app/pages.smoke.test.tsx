// Smoke test: every routed dashboard page mounts for every role allowed to open
// it, against an API that answers with empty data. Catches crashes from
// refactors (lazy loading, component splits) and gives baseline coverage.
import { render, screen, waitFor } from "@testing-library/react";
import { Suspense } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { rolesFor, type RoleName } from "@/config/permissions";
import { useAuthStore } from "@/features/auth/store/authStore";
import type { AuthUser } from "@/types/entities";

const h = vi.hoisted(() => ({ requests: [] as string[] }));

/** Shape-tolerant empty responses for the endpoints pages read on mount. */
function emptyResponseFor(url: string): unknown {
  const path = url.split("?")[0];
  if (/\/(charts|summary)\/?$/.test(path)) {
    return {
      belt_distribution: [],
      category_distribution: [],
      enrollment_trend: [],
      attendance_trend: [],
      attendance_by_status: [],
      evaluation_trend: [],
      total_sessions: 0,
      present_sessions: 0,
      late_sessions: 0,
      absent_sessions: 0,
      attendance_rate: 0,
    };
  }
  if (/\/stats\/?$/.test(path)) {
    return {
      total_deportistas: 0,
      total_programas: 0,
      total_inscripciones: 0,
      asistencia_mes: 0,
      total_evaluaciones: 0,
      total_usuarios: 0,
    };
  }
  if (
    /\/(parent\/children|enrollments\/me|technical-evaluation\/(consent|sessions)|trusted-devices)\/?$/.test(
      path,
    )
  ) {
    return [];
  }
  if (/\/auth\/2fa\/status\/?$/.test(path)) {
    return { success: true, data: { enabled: false, recovery_codes_remaining: 0 }, error: null };
  }
  if (/\/(athlete\/me|profile)\/?$/.test(path)) {
    return { id: 1, full_name: "Ana", date_of_birth: "2000-01-01", email: "a@x.co" };
  }
  return { count: 0, next: null, previous: null, results: [] };
}

vi.mock("@/lib/http", () => {
  const reply = (url: string) => {
    h.requests.push(url);
    return Promise.resolve(emptyResponseFor(url));
  };
  return {
    http: {
      get: (url: string) => reply(url),
      post: (url: string) => reply(url),
      put: (url: string) => reply(url),
      patch: (url: string) => reply(url),
      delete: (url: string) => reply(url),
      getBlob: vi.fn(),
    },
    axiosInstance: {
      defaults: {},
      get: (url: string) => reply(url).then((data) => ({ data })),
    },
  };
});
vi.mock("@/features/realtime", () => ({
  useRealtime: () => ({ status: "closed", reconnectNonce: 0 }),
  useRealtimeEvent: () => {},
  RealtimeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { FeedbackProvider } from "@/feedback/FeedbackProvider";

import { dashboardRoutes } from "./routes";

beforeAll(() => {
  // Browser APIs jsdom lacks but Radix/ScrollReveal/charts use.
  const g = globalThis as Record<string, unknown>;
  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  g.ResizeObserver ??= NoopObserver;
  g.IntersectionObserver ??= NoopObserver;
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterAll(() => vi.restoreAllMocks());

beforeEach(() => {
  h.requests.length = 0;
});

function signIn(role: RoleName) {
  useAuthStore.setState({
    status: "ready",
    isAuthenticated: true,
    user: {
      id: 1,
      email: "u@x.co",
      full_name: "Usuario Prueba",
      role,
      is_staff: role === "administrator",
      email_verified: true,
      pending_email: null,
      has_2fa: false,
    } as AuthUser,
  });
}

const cases = dashboardRoutes.flatMap((route) => {
  const roles =
    "module" in route.guard ? rolesFor(route.guard.module, route.guard.action) : route.guard.roles;
  return roles.map((role) => [route.path || "(home)", role, route] as const);
});

describe("dashboard pages mount", () => {
  it.each(cases)("%s as %s", async (_label, role, route) => {
    signIn(role);
    const path = `/dashboard/${route.path.replace(":programId", "1")}`;
    render(
      <MemoryRouter initialEntries={[path]}>
        <FeedbackProvider>
          <Suspense fallback={<p>loading-chunk</p>}>
            <Routes>
              <Route path="/dashboard">
                {route.path === "" ? (
                  <Route index element={route.element} />
                ) : (
                  <Route path={route.path} element={route.element} />
                )}
              </Route>
            </Routes>
          </Suspense>
        </FeedbackProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.queryByText("loading-chunk")).not.toBeInTheDocument(), {
      timeout: 5000,
    });
    // Let mount effects settle (requests resolve on the next ticks); a page
    // crash would surface as an uncaught error and fail the test.
    await new Promise((r) => setTimeout(r, 0));
  });
});
