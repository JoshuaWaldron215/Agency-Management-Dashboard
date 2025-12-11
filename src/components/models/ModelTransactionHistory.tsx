import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Filter, ChevronLeft, ChevronRight, Calendar, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { downloadCSV, formatCurrency, formatDate } from "@/lib/csvExport";
import { toast } from "sonner";

interface Transaction {
  id: string;
  transaction_date: string;
  gross: number;
  net: number;
  category: string;
  description: string | null;
  chatter_name?: string;
  created_at: string;
}

interface ModelTransactionHistoryProps {
  modelId: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  "PPV": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "PPV Message": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "Message": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "Tip": "bg-teal-500/20 text-teal-400 border-teal-500/30",
  "Tips": "bg-teal-500/20 text-teal-400 border-teal-500/30",
  "Subscription": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "Recurring Subscription": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "Bundle": "bg-pink-500/20 text-pink-400 border-pink-500/30",
  "Bundles": "bg-pink-500/20 text-pink-400 border-pink-500/30",
  "Welcome": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Welcome Message": "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

type TimeRange = "7" | "30" | "90" | "all";

const PAGE_SIZE = 20;

export function ModelTransactionHistory({ modelId }: ModelTransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<TimeRange>("30");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadTransactions();
  }, [modelId, categoryFilter, timeRange, page]);

  const loadTransactions = async () => {
    setLoading(true);
    
    try {
      let query = supabase
        .from("model_transactions")
        .select(`
          id,
          transaction_date,
          gross,
          net,
          category,
          description,
          created_at,
          chatter_id
        `, { count: "exact" })
        .eq("model_id", modelId)
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }

      if (timeRange !== "all") {
        const daysAgo = parseInt(timeRange);
        const startDate = format(subDays(new Date(), daysAgo), "yyyy-MM-dd");
        query = query.gte("transaction_date", startDate);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error("Error loading transactions:", error);
        setTransactions([]);
        return;
      }

      if (data && data.length > 0) {
        const chatterIds = [...new Set(data.map((t: any) => t.chatter_id))] as string[];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", chatterIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.name]) || []);
        
        const transactionsWithNames = data.map((t: any) => ({
          ...t,
          chatter_name: profileMap.get(t.chatter_id) || "Unknown",
        }));

        setTransactions(transactionsWithNames);
      } else {
        setTransactions([]);
      }

      setTotalCount(count || 0);

      if (categories.length === 0) {
        const { data: catData } = await supabase
          .from("model_transactions")
          .select("category")
          .eq("model_id", modelId);

        if (catData) {
          const uniqueCats = [...new Set(catData.map((c: any) => c.category))] as string[];
          setCategories(uniqueCats);
        }
      }
    } catch (e) {
      console.error("Error:", e);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const getCategoryBadgeClass = (category: string) => {
    return CATEGORY_COLORS[category] || "bg-secondary text-secondary-foreground";
  };

  const getTimeRangeLabel = (range: TimeRange) => {
    switch (range) {
      case "7": return "Last 7 Days";
      case "30": return "Last 30 Days";
      case "90": return "Last 90 Days";
      case "all": return "All Time";
    }
  };

  const handleExportCSV = async () => {
    try {
      toast.info("Preparing export...");
      
      let query = supabase
        .from("model_transactions")
        .select("id, transaction_date, gross, net, category, description, chatter_id")
        .eq("model_id", modelId)
        .order("transaction_date", { ascending: false });

      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }

      if (timeRange !== "all") {
        const daysAgo = parseInt(timeRange);
        const startDate = format(subDays(new Date(), daysAgo), "yyyy-MM-dd");
        query = query.gte("transaction_date", startDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error("No transactions to export");
        return;
      }

      const chatterIds = [...new Set(data.map((t: any) => t.chatter_id))] as string[];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", chatterIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.name]) || []);

      const headers = ["Date", "Category", "Chatter", "Gross", "Net"];
      const rows = data.map((tx: any) => [
        formatDate(tx.transaction_date),
        tx.category,
        profileMap.get(tx.chatter_id) || "Unknown",
        formatCurrency(tx.gross),
        formatCurrency(tx.net)
      ]);

      downloadCSV({
        filename: `model-transactions-${getTimeRangeLabel(timeRange).replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}`,
        headers,
        rows
      });

      toast.success(`Exported ${data.length} transactions`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export transactions");
    }
  };

  if (loading && transactions.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            Loading transactions...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-teal-400" />
              Transaction History
              {totalCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {totalCount} transactions
                </Badge>
              )}
            </CardTitle>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={timeRange} onValueChange={(v) => { setTimeRange(v as TimeRange); setPage(0); }}>
                <SelectTrigger className="w-[150px]" data-testid="select-tx-timerange">
                  <SelectValue placeholder="Time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {totalCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2" data-testid="button-export-transactions">
                <Download className="h-4 w-4" />
                Export
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <History className="h-12 w-12 mb-4 opacity-50" />
            <p>No transactions found for {getTimeRangeLabel(timeRange).toLowerCase()}</p>
            <p className="text-sm mt-1">Transactions are saved when you parse earnings and save to your sheet</p>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    data-testid={`transaction-row-${tx.id}`}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="text-sm text-muted-foreground w-24 flex-shrink-0">
                        {format(new Date(tx.transaction_date), "MMM d, yyyy")}
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`${getCategoryBadgeClass(tx.category)} flex-shrink-0`}
                      >
                        {tx.category}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground truncate">
                          {tx.chatter_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="font-semibold text-foreground">
                        ${tx.net.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        gross: ${tx.gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
