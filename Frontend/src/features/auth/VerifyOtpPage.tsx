import { ArrowRight, Loader2, Mail } from "lucide-react";
import { useSignUp } from "@clerk/clerk-react";
import { userService } from "@/services/user";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/common/label";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Logo } from "@/components/ui/logo";
import { useAuthStore, type Role, type AuthUser } from "@/stores/authStore";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

const clerkErrorMessage = (err: unknown, fallback: string) => {
  const e = err as { errors?: Array<{ longMessage?: string; message?: string }>; message?: string };
  return e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message || e?.message || fallback;
};

const destFor = (user: AuthUser) =>
  !user.isOnboarded
    ? user.role === "BRAND" ? "/onboarding/brand" : "/onboarding/influencer"
    : user.role === "BRAND" ? "/dashboard/brand" : "/dashboard/influencer";

export default function VerifyOtpPage() {
  const [params] = useSearchParams();
  const email = params.get("email") || "";

  const [otpVals, setOtpVals] = useState<string[]>(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const { setUser } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { isLoaded, signUp, setActive } = useSignUp();

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const otp = otpVals.join("");

  // Autofocus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Timer countdown logic for Resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, "");
    if (!cleaned) {
      const nextVals = [...otpVals];
      nextVals[index] = "";
      setOtpVals(nextVals);
      return;
    }
    const nextVals = [...otpVals];
    nextVals[index] = cleaned[cleaned.length - 1];
    setOtpVals(nextVals);
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (otpVals[index]) {
        const nextVals = [...otpVals];
        nextVals[index] = "";
        setOtpVals(nextVals);
      } else if (index > 0) {
        const nextVals = [...otpVals];
        nextVals[index - 1] = "";
        setOtpVals(nextVals);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedText) {
      const nextVals = [...otpVals];
      pastedText.split("").forEach((char, i) => {
        nextVals[i] = char;
      });
      setOtpVals(nextVals);
      const focusIndex = Math.min(pastedText.length, 5);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const submitVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast({ variant: "destructive", title: "Invalid code length", description: "The verification code must be exactly 6 digits." });
      return;
    }
    if (!isLoaded || !signUp) {
      toast({ variant: "destructive", title: "Please wait", description: "Authentication is still loading. Try again." });
      return;
    }
    if (!signUp.emailAddress) {
      toast({ variant: "destructive", title: "Session expired", description: "Your signup session has expired. Please register again." });
      navigate("/register");
      return;
    }

    setLoading(true);
    try {
      // Verify the 6-digit email code with Clerk.
      const result = await signUp.attemptEmailAddressVerification({ code: otp });
      if (result.status !== "complete") throw new Error("Verification failed");

      // Activate the new Clerk session.
      await setActive({ session: result.createdSessionId });

      // Persist the role selected at signup (stored in Clerk metadata) into
      // the application database, creating the user record.
      const role = ((result.unsafeMetadata?.role as string) || "INFLUENCER").toUpperCase() as Role;
      const me = await userService.syncRole(role);
      if (!me) throw new Error("Verification failed");
      setUser(me);

      toast({ title: "Account verified successfully! ✨", description: "Welcome to YouCollab." });

      navigate(destFor(me));
    } catch (err) {
      const msg = clerkErrorMessage(err, "Verification failed. Try again.");
      toast({ variant: "destructive", title: "Verification failed", description: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    if (!isLoaded || !signUp || !signUp.emailAddress) {
      toast({ variant: "destructive", title: "Session expired", description: "Your signup session has expired. Please register again." });
      navigate("/register");
      return;
    }
    setResending(true);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      toast({
        title: "OTP Code Resent! ✉️",
        description: "A new 6-digit code has been sent to your email.",
      });
      setCountdown(60);
    } catch (err) {
      const msg = clerkErrorMessage(err, "Failed to resend code.");
      toast({ variant: "destructive", title: "Resend failed", description: msg });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Logo className="h-8 w-8 rounded-sm" />
            <span className="text-sm font-semibold tracking-tight">You Collab</span>
            <span className="ml-2 hidden sm:inline-block border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground rounded-sm">Pune</span>
          </Link>
          <Link to="/login" className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
            Log in
          </Link>
        </div>
      </header>

      {/* Main card */}
      <main className="mx-auto flex w-full max-w-[440px] flex-col px-4 pt-16 pb-20">
        <div className="border border-border rounded-md p-8 space-y-6 bg-background">

          <div className="flex flex-col items-start gap-2">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 mb-1">
              <Mail className="h-5 w-5" />
            </div>
            <h1 className="text-[22px] font-semibold tracking-tight leading-tight">
              Verify your email
            </h1>
            <p className="text-[13px] text-muted-foreground">
              We sent a 6-digit numeric verification code to{" "}
              <span className="font-semibold text-foreground">{email || "your email"}</span>.
            </p>
          </div>

          <form className="space-y-4" onSubmit={submitVerify}>
            <div className="space-y-1.5">
              <Label className="text-[12px] uppercase tracking-wider">Verification Code</Label>
              <div className="flex justify-between gap-2 pt-1">
                {Array(6).fill(0).map((_, idx) => (
                  <Input
                    key={idx}
                    type="text"
                    required
                    maxLength={1}
                    value={otpVals[idx]}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    className="h-11 w-11 text-center text-lg font-bold rounded-sm border-border bg-background focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full h-10 text-[13px] rounded-sm gap-1.5 bg-gradient-brand text-primary-foreground border-0 shadow-md hover:opacity-95"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>Verify Account <ArrowRight className="h-3.5 w-3.5" /></>
              )}
            </Button>
          </form>

          {/* Resend and countdown options */}
          <div className="pt-4 border-t border-border flex flex-col gap-2 items-center text-xs text-muted-foreground">
            {countdown > 0 ? (
              <p>Resend verification code in <span className="font-semibold text-foreground">{countdown}s</span></p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending}
                className="font-semibold text-foreground hover:underline focus:outline-none disabled:opacity-55"
              >
                {resending ? "Resending code..." : "Resend Verification Code"}
              </button>
            )}
            <Link to="/register" className="hover:underline mt-1 text-[11px]">
              Use a different email address
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
