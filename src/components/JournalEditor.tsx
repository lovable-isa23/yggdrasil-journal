import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { journalEntrySchema, type JournalEntryFormData } from "@/lib/validations";

interface JournalEditorProps {
  onEntryCreated: () => void;
}

export const JournalEditor = ({ onEntryCreated }: JournalEditorProps) => {
  const [entryDate, setEntryDate] = useState<Date>(new Date());
  
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<JournalEntryFormData>({
    resolver: zodResolver(journalEntrySchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });

  const title = watch("title");
  const content = watch("content");

  const onSubmit = async (data: JournalEntryFormData) => {
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
          title: data.title,
          content: data.content,
          entry_date: format(new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate()), "yyyy-MM-dd"),
        });

      if (error) throw error;

      toast.success("Journal entry created!");
      reset();
      setEntryDate(new Date());
      onEntryCreated();
    } catch (error: any) {
      toast.error(error.message || "Failed to create entry");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-card p-6 rounded-2xl border border-border shadow-medium">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          type="text"
          placeholder="Give your entry a title..."
          {...register("title")}
          className="h-12 text-lg"
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Entry Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full h-12 justify-start text-left font-normal",
                !entryDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {entryDate ? format(entryDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={entryDate}
              onSelect={(date) => date && setEntryDate(date)}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>Content</Label>
        <Tabs defaultValue="write" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="write" className="mt-4 space-y-2">
            <Textarea
              placeholder="Pour your thoughts here... (Markdown supported)"
              {...register("content")}
              className="min-h-[300px] resize-none font-mono text-sm"
            />
            {errors.content && (
              <p className="text-sm text-destructive">{errors.content.message}</p>
            )}
          </TabsContent>
          <TabsContent value="preview" className="mt-4">
            <div className="min-h-[300px] p-4 border border-border rounded-lg bg-muted/30 prose prose-sm max-w-none dark:prose-invert">
              {content ? (
                <ReactMarkdown
                  disallowedElements={['script', 'iframe', 'object', 'embed']}
                  unwrapDisallowed={true}
                >
                  {content}
                </ReactMarkdown>
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
        disabled={isSubmitting}
      >
        {isSubmitting ? "Saving..." : "Save Entry"}
      </Button>
    </form>
  );
};
