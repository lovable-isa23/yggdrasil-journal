import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Calendar, Check, Circle, Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar as CalendarComponent } from "./ui/calendar";

interface Branch {
  id: string;
  goal_id: string;
  week_start_date: string;
  title: string;
  due_date: string | null;
  status: "not_started" | "in_progress" | "done";
  created_at: string;
}

interface TreeBranchItemProps {
  branch: Branch;
  onUpdate: (id: string, updates: Partial<Branch>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const statusConfig = {
  not_started: {
    label: "Not started",
    color: "bg-muted text-muted-foreground",
    icon: Circle,
  },
  in_progress: {
    label: "In progress",
    color: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    icon: MoreHorizontal,
  },
  done: {
    label: "Done",
    color: "bg-green-500/10 text-green-700 dark:text-green-400",
    icon: Check,
  },
};

export const TreeBranchItem = ({ branch, onUpdate, onDelete }: TreeBranchItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(branch.title);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);

  const config = statusConfig[branch.status];
  const StatusIcon = config.icon;

  const handleSaveTitle = async () => {
    if (editValue.trim() && editValue !== branch.title) {
      setIsUpdating(true);
      await onUpdate(branch.id, { title: editValue.trim() });
      setIsUpdating(false);
    }
    setIsEditing(false);
  };

  const cycleStatus = async () => {
    const statusOrder: ("not_started" | "in_progress" | "done")[] = ["not_started", "in_progress", "done"];
    const currentIndex = statusOrder.indexOf(branch.status);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    setIsUpdating(true);
    await onUpdate(branch.id, { status: nextStatus });
    setIsUpdating(false);
  };

  const handleDateSelect = async (date: Date | undefined) => {
    setIsUpdating(true);
    await onUpdate(branch.id, { due_date: date ? format(date, "yyyy-MM-dd") : null });
    setIsUpdating(false);
    setIsDateOpen(false);
  };

  return (
    <div className="flex flex-wrap items-start gap-2 group">
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 flex-shrink-0 mt-0.5"
        onClick={cycleStatus}
        disabled={isUpdating}
      >
        {isUpdating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <StatusIcon className={cn("h-4 w-4", branch.status === "done" && "text-green-600")} />
        )}
      </Button>

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value.slice(0, 100))}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
            autoFocus
            className="h-7 text-sm"
          />
        ) : (
          <span
            onClick={() => setIsEditing(true)}
            className={cn(
              "text-sm cursor-pointer hover:underline break-words block",
              branch.status === "done" && "line-through text-muted-foreground"
            )}
          >
            {branch.title}
          </span>
        )}
      </div>

      <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 px-2 text-xs gap-1",
              !branch.due_date && "opacity-0 group-hover:opacity-100 transition-opacity"
            )}
          >
            <Calendar className="h-3 w-3" />
            {branch.due_date ? format(new Date(branch.due_date), "EEE") : "Due"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <CalendarComponent
            mode="single"
            selected={branch.due_date ? new Date(branch.due_date) : undefined}
            onSelect={handleDateSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <Badge variant="secondary" className={cn("text-xs px-2 flex-shrink-0", config.color)}>
        {config.label}
      </Badge>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onDelete(branch.id)} className="text-destructive">
            <Trash2 className="h-3 w-3 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
