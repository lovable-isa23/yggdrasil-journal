import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDataSufficiency } from "@/hooks/use-data-sufficiency";

interface InsightRow {
  id: string;
  entry_id: string;
  emotions: any;
  themes: any;
  entities: any;
  keywords: any;
  frameworks_applied: any;
  chakra_tags: any;
  tarot_tags: any;
  created_at: string;
  user_id: string;
  summary: string | null;
  depth_score: number | null;
  [key: string]: any;
}

interface JournalEntryRow {
  id: string;
  entry_date: string;
}

interface InsightsData {
  insights: InsightRow[];
  entries: JournalEntryRow[];
  userId: string | null;
  loading: boolean;
  hasMinimumData: boolean;
  totalEntries: number;
  deepEntries: number;
  analyzedEntries: number;
  needsAnalysis: boolean;
  isDataSufficiencyLoading: boolean;
  refetch: () => Promise<void>;
}

const InsightsDataContext = createContext<InsightsData | null>(null);

export const useInsightsData = () => {
  const ctx = useContext(InsightsDataContext);
  if (!ctx) throw new Error("useInsightsData must be used within InsightsDataProvider");
  return ctx;
};

export const InsightsDataProvider = ({ children }: { children: ReactNode }) => {
  const [insights, setInsights] = useState<InsightRow[]>([]);
  const [entries, setEntries] = useState<JournalEntryRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const sufficiency = useDataSufficiency();

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      const [insightsRes, entriesRes] = await Promise.all([
        supabase.from("entry_insights").select("*").eq("user_id", user.id),
        supabase.from("journal_entries").select("id, entry_date").eq("user_id", user.id).order("entry_date", { ascending: true }),
      ]);

      if (insightsRes.data) setInsights(insightsRes.data as InsightRow[]);
      if (entriesRes.data) setEntries(entriesRes.data);
    } catch (e) {
      console.error("InsightsDataProvider fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <InsightsDataContext.Provider
      value={{
        insights,
        entries,
        userId,
        loading,
        hasMinimumData: sufficiency.hasMinimumData,
        totalEntries: sufficiency.totalEntries,
        deepEntries: sufficiency.deepEntries,
        analyzedEntries: sufficiency.analyzedEntries,
        needsAnalysis: sufficiency.needsAnalysis,
        isDataSufficiencyLoading: sufficiency.isLoading,
        refetch: fetchData,
      }}
    >
      {children}
    </InsightsDataContext.Provider>
  );
};
