import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";

interface JournalEditorProps {
  onEntryCreated: () => void;
}

export const JournalEditor = ({ onEntryCreated }: JournalEditorProps) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in both title and content");
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("You must be logged in to create entries");
        return;
      }

      const { error } = await supabase
        .from("journal_entries")
        .insert({
          user_id: user.id,
          title: title.trim(),
          content: content.trim(),
        });

      if (error) throw error;

      toast.success("Journal entry created!");
      setTitle("");
      setContent("");
      onEntryCreated();
    } catch (error: any) {
      console.error("Error creating entry:", error);
      toast.error(error.message || "Failed to create entry");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-card p-6 rounded-2xl border border-border shadow-medium">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          type="text"
          placeholder="Give your entry a title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="h-12 text-lg"
        />
      </div>

      <div className="space-y-2">
        <Label>Content</Label>
        <Tabs defaultValue="write" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="write" className="mt-4">
            <Textarea
              placeholder="Pour your thoughts here... (Markdown supported)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              className="min-h-[300px] resize-none font-mono text-sm"
            />
          </TabsContent>
          <TabsContent value="preview" className="mt-4">
            <div className="min-h-[300px] p-4 border border-border rounded-lg bg-muted/30 prose prose-sm max-w-none dark:prose-invert">
              {content ? (
                <ReactMarkdown>{content}</ReactMarkdown>
              ) : (
                <p className="text-muted-foreground italic">Nothing to preview yet...</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Button 
        type="submit" 
        className="w-full h-12 text-base bg-gradient-to-r from-primary to-earth-brown hover:scale-[1.02] transition-all duration-300"
        disabled={isLoading}
      >
        {isLoading ? "Saving..." : "Save Entry"}
      </Button>
    </form>
  );
};
