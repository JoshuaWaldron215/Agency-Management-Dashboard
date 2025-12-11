import { useState, useEffect } from "react";
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Target,
  Zap,
  BarChart3,
  Award,
  Calendar,
  Star,
  Loader2
} from "lucide-react";
import { KPICard } from "./KPICard";
import { MetricCard } from "./MetricCard";
import { DailyPerformanceChart } from "./DailyPerformanceChart";
import { TimeFilter } from "./TimeFilter";
import { SaleTypeBreakdown } from "./SaleTypeBreakdown";
import { ModelEarningsBreakdown } from "./ModelEarningsBreakdown";
import { useChatterDashboardData } from "@/hooks/useDashboardData";
import { supabase } from "@/integrations/supabase/client";

interface ChatterDashboardProps {
  userId?: string | null;
  userName?: string | null;
}

export function ChatterDashboard({ userId: propUserId, userName: propUserName }: ChatterDashboardProps = {}) {
  const [timeFilter, setTimeFilter] = useState<string>("30");
  const [userName, setUserName] = useState<string>(propUserName || "");
  const { loading, isRefreshing, ...data } = useChatterDashboardData(timeFilter, propUserId);

  useEffect(() => {
    if (propUserName) {
      setUserName(propUserName);
      return;
    }
    
    const fetchUserName = async () => {
      if (propUserId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', propUserId)
          .single();
        
        if (profile?.name) {
          setUserName(profile.name);
        }
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', user.id)
            .single();
          
          if (profile?.name) {
            setUserName(profile.name);
          }
        }
      }
    };
    fetchUserName();
  }, [propUserId, propUserName]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your performance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background p-6 space-y-6 transition-opacity duration-200 ${isRefreshing ? 'opacity-60' : 'opacity-100'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="icon-container-teal">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {userName ? `${userName}'s Dashboard` : 'My Performance'}
            </h1>
            <p className="text-sm text-muted-foreground">
              Track your earnings and performance metrics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isRefreshing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <TimeFilter value={timeFilter} onChange={setTimeFilter} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="MY EARNINGS"
          value={`$${data.totalRevenue.toLocaleString()}`}
          subtitle={`${data.totalSales} sales`}
          change={data.revenueChange}
          icon={DollarSign}
          variant="teal"
        />
        <KPICard
          title="COMMISSION"
          value={`$${data.commissionEarned.toLocaleString()}`}
          subtitle={`$${data.commissionPerHour.toFixed(2)}/hr`}
          icon={TrendingUp}
          variant="purple"
        />
        <KPICard
          title="HOURS WORKED"
          value={`${data.hoursWorked}h`}
          subtitle={`${data.totalShifts} shifts`}
          icon={Clock}
          variant="default"
        />
        <KPICard
          title="AVG SALE"
          value={`$${data.avgSaleValue.toFixed(2)}`}
          subtitle={`${data.salesPerShift.toFixed(1)} sales/shift`}
          icon={Target}
          variant="default"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard
          title="REVENUE PER HOUR"
          value={`$${data.revenuePerHour.toFixed(2)}`}
          target="$50/hr = Elite Status"
          icon={Zap}
          variant="teal"
          progress={Math.min((data.revenuePerHour / 150) * 100, 100)}
        />
        <MetricCard
          title="REVENUE PER SHIFT"
          value={`$${data.revenuePerShift.toFixed(0)}`}
          target="$500/shift = Legend Tier"
          icon={BarChart3}
          variant="purple"
          progress={Math.min((data.revenuePerShift / 600) * 100, 100)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SaleTypeBreakdown data={data.saleTypes} />
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-4">
            <div className="icon-container-yellow">
              <Award className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold text-foreground uppercase tracking-wider">
              ACHIEVEMENTS
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 text-center">
              <Star className="h-6 w-6 mx-auto mb-2 text-yellow-400" />
              <div className="text-sm font-medium text-foreground">Top Seller</div>
              <div className="text-xs text-muted-foreground">Week 47</div>
            </div>
            <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 text-center">
              <Calendar className="h-6 w-6 mx-auto mb-2 text-teal-400" />
              <div className="text-sm font-medium text-foreground">100% Attendance</div>
              <div className="text-xs text-muted-foreground">November</div>
            </div>
            <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 text-center opacity-40">
              <Award className="h-6 w-6 mx-auto mb-2 text-purple-400" />
              <div className="text-sm font-medium text-foreground">$10K Club</div>
              <div className="text-xs text-muted-foreground">Locked</div>
            </div>
            <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 text-center opacity-40">
              <Target className="h-6 w-6 mx-auto mb-2 text-pink-400" />
              <div className="text-sm font-medium text-foreground">Elite Status</div>
              <div className="text-xs text-muted-foreground">Locked</div>
            </div>
          </div>
        </div>
      </div>

      <ModelEarningsBreakdown modelEarnings={data.modelEarnings} />

      <DailyPerformanceChart data={data.dailyPerformance} />
    </div>
  );
}
