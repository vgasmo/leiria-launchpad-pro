import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SessionTimeoutWarning } from "@/components/auth/SessionTimeoutWarning";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import Login from "./pages/Login";
import MyWorkspaces from "./pages/MyWorkspaces";
import WorkspaceDetail from "./pages/WorkspaceDetail";
import Admin from "./pages/Admin";
import ProgramSetupWizard from "./pages/ProgramSetupWizard";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Mentors from "./pages/Mentors";
import ResetPassword from "./pages/ResetPassword";
import Search from "./pages/Search";
import SharedWorkspace from "./pages/SharedWorkspace";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000, // 30 seconds
    },
  },
});

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, isLoading, isAuthReady, isAdmin } = useAuth();

  // P1: Wait for both auth check AND profile/roles to be fully loaded
  // This prevents flash of wrong content or premature redirects
  if (isLoading || !isAuthReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // P1: Only check admin after isAuthReady is true (roles are loaded)
  if (adminOnly && !isAdmin) {
    return <Navigate to="/my-workspaces" replace />;
  }

  return (
    <>
      <SessionTimeoutWarning timeoutMs={30 * 60 * 1000} warningTimeMs={5 * 60 * 1000} />
      {children}
    </>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/share/:token" element={<SharedWorkspace />} />
      <Route path="/" element={<Navigate to="/my-workspaces" replace />} />
      <Route path="/my-workspaces" element={<ProtectedRoute><MyWorkspaces /></ProtectedRoute>} />
      <Route path="/workspace/:id" element={<ProtectedRoute><WorkspaceDetail /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/mentors" element={<ProtectedRoute><Mentors /></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
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
