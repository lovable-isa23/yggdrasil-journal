import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useInsightsData } from "@/contexts/InsightsDataContext";

interface ChakraTag {
  chakra: string;
  description?: string;
}

const CHAKRA_ORDER = [
  { name: "Crown", color: "hsl(270, 60%, 60%)" },
  { name: "Third Eye", color: "hsl(240, 50%, 55%)" },
  { name: "Throat", color: "hsl(200, 70%, 55%)" },
  { name: "Heart", color: "hsl(140, 55%, 45%)" },
  { name: "Solar Plexus", color: "hsl(45, 90%, 50%)" },
  { name: "Sacral", color: "hsl(25, 85%, 55%)" },
  { name: "Root", color: "hsl(0, 65%, 50%)" },
];

export const ChakraAnalytics = () => {
  const { insights, loading } = useInsightsData();

  const chakraData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const insight of insights) {
      const tags = insight.chakra_tags as unknown as ChakraTag[] | null;
      if (!tags || !Array.isArray(tags)) continue;
      for (const tag of tags) {
        const name = tag.chakra;
        if (name) counts.set(name, (counts.get(name) || 0) + 1);
      }
    }

    return CHAKRA_ORDER.map(c => ({
      chakra: c.name,
      count: counts.get(c.name) || 0,
      color: c.color,
    }));
  }, [insights]);

  const hasData = chakraData.some(d => d.count > 0);

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

  if (!hasData) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          🧘 Chakra Resonance
        </CardTitle>
        <CardDescription>
          Which energy centers appear most in your journal reflections
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chakraData} layout="vertical" margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="chakra" width={90} tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 13 }}
                formatter={(value: number) => [`${value} entries`, "Mentions"]}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={28}>
                {chakraData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
