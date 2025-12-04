import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, TrendingUp, BarChart3 } from "lucide-react";
import { format, subMonths, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface FrameworkInfo {
  name: string;
  icon: string;
  category: 'spiritual' | 'depth' | 'modern';
  color: string;
}

const FRAMEWORK_CONFIG: Record<string, FrameworkInfo> = {
  theravada: { name: 'Theravada Buddhism', icon: '☸️', category: 'spiritual', color: 'hsl(var(--chart-1))' },
  hermetic: { name: 'Hermeticism', icon: '🔮', category: 'spiritual', color: 'hsl(var(--chart-2))' },
  advaita: { name: 'Vedanta', icon: '🕉️', category: 'spiritual', color: 'hsl(var(--chart-3))' },
  taoist: { name: 'Taoism', icon: '☯️', category: 'spiritual', color: 'hsl(var(--chart-4))' },
  freudian: { name: 'Freudian', icon: '🔺', category: 'depth', color: 'hsl(var(--chart-5))' },
  jungian: { name: 'Jungian', icon: '🌓', category: 'depth', color: 'hsl(221 83% 53%)' },
  attachment: { name: 'Attachment', icon: '💕', category: 'modern', color: 'hsl(160 84% 39%)' },
  ifs: { name: 'IFS', icon: '🎭', category: 'modern', color: 'hsl(172 66% 50%)' },
  cbt: { name: 'CBT', icon: '💭', category: 'modern', color: 'hsl(189 94% 43%)' },
  dbt: { name: 'DBT', icon: '⚖️', category: 'modern', color: 'hsl(199 89% 48%)' },
};

const normalizeFramework = (fw: string): string | null => {
  const normalized = fw.toLowerCase().replace(/[_\s]/g, '');
  if (normalized.includes('theravada') || normalized.includes('buddhis')) return 'theravada';
  if (normalized.includes('hermetic') || normalized.includes('hermeticism')) return 'hermetic';
  if (normalized.includes('advaita') || normalized.includes('vedanta')) return 'advaita';
  if (normalized.includes('taoist') || normalized.includes('taoism')) return 'taoist';
  if (normalized.includes('freudian') || normalized.includes('psychoanaly')) return 'freudian';
  if (normalized.includes('jungian') || normalized.includes('jung')) return 'jungian';
  if (normalized.includes('attachment')) return 'attachment';
  if (normalized.includes('ifs') || normalized.includes('internalfamily')) return 'ifs';
  if (normalized.includes('cbt') || normalized.includes('cognitivebehavior')) return 'cbt';
  if (normalized.includes('dbt') || normalized.includes('dialectical')) return 'dbt';
  return null;
};

interface InsightData {
  id: string;
  entry_date: string;
  frameworks_applied: string[] | null;
}

interface FrameworkStat {
  id: string;
  name: string;
  icon: string;
  category: 'spiritual' | 'depth' | 'modern';
  color: string;
  count: number;
  percentage: number;
}

export const FrameworkAnalytics = () => {
  const [insights, setInsights] = useState<InsightData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subMonths(new Date(), 6),
    to: new Date(),
  });
  const [visibleFrameworks, setVisibleFrameworks] = useState<Set<string>>(new Set(Object.keys(FRAMEWORK_CONFIG)));

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Join with journal_entries to get entry_date
      const { data, error } = await supabase
        .from('entry_insights')
        .select(`
          id, 
          frameworks_applied,
          journal_entries!inner(entry_date)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      
      // Transform data to flatten entry_date
      const transformed = (data || []).map(d => ({
        id: d.id,
        entry_date: (d.journal_entries as any)?.entry_date || '',
        frameworks_applied: (d.frameworks_applied as string[] | null) || null,
      })).filter(d => d.entry_date); // Filter out any without entry_date
      
      // Sort by entry_date
      transformed.sort((a, b) => a.entry_date.localeCompare(b.entry_date));
      
      setInsights(transformed);
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate data date range for display
  const dataDateRange = useMemo(() => {
    if (insights.length === 0) return null;
    const dates = insights.map(i => i.entry_date).sort();
    return {
      earliest: dates[0],
      latest: dates[dates.length - 1],
    };
  }, [insights]);

  const filteredInsights = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return insights;
    return insights.filter(insight => {
      // Parse entry_date as local date (YYYY-MM-DD format)
      const [year, month, day] = insight.entry_date.split('-').map(Number);
      const date = new Date(year, month - 1, day, 12, 0, 0); // noon to avoid timezone issues
      return date >= dateRange.from! && date <= dateRange.to!;
    });
  }, [insights, dateRange]);

  const usageStats = useMemo((): FrameworkStat[] => {
    const totalEntries = filteredInsights.length;
    const frameworkCounts = new Map<string, number>();

    filteredInsights.forEach(insight => {
      const frameworks = insight.frameworks_applied || [];
      const normalized = new Set<string>();
      frameworks.forEach(fw => {
        const norm = normalizeFramework(fw);
        if (norm) normalized.add(norm);
      });
      normalized.forEach(fw => {
        frameworkCounts.set(fw, (frameworkCounts.get(fw) || 0) + 1);
      });
    });

    return Object.entries(FRAMEWORK_CONFIG).map(([key, config]) => ({
      id: key,
      ...config,
      count: frameworkCounts.get(key) || 0,
      percentage: totalEntries > 0 ? ((frameworkCounts.get(key) || 0) / totalEntries) * 100 : 0,
    }));
  }, [filteredInsights]);

  const monthlyTrends = useMemo(() => {
    const monthlyData = new Map<string, { total: number; frameworks: Map<string, number> }>();

    filteredInsights.forEach(insight => {
      // Use entry_date for grouping
      const month = insight.entry_date.substring(0, 7); // YYYY-MM
      if (!monthlyData.has(month)) {
        monthlyData.set(month, { total: 0, frameworks: new Map() });
      }
      const monthEntry = monthlyData.get(month)!;
      monthEntry.total += 1;

      const frameworks = insight.frameworks_applied || [];
      const normalized = new Set<string>();
      frameworks.forEach(fw => {
        const norm = normalizeFramework(fw);
        if (norm) normalized.add(norm);
      });
      normalized.forEach(fw => {
        monthEntry.frameworks.set(fw, (monthEntry.frameworks.get(fw) || 0) + 1);
      });
    });

    return Array.from(monthlyData.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => {
        const result: Record<string, any> = {
          month: format(parseISO(month + '-01'), 'MMM yyyy'),
        };
        Object.keys(FRAMEWORK_CONFIG).forEach(fw => {
          const count = data.frameworks.get(fw) || 0;
          result[fw] = data.total > 0 ? Math.round((count / data.total) * 100) : 0;
        });
        return result;
      });
  }, [filteredInsights]);

  const toggleFramework = (fw: string) => {
    setVisibleFrameworks(prev => {
      const next = new Set(prev);
      if (next.has(fw)) {
        next.delete(fw);
      } else {
        next.add(fw);
      }
      return next;
    });
  };

  const setAllTimeRange = () => {
    setDateRange({ from: new Date(0), to: new Date() });
  };

  const setLast6Months = () => {
    setDateRange({ from: subMonths(new Date(), 6), to: new Date() });
  };

  const groupedStats = useMemo(() => ({
    spiritual: usageStats.filter(s => s.category === 'spiritual').sort((a, b) => b.percentage - a.percentage),
    depth: usageStats.filter(s => s.category === 'depth').sort((a, b) => b.percentage - a.percentage),
    modern: usageStats.filter(s => s.category === 'modern').sort((a, b) => b.percentage - a.percentage),
  }), [usageStats]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading framework analytics...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Framework Analytics
              </CardTitle>
              <CardDescription>
                Which lenses are applied to your entries
                {dataDateRange && (
                  <span className="block text-xs mt-1">
                    Your entries span {format(parseISO(dataDateRange.earliest), 'MMM yyyy')} - {format(parseISO(dataDateRange.latest), 'MMM yyyy')}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, "MMM yyyy") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateRange.from} onSelect={(date) => setDateRange({ ...dateRange, from: date })} initialFocus />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">to</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left font-normal", !dateRange.to && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? format(dateRange.to, "MMM yyyy") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateRange.to} onSelect={(date) => setDateRange({ ...dateRange, to: date })} initialFocus />
                </PopoverContent>
              </Popover>
              <Button variant="ghost" size="sm" onClick={setLast6Months}>Last 6 months</Button>
              <Button variant="ghost" size="sm" onClick={setAllTimeRange}>All time</Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {filteredInsights.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground py-8">
              No analyzed entries in this date range
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Usage Distribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Usage Distribution</CardTitle>
              <CardDescription className="text-xs">
                {filteredInsights.length} analyzed entries
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Spiritual */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                  🕉️ Spiritual Traditions
                </h4>
                <div className="space-y-1.5">
                  {groupedStats.spiritual.map(stat => (
                    <div key={stat.id} className="flex items-center gap-2">
                      <span className="w-5 text-center text-sm">{stat.icon}</span>
                      <span className="w-28 text-xs truncate">{stat.name}</span>
                      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary/70 rounded-full transition-all duration-500"
                          style={{ width: `${stat.percentage}%` }}
                        />
                      </div>
                      <span className="w-10 text-xs text-muted-foreground text-right">{stat.percentage.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Depth Psychology */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                  🧠 Depth Psychology
                </h4>
                <div className="space-y-1.5">
                  {groupedStats.depth.map(stat => (
                    <div key={stat.id} className="flex items-center gap-2">
                      <span className="w-5 text-center text-sm">{stat.icon}</span>
                      <span className="w-28 text-xs truncate">{stat.name}</span>
                      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500/70 rounded-full transition-all duration-500"
                          style={{ width: `${stat.percentage}%` }}
                        />
                      </div>
                      <span className="w-10 text-xs text-muted-foreground text-right">{stat.percentage.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modern Psychology */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                  💭 Modern Psychology
                </h4>
                <div className="space-y-1.5">
                  {groupedStats.modern.map(stat => (
                    <div key={stat.id} className="flex items-center gap-2">
                      <span className="w-5 text-center text-sm">{stat.icon}</span>
                      <span className="w-28 text-xs truncate">{stat.name}</span>
                      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500/70 rounded-full transition-all duration-500"
                          style={{ width: `${stat.percentage}%` }}
                        />
                      </div>
                      <span className="w-10 text-xs text-muted-foreground text-right">{stat.percentage.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trends Over Time */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Trends Over Time
              </CardTitle>
              <CardDescription className="text-xs">
                Framework usage by month (% of entries)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyTrends.length > 1 ? (
                <>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyTrends} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="month" 
                          className="text-xs" 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} 
                        />
                        <YAxis 
                          domain={[0, 100]} 
                          tickFormatter={(v) => `${v}%`} 
                          className="text-xs" 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          width={35}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                          formatter={(value: number) => [`${value}%`, '']}
                        />
                        <Legend 
                          onClick={(e) => toggleFramework(e.dataKey as string)}
                          wrapperStyle={{ cursor: 'pointer', fontSize: '10px' }}
                        />
                        {Object.entries(FRAMEWORK_CONFIG).map(([key, config]) => (
                          <Line
                            key={key}
                            type="monotone"
                            dataKey={key}
                            name={`${config.icon} ${config.name}`}
                            stroke={config.color}
                            strokeWidth={2}
                            strokeOpacity={visibleFrameworks.has(key) ? 1 : 0.1}
                            dot={visibleFrameworks.has(key) ? { r: 2 } : false}
                            activeDot={visibleFrameworks.has(key) ? { r: 4 } : false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Click legend items to show/hide frameworks
                  </p>
                </>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                  Need at least 2 months of data for trends
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
