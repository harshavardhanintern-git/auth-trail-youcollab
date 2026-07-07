import { apiClient, unwrap } from "@/lib/api";

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

export const notificationsService = {
  list: async (): Promise<Notification[]> => {
    const { data } = await apiClient.get("/api/notifications");
    return unwrap<Notification[]>(data);
  },
  unreadCount: async (): Promise<number> => {
    const { data } = await apiClient.get("/api/notifications/unread-count");
    return unwrap<{ count: number }>(data).count;
  },
  markRead: async (id: string) => {
    const { data } = await apiClient.patch(`/api/notifications/${id}/read`);
    return unwrap<Notification>(data);
  },
  markAllRead: async () => {
    const { data } = await apiClient.patch("/api/notifications/read");
    return unwrap(data);
  },
};
