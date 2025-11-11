-- Create table to store discovered patterns and relationships between entries
CREATE TABLE public.knowledge_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  relationship_type TEXT NOT NULL,
  source_item TEXT NOT NULL,
  target_item TEXT NOT NULL,
  strength INTEGER NOT NULL DEFAULT 1,
  context TEXT,
  entry_ids UUID[] NOT NULL DEFAULT '{}',
  pattern_description TEXT,
  temporal_pattern TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table to store discovered patterns and insights
CREATE TABLE public.pattern_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pattern_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0.5,
  related_items JSONB NOT NULL DEFAULT '[]',
  entry_ids UUID[] NOT NULL DEFAULT '{}',
  temporal_info JSONB,
  actionable_insight TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.knowledge_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pattern_insights ENABLE ROW LEVEL SECURITY;

-- Create policies for knowledge_relationships
CREATE POLICY "Users can view own relationships"
ON public.knowledge_relationships
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own relationships"
ON public.knowledge_relationships
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own relationships"
ON public.knowledge_relationships
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own relationships"
ON public.knowledge_relationships
FOR DELETE
USING (auth.uid() = user_id);

-- Create policies for pattern_insights
CREATE POLICY "Users can view own patterns"
ON public.pattern_insights
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own patterns"
ON public.pattern_insights
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own patterns"
ON public.pattern_insights
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own patterns"
ON public.pattern_insights
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_knowledge_relationships_user ON public.knowledge_relationships(user_id);
CREATE INDEX idx_knowledge_relationships_items ON public.knowledge_relationships(source_item, target_item);
CREATE INDEX idx_pattern_insights_user ON public.pattern_insights(user_id, created_at DESC);
CREATE INDEX idx_pattern_insights_type ON public.pattern_insights(pattern_type);

-- Create function to update timestamps
CREATE TRIGGER update_knowledge_relationships_updated_at
BEFORE UPDATE ON public.knowledge_relationships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pattern_insights_updated_at
BEFORE UPDATE ON public.pattern_insights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();