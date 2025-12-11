import { Trophy, Award, Crown, Star, Gem, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AchievementBadgeProps {
  earnings: number;
  size?: "sm" | "md" | "lg";
}

interface Achievement {
  threshold: number;
  name: string;
  icon: any;
  color: string;
  gradient: string;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    threshold: 100000,
    name: "Diamond Elite",
    icon: Gem,
    color: "text-cyan-400",
    gradient: "from-cyan-400 to-blue-600",
  },
  {
    threshold: 50000,
    name: "$50K Club",
    icon: Crown,
    color: "text-purple-400",
    gradient: "from-purple-400 to-pink-600",
  },
  {
    threshold: 25000,
    name: "$25K Achiever",
    icon: Award,
    color: "text-yellow-400",
    gradient: "from-yellow-400 to-orange-600",
  },
  {
    threshold: 10000,
    name: "$10K Milestone",
    icon: Star,
    color: "text-green-400",
    gradient: "from-green-400 to-emerald-600",
  },
  {
    threshold: 5000,
    name: "Rising Star",
    icon: Sparkles,
    color: "text-blue-400",
    gradient: "from-blue-400 to-indigo-600",
  },
];

export const AchievementBadge = ({ earnings, size = "md" }: AchievementBadgeProps) => {
  const earned = ACHIEVEMENTS.filter(a => earnings >= a.threshold);
  
  if (earned.length === 0) return null;

  const topAchievement = earned[0];
  const Icon = topAchievement.icon;

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const badgeSizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`${badgeSizeClasses[size]} bg-gradient-to-r ${topAchievement.gradient} text-white border-0 shadow-lg hover:shadow-xl transition-all cursor-help`}
          >
            <Icon className={`${sizeClasses[size]} mr-1`} />
            {topAchievement.name}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold">Achievements Earned:</p>
            <div className="space-y-1">
              {earned.map((achievement) => {
                const AchIcon = achievement.icon;
                return (
                  <div key={achievement.name} className="flex items-center gap-2 text-sm">
                    <AchIcon className={`h-4 w-4 ${achievement.color}`} />
                    <span>{achievement.name}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Total Earnings: ${earnings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const getNextMilestone = (earnings: number): Achievement | null => {
  const unearned = ACHIEVEMENTS.filter(a => earnings < a.threshold);
  return unearned[unearned.length - 1] || null;
};
