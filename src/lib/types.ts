export interface Session {
  id: string;
  user_id: string;
  title: string;
  start_time: string;
  end_time: string | null;
  created_at: string;
}

export interface TranscriptChunk {
  id: string;
  session_id: string;
  start_time: string;
  end_time: string;
  text: string;
  confidence: number | null;
  created_at: string;
}

export interface SummaryJSON {
  summaryBullets: string[];
  actionItems: ActionItemJSON[];
  agendaSuggestions: AgendaItemJSON[];
  reminders: ReminderJSON[];
  importantFactsToRemember: string[];
  openQuestions: string[];
}

export interface ActionItemJSON {
  task: string;
  dueDate: string | null;
  priority: 'low' | 'med' | 'high';
  context: string | null;
}

export interface AgendaItemJSON {
  title: string;
  datetime: string | null;
  durationMinutes: number | null;
  context: string | null;
}

export interface ReminderJSON {
  text: string;
  triggerDateTime: string | null;
}

export interface Summary {
  id: string;
  session_id: string | null;
  user_id: string;
  scope: 'session' | 'day';
  start_time: string;
  end_time: string;
  model: string;
  prompt_version: string;
  raw_json: SummaryJSON;
  created_at: string;
}

export interface ActionItem {
  id: string;
  summary_id: string;
  session_title?: string;
  task: string;
  due_date: string | null;
  priority: 'low' | 'med' | 'high';
  status: 'open' | 'done';
  context: string | null;
}

export interface AgendaItem {
  id: string;
  summary_id: string;
  title: string;
  datetime: string | null;
  duration_minutes: number | null;
  notes: string | null;
}

export interface Reminder {
  id: string;
  summary_id: string;
  text: string;
  trigger_datetime: string | null;
  status: 'open' | 'done';
}

export interface ImportantFact {
  id: string;
  summary_id: string;
  fact: string;
}
