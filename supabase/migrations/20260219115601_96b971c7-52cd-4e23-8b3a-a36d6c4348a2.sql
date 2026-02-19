
-- API tokens table for mobile app authentication
CREATE TABLE public.api_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  token_hash text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_used_at timestamp with time zone,
  revoked_at timestamp with time zone
);

ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tokens"
  ON public.api_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tokens"
  ON public.api_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens"
  ON public.api_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens"
  ON public.api_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast token lookup by hash
CREATE INDEX idx_api_tokens_hash ON public.api_tokens (token_hash);
CREATE INDEX idx_api_tokens_user ON public.api_tokens (user_id);

-- Ingest events table for debugging
CREATE TABLE public.ingest_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL,
  payload_json jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ingest_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ingest events"
  ON public.ingest_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert ingest events"
  ON public.ingest_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role policy for edge functions to insert/update without user context
-- Edge functions will use service role key for token auth operations
