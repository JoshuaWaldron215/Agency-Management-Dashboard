import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { format } from "date-fns";
import { SheetDetailsDialog } from "./SheetDetailsDialog";
import { supabase } from "@/integrations/supabase/client";

interface ChatterSheet {
  id: string;
  chatter_name: string;
  week_start_date: string;
  commission_rate: number;
  hourly_rate: number;
  total_hours: number;
  bonus: number;
  timezone: string;
  chatter_user_id: string | null;
  isDeleted?: boolean;
}

interface SheetCardProps {
  sheet: ChatterSheet;
  onUpdate: () => void;
}

export function SheetCard({ sheet, onUpdate }: SheetCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [actualHours, setActualHours] = useState<number>(0);

  useEffect(() => {
    fetchActualHours();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('hours-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chatter_daily_hours',
          filter: `sheet_id=eq.${sheet.id}`
        },
        () => {
          fetchActualHours();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sheet.id]);

  const fetchActualHours = async () => {
    const { data, error } = await supabase
      .from("chatter_daily_hours")
      .select("hours_worked")
      .eq("sheet_id", sheet.id);
    
    if (!error && data) {
      const total = data.reduce((sum, record) => sum + Number(record.hours_worked), 0);
      setActualHours(total);
    }
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setDetailsOpen(true)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg">{sheet.chatter_name}</CardTitle>
              {sheet.isDeleted && (
                <Badge variant="secondary" className="text-xs">Deleted</Badge>
              )}
            </div>
            <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Commission:</span>
            <span className="font-medium">{sheet.commission_rate}%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Hours:</span>
<span className="font-medium">{actualHours.toFixed(1)}</span>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-2" onClick={(e) => {
            e.stopPropagation();
            setDetailsOpen(true);
          }}>
            View Details
          </Button>
        </CardContent>
      </Card>

      <SheetDetailsDialog 
        sheet={sheet}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onUpdate={onUpdate}
      />
    </>
  );
}
