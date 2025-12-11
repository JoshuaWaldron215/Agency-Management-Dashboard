import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Users, Download } from "lucide-react";
import { ModelEarnings } from "@/hooks/useDashboardData";
import { downloadCSV, formatCurrency as formatCSVCurrency } from "@/lib/csvExport";
import { toast } from "sonner";

interface ModelEarningsBreakdownProps {
  modelEarnings: ModelEarnings[];
  periodLabel?: string | null;
}

const rankColors = [
  "text-amber-400",
  "text-gray-300", 
  "text-amber-600",
];

export function ModelEarningsBreakdown({ modelEarnings, periodLabel }: ModelEarningsBreakdownProps) {
  const useFiltered = !!periodLabel && periodLabel !== "All Time";
  
  const sortedEarnings = useFiltered 
    ? [...modelEarnings].sort((a, b) => b.filtered - a.filtered)
    : modelEarnings;
  
  const filteredWithData = useFiltered 
    ? sortedEarnings.filter(m => m.filtered > 0)
    : sortedEarnings;

  if (filteredWithData.length === 0) {
    return (
      <div className="stat-card">
        <div className="flex items-center gap-2 mb-4">
          <div className="icon-container-purple">
            <Users className="h-5 w-5" />
          </div>
          <span className="text-sm font-semibold text-foreground uppercase tracking-wider">
            EARNINGS BY MODEL
          </span>
          {periodLabel && (
            <Badge variant="secondary" className="text-xs ml-2">
              {periodLabel}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          {useFiltered 
            ? `No model earnings data for ${periodLabel}.`
            : "No model data available yet. Earnings will appear here once you start logging sales for specific models."
          }
        </p>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalForPeriod = useFiltered 
    ? filteredWithData.reduce((sum, m) => sum + m.filtered, 0)
    : filteredWithData.reduce((sum, m) => sum + m.allTime, 0);

  const handleExportCSV = () => {
    const headers = ["Rank", "Model Name", "Earnings", "Percentage", "Period"];
    const rows = filteredWithData.map((model, index) => {
      const displayValue = useFiltered ? model.filtered : model.allTime;
      const percentage = totalForPeriod > 0 ? Math.round((displayValue / totalForPeriod) * 100) : 0;
      return [
        index + 1,
        model.modelName,
        formatCSVCurrency(displayValue),
        `${percentage}%`,
        periodLabel || "All Time"
      ];
    });

    downloadCSV({
      filename: `model-earnings-${(periodLabel || 'all-time').replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}`,
      headers,
      rows
    });

    toast.success(`Exported ${filteredWithData.length} models`);
  };

  return (
    <div className="stat-card" data-testid="model-earnings-breakdown">
      <div className="flex items-center justify-between gap-2 mb-6 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="icon-container-purple">
            <Crown className="h-5 w-5" />
          </div>
          <span className="text-sm font-semibold text-foreground uppercase tracking-wider">
            EARNINGS BY MODEL
          </span>
          {periodLabel && (
            <Badge variant="secondary" className="text-xs">
              {periodLabel}
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2" data-testid="button-export-model-earnings">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {filteredWithData.map((model, index) => {
          const displayValue = useFiltered ? model.filtered : model.allTime;
          const percentage = totalForPeriod > 0 ? Math.round((displayValue / totalForPeriod) * 100) : 0;
          const barWidth = totalForPeriod > 0 ? (displayValue / totalForPeriod) * 100 : 0;
          
          return (
            <div 
              key={model.modelId} 
              className="p-3 rounded-lg bg-muted/30 space-y-3"
              data-testid={`row-model-${model.modelId}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold ${index < 3 ? rankColors[index] : 'text-muted-foreground'}`}>
                    #{index + 1}
                  </span>
                  <span className="font-semibold text-foreground" data-testid={`text-model-name-${model.modelId}`}>
                    {model.modelName}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {percentage}%
                  </Badge>
                </div>
                <span className="text-lg font-bold gradient-text" data-testid={`text-model-alltime-${model.modelId}`}>
                  {formatCurrency(displayValue)}
                </span>
              </div>
              
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-700"
                  style={{ width: `${barWidth}%` }}
                />
              </div>

              {!useFiltered && (
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">Today</span>
                    <p className="font-medium text-foreground" data-testid={`text-model-today-${model.modelId}`}>
                      {formatCurrency(model.today)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Last 7 Days</span>
                    <p className="font-medium text-foreground" data-testid={`text-model-last7-${model.modelId}`}>
                      {formatCurrency(model.last7)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Last 30 Days</span>
                    <p className="font-medium text-foreground" data-testid={`text-model-last30-${model.modelId}`}>
                      {formatCurrency(model.last30)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
