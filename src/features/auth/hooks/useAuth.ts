// ---------------------------------------------------------------------------
// Auth hook — thin re-export of the Zustand auth store.
// ---------------------------------------------------------------------------
// Import `useAuthStore` for reactive component subscriptions.
// Use `useAuthStore.getState()` for one-off reads outside React (e.g. interceptors).
// ---------------------------------------------------------------------------

export { useAuthStore } from "@/features/auth/store/authStore";
