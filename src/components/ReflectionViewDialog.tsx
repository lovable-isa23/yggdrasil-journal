import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Calendar } from "lucide-react";
import { format } from "date-fns";

interface Reflection {
  id: string;
  created_at: string;
  reflection_type: string;
  what_worked?: string | null;
  what_challenged?: string | null;
  insights?: string | null;
  next_steps?: string | null;
}

interface ReflectionViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reflection: Reflection | null;
}

export const ReflectionViewDialog = ({ open, onOpenChange, reflection }: ReflectionViewDialogProps) => {
  if (!reflection) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="text-2xl capitalize">
              {reflection.reflection_type} Reflection
            </DialogTitle>
            <Badge variant="outline" className="gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(reflection.created_at), "MMM d, yyyy")}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {reflection.what_worked && (
            <div className="space-y-2">
              <h4 className="font-semibold text-primary">What Worked Well</h4>
              <p className="text-muted-foreground whitespace-pre-wrap">{reflection.what_worked}</p>
            </div>
          )}

          {reflection.what_challenged && (
            <div className="space-y-2">
              <h4 className="font-semibold text-primary">What Challenged Me</h4>
              <p className="text-muted-foreground whitespace-pre-wrap">{reflection.what_challenged}</p>
            </div>
          )}

          {reflection.insights && (
            <div className="space-y-2">
              <h4 className="font-semibold text-primary">Insights & Learnings</h4>
              <p className="text-muted-foreground whitespace-pre-wrap">{reflection.insights}</p>
            </div>
          )}

          {reflection.next_steps && (
            <div className="space-y-2">
              <h4 className="font-semibold text-primary">Next Steps</h4>
              <p className="text-muted-foreground whitespace-pre-wrap">{reflection.next_steps}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
