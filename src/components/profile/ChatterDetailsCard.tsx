import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MessageSquare, Edit2, Link2, Unlink, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ChatterDetails {
  id: string;
  discord_username: string | null;
  pay_class: string;
  start_date: string;
  fansmetric_email: string | null;
}

export const ChatterDetailsCard = ({ userId }: { userId: string }) => {
  const [details, setDetails] = useState<ChatterDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingStartDate, setEditingStartDate] = useState(false);
  const [emailValue, setEmailValue] = useState("");
  const [startDateValue, setStartDateValue] = useState<Date>();
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDetails();
  }, [userId]);

  const fetchDetails = async () => {
    const { data } = await supabase
      .from("chatter_details")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (data) {
      setDetails(data);
      setEmailValue(data.fansmetric_email || "");
      setStartDateValue(data.start_date ? new Date(data.start_date) : undefined);
    }
    setLoading(false);
  };

  const handleSaveStartDate = async () => {
    if (!details || !startDateValue) return;

    const { error } = await supabase
      .from("chatter_details")
      .update({ start_date: format(startDateValue, "yyyy-MM-dd") })
      .eq("id", details.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update start date",
        variant: "destructive",
      });
    } else {
      toast({ title: "Success", description: "Start date updated" });
      setEditingStartDate(false);
      fetchDetails();
    }
  };

  const handleSaveEmail = async () => {
    if (!details) return;

    const { error } = await supabase
      .from("chatter_details")
      .update({ fansmetric_email: emailValue })
      .eq("id", details.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update email",
        variant: "destructive",
      });
    } else {
      toast({ title: "Success", description: "Email updated" });
      setEditingEmail(false);
      fetchDetails();
    }
  };

  const handleLinkDiscord = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/profile`,
        scopes: 'identify'
      }
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to initiate Discord linking",
        variant: "destructive",
      });
    }
  };

  const handleUnlinkDiscord = async () => {
    if (!details) return;

    const { error } = await supabase
      .from("chatter_details")
      .update({ discord_username: null })
      .eq("id", details.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to unlink Discord",
        variant: "destructive",
      });
    } else {
      toast({ title: "Success", description: "Discord unlinked" });
      fetchDetails();
    }
    setShowUnlinkDialog(false);
  };

  // Handle Discord OAuth callback
  useEffect(() => {
    const updateDiscordUsername = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.app_metadata?.provider === 'discord' && user?.user_metadata?.provider_id) {
        const discordUsername = user.user_metadata.custom_claims?.global_name || 
                                user.user_metadata.full_name || 
                                `discord_${user.user_metadata.provider_id}`;
        
        if (details && !details.discord_username) {
          const { error } = await supabase
            .from("chatter_details")
            .update({ discord_username: discordUsername })
            .eq("id", details.id);

          if (!error) {
            toast({ title: "Success", description: "Discord account linked!" });
            fetchDetails();
          }
        }
      }
    };

    if (details) {
      updateDiscordUsername();
    }
  }, [details]);

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card border-border shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <MessageSquare className="h-5 w-5" />
            Chatter Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">Discord Username</div>
              <div className="text-base font-medium text-foreground">
                {details?.discord_username || "Not linked"}
              </div>
            </div>
            {details?.discord_username ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowUnlinkDialog(true)}
                className="gap-2"
              >
                <Unlink className="h-4 w-4" />
                Unlink
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={handleLinkDiscord}
              >
                <Link2 className="h-4 w-4" />
                Link Discord
              </Button>
            )}
          </div>

          <div>
            <div className="text-sm text-muted-foreground">Pay Class</div>
            <div className="text-base font-medium text-foreground">{details?.pay_class}</div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">Start Date</div>
              {!editingStartDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingStartDate(true)}
                  className="h-8 w-8 p-0"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            {editingStartDate ? (
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDateValue && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDateValue ? format(startDateValue, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDateValue}
                      onSelect={setStartDateValue}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Button onClick={handleSaveStartDate} size="sm">Save</Button>
                <Button
                  onClick={() => {
                    setEditingStartDate(false);
                    setStartDateValue(details?.start_date ? new Date(details.start_date) : undefined);
                  }}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="text-base font-medium text-foreground">
                {details?.start_date && format(new Date(details.start_date), "dd MMM yyyy")}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">Fansmetric Email</div>
              {!editingEmail && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingEmail(true)}
                  className="h-8 w-8 p-0"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            {editingEmail ? (
              <div className="flex gap-2">
                <Input
                  value={emailValue}
                  onChange={(e) => setEmailValue(e.target.value)}
                  placeholder="Enter email"
                  className="bg-background"
                />
                <Button onClick={handleSaveEmail} size="sm">Save</Button>
                <Button
                  onClick={() => {
                    setEditingEmail(false);
                    setEmailValue(details?.fansmetric_email || "");
                  }}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="text-base font-medium text-foreground">
                {details?.fansmetric_email || "Not set"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showUnlinkDialog} onOpenChange={setShowUnlinkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink Discord Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlink your Discord account? You'll need to link it again to restore the connection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlinkDiscord} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Unlink
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
