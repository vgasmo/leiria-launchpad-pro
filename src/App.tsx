import { useTranslation } from 'react-i18next';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SessionTimeoutWarning } from "@/components/auth/SessionTimeoutWarning";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { CommandPalette } from "@/components/command/CommandPalette";
import { useMentorNdaStatus } from "@/hooks/useMentorNdaStatus";
import Login from "./pages/Login";
import MyWorkspaces from "./pages/MyWorkspaces";
import WorkspaceDetail from "./pages/WorkspaceDetail";
import Admin from "./pages/Admin";
import AdminDatarooms from "./pages/AdminDatarooms";
import ProgramSetupWizard from "./pages/ProgramSetupWizard";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Mentors from "./pages/Mentors";
import ResetPassword from "./pages/ResetPassword";
import Search from "./pages/Search";
import SharedWorkspace from "./pages/SharedWorkspace";
import SharedDataroom from "./pages/SharedDataroom";
import MentorNda from "./pages/MentorNda";
import ConsultorTools from "./pages/ConsultorTools";
import ValuePropWizardPage from "./pages/ValuePropWizardPage";
import IntegrationsSetup from "./pages/IntegrationsSetup";
import HelpGlossary from "./pages/HelpGlossary";
import QuickGuide from "./pages/QuickGuide";
import PendingApproval from "./pages/PendingApproval";
import SuspendedAccount from "./pages/SuspendedAccount";
import CRM from "./pages/CRM";
import CrmDiagnostics from "./pages/CrmDiagnostics";
import PublicBooking from "./pages/PublicBooking";
import AdminDataImport from "./pages/AdminDataImport";
import Ecosystem from "./pages/Ecosystem";
import AcceptInvite from "./pages/AcceptInvite";
import Documents from "./pages/Documents";
import Resources from "./pages/Resources";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000, // 30 seconds
    },
  },
});

function ProtectedRoute({ children, adminOnly = false, staffOnly = false }: { children: React.ReactNode; adminOnly?: boolean; staffOnly?: boolean }) {
  const { t } = useTranslation();
  const { user, isLoading, isAuthReady, isAdmin, isStaff, isAccountPending, isAccountSuspended } = useAuth();
  const { needsNda, isLoading: ndaLoading } = useMentorNdaStatus();
  const location = useLocation();

  // Wait for both auth check AND profile/roles to be fully loaded
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

  // Check if account is suspended (block all access, including admins)
  if (isAccountSuspended) {
    return <Navigate to="/suspended" replace />;
  }

  // Check if account is pending approval (non-staff users)
  if (isAccountPending && !isStaff) {
    return <Navigate to="/pending-approval" replace />;
  }

  // NDA gate for mentor_externo: redirect to /mentor-nda unless already there
  if (needsNda && location.pathname !== '/mentor-nda') {
    return <Navigate to="/mentor-nda" replace />;
  }

  // Staff-only routes (admin, consultor, backoffice)
  if (staffOnly && !isStaff) {
    return <Navigate to="/my-workspaces" replace />;
  }

  // Admin-only routes (strictly admin role)
  if (adminOnly && !isAdmin) {
    return <Navigate to="/my-workspaces" replace />;
  }

  return (
    <>
      <SessionTimeoutWarning timeoutMs={24 * 60 * 60 * 1000} warningTimeMs={10 * 60 * 1000} />
      <CommandPalette />
      {children}
    </>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/pending-approval" element={<PendingApproval />} />
      <Route path="/suspended" element={<SuspendedAccount />} />
      <Route path="/share/:token" element={<SharedWorkspace />} />
      <Route path="/dataroom/shared/:token" element={<SharedDataroom />} />
      <Route path="/book/:token" element={<PublicBooking />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/mentor-nda" element={<ProtectedRoute><MentorNda /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/my-workspaces" replace />} />
      <Route path="/my-workspaces" element={<ProtectedRoute><MyWorkspaces /></ProtectedRoute>} />
      <Route path="/workspace/:id" element={<ProtectedRoute><WorkspaceDetail /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/mentors" element={<ProtectedRoute><Mentors /></ProtectedRoute>} />
      <Route path="/consultor-tools" element={<ProtectedRoute><ConsultorTools /></ProtectedRoute>} />
      <Route path="/workspace/:workspaceId/value-prop" element={<ProtectedRoute><ValuePropWizardPage /></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
      <Route path="/integrations-setup" element={<ProtectedRoute><IntegrationsSetup /></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
      <Route path="/resources" element={<ProtectedRoute><Resources /></ProtectedRoute>} />
      <Route path="/help" element={<ProtectedRoute><HelpGlossary /></ProtectedRoute>} />
      <Route path="/guide" element={<ProtectedRoute><QuickGuide /></ProtectedRoute>} />
      <Route path="/crm" element={<ProtectedRoute staffOnly><CRM /></ProtectedRoute>} />
      <Route path="/ecosystem" element={<ProtectedRoute><Ecosystem /></ProtectedRoute>} />
      <Route path="/admin/crm-diagnostics" element={<ProtectedRoute staffOnly><CrmDiagnostics /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute staffOnly><Admin /></ProtectedRoute>} />
      <Route path="/admin/datarooms" element={<ProtectedRoute staffOnly><AdminDatarooms /></ProtectedRoute>} />
      <Route path="/admin/data-import" element={<ProtectedRoute adminOnly><AdminDataImport /></ProtectedRoute>} />
      <Route path="/admin/programs/new" element={<ProtectedRoute adminOnly><ProgramSetupWizard /></ProtectedRoute>} />
      <Route path="/admin/programs/new/:draftId" element={<ProtectedRoute adminOnly><ProgramSetupWizard /></ProtectedRoute>} />
      <Route path="/admin/programs/:id/setup" element={<ProtectedRoute adminOnly><ProgramSetupWizard /></ProtectedRoute>} />
      <Route path="/admin/programs/:id/setup/:draftId" element={<ProtectedRoute adminOnly><ProgramSetupWizard /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
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
