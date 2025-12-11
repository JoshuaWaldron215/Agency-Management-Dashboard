import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const ClockingCard = () => {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isOvertime, setIsOvertime] = useState(false);
  const { toast } = useToast();

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isClockedIn && clockInTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - clockInTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isClockedIn, clockInTime]);

  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleClock = () => {
    const newStatus = !isClockedIn;
    setIsClockedIn(newStatus);
    
    if (newStatus) {
      setClockInTime(new Date());
      setElapsedTime(0);
      setIsOvertime(false);
    } else {
      setClockInTime(null);
      setElapsedTime(0);
      setIsOvertime(false);
    }
    
    toast({
      title: newStatus ? "Clocked In" : "Clocked Out",
      description: newStatus 
        ? "You are now clocked in" 
        : `You worked for ${formatElapsedTime(elapsedTime)}`,
    });
  };

  const handleAddOvertime = () => {
    setIsOvertime(true);
    toast({
      title: "Overtime Activated",
      description: "Extended hours tracking enabled",
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="bg-card border-border shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Clock className="h-5 w-5" />
            Time Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isClockedIn && (
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Elapsed Time</div>
              <div className="text-3xl font-mono font-bold text-foreground">
                {formatElapsedTime(elapsedTime)}
              </div>
              {isOvertime && (
                <div className="text-xs text-primary mt-2 font-semibold">
                  OVERTIME MODE
                </div>
              )}
            </div>
          )}
          
          <Button
            onClick={handleToggleClock}
            variant={isClockedIn ? "destructive" : "default"}
            className="w-full"
            size="lg"
          >
            {isClockedIn ? "Clock Out" : "Clock In"}
          </Button>
        </CardContent>
      </Card>

      {isClockedIn && (
        <Card className="bg-card border-border shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Plus className="h-5 w-5" />
              Extended Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Working beyond regular hours? Activate overtime tracking.
            </p>
            
            <Button
              onClick={handleAddOvertime}
              variant={isOvertime ? "secondary" : "outline"}
              className="w-full"
              size="lg"
              disabled={isOvertime}
            >
              {isOvertime ? "Overtime Active" : "Add Overtime"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
