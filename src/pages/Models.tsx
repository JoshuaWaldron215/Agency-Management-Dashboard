import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Image, Trash2, Plus, Archive, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/contexts/UserRoleContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Model {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const Models = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loading, isAdmin } = useUserRole();
  const [models, setModels] = useState<Model[]>([]);
  const [isAddModelOpen, setIsAddModelOpen] = useState(false);
  const [newModelName, setNewModelName] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/auth");
    }
  }, [loading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadModels();
    }
  }, [isAdmin, showArchived]);

  const loadModels = async () => {
    try {
      let query = supabase
        .from("models")
        .select("*")
        .order("name", { ascending: true });

      if (!showArchived) {
        query = query.is("deleted_at", null);
      }

      const { data, error } = await query;

      if (error) throw error;
      setModels(data || []);
    } catch (error) {
      console.error("Error loading models:", error);
      setModels([]);
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
      toast({
        title: "Success",
        description: "Model added successfully",
      });
      setNewModelName("");
      setIsAddModelOpen(false);
      loadModels();
    }
  };

  const handleArchiveModel = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to archive "${name}"? It will disappear from dropdowns starting next week, but all historical sales data will be preserved.`)) {
      return;
    }

    const { error } = await supabase
      .from("models")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error archiving model",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Model Archived",
        description: `"${name}" has been archived. Toggle "Show Archived" to view it.`,
      });
      loadModels();
    }
  };

  const handleRestoreModel = async (id: string, name: string) => {
    const { error } = await supabase
      .from("models")
      .update({ deleted_at: null })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error restoring model",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Model Restored",
        description: `"${name}" has been restored and is now active.`,
      });
      loadModels();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center" style={{ minHeight: "calc(100vh - 4rem)" }}>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const activeModels = models.filter(m => !m.deleted_at);
  const archivedModels = models.filter(m => m.deleted_at);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">Models Management</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="show-archived"
                checked={showArchived}
                onCheckedChange={setShowArchived}
                data-testid="switch-show-archived"
              />
              <Label htmlFor="show-archived" className="text-sm text-muted-foreground cursor-pointer">
                Show Archived ({archivedModels.length})
              </Label>
            </div>
            <Button onClick={() => setIsAddModelOpen(true)} className="gap-2" data-testid="button-add-model">
              <Plus className="h-4 w-4" />
              Add New Model
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">Add and manage all models in the system</p>

        {showArchived && archivedModels.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Archived Models
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {archivedModels.map((model) => (
                <Card 
                  key={model.id} 
                  className="bg-card/50 border-border opacity-75 hover:opacity-100 transition-all cursor-pointer"
                  onClick={() => navigate(`/${encodeURIComponent(model.name)}`)}
                  data-testid={`card-model-archived-${model.id}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 rounded-lg bg-muted">
                            <Image className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">{model.name}</h3>
                            <Badge variant="secondary" className="text-xs mt-1">
                              Archived
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Archived: {new Date(model.deleted_at!).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestoreModel(model.id, model.name);
                        }}
                        className="h-8 gap-1"
                        data-testid={`button-restore-model-${model.id}`}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restore
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {showArchived && archivedModels.length > 0 && (
            <h2 className="text-lg font-semibold text-foreground">Active Models</h2>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeModels.map((model) => (
              <Card 
                key={model.id} 
                className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/${encodeURIComponent(model.name)}`)}
                data-testid={`card-model-${model.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Image className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">{model.name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Created: {new Date(model.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchiveModel(model.id, model.name);
                      }}
                      className="h-8 w-8 p-0"
                      data-testid={`button-delete-model-${model.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={isAddModelOpen} onOpenChange={setIsAddModelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Model</DialogTitle>
            <DialogDescription>
              Enter the name of the model you want to add
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="modelName">Model Name</Label>
            <Input
              id="modelName"
              value={newModelName}
              onChange={(e) => setNewModelName(e.target.value)}
              placeholder="Enter model name"
              className="mt-2"
              data-testid="input-model-name"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddModel();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModelOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddModel} data-testid="button-confirm-add-model">Add Model</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Models;
