import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";

/**
 * Landing route for Clerk OAuth redirects (Google Sign-In).
 * Clerk completes the handshake here — including transferring between
 * sign-in and sign-up when needed — then forwards to /auth/callback.
 */
export default function SsoCallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl="/auth/callback"
        signUpForceRedirectUrl="/auth/callback"
      />
    </div>
  );
}
