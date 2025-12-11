import { ParsedTransaction, EarningsStats, CategoryTotals } from "./types";

const PLATFORM_FEE = 0.20;

function calculateCategoryTotals(transactions: ParsedTransaction[]): CategoryTotals {
  if (transactions.length === 0) {
    return { gross: 0, net: 0, count: 0 };
  }

  const gross = transactions.reduce((sum, t) => sum + t.gross, 0);
  const net = transactions.reduce((sum, t) => sum + t.net, 0);

  return {
    gross,
    net,
    count: transactions.length,
  };
}

export function calculateEarningsStats(
  transactions: ParsedTransaction[]
): EarningsStats {
  // Categorize transactions
  const tips = transactions.filter((t) => t.category === "Tip");
  const subscriptions = transactions.filter((t) => t.category === "Subscription");
  const welcomeMessages = transactions.filter((t) => t.category === "Welcome");
  const bundles = transactions.filter((t) => t.category === "Bundle");
  const ppvMessages = transactions.filter((t) => t.category === "PPV Message");
  
  // Categorize by amount form (exclude subs, welcome from whole number sales)
  const wholeNumberSales = transactions.filter((t) => {
    const isWholeNumber = Math.round(t.gross * 100) % 100 === 0;
    const isTip = t.category === "Tip";
    const isSubscription = t.category === "Subscription";
    const isWelcome = t.category === "Welcome";
    // Exclude tips, subscriptions, and welcome from whole number sales
    return isWholeNumber && !isTip && !isSubscription && !isWelcome;
  });
  
  // PPV Sales = PPV MESSAGE category only
  const ppvSalesTransactions = ppvMessages;
  
  // Bundle Sales = Bundle category only
  const bundleSalesTransactions = bundles;
  
  // Chatter's Sales = whole-number sales (excluding subs/welcome) + all Tips
  const chatterSalesTransactions = [...wholeNumberSales, ...tips];
  
  // Calculate totals for each category
  const chatterSales = calculateCategoryTotals(chatterSalesTransactions);
  const tipsTotal = calculateCategoryTotals(tips);
  const ppvSales = calculateCategoryTotals(ppvSalesTransactions);
  const bundleSales = calculateCategoryTotals(bundleSalesTransactions);
  const subscriptionsTotal = calculateCategoryTotals(subscriptions);
  const welcomeMessagesTotal = calculateCategoryTotals(welcomeMessages);
  const overall = calculateCategoryTotals(transactions);

  // Hourly breakdown (using net for tracking)
  const hourlyMap = new Map<number, number>();
  transactions.forEach((t) => {
    const current = hourlyMap.get(t.hour) || 0;
    hourlyMap.set(t.hour, current + t.net);
  });

  const hourlyBreakdown = Array.from(hourlyMap.entries())
    .map(([hour, total]) => ({ hour, total }))
    .filter((h) => h.total > 0)
    .sort((a, b) => a.hour - b.hour);

  return {
    chatterSales: {
      ...chatterSales,
      wholeNumberCount: wholeNumberSales.length,
      tipCount: tips.length,
    },
    tips: tipsTotal,
    ppvSales,
    bundleSales,
    subscriptions: subscriptionsTotal,
    welcomeMessages: welcomeMessagesTotal,
    overall,
    hourlyBreakdown,
  };
}

export function exportToCSV(
  transactions: ParsedTransaction[],
  currency: string
): string {
  const headers = ["Date", "Time", "Gross", "Fee", "Net", "Category", "Description"];
  const rows = transactions.map((t) => [
    t.date,
    t.time,
    `${currency}${t.gross.toFixed(2)}`,
    `${currency}${t.fee.toFixed(2)}`,
    `${currency}${t.net.toFixed(2)}`,
    t.category,
    t.description,
  ]);

  return [headers, ...rows].map((row) => row.join(",")).join("\n");
}
