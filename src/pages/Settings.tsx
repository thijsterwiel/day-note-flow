import { Download, Trash2, LogOut } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function Settings() {
  const { toast } = useToast();
  const { user, signOut } = useAuth();

  const handleExport = () => {
    // TODO: wire to backend export
    toast({ title: 'Export started', description: 'Your data will download shortly.' });
  };

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
    </AppLayout>
  );
}
