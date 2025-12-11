import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

export interface ChatterPerformance {
  name: string;
  sales: number;
  rank: number;
}

export interface LeaderboardStats {
  topChatters: ChatterPerformance[];
  totalSales: number;
  activeChatters: number;
  avgPerChatter: number;
  chartData: { name: string; value: number }[];
  useMockData?: boolean;
}

const emptyStats: LeaderboardStats = {
  topChatters: [],
  totalSales: 0,
  activeChatters: 0,
  avgPerChatter: 0,
  chartData: [],
};

export interface MonthSelection {
  month: number;
  year: number;
}

async function fetchLeaderboardData(
  timeframe: "week" | "month" | "quarter",
  teamId?: string,
  specificMonth?: MonthSelection
): Promise<LeaderboardStats> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    console.error("No session found");
    return emptyStats;
  }

  const params = new URLSearchParams({ timeframe });
  if (teamId && teamId !== "all") {
    params.append("teamId", teamId);
  }
  if (specificMonth) {
    params.append("specificMonth", specificMonth.month.toString());
    params.append("specificYear", specificMonth.year.toString());
  }

  const response = await fetch(`/api/leaderboard?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch leaderboard data");
  }

  const data = await response.json();
  
  if (!data.topChatters || data.topChatters.length === 0) {
    return emptyStats;
  }
  
  return data;
}

export function useLeaderboardData(
  timeframe: "week" | "month" | "quarter" = "month",
  teamId?: string,
  specificMonth?: MonthSelection
) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["leaderboard", timeframe, teamId, specificMonth?.month, specificMonth?.year],
    queryFn: () => fetchLeaderboardData(timeframe, teamId, specificMonth),
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  const stats = useMemo(() => data || emptyStats, [data]);

  return { stats, loading: isLoading, refetch };
}
