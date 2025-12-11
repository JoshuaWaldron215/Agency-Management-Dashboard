import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, startOfMonth, endOfWeek, endOfMonth, subWeeks, subMonths, format } from "date-fns";

export interface TrendDataPoint {
  period: string;
  earnings: number;
  sales: number;
}

export interface ChatterTrend {
  name: string;
  data: TrendDataPoint[];
}

export interface TeamTrend {
  id: string;
  name: string;
  color: string;
  data: TrendDataPoint[];
}

export function usePerformanceTrends(
  type: "chatter" | "team" = "chatter",
  timeframe: "week" | "month" = "week",
  periods: number = 8
) {
  const [chatterTrends, setChatterTrends] = useState<ChatterTrend[]>([]);
  const [teamTrends, setTeamTrends] = useState<TeamTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (type === "chatter") {
      fetchChatterTrends();
    } else {
      fetchTeamTrends();
    }
  }, [type, timeframe, periods]);

  const fetchChatterTrends = async () => {
    try {
      setLoading(true);
      const trends = new Map<string, TrendDataPoint[]>();

      // Generate period ranges
      const periodRanges: { start: Date; end: Date; label: string }[] = [];
      for (let i = periods - 1; i >= 0; i--) {
        let start: Date, end: Date, label: string;
        
        if (timeframe === "week") {
          const weekStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 0 });
          const weekEnd = endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 0 });
          start = weekStart;
          end = weekEnd;
          label = format(weekStart, "MMM d");
        } else {
          const monthStart = startOfMonth(subMonths(new Date(), i));
          const monthEnd = endOfMonth(subMonths(new Date(), i));
          start = monthStart;
          end = monthEnd;
          label = format(monthStart, "MMM yyyy");
        }
        
        periodRanges.push({ start, end, label });
      }

      // Fetch data for all periods
      for (const period of periodRanges) {
        const { data: sheets } = await supabase
          .from("chatter_sheets")
          .select(`
            chatter_name,
            commission_rate,
            hourly_rate,
            total_hours,
            bonus,
            chatter_sheet_accounts (sales_amount),
            chatter_sheet_daily_sales (sales_amount)
          `)
          .gte("period_start", period.start.toISOString().split('T')[0])
          .lte("period_end", period.end.toISOString().split('T')[0]);

        // Aggregate by chatter
        sheets?.forEach((sheet) => {
          const accountSales = sheet.chatter_sheet_accounts?.reduce(
            (sum, acc) => sum + Number(acc.sales_amount || 0),
            0
          ) || 0;

          const dailySales = sheet.chatter_sheet_daily_sales?.reduce(
            (sum, sale) => sum + Number(sale.sales_amount || 0),
            0
          ) || 0;

          const totalSales = accountSales + dailySales;
          const earnings = totalSales * Number(sheet.commission_rate || 0) + 
                          Number(sheet.hourly_rate || 0) * Number(sheet.total_hours || 0) +
                          Number(sheet.bonus || 0);

          if (!trends.has(sheet.chatter_name)) {
            trends.set(sheet.chatter_name, []);
          }

          const existing = trends.get(sheet.chatter_name)!.find(d => d.period === period.label);
          if (existing) {
            existing.earnings += earnings;
            existing.sales += totalSales;
          } else {
            trends.get(sheet.chatter_name)!.push({
              period: period.label,
              earnings,
              sales: totalSales,
            });
          }
        });
      }

      // Ensure all chatters have data for all periods (fill with 0s if missing)
      const chatterNames = Array.from(trends.keys());
      chatterNames.forEach(name => {
        const chatterData = trends.get(name)!;
        periodRanges.forEach(period => {
          if (!chatterData.find(d => d.period === period.label)) {
            chatterData.push({
              period: period.label,
              earnings: 0,
              sales: 0,
            });
          }
        });
        // Sort by period
        chatterData.sort((a, b) => {
          const aIndex = periodRanges.findIndex(p => p.label === a.period);
          const bIndex = periodRanges.findIndex(p => p.label === b.period);
          return aIndex - bIndex;
        });
      });

      // Convert to array and sort by total earnings
      const trendsArray: ChatterTrend[] = Array.from(trends.entries())
        .map(([name, data]) => ({
          name,
          data,
        }))
        .sort((a, b) => {
          const aTotal = a.data.reduce((sum, d) => sum + d.earnings, 0);
          const bTotal = b.data.reduce((sum, d) => sum + d.earnings, 0);
          return bTotal - aTotal;
        })
        .slice(0, 8); // Top 8 performers

      setChatterTrends(trendsArray);
    } catch (error) {
      console.error("Error fetching chatter trends:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamTrends = async () => {
    try {
      setLoading(true);
      
      // Fetch teams
      const { data: teams } = await supabase
        .from("teams")
        .select("id, name, color_hex")
        .order("name");

      if (!teams) return;

      const teamTrendsMap = new Map<string, TrendDataPoint[]>();
      teams.forEach(team => {
        teamTrendsMap.set(team.id, []);
      });

      // Generate period ranges
      const periodRanges: { start: Date; end: Date; label: string }[] = [];
      for (let i = periods - 1; i >= 0; i--) {
        let start: Date, end: Date, label: string;
        
        if (timeframe === "week") {
          const weekStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 0 });
          const weekEnd = endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 0 });
          start = weekStart;
          end = weekEnd;
          label = format(weekStart, "MMM d");
        } else {
          const monthStart = startOfMonth(subMonths(new Date(), i));
          const monthEnd = endOfMonth(subMonths(new Date(), i));
          start = monthStart;
          end = monthEnd;
          label = format(monthStart, "MMM yyyy");
        }
        
        periodRanges.push({ start, end, label });
      }

      // Fetch profiles to get team assignments
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, team_id");

      // Fetch data for all periods
      for (const period of periodRanges) {
        const { data: sheets } = await supabase
          .from("chatter_sheets")
          .select(`
            chatter_user_id,
            commission_rate,
            hourly_rate,
            total_hours,
            bonus,
            chatter_sheet_accounts (sales_amount),
            chatter_sheet_daily_sales (sales_amount)
          `)
          .gte("period_start", period.start.toISOString().split('T')[0])
          .lte("period_end", period.end.toISOString().split('T')[0]);

        // Aggregate by team
        sheets?.forEach((sheet) => {
          const profile = profiles?.find(p => p.id === sheet.chatter_user_id);
          if (!profile?.team_id) return;

          const accountSales = sheet.chatter_sheet_accounts?.reduce(
            (sum, acc) => sum + Number(acc.sales_amount || 0),
            0
          ) || 0;

          const dailySales = sheet.chatter_sheet_daily_sales?.reduce(
            (sum, sale) => sum + Number(sale.sales_amount || 0),
            0
          ) || 0;

          const totalSales = accountSales + dailySales;
          const earnings = totalSales * Number(sheet.commission_rate || 0) + 
                          Number(sheet.hourly_rate || 0) * Number(sheet.total_hours || 0) +
                          Number(sheet.bonus || 0);

          const teamData = teamTrendsMap.get(profile.team_id);
          if (teamData) {
            const existing = teamData.find(d => d.period === period.label);
            if (existing) {
              existing.earnings += earnings;
              existing.sales += totalSales;
            } else {
              teamData.push({
                period: period.label,
                earnings,
                sales: totalSales,
              });
            }
          }
        });
      }

      // Ensure all teams have data for all periods
      teams.forEach(team => {
        const teamData = teamTrendsMap.get(team.id)!;
        periodRanges.forEach(period => {
          if (!teamData.find(d => d.period === period.label)) {
            teamData.push({
              period: period.label,
              earnings: 0,
              sales: 0,
            });
          }
        });
        // Sort by period
        teamData.sort((a, b) => {
          const aIndex = periodRanges.findIndex(p => p.label === a.period);
          const bIndex = periodRanges.findIndex(p => p.label === b.period);
          return aIndex - bIndex;
        });
      });

      const trendsArray: TeamTrend[] = teams.map(team => ({
        id: team.id,
        name: team.name,
        color: team.color_hex,
        data: teamTrendsMap.get(team.id)!,
      }));

      setTeamTrends(trendsArray);
    } catch (error) {
      console.error("Error fetching team trends:", error);
    } finally {
      setLoading(false);
    }
  };

  return { chatterTrends, teamTrends, loading };
}
