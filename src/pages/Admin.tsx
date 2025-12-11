import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Image, Trash2, Shield, User, Users, ArrowRight, ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserRole, UserRole } from "@/contexts/UserRoleContext";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/auditLog";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Model {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}



const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loading, isAdmin } = useUserRole();
  const [models, setModels] = useState<Model[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isAddModelOpen, setIsAddModelOpen] = useState(false);
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
  const [isManageModelsOpen, setIsManageModelsOpen] = useState(false);
  const [newModelName, setNewModelName] = useState("");
  const [todayActivities, setTodayActivities] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
    };
    
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadModels();
      loadUsers();
      loadTodayActivities();
    }
  }, [isAdmin]);

  const loadTodayActivities = async () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const { count, error } = await supabase
        .from("audit_logs")
        .select("*", { count: "exact", head: true })
        .gte("timestamp", `${today}T00:00:00`)
        .lte("timestamp", `${today}T23:59:59`);

      if (error) throw error;
      setTodayActivities(count || 0);
    } catch (error) {
      console.error("Error loading today's activities:", error);
    }
  };

  const loadModels = async () => {
    const { data, error } = await supabase
      .from("models")
      .select("*")
      .is("deleted_at", null)
      .order("name", { ascending: true });

    if (error) {
      toast({
        title: "Error loading models",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setModels(data || []);
    }
  };

  const loadUsers = async () => {
    try {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, email, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles: UserProfile[] = (profiles || []).map(profile => {
        const userRole = userRoles?.find(ur => ur.user_id === profile.id);
        return {
          ...profile,
          role: (userRole?.role as UserRole) || null,
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error loading users:", error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!newRole) return;

    try {
      // Check if user already has a role entry
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from("user_roles")
          .update({ role: newRole })
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: newRole });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "User role updated successfully",
      });

      loadUsers();
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await fetch("/api/delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete user");
      }

      toast({
        title: "Success",
        description: `User ${userName} has been deleted`,
      });

      loadUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const handleAddModel = async () => {
    if (!newModelName.trim()) {
      toast({
        title: "Error",
        description: "Model name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("models")
      .insert({ name: newModelName.trim() });

    if (error) {
      toast({
        title: "Error adding model",
        description: error.message,
        variant: "destructive",
      });
    } else {
      logAudit({
        actionType: 'CREATE',
        resourceType: 'MODEL',
        resourceName: newModelName.trim(),
        details: {}
      });
      toast({
        title: "Success",
        description: "Model added successfully",
      });
      setNewModelName("");
      setIsAddModelOpen(false);
      loadModels();
    }
  };

  const handleDeleteModel = async (id: string) => {
    const modelToDelete = models.find(m => m.id === id);
    const { error } = await supabase
      .from("models")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error deleting model",
        description: error.message,
        variant: "destructive",
      });
    } else {
      logAudit({
        actionType: 'DELETE',
        resourceType: 'MODEL',
        resourceId: id,
        resourceName: modelToDelete?.name || 'Unknown',
        details: {}
      });
      toast({
        title: "Success",
        description: "Model deleted successfully",
      });
      loadModels();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center" style={{ minHeight: "calc(100vh - 4rem)" }}>
          <Card className="w-full max-w-md p-8">
            <p className="text-center text-muted-foreground">Loading...</p>
          </Card>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center" style={{ minHeight: "calc(100vh - 4rem)" }}>
          <Card className="w-full max-w-md p-8">
            <div className="flex flex-col items-center gap-6 text-center">
              <h2 className="text-2xl font-bold text-foreground">Access Denied</h2>
              <p className="text-muted-foreground">
                You do not have permission to access this page. Only administrators can view this content.
              </p>
              <Button onClick={() => navigate('/')} className="w-full">
                Return Home
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-4 sm:p-6 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">
            Manage team members and models
          </p>
        </div>

        {/* Admin Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Team Members Card */}
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground mb-2">Team Members</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage your team members and their access to FansMetric
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => navigate('/team-members')}
                className="w-full gap-2"
              >
                Manage Members
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Models Card */}
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Image className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground mb-2">Models</h3>
                  <p className="text-sm text-muted-foreground">
                    Add and manage models in the system
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => navigate('/models')}
                className="w-full gap-2"
              >
                Manage Models
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Audit Log Card */}
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 rounded-lg bg-primary/10">
                  <ClipboardList className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground mb-2">Audit Log</h3>
                  <p className="text-sm text-muted-foreground">
                    View all system activities and changes
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-4">{todayActivities}</p>
                  <p className="text-xs text-muted-foreground">Activities today</p>
                </div>
              </div>
              <Button 
                onClick={() => navigate('/audit-log')}
                className="w-full gap-2"
              >
                View Audit Log
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

        </div>

      </div>

      {/* Manage Members Dialog */}
      <Dialog open={isManageMembersOpen} onOpenChange={setIsManageMembersOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members
            </DialogTitle>
            <DialogDescription>
              View all registered users and manage their roles
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Select
                        value={user.role || ""}
                        onValueChange={(value) => handleRoleChange(user.id, value as UserRole)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="No role">
                            {user.role ? (
                              <span className="flex items-center gap-2">
                                {user.role === "admin" ? (
                                  <Shield className="h-4 w-4" />
                                ) : (
                                  <User className="h-4 w-4" />
                                )}
                                {user.role}
                              </span>
                            ) : (
                              "No role"
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            <span className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Admin
                            </span>
                          </SelectItem>
                          <SelectItem value="chatter">
                            <span className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Chatter
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Models Dialog */}
      <Dialog open={isManageModelsOpen} onOpenChange={setIsManageModelsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Models Management
            </DialogTitle>
            <DialogDescription>
              Add and manage models in the system
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Button onClick={() => setIsAddModelOpen(true)}>
              Add Model
            </Button>

            {models.length > 0 && (
              <div className="space-y-2">
                {models.map((model) => (
                  <div
                    key={model.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <span className="font-medium">{model.name}</span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteModel(model.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Model Dialog */}
      <Dialog open={isAddModelOpen} onOpenChange={setIsAddModelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Model</DialogTitle>
            <DialogDescription>
              Enter the name of the model to add to the system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="model-name">Model Name</Label>
              <Input
                id="model-name"
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                placeholder="Enter model name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddModel();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModelOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddModel}>Add Model</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
