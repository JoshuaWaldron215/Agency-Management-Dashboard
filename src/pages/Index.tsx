import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { useUserRole } from "@/contexts/UserRoleContext";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { ChatterDashboard } from "@/components/dashboard/ChatterDashboard";
import { PageTransition } from "@/components/ui/page-transition";
import { Loader2 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { role, status, loading: roleLoading, isAdmin, isApproved } = useUserRole();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!roleLoading && session) {
      if (!isApproved) {
        navigate("/pending-approval");
        return;
      }
      if (role !== "admin" && role !== "chatter" && role !== "manager") {
        navigate("/auth");
      }
    }
  }, [role, status, roleLoading, session, isApproved, navigate]);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!roleLoading && (!role || (role !== "admin" && role !== "chatter" && role !== "manager"))) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 p-6">
          <h2 className="text-2xl font-bold text-foreground">Access Denied</h2>
          <p className="text-muted-foreground max-w-md">
            Sorry you don't have access, please contact one of the managers on discord.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 overflow-auto">
        <PageTransition>
          {isAdmin ? <AdminDashboard /> : <ChatterDashboard />}
        </PageTransition>
      </main>
    </div>
  );
};

export default Index;
