import { useState, useEffect } from "react";
import { X, Tag, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TagSelectorProps {
  entryId: string;
  currentTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function TagSelector({ entryId, currentTags, onTagsChange }: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>(currentTags);
  const [allTags, setAllTags] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchAllTags();
    }
  }, [open]);

  useEffect(() => {
    setSelectedTags(currentTags);
  }, [currentTags]);

  const fetchAllTags = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('journal_entries')
      .select('tags')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching tags:', error);
      return;
    }

    const tagSet = new Set<string>();
    data?.forEach((entry: any) => {
      if (entry.tags && Array.isArray(entry.tags)) {
        entry.tags.forEach((tag: string) => tagSet.add(tag));
      }
    });

    setAllTags(Array.from(tagSet).sort());
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      const newTags = [...selectedTags, trimmedTag];
      setSelectedTags(newTags);
    }
    setInputValue("");
  };

  const removeTag = (tag: string) => {
    const newTags = selectedTags.filter(t => t !== tag);
    setSelectedTags(newTags);
  };

  const handleSave = async () => {
    const { error } = await supabase
      .from('journal_entries')
      .update({ tags: selectedTags })
      .eq('id', entryId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update tags",
        variant: "destructive",
      });
      return;
    }

    onTagsChange(selectedTags);
    setOpen(false);
    toast({
      title: "Success",
      description: "Tags updated successfully",
    });
  };

  const suggestedTags = allTags.filter(
    tag => !selectedTags.includes(tag) && 
           (!inputValue || tag.includes(inputValue.toLowerCase()))
  ).slice(0, 8);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs hover:bg-accent">
          <Tag className="h-3 w-3" />
          <span className="hidden sm:inline">Tags</span>
          {currentTags.length > 0 && (
            <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium">
              {currentTags.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add tag... (press Enter)"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag(inputValue);
                }
              }}
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={() => addTag(inputValue)}
              disabled={!inputValue.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {selectedTags.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Selected Tags</p>
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    #{tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {suggestedTags.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Suggestions</p>
              <div className="flex flex-wrap gap-2">
                {suggestedTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => addTag(tag)}
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
