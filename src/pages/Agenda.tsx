import { format } from 'date-fns';
import { Calendar, Clock, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockAgendaItems } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';

export default function Agenda() {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (item: typeof mockAgendaItems[0]) => {
    const text = [
      item.title,
      item.datetime ? `When: ${format(new Date(item.datetime), 'MMM d, yyyy · h:mm a')}` : '',
      item.duration_minutes ? `Duration: ${item.duration_minutes} min` : '',
      item.notes ? `Notes: ${item.notes}` : '',
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    toast({ title: 'Copied to clipboard' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            Agenda
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Suggested meetings and events from your summaries
          </p>
        </div>

        <div className="space-y-3">
          {mockAgendaItems.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-start gap-4 py-4 px-5">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-accent-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{item.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {item.datetime && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(item.datetime), 'MMM d · h:mm a')}
                      </span>
                    )}
                    {item.duration_minutes && <span>{item.duration_minutes} min</span>}
                  </div>
                  {item.notes && (
                    <p className="text-xs text-muted-foreground mt-1.5">{item.notes}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(item)}
                  className="shrink-0"
                >
                  {copiedId === item.id ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}

          {mockAgendaItems.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-12">
              No agenda suggestions yet. Summarize a session to get started.
            </p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
