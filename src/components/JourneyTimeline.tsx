import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Loader2, Calendar, BookOpen, Target, Sparkles, Heart, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { ReflectionViewDialog } from "./ReflectionViewDialog";
import { cn } from "@/lib/utils";
import { ScrollArea } from "./ui/scroll-area";

interface TimelineEvent {
  id: string;
  date: string;
  type: "milestone" | "entry" | "reflection" | "practice";
  title: string;
  description?: string;
  completed?: boolean;
  fullData?: any;
}

interface JourneyTimelineProps {
  goalId: string;
  refreshTrigger?: number;
}

const MAX_VISIBLE_EVENTS = 5;

export const JourneyTimeline = ({ goalId, refreshTrigger }: JourneyTimelineProps) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReflection, setSelectedReflection] = useState<any>(null);
  const [isReflectionDialogOpen, setIsReflectionDialogOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchTimelineData();
  }, [goalId, refreshTrigger]);

  const fetchTimelineData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch milestones
      const { data: milestones } = await supabase
        .from("goal_milestones")
        .select("*")
        .eq("goal_id", goalId)
        .order("target_date", { ascending: true });

      // Fetch reflections
      const { data: reflections } = await supabase
        .from("goal_reflections")
        .select("*")
        .eq("goal_id", goalId)
        .order("created_at", { ascending: true });

      // Fetch and decrypt linked journal entries
      const { data: { session } } = await supabase.auth.getSession();
      const { data: decryptedData } = await supabase.functions.invoke('decrypt-entries', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      
      const entries = decryptedData?.entries?.filter((entry: any) => 
        entry.linked_goals?.includes(goalId)
      ).sort((a: any, b: any) => 
        new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
      ) || [];

      // Fetch practices
      const { data: practices } = await supabase
        .from("goal_practices")
        .select("id, title, created_at")
        .eq("goal_id", goalId)
        .order("created_at", { ascending: true });

      const timelineEvents: TimelineEvent[] = [];

      // Add milestones
      milestones?.forEach(milestone => {
        timelineEvents.push({
          id: milestone.id,
          date: milestone.completed_at || milestone.target_date || milestone.created_at,
          type: "milestone",
          title: milestone.title,
          description: milestone.description || undefined,
          completed: !!milestone.completed_at,
        });
      });

      // Add reflections
      reflections?.forEach(reflection => {
        timelineEvents.push({
          id: reflection.id,
          date: reflection.created_at,
          type: "reflection",
          title: `${reflection.reflection_type} reflection`,
          description: reflection.insights || reflection.what_worked || undefined,
          fullData: reflection,
        });
      });

      // Add journal entries
      entries?.forEach(entry => {
        timelineEvents.push({
          id: entry.id,
          date: entry.entry_date,
          type: "entry",
          title: entry.title,
          description: entry.content?.substring(0, 100) + "..." || undefined,
        });
      });

      // Add practice starts
      practices?.forEach(practice => {
        timelineEvents.push({
          id: practice.id,
          date: practice.created_at,
          type: "practice",
          title: `Started: ${practice.title}`,
        });
      });

      // Sort by date (newest first for display)
      timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setEvents(timelineEvents);
    } catch (error) {
      console.error("Error fetching timeline:", error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "milestone": return Target;
      case "entry": return BookOpen;
      case "reflection": return Heart;
      case "practice": return Sparkles;
      default: return Calendar;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case "milestone": return "text-blue-500";
      case "entry": return "text-purple-500";
      case "reflection": return "text-pink-500";
      case "practice": return "text-green-500";
      default: return "text-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="w-full max-w-full overflow-hidden p-8 text-center">
        <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground break-words">Your journey timeline will appear here as you add milestones, write entries, and reflect.</p>
      </Card>
    );
  }

  const handleReflectionClick = (event: TimelineEvent) => {
    if (event.type === "reflection" && event.fullData) {
      setSelectedReflection(event.fullData);
      setIsReflectionDialogOpen(true);
    }
  };

  const hasMore = events.length > MAX_VISIBLE_EVENTS;
  const visibleEvents = isExpanded ? events : events.slice(0, MAX_VISIBLE_EVENTS);

  const renderTimelineContent = () => (
    <div className="relative space-y-4 pl-8 border-l-2 border-border">
      {visibleEvents.map((event) => {
        const Icon = getEventIcon(event.type);
        const iconColor = getEventColor(event.type);
        
        return (
          <div key={event.id} className="relative">
            <div className={`absolute -left-[37px] p-2 rounded-full bg-background border-2 border-border ${iconColor}`}>
              <Icon className="h-4 w-4" />
            </div>
            
            <Card 
              className={cn(
                "w-full max-w-full overflow-hidden p-4 hover:shadow-md transition-shadow",
                event.type === "reflection" && "cursor-pointer"
              )}
              onClick={() => event.type === "reflection" && handleReflectionClick(event)}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <h5 className="font-medium break-words min-w-0 flex-1">{event.title}</h5>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {format(new Date(event.date), "MMM d, yyyy")}
                  </Badge>
                </div>
                
                {event.description && (
                  <p className="text-sm text-muted-foreground break-words line-clamp-2">{event.description}</p>
                )}
                
                {event.type === "milestone" && event.completed && (
                  <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400">
                    Completed
                  </Badge>
                )}
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <div className="space-y-4 w-full max-w-full overflow-hidden">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h4 className="font-semibold">Journey Timeline</h4>
            <Badge variant="secondary" className="text-xs">
              {events.length} events
            </Badge>
          </div>
          
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="gap-1 text-xs"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Show all {events.length}
                </>
              )}
            </Button>
          )}
        </div>
        
        {isExpanded && hasMore ? (
          <ScrollArea className="h-[400px] pr-4">
            {renderTimelineContent()}
          </ScrollArea>
        ) : (
          renderTimelineContent()
        )}

        {!isExpanded && hasMore && (
          <p className="text-sm text-muted-foreground text-center">
            +{events.length - MAX_VISIBLE_EVENTS} more events
          </p>
        )}
      </div>

      <ReflectionViewDialog
        open={isReflectionDialogOpen}
        onOpenChange={setIsReflectionDialogOpen}
        reflection={selectedReflection}
      />
    </>
  );
};
