import { useClerk } from "@clerk/clerk-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "@/components/ui/logo";
import { LogOut } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

export function Navbar() {
  const { user, logout } = useAuthStore();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      // End the Clerk session (all auth is handled by Clerk).
      await signOut();
    } catch (err) {
      console.warn("Clerk sign-out failed, clearing local session:", err);
    } finally {
      logout();
      navigate("/");
    }
  };

  const dashboardHref =
    user?.role === "BRAND" ? "/dashboard/brand" : "/dashboard/influencer";

  return (
    <header className="sticky top-0 z-50 w-full bg-background border-b border-border">
      <div className="mx-auto flex h-[56px] max-w-[1200px] items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Logo className="h-8 w-8 rounded-sm" />
          <span className="text-sm font-semibold tracking-tight">You Collab</span>
          <span className="ml-2 hidden sm:inline-block border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground rounded-sm">Pune</span>
        </Link>

        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Link to={dashboardHref} className="text-[13px] text-foreground/70 hover:text-foreground transition-colors h-8 px-3 flex items-center">
                Dashboard
              </Link>
              {user.role !== "BRAND" && (
                <Link to="/marketplace" className="text-[13px] text-foreground/70 hover:text-foreground transition-colors h-8 px-3 flex items-center">
                  Marketplace
                </Link>
              )}
              <Link to={user.role === "BRAND" ? "/profile/brand" : "/profile/creator"} className="text-[13px] text-foreground/70 hover:text-foreground transition-colors h-8 px-3 flex items-center">
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="h-8 w-8 flex items-center justify-center text-foreground/70 hover:text-foreground transition-colors"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              {location.pathname !== "/login" && (
                <Link to="/login" className="text-[13px] text-foreground/70 hover:text-foreground transition-colors h-8 px-3 flex items-center">
                  Log in
                </Link>
              )}
              {location.pathname !== "/register" && (
                <Link to="/register" className="text-[13px] h-8 px-3 border border-foreground/40 text-foreground hover:bg-foreground hover:text-background transition-colors flex items-center">
                  Sign up
                </Link>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
