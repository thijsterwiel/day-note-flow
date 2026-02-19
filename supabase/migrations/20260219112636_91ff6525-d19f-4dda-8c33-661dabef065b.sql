
-- Fix RLS policies: they were created as RESTRICTIVE by default, need to be PERMISSIVE
-- Drop and recreate all policies as PERMISSIVE

-- Sessions
DROP POLICY "Users can view their own sessions" ON public.sessions;
DROP POLICY "Users can create their own sessions" ON public.sessions;
DROP POLICY "Users can update their own sessions" ON public.sessions;
DROP POLICY "Users can delete their own sessions" ON public.sessions;

CREATE POLICY "Users can view their own sessions" ON public.sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own sessions" ON public.sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sessions" ON public.sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sessions" ON public.sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Transcript chunks
DROP POLICY "Users can view chunks of their sessions" ON public.transcript_chunks;
DROP POLICY "Users can insert chunks to their sessions" ON public.transcript_chunks;
DROP POLICY "Users can delete chunks of their sessions" ON public.transcript_chunks;

CREATE POLICY "Users can view chunks of their sessions" ON public.transcript_chunks FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = transcript_chunks.session_id AND sessions.user_id = auth.uid()));
CREATE POLICY "Users can insert chunks to their sessions" ON public.transcript_chunks FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = transcript_chunks.session_id AND sessions.user_id = auth.uid()));
CREATE POLICY "Users can delete chunks of their sessions" ON public.transcript_chunks FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = transcript_chunks.session_id AND sessions.user_id = auth.uid()));

-- Summaries
DROP POLICY "Users can view their own summaries" ON public.summaries;
DROP POLICY "Users can create their own summaries" ON public.summaries;
DROP POLICY "Users can delete their own summaries" ON public.summaries;

CREATE POLICY "Users can view their own summaries" ON public.summaries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own summaries" ON public.summaries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own summaries" ON public.summaries FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Action items
DROP POLICY "Users can view their action items" ON public.action_items;
DROP POLICY "Users can insert action items" ON public.action_items;
DROP POLICY "Users can update their action items" ON public.action_items;
DROP POLICY "Users can delete their action items" ON public.action_items;

CREATE POLICY "Users can view their action items" ON public.action_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.summaries WHERE summaries.id = action_items.summary_id AND summaries.user_id = auth.uid()));
CREATE POLICY "Users can insert action items" ON public.action_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.summaries WHERE summaries.id = action_items.summary_id AND summaries.user_id = auth.uid()));
CREATE POLICY "Users can update their action items" ON public.action_items FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.summaries WHERE summaries.id = action_items.summary_id AND summaries.user_id = auth.uid()));
CREATE POLICY "Users can delete their action items" ON public.action_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.summaries WHERE summaries.id = action_items.summary_id AND summaries.user_id = auth.uid()));

-- Agenda items
DROP POLICY "Users can view their agenda items" ON public.agenda_items;
DROP POLICY "Users can insert agenda items" ON public.agenda_items;
DROP POLICY "Users can delete their agenda items" ON public.agenda_items;

CREATE POLICY "Users can view their agenda items" ON public.agenda_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.summaries WHERE summaries.id = agenda_items.summary_id AND summaries.user_id = auth.uid()));
CREATE POLICY "Users can insert agenda items" ON public.agenda_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.summaries WHERE summaries.id = agenda_items.summary_id AND summaries.user_id = auth.uid()));
CREATE POLICY "Users can delete their agenda items" ON public.agenda_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.summaries WHERE summaries.id = agenda_items.summary_id AND summaries.user_id = auth.uid()));

-- Reminders
DROP POLICY "Users can view their reminders" ON public.reminders;
DROP POLICY "Users can insert reminders" ON public.reminders;
DROP POLICY "Users can update their reminders" ON public.reminders;
DROP POLICY "Users can delete their reminders" ON public.reminders;

CREATE POLICY "Users can view their reminders" ON public.reminders FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.summaries WHERE summaries.id = reminders.summary_id AND summaries.user_id = auth.uid()));
CREATE POLICY "Users can insert reminders" ON public.reminders FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.summaries WHERE summaries.id = reminders.summary_id AND summaries.user_id = auth.uid()));
CREATE POLICY "Users can update their reminders" ON public.reminders FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.summaries WHERE summaries.id = reminders.summary_id AND summaries.user_id = auth.uid()));
CREATE POLICY "Users can delete their reminders" ON public.reminders FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.summaries WHERE summaries.id = reminders.summary_id AND summaries.user_id = auth.uid()));

-- Important facts
DROP POLICY "Users can view their facts" ON public.important_facts;
DROP POLICY "Users can insert facts" ON public.important_facts;
DROP POLICY "Users can delete their facts" ON public.important_facts;

CREATE POLICY "Users can view their facts" ON public.important_facts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.summaries WHERE summaries.id = important_facts.summary_id AND summaries.user_id = auth.uid()));
CREATE POLICY "Users can insert facts" ON public.important_facts FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.summaries WHERE summaries.id = important_facts.summary_id AND summaries.user_id = auth.uid()));
CREATE POLICY "Users can delete their facts" ON public.important_facts FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.summaries WHERE summaries.id = important_facts.summary_id AND summaries.user_id = auth.uid()));
