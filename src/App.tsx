import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserRoleProvider } from "@/contexts/UserRoleContext";
import { Loader2 } from "lucide-react";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const PendingApproval = lazy(() => import("./pages/PendingApproval"));
const Profile = lazy(() => import("./pages/Profile"));
const Performance = lazy(() => import("./pages/Performance"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Admin = lazy(() => import("./pages/Admin"));
const Models = lazy(() => import("./pages/Models"));
const ModelDetail = lazy(() => import("./pages/ModelDetail"));
const ModelComparison = lazy(() => import("./pages/ModelComparison"));
const TeamMembers = lazy(() => import("./pages/TeamMembers"));
const ChatterDashboardView = lazy(() => import("./pages/ChatterDashboardView"));
const ChatterSheets = lazy(() => import("./pages/ChatterSheets"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const MockSheet = lazy(() => import("./pages/MockSheet"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <UserRoleProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/pending-approval" element={<PendingApproval />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/performance" element={<Performance />} />
              <Route path="/sheets" element={<ChatterSheets />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/models" element={<Models />} />
              <Route path="/model-comparison" element={<ModelComparison />} />
              <Route path="/team-members" element={<TeamMembers />} />
              <Route path="/chatter/:userId" element={<ChatterDashboardView />} />
              <Route path="/chatter-sheets" element={<ChatterSheets />} />
              <Route path="/audit-log" element={<AuditLog />} />
              <Route path="/mock-sheet" element={<MockSheet />} />
              <Route path="/:modelName" element={<ModelDetail />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </UserRoleProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
