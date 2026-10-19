// Production stand-in for ./mockBackend.ts. scripts/build-lib.mjs resolves
// "@/features/auth/mocks/mockBackend" to this file unless MOCK_AUTH=true, so
// the real API clients are always used and no mock data is bundled.
import type { MockBackend } from "./mockBackend";

export const mockBackend: MockBackend | null = null;
