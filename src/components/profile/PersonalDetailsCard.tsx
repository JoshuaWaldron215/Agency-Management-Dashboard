import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Upload, Edit2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Profile {
  name: string;
  email: string;
  dob: string;
  avatar_url: string | null;
}

export const PersonalDetailsCard = ({ userId }: { userId: string }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("name, email, dob, avatar_url")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        toast.error("Failed to load profile data");
      }
      
      if (data) {
        setProfile(data);
        setNameValue(data.name);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [userId]);

  const handleSaveName = async () => {
    if (!nameValue.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ name: nameValue.trim() })
      .eq("id", userId);

    if (error) {
      toast.error("Failed to update name");
    } else {
      toast.success("Name updated successfully");
      setProfile(prev => prev ? { ...prev, name: nameValue.trim() } : null);
      setEditingName(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      // Upload image to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      toast.success('Avatar updated successfully');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

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
    <Card className="bg-card border-border shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <User className="h-5 w-5" />
          Personal Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center gap-4">
          <Avatar className="h-32 w-32">
            <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name} />
            <AvatarFallback className="text-2xl">
              {profile?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
              disabled={uploading}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload Avatar'}
            </Button>
          </div>
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">Full Name</div>
            {!editingName && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingName(true)}
                className="h-8 w-8 p-0"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          {editingName ? (
            <div className="flex gap-2">
              <Input
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                placeholder="Enter your name"
                className="bg-background"
              />
              <Button onClick={handleSaveName} size="sm">Save</Button>
              <Button
                onClick={() => {
                  setEditingName(false);
                  setNameValue(profile?.name || "");
                }}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="text-base font-medium text-foreground">{profile?.name}</div>
          )}
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Email</div>
          <div className="text-base font-medium text-foreground">{profile?.email}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Date of Birth</div>
          <div className="text-base font-medium text-foreground">
            {profile?.dob && format(new Date(profile.dob), "dd MMM yyyy")}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
