import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthBootstrap } from "@/features/auth/AuthBootstrap";
import { RoleRoute } from "@/features/auth/RoleRoute";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Landing from "@/features/marketplace/Landing";
import AuthPage from "@/features/auth/AuthPage";
import ForgotPassword from "@/features/auth/ForgotPassword";
import InfluencerOnboarding from "@/features/auth/InfluencerOnboarding";
import BrandOnboarding from "@/features/auth/BrandOnboarding";
import InfluencerDashboard from "@/features/dashboard/InfluencerDashboard";
import BrandDashboard from "@/features/dashboard/BrandDashboard";
import GigCreate from "@/features/gigs/GigCreate";
import GigEdit from "@/features/gigs/GigEdit";
import GigApplicants from "@/features/applications/GigApplicants";
import BrandProfile from "@/features/dashboard/BrandProfile";
import CreatorProfile from "@/features/dashboard/InfluencerProfile";
import Marketplace from "@/features/marketplace/Marketplace";
import GigDetail from "@/features/gigs/GigDetail";
import InstagramCallback from "@/features/auth/InstagramCallback";
import SsoCallback from "@/features/auth/SsoCallback";
import AuthCallback from "@/features/auth/AuthCallback";
import Settings from "@/features/dashboard/Settings";
import VerifyOtpPage from "@/features/auth/VerifyOtpPage";
import NotFound from "@/components/layout/NotFound";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthBootstrap>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<AuthPage mode="login" />} />
              <Route path="/register" element={<AuthPage mode="register" />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/verify-otp" element={<VerifyOtpPage />} />
              <Route path="/sso-callback" element={<SsoCallback />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/instagram/callback" element={<InstagramCallback />} />

              {/* Protected Sidebar Routes */}
              <Route element={<SidebarLayout />}>
                <Route path="/onboarding/influencer" element={
                  <RoleRoute role="INFLUENCER" allowUnonboarded><InfluencerOnboarding /></RoleRoute>
                } />
                <Route path="/onboarding/brand" element={
                  <RoleRoute role="BRAND" allowUnonboarded><BrandOnboarding /></RoleRoute>
                } />

                <Route path="/dashboard/influencer" element={
                  <RoleRoute role="INFLUENCER"><InfluencerDashboard /></RoleRoute>
                } />
                <Route path="/dashboard/brand" element={
                  <RoleRoute role="BRAND"><BrandDashboard /></RoleRoute>
                } />

                <Route path="/gigs/new" element={
                  <RoleRoute role="BRAND"><GigCreate /></RoleRoute>
                } />
                <Route path="/gigs/:id/edit" element={
                  <RoleRoute role="BRAND"><GigEdit /></RoleRoute>
                } />
                <Route path="/gigs/:id/applicants" element={
                  <RoleRoute role="BRAND"><GigApplicants /></RoleRoute>
                } />
                <Route path="/gigs/:id" element={
                  <ProtectedRoute><GigDetail /></ProtectedRoute>
                } />

                <Route path="/marketplace" element={
                  <ProtectedRoute><Marketplace /></ProtectedRoute>
                } />

                <Route path="/profile/brand" element={
                  <RoleRoute role="BRAND"><BrandProfile /></RoleRoute>
                } />
                <Route path="/profile/creator" element={
                  <RoleRoute role="INFLUENCER"><CreatorProfile /></RoleRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute><Settings /></ProtectedRoute>
                } />
              </Route>

              {/* Legacy redirects */}
              <Route path="/auth" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthBootstrap>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
