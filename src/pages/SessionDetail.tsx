import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Sparkles, Plus, Clock, CheckCircle2, Lightbulb, HelpCircle, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { SummaryJSON } from '@/lib/types';

const priorityColors: Record<string, string> = {
  high: 'bg-priority-high/10 text-priority-high border-priority-high/20',
  med: 'bg-priority-med/10 text-priority-med border-priority-med/20',
  low: 'bg-priority-low/10 text-priority-low border-priority-low/20',
};

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const [newChunk, setNewChunk] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: chunks = [], isLoading: chunksLoading } = useQuery({
    queryKey: ['chunks', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transcript_chunks')
        .select('*')
        .eq('session_id', id!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: summary } = useQuery({
    queryKey: ['summary', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('summaries')
        .select('*')
        .eq('session_id', id!)
        .eq('scope', 'session')
        .order('created_at', { ascending: false })
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const addChunk = useMutation({
    mutationFn: async (text: string) => {
      const now = format(new Date(), 'HH:mm');
      const { error } = await supabase.from('transcript_chunks').insert({
        session_id: id!,
        text,
        start_time: now,
        end_time: now,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chunks', id] });
      queryClient.invalidateQueries({ queryKey: ['chunk-counts'] });
      setNewChunk('');
      toast({ title: 'Chunk added' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const summarize = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('summarize-session', {
        body: { session_id: id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['summary', id] });
      toast({ title: 'Summary generated!' });
    },
    onError: (error: any) => {
      toast({ title: 'Summarization failed', description: error.message, variant: 'destructive' });
    },
  });

  const summaryJson = summary?.raw_json as unknown as SummaryJSON | null;

  if (sessionLoading || chunksLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!session) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Session not found</p>
          <Link to="/" className="text-primary text-sm mt-2 inline-block hover:underline">Back to Dashboard</Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight">{session.title}</h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(session.start_time), 'MMM d, yyyy · h:mm a')}
              {session.end_time && ` — ${format(new Date(session.end_time), 'h:mm a')}`}
            </p>
          </div>
          <Button
            size="sm"
            disabled={chunks.length === 0 || summarize.isPending}
            onClick={() => summarize.mutate()}
          >
            {summarize.isPending ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-1.5" />
            )}
            {summarize.isPending ? 'Summarizing…' : 'Summarize'}
          </Button>
        </div>

        <Tabs defaultValue="transcript" className="space-y-4">
          <TabsList>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="summary" disabled={!summaryJson}>
              Summary {summaryJson && '✓'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transcript" className="space-y-4">
            {chunks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No transcript chunks yet. Paste one below to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {chunks.map((chunk) => (
                  <div key={chunk.id} className="flex gap-3 group">
                    <span className="text-mono text-xs text-muted-foreground pt-1.5 w-12 shrink-0 text-right">
                      {chunk.start_time}
                    </span>
                    <div className="flex-1 bg-card rounded-lg px-4 py-3 border border-border text-sm leading-relaxed">
                      {chunk.text}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Card>
              <CardContent className="pt-4 space-y-3">
                <Textarea
                  placeholder="Paste a transcript chunk here..."
                  value={newChunk}
                  onChange={(e) => setNewChunk(e.target.value)}
                  rows={3}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addChunk.mutate(newChunk)}
                  disabled={!newChunk.trim() || addChunk.isPending}
                >
                  {addChunk.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-1.5" />
                  )}
                  Add Chunk
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="space-y-4">
            {summaryJson && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {summaryJson.summaryBullets.map((b, i) => (
                        <li key={i} className="text-sm flex gap-2">
                          <span className="text-primary mt-1">•</span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      Action Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {summaryJson.actionItems.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm">
                        <div className="w-4 h-4 rounded border border-border mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium">{item.task}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={`text-[10px] ${priorityColors[item.priority]}`}>
                              {item.priority}
                            </Badge>
                            {item.dueDate && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(item.dueDate), 'MMM d')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-primary" />
                      Important Facts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {summaryJson.importantFactsToRemember.map((f, i) => (
                        <li key={i} className="text-sm flex gap-2">
                          <span className="text-primary mt-0.5">◆</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {summaryJson.openQuestions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-primary" />
                        Open Questions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {summaryJson.openQuestions.map((q, i) => (
                          <li key={i} className="text-sm flex gap-2">
                            <span className="text-muted-foreground mt-0.5">?</span>
                            {q}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
