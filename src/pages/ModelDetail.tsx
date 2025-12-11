import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, GitCompare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserRole } from "@/contexts/UserRoleContext";
import { ModelSalesBreakdown } from "@/components/models/ModelSalesBreakdown";
import { ChatterFilters } from "@/components/models/ChatterFilters";
import { SaleTypeBreakdown } from "@/components/models/SaleTypeBreakdown";
import { ModelTransactionHistory } from "@/components/models/ModelTransactionHistory";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, subDays, startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";

type TimeframeType = "today" | "7days" | "30days" | "all";

interface Model {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  image_url: string | null;
}

interface ChatterSales {
  chatter_name: string;
  total_sales: number;
  sheet_count: number;
}

const TIMEZONE = "America/New_York";

const getDateRange = (timeframe: TimeframeType): { startDate: string | null; endDate: string } => {
  const now = new Date();
  const zonedNow = toZonedTime(now, TIMEZONE);
  const endDate = format(zonedNow, "yyyy-MM-dd");
  
  switch (timeframe) {
    case "today":
      return { startDate: endDate, endDate };
    case "7days":
      return { startDate: format(subDays(zonedNow, 6), "yyyy-MM-dd"), endDate };
    case "30days":
      return { startDate: format(subDays(zonedNow, 29), "yyyy-MM-dd"), endDate };
    case "all":
    default:
      return { startDate: null, endDate };
  }
};

const ModelDetail = () => {
  const { modelName } = useParams<{ modelName: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useUserRole();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [model, setModel] = useState<Model | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [chatterSales, setChatterSales] = useState<ChatterSales[]>([]);
  const [totalSales, setTotalSales] = useState(0);
  const [dailySales, setDailySales] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<"sales" | "name" | "sheets">("sales");
  const [subscriptionCount, setSubscriptionCount] = useState(0);
  const [welcomeCount, setWelcomeCount] = useState(0);
  const [timeframe, setTimeframe] = useState<TimeframeType>("all");

  useEffect(() => {
    loadModel();
  }, [modelName]);

  useEffect(() => {
    if (model) {
      loadSalesData();
    }
  }, [modelName, timeframe, model]);

  const loadModel = async () => {
    if (!modelName) return;

    const { data, error } = await supabase
      .from("models")
      .select("*")
      .eq("name", decodeURIComponent(modelName))
      .maybeSingle();

    if (error) {
      toast({
        title: "Error loading model",
        description: error.message,
        variant: "destructive",
      });
      navigate("/models");
    } else if (!data) {
      toast({
        title: "Model not found",
        variant: "destructive",
      });
      navigate("/models");
    } else {
      setModel(data);
    }
    setLoading(false);
  };

  const loadSalesData = async () => {
    if (!modelName || !model) return;

    const { startDate, endDate } = getDateRange(timeframe);

    // Get sales data grouped by chatter with date filter
    let salesQuery = supabase
      .from("chatter_sheet_daily_sales")
      .select(`
        sales_amount,
        sheet_id,
        sale_date,
        chatter_sheets!inner(
          chatter_name,
          period_start,
          period_end
        )
      `)
      .eq("model_id", model.id);

    if (startDate) {
      salesQuery = salesQuery.gte("sale_date", startDate).lte("sale_date", endDate);
    }

    const { data: salesData, error: salesError } = await salesQuery;

    if (salesError) {
      console.error("Error loading sales data:", salesError);
      return;
    }

    // Aggregate by chatter
    const chatterMap = new Map<string, { total: number; sheets: Set<string> }>();
    let total = 0;

    salesData?.forEach((sale: any) => {
      const chatterName = sale.chatter_sheets.chatter_name;
      const amount = Number(sale.sales_amount);
      total += amount;

      if (!chatterMap.has(chatterName)) {
        chatterMap.set(chatterName, { total: 0, sheets: new Set() });
      }
      const chatter = chatterMap.get(chatterName)!;
      chatter.total += amount;
      chatter.sheets.add(sale.sheet_id);
    });
    
    // Get subscription count from model_transactions with date filter
    let subQuery = supabase
      .from("model_transactions")
      .select("*", { count: "exact", head: true })
      .eq("model_id", model.id)
      .eq("category", "Subscription");
    
    if (startDate) {
      subQuery = subQuery.gte("transaction_date", startDate).lte("transaction_date", endDate);
    }
    
    const { count: subCount } = await subQuery;
    setSubscriptionCount(subCount || 0);
    
    // Get welcome message count from model_transactions with date filter
    let welcomeQuery = supabase
      .from("model_transactions")
      .select("*", { count: "exact", head: true })
      .eq("model_id", model.id)
      .in("category", ["Welcome", "Welcome Message"]);
    
    if (startDate) {
      welcomeQuery = welcomeQuery.gte("transaction_date", startDate).lte("transaction_date", endDate);
    }
    
    const { count: welcomeMsgCount } = await welcomeQuery;
    setWelcomeCount(welcomeMsgCount || 0);

    const chatters: ChatterSales[] = Array.from(chatterMap.entries()).map(
      ([name, data]) => ({
        chatter_name: name,
        total_sales: data.total,
        sheet_count: data.sheets.size,
      })
    );

    chatters.sort((a, b) => b.total_sales - a.total_sales);

    setChatterSales(chatters);
    setTotalSales(total);

    // Calculate daily sales for chart
    const dailyMap = new Map<string, number>();
    salesData?.forEach((sale: any) => {
      const dateKey = sale.sale_date;
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + Number(sale.sales_amount));
    });

    const daily = Array.from(dailyMap.entries())
      .map(([date, sales]) => ({ date, sales }))
      .sort((a, b) => a.date.localeCompare(b.date));

    setDailySales(daily);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0] || !model) return;

    const file = event.target.files[0];
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${model.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('model-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('model-images')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('models')
        .update({ image_url: publicUrl })
        .eq('id', model.id);

      if (updateError) throw updateError;

      setModel({ ...model, image_url: publicUrl });
      toast({
        title: "Success",
        description: "Profile image uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error uploading image",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center" style={{ minHeight: "calc(100vh - 4rem)" }}>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!model) {
    return null;
  }

  const sortedChatters = [...chatterSales].sort((a, b) => {
    if (sortBy === "sales") return b.total_sales - a.total_sales;
    if (sortBy === "name") return a.chatter_name.localeCompare(b.chatter_name);
    if (sortBy === "sheets") return b.sheet_count - a.sheet_count;
    return 0;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/models")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Models
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/model-comparison?models=${model.id}`)}
            className="gap-2"
          >
            <GitCompare className="h-4 w-4" />
            Compare Models
          </Button>
        </div>

        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-start gap-6">
            <div className="relative group">
              <Avatar className="h-32 w-32 border-4 border-border">
                <AvatarImage src={model.image_url || undefined} alt={model.name} />
                <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                  {model.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isAdmin && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-0 right-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-foreground">{model.name}</h1>
              <p className="text-muted-foreground mt-2">
                Created: {new Date(model.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <Select value={timeframe} onValueChange={(v) => setTimeframe(v as TimeframeType)}>
            <SelectTrigger className="w-[140px]" data-testid="select-timeframe">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">
                ${totalSales.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Chatters</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">
                {chatterSales.length}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg per Chatter</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">
                ${chatterSales.length > 0 ? Math.round(totalSales / chatterSales.length).toLocaleString() : 0}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-400">
                {subscriptionCount.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Welcome Msgs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-400">
                {welcomeCount.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {dailySales.length > 0 && (
          <ModelSalesBreakdown data={dailySales} title="Daily Sales (Last 30 Days)" />
        )}

        {model && (
          <SaleTypeBreakdown modelId={model.id} />
        )}

        {model && (
          <ModelTransactionHistory modelId={model.id} />
        )}

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Chatters Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {chatterSales.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No sales data available for this model yet.
              </p>
            ) : (
              <>
                <ChatterFilters sortBy={sortBy} onSortChange={setSortBy} />
                <div className="space-y-4">
                  {sortedChatters.map((chatter, index) => (
                  <div
                    key={chatter.chatter_name}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                        #{index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{chatter.chatter_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {chatter.sheet_count} sheet{chatter.sheet_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-foreground">
                        ${chatter.total_sales.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {((chatter.total_sales / totalSales) * 100).toFixed(1)}% of total
                      </p>
                    </div>
                  </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ModelDetail;
