import { create } from "zustand";
import type { Role, AuthUser } from "@/types";

// Re-exported for existing consumers that import types from the store.
export type { Role, AuthUser };

/**
 * Application user state.
 *
 * Authentication itself (sessions, tokens, refresh) is fully handled by
 * Clerk. This store only mirrors the application profile fetched from the
 * backend (`/api/auth/me`) — role, onboarding status, display info.
 * It is hydrated by <AuthBootstrap /> whenever the Clerk session changes.
 */
interface AuthState {
  user: AuthUser | null;
  hydrated: boolean;
  setUser: (u: AuthUser | null) => void;
  setHydrated: (b: boolean) => void;
  patchUser: (patch: Partial<AuthUser>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  hydrated: false,
  setUser: (user) => set({ user }),
  setHydrated: (hydrated) => set({ hydrated }),
  patchUser: (patch) =>
    set((s) => ({ user: s.user ? { ...s.user, ...patch } : s.user })),
  logout: () => set({ user: null }),
}));
