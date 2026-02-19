import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format, isToday, isYesterday } from 'date-fns';
import { Plus, Sparkles, Clock, ChevronRight, FileText } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { mockSessions, mockChunks, mockSummary } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';

function formatSessionDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEEE, MMM d');
}

export default function Dashboard() {
  const [newTitle, setNewTitle] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const grouped = mockSessions.reduce<Record<string, typeof mockSessions>>((acc, s) => {
    const key = formatSessionDate(s.start_time);
    (acc[key] ??= []).push(s);
    return acc;
  }, {});

  const handleCreate = () => {
    // TODO: wire to backend
    setDialogOpen(false);
    setNewTitle('');
  };

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
                  <Button onClick={handleCreate} className="w-full" disabled={!newTitle.trim()}>
                    Create Session
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {Object.entries(grouped).map(([date, sessions]) => (
          <div key={date} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {date}
            </h2>
            <div className="space-y-2">
              {sessions.map((session) => {
                const chunks = mockChunks[session.id] || [];
                const hasSummary = mockSummary.session_id === session.id;
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
                            <span>{chunks.length} chunks</span>
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
        ))}
      </div>
    </AppLayout>
  );
}
