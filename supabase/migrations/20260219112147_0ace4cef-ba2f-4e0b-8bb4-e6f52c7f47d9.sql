
-- Create sessions table
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create transcript_chunks table
CREATE TABLE public.transcript_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  text TEXT NOT NULL,
  confidence REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create scope enum
CREATE TYPE public.summary_scope AS ENUM ('session', 'day');

-- Create summaries table
CREATE TABLE public.summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope public.summary_scope NOT NULL DEFAULT 'session',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  model TEXT NOT NULL DEFAULT 'gemini-3-flash-preview',
  prompt_version TEXT NOT NULL DEFAULT 'v1',
  raw_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create priority enum
CREATE TYPE public.task_priority AS ENUM ('low', 'med', 'high');

-- Create task status enum
CREATE TYPE public.task_status AS ENUM ('open', 'done');

-- Create action_items table
CREATE TABLE public.action_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  summary_id UUID NOT NULL REFERENCES public.summaries(id) ON DELETE CASCADE,
  task TEXT NOT NULL,
  due_date DATE,
  priority public.task_priority NOT NULL DEFAULT 'med',
  status public.task_status NOT NULL DEFAULT 'open',
  context TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create agenda_items table
CREATE TABLE public.agenda_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  summary_id UUID NOT NULL REFERENCES public.summaries(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  datetime TIMESTAMPTZ,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create reminders table
CREATE TABLE public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  summary_id UUID NOT NULL REFERENCES public.summaries(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  trigger_datetime TIMESTAMPTZ,
  status public.task_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create important_facts table
CREATE TABLE public.important_facts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  summary_id UUID NOT NULL REFERENCES public.summaries(id) ON DELETE CASCADE,
  fact TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcript_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.important_facts ENABLE ROW LEVEL SECURITY;

-- Sessions policies
CREATE POLICY "Users can view their own sessions" ON public.sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own sessions" ON public.sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sessions" ON public.sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sessions" ON public.sessions FOR DELETE USING (auth.uid() = user_id);

-- Transcript chunks: access via session ownership
CREATE POLICY "Users can view chunks of their sessions" ON public.transcript_chunks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = transcript_chunks.session_id AND sessions.user_id = auth.uid())
);
CREATE POLICY "Users can insert chunks to their sessions" ON public.transcript_chunks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = transcript_chunks.session_id AND sessions.user_id = auth.uid())
);
CREATE POLICY "Users can delete chunks of their sessions" ON public.transcript_chunks FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = transcript_chunks.session_id AND sessions.user_id = auth.uid())
);

-- Summaries policies
CREATE POLICY "Users can view their own summaries" ON public.summaries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own summaries" ON public.summaries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own summaries" ON public.summaries FOR DELETE USING (auth.uid() = user_id);

-- Action items: access via summary ownership
CREATE POLICY "Users can view their action items" ON public.action_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.summaries WHERE summaries.id = action_items.summary_id AND summaries.user_id = auth.uid())
);
CREATE POLICY "Users can insert action items" ON public.action_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.summaries WHERE summaries.id = action_items.summary_id AND summaries.user_id = auth.uid())
);
CREATE POLICY "Users can update their action items" ON public.action_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.summaries WHERE summaries.id = action_items.summary_id AND summaries.user_id = auth.uid())
);
CREATE POLICY "Users can delete their action items" ON public.action_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.summaries WHERE summaries.id = action_items.summary_id AND summaries.user_id = auth.uid())
);

-- Agenda items: access via summary ownership
CREATE POLICY "Users can view their agenda items" ON public.agenda_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.summaries WHERE summaries.id = agenda_items.summary_id AND summaries.user_id = auth.uid())
);
CREATE POLICY "Users can insert agenda items" ON public.agenda_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.summaries WHERE summaries.id = agenda_items.summary_id AND summaries.user_id = auth.uid())
);
CREATE POLICY "Users can delete their agenda items" ON public.agenda_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.summaries WHERE summaries.id = agenda_items.summary_id AND summaries.user_id = auth.uid())
);

-- Reminders: access via summary ownership
CREATE POLICY "Users can view their reminders" ON public.reminders FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.summaries WHERE summaries.id = reminders.summary_id AND summaries.user_id = auth.uid())
);
CREATE POLICY "Users can insert reminders" ON public.reminders FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.summaries WHERE summaries.id = reminders.summary_id AND summaries.user_id = auth.uid())
);
CREATE POLICY "Users can update their reminders" ON public.reminders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.summaries WHERE summaries.id = reminders.summary_id AND summaries.user_id = auth.uid())
);
CREATE POLICY "Users can delete their reminders" ON public.reminders FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.summaries WHERE summaries.id = reminders.summary_id AND summaries.user_id = auth.uid())
);

-- Important facts: access via summary ownership
CREATE POLICY "Users can view their facts" ON public.important_facts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.summaries WHERE summaries.id = important_facts.summary_id AND summaries.user_id = auth.uid())
);
CREATE POLICY "Users can insert facts" ON public.important_facts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.summaries WHERE summaries.id = important_facts.summary_id AND summaries.user_id = auth.uid())
);
CREATE POLICY "Users can delete their facts" ON public.important_facts FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.summaries WHERE summaries.id = important_facts.summary_id AND summaries.user_id = auth.uid())
);

-- Create indexes for performance
CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_start_time ON public.sessions(start_time DESC);
CREATE INDEX idx_transcript_chunks_session_id ON public.transcript_chunks(session_id);
CREATE INDEX idx_summaries_user_id ON public.summaries(user_id);
CREATE INDEX idx_summaries_session_id ON public.summaries(session_id);
CREATE INDEX idx_action_items_summary_id ON public.action_items(summary_id);
CREATE INDEX idx_action_items_status ON public.action_items(status);
CREATE INDEX idx_agenda_items_summary_id ON public.agenda_items(summary_id);
CREATE INDEX idx_reminders_summary_id ON public.reminders(summary_id);
CREATE INDEX idx_important_facts_summary_id ON public.important_facts(summary_id);
