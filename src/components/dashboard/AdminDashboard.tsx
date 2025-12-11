import { useState, useMemo } from "react";
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Target,
  Zap,
  BarChart3,
  Award,
  Crown,
  Trophy,
  Star,
  Loader2,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { KPICard } from "./KPICard";
import { MetricCard } from "./MetricCard";
import { SaleTypeBreakdown } from "./SaleTypeBreakdown";
import { TopPerformers } from "./TopPerformers";
import { DailyPerformanceChart } from "./DailyPerformanceChart";
import { ModelEarningsBreakdown } from "./ModelEarningsBreakdown";
import { TimeFilter, parseMonthSelection } from "./TimeFilter";
import { useAdminDashboardData } from "@/hooks/useDashboardData";
import { downloadCSV, formatCurrency } from "@/lib/csvExport";
import { format } from "date-fns";
import { toast } from "sonner";

export function AdminDashboard() {
  const [timeFilter, setTimeFilter] = useState<string>("30");
  const [selectedMonth, setSelectedMonth] = useState<string>("current");
  
  const monthSelection = useMemo(() => parseMonthSelection(selectedMonth), [selectedMonth]);
  const { loading, isRefreshing, ...data } = useAdminDashboardData(timeFilter, monthSelection);
  
  const periodLabel = useMemo(() => {
    if (monthSelection) {
      const date = new Date(monthSelection.year, monthSelection.month, 1);
      return format(date, "MMMM yyyy");
    }
    // Generate label for preset filters
    switch (timeFilter) {
      case "today": return "Today";
      case "7": return "Last 7 Days";
      case "30": return "Last 30 Days";
      case "90": return "Last 90 Days";
      case "all": return "All Time";
      default: return null;
    }
  }, [monthSelection, timeFilter]);

  const handleExportDashboard = () => {
    const headers = ["Metric", "Value", "Details", "Period"];
    const rows = [
      ["Total Revenue", formatCurrency(data.totalRevenue), `${data.totalSales.toLocaleString()} sales`, periodLabel || ""],
      ["Commission Earned", formatCurrency(data.commissionEarned), `${formatCurrency(data.commissionPerHour)}/hr`, periodLabel || ""],
      ["Hours Worked", `${data.hoursWorked}h`, `${data.totalShifts} shifts`, periodLabel || ""],
      ["Avg Sale Value", formatCurrency(data.avgSaleValue), `${data.salesPerShift.toFixed(1)} sales/shift`, periodLabel || ""],
      ["Revenue Per Hour", formatCurrency(data.revenuePerHour), "", periodLabel || ""],
      ["Revenue Per Shift", formatCurrency(data.revenuePerShift), "", periodLabel || ""],
      ["Shift Bonus Rate", `${data.shiftBonusRate}%`, `${data.legendCount} Legend, ${data.championCount} Champion, ${data.aceCount} Ace`, periodLabel || ""],
      ["Best Day", data.bestDay || "N/A", `${formatCurrency(data.bestDayRevenue)} (${data.bestDaySales} sales)`, periodLabel || ""],
      ["Peak Hour", data.peakHour || "N/A", `${formatCurrency(data.peakHourRevenue)} (${data.peakHourSales} sales)`, periodLabel || ""],
    ];

    // Add sale type breakdown
    if (data.saleTypes && data.saleTypes.length > 0) {
      rows.push(["", "", "", ""]);
      rows.push(["Sale Type Breakdown", "", "", ""]);
      data.saleTypes.forEach(st => {
        rows.push([st.name, formatCurrency(st.value), `${st.percentage}%`, periodLabel || ""]);
      });
    }

    // Add model earnings breakdown
    if (data.modelEarnings && data.modelEarnings.length > 0) {
      rows.push(["", "", "", ""]);
      rows.push(["Model Earnings Breakdown", "", "", ""]);
      const totalModelEarnings = data.modelEarnings.reduce((sum, m) => sum + m.allTime, 0);
      data.modelEarnings.forEach((model, idx) => {
        const pct = totalModelEarnings > 0 ? Math.round((model.allTime / totalModelEarnings) * 100) : 0;
        rows.push([`#${idx + 1} ${model.modelName}`, formatCurrency(model.allTime), `${pct}%`, periodLabel || ""]);
      });
    }

    downloadCSV({
      filename: `dashboard-summary-${(periodLabel || 'all').replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}`,
      headers,
      rows
    });

    toast.success("Dashboard summary exported");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading performance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background p-6 space-y-6 transition-opacity duration-200 ${isRefreshing ? 'opacity-60' : 'opacity-100'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="icon-container-purple">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              PERFORMANCE ANALYTICS
            </h1>
            <p className="text-sm text-muted-foreground">
              Deep insights into your performance metrics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {isRefreshing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <TimeFilter 
            value={timeFilter} 
            onChange={setTimeFilter}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
          <Button variant="outline" size="sm" onClick={handleExportDashboard} className="gap-2" data-testid="button-export-dashboard">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="TOTAL REVENUE"
          value={`$${data.totalRevenue.toLocaleString()}`}
          subtitle={`${data.totalSales.toLocaleString()} sales`}
          change={data.revenueChange}
          icon={DollarSign}
          variant="teal"
        />
        <KPICard
          title="COMMISSION EARNED"
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
          title="AVG SALE VALUE"
          value={`$${data.avgSaleValue.toFixed(2)}`}
          subtitle={`${data.salesPerShift.toFixed(1)} sales/shift`}
          icon={Target}
          variant="default"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <div className="stat-card flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="icon-container-yellow">
                <Award className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                SHIFT BONUS RATE
              </span>
            </div>
          </div>
          <div className="text-4xl font-bold gradient-text-yellow mb-4">
            {data.shiftBonusRate}%
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="badge-legend flex items-center gap-1.5">
              <Crown className="h-3 w-3" />
              {data.legendCount} Legend
            </span>
            <span className="badge-champion flex items-center gap-1.5">
              <Trophy className="h-3 w-3" />
              {data.championCount} Champion
            </span>
            <span className="badge-ace flex items-center gap-1.5">
              <Star className="h-3 w-3" />
              {data.aceCount} Ace
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SaleTypeBreakdown data={data.saleTypes} />
        <TopPerformers 
          bestDay={data.bestDay}
          bestDayRevenue={data.bestDayRevenue}
          bestDaySales={data.bestDaySales}
          peakHour={data.peakHour}
          peakHourRevenue={data.peakHourRevenue}
          peakHourSales={data.peakHourSales}
        />
      </div>

      <ModelEarningsBreakdown modelEarnings={data.modelEarnings} periodLabel={periodLabel} />

      <DailyPerformanceChart data={data.dailyPerformance} periodLabel={periodLabel} />
    </div>
  );
}
