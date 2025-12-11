import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/auditLog";
import { PersonalDetailsCard } from "@/components/profile/PersonalDetailsCard";
import { ChatterDetailsCard } from "@/components/profile/ChatterDetailsCard";
import { ClockingCard } from "@/components/profile/ClockingCard";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, FileText, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/contexts/UserRoleContext";
import { Link } from "react-router-dom";

const Profile = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const { role, loading: roleLoading, isAdmin } = useUserRole();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUserId(user.id);
    };
    
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!roleLoading && userId && role !== "admin" && role !== "chatter") {
      toast.error("Access Denied");
      navigate("/auth");
    }
  }, [role, roleLoading, userId, navigate]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to log out");
    } else {
      logAudit({
        actionType: 'LOGOUT',
        resourceType: 'USER',
        details: {}
      });
      toast.success("Logged out successfully");
      navigate('/auth');
    }
  };

  if (!userId) {
    return null;
  }

  if (!roleLoading && (!role || (role !== "admin" && role !== "chatter"))) {
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
      <div className="flex-1 max-w-7xl mx-auto px-4 py-4 sm:p-6 space-y-6 w-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground mt-1">Manage your details</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link to="/chatter-sheets">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Sheets
              </Button>
            </Link>
            {isAdmin && (
              <Link to="/admin">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Management
                </Button>
              </Link>
            )}
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PersonalDetailsCard userId={userId} />
          <ChatterDetailsCard userId={userId} />
        </div>

        {/* Clocking */}
        <ClockingCard />
      </div>
      <Footer />
    </div>
  );
};

export default Profile;
