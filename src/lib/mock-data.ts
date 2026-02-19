import type { Session, TranscriptChunk, Summary, ActionItem, AgendaItem, Reminder, ImportantFact } from './types';

export const mockSessions: Session[] = [
  {
    id: 's1',
    user_id: 'u1',
    title: 'Morning Standup',
    start_time: '2026-02-19T09:00:00Z',
    end_time: '2026-02-19T09:15:00Z',
    created_at: '2026-02-19T09:00:00Z',
  },
  {
    id: 's2',
    user_id: 'u1',
    title: 'Client Discovery Call — Acme Corp',
    start_time: '2026-02-19T14:00:00Z',
    end_time: '2026-02-19T14:45:00Z',
    created_at: '2026-02-19T14:00:00Z',
  },
  {
    id: 's3',
    user_id: 'u1',
    title: 'Design Review',
    start_time: '2026-02-18T16:00:00Z',
    end_time: '2026-02-18T16:30:00Z',
    created_at: '2026-02-18T16:00:00Z',
  },
];

export const mockChunks: Record<string, TranscriptChunk[]> = {
  s1: [
    { id: 'c1', session_id: 's1', start_time: '09:00', end_time: '09:03', text: "Alright, let's go around. Sarah, what are you working on today?", confidence: 0.95, created_at: '2026-02-19T09:00:00Z' },
    { id: 'c2', session_id: 's1', start_time: '09:03', end_time: '09:07', text: "I'm finishing the API integration for the payments module. Should be done by noon. I'll need a review from Mike.", confidence: 0.92, created_at: '2026-02-19T09:03:00Z' },
    { id: 'c3', session_id: 's1', start_time: '09:07', end_time: '09:12', text: "Mike here — I can review after lunch. Also, the staging environment has that SSL issue again. DevOps ticket is open but no response yet.", confidence: 0.88, created_at: '2026-02-19T09:07:00Z' },
    { id: 'c4', session_id: 's1', start_time: '09:12', end_time: '09:15', text: "Got it. I'll ping DevOps directly. Anything else blocking anyone? No? Great, let's ship it.", confidence: 0.91, created_at: '2026-02-19T09:12:00Z' },
  ],
  s2: [
    { id: 'c5', session_id: 's2', start_time: '14:00', end_time: '14:10', text: "Thanks for joining, team. Acme Corp wants to migrate their legacy CRM to our platform. They have about 50,000 customer records and need the transition done within Q2.", confidence: 0.94, created_at: '2026-02-19T14:00:00Z' },
    { id: 'c6', session_id: 's2', start_time: '14:10', end_time: '14:25', text: "Their main concern is data integrity during migration. They've had issues before with duplicate records. We need to propose a deduplication strategy and run a pilot with 1,000 records first.", confidence: 0.90, created_at: '2026-02-19T14:10:00Z' },
    { id: 'c7', session_id: 's2', start_time: '14:25', end_time: '14:35', text: "Budget-wise, they're looking at the enterprise tier. They also asked about custom reporting dashboards. I told them we could scope that as a Phase 2 add-on.", confidence: 0.93, created_at: '2026-02-19T14:25:00Z' },
    { id: 'c8', session_id: 's2', start_time: '14:35', end_time: '14:45', text: "Action items: send them the migration checklist by Friday, schedule a technical deep-dive for next Tuesday, and get the pilot environment set up by Monday.", confidence: 0.96, created_at: '2026-02-19T14:35:00Z' },
  ],
  s3: [
    { id: 'c9', session_id: 's3', start_time: '16:00', end_time: '16:15', text: "Let's review the new dashboard mockups. I think the navigation feels cluttered — we should consolidate the sidebar items and move settings to a profile menu.", confidence: 0.89, created_at: '2026-02-18T16:00:00Z' },
    { id: 'c10', session_id: 's3', start_time: '16:15', end_time: '16:30', text: "Agreed. Also, the color contrast on the cards isn't meeting accessibility standards. We need to bump the text weight or darken the background. I'll update the Figma file tonight.", confidence: 0.87, created_at: '2026-02-18T16:15:00Z' },
  ],
};

export const mockSummary: Summary = {
  id: 'sum1',
  session_id: 's2',
  user_id: 'u1',
  scope: 'session',
  start_time: '2026-02-19T14:00:00Z',
  end_time: '2026-02-19T14:45:00Z',
  model: 'gemini-3-flash-preview',
  prompt_version: 'v1',
  raw_json: {
    summaryBullets: [
      'Acme Corp wants to migrate 50K CRM records to our platform within Q2.',
      'Data deduplication is their top concern — pilot with 1,000 records first.',
      'Enterprise tier pricing; custom reporting dashboards scoped as Phase 2.',
    ],
    actionItems: [
      { task: 'Send migration checklist to Acme Corp', dueDate: '2026-02-21', priority: 'high', context: 'Client expects it by Friday' },
      { task: 'Schedule technical deep-dive meeting', dueDate: '2026-02-24', priority: 'med', context: 'Next Tuesday with their engineering team' },
      { task: 'Set up pilot migration environment', dueDate: '2026-02-23', priority: 'high', context: 'Need 1,000 record subset ready by Monday' },
    ],
    agendaSuggestions: [
      { title: 'Acme Corp Technical Deep-Dive', datetime: '2026-02-24T10:00:00Z', durationMinutes: 60, context: 'Discuss migration architecture and deduplication strategy' },
      { title: 'Internal: Review pilot results', datetime: null, durationMinutes: 30, context: 'After pilot migration completes' },
    ],
    reminders: [
      { text: 'Follow up with Acme Corp on migration checklist', triggerDateTime: '2026-02-22T09:00:00Z' },
    ],
    importantFactsToRemember: [
      'Acme Corp has 50,000 customer records in their legacy CRM.',
      'They had prior issues with duplicate records during migrations.',
      'Custom reporting dashboards are a Phase 2 add-on.',
    ],
    openQuestions: [
      'What format is their legacy CRM data export in?',
      'Do they need real-time sync during migration or is a cutover acceptable?',
    ],
  },
  created_at: '2026-02-19T15:00:00Z',
};

export const mockActionItems: ActionItem[] = [
  { id: 'a1', summary_id: 'sum1', session_title: 'Client Discovery Call — Acme Corp', task: 'Send migration checklist to Acme Corp', due_date: '2026-02-21', priority: 'high', status: 'open', context: 'Client expects it by Friday' },
  { id: 'a2', summary_id: 'sum1', session_title: 'Client Discovery Call — Acme Corp', task: 'Schedule technical deep-dive meeting', due_date: '2026-02-24', priority: 'med', status: 'open', context: 'Next Tuesday with their engineering team' },
  { id: 'a3', summary_id: 'sum1', session_title: 'Client Discovery Call — Acme Corp', task: 'Set up pilot migration environment', due_date: '2026-02-23', priority: 'high', status: 'open', context: 'Need 1,000 record subset ready by Monday' },
  { id: 'a4', summary_id: 'sum1', session_title: 'Morning Standup', task: 'Ping DevOps about SSL staging issue', due_date: null, priority: 'med', status: 'done', context: 'Staging environment' },
];

export const mockAgendaItems: AgendaItem[] = [
  { id: 'ag1', summary_id: 'sum1', title: 'Acme Corp Technical Deep-Dive', datetime: '2026-02-24T10:00:00Z', duration_minutes: 60, notes: 'Discuss migration architecture and deduplication strategy' },
  { id: 'ag2', summary_id: 'sum1', title: 'Internal: Review pilot results', datetime: null, duration_minutes: 30, notes: 'After pilot migration completes' },
];

export const mockReminders: Reminder[] = [
  { id: 'r1', summary_id: 'sum1', text: 'Follow up with Acme Corp on migration checklist', trigger_datetime: '2026-02-22T09:00:00Z', status: 'open' },
];

export const mockFacts: ImportantFact[] = [
  { id: 'f1', summary_id: 'sum1', fact: 'Acme Corp has 50,000 customer records in their legacy CRM.' },
  { id: 'f2', summary_id: 'sum1', fact: 'They had prior issues with duplicate records during migrations.' },
  { id: 'f3', summary_id: 'sum1', fact: 'Custom reporting dashboards are a Phase 2 add-on.' },
];
