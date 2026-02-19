import { useState } from 'react';
import { format } from 'date-fns';
import { CheckSquare, Clock } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { mockActionItems } from '@/lib/mock-data';
import type { ActionItem } from '@/lib/types';

const priorityColors: Record<string, string> = {
  high: 'bg-priority-high/10 text-priority-high border-priority-high/20',
  med: 'bg-priority-med/10 text-priority-med border-priority-med/20',
  low: 'bg-priority-low/10 text-priority-low border-priority-low/20',
};

function TaskCard({ item, onToggle }: { item: ActionItem; onToggle: () => void }) {
  return (
    <Card className={item.status === 'done' ? 'opacity-60' : ''}>
      <CardContent className="flex items-start gap-3 py-3.5 px-4">
        <Checkbox
          checked={item.status === 'done'}
          onCheckedChange={onToggle}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${item.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
            {item.task}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant="outline" className={`text-[10px] ${priorityColors[item.priority]}`}>
              {item.priority}
            </Badge>
            {item.due_date && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(new Date(item.due_date), 'MMM d')}
              </span>
            )}
            {item.session_title && (
              <span className="text-xs text-muted-foreground truncate max-w-48">
                from: {item.session_title}
              </span>
            )}
          </div>
          {item.context && (
            <p className="text-xs text-muted-foreground mt-1">{item.context}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Tasks() {
  const [items, setItems] = useState(mockActionItems);

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, status: i.status === 'open' ? 'done' : 'open' } : i
      )
    );
  };

  const openItems = items.filter((i) => i.status === 'open');
  const doneItems = items.filter((i) => i.status === 'done');
  const highPriority = openItems.filter((i) => i.priority === 'high');

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-primary" />
              Tasks
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {openItems.length} open · {doneItems.length} done
            </p>
          </div>
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All ({openItems.length})</TabsTrigger>
            <TabsTrigger value="high">High Priority ({highPriority.length})</TabsTrigger>
            <TabsTrigger value="done">Done ({doneItems.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-2 mt-4">
            {openItems.map((item) => (
              <TaskCard key={item.id} item={item} onToggle={() => toggleItem(item.id)} />
            ))}
            {openItems.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">All tasks completed! 🎉</p>
            )}
          </TabsContent>

          <TabsContent value="high" className="space-y-2 mt-4">
            {highPriority.map((item) => (
              <TaskCard key={item.id} item={item} onToggle={() => toggleItem(item.id)} />
            ))}
            {highPriority.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">No high-priority tasks</p>
            )}
          </TabsContent>

          <TabsContent value="done" className="space-y-2 mt-4">
            {doneItems.map((item) => (
              <TaskCard key={item.id} item={item} onToggle={() => toggleItem(item.id)} />
            ))}
            {doneItems.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">No completed tasks yet</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
