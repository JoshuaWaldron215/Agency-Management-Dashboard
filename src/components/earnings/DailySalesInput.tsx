import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { todayETStr, startOfWeekStr } from "@/lib/etDate";

interface Model {
  id: string;
  name: string;
}

interface SalesEntry {
  id: string;
  model_id: string;
  amount: string;
}

export function DailySalesInput() {
  const { toast } = useToast();
  const [models, setModels] = useState<Model[]>([]);
  const [mySheet, setMySheet] = useState<{ id: string; chatter_name: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(todayETStr());
  const [salesEntries, setSalesEntries] = useState<SalesEntry[]>([
    { id: crypto.randomUUID(), model_id: "", amount: "" }
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchModels();
    fetchMySheet();
  }, [selectedDate]);

  const fetchModels = async () => {
    // Only show active models (not soft-deleted)
    const { data, error } = await supabase
      .from("models")
      .select("id, name")
      .is("deleted_at", null)
      .order("name");

    if (!error && data) {
      setModels(data);
    }
  };

  const fetchMySheet = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("No authenticated user");
        return;
      }

      const todayStr = todayETStr();
      const weekStart = startOfWeekStr(todayStr); // Get the Saturday of current week
      console.log("Fetching sheet for week starting:", weekStart);

      const { data, error } = await supabase
        .from("chatter_sheets")
        .select("*")
        .eq("chatter_user_id", user.id)
        .eq("week_start_date", weekStart)
        .maybeSingle();

      if (error) {
        console.error("Error fetching sheet:", error);
        return;
      }

      if (data) {
        setMySheet(data);
        console.log("Found sheet for week:", data);
      } else {
        console.log("No sheet found for this week");
        toast({
          title: "No sheet found",
          description: "No sheet found for the current week. Please contact an admin.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in fetchMySheet:", error);
    }
  };

  const handleAddEntry = () => {
    setSalesEntries([...salesEntries, { id: crypto.randomUUID(), model_id: "", amount: "" }]);
  };

  const handleRemoveEntry = (id: string) => {
    if (salesEntries.length === 1) return;
    setSalesEntries(salesEntries.filter(entry => entry.id !== id));
  };

  const handleEntryChange = (id: string, field: keyof SalesEntry, value: string) => {
    setSalesEntries(salesEntries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const validateEntries = (): boolean => {
    const usedModels = new Set<string>();
    
    for (const entry of salesEntries) {
      if (!entry.model_id) {
        toast({
          title: "Model required",
          description: "Please select a model for all entries",
          variant: "destructive",
        });
        return false;
      }
      
      if (!entry.amount || parseFloat(entry.amount) <= 0) {
        toast({
          title: "Invalid amount",
          description: "Please enter valid sales amounts greater than 0",
          variant: "destructive",
        });
        return false;
      }

      if (usedModels.has(entry.model_id)) {
        const modelName = models.find(m => m.id === entry.model_id)?.name;
        toast({
          title: "Duplicate model",
          description: `You cannot use ${modelName} twice for the same day`,
          variant: "destructive",
        });
        return false;
      }
      
      usedModels.add(entry.model_id);
    }
    
    return true;
  };

  const handleSubmit = async () => {
    console.log("Submit started, mySheet:", mySheet);
    console.log("Selected date:", selectedDate);
    
    if (!mySheet) {
      toast({
        title: "No sheet found",
        description: "No active sheet found for you. Please contact an admin.",
        variant: "destructive",
      });
      return;
    }

    if (!validateEntries()) {
      return;
    }

    setLoading(true);

    try {
      for (const entry of salesEntries) {
        // Ensure date is in correct format without timezone conversion
        const saleDate = selectedDate; // Keep as YYYY-MM-DD string
        
        console.log("Upserting entry:", {
          sheet_id: mySheet.id,
          model_id: entry.model_id,
          sale_date: saleDate,
          sales_amount: parseFloat(entry.amount)
        });
        
        const { data, error } = await supabase
          .from("chatter_sheet_daily_sales")
          .upsert({
            sheet_id: mySheet.id,
            model_id: entry.model_id,
            sale_date: saleDate,
            sales_amount: parseFloat(entry.amount)
          }, {
            onConflict: 'sheet_id,model_id,sale_date'
          })
          .select();

        if (error) {
          console.error("Upsert error:", error);
          throw error;
        }
        
        console.log("Upserted data:", data);
      }

      toast({
        title: "Sales saved",
        description: "Your sales have been saved successfully!",
      });
      
      setSalesEntries([{ id: crypto.randomUUID(), model_id: "", amount: "" }]);
    } catch (error: any) {
      console.error("Error saving sales - Full error:", error);
      console.error("Error details:", {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      });
      
      let errorMessage = "Failed to save sales. Please try again.";
      if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Input Daily Sales</h3>
          <p className="text-sm text-muted-foreground">
            Add your sales by model for the selected date
          </p>
        </div>

        <div>
          <Label htmlFor="sale-date">Date</Label>
          <Input
            id="sale-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={todayETStr()}
          />
        </div>

        <div className="space-y-3">
          {salesEntries.map((entry, index) => (
            <div key={entry.id} className="flex gap-2 items-end">
              <div className="flex-1">
                <Label htmlFor={`model-${entry.id}`}>Model</Label>
                <Select
                  value={entry.model_id}
                  onValueChange={(value) => handleEntryChange(entry.id, "model_id", value)}
                >
                  <SelectTrigger id={`model-${entry.id}`}>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <Label htmlFor={`amount-${entry.id}`}>Sales Amount ($)</Label>
                <Input
                  id={`amount-${entry.id}`}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={entry.amount}
                  onChange={(e) => handleEntryChange(entry.id, "amount", e.target.value)}
                />
              </div>

              {salesEntries.length > 1 && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleRemoveEntry(entry.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleAddEntry} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Model
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-2">
            <Save className="h-4 w-4" />
            {loading ? "Saving..." : "Save Sales"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
