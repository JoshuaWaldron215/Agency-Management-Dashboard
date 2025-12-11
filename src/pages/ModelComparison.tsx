import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Model {
  id: string;
  name: string;
}

interface ModelStats {
  id: string;
  name: string;
  totalSales: number;
  activeChatters: number;
  avgPerChatter: number;
  topChatter: string;
  topChatterSales: number;
}

const ModelComparison = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [modelStats, setModelStats] = useState<ModelStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    const modelIds = searchParams.get("models")?.split(",").filter(Boolean) || [];
    if (modelIds.length > 0) {
      setSelectedModels(modelIds);
      loadModelStats(modelIds);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const loadModels = async () => {
    const { data, error } = await supabase
      .from("models")
      .select("id, name")
      .is("deleted_at", null)
      .order("name");

    if (error) {
      toast({
        title: "Error loading models",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setModels(data || []);
    }
  };

  const loadModelStats = async (modelIds: string[]) => {
    setLoading(true);
    const stats: ModelStats[] = [];

    for (const modelId of modelIds) {
      const model = models.find(m => m.id === modelId);
      if (!model) continue;

      const { data: salesData } = await supabase
        .from("chatter_sheet_daily_sales")
        .select(`
          sales_amount,
          sheet_id,
          chatter_sheets!inner(
            chatter_name
          )
        `)
        .eq("model_id", modelId);

      const chatterMap = new Map<string, number>();
      let total = 0;

      salesData?.forEach((sale: any) => {
        const chatterName = sale.chatter_sheets.chatter_name;
        const amount = Number(sale.sales_amount);
        total += amount;
        chatterMap.set(chatterName, (chatterMap.get(chatterName) || 0) + amount);
      });

      const chatters = Array.from(chatterMap.entries()).sort((a, b) => b[1] - a[1]);
      const topChatter = chatters[0];

      stats.push({
        id: modelId,
        name: model.name,
        totalSales: total,
        activeChatters: chatters.length,
        avgPerChatter: chatters.length > 0 ? total / chatters.length : 0,
        topChatter: topChatter?.[0] || "N/A",
        topChatterSales: topChatter?.[1] || 0,
      });
    }

    setModelStats(stats);
    setLoading(false);
  };

  const handleAddModel = (modelId: string) => {
    if (!selectedModels.includes(modelId) && selectedModels.length < 5) {
      const newSelected = [...selectedModels, modelId];
      setSelectedModels(newSelected);
      setSearchParams({ models: newSelected.join(",") });
    }
  };

  const handleRemoveModel = (modelId: string) => {
    const newSelected = selectedModels.filter(id => id !== modelId);
    setSelectedModels(newSelected);
    if (newSelected.length > 0) {
      setSearchParams({ models: newSelected.join(",") });
    } else {
      setSearchParams({});
      setModelStats([]);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-4 sm:p-6 space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/models")}
          className="gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Models
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Model Comparison</h1>
            <p className="text-muted-foreground mt-1">Compare sales performance across multiple models</p>
          </div>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Select Models to Compare (Max 5)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="model-select">Add Model:</Label>
                <Select onValueChange={handleAddModel}>
                  <SelectTrigger id="model-select" className="w-[300px]">
                    <SelectValue placeholder="Choose a model..." />
                  </SelectTrigger>
                  <SelectContent>
                    {models
                      .filter(m => !selectedModels.includes(m.id))
                      .map(model => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedModels.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedModels.map(modelId => {
                    const model = models.find(m => m.id === modelId);
                    return model ? (
                      <div key={modelId} className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
                        <span className="text-sm font-medium">{model.name}</span>
                        <button
                          onClick={() => handleRemoveModel(modelId)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          ×
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <p className="text-center text-muted-foreground">Loading comparison data...</p>
        ) : modelStats.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-16 text-center">
              <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Select models above to start comparing</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modelStats.map((stat) => (
                <Card key={stat.id} className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-xl">{stat.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Sales</p>
                      <p className="text-2xl font-bold text-foreground">
                        ${stat.totalSales.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Active Chatters</p>
                      <p className="text-xl font-semibold text-foreground">
                        {stat.activeChatters}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg per Chatter</p>
                      <p className="text-xl font-semibold text-foreground">
                        ${Math.round(stat.avgPerChatter).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Top Chatter</p>
                      <p className="text-sm font-medium text-foreground">{stat.topChatter}</p>
                      <p className="text-lg font-bold text-primary">
                        ${stat.topChatterSales.toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Model</th>
                        <th className="text-right p-3 text-sm font-medium text-muted-foreground">Total Sales</th>
                        <th className="text-right p-3 text-sm font-medium text-muted-foreground">Chatters</th>
                        <th className="text-right p-3 text-sm font-medium text-muted-foreground">Avg/Chatter</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modelStats
                        .sort((a, b) => b.totalSales - a.totalSales)
                        .map((stat, index) => (
                          <tr key={stat.id} className="border-b border-border/50">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                  #{index + 1}
                                </span>
                                <span className="font-medium text-foreground">{stat.name}</span>
                              </div>
                            </td>
                            <td className="text-right p-3 font-semibold text-foreground">
                              ${stat.totalSales.toLocaleString()}
                            </td>
                            <td className="text-right p-3 text-foreground">{stat.activeChatters}</td>
                            <td className="text-right p-3 text-foreground">
                              ${Math.round(stat.avgPerChatter).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelComparison;
