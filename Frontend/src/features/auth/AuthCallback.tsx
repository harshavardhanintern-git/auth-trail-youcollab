import { ArrowRight, Loader2 } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { userService } from "@/services/user";
import { Button } from "@/components/common/button";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Logo } from "@/components/ui/logo";
import { useAuthStore, type Role, type AuthUser } from "@/stores/authStore";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";

const destFor = (user: AuthUser) =>
  !user.isOnboarded
    ? user.role === "BRAND" ? "/onboarding/brand" : "/onboarding/influencer"
    : user.role === "BRAND" ? "/dashboard/brand" : "/dashboard/influencer";

const normalizeRole = (value: unknown): Role | null => {
  if (typeof value !== "string") return null;
  const upper = value.trim().toUpperCase();
  if (upper === "CREATOR") return "INFLUENCER";
  return upper === "BRAND" || upper === "INFLUENCER" ? (upper as Role) : null;
};

/**
 * Post-authentication landing page.
 *
 * Reached after Google OAuth (and whenever a signed-in user has no role
 * yet). Resolves the account's role — from the query string, Clerk
 * metadata, or the database — syncs it to the backend, and redirects into
 * the app. If no role can be determined (first Google sign-in from the
 * login screen), it shows the same Creator/Brand selector used at signup.
 */
export default function AuthCallback() {
  const [params] = useSearchParams();
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { setUser } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [needsRole, setNeedsRole] = useState(false);
  const [role, setRole] = useState<Role>("INFLUENCER");
  const [saving, setSaving] = useState(false);
  const startedRef = useRef(false);

  const finish = async (resolvedRole: Role) => {
    const me = await userService.syncRole(resolvedRole);
    if (!me) throw new Error("Could not finish setting up your account.");
    setUser(me);
    navigate(destFor(me), { replace: true });
  };

  useEffect(() => {
    if (!isLoaded || startedRef.current) return;
    startedRef.current = true;

    if (!isSignedIn) {
      navigate("/login", { replace: true });
      return;
    }

    (async () => {
      try {
        // 1. Role passed through the OAuth redirect (register screen)
        // 2. Role already stored in Clerk metadata
        const fromQuery = normalizeRole(params.get("role"));
        const fromMeta =
          normalizeRole(clerkUser?.publicMetadata?.role) ||
          normalizeRole(clerkUser?.unsafeMetadata?.role);

        if (fromQuery || fromMeta) {
          await finish((fromQuery || fromMeta) as Role);
          return;
        }

        // 3. Role already known in the application database (returning user)
        const me = await userService.fetchMe();
        if (me?.role) {
          setUser(me);
          navigate(destFor(me), { replace: true });
          return;
        }

        // 4. Brand-new Google account with no role — ask once.
        setNeedsRole(true);
      } catch {
        toast({ variant: "destructive", title: "Sign-in failed", description: "Could not finish setting up your account. Please try again." });
        navigate("/login", { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  const submitRole = async () => {
    setSaving(true);
    try {
      if (clerkUser) {
        // Persist the selection in Clerk metadata so it travels with the identity.
        await clerkUser.update({ unsafeMetadata: { ...clerkUser.unsafeMetadata, role } });
      }
      await finish(role);
    } catch {
      toast({ variant: "destructive", title: "Could not save role", description: "Please try again." });
      setSaving(false);
    }
  };

  if (!needsRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Logo className="h-8 w-8 rounded-sm" />
            <span className="text-sm font-semibold tracking-tight">You Collab</span>
            <span className="ml-2 hidden sm:inline-block border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground rounded-sm">Pune</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[440px] flex-col px-4 pt-16 pb-20">
        <div className="border border-border rounded-md p-8 space-y-6 bg-background">
          <div className="flex flex-col items-start gap-2">
            <div className="flex items-center gap-2">
              <Logo className="h-7 w-7 rounded-sm" />
              <span className="text-sm font-semibold tracking-tight text-foreground">You Collab</span>
            </div>
            <h1 className="text-[22px] font-semibold tracking-tight leading-tight">
              One last step
            </h1>
            <p className="text-[13px] text-muted-foreground">
              Pick your side. Start collaborating.
            </p>
          </div>

          {/* Role selector — same control as the signup screen */}
          <div className="grid grid-cols-2 gap-0 border border-border rounded-sm overflow-hidden">
            {(["INFLUENCER", "BRAND"] as Role[]).map((r, i) => (
              <button
                type="button"
                key={r}
                onClick={() => setRole(r)}
                className={`px-3 py-2 text-[12px] font-medium uppercase tracking-[0.06em] transition-colors ${
                  role === r
                    ? "bg-foreground text-background"
                    : "bg-background text-muted-foreground hover:text-foreground"
                } ${i === 0 ? "border-r border-border" : ""}`}
              >
                {r === "INFLUENCER" ? "Creator" : "Brand"}
              </button>
            ))}
          </div>

          <Button
            type="button"
            onClick={submitRole}
            disabled={saving}
            className="w-full h-9 text-[13px] rounded-sm gap-1.5"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (
              <>Continue <ArrowRight className="h-3.5 w-3.5" /></>
            )}
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground text-center mt-6">
          © {new Date().getFullYear()} YouCollab
        </p>
      </main>
    </div>
  );
}
