import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export default function PendingApproval() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    getUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", user.id)
      .single();

    const status = profile?.status ?? "approved";
    
    if (status === "approved") {
      window.location.href = "/";
    } else if (status === "denied") {
      navigate("/auth");
    }
    
    setIsRefreshing(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Awaiting Approval
            </h1>
            <p className="text-muted-foreground">
              Your account is pending admin approval. Please contact a manager on Discord for faster access.
            </p>
          </div>

          {userEmail && (
            <p className="text-sm text-muted-foreground">
              Signed in as: <span className="font-medium text-foreground">{userEmail}</span>
            </p>
          )}

          <div className="flex flex-col gap-3 pt-2">
            <Button 
              onClick={handleRefresh} 
              disabled={isRefreshing}
              className="w-full"
              data-testid="button-check-status"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Check Status
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleSignOut}
              className="w-full"
              data-testid="button-sign-out"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
