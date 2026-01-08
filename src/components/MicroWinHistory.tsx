import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./ui/sheet";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Sparkles, Search, Trash2, Edit2, Check, X } from "lucide-react";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { toast } from "sonner";

interface MicroWin {
  id: string;
  text: string;
  source: string;
  created_at: string;
}

interface MicroWinHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wins: MicroWin[];
  goalTitle: string;
  onUpdate: () => void;
}

export const MicroWinHistory = ({
  open,
  onOpenChange,
  wins,
  goalTitle,
  onUpdate,
}: MicroWinHistoryProps) => {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const filteredWins = wins.filter((win) =>
    win.text.toLowerCase().includes(search.toLowerCase())
  );

  const groupedWins = filteredWins.reduce((acc, win) => {
    const date = new Date(win.created_at);
    let group: string;

    if (isToday(date)) {
      group = "Today";
    } else if (isYesterday(date)) {
      group = "Yesterday";
    } else if (isThisWeek(date, { weekStartsOn: 1 })) {
      group = "This Week";
    } else {
      group = format(date, "MMMM yyyy");
    }

    if (!acc[group]) acc[group] = [];
    acc[group].push(win);
    return acc;
  }, {} as Record<string, MicroWin[]>);

  const handleEdit = (win: MicroWin) => {
    setEditingId(win.id);
    setEditText(win.text);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editText.trim()) return;

    try {
      const { error } = await supabase
        .from("micro_wins")
        .update({ text: editText.trim() })
        .eq("id", editingId);

      if (error) throw error;

      toast.success("Micro-win updated");
      setEditingId(null);
      setEditText("");
      onUpdate();
    } catch (error) {
      console.error("Error updating micro-win:", error);
      toast.error("Failed to update");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("micro_wins").delete().eq("id", id);

      if (error) throw error;

      toast.success("Micro-win deleted");
      onUpdate();
    } catch (error) {
      console.error("Error deleting micro-win:", error);
      toast.error("Failed to delete");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Micro-Win History</SheetTitle>
          <SheetDescription>{goalTitle}</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search wins..."
              className="pl-9"
            />
          </div>

          {filteredWins.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {search ? "No wins match your search" : "No micro-wins yet"}
            </p>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedWins).map(([group, groupWins]) => (
                <div key={group}>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    {group}
                  </h4>
                  <div className="space-y-2">
                    {groupWins.map((win) => (
                      <Card key={win.id} className="p-3">
                        {editingId === win.id ? (
                          <div className="flex gap-2">
                            <Input
                              value={editText}
                              onChange={(e) =>
                                setEditText(e.target.value.slice(0, 140))
                              }
                              className="flex-1"
                              autoFocus
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={handleSaveEdit}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setEditingId(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm break-words">{win.text}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(win.created_at), "h:mm a")}
                                </span>
                                {win.source === "ai_suggested" && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs py-0 px-1.5 gap-0.5"
                                  >
                                    <Sparkles className="h-2.5 w-2.5" />
                                    AI
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => handleEdit(win)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(win.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
