CREATE TABLE public.agency_margins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  margin_percent numeric NOT NULL DEFAULT 15,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, category)
);
ALTER TABLE public.agency_margins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own margins" ON public.agency_margins
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
