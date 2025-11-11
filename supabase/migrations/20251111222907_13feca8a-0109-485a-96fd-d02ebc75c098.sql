-- Create table for NPS responses
CREATE TABLE public.nps_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own NPS responses" 
ON public.nps_responses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own NPS responses" 
ON public.nps_responses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_nps_responses_user_id ON public.nps_responses(user_id);
CREATE INDEX idx_nps_responses_created_at ON public.nps_responses(created_at DESC);