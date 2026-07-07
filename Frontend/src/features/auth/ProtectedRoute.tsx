import { Navigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useAuthStore } from "@/stores/authStore";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user, hydrated } = useAuthStore();

  if (!isLoaded || !hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) return <Navigate to="/login" replace />;

  // Signed in with Clerk but the app profile is incomplete (e.g. role not
  // selected yet after a Google sign-up) — finish setup first.
  if (!user || !user.role) return <Navigate to="/auth/callback" replace />;

  return <>{children}</>;
}
