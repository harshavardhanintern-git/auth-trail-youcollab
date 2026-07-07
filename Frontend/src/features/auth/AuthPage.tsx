import { ArrowRight, Loader2 } from "lucide-react";
import { useSignIn, useSignUp } from "@clerk/clerk-react";
import { userService } from "@/services/user";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/common/label";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Logo } from "@/components/ui/logo";
import { useAuthStore, type Role, type AuthUser } from "@/stores/authStore";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  mode: "login" | "register";
}

const clerkErrorMessage = (err: unknown, fallback: string) => {
  const e = err as { errors?: Array<{ longMessage?: string; message?: string }>; message?: string };
  return e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message || e?.message || fallback;
};

const destFor = (user: AuthUser) =>
  !user.isOnboarded
    ? user.role === "BRAND" ? "/onboarding/brand" : "/onboarding/influencer"
    : user.role === "BRAND" ? "/dashboard/brand" : "/dashboard/influencer";

export default function AuthPage({ mode }: Props) {
  const [params] = useSearchParams();
  const initialRole = (params.get("role") as Role) || "INFLUENCER";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<Role>(initialRole);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { setUser } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { isLoaded: signInLoaded, signIn, setActive: setActiveSignIn } = useSignIn();
  const { isLoaded: signUpLoaded, signUp } = useSignUp();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        if (!signInLoaded || !signIn) throw new Error("Authentication is still loading. Try again.");

        const result = await signIn.create({ identifier: email, password });
        if (result.status !== "complete") throw new Error("Additional verification is required. Please try again.");

        await setActiveSignIn({ session: result.createdSessionId });

        // Sync the Clerk identity with the app database (auto-creates the
        // user record on first login) and route by role/onboarding state.
        const me = await userService.fetchMe();
        if (!me) throw new Error("Auth failed");
        setUser(me);
        if (!me.role) {
          navigate("/auth/callback");
        } else {
          navigate(destFor(me));
        }
      } else {
        if (password !== confirmPassword) {
          toast({ variant: "destructive", title: "Passwords mismatch", description: "Password and Confirm Password do not match." });
          setLoading(false);
          return;
        }
        if (!signUpLoaded || !signUp) throw new Error("Authentication is still loading. Try again.");

        // Create the Clerk account with the selected role stored in metadata.
        await signUp.create({
          emailAddress: email,
          password,
          unsafeMetadata: { role, fullName: name },
        });

        // Attach the display name when the Clerk instance supports name fields.
        const [firstName, ...rest] = name.trim().split(/\s+/);
        try {
          await signUp.update({ firstName, lastName: rest.join(" ") || undefined });
        } catch {
          /* name fields disabled on this Clerk instance — metadata holds it */
        }

        // Email verification via 6-digit code.
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

        toast({
          title: "OTP Code Sent! ✉️",
          description: "Please check your inbox for a 6-digit verification code.",
        });
        navigate(`/verify-otp?email=${encodeURIComponent(email)}`);
      }
    } catch (err) {
      const msg = clerkErrorMessage(err, "Something went wrong");
      toast({ variant: "destructive", title: mode === "login" ? "Login failed" : "Sign up failed", description: msg });
    } finally {
      setLoading(false);
    }
  };

  const continueWithGoogle = async () => {
    setGoogleLoading(true);
    try {
      if (mode === "register") {
        if (!signUpLoaded || !signUp) throw new Error("Authentication is still loading. Try again.");
        await signUp.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: "/sso-callback",
          redirectUrlComplete: `/auth/callback?role=${role}`,
          unsafeMetadata: { role },
        });
      } else {
        if (!signInLoaded || !signIn) throw new Error("Authentication is still loading. Try again.");
        await signIn.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/auth/callback",
        });
      }
    } catch (err) {
      setGoogleLoading(false);
      toast({ variant: "destructive", title: "Google sign-in failed", description: clerkErrorMessage(err, "Could not start Google sign-in.") });
    }
  };

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
          <Link
            to={mode === "login" ? "/register" : "/login"}
            className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {mode === "login" ? "Create account" : "Log in"}
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[440px] flex-col px-4 pt-16 pb-20">
        <div className="border border-border rounded-md p-8 space-y-6 bg-background">
          {/* Brand block */}
          <div className="flex flex-col items-start gap-2">
            <div className="flex items-center gap-2">
              <Logo className="h-7 w-7 rounded-sm" />
              <span className="text-sm font-semibold tracking-tight text-foreground">You Collab</span>
            </div>
            <h1 className="text-[22px] font-semibold tracking-tight leading-tight">
              {mode === "login" ? "Sign in to your workspace" : "Create your account"}
            </h1>
            <p className="text-[13px] text-muted-foreground">
              {mode === "login" ? "Welcome back. Pick up where you left off." : "Pick your side. Start collaborating."}
            </p>
          </div>

          {/* Role selector */}
          {mode === "register" && (
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
          )}

          {/* Form */}
          <form className="space-y-3" onSubmit={submit}>
            {mode === "register" && (
              <div className="space-y-1">
                <Label htmlFor="name" className="text-[12px]">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={role === "BRAND" ? "e.g. Koregaon Coffee Co." : "e.g. Aarav Sharma"}
                  className="h-9 text-[13px] rounded-sm"
                />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="email" className="text-[12px]">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-9 text-[13px] rounded-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password" className="text-[12px]">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-9 text-[13px] rounded-sm"
              />
              {mode === "login" && (
                <div className="flex justify-end">
                  <Link to="/forgot-password" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                    Forgot password?
                  </Link>
                </div>
              )}
            </div>
            {mode === "register" && (
              <div className="space-y-1">
                <Label htmlFor="confirmPassword" className="text-[12px]">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-9 text-[13px] rounded-sm"
                />
              </div>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-9 text-[13px] rounded-sm gap-1.5"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (
                <>{mode === "login" ? "Sign in" : "Create account"} <ArrowRight className="h-3.5 w-3.5" /></>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Google Sign-In */}
          <button
            type="button"
            onClick={continueWithGoogle}
            disabled={googleLoading}
            className="w-full h-9 text-[13px] rounded-sm border border-border bg-background text-foreground hover:bg-foreground/5 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {googleLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {/* Footer link */}
          <p className="text-[11px] text-muted-foreground text-left pt-2 border-t border-border">
            {mode === "login" ? (
              <>New here? <Link to="/register" className="text-foreground hover:underline">Create an account</Link></>
            ) : (
              <>Already a member? <Link to="/login" className="text-foreground hover:underline">Sign in</Link></>
            )}
          </p>
        </div>

        <p className="text-[11px] text-muted-foreground text-center mt-6">
          © {new Date().getFullYear()} YouCollab
        </p>
      </main>
    </div>
  );
}
