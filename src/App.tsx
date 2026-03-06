import { lazy, Suspense } from "react";
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
import { SkeletonDashboard } from "@/components/ui/skeleton";
import { AccessDenied } from "@/components/ui/AccessDenied";

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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 1000 * 60 * 60 * 24, // 24 hours – keeps cached data available for offline use
      networkMode: 'offlineFirst', // serve cache instantly, revalidate in background
    },
  },
});

// Simple localStorage-based query cache persistence for offline resilience
const CACHE_KEY = 'sl-query-cache';
const CACHE_MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours

// Restore cache on startup
try {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const { timestamp, data } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_MAX_AGE && data) {
      // Hydrate each cached query into the query client
      for (const entry of data) {
        if (entry.queryKey && entry.state?.data !== undefined) {
          queryClient.setQueryData(entry.queryKey, entry.state.data);
        }
      }
    } else {
      localStorage.removeItem(CACHE_KEY);
    }
  }
} catch {
  // Ignore corrupt cache
  localStorage.removeItem(CACHE_KEY);
}

// Persist cache periodically
let persistTimer: ReturnType<typeof setTimeout>;
const persistCache = () => {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      const cache = queryClient.getQueryCache().getAll();
      const data = cache
        .filter(q => {
          const key = q.queryKey[0];
          // Skip auth/session queries for security
          if (typeof key === 'string' && ['auth', 'session', 'profile'].includes(key)) return false;
          return q.state.status === 'success' && q.state.data !== undefined;
        })
        .map(q => ({ queryKey: q.queryKey, state: { data: q.state.data } }));
      localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
    } catch {
      // Storage full or error — silently ignore
    }
  }, 2000);
};

queryClient.getQueryCache().subscribe(persistCache);

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
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="/mentor-nda" element={<ProtectedRoute><MentorNda /></ProtectedRoute>} />
        <Route path="/claim-startup" element={<ProtectedRoute><ClaimStartup /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/my-workspaces" replace />} />
        <Route path="/my-workspaces" element={<ProtectedRoute><MyWorkspaces /></ProtectedRoute>} />
        <Route path="/workspace/:id" element={<ProtectedRoute><WorkspaceDetail /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/mentors" element={<ProtectedRoute><Mentors /></ProtectedRoute>} />
        <Route path="/consultor-tools" element={<ProtectedRoute><ConsultorTools /></ProtectedRoute>} />
        <Route path="/workspace/:workspaceId/value-prop" element={<ProtectedRoute><ValuePropWizardPage /></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
        <Route path="/integrations-setup" element={<Navigate to="/settings" replace />} />
        <Route path="/documents" element={<ProtectedRoute staffOnly><Documents /></ProtectedRoute>} />
        <Route path="/resources" element={<ProtectedRoute><Resources /></ProtectedRoute>} />
        <Route path="/help" element={<ProtectedRoute><HelpGlossary /></ProtectedRoute>} />
        <Route path="/guide" element={<ProtectedRoute><QuickGuide /></ProtectedRoute>} />
        <Route path="/crm" element={<ProtectedRoute staffOnly><CRM /></ProtectedRoute>} />
        <Route path="/ecosystem" element={<ProtectedRoute><Ecosystem /></ProtectedRoute>} />
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
