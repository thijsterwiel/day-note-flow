import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, isToday, isYesterday, formatDistanceStrict } from 'date-fns';
import {
  Plus, Sparkles, Clock, ChevronRight, FileText, Loader2,
  Mic, Globe, CheckCircle2, AlertCircle, ListChecks
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

function formatSessionDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEEE, MMM d');
}

function formatDuration(start: string, end: string | null) {
  if (!end) return 'In progress';
  return formatDistanceStrict(new Date(start), new Date(end));
}

function languageLabel(lang: string | null) {
  if (!lang) return null;
  const map: Record<string, string> = { 'en-US': 'EN', 'nl-NL': 'NL', 'en': 'EN', 'nl': 'NL' };
  return map[lang] || lang.split('-')[0].toUpperCase();
}

export default function Dashboard() {
  const [newTitle, setNewTitle] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('start_time', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: chunkCounts = {} } = useQuery({
    queryKey: ['chunk-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transcript_chunks')
        .select('session_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((c) => {
        counts[c.session_id] = (counts[c.session_id] || 0) + 1;
      });
      return counts;
    },
  });

  // Fetch summaries with bullet previews
  const { data: summaryMap = {} } = useQuery({
    queryKey: ['session-summaries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('summaries')
        .select('session_id, raw_json')
        .eq('scope', 'session');
      if (error) throw error;
      const map: Record<string, { bullets: string[]; actionCount: number }> = {};
      data.forEach((s) => {
        if (!s.session_id) return;
        const json = s.raw_json as any;
        map[s.session_id] = {
          bullets: (json?.summaryBullets || []).slice(0, 3),
          actionCount: (json?.actionItems || []).length,
        };
      });
      return map;
    },
  });

  const createSession = useMutation({
    mutationFn: async (title: string) => {
      const { data, error } = await supabase
        .from('sessions')
        .insert({ title, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setDialogOpen(false);
      setNewTitle('');
      navigate(`/session/${data.id}`);
    },
    onError: (error: any) => {
      toast({ title: 'Error creating session', description: error.message, variant: 'destructive' });
    },
  });

  const grouped = sessions.reduce<Record<string, typeof sessions>>((acc, s) => {
    const key = formatSessionDate(s.start_time);
    (acc[key] ??= []).push(s);
    return acc;
  }, {});

  const totalSessions = sessions.length;
  const totalSummarized = Object.keys(summaryMap).length;
  const totalChunks = Object.values(chunkCounts).reduce((a, b) => a + b, 0);

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm">
              <Sparkles className="w-4 h-4 mr-1.5" />
              Summarize Today
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1.5" />
                  New Session
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Session</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="session-title">Session title</Label>
                    <Input
                      id="session-title"
                      placeholder="e.g. Morning standup"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={() => createSession.mutate(newTitle)}
                    className="w-full"
                    disabled={!newTitle.trim() || createSession.isPending}
                  >
                    {createSession.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                    Create Session
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats row */}
        {totalSessions > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
                  <Mic className="w-4 h-4 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-xl font-bold leading-none">{totalSessions}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Sessions</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-xl font-bold leading-none">{totalSummarized}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Summarized</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
                  <FileText className="w-4 h-4 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-xl font-bold leading-none">{totalChunks}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Chunks</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sessions */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="text-center py-16 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mx-auto">
                <Mic className="w-7 h-7 text-accent-foreground" />
              </div>
              <div>
                <p className="font-semibold">No sessions yet</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Create your first session or record from the iOS app.
                </p>
              </div>
              <Button size="sm" onClick={() => setDialogOpen(true)} className="mt-2">
                <Plus className="w-4 h-4 mr-1.5" />
                New Session
              </Button>
            </CardContent>
          </Card>
        ) : (
          Object.entries(grouped).map(([date, dateSessions]) => (
            <div key={date} className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {date}
                </h2>
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">{dateSessions.length} session{dateSessions.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-2">
                {dateSessions.map((session) => {
                  const count = chunkCounts[session.id] || 0;
                  const summary = summaryMap[session.id];
                  const lang = languageLabel((session as any).language);
                  const isLive = !session.end_time;

                  return (
                    <Link key={session.id} to={`/session/${session.id}`}>
                      <Card className="hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group">
                        <CardContent className="p-0">
                          {/* Main row */}
                          <div className="flex items-center gap-4 py-4 px-5">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                              isLive
                                ? 'bg-primary/15 ring-2 ring-primary/30'
                                : summary
                                  ? 'bg-accent'
                                  : 'bg-muted'
                            }`}>
                              {isLive ? (
                                <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                              ) : (
                                <FileText className={`w-5 h-5 ${summary ? 'text-accent-foreground' : 'text-muted-foreground'}`} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm truncate">{session.title}</p>
                                {lang && lang !== 'EN' && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono shrink-0">
                                    <Globe className="w-2.5 h-2.5 mr-0.5" />
                                    {lang}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {format(new Date(session.start_time), 'h:mm a')}
                                </span>
                                <span className="text-border">·</span>
                                <span>{formatDuration(session.start_time, session.end_time)}</span>
                                <span className="text-border">·</span>
                                <span>{count} chunk{count !== 1 ? 's' : ''}</span>
                                {summary && (
                                  <>
                                    <span className="text-border">·</span>
                                    <span className="flex items-center gap-1 text-accent-foreground">
                                      <ListChecks className="w-3 h-3" />
                                      {summary.actionCount} action{summary.actionCount !== 1 ? 's' : ''}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {summary ? (
                                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Summarized
                                </Badge>
                              ) : count > 0 ? (
                                <Badge variant="outline" className="text-[10px] px-2 py-0.5 gap-1 text-muted-foreground">
                                  <AlertCircle className="w-3 h-3" />
                                  Pending
                                </Badge>
                              ) : null}
                              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>

                          {/* Summary preview */}
                          {summary && summary.bullets.length > 0 && (
                            <div className="px-5 pb-4 pt-0 border-t border-border/50 mt-0">
                              <ul className="space-y-1 pt-3">
                                {summary.bullets.map((bullet, i) => (
                                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                                    <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                                    <span className="line-clamp-1">{bullet}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </AppLayout>
  );
}
