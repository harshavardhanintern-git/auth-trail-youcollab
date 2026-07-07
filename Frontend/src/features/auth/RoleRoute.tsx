import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useAuthStore, type Role } from "@/stores/authStore";

interface Props {
  children: React.ReactNode;
  role?: Role;
  allowUnonboarded?: boolean;
}

export function RoleRoute({ children, role, allowUnonboarded = false }: Props) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user, hydrated } = useAuthStore();
  const location = useLocation();

  if (!isLoaded || !hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) return <Navigate to="/login" replace state={{ from: location }} />;

  // Clerk session exists but the app profile / role isn't set up yet
  // (e.g. first Google sign-in) — complete setup before entering the app.
  if (!user || !user.role) return <Navigate to="/auth/callback" replace />;

  if (role && user.role !== role) {
    const dest = user.role === "BRAND" ? "/dashboard/brand" : "/dashboard/influencer";
    return <Navigate to={dest} replace />;
  }
  if (!user.isOnboarded && !allowUnonboarded) {
    const dest =
      user.role === "BRAND" ? "/onboarding/brand" : "/onboarding/influencer";
    if (location.pathname !== dest) return <Navigate to={dest} replace />;
  }
  if (user.isOnboarded && allowUnonboarded && location.pathname.startsWith("/onboarding")) {
    const dest = user.role === "BRAND" ? "/dashboard/brand" : "/dashboard/influencer";
    return <Navigate to={dest} replace />;
  }
  return <>{children}</>;
}
