import { apiClient, unwrap } from "@/lib/api";
import type { Gig, CreateGigPayload } from "@/types";

export type { Gig, CreateGigPayload };

export const gigsService = {
  list: async (): Promise<Gig[]> => {
    const { data } = await apiClient.get("/api/gigs");
    const payload = unwrap<Gig[] | { gigs?: Gig[] }>(data);
    if (Array.isArray(payload)) return payload;
    return payload?.gigs ?? [];
  },
  get: async (id: string): Promise<Gig> => {
    const { data } = await apiClient.get(`/api/gigs/${id}`);
    return unwrap<Gig>(data);
  },
  create: async (body: CreateGigPayload): Promise<Gig> => {
    const { data } = await apiClient.post("/api/gigs", body);
    return unwrap<Gig>(data);
  },
  mine: async (): Promise<Gig[]> => {
    const { data } = await apiClient.get("/api/gigs/mine");
    const payload = unwrap<Gig[] | { gigs?: Gig[] }>(data);
    if (Array.isArray(payload)) return payload;
    return (payload as any)?.gigs ?? [];
  },
  update: async (id: string, body: Partial<CreateGigPayload> & { status?: string }): Promise<Gig> => {
    const { data } = await apiClient.patch(`/api/gigs/${id}`, body);
    return unwrap<Gig>(data);
  },
  remove: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/api/gigs/${id}/destroy`);
    return unwrap<{ message: string }>(data);
  },
  toggleStatus: async (id: string): Promise<Gig> => {
    const { data } = await apiClient.patch(`/api/gigs/${id}/toggle-status`);
    return unwrap<Gig>(data);
  },
};
