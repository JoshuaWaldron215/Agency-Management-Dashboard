import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Download, Trash2, Calculator, Copy, FileSpreadsheet, Loader2, Calendar, User, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { parseTransactions } from "./transactionParser";
import { calculateEarningsStats, exportToCSV } from "./earningsCalculator";
import { ParsedTransaction, TransactionCategory, CATEGORY_OPTIONS } from "./types";
import { KPICards } from "./KPICards";
import { HourlyChart } from "./HourlyChart";
import { ChatterSalesChart } from "./ChatterSalesChart";
import { TransactionsTable } from "./TransactionsTable";
import { HourlySalesSubsBreakdown } from "./HourlySalesSubsBreakdown";
import { useToast } from "@/hooks/use-toast";
import { useSaveToSheet } from "@/hooks/useSaveToSheet";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { startOfWeekStr } from "@/lib/etDate";

const SAMPLE_DATA = `Oct 8, 202511:54 am $14.99 $3.00 $11.99 Recurring subscription from BootyLover
Oct 8, 202511:28 am $14.99 $3.00 $11.99 Subscription from Nicholas Rodriguez
Oct 8, 202511:27 am $50.01 $10.00 $40.01 Payment for message from Fuunyan
Oct 8, 202510:50 am $70.00 $14.00 $56.00 Payment for message from u176153426
Oct 8, 202510:30 am $14.99 $3.00 $11.99 Subscription from Toby banks`;

const MOCK_MODELS = [
  { id: "m1", name: "Bella Rose" },
  { id: "m2", name: "Crystal Divine" },
  { id: "m3", name: "Luna Star" },
  { id: "m4", name: "Mia Valentine" },
  { id: "m5", name: "Scarlett Blaze" },
  { id: "m6", name: "Ruby Diamond" },
];

export function EarningsCalculator() {
  const { toast } = useToast();
  const { saveToSheet, isSaving, useMockData } = useSaveToSheet();
  const [inputText, setInputText] = useState("");
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [skippedLines, setSkippedLines] = useState<string[]>([]);
  const [currency, setCurrency] = useState("$");
  const [autoParse, setAutoParse] = useState(true);
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [sessionDate, setSessionDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [useMockModels, setUseMockModels] = useState(false);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const { data, error } = await supabase
          .from("models")
          .select("id, name")
          .is("deleted_at", null)
          .order("name");

        if (!error && data && data.length > 0) {
          setModels(data);
        } else {
          setModels(MOCK_MODELS);
          setUseMockModels(true);
        }
      } catch {
        setModels(MOCK_MODELS);
        setUseMockModels(true);
      }
    };

    fetchModels();
  }, []);

  const handleParse = async () => {
    if (!inputText.trim()) {
      toast({
        title: "No data to parse",
        description: "Please paste your transaction data first.",
        variant: "destructive",
      });
      return;
    }

    const result = parseTransactions(inputText);
    setTransactions(result.transactions);
    setSkippedLines(result.skippedLines);
    setCurrency(result.currency);

    toast({
      title: "Parsing complete",
      description: `Parsed ${result.transactions.length} transaction${result.transactions.length !== 1 ? "s" : ""}${
        result.skippedLines.length > 0 ? `, skipped ${result.skippedLines.length} invalid line${result.skippedLines.length !== 1 ? "s" : ""}` : ""
      }.`,
    });
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (autoParse) {
      setTimeout(() => {
        handleParse();
      }, 10);
    }
  };

  const handleClear = () => {
    setInputText("");
    setTransactions([]);
    setSkippedLines([]);
    setCurrency("$");
    setSelectedModel("");
    setSessionDate(new Date());
  };

  const handleCopyProblemLines = async () => {
    if (skippedLines.length === 0) return;
    
    try {
      await navigator.clipboard.writeText(skippedLines.join("\n"));
      toast({
        title: "Copied to clipboard",
        description: `${skippedLines.length} problem line${skippedLines.length !== 1 ? "s" : ""} copied.`,
      });
    } catch {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadCSV = () => {
    if (transactions.length === 0) {
      toast({
        title: "No data to export",
        description: "Parse transactions first before exporting.",
        variant: "destructive",
      });
      return;
    }

    const csv = exportToCSV(transactions, currency);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `earnings-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "CSV Downloaded",
      description: "Your transaction data has been exported.",
    });
  };

  const handleSaveToSheet = async () => {
    if (!selectedModel) {
      toast({
        title: "Model required",
        description: "Please select a model before saving.",
        variant: "destructive",
      });
      return;
    }

    if (transactions.length === 0) {
      toast({
        title: "No transactions",
        description: "Please parse transactions before saving.",
        variant: "destructive",
      });
      return;
    }

    const modelName = models.find((m) => m.id === selectedModel)?.name || "Unknown Model";
    
    const result = await saveToSheet(
      selectedModel,
      modelName,
      sessionDate,
      transactions.map((t) => ({
        gross: t.gross,
        net: t.net,
        category: t.category,
      }))
    );

    if (result.success) {
      toast({
        title: "Saved to Sheet",
        description: result.message,
      });
      handleClear();
    } else {
      toast({
        title: "Save failed",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  const handleCategoryChange = (index: number, newCategory: TransactionCategory) => {
    setTransactions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], category: newCategory };
      return updated;
    });
  };

  const stats = transactions.length > 0 ? calculateEarningsStats(transactions) : null;

  const getSummaryStats = () => {
    if (!stats) return null;

    const ppvCategories = CATEGORY_OPTIONS.filter(c => c.group === "ppv").map(c => c.value);
    const ppvCount = transactions.filter(t => ppvCategories.includes(t.category)).length;
    const welcomeCount = transactions.filter(t => t.category === "Welcome" || t.category === "Welcome Message").length;
    const subscriptionCount = transactions.filter(t => t.category === "Subscription" || t.category === "Recurring Subscription").length;
    
    return {
      ppvCount,
      welcomeCount,
      subscriptionCount,
      totalGross: stats.overall.gross,
      totalNet: stats.overall.net,
      totalTransactions: transactions.length,
    };
  };

  const summaryStats = getSummaryStats();
  const canSave = transactions.length > 0 && selectedModel && !isSaving;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Earnings Calculator</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Paste your tab-separated transaction data to calculate your earnings.
        </p>
      </div>

      <Card className="p-4 border-teal-500/30 bg-teal-500/5">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label htmlFor="model-select" className="text-sm font-medium mb-2 block">
              <User className="h-4 w-4 inline mr-2" />
              Select Model
            </Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger 
                id="model-select"
                className="w-full"
                data-testid="select-model"
              >
                <SelectValue placeholder="Choose a model..." />
              </SelectTrigger>
              <SelectContent>
                {models.length === 0 ? (
                  <SelectItem value="none" disabled>No active models found</SelectItem>
                ) : (
                  models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label className="text-sm font-medium mb-2 block">
              <Calendar className="h-4 w-4 inline mr-2" />
              Session Date
            </Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !sessionDate && "text-muted-foreground"
                  )}
                  data-testid="button-session-date"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {sessionDate ? format(sessionDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={sessionDate}
                  onSelect={(date) => {
                    if (date) {
                      setSessionDate(date);
                      setCalendarOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-parse"
                  checked={autoParse}
                  onCheckedChange={setAutoParse}
                />
                <Label htmlFor="auto-parse" className="text-sm cursor-pointer">
                  Auto-parse on paste
                </Label>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleParse} className="gap-2">
                <Calculator className="h-4 w-4" />
                <span className="shiny-text">Parse</span>
              </Button>
              <Button onClick={handleClear} variant="outline" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
              <Button
                onClick={handleDownloadCSV}
                variant="outline"
                className="gap-2"
                disabled={transactions.length === 0}
              >
                <Download className="h-4 w-4" />
                Download CSV
              </Button>
            </div>

            <div className="overflow-hidden rounded-lg border border-input">
              <div 
                className="sticky top-0 z-10 bg-background border-b border-input px-5 py-3"
                role="row"
              >
                <div 
                  className="grid gap-4 text-xs font-medium tracking-wide uppercase text-muted-foreground/70"
                  style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 3fr' }}
                >
                  <div role="columnheader">Date &amp; Time</div>
                  <div role="columnheader">Amount</div>
                  <div role="columnheader">Fee</div>
                  <div role="columnheader">Net</div>
                  <div role="columnheader">Description</div>
                </div>
              </div>

              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onPaste={handlePaste}
                placeholder={SAMPLE_DATA}
                className="font-mono text-xs min-h-[400px] border-0 rounded-t-none focus-visible:ring-0 focus-visible:ring-offset-0"
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                    handleParse();
                  }
                }}
                data-testid="textarea-transactions"
              />
            </div>

            {skippedLines.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription className="flex items-center justify-between">
                  <span>
                    {skippedLines.length} line{skippedLines.length !== 1 ? "s" : ""} could not be parsed.
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyProblemLines}
                    className="gap-2 h-8"
                  >
                    <Copy className="h-3 w-3" />
                    Copy problem lines
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <KPICards stats={stats} currency={currency} />
        </div>
      </div>

      {summaryStats && (
        <Card className="p-6 border-purple-500/30 bg-purple-500/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-purple-400" />
              Save to Sheet
            </h3>
            {(useMockData || useMockModels) && (
              <Badge variant="outline" className="text-yellow-400 border-yellow-400/50">
                Demo Mode
              </Badge>
            )}
          </div>

          <div className="mb-4 p-3 rounded-lg bg-secondary/20 border border-border/30">
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Week: <span className="font-medium text-foreground">{startOfWeekStr(sessionDate.toISOString().split("T")[0])}</span> (Sat-Fri)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-6">
            <div className="text-center p-3 rounded-lg bg-secondary/30 border border-border/50">
              <div className="text-2xl font-bold text-foreground">{summaryStats.totalTransactions}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Transactions</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/30 border border-border/50">
              <div className="text-2xl font-bold gradient-text-teal">{summaryStats.ppvCount}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">PPV Sales</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/30 border border-border/50">
              <div className="text-2xl font-bold text-purple-400">{summaryStats.subscriptionCount}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Subscriptions</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/30 border border-border/50">
              <div className="text-2xl font-bold text-yellow-400">{summaryStats.welcomeCount}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Welcome Msgs</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/30 border border-border/50">
              <div className="text-2xl font-bold text-green-400">{currency}{summaryStats.totalGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Gross Revenue</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/30 border border-border/50">
              <div className="text-2xl font-bold text-teal-400">{currency}{summaryStats.totalNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Net Revenue</div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1 text-sm text-muted-foreground">
              {selectedModel ? (
                <span>
                  Saving <span className="font-semibold text-foreground">{models.find(m => m.id === selectedModel)?.name}</span> earnings for <span className="font-semibold text-foreground">{format(sessionDate, "EEEE, MMM d")}</span>
                </span>
              ) : (
                <span className="text-yellow-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Please select a model above before saving
                </span>
              )}
            </div>
            <Button
              onClick={handleSaveToSheet}
              disabled={!canSave}
              className="gap-2 min-w-[180px] bg-gradient-to-r from-teal-500 to-purple-500 hover:from-teal-600 hover:to-purple-600"
              data-testid="button-save-to-sheet"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4" />
                  Save to Sheet
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {stats && (
        <>
          <HourlySalesSubsBreakdown transactions={transactions} currency={currency} />
          <ChatterSalesChart transactions={transactions} currency={currency} />
          <HourlyChart data={stats.hourlyBreakdown} currency={currency} />
          <TransactionsTable transactions={transactions} currency={currency} onCategoryChange={handleCategoryChange} />
        </>
      )}
    </div>
  );
}
