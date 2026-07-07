import { useClerk } from "@clerk/clerk-react";
import { LayoutGrid, Compass, FileText, User, Settings, LogOut, PlusSquare, MessageSquare, Briefcase, Users } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "@/components/ui/logo";
import { useAuthStore } from "@/stores/authStore";

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const { signOut } = useClerk();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

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

  const isBrand = user.role === "BRAND";

  // Menu items based on role
  const menuItems = isBrand
    ? [
        {
          label: "Dashboard",
          icon: LayoutGrid,
          path: "/dashboard/brand",
          active: location.pathname === "/dashboard/brand" && (!location.search.includes("tab=") || location.search.includes("tab=dashboard")),
        },
        {
          label: "Post Gig",
          icon: PlusSquare,
          path: "/gigs/new",
          active: location.pathname === "/gigs/new",
        },
        {
          label: "My Gigs",
          icon: Briefcase,
          path: "/dashboard/brand?tab=gigs",
          active: location.pathname === "/dashboard/brand" && location.search.includes("tab=gigs"),
        },
        {
          label: "Applications",
          icon: Users,
          path: "/dashboard/brand?tab=applications",
          active: location.pathname === "/dashboard/brand" && location.search.includes("tab=applications"),
        },
        {
          label: "Messages",
          icon: MessageSquare,
          path: "/dashboard/brand?tab=messages",
          active: location.pathname === "/dashboard/brand" && location.search.includes("tab=messages"),
        },
        {
          label: "Profile",
          icon: User,
          path: "/profile/brand",
          active: location.pathname === "/profile/brand",
        },
        {
          label: "Settings",
          icon: Settings,
          path: "/settings",
          active: location.pathname === "/settings",
        },
      ]
    : [
        {
          label: "Dashboard",
          icon: LayoutGrid,
          path: "/dashboard/influencer",
          active: location.pathname === "/dashboard/influencer" && !location.search.includes("tab=pitches"),
        },
        {
          label: "Browse Gigs",
          icon: Compass,
          path: "/marketplace",
          active: location.pathname === "/marketplace" || location.pathname.startsWith("/gigs/"),
        },
        {
          label: "My Applications",
          icon: FileText,
          path: "/dashboard/influencer?tab=pitches",
          active: location.search.includes("tab=pitches"),
        },
        {
          label: "Profile",
          icon: User,
          path: "/profile/creator",
          active: location.pathname === "/profile/creator",
        },
        {
          label: "Settings",
          icon: Settings,
          path: "/settings",
          active: location.pathname === "/settings",
        },
      ];

  // Get user initials
  const getInitials = (name: string = "") => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2) || "U";
  };

  return (
    <aside className="w-64 border-r border-border bg-[#0B0D17] flex flex-col h-screen shrink-0 text-foreground">
      {/* Brand Header */}
      <div className="p-6 border-b border-border/40">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Logo className="h-8 w-8 rounded-sm" />
          <span className="text-sm font-semibold tracking-tight">You Collab</span>
          <span className="ml-2 border border-border px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground rounded-sm">
            Pune
          </span>
        </Link>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => (
          <Link
            key={item.label}
            to={item.path}
            className={`flex items-center gap-3 px-3 py-2 text-xs font-medium uppercase tracking-wider transition-colors rounded-md ${
              item.active
                ? "bg-zinc-800/80 text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-zinc-800/30"
            }`}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-border/40 flex items-center justify-between gap-3 bg-[#080A10]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold text-xs shrink-0">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover rounded-full" />
            ) : (
              getInitials(user.name)
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold truncate leading-tight text-foreground">{user.name || "User"}</p>
            <p className="text-[10px] text-muted-foreground truncate leading-none mt-0.5">{user.role}</p>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-zinc-800/30 transition-colors rounded-sm"
          title="Sign out"
        >
          <LogOut className="h-4.5 w-4.5" />
        </button>
      </div>
    </aside>
  );
}
