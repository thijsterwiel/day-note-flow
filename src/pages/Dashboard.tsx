import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, isToday, isYesterday } from 'date-fns';
import { Plus, Sparkles, Clock, ChevronRight, FileText, Loader2 } from 'lucide-react';
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

  // Fetch chunk counts per session
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

  // Fetch which sessions have summaries
  const { data: summarizedSessionIds = [] } = useQuery({
    queryKey: ['summarized-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('summaries')
        .select('session_id')
        .eq('scope', 'session');
      if (error) throw error;
      return data.map((s) => s.session_id).filter(Boolean) as string[];
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

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-2">
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

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground text-sm">No sessions yet. Create one to get started!</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, dateSessions]) => (
            <div key={date} className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {date}
              </h2>
              <div className="space-y-2">
                {dateSessions.map((session) => {
                  const count = chunkCounts[session.id] || 0;
                  const hasSummary = summarizedSessionIds.includes(session.id);
                  return (
                    <Link key={session.id} to={`/session/${session.id}`}>
                      <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                        <CardContent className="flex items-center gap-4 py-4 px-5">
                          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-accent-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{session.title}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(session.start_time), 'h:mm a')}
                              </span>
                              <span>{count} chunks</span>
                              {hasSummary && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  Summarized
                                </Badge>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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
