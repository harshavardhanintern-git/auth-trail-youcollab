import { apiClient, unwrap } from "@/lib/api";
import type { InfluencerOnboardingPayload, BrandOnboardingPayload } from "@/types";

export const onboardingService = {
  influencer: async (body: InfluencerOnboardingPayload) => {
    const { data } = await apiClient.post("/api/onboarding/influencer", body);
    return unwrap(data);
  },
  brand: async (body: BrandOnboardingPayload) => {
    const { data } = await apiClient.post("/api/onboarding/brand", body);
    return unwrap(data);
  },
};
