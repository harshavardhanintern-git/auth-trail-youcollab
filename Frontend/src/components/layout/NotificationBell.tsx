import { Popover, PopoverContent, PopoverTrigger } from "@/components/common/popover";
import { notificationsService, type Notification } from "@/services/notifications";
import { useAuthStore } from "@/stores/authStore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useState } from "react";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationBell() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: notificationsService.unreadCount,
    enabled: !!user,
    refetchInterval: 5000,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: notificationsService.list,
    enabled: !!user && open,
    refetchInterval: open ? 5000 : false,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsService.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: notificationsService.markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative h-8 w-8 flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-zinc-800/40 transition-colors shrink-0"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="w-[320px] p-0 bg-[#12141C] border-border">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <span className="text-[12px] font-semibold uppercase tracking-wider text-foreground">Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="text-[11px] text-primary hover:underline disabled:opacity-50"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-[360px] overflow-y-auto divide-y divide-border/40">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            notifications.map((n: Notification) => (
              <button
                key={n.id}
                onClick={() => !n.isRead && markRead.mutate(n.id)}
                className={`w-full text-left px-4 py-3 transition-colors hover:bg-white/[0.03] ${
                  !n.isRead ? "bg-primary/[0.04]" : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  {!n.isRead && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                  <div className={`min-w-0 ${n.isRead ? "pl-3.5" : ""}`}>
                    <p className="text-[12px] font-semibold text-foreground/90 truncate">{n.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
