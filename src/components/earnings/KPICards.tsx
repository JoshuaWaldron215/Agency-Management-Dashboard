import { Card } from "@/components/ui/card";
import { EarningsStats, CategoryTotals } from "./types";

interface KPICardsProps {
  stats: EarningsStats | null;
  currency: string;
}

function CategoryCard({ 
  title, 
  subtitle, 
  gross, 
  net, 
  count, 
  footer,
  currency 
}: { 
  title: string; 
  subtitle?: string; 
  gross: number; 
  net: number; 
  count: number;
  footer?: string;
  currency: string;
}) {
  const formatCurrency = (value: number) => `${currency}${Math.abs(value).toFixed(2)}`;
  
  return (
    <Card className="p-6">
      <p className="text-sm text-muted-foreground mb-1">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground mb-3">{subtitle}</p>}
      <div className="flex items-baseline gap-4 mb-2">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Gross</p>
          <p className="text-2xl font-bold">{formatCurrency(gross)}</p>
        </div>
        <div className="text-muted-foreground text-2xl">|</div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Net</p>
          <p className="text-2xl font-bold text-muted-foreground">{formatCurrency(net)}</p>
        </div>
      </div>
      {footer && <p className="text-xs text-muted-foreground mt-2">{footer}</p>}
    </Card>
  );
}

export function KPICards({ stats, currency }: KPICardsProps) {
  if (!stats) {
    return (
      <div className="space-y-4">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-2">Chatter's Sales</p>
          <p className="text-3xl font-bold">—</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-2">Tips</p>
          <p className="text-3xl font-bold">—</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-2">PPV Sales</p>
          <p className="text-3xl font-bold">—</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-2">Bundle Sales</p>
          <p className="text-3xl font-bold">—</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-2">Subscription Income</p>
          <p className="text-3xl font-bold">—</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-2">Welcome Messages Revenue</p>
          <p className="text-3xl font-bold">—</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-2">Overall</p>
          <p className="text-3xl font-bold">—</p>
        </Card>
      </div>
    );
  }

  const wholeNumberCount = stats.chatterSales.wholeNumberCount || 0;
  const tipCount = stats.chatterSales.tipCount || 0;

  return (
    <div className="space-y-4">
      <CategoryCard
        title="Chatter's Sales"
        subtitle="Gross/Net from whole-number sales + all Tips"
        gross={stats.chatterSales.gross}
        net={stats.chatterSales.net}
        count={stats.chatterSales.count}
        footer={`${wholeNumberCount} whole-number sales • ${tipCount} tips`}
        currency={currency}
      />

      <CategoryCard
        title="Tips"
        gross={stats.tips.gross}
        net={stats.tips.net}
        count={stats.tips.count}
        currency={currency}
      />

      <CategoryCard
        title="PPV Sales"
        subtitle="Excludes Bundles"
        gross={stats.ppvSales.gross}
        net={stats.ppvSales.net}
        count={stats.ppvSales.count}
        footer={`${stats.ppvSales.count} rows (decimals forced to PPV)`}
        currency={currency}
      />

      <CategoryCard
        title="Bundle Sales"
        gross={stats.bundleSales.gross}
        net={stats.bundleSales.net}
        count={stats.bundleSales.count}
        footer={`${stats.bundleSales.count} whole-number bundles`}
        currency={currency}
      />

      <CategoryCard
        title="Subscription Income"
        gross={stats.subscriptions.gross}
        net={stats.subscriptions.net}
        count={stats.subscriptions.count}
        footer={`${stats.subscriptions.count} subs`}
        currency={currency}
      />

      <CategoryCard
        title="Welcome Messages Revenue"
        gross={stats.welcomeMessages.gross}
        net={stats.welcomeMessages.net}
        count={stats.welcomeMessages.count}
        currency={currency}
      />

      <CategoryCard
        title="Overall"
        subtitle="Net = rowwise (fee ? amount−fee : amount×80%)"
        gross={stats.overall.gross}
        net={stats.overall.net}
        count={stats.overall.count}
        currency={currency}
      />
    </div>
  );
}