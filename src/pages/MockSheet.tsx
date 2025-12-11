import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MockChatterSheet } from "@/components/sheets/MockChatterSheet";
import { Badge } from "@/components/ui/badge";
import { useUserRole } from "@/contexts/UserRoleContext";
import { Shield, User } from "lucide-react";

const MockSheet = () => {
  const { isAdmin, role } = useUserRole();
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 max-w-7xl mx-auto px-4 py-4 sm:p-6 space-y-6 w-full">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">Chatter Sheet</h1>
            <Badge variant="outline" className="text-yellow-400 border-yellow-400/50">
              Demo Data
            </Badge>
          </div>
          <Badge 
            variant="outline" 
            className={isAdmin 
              ? "text-purple-400 border-purple-400/50" 
              : "text-blue-400 border-blue-400/50"
            }
          >
            {isAdmin ? (
              <>
                <Shield className="h-3 w-3 mr-1" />
                Admin View
              </>
            ) : (
              <>
                <User className="h-3 w-3 mr-1" />
                Chatter View
              </>
            )}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          {isAdmin 
            ? "Admin view: You can edit rates and bonuses. Edit values directly in the cells to see calculations update."
            : "Your weekly performance sheet. Edit sales and hours directly in the cells. Rates are set by your administrator."
          }
        </p>
        
        <MockChatterSheet 
          chatterName="Alex Thompson"
          commissionRate={0.08}
          hourlyRate={15}
          bonus={150}
        />
      </div>
      <Footer />
    </div>
  );
};

export default MockSheet;
