import { apiClient, unwrap } from "@/lib/api";
import type { AuthUser, Role } from "@/types";

/**
 * Backend identity bridge for the Clerk-authenticated user.
 *
 * Clerk handles authentication end-to-end. These endpoints only link the
 * Clerk identity to the application's database:
 *   • fetchMe  — returns the app profile (auto-created on first login)
 *   • syncRole — persists the selected role (Creator / Brand) into the
 *                database and Clerk metadata
 */
export const userService = {
  async fetchMe() {
    const { data } = await apiClient.get("/api/auth/me");
    const payload = unwrap<{ user: AuthUser }>(data);
    return payload?.user ?? null;
  },
  async syncRole(role: Role) {
    const { data } = await apiClient.post("/api/auth/sync", { role });
    const payload = unwrap<{ user: AuthUser }>(data);
    return payload?.user ?? null;
  },
};
