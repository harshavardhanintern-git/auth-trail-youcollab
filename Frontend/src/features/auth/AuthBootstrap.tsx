import { useAuth } from "@clerk/clerk-react";
import { setAuthTokenGetter } from "@/lib/api";
import { userService } from "@/services/user";
import { useAuthStore } from "@/stores/authStore";
import { useEffect } from "react";

/**
 * Bridges the Clerk session into the application.
 *
 * When the Clerk SDK loads:
 *   • registers Clerk's getToken with the API client so every request
 *     carries a Clerk session token
 *   • fetches the app profile from the backend (the users record is
 *     auto-created after the first successful login)
 *   • marks the store hydrated so route guards can render
 */
export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { setUser, setHydrated, hydrated } = useAuthStore();

  // Register the Clerk token getter as early as possible.
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;
    let mounted = true;

    (async () => {
      if (isSignedIn) {
        try {
          const me = await userService.fetchMe();
          if (mounted && me) setUser(me);
        } catch {
          // Profile fetch failed (e.g. backend offline) — guards will
          // still allow Clerk-authenticated navigation to recover.
        }
      } else {
        if (mounted) setUser(null);
      }
      if (mounted) setHydrated(true);
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || !hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  return <>{children}</>;
}
