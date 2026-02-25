import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useInsightsData } from "@/contexts/InsightsDataContext";

interface TarotTag {
  card: string;
  description?: string;
}

export const TarotAnalytics = () => {
  const { insights, loading } = useInsightsData();

  const tarotData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const insight of insights) {
      const tags = insight.tarot_tags as unknown as TarotTag[] | null;
      if (!tags || !Array.isArray(tags)) continue;
      for (const tag of tags) {
        const name = tag.card;
        if (name) counts.set(name, (counts.get(name) || 0) + 1);
      }
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([card, count]) => ({ card, count }));
  }, [insights]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (tarotData.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          🃏 Tarot Archetype Frequency
        </CardTitle>
        <CardDescription>
          Most recurring tarot archetypes across your journal entries
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tarotData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="card" width={120} tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 13 }}
                formatter={(value: number) => [`${value} entries`, "Mentions"]}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
