import { ArrowRight, Loader2 } from "lucide-react";
import { useSignIn } from "@clerk/clerk-react";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/common/label";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/ui/logo";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isLoaded, signIn } = useSignIn();

  const clerkErrorMessage = (err: unknown, fallback: string) => {
    const e = err as { errors?: Array<{ longMessage?: string; message?: string }>; message?: string };
    return e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message || e?.message || fallback;
  };

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) {
      toast({ variant: "destructive", title: "Please wait", description: "Authentication is still loading. Try again." });
      return;
    }
    setLoading(true);
    try {
      // Clerk sends a 6-digit password reset code to the email.
      await signIn.create({ strategy: "reset_password_email_code", identifier: email });
      toast({ title: "OTP Code Sent! ✉️", description: "If an account exists, a 6-digit password reset code has been sent." });
      setStep(2);
    } catch (err) {
      const msg = clerkErrorMessage(err, "Request failed. Try again.");
      toast({ variant: "destructive", title: "Request failed", description: msg });
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ variant: "destructive", title: "Passwords mismatch", description: "Password and Confirm Password do not match." });
      return;
    }
    if (otp.length !== 6) {
      toast({ variant: "destructive", title: "Invalid code", description: "The verification code must be exactly 6 digits." });
      return;
    }

    if (!isLoaded || !signIn) {
      toast({ variant: "destructive", title: "Please wait", description: "Authentication is still loading. Try again." });
      return;
    }
    setLoading(true);
    try {
      // Verify the code and set the new password in a single Clerk call.
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: otp,
        password,
      });
      if (result.status !== "complete" && result.status !== "needs_second_factor") {
        throw new Error("Password reset failed. Try again.");
      }
      toast({ title: "Password Reset Successful! ✨", description: "You can now sign in with your new password." });
      navigate("/login");
    } catch (err) {
      const msg = clerkErrorMessage(err, "Password reset failed. Try again.");
      toast({ variant: "destructive", title: "Reset failed", description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar — matches auth page */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Logo className="h-8 w-8 rounded-sm" />
            <span className="text-sm font-semibold tracking-tight">You Collab</span>
            <span className="ml-2 hidden sm:inline-block border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground rounded-sm">Pune</span>
          </Link>
          <Link
            to="/login"
            className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to login
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
              Reset your password
            </h1>
            <p className="text-[13px] text-muted-foreground">
              {step === 1 ? "Enter your email and we'll send a 6-digit code." : `Enter the code sent to ${email} and your new password.`}
            </p>
          </div>

          {step === 1 ? (
            <form className="space-y-3" onSubmit={submitEmail}>
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
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-9 text-[13px] rounded-sm gap-1.5"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (
                  <>Send reset code <ArrowRight className="h-3.5 w-3.5" /></>
                )}
              </Button>
            </form>
          ) : (
            <form className="space-y-3" onSubmit={submitReset}>
              <div className="space-y-1">
                <Label htmlFor="otp" className="text-[12px]">Verification Code (OTP)</Label>
                <Input
                  id="otp"
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit code"
                  className="h-9 text-[13px] rounded-sm font-bold tracking-[0.2em] text-center"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password" className="text-[12px]">New Password</Label>
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
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirmPassword" className="text-[12px]">Confirm New Password</Label>
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
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-9 text-[13px] rounded-sm gap-1.5 bg-gradient-brand text-primary-foreground border-0 shadow-md hover:opacity-95"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (
                  <>Reset Password <ArrowRight className="h-3.5 w-3.5" /></>
                )}
              </Button>
              <div className="flex justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Change email address
                </button>
              </div>
            </form>
          )}

          {/* Footer link */}
          <p className="text-[11px] text-muted-foreground text-left pt-2 border-t border-border">
            Remember your password? <Link to="/login" className="text-foreground hover:underline">Sign in</Link>
          </p>
        </div>

        <p className="text-[11px] text-muted-foreground text-center mt-6">
          © {new Date().getFullYear()} YouCollab
        </p>
      </main>
    </div>
  );
}
