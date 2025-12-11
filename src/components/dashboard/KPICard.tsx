import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  subtitle: string;
  change?: number;
  icon: LucideIcon;
  variant?: "default" | "teal" | "purple" | "yellow";
}

export function KPICard({ 
  title, 
  value, 
  subtitle, 
  change, 
  icon: Icon,
  variant = "default" 
}: KPICardProps) {
  const cardStyles = {
    default: "stat-card",
    teal: "stat-card-accent",
    purple: "stat-card glass-card-purple",
    yellow: "stat-card glass-card-yellow",
  };

  const iconStyles = {
    default: "icon-container",
    teal: "icon-container-teal",
    purple: "icon-container-purple",
    yellow: "icon-container-yellow",
  };

  const valueStyles = {
    default: "text-foreground",
    teal: "gradient-text-teal",
    purple: "gradient-text",
    yellow: "gradient-text-yellow",
  };

  return (
    <div className={`${cardStyles[variant]} relative overflow-hidden`} data-testid={`kpi-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="absolute top-4 right-4 opacity-10">
        <Icon className="h-16 w-16" />
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
        </div>
        
        <div className={`text-3xl font-bold mb-1 ${valueStyles[variant]}`}>
          {value}
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{subtitle}</span>
          {change !== undefined && (
            <span className={`flex items-center gap-0.5 text-xs font-medium ${
              change >= 0 ? "text-emerald-400" : "text-red-400"
            }`}>
              {change >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(change)}% vs last week
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
