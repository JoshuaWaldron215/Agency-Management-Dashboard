import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Filter } from "lucide-react";

interface ChatterFiltersProps {
  sortBy: "sales" | "name" | "sheets";
  onSortChange: (value: "sales" | "name" | "sheets") => void;
}

export function ChatterFilters({ sortBy, onSortChange }: ChatterFiltersProps) {
  return (
    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
      <Filter className="h-4 w-4 text-muted-foreground" />
      <div className="flex items-center gap-2">
        <Label htmlFor="sort-by" className="text-sm">Sort by:</Label>
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger id="sort-by" className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sales">Sales (High to Low)</SelectItem>
            <SelectItem value="name">Name (A-Z)</SelectItem>
            <SelectItem value="sheets">Number of Sheets</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
