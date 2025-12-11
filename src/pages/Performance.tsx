import { Header } from "@/components/Header";
import { EarningsCalculator } from "@/components/earnings/EarningsCalculator";
import { useUserRole } from "@/contexts/UserRoleContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const Performance = () => {
  const { role, loading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && role !== "admin" && role !== "chatter") {
      navigate("/auth");
    }
  }, [role, loading, navigate]);

  if (!loading && (!role || (role !== "admin" && role !== "chatter"))) {
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
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Performance</h1>
          <p className="text-muted-foreground mt-1">
            Track your earnings and performance metrics
          </p>
        </div>
        
        <EarningsCalculator />
      </div>
    </div>
  );
};

export default Performance;
