import { apiClient, unwrap } from "@/lib/api";
import type { AuthUser, BrandProfilePayload, CreatorProfilePayload } from "@/types";

export const profileService = {
  getProfile: async (): Promise<AuthUser> => {
    const { data } = await apiClient.get("/api/profile");
    return unwrap<AuthUser>(data);
  },
  updateProfile: async (body: BrandProfilePayload | CreatorProfilePayload): Promise<any> => {
    const { data } = await apiClient.patch("/api/profile", body);
    return unwrap(data);
  },
};
