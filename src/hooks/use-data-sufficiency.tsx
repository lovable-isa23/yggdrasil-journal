import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DataSufficiency {
  hasMinimumData: boolean;
  totalEntries: number;
  deepEntries: number;
  analyzedEntries: number;
  isLoading: boolean;
  needsAnalysis: boolean;
}

export const useDataSufficiency = (minTotal = 5, minDeep = 3) => {
  const [data, setData] = useState<DataSufficiency>({
    hasMinimumData: false,
    totalEntries: 0,
    deepEntries: 0,
    analyzedEntries: 0,
    isLoading: true,
    needsAnalysis: false,
  });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setData(prev => ({ ...prev, isLoading: false }));
          return;
        }

        const { data: counts, error } = await supabase.rpc('get_entry_depth_counts', {
          p_user_id: user.id,
          p_min_deep_score: 5
        });

        if (error) throw error;

        const totalEntries = counts[0]?.total_entries || 0;
        const deepEntries = counts[0]?.deep_entries || 0;
        const analyzedEntries = counts[0]?.analyzed_entries || 0;

        const hasMinimumData = totalEntries >= minTotal && deepEntries >= minDeep;
        const needsAnalysis = totalEntries > 0 && analyzedEntries === 0;

        setData({
          hasMinimumData,
          totalEntries,
          deepEntries,
          analyzedEntries,
          isLoading: false,
          needsAnalysis,
        });
      } catch (error) {
        console.error("Error fetching data sufficiency:", error);
        setData(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchCounts();
  }, [minTotal, minDeep]);

  return data;
};
