import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  target: string;
  icon: LucideIcon;
  variant?: "teal" | "purple" | "yellow";
  progress?: number;
}

export function MetricCard({ 
  title, 
  value, 
  target, 
  icon: Icon,
  variant = "purple",
  progress = 0
}: MetricCardProps) {
  const iconStyles = {
    teal: "icon-container-teal",
    purple: "icon-container-purple",
    yellow: "icon-container-yellow",
  };

  const valueStyles = {
    teal: "gradient-text-teal",
    purple: "gradient-text",
    yellow: "gradient-text-yellow",
  };

  const progressStyles = {
    teal: "bg-gradient-to-r from-teal-500 to-teal-400",
    purple: "bg-gradient-to-r from-purple-500 to-pink-500",
    yellow: "bg-gradient-to-r from-yellow-500 to-amber-400",
  };

  return (
    <div className="stat-card" data-testid={`metric-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className={iconStyles[variant]}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
      </div>
      
      <div className={`text-4xl font-bold mb-3 ${valueStyles[variant]}`}>
        {value}
      </div>

      <div className="space-y-2">
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${progressStyles[variant]}`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Target: {target}
        </p>
      </div>
    </div>
  );
}
