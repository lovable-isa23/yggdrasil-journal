import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { TreeBranchItem } from "./TreeBranchItem";
import { cn } from "@/lib/utils";

interface Branch {
  id: string;
  goal_id: string;
  week_start_date: string;
  title: string;
  due_date: string | null;
  status: "not_started" | "in_progress" | "done";
  created_at: string;
}

interface SortableBranchItemProps {
  branch: Branch;
  onUpdate: (id: string, updates: Partial<Branch>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const SortableBranchItem = ({ branch, onUpdate, onDelete }: SortableBranchItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: branch.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-start gap-1",
        isDragging && "opacity-50 bg-accent/50 rounded-md"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 mt-0.5 touch-none"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <TreeBranchItem
          branch={branch}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
};
