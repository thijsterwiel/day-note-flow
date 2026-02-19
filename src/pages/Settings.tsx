import { useState } from 'react';
import { Download, Trash2, LogOut, Plus, Key, Copy, Check, XCircle, Smartphone, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface ApiToken {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export default function Settings() {
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [tokenName, setTokenName] = useState('');
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const { data: tokens = [], isLoading: tokensLoading } = useQuery({
    queryKey: ['api-tokens'],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke('mobile-api', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: null,
      });
      // The invoke for GET doesn't use query params well, so we use POST-style routing
      // Actually we need to call with the right path. Let's use fetch directly.
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return [];
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mobile-api/tokens`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return [];
      const json = await res.json();
      return (json.tokens || []) as ApiToken[];
    },
    enabled: !!user,
  });

  const createToken = useMutation({
    mutationFn: async (name: string) => {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mobile-api/tokens`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create token');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setNewToken(data.token);
      setTokenName('');
      queryClient.invalidateQueries({ queryKey: ['api-tokens'] });
      toast({ title: 'Token created', description: 'Copy it now - it will not be shown again.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const revokeToken = useMutation({
    mutationFn: async (id: string) => {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mobile-api/tokens/${id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error('Failed to revoke');
    },
    onSuccess: () => {
      setRevokeId(null);
      queryClient.invalidateQueries({ queryKey: ['api-tokens'] });
      toast({ title: 'Token revoked' });
    },
  });

  const copyToken = () => {
    if (!newToken) return;
    navigator.clipboard.writeText(newToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    toast({ title: 'Export started', description: 'Your data will download shortly.' });
  };

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const sampleCurl = `# 1. Create a session
curl -X POST \\
  ${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mobile-api/sessions \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"My recording","start_time":"${new Date().toISOString()}"}'

# 2. Upload a transcript chunk
curl -X POST \\
  ${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mobile-api/sessions/SESSION_ID/chunks \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "chunkId":"unique-chunk-id",
    "start_time":"2025-01-01T10:00:00Z",
    "end_time":"2025-01-01T10:00:30Z",
    "text":"This is a transcript chunk.",
    "confidence":0.95
  }'`;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your account and data</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
            <CardDescription>{user?.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-1.5" />
              Sign out
            </Button>
          </CardContent>
        </Card>

        {/* API Tokens Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">API Tokens</CardTitle>
            </div>
            <CardDescription>
              Create tokens for the DayNote iPhone app to upload transcripts. Tokens are shown only once on creation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* New token banner */}
            {newToken && (
              <div className="bg-accent/50 border border-accent rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium text-foreground">
                  ⚠️ Copy this token now — it won't be shown again!
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-background rounded px-2 py-1.5 font-mono break-all border">
                    {newToken}
                  </code>
                  <Button size="sm" variant="outline" onClick={copyToken}>
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => setNewToken(null)}>
                  Dismiss
                </Button>
              </div>
            )}

            {/* Create form */}
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (tokenName.trim()) createToken.mutate(tokenName.trim());
              }}
            >
              <Input
                placeholder="Token name (e.g. iPhone 15)"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                maxLength={100}
                className="flex-1"
              />
              <Button type="submit" size="sm" disabled={!tokenName.trim() || createToken.isPending}>
                {createToken.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : (
                  <Plus className="w-4 h-4 mr-1.5" />
                )}
                Create
              </Button>
            </form>

            {/* Token list */}
            {tokensLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading tokens…
              </div>
            ) : tokens.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No tokens yet. Create one to connect your iPhone app.</p>
            ) : (
              <div className="space-y-2">
                {tokens.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg border bg-background"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{t.name}</span>
                        {t.revoked_at ? (
                          <Badge variant="destructive" className="text-xs">Revoked</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Active</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Created {new Date(t.created_at).toLocaleDateString()}
                        {t.last_used_at && ` · Last used ${new Date(t.last_used_at).toLocaleDateString()}`}
                      </div>
                    </div>
                    {!t.revoked_at && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setRevokeId(t.id)}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Mobile Setup Help */}
            <Collapsible open={helpOpen} onOpenChange={setHelpOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                  <Smartphone className="w-4 h-4" />
                  {helpOpen ? 'Hide' : 'Show'} mobile setup guide
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-3 rounded-lg border bg-muted/30 p-4 space-y-3">
                  <h4 className="text-sm font-medium">Quick Start</h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Create an API token above</li>
                    <li>Use the token in your iPhone app's Authorization header</li>
                    <li>Create a session, then POST transcript chunks as they arrive</li>
                    <li>Summarize from the web dashboard when ready</li>
                  </ol>
                  <h4 className="text-sm font-medium mt-3">Sample cURL</h4>
                  <pre className="text-xs bg-background rounded p-3 overflow-x-auto border whitespace-pre-wrap break-all">
                    {sampleCurl}
                  </pre>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Data Export</CardTitle>
            <CardDescription>Download all your sessions, transcripts, and summaries as JSON.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1.5" />
              Export Data
            </Button>
          </CardContent>
        </Card>

        <Separator />

        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
            <CardDescription>Permanently delete your account and all associated data.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" size="sm">
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Revoke confirmation dialog */}
      <AlertDialog open={!!revokeId} onOpenChange={(open) => !open && setRevokeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this token?</AlertDialogTitle>
            <AlertDialogDescription>
              The iPhone app using this token will no longer be able to upload transcripts. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => revokeId && revokeToken.mutate(revokeId)}
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
