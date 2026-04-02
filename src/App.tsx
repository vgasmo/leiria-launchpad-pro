import { lazy, Suspense } from "react";
import { useTranslation } from 'react-i18next';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SessionTimeoutWarning } from "@/components/auth/SessionTimeoutWarning";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { CommandPalette } from "@/components/command/CommandPalette";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { useMentorNdaStatus } from "@/hooks/useMentorNdaStatus";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { useFounderOnboardingState } from "@/hooks/useFounderOnboardingState";
import { SkeletonDashboard } from "@/components/ui/skeleton";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { queryClient } from "@/lib/queryClient";

// Eager: lightweight / critical-path pages
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import PendingApproval from "./pages/PendingApproval";
import SuspendedAccount from "./pages/SuspendedAccount";
import AcceptInvite from "./pages/AcceptInvite";

// Lazy: heavy page modules — only loaded when navigated to
const MyWorkspaces = lazy(() => import("./pages/MyWorkspaces"));
const WorkspaceDetail = lazy(() => import("./pages/WorkspaceDetail"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminDatarooms = lazy(() => import("./pages/AdminDatarooms"));
const ProgramSetupWizard = lazy(() => import("./pages/ProgramSetupWizard"));
const Settings = lazy(() => import("./pages/Settings"));
const Mentors = lazy(() => import("./pages/Mentors"));
const Search = lazy(() => import("./pages/Search"));
const SharedWorkspace = lazy(() => import("./pages/SharedWorkspace"));
const SharedDataroom = lazy(() => import("./pages/SharedDataroom"));
const MentorNda = lazy(() => import("./pages/MentorNda"));
const ConsultorTools = lazy(() => import("./pages/ConsultorTools"));
const ValuePropWizardPage = lazy(() => import("./pages/ValuePropWizardPage"));
const HelpGlossary = lazy(() => import("./pages/HelpGlossary"));
const QuickGuide = lazy(() => import("./pages/QuickGuide"));
const CRM = lazy(() => import("./pages/CRM"));
const CrmDiagnostics = lazy(() => import("./pages/CrmDiagnostics"));
const PublicBooking = lazy(() => import("./pages/PublicBooking"));
const AdminDataImport = lazy(() => import("./pages/AdminDataImport"));
const Ecosystem = lazy(() => import("./pages/Ecosystem"));
const Documents = lazy(() => import("./pages/Documents"));
const Resources = lazy(() => import("./pages/Resources"));
const StaffCockpit = lazy(() => import("./pages/StaffCockpit"));
const SystemSettings = lazy(() => import("./pages/SystemSettings"));
const ClaimStartup = lazy(() => import("./pages/ClaimStartup"));
const ResourceGuide = lazy(() => import("./pages/ResourceGuide"));
const ContractOnboarding = lazy(() => import("./pages/ContractOnboarding"));
const PublicContractSigning = lazy(() => import("./pages/PublicContractSigning"));
const PublicContractIntake = lazy(() => import("./pages/PublicContractIntake"));

function ProtectedRoute({ children, adminOnly = false, staffOnly = false }: { children: React.ReactNode; adminOnly?: boolean; staffOnly?: boolean }) {
  const { t } = useTranslation();
  const { user, isLoading, isAuthReady, isAdmin, isStaff, isAccountPending, isAccountSuspended } = useAuth();
  const { needsNda, isLoading: ndaLoading } = useMentorNdaStatus();
  const founderState = useFounderOnboardingState();
  const location = useLocation();

  if (isLoading || !isAuthReady || ndaLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
          <span className="animate-pulse text-muted-foreground text-sm">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isAccountSuspended) {
    return <Navigate to="/suspended" replace />;
  }

  if (isAccountPending && !isStaff) {
    return <Navigate to="/pending-approval" replace />;
  }

  if (needsNda && location.pathname !== '/mentor-nda') {
    return <Navigate to="/mentor-nda" replace />;
  }

  // Claim-first gate: founders without active workspace → /claim-startup
  const claimExemptPaths = ['/claim-startup', '/settings', '/my-workspaces'];
  if (
    !founderState.isLoading &&
    founderState.status !== 'not_founder' &&
    founderState.status !== 'staff_exempt' &&
    founderState.status !== 'has_active_workspace' &&
    !claimExemptPaths.includes(location.pathname)
  ) {
    return <Navigate to="/claim-startup" replace />;
  }

  if (staffOnly && !isStaff) {
    return <Navigate to="/my-workspaces" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/my-workspaces" replace />;
  }

  return (
    <>
      <SessionTimeoutWarning timeoutMs={8 * 60 * 60 * 1000} warningTimeMs={10 * 60 * 1000} />
      <CommandPalette />
      {children}
    </>
  );
}

function SuspenseFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-4xl">
        <SkeletonDashboard />
      </div>
    </div>
  );
}

function AppRoutes() {
  useVersionCheck();
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/pending-approval" element={<PendingApproval />} />
        <Route path="/suspended" element={<SuspendedAccount />} />
        <Route path="/share/:token" element={<SharedWorkspace />} />
        <Route path="/dataroom/shared/:token" element={<SharedDataroom />} />
        <Route path="/book/:token" element={<PublicBooking />} />
        <Route path="/contract-signing/:token" element={<PublicContractSigning />} />
        <Route path="/contract-intake/:token" element={<PublicContractIntake />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="/mentor-nda" element={<ProtectedRoute><MentorNda /></ProtectedRoute>} />
        <Route path="/claim-startup" element={<ProtectedRoute><ClaimStartup /></ProtectedRoute>} />
        <Route path="/contract-onboarding/:contractId" element={<ProtectedRoute><ContractOnboarding /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/my-workspaces" replace />} />
        <Route path="/my-workspaces" element={<ProtectedRoute><MyWorkspaces /></ProtectedRoute>} />
        <Route path="/workspace/:id" element={<ProtectedRoute><WorkspaceDetail /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/mentors" element={<ProtectedRoute><Mentors /></ProtectedRoute>} />
        <Route path="/consultor-tools" element={<ProtectedRoute staffOnly><ConsultorTools /></ProtectedRoute>} />
        <Route path="/workspace/:workspaceId/value-prop" element={<ProtectedRoute><ValuePropWizardPage /></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
        <Route path="/integrations-setup" element={<Navigate to="/settings" replace />} />
        <Route path="/documents" element={<ProtectedRoute staffOnly><Documents /></ProtectedRoute>} />
        <Route path="/resources" element={<ProtectedRoute><Resources /></ProtectedRoute>} />
        <Route path="/resources/guide/:id" element={<ProtectedRoute><ResourceGuide /></ProtectedRoute>} />
        <Route path="/help" element={<ProtectedRoute><HelpGlossary /></ProtectedRoute>} />
        <Route path="/guide" element={<ProtectedRoute><QuickGuide /></ProtectedRoute>} />
        <Route path="/crm" element={<ProtectedRoute staffOnly><CRM /></ProtectedRoute>} />
        <Route path="/ecosystem" element={<ProtectedRoute staffOnly><Ecosystem /></ProtectedRoute>} />
        <Route path="/admin/crm-diagnostics" element={<ProtectedRoute staffOnly><CrmDiagnostics /></ProtectedRoute>} />
        <Route path="/staff-cockpit" element={<ProtectedRoute staffOnly><StaffCockpit /></ProtectedRoute>} />
        <Route path="/system-settings" element={<ProtectedRoute adminOnly><SystemSettings /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute staffOnly><Admin /></ProtectedRoute>} />
        <Route path="/admin/datarooms" element={<ProtectedRoute staffOnly><AdminDatarooms /></ProtectedRoute>} />
        <Route path="/admin/data-import" element={<ProtectedRoute adminOnly><AdminDataImport /></ProtectedRoute>} />
        <Route path="/admin/programs/new" element={<ProtectedRoute adminOnly><ProgramSetupWizard /></ProtectedRoute>} />
        <Route path="/admin/programs/new/:draftId" element={<ProtectedRoute adminOnly><ProgramSetupWizard /></ProtectedRoute>} />
        <Route path="/admin/programs/:id/setup" element={<ProtectedRoute adminOnly><ProgramSetupWizard /></ProtectedRoute>} />
        <Route path="/admin/programs/:id/setup/:draftId" element={<ProtectedRoute adminOnly><ProgramSetupWizard /></ProtectedRoute>} />
        <Route path="/admin/*" element={<ProtectedRoute staffOnly><NotFound /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <AuthProvider>
              <ErrorBoundary>
                <AppRoutes />
              </ErrorBoundary>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
