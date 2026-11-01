import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/features/auth/store/authStore";
import type { AuthUser } from "@/types/entities";

const h = vi.hoisted(() => ({ leaderboard: vi.fn(), categories: vi.fn() }));
vi.mock("../api/gamificationApi", () => ({
  gamificationApi: { leaderboard: h.leaderboard, categories: h.categories },
}));

import { FeedbackProvider } from "@/feedback/FeedbackProvider";

import LeaderboardPage from "./LeaderboardPage";

describe("LeaderboardPage", () => {
  it("ranks the athlete's category and highlights the signed-in athlete", async () => {
    useAuthStore.setState({
      status: "ready",
      isAuthenticated: true,
      user: { id: 1, email: "a@x.co", full_name: "Ana", role: "sportsman" } as AuthUser,
    });
    h.leaderboard.mockResolvedValue({
      category: "cadete",
      period: "week",
      results: [
        {
          rank: 1,
          athlete: 7,
          athlete_name: "Luis",
          category: "cadete",
          xp: 300,
          level: 3,
          streak: 4,
          badges: 5,
          is_me: false,
        },
        {
          rank: 2,
          athlete: 3,
          athlete_name: "Ana",
          category: "cadete",
          xp: 120,
          level: 2,
          streak: 1,
          badges: 1,
          is_me: true,
        },
      ],
    });
    render(
      <FeedbackProvider>
        <LeaderboardPage />
      </FeedbackProvider>,
    );
    const me = (await screen.findByText("Tú")).closest("li")!;
    expect(me).toHaveAttribute("aria-current", "true");
    expect(me).toHaveTextContent("Ana");
    expect(screen.getByText(/categoría Cadetes/)).toBeInTheDocument();
    // Non-admins don't pick a category: the server scopes it.
    expect(h.leaderboard).toHaveBeenCalledWith({ period: "week", category: undefined });
    expect(h.categories).not.toHaveBeenCalled();
  });
});
