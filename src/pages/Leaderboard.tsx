import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/ui/page-transition";
import { Trophy, TrendingUp, Users, DollarSign, Medal, Award, Calendar, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useUserRole } from "@/contexts/UserRoleContext";
import { useEffect, useState, useMemo } from "react";
import { useLeaderboardData, MonthSelection } from "@/hooks/useLeaderboardData";
import { supabase } from "@/integrations/supabase/client";
import { AchievementBadge, getNextMilestone } from "@/components/leaderboard/AchievementBadge";
import { format, subMonths } from "date-fns";
import { downloadCSV, formatCurrency } from "@/lib/csvExport";
import { toast } from "sonner";

const RANKINGS_PER_PAGE = 15;

const COLORS = ["hsl(var(--primary))", "hsl(var(--primary) / 0.8)", "hsl(var(--primary) / 0.6)", "hsl(var(--primary) / 0.4)", "hsl(var(--muted-foreground) / 0.4)", "hsl(var(--muted-foreground) / 0.3)", "hsl(var(--muted-foreground) / 0.2)", "hsl(var(--muted-foreground) / 0.1)"];


const Leaderboard = () => {
  const { role, loading, isAdmin } = useUserRole();
  const [timeframe, setTimeframe] = useState<"week" | "month" | "quarter">("month");
  const [teamId, setTeamId] = useState<string>("all");
  const [teams, setTeams] = useState<{ id: string; name: string; color_hex: string }[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("current");
  const [rankingsPage, setRankingsPage] = useState(1);
  
  // Generate last 12 months for picker
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string; month: number; year: number }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = subMonths(now, i);
      const value = `${date.getFullYear()}-${date.getMonth()}`;
      const label = format(date, "MMMM yyyy");
      options.push({ value, label, month: date.getMonth(), year: date.getFullYear() });
    }
    return options;
  }, []);
  
  // Parse selected month into MonthSelection
  const specificMonth: MonthSelection | undefined = useMemo(() => {
    if (selectedMonth === "current") return undefined;
    const option = monthOptions.find(o => o.value === selectedMonth);
    if (!option) return undefined;
    return { month: option.month, year: option.year };
  }, [selectedMonth, monthOptions]);
  
  const { stats, loading: dataLoading } = useLeaderboardData(timeframe, teamId, specificMonth);
  
  // Reset rankings page when filters change
  useEffect(() => {
    setRankingsPage(1);
  }, [timeframe, teamId, selectedMonth]);
  
  // Paginated rankings
  const totalRankingsPages = Math.ceil(stats.topChatters.length / RANKINGS_PER_PAGE);
  const paginatedRankings = useMemo(() => {
    const start = (rankingsPage - 1) * RANKINGS_PER_PAGE;
    return stats.topChatters.slice(start, start + RANKINGS_PER_PAGE);
  }, [stats.topChatters, rankingsPage]);
  
  // Get display label for current period
  const periodLabel = useMemo(() => {
    if (specificMonth) {
      const option = monthOptions.find(o => o.value === selectedMonth);
      return option?.label || "Selected month";
    }
    return timeframe === "week" ? "This week" : timeframe === "month" ? "This month" : "This quarter";
  }, [specificMonth, selectedMonth, monthOptions, timeframe]);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const { data, error } = await supabase.from("teams").select("id, name, color_hex").order("name");
        if (error) throw error;
        setTeams(data || []);
      } catch (error) {
        console.error("Error fetching teams:", error);
        setTeams([]);
      }
    };
    fetchTeams();
  }, []);

  const handleExportCSV = () => {
    if (stats.topChatters.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = ["Rank", "Name", "Total Sales", "Period"];
    const rows = stats.topChatters.map(chatter => [
      chatter.rank,
      chatter.name,
      formatCurrency(chatter.sales),
      periodLabel
    ]);

    downloadCSV({
      filename: `leaderboard-${periodLabel.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}`,
      headers,
      rows
    });

    toast.success(`Exported ${stats.topChatters.length} rankings`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PageTransition className="max-w-7xl mx-auto px-4 py-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Performance Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">Track rankings, earnings, and team performance</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger className="w-[140px]" data-testid="select-team">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map(team => (
                  <SelectItem key={team.id} value={team.id}>
                    <span className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: team.color_hex }} />
                      {team.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select 
              value={timeframe} 
              onValueChange={value => {
                setTimeframe(value as "week" | "month" | "quarter");
                setSelectedMonth("current");
              }}
              disabled={selectedMonth !== "current"}
            >
              <SelectTrigger className="w-[130px]" data-testid="select-timeframe">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[160px]" data-testid="select-month">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Pick Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Use Preset</SelectItem>
                {monthOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {stats.topChatters.length > 0 && (
              <Button variant="outline" onClick={handleExportCSV} className="gap-2" data-testid="button-export-leaderboard">
                <Download className="h-4 w-4" />
                Export
              </Button>
            )}
          </div>
        </div>

        {dataLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading leaderboard data...</p>
          </div>
        ) : (
          <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-card to-card/50 border-border shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-600" />
                      Top Chatter
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats.topChatters.length > 0 ? (
                      <>
                        <div className="text-2xl font-bold text-foreground flex items-center gap-2">
                          {stats.topChatters[0].name}
                          <Award className="h-5 w-5 text-yellow-600" />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          ${stats.topChatters[0].sales.toLocaleString(undefined, { maximumFractionDigits: 0 })} in sales
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No data available</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-card to-card/50 border-border shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      Total Sales
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      ${stats.totalSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {periodLabel}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-card to-card/50 border-border shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      Active Chatters
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{stats.activeChatters}</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {periodLabel}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-card to-card/50 border-border shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-purple-600" />
                      Avg. Per Chatter
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      ${stats.avgPerChatter.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Average sales</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-card border-border shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Medal className="h-5 w-5 text-primary" />
                      Top 8 Performers
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {specificMonth ? periodLabel : (timeframe === "week" ? "Weekly" : timeframe === "month" ? "Monthly" : "Quarterly")} sales comparison
                    </p>
                  </CardHeader>
                  <CardContent>
                    {stats.chartData.length > 0 ? (
                      <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={stats.chartData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                            <XAxis 
                              type="number" 
                              stroke="hsl(var(--muted-foreground))" 
                              fontSize={12} 
                              tickFormatter={value => `$${(value / 1000).toFixed(0)}k`} 
                            />
                            <YAxis 
                              type="category" 
                              dataKey="name" 
                              stroke="hsl(var(--muted-foreground))" 
                              fontSize={12} 
                              width={80} 
                            />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "6px"
                              }} 
                              formatter={(value: number) => [`$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, "Sales"]} 
                            />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                              {stats.chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[400px] flex items-center justify-center">
                        <p className="text-muted-foreground">No data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-card border-border shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-primary" />
                      Complete Rankings
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {specificMonth ? periodLabel : (timeframe === "week" ? "This week's" : timeframe === "month" ? "This month's" : "This quarter's")} all performers
                    </p>
                  </CardHeader>
                  <CardContent>
                    {stats.topChatters.length > 0 ? (
                      <>
                        <div className="space-y-2">
                          {paginatedRankings.map(chatter => (
                            <div 
                              key={chatter.rank} 
                              className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent/50 transition-all border border-transparent hover:border-border"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div className={`flex items-center justify-center w-9 h-9 rounded-full font-bold text-sm shadow-sm ${
                                  chatter.rank === 1 ? "bg-gradient-to-br from-yellow-500 to-yellow-600 text-white" : 
                                  chatter.rank === 2 ? "bg-gradient-to-br from-slate-400 to-slate-500 text-white" : 
                                  chatter.rank === 3 ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white" : 
                                  "bg-muted text-muted-foreground"
                                }`}>
                                  {chatter.rank <= 3 ? <Trophy className="h-4 w-4" /> : chatter.rank}
                                </div>
                                
                                <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                                    {chatter.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>

                                <div className="flex-1">
                                  <div className="font-semibold text-foreground flex items-center gap-2 flex-wrap">
                                    {chatter.name}
                                    {chatter.rank <= 3 && (
                                      <Badge variant="outline" className="text-xs">
                                        Top {chatter.rank}
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <AchievementBadge earnings={chatter.sales} size="sm" />
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="font-bold text-lg bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                  ${chatter.sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                                <div className="text-xs text-muted-foreground">in sales</div>
                                {(() => {
                                  const nextMilestone = getNextMilestone(chatter.sales);
                                  if (nextMilestone) {
                                    const progress = (chatter.sales / nextMilestone.threshold) * 100;
                                    return (
                                      <div className="mt-1">
                                        <div className="text-xs text-muted-foreground">
                                          {progress.toFixed(0)}% to {nextMilestone.name}
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {totalRankingsPages > 1 && (
                          <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                            <p className="text-sm text-muted-foreground">
                              Showing {(rankingsPage - 1) * RANKINGS_PER_PAGE + 1}-{Math.min(rankingsPage * RANKINGS_PER_PAGE, stats.topChatters.length)} of {stats.topChatters.length}
                            </p>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setRankingsPage(p => Math.max(1, p - 1))}
                                disabled={rankingsPage === 1}
                                data-testid="button-rankings-prev"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <span className="text-sm text-muted-foreground px-2">
                                {rankingsPage} / {totalRankingsPages}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setRankingsPage(p => Math.min(totalRankingsPages, p + 1))}
                                disabled={rankingsPage === totalRankingsPages}
                                data-testid="button-rankings-next"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="py-12 text-center">
                        <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No data available for this period</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
          </div>
        )}
      </PageTransition>
    </div>
  );
};

export default Leaderboard;
