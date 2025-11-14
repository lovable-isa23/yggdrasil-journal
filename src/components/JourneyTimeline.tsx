import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Loader2, Calendar, BookOpen, Target, Sparkles, Heart } from "lucide-react";
import { format } from "date-fns";

interface TimelineEvent {
  id: string;
  date: string;
  type: "milestone" | "entry" | "reflection" | "practice";
  title: string;
  description?: string;
  completed?: boolean;
}

interface JourneyTimelineProps {
  goalId: string;
}

export const JourneyTimeline = ({ goalId }: JourneyTimelineProps) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimelineData();
  }, [goalId]);

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

      // Fetch linked journal entries
      const { data: entries } = await supabase
        .from("journal_entries")
        .select("*")
        .contains("linked_goals", [goalId])
        .order("entry_date", { ascending: true });

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

      // Sort by date
      timelineEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
      <Card className="p-8 text-center">
        <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground">Your journey timeline will appear here as you add milestones, write entries, and reflect.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        <h4 className="font-semibold">Journey Timeline</h4>
      </div>
      
      <div className="relative space-y-4 pl-8 border-l-2 border-border">
        {events.map((event, index) => {
          const Icon = getEventIcon(event.type);
          const iconColor = getEventColor(event.type);
          
          return (
            <div key={event.id} className="relative">
              <div className={`absolute -left-[37px] p-2 rounded-full bg-background border-2 border-border ${iconColor}`}>
                <Icon className="h-4 w-4" />
              </div>
              
              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="font-medium">{event.title}</h5>
                    <Badge variant="outline" className="text-xs">
                      {format(new Date(event.date), "MMM d, yyyy")}
                    </Badge>
                  </div>
                  
                  {event.description && (
                    <p className="text-sm text-muted-foreground">{event.description}</p>
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
    </div>
  );
};
